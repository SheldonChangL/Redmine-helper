function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const MODES = {
  ac:       { label: 'Generate Acceptance Criteria', needsDiff: false },
  subtasks: { label: 'Generate Sub-tasks',           needsDiff: false },
  diff:     { label: 'Summarize Git Diff',           needsDiff: true  },
};

function buildPrompt(mode, context, diff) {
  if (mode === 'ac') {
    return `You are a senior software engineer. Given the following issue description, write clear Acceptance Criteria in checklist format (use "- [ ] " prefix for each item).\n\nIssue:\n${context}`;
  }
  if (mode === 'subtasks') {
    return `You are a senior software engineer. Given the following issue description, break it into specific, implementable sub-tasks as a checklist (use "- [ ] " prefix for each item).\n\nIssue:\n${context}`;
  }
  // diff
  return `Summarize the following git diff as a concise Redmine journal note. Describe what changed and why (inferred from the diff). Keep it under 200 words.\n\nDiff:\n${diff}`;
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

      <div id="ai-context-section" class="ai-section">
        <label class="ai-label">Issue description / context</label>
        <textarea id="ai-context" rows="6" placeholder="Paste or type the issue description here…"></textarea>
      </div>

      <div id="ai-diff-section" class="ai-section" style="display:none">
        <label class="ai-label">Git repository path</label>
        <div class="ai-diff-row">
          <input id="ai-repo-path" type="text" placeholder="/path/to/your/repo" />
          <button class="btn btn-secondary" id="btn-load-diff">Load Diff</button>
        </div>
        <p id="ai-diff-status" class="ai-status" style="display:none"></p>
        <textarea id="ai-diff-preview" rows="5" placeholder="Git diff will appear here…" readonly style="display:none"></textarea>
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

  const modeEl         = container.querySelector('#ai-mode');
  const backendEl      = container.querySelector('#ai-backend');
  const modelRowEl     = container.querySelector('#ai-model-row');
  const modelEl        = container.querySelector('#ai-model');
  const contextSection = container.querySelector('#ai-context-section');
  const contextEl      = container.querySelector('#ai-context');
  const diffSection    = container.querySelector('#ai-diff-section');
  const repoPathEl     = container.querySelector('#ai-repo-path');
  const diffStatusEl   = container.querySelector('#ai-diff-status');
  const diffPreviewEl  = container.querySelector('#ai-diff-preview');
  const outputSection  = container.querySelector('#ai-output-section');
  const outputEl       = container.querySelector('#ai-output');
  const errorEl        = container.querySelector('#ai-error');
  const btnGenerate    = container.querySelector('#btn-ai-generate');
  const btnCancel      = container.querySelector('#btn-ai-cancel');
  const btnClear       = container.querySelector('#btn-ai-clear');
  const btnLoadDiff    = container.querySelector('#btn-load-diff');
  const btnCopy        = container.querySelector('#btn-ai-copy');

  let currentDiff = '';

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = '';
  }

  function hideError() {
    errorEl.style.display = 'none';
  }

  function setGenerating(on) {
    btnGenerate.disabled = on;
    btnCancel.disabled   = !on;
  }

  // Backend switch — hide model input for Claude/Codex (no model needed)
  backendEl.addEventListener('change', () => {
    modelRowEl.style.display = backendEl.value === 'ollama' ? '' : 'none';
  });

  // Mode switch
  modeEl.addEventListener('change', () => {
    const needsDiff = MODES[modeEl.value].needsDiff;
    contextSection.style.display = needsDiff ? 'none' : '';
    diffSection.style.display    = needsDiff ? '' : 'none';
  });

  // Load git diff
  btnLoadDiff.addEventListener('click', async () => {
    const repoPath = repoPathEl.value.trim();
    if (!repoPath) return;

    diffStatusEl.textContent = 'Loading…';
    diffStatusEl.className   = 'ai-status';
    diffStatusEl.style.display = '';

    const result = await window.redmine.git.diff(repoPath);
    if (result.ok) {
      currentDiff = result.diff;
      diffPreviewEl.value = result.diff;
      diffPreviewEl.style.display = '';
      const lines = result.diff.split('\n').length;
      diffStatusEl.textContent = `Loaded — ${lines} lines`;
      diffStatusEl.className   = 'ai-status ai-status-ok';
    } else {
      currentDiff = '';
      diffPreviewEl.style.display = 'none';
      diffStatusEl.textContent = 'Error: ' + result.error;
      diffStatusEl.className   = 'ai-status ai-status-error';
    }
  });

  // Generate
  btnGenerate.addEventListener('click', () => {
    hideError();
    const mode    = modeEl.value;
    const backend = backendEl.value;
    const model   = modelEl.value.trim() || 'llama3.2';

    if (MODES[mode].needsDiff) {
      if (!currentDiff) { showError('Load a git diff first.'); return; }
    } else {
      if (!contextEl.value.trim()) { showError('Enter an issue description first.'); return; }
    }

    const prompt = buildPrompt(mode, contextEl.value.trim(), currentDiff);

    outputEl.textContent = '';
    outputSection.style.display = '';
    setGenerating(true);

    window.redmine.ai.generate(prompt, backend, model);
  });

  // Cancel
  btnCancel.addEventListener('click', () => {
    window.redmine.ai.cancel();
    setGenerating(false);
  });

  // Clear
  btnClear.addEventListener('click', () => {
    outputEl.textContent = '';
    outputSection.style.display = 'none';
    hideError();
    setGenerating(false);
  });

  // Copy
  btnCopy.addEventListener('click', () => {
    navigator.clipboard.writeText(outputEl.textContent);
    btnCopy.textContent = 'Copied!';
    setTimeout(() => { btnCopy.textContent = 'Copy to Clipboard'; }, 2000);
  });

  // AI streaming — check element is still in DOM before updating
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
}
