function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// section: which input section to show for this mode
const MODES = {
  ac:       { label: 'Generate Acceptance Criteria', section: 'context' },
  subtasks: { label: 'Generate Sub-tasks',           section: 'context' },
  diff:     { label: 'Summarize Git Diff',           section: 'diff'    },
  team:     { label: 'Analyze Team Tickets',         section: 'team'    },
  code:     { label: 'Analyze Code + Issue',         section: 'code'    },
};

function buildPrompt(mode, { context, diff, tickets, issueText, codeText }) {
  if (mode === 'ac') {
    return `You are a senior software engineer. Given the following issue description, write clear Acceptance Criteria in checklist format (use "- [ ] " prefix for each item).\n\nIssue:\n${context}`;
  }
  if (mode === 'subtasks') {
    return `You are a senior software engineer. Given the following issue description, break it into specific, implementable sub-tasks as a checklist (use "- [ ] " prefix for each item).\n\nIssue:\n${context}`;
  }
  if (mode === 'diff') {
    return `Summarize the following git diff as a concise Redmine journal note. Describe what changed and why (inferred from the diff). Keep it under 200 words.\n\nDiff:\n${diff}`;
  }
  if (mode === 'team') {
    return `You are an experienced engineering manager. Below are open Redmine tickets assigned to one or more team members. Analyze patterns, recurring blockers, risks, and workload. Provide clear, prioritized recommendations to improve the team's delivery.\n\nTickets:\n${tickets}`;
  }
  // code
  return `You are a senior software engineer. Given the issue below and the relevant source files, analyze the root cause and suggest specific code changes to resolve the issue. Reference file names where possible.\n\nIssue:\n${issueText}\n\nSource files:\n${codeText}`;
}

function formatTickets(issues) {
  return issues.map(i =>
    `#${i.id} [${i.status?.name || '?'}] ${i.subject}\n` +
    `  Assigned: ${i.assigned_to?.name || 'Unassigned'} | Priority: ${i.priority?.name || 'Normal'} | Updated: ${(i.updated_on || '').slice(0, 10)}\n` +
    (i.description ? `  ${i.description.replace(/\n/g, ' ').slice(0, 300)}` : '  (no description)')
  ).join('\n\n');
}

function formatCodeFiles(files) {
  return files.map(f =>
    `=== ${f.path} ===\n${f.content}`
  ).join('\n\n');
}

