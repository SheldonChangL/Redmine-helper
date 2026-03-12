const { ipcMain } = require('electron');
const { IPC } = require('../../shared/constants');
const credentials = require('../credentials');
const redmine = require('../api/redmineClient');
const issuesIpc = require('./issues.ipc');
const timeIpc = require('./time.ipc');
const uploadIpc = require('./upload.ipc');

function registerAll(store) {
  const getFromStore = (key) => store ? store.get(key) : undefined;
  const setInStore = (key, val) => { if (store) store.set(key, val); };

  // Credentials
  ipcMain.handle(IPC.CREDENTIALS_SAVE, (_e, baseUrl, apiKey) => {
    credentials.save(baseUrl, apiKey);
    redmine.resetClient();
    return { ok: true };
  });

  ipcMain.handle(IPC.CREDENTIALS_LOAD, () => credentials.load());

  ipcMain.handle(IPC.CREDENTIALS_CLEAR, () => {
    credentials.clear();
    redmine.resetClient();
    return { ok: true };
  });

  ipcMain.handle(IPC.CREDENTIALS_VALIDATE, async () => {
    const result = await redmine.ping();
    if (result.ok) redmine.resetClient(); // force client rebuild with fresh creds
    return result;
  });

  // Settings
  ipcMain.handle(IPC.SETTINGS_GET, (_e, key) => getFromStore(key));
  ipcMain.handle(IPC.SETTINGS_SET, (_e, key, value) => { setInStore(key, value); return { ok: true }; });

  // Issues
  issuesIpc.register(store);

  // Time
  timeIpc.register();

  // Upload
  uploadIpc.register();
}

module.exports = { registerAll };
