'use strict';

const { ipcMain } = require('electron');
const { IPC } = require('../../shared/constants');
const aiClient = require('../api/aiClient');

let activeProcess = null;

function register(getMainWindow) {
  ipcMain.on(IPC.AI_GENERATE, (event, prompt, backend = 'ollama', model = 'llama3.2') => {
    // Kill any in-flight generation before starting a new one
    if (activeProcess) {
      console.log('[AI] Killing previous active process');
      activeProcess.kill();
      activeProcess = null;
    }

    console.log(`[AI] Starting generation — backend=${backend} model=${model} promptLen=${prompt.length}`);

    // Prefer the main window's webContents so tokens reach the right renderer
    const win    = getMainWindow ? getMainWindow() : null;
    const sender = (win && !win.isDestroyed()) ? win.webContents : event.sender;

    let tokenCount = 0;

    activeProcess = aiClient.generate(
      prompt,
      backend,
      model,
      (token) => {
        tokenCount++;
        if (tokenCount === 1 || tokenCount % 20 === 0) {
          console.log(`[AI] Token #${tokenCount} (${token.length} chars, total so far)`);
        }
        if (!sender.isDestroyed()) sender.send(IPC.AI_TOKEN, token);
      },
      () => {
        console.log(`[AI] Done — ${tokenCount} token chunks received`);
        activeProcess = null;
        if (!sender.isDestroyed()) sender.send(IPC.AI_DONE);
      },
      (err) => {
        console.error(`[AI] Error — ${err}`);
        activeProcess = null;
        if (!sender.isDestroyed()) sender.send(IPC.AI_ERROR, err);
      },
    );

    if (!activeProcess) {
      console.warn('[AI] aiClient.generate returned null — error already dispatched');
    } else {
      console.log(`[AI] Process spawned (pid=${activeProcess.pid})`);
    }
  });

  ipcMain.on(IPC.AI_CANCEL, () => {
    if (activeProcess) {
      console.log('[AI] Cancel requested — killing process');
      activeProcess.kill();
      activeProcess = null;
    }
  });
}

module.exports = { register };
