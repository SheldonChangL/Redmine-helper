import { renderSettings } from './views/settings.js';

const content = document.getElementById('content');

function applyTheme() {
  const darkLink = document.getElementById('theme-dark');
  const lightLink = document.getElementById('theme-light');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  darkLink.disabled = !prefersDark;
  lightLink.disabled = prefersDark;
}

applyTheme();
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

async function navigate(view) {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  content.innerHTML = '';

  if (view === 'settings') {
    await renderSettings(content);
  } else if (view === 'issues') {
    content.innerHTML = '<p style="color:var(--text-muted)">Issues view — coming in Phase 2.</p>';
  } else if (view === 'time') {
    content.innerHTML = '<p style="color:var(--text-muted)">Time tracking — coming in Phase 3.</p>';
  }
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => navigate(btn.dataset.view));
});

// Boot: check credentials, go to settings if missing
window.redmine.credentials.load().then(creds => {
  navigate(creds ? 'issues' : 'settings');
});
