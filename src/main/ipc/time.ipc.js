const { ipcMain } = require('electron');
const { IPC } = require('../../shared/constants');
const redmine = require('../api/redmineClient');

function register() {
  ipcMain.handle(IPC.TIME_ACTIVITIES, async () => {
    try {
      const activities = await redmine.fetchTimeActivities();
      return { ok: true, activities };
    } catch (err) {
      return { ok: false, error: err.response?.data?.errors?.join(', ') || err.message };
    }
  });

  ipcMain.handle(IPC.TIME_LOG, async (_e, entry) => {
    // entry: { issue_id, hours, activity_id, comments, spent_on }
    try {
      const client = redmine.getClient();
      const payload = {
        time_entry: {
          issue_id: entry.issue_id,
          hours: entry.hours,
          activity_id: entry.activity_id || undefined,
          comments: entry.comments || '',
          spent_on: entry.spent_on || new Date().toISOString().slice(0, 10),
        },
      };
      const res = await client.post('/time_entries.json', payload);
      return { ok: true, time_entry: res.data.time_entry };
    } catch (err) {
      return { ok: false, error: err.response?.data?.errors?.join(', ') || err.message };
    }
  });
}

module.exports = { register };
