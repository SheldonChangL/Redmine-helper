const { ipcMain } = require('electron');
const { IPC } = require('../../shared/constants');
const redmine = require('../api/redmineClient');

function register(store) {
  ipcMain.handle(IPC.ISSUES_FETCH, async () => {
    try {
      const issues = await redmine.fetchMyOpenIssues();

      // Update cache
      store.set('cachedIssues', issues);
      store.set('cachedIssuesAt', Date.now());

      // Also refresh projects and trackers while we're at it
      const [projects, trackers, priorities] = await Promise.all([
        redmine.fetchProjects().catch(() => store.get('cachedProjects') || []),
        redmine.fetchTrackers().catch(() => store.get('cachedTrackers') || []),
        redmine.fetchPriorities().catch(() => []),
      ]);
      store.set('cachedProjects', projects);
      store.set('cachedTrackers', trackers);

      return { ok: true, issues, projects, trackers, priorities };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle(IPC.ISSUES_GET, async (_e, id) => {
    try {
      const issue = await redmine.fetchIssue(id);
      return { ok: true, issue };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle(IPC.ISSUES_UPDATE, async (_e, id, fields) => {
    try {
      await redmine.updateIssue(id, fields);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle(IPC.ISSUES_FETCH_CHILDREN, async (_e, parentId) => {
    try {
      const issues = await redmine.fetchChildren(parentId);
      return { ok: true, issues };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });
}

module.exports = { register };
