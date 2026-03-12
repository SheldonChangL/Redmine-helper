import { createFilterBar } from '../components/filterBar.js';
import { openIssueDetail } from './issueDetail.js';

let _allIssues = [];
let _projects = [];
let _priorities = [];
let _selectedId = null;
let _notifyHandler = null; // current NOTIFY_ISSUE_CHANGED listener (replaced on each render)

function priorityClass(issue) {
  const name = (issue.priority?.name || '').toLowerCase();
  if (name.includes('urgent') || name.includes('immediate')) return 'priority-urgent';
  if (name.includes('high'))   return 'priority-high';
  if (name.includes('low'))    return 'priority-low';
  return 'priority-normal';
}

function renderCards(issues, listEl, root) {
  listEl.innerHTML = '';
  if (!issues.length) {
    listEl.innerHTML = '<div class="empty-state">No issues match your filter.</div>';
    return;
  }
  issues.forEach(issue => {
    const card = document.createElement('div');
    card.className = `issue-card ${priorityClass(issue)}`;
    card.dataset.id = issue.id;
    if (issue.id === _selectedId) card.classList.add('selected');

    card.innerHTML = `
      <div class="issue-card-header">
        <span class="issue-id">#${escHtml(String(issue.id))}</span>
        <span class="issue-title">${escHtml(issue.subject)}</span>
        <span class="badge">${escHtml(issue.status?.name || '')}</span>
      </div>
      <div class="issue-card-meta">
        <span class="issue-project">${escHtml(issue.project?.name || '')}</span>
        ${issue.priority ? `<span class="badge">${escHtml(issue.priority.name)}</span>` : ''}
        ${issue.due_date ? `<span class="issue-project">Due: ${issue.due_date}</span>` : ''}
      </div>
    `;

    card.addEventListener('click', () => {
      _selectedId = issue.id;
      listEl.querySelectorAll('.issue-card').forEach(c =>
        c.classList.toggle('selected', Number(c.dataset.id) === issue.id)
      );
      openIssueDetail(issue, root, (updated) => {
        if (!updated) {
          // Panel closed — deselect
          _selectedId = null;
          listEl.querySelectorAll('.issue-card').forEach(c => c.classList.remove('selected'));
          return;
        }
        // Patch in-memory issue so the card reflects the change without a full reload
        const idx = _allIssues.findIndex(i => i.id === issue.id);
        if (idx !== -1) Object.assign(_allIssues[idx], updated);
      });
    });

    listEl.appendChild(card);
  });
}

function applyFilter(filter) {
  let result = _allIssues;
  if (filter.projectId)  result = result.filter(i => String(i.project?.id) === filter.projectId);
  if (filter.priorityId) result = result.filter(i => String(i.priority?.id) === filter.priorityId);
  if (filter.search)     result = result.filter(i =>
    i.subject.toLowerCase().includes(filter.search) ||
    String(i.id).includes(filter.search)
  );
  return result;
}

export async function renderIssueList(container) {
  // Replace previous notification handler so navigating away and back doesn't stack listeners
  if (_notifyHandler) {
    window.redmine.off('notify:issueChanged', _notifyHandler);
    _notifyHandler = null;
  }

  container.setAttribute('data-view-root', '');
  container.innerHTML = `
    <link rel="stylesheet" href="css/issues.css" />
    <link rel="stylesheet" href="css/tree.css" />
    <div class="issues-toolbar">
      <span class="issues-count" id="issues-count"></span>
      <button class="btn btn-primary" id="btn-refresh">Refresh</button>
    </div>
    <div id="filter-container"></div>
    <div class="issue-list" id="issue-list">
      <div class="empty-state">Loading issues…</div>
    </div>
  `;

  const root            = container;
  const listEl          = container.querySelector('#issue-list');
  const countEl         = container.querySelector('#issues-count');
  const filterContainer = container.querySelector('#filter-container');

  async function load() {
    listEl.innerHTML = '<div class="empty-state">Fetching…</div>';
    const result = await window.redmine.issues.fetch();
    if (!result.ok) {
      listEl.innerHTML = `<div class="empty-state" style="color:var(--danger)">${escHtml(result.error)}</div>`;
      return;
    }
    _allIssues = result.issues;
    _projects  = result.projects;
    _priorities = result.priorities;

    createFilterBar(filterContainer, {
      projects:   _projects,
      priorities: _priorities,
      onChange: (filter) => {
        const filtered = applyFilter(filter);
        countEl.textContent = `${filtered.length} of ${_allIssues.length} issues`;
        renderCards(filtered, listEl, root);
      },
    });

    countEl.textContent = `${_allIssues.length} issues`;
    renderCards(_allIssues, listEl, root);
  }

  container.querySelector('#btn-refresh').addEventListener('click', load);

  // Auto-refresh when the background poller detects a change
  _notifyHandler = () => load();
  window.redmine.on('notify:issueChanged', _notifyHandler);

  await load();
}

function escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
