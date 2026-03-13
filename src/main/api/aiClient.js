'use strict';

const { spawn } = require('child_process');
const fs = require('fs');

const PROBE_PATHS = {
  ollama: ['/usr/local/bin/ollama', '/opt/homebrew/bin/ollama'],
  claude: ['/usr/local/bin/claude', '/opt/homebrew/bin/claude'],
  codex:  ['/usr/local/bin/codex',  '/opt/homebrew/bin/codex'],
};

const ENV = {
  ...process.env,
  PATH: `/usr/local/bin:/opt/homebrew/bin:${process.env.PATH || ''}`,
};

function findBinary(backend) {
  for (const p of (PROBE_PATHS[backend] || [])) {
    try {
      fs.accessSync(p, fs.constants.X_OK);
      return p;
    } catch {
      // not at this path
    }
  }
  return backend; // PATH fallback
}

/**
 * Spawn a subprocess and stream stdout tokens.
 *
 * @param {object} opts
 *   bin          - executable path
 *   args         - argv array
 *   stdin        - string to write to stdin (undefined = leave stdin as pipe)
 *   stdinMode    - 'ignore' to set stdin to /dev/null (skip pipe entirely)
 *   label        - human label for error messages
 *   filterStderr - if true, only call onError for stderr lines matching /error/i
 *                  if false, surface all non-empty stderr immediately
 *   onToken / onDone / onError - callbacks
 */
function spawnStreaming({ bin, args, stdin, stdinMode, label, filterStderr, onToken, onDone, onError }) {
  const stdioOpt = stdinMode === 'ignore' ? ['ignore', 'pipe', 'pipe'] : 'pipe';
  let proc;
  try {
    proc = spawn(bin, args, { env: ENV, stdio: stdioOpt });
  } catch (err) {
    onError(`Failed to start ${label}: ${err.message}`);
    return null;
  }

  if (stdin !== undefined && stdinMode !== 'ignore') {
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
  proc.stderr.on('data', (chunk) => {
    const text = chunk.toString().trim();
    if (!text) return;
    if (filterStderr && !/error/i.test(text)) return;
    if (!errorSent) {
      errorSent = true;
      onError(text);
    }
  });

  proc.on('close', (code) => {
    if (code === null) return; // killed by cancel — no callback
    if (code === 0) {
      onDone();
    } else if (!errorSent) {
      onError(`${label} exited with code ${code}. Check that it is installed and authenticated.`);
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
      filterStderr: true, // Ollama emits loading progress to stderr; ignore non-errors
      onToken, onDone, onError,
    });
  }

  if (backend === 'claude') {
    // `claude -p` reads the prompt from stdin in print/non-interactive mode.
    // Passing prompt as a positional arg after -p does not work with Claude Code CLI.
    // This is slow (API call); the UI progress indicator shows it is working.
    return spawnStreaming({
      bin, args: ['-p'],
      stdin: prompt,
      label: 'Claude CLI',
      filterStderr: false,
      onToken, onDone, onError,
    });
  }

  if (backend === 'codex') {
    // Codex CLI requires stdin to be a TTY — set stdinMode:'ignore' (/dev/null)
    // and pass the prompt as a positional arg with --full-auto for non-interactive mode.
    return spawnStreaming({
      bin, args: ['--full-auto', prompt],
      stdinMode: 'ignore',
      label: 'Codex CLI',
      filterStderr: false,
      onToken, onDone, onError,
    });
  }

  onError(`Unknown backend: ${backend}`);
  return null;
}

module.exports = { generate, findBinary };
