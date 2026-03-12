export async function renderSettings(container) {
  const creds = await window.redmine.credentials.load();

  container.innerHTML = `
    <h2 style="margin-bottom:20px">Settings</h2>
    <div class="form-group">
      <label>Redmine Base URL</label>
      <input type="url" id="input-url" placeholder="https://redmine.example.com" value="${creds?.baseUrl || ''}" />
    </div>
    <div class="form-group">
      <label>API Key</label>
      <input type="password" id="input-key" placeholder="Your Redmine API key" value="${creds?.apiKey || ''}" />
    </div>
    <div style="display:flex;gap:8px;margin-top:4px">
      <button class="btn btn-primary" id="btn-save-creds">Save</button>
      <button class="btn btn-ghost" id="btn-clear-creds">Clear</button>
      <button class="btn btn-ghost" id="btn-validate-creds">Test Connection</button>
    </div>
    <p id="creds-status" style="margin-top:10px;font-size:13px"></p>
    <hr/>
    <h3 style="margin-bottom:12px">Polling Intervals</h3>
    <div class="form-group">
      <label>Issue status poll (seconds)</label>
      <input type="number" id="input-poll" min="30" max="3600" value="" />
    </div>
    <div class="form-group">
      <label>Assignment poll (seconds)</label>
      <input type="number" id="input-assign-poll" min="60" max="86400" value="" />
    </div>
    <button class="btn btn-primary" id="btn-save-settings">Save Settings</button>
  `;

  const pollInput = container.querySelector('#input-poll');
  const assignPollInput = container.querySelector('#input-assign-poll');
  const status = container.querySelector('#creds-status');

  window.redmine.settings.get('pollInterval').then(v => { pollInput.value = v ?? 60; });
  window.redmine.settings.get('assignmentPollInterval').then(v => { assignPollInput.value = v ?? 300; });

  container.querySelector('#btn-save-creds').addEventListener('click', async () => {
    const url = container.querySelector('#input-url').value.trim().replace(/\/$/, '');
    const key = container.querySelector('#input-key').value.trim();
    if (!url || !key) { status.textContent = 'URL and API key are required.'; status.style.color = 'var(--danger)'; return; }
    await window.redmine.credentials.save(url, key);
    status.textContent = 'Credentials saved.';
    status.style.color = 'var(--success)';
  });

  container.querySelector('#btn-clear-creds').addEventListener('click', async () => {
    await window.redmine.credentials.clear();
    container.querySelector('#input-url').value = '';
    container.querySelector('#input-key').value = '';
    status.textContent = 'Credentials cleared.';
    status.style.color = 'var(--text-muted)';
  });

  container.querySelector('#btn-validate-creds').addEventListener('click', async () => {
    status.textContent = 'Testing…';
    status.style.color = 'var(--text-muted)';
    const result = await window.redmine.credentials.validate();
    if (result?.ok) {
      status.textContent = `Connected — Redmine ${result.version || ''}`;
      status.style.color = 'var(--success)';
    } else {
      status.textContent = `Failed: ${result?.error || 'Unknown error'}`;
      status.style.color = 'var(--danger)';
    }
  });

  container.querySelector('#btn-save-settings').addEventListener('click', async () => {
    await window.redmine.settings.set('pollInterval', Number(pollInput.value));
    await window.redmine.settings.set('assignmentPollInterval', Number(assignPollInput.value));
    status.textContent = 'Settings saved.';
    status.style.color = 'var(--success)';
  });
}
