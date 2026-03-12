const redmine = require('../api/redmineClient');

// Map of issueId -> { statusId, statusName }
let snapshot = new Map();
let initialized = false;

/**
 * Fetch current open issues, diff against the last snapshot.
 * Returns an array of change events:
 *   { type: 'assigned',       issue }
 *   { type: 'status_changed', issue, from: string, to: string }
 * On the first successful poll the snapshot is seeded with no events fired.
 */
async function poll() {
  let issues;
  try {
    issues = await redmine.fetchMyOpenIssues();
  } catch {
    return []; // network error — skip this cycle, retry next tick
  }

  const events = [];
  const seen = new Set();

  for (const issue of issues) {
    const id = issue.id;
    seen.add(id);
    const prev = snapshot.get(id);

    if (!prev) {
      // New issue appeared in the assigned-to-me list
      if (initialized) {
        events.push({ type: 'assigned', issue });
      }
    } else if (prev.statusId !== issue.status.id) {
      events.push({
        type: 'status_changed',
        issue,
        from: prev.statusName,
        to: issue.status.name,
      });
    }

    snapshot.set(id, { statusId: issue.status.id, statusName: issue.status.name });
  }

  // Remove issues that are no longer in the open list
  for (const id of snapshot.keys()) {
    if (!seen.has(id)) snapshot.delete(id);
  }

  initialized = true;
  return events;
}

function reset() {
  snapshot.clear();
  initialized = false;
}

module.exports = { poll, reset };
