let _store = null;

async function initStore() {
  const { default: Store } = await import('electron-store');
  _store = new Store({
    schema: {
      pollInterval:           { type: 'number', default: 60 },
      assignmentPollInterval: { type: 'number', default: 300 },
      theme:                  { type: 'string', enum: ['system', 'light', 'dark'], default: 'system' },
      cachedIssues:           { type: 'array',  default: [] },
      cachedIssuesAt:         { type: 'number', default: 0 },
      cachedProjects:         { type: 'array',  default: [] },
      cachedTrackers:         { type: 'array',  default: [] },
    },
  });
  return _store;
}

function getStore() {
  if (!_store) throw new Error('Store not initialised — call initStore() first');
  return _store;
}

module.exports = { initStore, getStore };
