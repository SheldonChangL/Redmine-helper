import { renderSettings } from './views/settings.js';
import { renderIssueList } from './views/issueList.js';
import { renderTimeLog } from './views/timeLog.js';
import { renderAiPanel } from './views/aiPanel.js';

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
    await renderIssueList(content);
  } else if (view === 'time') {
    await renderTimeLog(content);
  } else if (view === 'ai') {
    await renderAiPanel(content);
  }
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => navigate(btn.dataset.view));
});

// Boot: check credentials, go to settings if missing
window.redmine.credentials.load().then(creds => {
  navigate(creds ? 'issues' : 'settings');
});
