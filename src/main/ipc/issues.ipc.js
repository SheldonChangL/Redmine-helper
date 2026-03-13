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

  ipcMain.handle(IPC.ISSUES_CREATE, async (_e, fields) => {
    try {
      const issue = await redmine.createIssue(fields);
      return { ok: true, issue };
    } catch (err) {
      return { ok: false, error: err.response?.data?.errors?.join(', ') || err.message };
    }
  });

  ipcMain.handle(IPC.ISSUES_UPDATE, async (_e, id, fields) => {
    try {
      await redmine.updateIssue(id, fields);
      return { ok: true };
    } catch (err) {
      const errors = err.response?.data?.errors || [];
      return { ok: false, error: errors.join(', ') || err.message, errors };
    }
  });

  ipcMain.handle(IPC.PROJECT_MEMBERS, async (_e, projectId) => {
    try {
      const members = await redmine.fetchProjectMembers(projectId);
      return { ok: true, members };
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

  ipcMain.handle(IPC.ISSUES_STATUSES, async () => {
    try {
      const statuses = await redmine.fetchStatuses();
      return { ok: true, statuses };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle(IPC.PROJECTS_LIST, async () => {
    try {
      const projects = await redmine.fetchProjects();
      return { ok: true, projects };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle(IPC.ISSUES_FETCH_BY_ASSIGNEES, async (_e, projectId, assigneeIds) => {
    try {
      const issues = await redmine.fetchIssuesByAssignees(projectId, assigneeIds);
      return { ok: true, issues };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });
}

module.exports = { register };
