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
const fileInput    = document.getElementById('file-input');
const attachList   = document.getElementById('attachment-list');

// [{ token, filename, contentType, previewDataUrl? }]
let pendingUploads = [];

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
    // best-effort
  }
});

// --- Attachments ---

function renderAttachments() {
  attachList.innerHTML = '';
  pendingUploads.forEach((att, i) => {
    const chip = document.createElement('div');
    chip.className = 'attachment-chip';

    if (att.previewDataUrl) {
      const img = document.createElement('img');
      img.src = att.previewDataUrl;
      img.className = 'attachment-preview';
      chip.appendChild(img);
    }

    const name = document.createElement('span');
    name.className = 'attachment-name';
    name.textContent = att.filename;
    chip.appendChild(name);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'attachment-remove';
    remove.textContent = '×';
    remove.addEventListener('click', () => {
      pendingUploads.splice(i, 1);
      renderAttachments();
    });
    chip.appendChild(remove);

    attachList.appendChild(chip);
  });
}

btnClipboard.addEventListener('click', async () => {
  btnClipboard.disabled = true;
  btnClipboard.textContent = 'Uploading…';

  const result = await window.redmine.upload.fromClipboard();
  btnClipboard.disabled = false;
  btnClipboard.textContent = 'Paste screenshot';

  if (result.ok) {
    pendingUploads.push({
      token: result.token,
      filename: result.filename,
      contentType: result.contentType,
      previewDataUrl: result.previewDataUrl,
    });
    renderAttachments();
  } else {
    // Show error briefly in the button
    btnClipboard.textContent = result.error || 'No image';
    setTimeout(() => { btnClipboard.textContent = 'Paste screenshot'; }, 2000);
  }
});

fileInput.addEventListener('change', async () => {
  const files = Array.from(fileInput.files);
  fileInput.value = '';
  if (!files.length) return;

  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const isImage = file.type.startsWith('image/');

    // Generate local preview before upload (images only)
    let previewDataUrl = null;
    if (isImage) {
      previewDataUrl = await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
    }

    const result = await window.redmine.upload.file(bytes, file.name, file.type || 'application/octet-stream');
    if (result.ok) {
      pendingUploads.push({
        token: result.token,
        filename: result.filename,
        contentType: result.contentType,
        previewDataUrl,
      });
      renderAttachments();
    }
  }
});

// --- Form ---

function resetForm() {
  titleInput.value = '';
  descArea.value = '';
  pendingUploads = [];
  renderAttachments();
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

  if (!subject) { flash(titleInput); titleInput.focus(); return; }
  if (!projectId) { flash(projectSel); return; }

  btnSubmit.disabled = true;
  btnSubmit.textContent = 'Creating…';

  const payload = { project_id: projectId, tracker_id: trackerId, subject, description };
  if (assigneeId) payload.assigned_to_id = assigneeId;
  if (pendingUploads.length) {
    payload.uploads = pendingUploads.map(u => ({
      token: u.token,
      filename: u.filename,
      content_type: u.contentType,
    }));
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
