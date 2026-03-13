'use strict';

const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

const HOME = os.homedir();
const PROBE_PATHS = {
  ollama: ['/usr/local/bin/ollama', '/opt/homebrew/bin/ollama'],
  claude: [
    '/usr/local/bin/claude',
    '/opt/homebrew/bin/claude',
    path.join(HOME, '.local', 'bin', 'claude'),
    path.join(HOME, 'bin', 'claude'),
    path.join(HOME, '.volta', 'bin', 'claude'),
  ],
  codex: [
    '/usr/local/bin/codex',
    '/opt/homebrew/bin/codex',
    path.join(HOME, '.local', 'bin', 'codex'),
    path.join(HOME, 'bin', 'codex'),
    path.join(HOME, '.volta', 'bin', 'codex'),
  ],
};

const PATH_ENTRIES = [
  '/usr/local/bin',
  '/opt/homebrew/bin',
  path.join(HOME, '.local', 'bin'),
  path.join(HOME, 'bin'),
  path.join(HOME, '.volta', 'bin'),
  ...(process.env.PATH || '').split(path.delimiter).filter(Boolean),
];

const ENV = {
  ...process.env,
  PATH: [...new Set(PATH_ENTRIES)].join(path.delimiter),
};

function isExecutable(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function findBinaryOnPath(binary) {
  for (const dir of ENV.PATH.split(path.delimiter)) {
    const candidate = path.join(dir, binary);
    if (isExecutable(candidate)) return candidate;
  }
  return null;
}

function findBinaryInNvm(binary) {
  const versionsDir = path.join(HOME, '.nvm', 'versions', 'node');
  try {
    const versions = fs.readdirSync(versionsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
      .reverse();

    for (const version of versions) {
      const candidate = path.join(versionsDir, version, 'bin', binary);
      if (isExecutable(candidate)) return candidate;
    }
  } catch {
    // nvm not installed or not accessible
  }
  return null;
}

function findBinary(backend) {
  for (const p of (PROBE_PATHS[backend] || [])) {
    if (isExecutable(p)) return p;
  }
  const pathHit = findBinaryOnPath(backend);
  if (pathHit) return pathHit;
  const nvmHit = findBinaryInNvm(backend);
  if (nvmHit) return nvmHit;
  return backend; // PATH fallback
}

/**
 * Spawn a subprocess and stream stdout tokens.
 *
 * @param {object} opts
 *   bin          - executable path
 *   args         - argv array
 *   stdin        - string to write to stdin (undefined = leave stdin as pipe)
 *   stdinMode    - 'ignore'  → /dev/null (closed fd)
 *                  'inherit' → inherit parent's stdin fd (lets child see parent TTY)
 *   label        - human label for error messages
 *   stderrMode   - 'all' captures all stderr text for non-zero exits
 *                  /regex/ captures matching stderr text for non-zero exits
 *   onToken / onDone / onError - callbacks
 */
function spawnStreaming({ bin, args, stdin, stdinMode, label, stderrMode = 'all', onToken, onDone, onError }) {
  const stdioOpt = stdinMode === 'ignore'  ? ['ignore',  'pipe', 'pipe']
                 : stdinMode === 'inherit' ? ['inherit', 'pipe', 'pipe']
                 : 'pipe';
  let proc;
  try {
    proc = spawn(bin, args, { env: ENV, stdio: stdioOpt });
  } catch (err) {
    onError(`Failed to start ${label}: ${err.message}`);
    return null;
  }

  if (stdin !== undefined && stdinMode !== 'ignore' && stdinMode !== 'inherit') {
    try {
      proc.stdin.write(stdin);
      proc.stdin.end();
    } catch (err) {
      onError(`Failed to write to ${label} stdin: ${err.message}`);
      return null;
    }
  }

  proc.stdout.on('data', (chunk) => onToken(chunk.toString()));

  let errorSent = false;
  const stderrChunks = [];
  proc.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    const trimmed = text.trim();
    if (!trimmed) return;
    if (stderrMode === 'all') {
      stderrChunks.push(trimmed);
      return;
    }
    if (stderrMode instanceof RegExp && stderrMode.test(trimmed)) {
      stderrChunks.push(trimmed);
    }
  });

  proc.on('close', (code) => {
    if (code === null) return; // killed by cancel — no callback
    if (code === 0) {
      onDone();
      return;
    }

    const stderrText = stderrChunks.join('\n').trim();
    if (!errorSent) {
      if (stderrText) {
        onError(stderrText);
      } else {
        onError(`${label} exited with code ${code}. Check that it is installed and authenticated.`);
      }
      errorSent = true;
    }
  });

  proc.on('error', (err) => {
    if (!errorSent) {
      errorSent = true;
      if (err.code === 'ENOENT') {
        onError(`${label} not found. Make sure it is installed and on your PATH.`);
      } else {
        onError(`${label} error: ${err.message}`);
      }
    }
  });

  return proc;
}

/**
 * Generate a response using the selected backend.
 *
 * @param {string}   prompt   - Full prompt text
 * @param {string}   backend  - 'ollama' | 'claude' | 'codex'
 * @param {string}   model    - Model name (Ollama only)
 * @param {function} onToken
 * @param {function} onDone
 * @param {function} onError
 * @returns {ChildProcess|null}
 */
function generate(prompt, backend, model, onToken, onDone, onError) {
  const bin = findBinary(backend);

  if (backend === 'ollama') {
    // Ollama reads the prompt from stdin; model name is a positional arg
    return spawnStreaming({
      bin, args: ['run', model || 'llama3.2', '--nowordwrap'],
      stdin: prompt,
      label: 'Ollama',
      stderrMode: /error/i, // Ollama emits loading progress to stderr; ignore non-errors
      onToken, onDone, onError,
    });
  }

  if (backend === 'claude') {
    // `claude -p` reads the prompt from stdin in print/non-interactive mode.
    // Passing prompt as a positional arg after -p does not work with Claude Code CLI.
    return spawnStreaming({
      bin, args: ['-p'],
      stdin: prompt,
      label: 'Claude CLI',
      onToken, onDone, onError,
    });
  }

  if (backend === 'codex') {
    // `codex exec` is the supported non-interactive mode. Passing the prompt
    // as an argument avoids the TTY requirement that applies when reading stdin.
    return spawnStreaming({
      bin, args: ['exec', '--full-auto', prompt],
      stdinMode: 'ignore',
      label: 'Codex CLI',
      onToken, onDone, onError,
    });
  }

  onError(`Unknown backend: ${backend}`);
  return null;
}

module.exports = { generate, findBinary };
