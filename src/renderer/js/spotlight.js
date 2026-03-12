let projects = [];
let trackers = [];

const titleInput   = document.getElementById('issue-title');
const form         = document.getElementById('spotlight-form');
const projectSel   = document.getElementById('project-select');
const trackerSel   = document.getElementById('tracker-select');
const assigneeSel  = document.getElementById('assignee-select');
const descArea     = document.getElementById('issue-desc');
const btnSubmit    = document.getElementById('btn-submit');
const btnCancel    = document.getElementById('btn-cancel');
const btnClipboard = document.getElementById('btn-clipboard');
const clipStatus   = document.getElementById('clip-status');

let pendingClipToken = null;

async function init() {
  [projects, trackers] = await Promise.all([
    window.redmine.settings.get('cachedProjects').then(v => v || []),
    window.redmine.settings.get('cachedTrackers').then(v => v || []),
  ]);

  while (projectSel.options.length > 1) projectSel.remove(1);
  projects.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    projectSel.appendChild(opt);
  });

  while (trackerSel.options.length > 1) trackerSel.remove(1);
  trackers.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.name;
    trackerSel.appendChild(opt);
  });
}

// Re-init and reset each time the window becomes visible
window.addEventListener('focus', () => {
  init();
  resetForm();
});

init();

// Load assignees when project changes
projectSel.addEventListener('change', async () => {
  const projectId = parseInt(projectSel.value, 10);
  assigneeSel.innerHTML = '<option value="">Assignee</option>';
  assigneeSel.disabled = true;
  if (!projectId) return;

  try {
    const result = await window.redmine.projects.members(projectId);
    if (result.ok && result.members.length > 0) {
      result.members.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.name;
        assigneeSel.appendChild(opt);
      });
      assigneeSel.disabled = false;
    }
  } catch (_) {
    // members fetch is best-effort — leave disabled
  }
});

function resetForm() {
  titleInput.value = '';
  descArea.value = '';
  pendingClipToken = null;
  clipStatus.textContent = '';
  projectSel.value = '';
  trackerSel.value = '';
  assigneeSel.innerHTML = '<option value="">Assignee (select project first)</option>';
  assigneeSel.disabled = true;
}

function closeSpotlight() {
  resetForm();
  window.redmine.spotlight.close();
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSpotlight();
});

form.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitIssue();
});

btnSubmit.addEventListener('click', submitIssue);

async function submitIssue() {
  const subject    = titleInput.value.trim();
  const projectId  = parseInt(projectSel.value, 10);
  const trackerId  = parseInt(trackerSel.value, 10) || undefined;
  const assigneeId = parseInt(assigneeSel.value, 10) || undefined;
  const description = descArea.value.trim();

  if (!subject) {
    flash(titleInput);
    titleInput.focus();
    return;
  }
  if (!projectId) {
    flash(projectSel);
    return;
  }

  btnSubmit.disabled = true;
  btnSubmit.textContent = 'Creating…';

  const payload = { project_id: projectId, tracker_id: trackerId, subject, description };
  if (assigneeId) payload.assigned_to_id = assigneeId;
  if (pendingClipToken) {
    payload.uploads = [{ token: pendingClipToken, filename: 'clipboard.png', content_type: 'image/png' }];
  }

  const result = await window.redmine.issues.create(payload);

  btnSubmit.disabled = false;
  btnSubmit.textContent = 'Create';

  if (result.ok) {
    closeSpotlight();
  } else {
    btnSubmit.textContent = 'Error';
    setTimeout(() => { btnSubmit.textContent = 'Create'; }, 2000);
  }
}

function flash(el) {
  el.classList.add('error');
  setTimeout(() => el.classList.remove('error'), 1500);
}

btnCancel.addEventListener('click', closeSpotlight);

btnClipboard.addEventListener('click', async () => {
  btnClipboard.disabled = true;
  clipStatus.textContent = 'Uploading…';

  const result = await window.redmine.upload.fromClipboard();
  btnClipboard.disabled = false;

  if (result.ok) {
    pendingClipToken = result.token;
    clipStatus.textContent = 'Image ready — will attach on create.';
  } else {
    pendingClipToken = null;
    clipStatus.textContent = result.error || 'Upload failed.';
  }
});
