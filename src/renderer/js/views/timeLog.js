import { renderTimer } from './timer.js';

function escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function renderTimeLog(container) {
  container.setAttribute('data-view-root', '');
  container.innerHTML = `
    <link rel="stylesheet" href="css/timer.css" />
    <div class="time-log-layout">
      <div class="time-log-left">
        <div id="timer-container"></div>
      </div>
      <div class="time-log-right">
        <h3 class="time-log-heading">Log Time</h3>
        <form id="time-log-form" class="time-log-form" autocomplete="off">
          <label class="form-label">
            Issue ID
            <input type="number" id="tl-issue-id" class="form-input" placeholder="e.g. 42" min="1" required />
          </label>
          <label class="form-label">
            Hours
            <input type="number" id="tl-hours" class="form-input" placeholder="e.g. 1.5" min="0.01" step="0.01" required />
          </label>
          <label class="form-label">
            Date
            <input type="date" id="tl-date" class="form-input" />
          </label>
          <label class="form-label">
            Activity
            <select id="tl-activity" class="form-input">
              <option value="">— select activity —</option>
            </select>
          </label>
          <label class="form-label">
            Comment
            <input type="text" id="tl-comment" class="form-input" placeholder="Optional comment" />
          </label>
          <div id="tl-status" class="tl-status"></div>
          <button type="submit" class="btn btn-primary" id="btn-log-submit">Log time</button>
        </form>
      </div>
    </div>
  `;

  // Set today's date as default
  const today = new Date().toISOString().slice(0, 10);
  container.querySelector('#tl-date').value = today;

  // Load time entry activities
  loadActivities(container);

  // Render timer widget
  const timerContainer = container.querySelector('#timer-container');
  renderTimer(timerContainer, {
    onStop: ({ hours }) => {
      container.querySelector('#tl-hours').value = hours;
    },
  });

  // Form submit
  const form = container.querySelector('#time-log-form');
  const statusEl = container.querySelector('#tl-status');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const issueId = parseInt(container.querySelector('#tl-issue-id').value, 10);
    const hours = parseFloat(container.querySelector('#tl-hours').value);
    const date = container.querySelector('#tl-date').value;
    const activityId = container.querySelector('#tl-activity').value;
    const comment = container.querySelector('#tl-comment').value.trim();

    if (!issueId || !hours) {
      statusEl.textContent = 'Issue ID and hours are required.';
      statusEl.className = 'tl-status tl-error';
      return;
    }

    const btn = container.querySelector('#btn-log-submit');
    btn.disabled = true;
    statusEl.textContent = 'Logging…';
    statusEl.className = 'tl-status';

    const entry = {
      issue_id: issueId,
      hours,
      spent_on: date || today,
      activity_id: activityId ? parseInt(activityId, 10) : undefined,
      comments: comment,
    };

    const result = await window.redmine.time.log(entry);
    btn.disabled = false;
    if (result.ok) {
      statusEl.textContent = `Logged ${hours}h to #${issueId}.`;
      statusEl.className = 'tl-status tl-success';
      form.reset();
      container.querySelector('#tl-date').value = today;
    } else {
      statusEl.textContent = 'Error: ' + escHtml(result.error);
      statusEl.className = 'tl-status tl-error';
    }
  });
}

async function loadActivities(container) {
  try {
    const result = await window.redmine.time.activities();
    if (!result.ok || !result.activities.length) return;
    const select = container.querySelector('#tl-activity');
    result.activities.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = a.name;
      select.appendChild(opt);
    });
  } catch (_) {
    // activities are optional — silently ignore fetch failure
  }
}