export async function renderAiPanel(container) {
  container.innerHTML = `
    <div class="ai-panel">
      <div class="ai-config">
        <div class="ai-config-row">
          <label class="ai-label">Mode</label>
          <select id="ai-mode">
            ${Object.entries(MODES).map(([k, v]) =>
              `<option value="${k}">${escHtml(v.label)}</option>`
            ).join('')}
          </select>
        </div>
        <div class="ai-config-row">
          <label class="ai-label">Backend</label>
          <select id="ai-backend">
            <option value="ollama">Ollama (local)</option>
            <option value="claude">Claude CLI</option>
            <option value="codex">Codex CLI</option>
          </select>
        </div>
        <div class="ai-config-row" id="ai-model-row">
          <label class="ai-label">Model</label>
          <input id="ai-model" type="text" value="llama3.2" placeholder="e.g. llama3.2, codellama" />
        </div>
      </div>

      <!-- Context (ac / subtasks) -->
      <div id="ai-context-section" class="ai-section">
        <label class="ai-label">Issue description / context</label>
        <textarea id="ai-context" rows="6" placeholder="Paste or type the issue description here…"></textarea>
      </div>

      <!-- Git diff -->
      <div id="ai-diff-section" class="ai-section" style="display:none">
        <label class="ai-label">Git repository path</label>
        <div class="ai-diff-row">
          <input id="ai-repo-path" type="text" placeholder="/path/to/your/repo" />
          <button class="btn btn-secondary" id="btn-load-diff">Load Diff</button>
        </div>
        <p id="ai-diff-status" class="ai-status" style="display:none"></p>
        <textarea id="ai-diff-preview" rows="5" placeholder="Git diff will appear here…" readonly style="display:none"></textarea>
      </div>

      <!-- Team analysis -->
      <div id="ai-team-section" class="ai-section" style="display:none">
        <div class="ai-config-row">
          <label class="ai-label">Project</label>
          <select id="ai-team-project"><option value="">— loading projects… —</option></select>
        </div>
        <div class="ai-team-members-row">
          <label class="ai-label">Members <span class="ai-hint">(Ctrl/Cmd+click to select multiple)</span></label>
          <select id="ai-team-members" multiple size="4"></select>
        </div>
        <button class="btn btn-secondary" id="btn-load-tickets" style="margin-top:6px">Load Tickets</button>
        <p id="ai-team-status" class="ai-status" style="display:none"></p>
      </div>

      <!-- Code + issue analysis -->
      <div id="ai-code-section" class="ai-section" style="display:none">
        <label class="ai-label">Code directory</label>
        <input id="ai-code-dir" type="text" placeholder="/path/to/project/src" />
        <label class="ai-label" style="margin-top:8px">Issue ID</label>
        <input id="ai-issue-id" type="number" placeholder="e.g. 42" min="1" />
        <button class="btn btn-secondary" id="btn-load-code" style="margin-top:8px">Load Code &amp; Issue</button>
        <p id="ai-code-status" class="ai-status" style="display:none"></p>
      </div>

      <div class="ai-actions">
        <button class="btn btn-primary" id="btn-ai-generate">Generate</button>
        <button class="btn btn-secondary" id="btn-ai-cancel" disabled>Cancel</button>
        <button class="btn" id="btn-ai-clear">Clear</button>
      </div>

      <p id="ai-error" class="ai-error" style="display:none"></p>

      <div id="ai-output-section" class="ai-output-section" style="display:none">
        <div class="ai-label">Output</div>
        <pre id="ai-output" class="ai-output"></pre>
        <button class="btn btn-secondary" id="btn-ai-copy" style="margin-top:6px">Copy to Clipboard</button>
      </div>
    </div>
  `;

  // ── Element refs ──────────────────────────────────────────────────────────
  const modeEl         = container.querySelector('#ai-mode');
  const backendEl      = container.querySelector('#ai-backend');
  const modelRowEl     = container.querySelector('#ai-model-row');
  const modelEl        = container.querySelector('#ai-model');
  const outputSection  = container.querySelector('#ai-output-section');
  const outputEl       = container.querySelector('#ai-output');
  const errorEl        = container.querySelector('#ai-error');
  const btnGenerate    = container.querySelector('#btn-ai-generate');
  const btnCancel      = container.querySelector('#btn-ai-cancel');
  const btnClear       = container.querySelector('#btn-ai-clear');
  const btnCopy        = container.querySelector('#btn-ai-copy');

  // Sections
  const sectionEls = {
    context: container.querySelector('#ai-context-section'),
    diff:    container.querySelector('#ai-diff-section'),
    team:    container.querySelector('#ai-team-section'),
    code:    container.querySelector('#ai-code-section'),
  };

  // Context
  const contextEl = container.querySelector('#ai-context');

  // Diff
  const repoPathEl   = container.querySelector('#ai-repo-path');
  const diffStatusEl = container.querySelector('#ai-diff-status');
  const diffPreviewEl= container.querySelector('#ai-diff-preview');

  // Team
  const teamProjectEl = container.querySelector('#ai-team-project');
  const teamMembersEl = container.querySelector('#ai-team-members');
  const teamStatusEl  = container.querySelector('#ai-team-status');
  const btnLoadTickets= container.querySelector('#btn-load-tickets');

  // Code
  const codeDirEl    = container.querySelector('#ai-code-dir');
  const issueIdEl    = container.querySelector('#ai-issue-id');
  const codeStatusEl = container.querySelector('#ai-code-status');
  const btnLoadCode  = container.querySelector('#btn-load-code');

  // ── State ─────────────────────────────────────────────────────────────────
  let currentDiff    = '';
  let currentTickets = '';
  let currentIssueText = '';
  let currentCodeText  = '';

  // ── Helpers ───────────────────────────────────────────────────────────────
  function showError(msg)  { errorEl.textContent = msg; errorEl.style.display = ''; }
  function hideError()     { errorEl.style.display = 'none'; }

  function setStatus(el, msg, type = '') {
    el.textContent = msg;
    el.className   = 'ai-status' + (type ? ` ai-status-${type}` : '');
    el.style.display = msg ? '' : 'none';
  }

  function setGenerating(on) {
    btnGenerate.disabled = on;
    btnCancel.disabled   = !on;
  }

  function showSection(key) {
    Object.entries(sectionEls).forEach(([k, el]) => {
      el.style.display = k === key ? '' : 'none';
    });
  }

  // ── Backend / mode switches ───────────────────────────────────────────────
  backendEl.addEventListener('change', () => {
    modelRowEl.style.display = backendEl.value === 'ollama' ? '' : 'none';
  });

  modeEl.addEventListener('change', () => {
    showSection(MODES[modeEl.value].section);
  });

  // ── Load git diff ─────────────────────────────────────────────────────────
  container.querySelector('#btn-load-diff').addEventListener('click', async () => {
    const repoPath = repoPathEl.value.trim();
    if (!repoPath) return;

    setStatus(diffStatusEl, 'Loading…');
    const result = await window.redmine.git.diff(repoPath);
    if (result.ok) {
      currentDiff = result.diff;
      diffPreviewEl.value = result.diff;
      diffPreviewEl.style.display = '';
      setStatus(diffStatusEl, `Loaded — ${result.diff.split('\n').length} lines`, 'ok');
    } else {
      currentDiff = '';
      diffPreviewEl.style.display = 'none';
      setStatus(diffStatusEl, 'Error: ' + result.error, 'error');
    }
  });

  // ── Load projects for team mode ───────────────────────────────────────────
  async function loadProjects() {
    try {
      const result = await window.redmine.projects.list();
      if (!result.ok) {
        teamProjectEl.innerHTML = `<option value="">Failed to load projects</option>`;
        return;
      }
      teamProjectEl.innerHTML =
        `<option value="">— select a project —</option>` +
        result.projects.map(p => `<option value="${p.id}">${escHtml(p.name)}</option>`).join('');
    } catch (err) {
      teamProjectEl.innerHTML = `<option value="">Error: ${escHtml(err.message)}</option>`;
    }
  }

  teamProjectEl.addEventListener('change', async () => {
    const projectId = teamProjectEl.value;
    teamMembersEl.innerHTML = '<option disabled>Loading…</option>';
    if (!projectId) return;

    try {
      const result = await window.redmine.projects.members(projectId);
      if (result.ok) {
        teamMembersEl.innerHTML = result.members.map(m =>
          `<option value="${m.id}">${escHtml(m.name)}</option>`
        ).join('');
      } else {
        teamMembersEl.innerHTML = `<option disabled>Failed: ${escHtml(result.error)}</option>`;
      }
    } catch (err) {
      teamMembersEl.innerHTML = `<option disabled>Error: ${escHtml(err.message)}</option>`;
    }
  });

  btnLoadTickets.addEventListener('click', async () => {
    const projectId = teamProjectEl.value;
    if (!projectId) { setStatus(teamStatusEl, 'Select a project first.', 'error'); return; }

    const selectedIds = Array.from(teamMembersEl.selectedOptions).map(o => Number(o.value));
    if (selectedIds.length === 0) { setStatus(teamStatusEl, 'Select at least one member.', 'error'); return; }

    setStatus(teamStatusEl, 'Loading tickets…');
    try {
      const result = await window.redmine.issues.fetchByAssignees(projectId, selectedIds);
      if (result.ok) {
        currentTickets = formatTickets(result.issues);
        setStatus(teamStatusEl, `Loaded ${result.issues.length} ticket(s)`, 'ok');
      } else {
        currentTickets = '';
        setStatus(teamStatusEl, 'Error: ' + result.error, 'error');
      }
    } catch (err) {
      setStatus(teamStatusEl, 'Error: ' + err.message, 'error');
    }
  });

  // ── Load code + issue ─────────────────────────────────────────────────────
  btnLoadCode.addEventListener('click', async () => {
    const dir     = codeDirEl.value.trim();
    const issueId = Number(issueIdEl.value);

    if (!dir)     { setStatus(codeStatusEl, 'Enter a directory path.', 'error'); return; }
    if (!issueId) { setStatus(codeStatusEl, 'Enter a valid issue ID.', 'error'); return; }

    setStatus(codeStatusEl, 'Loading…');

    try {
      const [codeResult, issueResult] = await Promise.all([
        window.redmine.code.read(dir),
        window.redmine.issues.get(issueId),
      ]);

      const errors = [];
      if (codeResult.ok) {
        currentCodeText = formatCodeFiles(codeResult.files);
        if (codeResult.truncated) errors.push('Code truncated to 200 KB.');
      } else {
        currentCodeText = '';
        errors.push('Code: ' + codeResult.error);
      }

      if (issueResult.ok) {
        const i = issueResult.issue;
        currentIssueText = `#${i.id} — ${i.subject}\n${i.description || '(no description)'}`;
      } else {
        currentIssueText = '';
        errors.push('Issue: ' + issueResult.error);
      }

      if (errors.length) {
        setStatus(codeStatusEl, errors.join(' | '), currentCodeText && currentIssueText ? '' : 'error');
      } else {
        setStatus(codeStatusEl, `Loaded ${codeResult.files.length} file(s) + issue #${issueId}`, 'ok');
      }
    } catch (err) {
      currentCodeText  = '';
      currentIssueText = '';
      setStatus(codeStatusEl, 'Error: ' + err.message, 'error');
    }
  });

  // ── Generate ──────────────────────────────────────────────────────────────
  btnGenerate.addEventListener('click', () => {
    hideError();
    const mode    = modeEl.value;
    const backend = backendEl.value;
    const model   = modelEl.value.trim() || 'llama3.2';

    // Validate inputs per mode
    if (mode === 'ac' || mode === 'subtasks') {
      if (!contextEl.value.trim()) { showError('Enter an issue description first.'); return; }
    } else if (mode === 'diff') {
      if (!currentDiff) { showError('Load a git diff first.'); return; }
    } else if (mode === 'team') {
      if (!currentTickets) { showError('Load tickets first.'); return; }
    } else if (mode === 'code') {
      if (!currentCodeText || !currentIssueText) { showError('Load code and issue first.'); return; }
    }

    const prompt = buildPrompt(mode, {
      context:    contextEl.value.trim(),
      diff:       currentDiff,
      tickets:    currentTickets,
      issueText:  currentIssueText,
      codeText:   currentCodeText,
    });

    outputEl.textContent = '';
    outputSection.style.display = '';
    setGenerating(true);

    window.redmine.ai.generate(prompt, backend, model);
  });

  btnCancel.addEventListener('click', () => {
    window.redmine.ai.cancel();
    setGenerating(false);
  });

  btnClear.addEventListener('click', () => {
    outputEl.textContent = '';
    outputSection.style.display = 'none';
    hideError();
    setGenerating(false);
  });

  btnCopy.addEventListener('click', () => {
    navigator.clipboard.writeText(outputEl.textContent);
    btnCopy.textContent = 'Copied!';
    setTimeout(() => { btnCopy.textContent = 'Copy to Clipboard'; }, 2000);
  });

  // ── AI streaming ──────────────────────────────────────────────────────────
  window.redmine.on('ai:token', (token) => {
    if (!document.contains(outputEl)) return;
    outputEl.textContent += token;
    outputEl.scrollTop = outputEl.scrollHeight;
  });

  window.redmine.on('ai:done', () => {
    if (!document.contains(btnGenerate)) return;
    setGenerating(false);
  });

  window.redmine.on('ai:error', (err) => {
    if (!document.contains(errorEl)) return;
    setGenerating(false);
    showError(err);
  });

  // Load projects when team mode is first shown
  loadProjects();
}
