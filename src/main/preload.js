const { contextBridge, ipcRenderer } = require('electron');
const { IPC } = require('../shared/constants');

contextBridge.exposeInMainWorld('redmine', {
  credentials: {
    save: (baseUrl, apiKey) => ipcRenderer.invoke(IPC.CREDENTIALS_SAVE, baseUrl, apiKey),
    load: () => ipcRenderer.invoke(IPC.CREDENTIALS_LOAD),
    clear: () => ipcRenderer.invoke(IPC.CREDENTIALS_CLEAR),
    validate: () => ipcRenderer.invoke(IPC.CREDENTIALS_VALIDATE),
  },
  projects: {
    members: (id) => ipcRenderer.invoke(IPC.PROJECT_MEMBERS, id),
    list: ()     => ipcRenderer.invoke(IPC.PROJECTS_LIST),
  },
  issues: {
    fetch: () => ipcRenderer.invoke(IPC.ISSUES_FETCH),
    get: (id) => ipcRenderer.invoke(IPC.ISSUES_GET, id),
    create: (fields) => ipcRenderer.invoke(IPC.ISSUES_CREATE, fields),
    update: (id, fields) => ipcRenderer.invoke(IPC.ISSUES_UPDATE, id, fields),
    fetchChildren: (id) => ipcRenderer.invoke(IPC.ISSUES_FETCH_CHILDREN, id),
    statuses: () => ipcRenderer.invoke(IPC.ISSUES_STATUSES),
    fetchByAssignees: (projectId, assigneeIds) => ipcRenderer.invoke(IPC.ISSUES_FETCH_BY_ASSIGNEES, projectId, assigneeIds),
  },
  code: {
    read: (dirPath) => ipcRenderer.invoke(IPC.CODE_READ, dirPath),
    writePatch: (dirPath, filename, patchText) => ipcRenderer.invoke(IPC.CODE_WRITE_PATCH, dirPath, filename, patchText),
  },
  time: {
    log: (entry) => ipcRenderer.invoke(IPC.TIME_LOG, entry),
    activities: () => ipcRenderer.invoke(IPC.TIME_ACTIVITIES),
  },
  upload: {
    fromClipboard: () => ipcRenderer.invoke(IPC.UPLOAD_CLIPBOARD),
    file: (bytes, filename, contentType) => ipcRenderer.invoke(IPC.UPLOAD_FILE, bytes, filename, contentType),
  },
  spotlight: {
    close: () => ipcRenderer.send(IPC.SPOTLIGHT_CLOSE),
  },
  settings: {
    get: (key) => ipcRenderer.invoke(IPC.SETTINGS_GET, key),
    set: (key, value) => ipcRenderer.invoke(IPC.SETTINGS_SET, key, value),
  },
  ai: {
    generate: (prompt, backend, model) => ipcRenderer.send(IPC.AI_GENERATE, prompt, backend, model),
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
