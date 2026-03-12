import { renderMarkdown, wireLinks } from '../components/markdownRenderer.js';
import { renderTreeView } from './treeView.js';

function escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Open (or refresh) the sliding detail panel for an issue.
 *
 * @param {object} partialIssue  - Minimal issue object from the list (id, subject, project, …)
 * @param {HTMLElement} root     - Container with [data-view-root]
 * @param {function} onUpdate    - Called with updated fields after a PUT, or null on close
 */
export async function openIssueDetail(partialIssue, root, onUpdate) {
  let detail = root.querySelector('.issue-detail');
  if (!detail) {
    detail = document.createElement('div');
    detail.className = 'issue-detail';
    root.appendChild(detail);
  }

  // Skeleton while loading
  detail.innerHTML = `
    <div class="issue-detail-header">
      <span class="issue-id">#${partialIssue.id}</span>
      <span class="issue-detail-title">${escHtml(partialIssue.subject)}</span>
      <button class="btn-close-detail" title="Close">×</button>
    </div>
    <div class="issue-body">Loading…</div>
  `;
  detail.classList.add('open');

  detail.querySelector('.btn-close-detail').addEventListener('click', () => {
    detail.classList.remove('open');
    if (onUpdate) onUpdate(null);
  });

  // Load full issue + statuses + project members in parallel
  const projectId = partialIssue.project?.id;
  const [issueResult, statusResult, membersResult] = await Promise.all([
    window.redmine.issues.get(partialIssue.id),
    window.redmine.issues.statuses(),
    projectId ? window.redmine.projects.members(projectId) : Promise.resolve({ ok: false }),
  ]);

  if (!issueResult.ok) {
    detail.querySelector('.issue-body').textContent = 'Failed to load: ' + issueResult.error;
    return;
  }

  const issue   = issueResult.issue;
  const statuses = statusResult.ok ? statusResult.statuses : [];
  const members  = membersResult.ok ? membersResult.members : [];

  const statusOptions = statuses.map(s =>
    `<option value="${s.id}" ${s.id === issue.status.id ? 'selected' : ''}>${escHtml(s.name)}</option>`
  ).join('');

  const assigneeOptions = [
    '<option value="">— Unassigned —</option>',
    ...members.map(m =>
      `<option value="${m.id}" ${issue.assigned_to?.id === m.id ? 'selected' : ''}>${escHtml(m.name)}</option>`
    ),
  ].join('');

  const doneRatio = issue.done_ratio ?? 0;

  detail.innerHTML = `
    <div class="issue-detail-header">
      <span class="issue-id">#${issue.id}</span>
      <span class="issue-detail-title">${escHtml(issue.subject)}</span>
      <button class="btn-close-detail" title="Close">×</button>
    </div>

    <div class="detail-meta">
      <div class="detail-field">
        <label class="detail-label">Status</label>
        <select id="detail-status">
          ${statusOptions || `<option value="${issue.status.id}">${escHtml(issue.status.name)}</option>`}
        </select>
      </div>
      <div class="detail-field">
        <label class="detail-label">Assignee</label>
        <select id="detail-assignee">${assigneeOptions}</select>
      </div>
      <div class="detail-field">
        <label class="detail-label">Progress — <span id="detail-progress-label">${doneRatio}%</span></label>
        <input type="range" id="detail-progress" min="0" max="100" step="10" value="${doneRatio}" />
      </div>
    </div>

    <p id="detail-save-status" class="detail-save-status"></p>

    <div id="detail-tree"></div>

    <div class="issue-body" id="detail-body"></div>
  `;

  // Description
  const bodyEl = detail.querySelector('#detail-body');
  bodyEl.innerHTML = renderMarkdown(issue.description || '_No description._');
  wireLinks(bodyEl);

  // Sub-task / parent tree
  await renderTreeView(
    detail.querySelector('#detail-tree'),
    issue,
    (child) => openIssueDetail(child, root, onUpdate)
  );

  // Close button (re-bind after innerHTML reset)
  detail.querySelector('.btn-close-detail').addEventListener('click', () => {
    detail.classList.remove('open');
    if (onUpdate) onUpdate(null);
  });

  // Live progress label
  const progressInput = detail.querySelector('#detail-progress');
  const progressLabel = detail.querySelector('#detail-progress-label');
  progressInput.addEventListener('input', () => {
    progressLabel.textContent = progressInput.value + '%';
  });

  // ── Save helpers ──────────────────────────────────────────────────────────
  const saveStatus = detail.querySelector('#detail-save-status');

  async function save(fields) {
    saveStatus.textContent = 'Saving…';
    saveStatus.style.color = 'var(--text-muted)';
    const result = await window.redmine.issues.update(issue.id, fields);
    if (result.ok) {
      saveStatus.textContent = 'Saved';
      saveStatus.style.color = 'var(--success)';
      if (onUpdate) onUpdate({ id: issue.id, ...fields });
      setTimeout(() => { saveStatus.textContent = ''; }, 2000);
    } else {
      saveStatus.textContent = 'Error: ' + (result.error || 'unknown');
      saveStatus.style.color = 'var(--danger)';
    }
  }

  detail.querySelector('#detail-status').addEventListener('change', (e) =>
    save({ status_id: Number(e.target.value) })
  );

  detail.querySelector('#detail-assignee').addEventListener('change', (e) => {
    const val = e.target.value;
    save({ assigned_to_id: val ? Number(val) : '' });
  });

  progressInput.addEventListener('change', () =>
    save({ done_ratio: Number(progressInput.value) })
  );
}
