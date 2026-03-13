function escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Render a parent link + one-level-deep children list inside `container`.
 *
 * @param {HTMLElement} container
 * @param {object} issue - Full issue object (may have .parent and .children[])
 * @param {function} onSelect - Called with a partial issue {id, subject} when a node is clicked
 */
export async function renderTreeView(container, issue, onSelect) {
  container.innerHTML = '';

  // ── Parent link ──────────────────────────────────────────────────────────
  if (issue.parent) {
    const parentSection = document.createElement('div');
    parentSection.className = 'tree-section';
    parentSection.innerHTML = `
      <div class="tree-label">Parent</div>
      <div class="tree-node tree-parent" role="button" tabindex="0">
        <span class="tree-id">#${issue.parent.id}</span>
        <span class="tree-title">${escHtml(issue.parent.title || String(issue.parent.id))}</span>
      </div>
    `;
    if (onSelect) {
      const node = parentSection.querySelector('.tree-parent');
      node.addEventListener('click', () =>
        onSelect({ id: issue.parent.id, subject: issue.parent.title || '' })
      );
    }
    container.appendChild(parentSection);
  }

  // ── Children ─────────────────────────────────────────────────────────────
  // issue.children comes from include=children on the full fetch
  const knownChildren = issue.children || [];

  // If Redmine returned children inline, use those; else fetch them
  let children = knownChildren;
  if (!children.length) {
    const result = await window.redmine.issues.fetchChildren(issue.id);
    children = result.ok ? result.issues : [];
  }

  if (!children.length) return;

  const childSection = document.createElement('div');
  childSection.className = 'tree-section';

  const header = document.createElement('div');
  header.className = 'tree-label tree-label-toggle';
  header.innerHTML = `<span class="tree-toggle-icon">▾</span> Sub-tasks (${children.length})`;

  const list = document.createElement('div');
  list.className = 'tree-children';

  children.forEach(child => {
    const node = document.createElement('div');
    node.className = 'tree-node tree-child';
    node.innerHTML = `
      <span class="tree-id">#${child.id}</span>
      <span class="tree-title">${escHtml(child.subject)}</span>
      <span class="badge">${escHtml(child.status?.name || '')}</span>
    `;
    if (onSelect) {
      node.addEventListener('click', () => onSelect(child));
    }
    list.appendChild(node);
  });

  header.addEventListener('click', () => {
    const collapsed = list.classList.toggle('tree-collapsed');
    header.querySelector('.tree-toggle-icon').textContent = collapsed ? '▸' : '▾';
  });

  childSection.appendChild(header);
  childSection.appendChild(list);
  container.appendChild(childSection);
}
