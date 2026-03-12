import { renderMarkdown, wireLinks } from '../components/markdownRenderer.js';
import { renderTreeView } from './treeView.js';

function escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
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

  const issue    = issueResult.issue;
  const statuses = statusResult.ok ? statusResult.statuses : [];
  const members  = membersResult.ok ? membersResult.members : [];
  const journals = issue.journals || [];
  const comments = journals.filter(j => j.notes && j.notes.trim());

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

  // Build comments HTML
  const commentsHtml = comments.length ? `
    <div class="comments-section">
      <div class="detail-label comments-header">Comments (${comments.length})</div>
      ${comments.map(j => `
        <div class="comment">
          <div class="comment-meta">
            <span class="comment-author">${escHtml(j.user?.name || 'Unknown')}</span>
            <span class="comment-date">${formatDate(j.created_on)}</span>
          </div>
          <div class="comment-body">${renderMarkdown(j.notes)}</div>
        </div>
      `).join('')}
    </div>
  ` : '';

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
      <div id="status-note-section" class="status-note-section" style="display:none">
        <label class="detail-label">Note for this status change</label>
        <textarea id="detail-status-note" rows="2" placeholder="Optional note for this status change…"></textarea>
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

    <div class="submit-area">
      <button class="btn btn-primary" id="btn-submit-changes" disabled>Submit Changes</button>
      <p id="detail-save-status" class="detail-save-status"></p>
    </div>

    <div id="detail-tree"></div>

    <div class="issue-body" id="detail-body"></div>

    ${commentsHtml}

    <div class="add-comment-section">
      <div class="detail-label comments-header">Add Comment</div>
      <textarea id="detail-note" rows="3" placeholder="Write a comment…"></textarea>
      <button class="btn btn-primary" id="btn-post-comment" style="margin-top:6px">Post Comment</button>
      <p id="detail-comment-status" class="detail-save-status"></p>
    </div>
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

  // ── Pending changes + submit ───────────────────────────────────────────────
  const saveStatus        = detail.querySelector('#detail-save-status');
  const submitBtn         = detail.querySelector('#btn-submit-changes');
  const statusNoteSection = detail.querySelector('#status-note-section');
  const statusNoteEl      = detail.querySelector('#detail-status-note');
  const pendingChanges    = {};

  function updateSubmitBtn() {
    submitBtn.disabled = Object.keys(pendingChanges).length === 0;
  }

  async function submitAllChanges(fields) {
    submitBtn.disabled = true;
    saveStatus.textContent = 'Saving…';
    saveStatus.style.color = 'var(--text-muted)';

    const result = await window.redmine.issues.update(issue.id, fields);
    if (result.ok) {
      saveStatus.textContent = 'Saved';
      saveStatus.style.color = 'var(--success)';
      if (onUpdate) onUpdate({ id: issue.id, ...fields });
      Object.keys(pendingChanges).forEach(k => delete pendingChanges[k]);
      statusNoteSection.style.display = 'none';
      statusNoteEl.value = '';
      setTimeout(() => { saveStatus.textContent = ''; }, 2000);
    } else if (result.errors && result.errors.length) {
      showRequiredFieldsPrompt(fields, result.errors);
    } else {
      saveStatus.textContent = 'Error: ' + (result.error || 'unknown');
      saveStatus.style.color = 'var(--danger)';
      updateSubmitBtn();
    }
  }

  function showRequiredFieldsPrompt(baseFields, errors) {
    const existing = detail.querySelector('.required-fields-prompt');
    if (existing) existing.remove();

    const notesRequired = errors.some(e => /notes/i.test(e));
    const otherErrors   = errors.filter(e => !/notes/i.test(e));

    const prompt = document.createElement('div');
    prompt.className = 'required-fields-prompt';
    prompt.innerHTML = `
      <div class="required-fields-header">Required fields for this status change:</div>
      ${notesRequired ? `
        <div class="required-field">
          <label class="detail-label">Notes (required)</label>
          <textarea class="required-notes" rows="3" placeholder="Add a note for this status change…"></textarea>
        </div>` : ''}
      ${otherErrors.map(e => `<p class="required-field-error">${escHtml(e)}</p>`).join('')}
      <div class="required-fields-actions">
        <button class="btn btn-primary btn-required-submit">Save</button>
        <button class="btn btn-required-cancel">Cancel</button>
      </div>
    `;

    saveStatus.insertAdjacentElement('afterend', prompt);
    saveStatus.textContent = 'Required fields missing — see below.';
    saveStatus.style.color = 'var(--warning, orange)';

    prompt.querySelector('.btn-required-submit').addEventListener('click', async () => {
      const fields = { ...baseFields };
      if (notesRequired) {
        const noteVal = prompt.querySelector('.required-notes')?.value.trim();
        if (!noteVal) {
          prompt.querySelector('.required-notes').style.borderColor = 'var(--danger)';
          return;
        }
        fields.notes = noteVal;
      }
      prompt.remove();
      await submitAllChanges(fields);
    });

    prompt.querySelector('.btn-required-cancel').addEventListener('click', () => {
      detail.querySelector('#detail-status').value = issue.status.id;
      delete pendingChanges.status_id;
      statusNoteSection.style.display = 'none';
      statusNoteEl.value = '';
      saveStatus.textContent = '';
      prompt.remove();
      updateSubmitBtn();
    });
  }

  // Status — stage change + show note field proactively
  detail.querySelector('#detail-status').addEventListener('change', (e) => {
    const statusId = Number(e.target.value);
    if (statusId !== issue.status.id) {
      pendingChanges.status_id = statusId;
      statusNoteSection.style.display = '';
    } else {
      delete pendingChanges.status_id;
      statusNoteSection.style.display = 'none';
    }
    updateSubmitBtn();
  });

  // Assignee — stage change
  detail.querySelector('#detail-assignee').addEventListener('change', (e) => {
    const val = e.target.value;
    const assigneeId = val ? Number(val) : '';
    const originalAssigneeId = issue.assigned_to?.id ?? '';
    if (assigneeId !== originalAssigneeId) {
      pendingChanges.assigned_to_id = assigneeId;
    } else {
      delete pendingChanges.assigned_to_id;
    }
    updateSubmitBtn();
  });

  // Progress — stage change
  progressInput.addEventListener('change', () => {
    const val = Number(progressInput.value);
    if (val !== doneRatio) {
      pendingChanges.done_ratio = val;
    } else {
      delete pendingChanges.done_ratio;
    }
    updateSubmitBtn();
  });

  // Submit all staged changes
  submitBtn.addEventListener('click', async () => {
    const fields = { ...pendingChanges };
    const note = statusNoteEl.value.trim();
    if (note) fields.notes = note;
    await submitAllChanges(fields);
  });

  // ── Add comment ───────────────────────────────────────────────────────────
  const noteEl          = detail.querySelector('#detail-note');
  const commentStatusEl = detail.querySelector('#detail-comment-status');
  const btnPost         = detail.querySelector('#btn-post-comment');

  btnPost.addEventListener('click', async () => {
    const note = noteEl.value.trim();
    if (!note) return;

    btnPost.disabled = true;
    commentStatusEl.textContent = 'Posting…';
    commentStatusEl.style.color = 'var(--text-muted)';

    const result = await window.redmine.issues.update(issue.id, { notes: note });
    if (result.ok) {
      // Reload the panel to show the new comment
      openIssueDetail(partialIssue, root, onUpdate);
    } else {
      commentStatusEl.textContent = 'Error: ' + (result.error || 'unknown');
      commentStatusEl.style.color = 'var(--danger)';
      btnPost.disabled = false;
    }
  });
}
