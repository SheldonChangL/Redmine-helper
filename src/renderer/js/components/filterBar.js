export function createFilterBar(container, { projects, priorities, onChange }) {
  container.innerHTML = `
    <div class="filter-bar">
      <select id="filter-project">
        <option value="">All Projects</option>
        ${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
      </select>
      <select id="filter-priority">
        <option value="">All Priorities</option>
        ${priorities.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
      </select>
      <input type="text" id="filter-search" placeholder="Search issues…" />
      <button class="btn btn-ghost" id="filter-reset">Reset</button>
    </div>
  `;

  let debounceTimer = null;

  function emit() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      onChange({
        projectId: container.querySelector('#filter-project').value,
        priorityId: container.querySelector('#filter-priority').value,
        search: container.querySelector('#filter-search').value.toLowerCase().trim(),
      });
    }, 200);
  }

  container.querySelector('#filter-project').addEventListener('change', emit);
  container.querySelector('#filter-priority').addEventListener('change', emit);
  container.querySelector('#filter-search').addEventListener('input', emit);

  container.querySelector('#filter-reset').addEventListener('click', () => {
    container.querySelector('#filter-project').value = '';
    container.querySelector('#filter-priority').value = '';
    container.querySelector('#filter-search').value = '';
    emit();
  });
}
