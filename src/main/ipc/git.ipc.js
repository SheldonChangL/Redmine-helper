'use strict';

const { ipcMain } = require('electron');
const { IPC } = require('../../shared/constants');
const { execFile } = require('child_process');

function register() {
  ipcMain.handle(IPC.GIT_DIFF, (_e, repoPath) => {
    return new Promise((resolve) => {
      if (!repoPath || !repoPath.trim()) {
        return resolve({ ok: false, error: 'No repository path provided.' });
      }

      execFile(
        'git', ['diff', 'HEAD'],
        { cwd: repoPath.trim(), maxBuffer: 4 * 1024 * 1024 },
        (err, stdout, stderr) => {
          if (err) {
            return resolve({ ok: false, error: (stderr || err.message).trim() });
          }
          const diff = stdout.trim();
          if (!diff) {
            return resolve({ ok: false, error: 'No uncommitted changes (git diff HEAD is empty).' });
          }
          resolve({ ok: true, diff });
        },
      );
    });
  });
}

module.exports = { register };
