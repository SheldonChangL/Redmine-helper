const { contextBridge, ipcRenderer } = require('electron');
const { IPC } = require('../shared/constants');

contextBridge.exposeInMainWorld('redmine', {
  credentials: {
    save: (baseUrl, apiKey) => ipcRenderer.invoke(IPC.CREDENTIALS_SAVE, baseUrl, apiKey),
    load: () => ipcRenderer.invoke(IPC.CREDENTIALS_LOAD),
    clear: () => ipcRenderer.invoke(IPC.CREDENTIALS_CLEAR),
    validate: () => ipcRenderer.invoke(IPC.CREDENTIALS_VALIDATE),
  },
  issues: {
    fetch: () => ipcRenderer.invoke(IPC.ISSUES_FETCH),
    get: (id) => ipcRenderer.invoke(IPC.ISSUES_GET, id),
    update: (id, fields) => ipcRenderer.invoke(IPC.ISSUES_UPDATE, id, fields),
    fetchChildren: (id) => ipcRenderer.invoke(IPC.ISSUES_FETCH_CHILDREN, id),
  },
  time: {
    log: (entry) => ipcRenderer.invoke(IPC.TIME_LOG, entry),
  },
  upload: {
    fromClipboard: (issueId) => ipcRenderer.invoke(IPC.UPLOAD_CLIPBOARD, issueId),
  },
  settings: {
    get: (key) => ipcRenderer.invoke(IPC.SETTINGS_GET, key),
    set: (key, value) => ipcRenderer.invoke(IPC.SETTINGS_SET, key, value),
  },
  ai: {
    generate: (prompt, model) => ipcRenderer.send(IPC.AI_GENERATE, prompt, model),
    cancel: () => ipcRenderer.send(IPC.AI_CANCEL),
  },
  git: {
    diff: (repoPath) => ipcRenderer.invoke(IPC.GIT_DIFF, repoPath),
  },
  on: (channel, callback) => {
    const allowed = Object.values(IPC);
    if (allowed.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args));
    }
  },
  off: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  },
});
