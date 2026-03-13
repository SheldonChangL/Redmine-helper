const { ipcMain } = require('electron');
const { IPC } = require('../../shared/constants');
const credentials = require('../credentials');
const redmine = require('../api/redmineClient');
const issuesIpc = require('./issues.ipc');
const timeIpc = require('./time.ipc');
const uploadIpc = require('./upload.ipc');
const aiIpc = require('./ai.ipc');
const gitIpc = require('./git.ipc');
const pollerManager = require('../polling/pollerManager');
const notifications = require('./notifications');

function registerAll(store, getMainWindow) {
  const getFromStore = (key) => store ? store.get(key) : undefined;
  const setInStore = (key, val) => { if (store) store.set(key, val); };

  function startPoller() {
    pollerManager.start(store, (event) => {
      const win = getMainWindow ? getMainWindow() : null;
      notifications.fire(win, event);
    });
  }

  // Credentials
  ipcMain.handle(IPC.CREDENTIALS_SAVE, (_e, baseUrl, apiKey) => {
    credentials.save(baseUrl, apiKey);
    redmine.resetClient();
    startPoller(); // restart with fresh credentials
    return { ok: true };
  });

  ipcMain.handle(IPC.CREDENTIALS_LOAD, () => credentials.load());

  ipcMain.handle(IPC.CREDENTIALS_CLEAR, () => {
    credentials.clear();
    redmine.resetClient();
    pollerManager.stop();
    return { ok: true };
  });

  ipcMain.handle(IPC.CREDENTIALS_VALIDATE, async () => {
    const result = await redmine.ping();
    if (result.ok) redmine.resetClient();
    return result;
  });

  // Settings
  ipcMain.handle(IPC.SETTINGS_GET, (_e, key) => getFromStore(key));
  ipcMain.handle(IPC.SETTINGS_SET, (_e, key, value) => {
    setInStore(key, value);
    // Restart poller when poll interval changes so the new interval takes effect
    if (key === 'pollInterval' && credentials.load()) startPoller();
    return { ok: true };
  });

  // Issues
  issuesIpc.register(store);

  // Time
  timeIpc.register();

  // Upload
  uploadIpc.register();

  // AI
  aiIpc.register(getMainWindow);

  // Git
  gitIpc.register();

  // Start poller if credentials are already configured
  if (credentials.load()) startPoller();
}

module.exports = { registerAll };
