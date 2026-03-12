import { createFilterBar } from '../components/filterBar.js';
import { renderMarkdown, wireLinks } from '../components/markdownRenderer.js';

let _allIssues = [];
let _projects = [];
let _priorities = [];
let _selectedId = null;

const PRIORITY_CLASS = { 1: 'priority-urgent', 2: 'priority-high', 3: 'priority-normal', 4: 'priority-low' };

function priorityClass(issue) {
  const name = (issue.priority?.name || '').toLowerCase();
  if (name.includes('urgent') || name.includes('immediate')) return 'priority-urgent';
  if (name.includes('high'))   return 'priority-high';
  if (name.includes('low'))    return 'priority-low';
  return 'priority-normal';
}

function renderCards(issues, listEl) {
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
        <span class="issue-id">#${issue.id}</span>
        <span class="issue-title">${escHtml(issue.subject)}</span>
        <span class="badge">${escHtml(issue.status?.name || '')}</span>
      </div>
      <div class="issue-card-meta">
        <span class="issue-project">${escHtml(issue.project?.name || '')}</span>
        ${issue.priority ? `<span class="badge">${escHtml(issue.priority.name)}</span>` : ''}
        ${issue.due_date ? `<span class="issue-project">Due: ${issue.due_date}</span>` : ''}
      </div>
    `;

    card.addEventListener('click', () => openDetail(issue, listEl.closest('[data-view-root]')));
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

async function openDetail(issue, root) {
  _selectedId = issue.id;
  root.querySelectorAll('.issue-card').forEach(c => c.classList.toggle('selected', Number(c.dataset.id) === issue.id));

  let detail = root.querySelector('.issue-detail');
  if (!detail) {
    detail = document.createElement('div');
    detail.className = 'issue-detail';
    root.appendChild(detail);
  }

  detail.innerHTML = `
    <div class="issue-detail-header">
      <span class="issue-id">#${issue.id}</span>
      <span class="issue-detail-title">${escHtml(issue.subject)}</span>
      <button class="btn-close-detail" title="Close">×</button>
    </div>
    <div>
      <span class="badge">${escHtml(issue.status?.name || '')}</span>
      ${issue.priority ? `<span class="badge" style="margin-left:4px">${escHtml(issue.priority.name)}</span>` : ''}
      ${issue.assigned_to ? `<span style="font-size:12px;color:var(--text-muted);margin-left:8px">Assigned: ${escHtml(issue.assigned_to.name)}</span>` : ''}
    </div>
    <div class="issue-body" id="detail-body">Loading…</div>
  `;

  detail.classList.add('open');
  detail.querySelector('.btn-close-detail').addEventListener('click', () => {
    detail.classList.remove('open');
    _selectedId = null;
    root.querySelectorAll('.issue-card').forEach(c => c.classList.remove('selected'));
  });

  // Fetch full issue with description
  const result = await window.redmine.issues.get(issue.id);
  const bodyEl = detail.querySelector('#detail-body');
  if (result.ok) {
    bodyEl.innerHTML = renderMarkdown(result.issue.description || '_No description._');
    wireLinks(bodyEl);
  } else {
    bodyEl.textContent = 'Failed to load: ' + result.error;
  }
}

export async function renderIssueList(container) {
  container.setAttribute('data-view-root', '');
  container.innerHTML = `
    <link rel="stylesheet" href="css/issues.css" />
    <div class="issues-toolbar">
      <span class="issues-count" id="issues-count"></span>
      <button class="btn btn-primary" id="btn-refresh">Refresh</button>
    </div>
    <div id="filter-container"></div>
    <div class="issue-list" id="issue-list">
      <div class="empty-state">Loading issues…</div>
    </div>
  `;

  const listEl = container.querySelector('#issue-list');
  const countEl = container.querySelector('#issues-count');
  const filterContainer = container.querySelector('#filter-container');

  async function load() {
    listEl.innerHTML = '<div class="empty-state">Fetching…</div>';
    const result = await window.redmine.issues.fetch();
    if (!result.ok) {
      listEl.innerHTML = `<div class="empty-state" style="color:var(--danger)">${escHtml(result.error)}</div>`;
      return;
    }
    _allIssues = result.issues;
    _projects = result.projects;
    _priorities = result.priorities;

    createFilterBar(filterContainer, {
      projects: _projects,
      priorities: _priorities,
      onChange: (filter) => {
        const filtered = applyFilter(filter);
        countEl.textContent = `${filtered.length} of ${_allIssues.length} issues`;
        renderCards(filtered, listEl);
      },
    });

    countEl.textContent = `${_allIssues.length} issues`;
    renderCards(_allIssues, listEl);
  }

  container.querySelector('#btn-refresh').addEventListener('click', load);
  await load();
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
