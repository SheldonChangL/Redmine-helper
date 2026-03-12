const IPC = {
  // Credentials
  CREDENTIALS_SAVE: 'credentials:save',
  CREDENTIALS_LOAD: 'credentials:load',
  CREDENTIALS_CLEAR: 'credentials:clear',
  CREDENTIALS_VALIDATE: 'credentials:validate',

  // Projects
  PROJECT_MEMBERS: 'project:members',

  // Issues
  ISSUES_FETCH: 'issues:fetch',
  ISSUES_GET: 'issues:get',
  ISSUES_CREATE: 'issues:create',
  ISSUES_UPDATE: 'issues:update',
  ISSUES_FETCH_CHILDREN: 'issues:fetchChildren',

  // Time
  TIME_LOG: 'time:log',
  TIME_ACTIVITIES: 'time:activities',

  // Upload
  UPLOAD_CLIPBOARD: 'upload:fromClipboard',
  UPLOAD_FILE: 'upload:file',

  // Notifications
  NOTIFY_ISSUE_CHANGED: 'notify:issueChanged',

  // AI
  AI_GENERATE: 'ai:generate',
  AI_CANCEL: 'ai:cancel',
  AI_TOKEN: 'ai:token',
  AI_DONE: 'ai:done',
  AI_ERROR: 'ai:error',

  // Git
  GIT_DIFF: 'git:diff',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',

  // Window
  WINDOW_TOGGLE: 'window:toggle',
  SPOTLIGHT_OPEN: 'spotlight:open',
  SPOTLIGHT_CLOSE: 'spotlight:close',
};

module.exports = { IPC };
