'use strict';

const { spawn } = require('child_process');
const fs = require('fs');

const OLLAMA_PROBE_PATHS = [
  '/usr/local/bin/ollama',
  '/opt/homebrew/bin/ollama',
];

function findOllama() {
  for (const p of OLLAMA_PROBE_PATHS) {
    try {
      fs.accessSync(p, fs.constants.X_OK);
      return p;
    } catch {
      // not at this path
    }
  }
  // Fall back to PATH lookup
  return 'ollama';
}

/**
 * Spawn `ollama run <model>`, pipe the prompt, and stream output tokens.
 * Returns the child process so the caller can .kill() it to cancel.
 *
 * @param {string}   prompt   - Full prompt text to send to the model
 * @param {string}   model    - Ollama model name (e.g. 'llama3.2')
 * @param {function} onToken  - Called with each output string chunk
 * @param {function} onDone   - Called when the process exits cleanly
 * @param {function} onError  - Called with an error message string
 * @returns {ChildProcess|null}
 */
function generate(prompt, model, onToken, onDone, onError) {
  const ollamaPath = findOllama();

  const env = {
    ...process.env,
    PATH: `/usr/local/bin:/opt/homebrew/bin:${process.env.PATH || ''}`,
  };

  let proc;
  try {
    proc = spawn(ollamaPath, ['run', model, '--nowordwrap'], { env });
  } catch (err) {
    onError('Failed to start Ollama: ' + err.message);
    return null;
  }

  proc.stdin.write(prompt + '\n');
  proc.stdin.end();

  proc.stdout.on('data', (chunk) => {
    onToken(chunk.toString());
  });

  proc.stderr.on('data', (chunk) => {
    const text = chunk.toString().trim();
    // Ollama prints model-loading progress to stderr — only surface real errors
    if (/error/i.test(text)) onError(text);
  });

  proc.on('close', (code) => {
    // code === null means killed (user cancel) — no callback needed
    if (code === 0) onDone();
  });

  proc.on('error', (err) => {
    if (err.code === 'ENOENT') {
      onError('Ollama not found. Install it from https://ollama.com and make sure it is running.');
    } else {
      onError('Ollama process error: ' + err.message);
    }
  });

  return proc;
}

module.exports = { generate, findOllama };
