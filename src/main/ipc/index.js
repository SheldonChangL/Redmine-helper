const { ipcMain } = require('electron');
const { IPC } = require('../../shared/constants');
const credentials = require('../credentials');

function registerAll(store = null) {
  // store is the electron-store instance passed from index.js after async init
  const getFromStore = (key) => store ? store.get(key) : undefined;
  const setInStore = (key, val) => { if (store) store.set(key, val); };
  // Credentials
  ipcMain.handle(IPC.CREDENTIALS_SAVE, (_e, baseUrl, apiKey) => {
    credentials.save(baseUrl, apiKey);
    return { ok: true };
  });

  ipcMain.handle(IPC.CREDENTIALS_LOAD, () => {
    return credentials.load();
  });

  ipcMain.handle(IPC.CREDENTIALS_CLEAR, () => {
    credentials.clear();
    return { ok: true };
  });

  // Settings
  ipcMain.handle(IPC.SETTINGS_GET, (_e, key) => getFromStore(key));
  ipcMain.handle(IPC.SETTINGS_SET, (_e, key, value) => { setInStore(key, value); return { ok: true }; });
}

module.exports = { registerAll };
