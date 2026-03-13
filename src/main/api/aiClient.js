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
  // Fall back to PATH lookup using the backend name itself
  return backend;
}

function spawnStreaming({ bin, args, stdin, label, onToken, onDone, onError }) {
  let proc;
  try {
    proc = spawn(bin, args, { env: ENV });
  } catch (err) {
    onError(`Failed to start ${label}: ${err.message}`);
    return null;
  }

  if (stdin !== undefined) {
    proc.stdin.write(stdin + '\n');
    proc.stdin.end();
  }

  proc.stdout.on('data', (chunk) => onToken(chunk.toString()));

  proc.stderr.on('data', (chunk) => {
    const text = chunk.toString().trim();
    if (text && /error/i.test(text)) onError(text);
  });

  proc.on('close', (code) => {
    // null = killed by cancel, skip
    if (code === 0) onDone();
  });

  proc.on('error', (err) => {
    if (err.code === 'ENOENT') {
      onError(`${label} not found. Make sure it is installed and on your PATH.`);
    } else {
      onError(`${label} error: ${err.message}`);
    }
  });

  return proc;
}

/**
 * Generate a response using the selected backend.
 *
 * @param {string}   prompt   - Full prompt text
 * @param {string}   backend  - 'ollama' | 'claude' | 'codex'
 * @param {string}   model    - Model name (used for Ollama only)
 * @param {function} onToken  - Called with each output chunk
 * @param {function} onDone   - Called on clean exit
 * @param {function} onError  - Called with error message string
 * @returns {ChildProcess|null}
 */
function generate(prompt, backend, model, onToken, onDone, onError) {
  const bin = findBinary(backend);

  if (backend === 'ollama') {
    return spawnStreaming({
      bin, args: ['run', model || 'llama3.2', '--nowordwrap'],
      stdin: prompt, label: 'Ollama', onToken, onDone, onError,
    });
  }

  if (backend === 'claude') {
    // claude -p "<prompt>" — print mode, outputs to stdout
    return spawnStreaming({
      bin, args: ['-p', prompt],
      label: 'Claude CLI', onToken, onDone, onError,
    });
  }

  if (backend === 'codex') {
    // codex "<prompt>" — query mode
    return spawnStreaming({
      bin, args: [prompt],
      label: 'Codex CLI', onToken, onDone, onError,
    });
  }

  onError(`Unknown backend: ${backend}`);
  return null;
}

module.exports = { generate, findBinary };
