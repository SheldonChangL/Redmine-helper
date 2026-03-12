import { fuzzySearch } from './components/autocomplete.js';

let projects = [];
let trackers = [];
let acSelection = -1;

const input       = document.getElementById('spotlight-input');
const acList      = document.getElementById('autocomplete-list');
const form        = document.getElementById('spotlight-form');
const projectSel  = document.getElementById('project-select');
const trackerSel  = document.getElementById('tracker-select');
const descArea    = document.getElementById('issue-desc');
const btnSubmit   = document.getElementById('btn-submit');
const btnCancel   = document.getElementById('btn-cancel');
const btnClipboard = document.getElementById('btn-clipboard');
const clipStatus  = document.getElementById('clip-status');

// Pending clipboard upload token (attached when issue is created)
let pendingClipToken = null;

async function init() {
  [projects, trackers] = await Promise.all([
    window.redmine.settings.get('cachedProjects').then(v => v || []),
    window.redmine.settings.get('cachedTrackers').then(v => v || []),
  ]);

  trackers.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.name;
    trackerSel.appendChild(opt);
  });

  input.focus();
}

// Re-init every time the window becomes visible so data stays fresh
window.addEventListener('focus', init);
init();

// --- Autocomplete ---

input.addEventListener('input', () => {
  const q = input.value.trim();
  acList.innerHTML = '';
  acSelection = -1;

  if (!q) return;

  const results = fuzzySearch(projects, q);
  results.forEach(p => {
    const li = document.createElement('li');
    li.textContent = p.name;
    li.dataset.id = p.id;
    li.addEventListener('mousedown', (e) => {
      // prevent blur before the click registers
      e.preventDefault();
      pickProject(p);
    });
    acList.appendChild(li);
  });
});

function pickProject(project) {
  acList.innerHTML = '';
  acSelection = -1;
  // Set the project dropdown to the chosen project
  let opt = projectSel.querySelector(`option[value="${project.id}"]`);
  if (!opt) {
    opt = document.createElement('option');
    opt.value = project.id;
    opt.textContent = project.name;
    projectSel.appendChild(opt);
  }
  projectSel.value = project.id;
  showForm();
}

function showForm() {
  form.classList.remove('hidden');
  descArea.focus();
}

function resetAll() {
  input.value = '';
  descArea.value = '';
  acList.innerHTML = '';
  acSelection = -1;
  pendingClipToken = null;
  clipStatus.textContent = '';
  form.classList.add('hidden');
  Array.from(projectSel.options).forEach(o => {
    if (!projects.find(p => String(p.id) === o.value)) o.remove();
  });
  projectSel.value = '';
}

function closeSpotlight() {
  resetAll();
  window.redmine.spotlight.close();
}

// --- Keyboard navigation ---

input.addEventListener('keydown', (e) => {
  const items = acList.querySelectorAll('li');

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    acSelection = Math.min(acSelection + 1, items.length - 1);
    syncSelection(items);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    acSelection = Math.max(acSelection - 1, -1);
    syncSelection(items);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (acSelection >= 0 && items[acSelection]) {
      const id = Number(items[acSelection].dataset.id);
      const p = projects.find(proj => proj.id === id);
      if (p) pickProject(p);
    } else if (input.value.trim()) {
      showForm();
    }
  } else if (e.key === 'Escape') {
    closeSpotlight();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSpotlight();
});

function syncSelection(items) {
  items.forEach((li, i) => li.classList.toggle('selected', i === acSelection));
}

// --- Submit ---

btnSubmit.addEventListener('click', submitIssue);

form.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitIssue();
});

async function submitIssue() {
  const subject   = input.value.trim();
  const projectId = parseInt(projectSel.value, 10);
  const trackerId = parseInt(trackerSel.value, 10) || undefined;
  const description = descArea.value.trim();

  if (!subject) {
    input.classList.add('error');
    input.focus();
    setTimeout(() => input.classList.remove('error'), 1500);
    return;
  }
  if (!projectId) {
    projectSel.classList.add('error');
    setTimeout(() => projectSel.classList.remove('error'), 1500);
    return;
  }

  btnSubmit.disabled = true;
  btnSubmit.textContent = 'Creating…';

  const payload = { project_id: projectId, tracker_id: trackerId, subject, description };
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

btnCancel.addEventListener('click', closeSpotlight);

// --- Clipboard image upload ---

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
