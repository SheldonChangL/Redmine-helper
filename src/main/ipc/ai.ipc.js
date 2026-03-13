'use strict';

const { ipcMain } = require('electron');
const { IPC } = require('../../shared/constants');
const aiClient = require('../api/aiClient');

let activeProcess = null;

function register(getMainWindow) {
  ipcMain.on(IPC.AI_GENERATE, (event, prompt, backend = 'ollama', model = 'llama3.2') => {
    // Kill any in-flight generation before starting a new one
    if (activeProcess) {
      activeProcess.kill();
      activeProcess = null;
    }

    // Prefer the main window's webContents so tokens reach the right renderer
    const win = getMainWindow ? getMainWindow() : null;
    const sender = (win && !win.isDestroyed()) ? win.webContents : event.sender;

    activeProcess = aiClient.generate(
      prompt,
      backend,
      model,
      (token) => {
        if (!sender.isDestroyed()) sender.send(IPC.AI_TOKEN, token);
      },
      () => {
        activeProcess = null;
        if (!sender.isDestroyed()) sender.send(IPC.AI_DONE);
      },
      (err) => {
        activeProcess = null;
        if (!sender.isDestroyed()) sender.send(IPC.AI_ERROR, err);
      },
    );

    // If aiClient returned null (Ollama not found), AI_ERROR was already sent
    if (!activeProcess) return;
  });

  ipcMain.on(IPC.AI_CANCEL, () => {
    if (activeProcess) {
      activeProcess.kill();
      activeProcess = null;
    }
  });
}

module.exports = { register };
