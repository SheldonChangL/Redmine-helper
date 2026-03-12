const axios = require('axios');
const credentials = require('../credentials');

let _client = null;

function buildClient(baseUrl, apiKey) {
  return axios.create({
    baseURL: baseUrl.replace(/\/$/, ''),
    headers: {
      'X-Redmine-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  });
}

function getClient() {
  if (_client) return _client;
  const creds = credentials.load();
  if (!creds) throw new Error('No credentials saved. Configure Redmine URL and API key in Settings.');
  _client = buildClient(creds.baseUrl, creds.apiKey);
  return _client;
}

// Call after credentials are saved/cleared to force rebuild
function resetClient() {
  _client = null;
}

async function ping() {
  const creds = credentials.load();
  if (!creds) return { ok: false, error: 'No credentials configured.' };
  try {
    const client = buildClient(creds.baseUrl, creds.apiKey);
    const res = await client.get('/users/current.json');
    return { ok: true, user: res.data.user };
  } catch (err) {
    return { ok: false, error: err.response?.data?.errors?.join(', ') || err.message };
  }
}

async function fetchMyOpenIssues() {
  const client = getClient();
  const params = {
    assigned_to_id: 'me',
    status_id: 'open',
    limit: 100,
    include: 'attachments',
  };
  const res = await client.get('/issues.json', { params });
  return res.data.issues;
}

async function fetchIssue(id) {
  const client = getClient();
  const res = await client.get(`/issues/${id}.json`, {
    params: { include: 'children,attachments,journals,watchers' },
  });
  return res.data.issue;
}

async function fetchProjects() {
  const client = getClient();
  const res = await client.get('/projects.json', { params: { limit: 100 } });
  return res.data.projects;
}

async function fetchTrackers() {
  const client = getClient();
  const res = await client.get('/trackers.json');
  return res.data.trackers;
}

async function fetchPriorities() {
  const client = getClient();
  const res = await client.get('/enumerations/issue_priorities.json');
  return res.data.issue_priorities;
}

async function updateIssue(id, fields) {
  const client = getClient();
  await client.put(`/issues/${id}.json`, { issue: fields });
}

async function fetchTimeActivities() {
  const client = getClient();
  const res = await client.get('/enumerations/time_entry_activities.json');
  return res.data.time_entry_activities;
}

async function fetchChildren(parentId) {
  const client = getClient();
  const res = await client.get('/issues.json', {
    params: { parent_id: parentId, limit: 100 },
  });
  return res.data.issues;
}

module.exports = {
  getClient,
  resetClient,
  ping,
  fetchMyOpenIssues,
  fetchIssue,
  fetchProjects,
  fetchTrackers,
  fetchPriorities,
  updateIssue,
  fetchChildren,
  fetchTimeActivities,
};
