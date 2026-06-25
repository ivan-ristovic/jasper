const params = new URLSearchParams(window.location.search);
const demoMode = params.get('demo');

const state = {
  actions: [],
  selectedActionId: null,
  selectedJobId: null,
  currentJob: null,
  queue: [],
  history: [],
  server: null,
  logs: new Map()
};

const els = {
  serverInfo: document.getElementById('serverInfo'),
  envToggle: document.getElementById('envToggle'),
  envStrip: document.getElementById('envStrip'),
  actionCount: document.getElementById('actionCount'),
  actionList: document.getElementById('actionList'),
  selectedTitle: document.getElementById('selectedTitle'),
  selectedReady: document.getElementById('selectedReady'),
  selectedDescription: document.getElementById('selectedDescription'),
  requirementList: document.getElementById('requirementList'),
  runForm: document.getElementById('runForm'),
  runButton: document.getElementById('runButton'),
  formMessage: document.getElementById('formMessage'),
  queueCount: document.getElementById('queueCount'),
  currentJob: document.getElementById('currentJob'),
  queueList: document.getElementById('queueList'),
  cancelButton: document.getElementById('cancelButton'),
  logOutput: document.getElementById('logOutput'),
  historyCount: document.getElementById('historyCount'),
  historyList: document.getElementById('historyList')
};

let envVisible = false;

// Deterministic demo data is used by the paper screenshot generator.
function demoSnapshot() {
  const actions = [
    {
      id: 'sd-jmh-run-native',
      benchmark: 'sd-jmh-native',
      group: 'Serializer microbenchmarks',
      label: 'Run native executable',
      description: 'Run the native serializer JMH executable, building it first if needed.',
      ready: false,
      checks: [{ type: 'env', name: 'GRAALVM_HOME', ok: false, message: 'GRAALVM_HOME is not set' }],
      argsSchema: [
        { name: 'benchmarkFilter', label: 'Benchmark filter', type: 'jmh-filter', default: 'SerializationBenchmark', required: false, help: 'Optional single JMH include filter.' },
        { name: 'warmupIterations', label: 'Warmup iterations', type: 'integer', default: 5, required: false, min: 1, max: 1000 },
        { name: 'iterations', label: 'Measurement iterations', type: 'integer', default: 10, required: false, min: 1, max: 1000 }
      ]
    },
    {
      id: 'memory-run-all',
      benchmark: 'memory-syscalls-scalability',
      group: 'POSIX memory baselines',
      label: 'All memory syscall demos',
      description: 'Compile and run all POSIX memory-operation baselines.',
      ready: true,
      checks: [{ type: 'tool', name: 'gcc', ok: true, message: 'gcc found' }],
      argsSchema: [{ name: 'iterations', label: 'Iterations', type: 'integer', default: 100000, required: true, min: 1, max: 1000000000 }]
    },
    {
      id: 'mn-bench-rss',
      benchmark: 'mn-cache-isolate',
      group: 'Micronaut macrobenchmark',
      label: 'Measure RSS',
      description: 'Run the external RSS measurement script.',
      ready: true,
      checks: [
        { type: 'env', name: 'GRAALVM_HOME', ok: true, message: 'GRAALVM_HOME is set' },
        { type: 'tool', name: 'curl', ok: true, message: 'curl found' }
      ],
      argsSchema: [
        { name: 'isolates', label: 'Isolates', type: 'integer', default: 8, required: true, min: 1, max: 128 },
        { name: 'timeout', label: 'Request timeout', type: 'duration', default: '5s', required: true },
        { name: 'loadCache', label: 'Load cache before second RSS sample', type: 'choice', default: 'y', required: true, choices: [{ value: 'y', label: 'yes' }, { value: 'n', label: 'no' }] }
      ]
    },
    {
      id: 'nlp-run-jvm',
      benchmark: 'stanfordnlp-preload',
      group: 'NLP macrobenchmark',
      label: 'Run JVM workload',
      description: 'Run the Stanford CoreNLP workload on the JVM.',
      ready: true,
      checks: [],
      argsSchema: []
    }
  ];

  const running = {
    id: 'demo-running',
    actionId: 'memory-run-all',
    actionLabel: 'All memory syscall demos',
    benchmark: 'memory-syscalls-scalability',
    status: 'running',
    createdAt: '2026-06-18T10:22:00.000Z',
    startedAt: '2026-06-18T10:22:04.000Z',
    commandPreview: 'memory-syscalls-scalability/run_all.sh "100000"',
    durationMs: null
  };
  const done = {
    id: 'demo-succeeded',
    actionId: 'mn-bench-rss',
    actionLabel: 'Measure RSS',
    benchmark: 'mn-cache-isolate',
    status: 'succeeded',
    createdAt: '2026-06-18T09:55:00.000Z',
    startedAt: '2026-06-18T09:55:02.000Z',
    endedAt: '2026-06-18T09:56:31.000Z',
    durationMs: 89000,
    exitCode: 0,
    commandPreview: 'mn-cache-isolate/bench-rss "8" "5s" "y"'
  };

  const logs = new Map();
  logs.set('demo-running', [
    '$ memory-syscalls-scalability/run_all.sh "100000"',
    'cwd: memory-syscalls-scalability',
    '',
    'Entering memcpy/',
    '+ gcc test_memcpy.c ../utils/*.c -g -o test_memcpy.out -Wall -Wextra',
    '+ ./test_memcpy.out memcpy_test 100000 > memcpy_test.log 2>&1',
    'Entering malloc/',
    '+ gcc test_malloc.c ../utils/*.c -g -o test_malloc.out -Wall -Wextra',
    '+ ./test_malloc.out malloc_no_init 100000 > malloc_no_init.log 2>&1'
  ].join('\n'));
  logs.set('demo-succeeded', [
    '$ mn-cache-isolate/bench-rss "8" "5s" "y"',
    'Server started in background',
    'Measured RSS via ps: 245812',
    'Sending requests to server listening on port 8080...',
    'Sending requests to server listening on port 8087...',
    'Measured RSS via ps: 318440',
    'Process finished with status succeeded, exit code 0, signal none.'
  ].join('\n'));

  const queued = { ...running, id: 'demo-queued', status: 'queued', startedAt: null };

  return {
    actions,
    currentJob: demoMode === 'logs' ? running : null,
    queue: demoMode === 'logs' ? [] : [queued],
    history: demoMode === 'logs' ? [running, done] : [done],
    server: {
      node: 'v26.1.0',
      platform: 'Linux local',
      version: 'v26.1.0'
    },
    logs
  };
}

function statusClass(status) {
  if (status === 'succeeded') return 'status succeeded';
  if (['running', 'queued', 'canceling'].includes(status)) return `status ${status}`;
  if (['failed', 'canceled', 'interrupted'].includes(status)) return `status ${status}`;
  return 'status neutral';
}

function formatTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', month: 'short', day: 'numeric' });
}

function formatDuration(ms) {
  if (!ms) return '';
  if (ms < 1000) return `${ms} ms`;
  const seconds = Math.round(ms / 100) / 10;
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

function selectedAction() {
  return state.actions.find((action) => action.id === state.selectedActionId) || null;
}

function selectedJob() {
  const allJobs = [state.currentJob, ...state.queue, ...state.history].filter(Boolean);
  return allJobs.find((job) => job.id === state.selectedJobId) || null;
}

function setSnapshot(data) {
  // Server snapshots are authoritative for actions, queue state, and history.
  // Preserve the current selection when possible so live updates do not reset UI focus.
  state.actions = data.actions || [];
  state.currentJob = data.currentJob || null;
  state.queue = data.queue || [];
  state.history = data.history || [];
  state.server = data.server || null;
  if (!state.selectedActionId && state.actions.length > 0) {
    const readyAction = state.actions.find((action) => action.ready) || state.actions[0];
    state.selectedActionId = readyAction.id;
  }
  if (!state.selectedJobId) {
    state.selectedJobId = state.currentJob?.id || state.history[0]?.id || null;
  }
  render();
}

function render() {
  renderServer();
  renderEnv();
  renderActions();
  renderSelectedAction();
  renderQueue();
  renderHistory();
  renderLog();
}

function renderServer() {
  if (!state.server) {
    els.serverInfo.textContent = 'Connecting...';
    return;
  }
  els.serverInfo.textContent = state.server.version || state.server.node || '';
}

function renderEnv() {
  // Merge duplicate requirement checks across actions and prefer a passing check.
  const checks = new Map();
  for (const action of state.actions) {
    for (const check of action.checks || []) {
      const key = `${check.type}:${check.name}`;
      if (!checks.has(key)) checks.set(key, check);
      if (check.ok) checks.set(key, check);
    }
  }
  els.envStrip.innerHTML = '';
  if (checks.size === 0) {
    els.envStrip.innerHTML = '<div class="env-item"><strong>No requirements</strong><span>Selected actions do not declare external requirements.</span></div>';
    return;
  }
  for (const check of checks.values()) {
    const item = document.createElement('div');
    item.className = 'env-item';
    item.innerHTML = `<strong>${check.name}</strong><span class="${check.ok ? 'ok-text' : 'bad-text'}">${check.message}</span>`;
    els.envStrip.appendChild(item);
  }
}

function renderActions() {
  els.actionCount.textContent = String(state.actions.length);
  els.actionList.innerHTML = '';
  const groups = new Map();
  for (const action of state.actions) {
    if (!groups.has(action.group)) groups.set(action.group, []);
    groups.get(action.group).push(action);
  }
  for (const [group, actions] of groups.entries()) {
    const title = document.createElement('div');
    title.className = 'group-title';
    title.textContent = group;
    els.actionList.appendChild(title);
    for (const action of actions) {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = `action-row ${action.id === state.selectedActionId ? 'selected' : ''}`;
      row.onclick = () => {
        state.selectedActionId = action.id;
        render();
      };
      row.innerHTML = `
        <div class="row-title"><span>${action.label}</span><span class="${action.ready ? 'status ok' : 'status warn'}">${action.ready ? 'ready' : 'check'}</span></div>
        <div class="row-subtitle">${action.benchmark}</div>
      `;
      els.actionList.appendChild(row);
    }
  }
}

function renderSelectedAction() {
  const action = selectedAction();
  els.runForm.innerHTML = '';
  els.requirementList.innerHTML = '';
  els.formMessage.textContent = '';
  if (!action) {
    els.selectedTitle.textContent = 'Select an action';
    els.selectedDescription.textContent = 'Choose a JASPER action to configure a run.';
    els.selectedReady.textContent = 'idle';
    els.selectedReady.className = 'status neutral';
    els.runButton.disabled = true;
    return;
  }

  els.selectedTitle.textContent = action.label;
  els.selectedDescription.textContent = action.description;
  els.selectedReady.textContent = action.ready ? 'ready' : 'blocked';
  els.selectedReady.className = action.ready ? 'status ok' : 'status warn';

  if ((action.checks || []).length === 0) {
    els.requirementList.innerHTML = '<div class="requirement"><span>No external requirements declared</span><span class="status ok">ready</span></div>';
  } else {
    for (const check of action.checks) {
      const req = document.createElement('div');
      req.className = 'requirement';
      req.innerHTML = `<span>${check.message}</span><span class="${check.ok ? 'status ok' : 'status warn'}">${check.ok ? 'ok' : 'missing'}</span>`;
      els.requirementList.appendChild(req);
    }
  }

  // The form is generated from the server-side argument schema for the selected action.
  for (const arg of action.argsSchema || []) {
    const wrapper = document.createElement('div');
    wrapper.className = 'field';
    const id = `arg-${arg.name}`;
    if (arg.type === 'choice') {
      wrapper.innerHTML = `
        <label for="${id}">${arg.label}</label>
        <select id="${id}" name="${arg.name}">
          ${arg.choices.map((choice) => `<option value="${choice.value}" ${choice.value === arg.default ? 'selected' : ''}>${choice.label}</option>`).join('')}
        </select>
        ${arg.help ? `<p>${arg.help}</p>` : ''}
      `;
    } else {
      const type = arg.type === 'integer' ? 'number' : 'text';
      wrapper.innerHTML = `
        <label for="${id}">${arg.label}</label>
        <input id="${id}" name="${arg.name}" type="${type}" value="${arg.default ?? ''}" ${arg.required ? 'required' : ''} ${arg.min !== undefined ? `min="${arg.min}"` : ''} ${arg.max !== undefined ? `max="${arg.max}"` : ''}>
        ${arg.help ? `<p>${arg.help}</p>` : ''}
      `;
    }
    els.runForm.appendChild(wrapper);
  }

  if ((action.argsSchema || []).length === 0) {
    els.runForm.innerHTML = '<div class="field"><p>This action runs with its script defaults.</p></div>';
  }

  els.runButton.disabled = !action.ready || Boolean(demoMode);
  if (demoMode) els.formMessage.textContent = 'Demo mode uses fixed sample data.';
}

function renderQueue() {
  els.queueCount.textContent = String(state.queue.length);
  const job = state.currentJob;
  if (!job) {
    els.currentJob.className = 'current-job empty';
    els.currentJob.textContent = 'No active job';
  } else {
    els.currentJob.className = 'current-job';
    els.currentJob.innerHTML = `
      <div class="row-title"><span>${job.actionLabel}</span><span class="${statusClass(job.status)}">${job.status}</span></div>
      <div class="row-subtitle">${job.commandPreview}</div>
    `;
  }
  els.queueList.innerHTML = '';
  for (const item of state.queue) {
    const row = document.createElement('div');
    row.className = 'queue-row';
    row.innerHTML = `
      <div class="row-title"><span>${item.actionLabel}</span><span class="${statusClass(item.status)}">${item.status}</span></div>
      <div class="row-subtitle">${item.commandPreview}</div>
    `;
    els.queueList.appendChild(row);
  }
  const selected = selectedJob();
  els.cancelButton.disabled = demoMode || !selected || !['queued', 'running', 'canceling'].includes(selected.status);
}

function renderHistory() {
  els.historyCount.textContent = String(state.history.length);
  els.historyList.innerHTML = '';
  for (const job of state.history) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = `history-row ${job.id === state.selectedJobId ? 'selected' : ''}`;
    row.onclick = () => selectJob(job.id);
    row.innerHTML = `
      <div class="row-title"><span>${job.actionLabel}</span><span class="${statusClass(job.status)}">${job.status}</span></div>
      <div class="row-subtitle">${job.benchmark} · ${formatTime(job.createdAt)} ${job.durationMs ? `· ${formatDuration(job.durationMs)}` : ''}</div>
    `;
    els.historyList.appendChild(row);
  }
}

async function selectJob(id) {
  state.selectedJobId = id;
  // Logs are fetched lazily for historical jobs; live jobs stream through EventSource.
  if (!state.logs.has(id) && !demoMode) {
    const response = await fetch(`/api/jobs/${id}/log`);
    if (response.ok) state.logs.set(id, await response.text());
  }
  render();
}

function renderLog() {
  const selected = selectedJob();
  if (!selected) {
    els.logOutput.textContent = 'Select a run to view logs.';
    return;
  }
  const log = state.logs.get(selected.id);
  els.logOutput.textContent = log || `${selected.commandPreview}\n\nWaiting for log output...`;
  els.logOutput.scrollTop = els.logOutput.scrollHeight;
}

function formValues() {
  const action = selectedAction();
  const values = {};
  for (const arg of action.argsSchema || []) {
    const input = els.runForm.querySelector(`[name="${arg.name}"]`);
    if (input) values[arg.name] = input.value;
  }
  return values;
}

async function runSelectedAction() {
  const action = selectedAction();
  if (!action || demoMode) return;
  els.runButton.disabled = true;
  els.formMessage.textContent = 'Queueing job...';
  const response = await fetch('/api/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actionId: action.id, args: formValues() })
  });
  const data = await response.json();
  if (!response.ok) {
    els.formMessage.textContent = data.error || 'Failed to queue job.';
  } else {
    state.selectedJobId = data.job.id;
    els.formMessage.textContent = 'Job queued.';
  }
  els.runButton.disabled = !action.ready;
}

async function cancelSelectedJob() {
  const job = selectedJob();
  if (!job || demoMode) return;
  await fetch(`/api/jobs/${job.id}/cancel`, { method: 'POST' });
}

function connectEvents() {
  const events = new EventSource('/api/events');
  events.addEventListener('snapshot', (event) => setSnapshot(JSON.parse(event.data)));
  events.addEventListener('log', (event) => {
    const payload = JSON.parse(event.data);
    const current = state.logs.get(payload.jobId) || '';
    state.logs.set(payload.jobId, current + payload.text);
    if (state.selectedJobId === payload.jobId) renderLog();
  });
  events.onerror = () => {
    els.serverInfo.textContent = 'Connection lost; retrying...';
  };
}

async function init() {
  els.runButton.addEventListener('click', runSelectedAction);
  els.cancelButton.addEventListener('click', cancelSelectedJob);
  els.envToggle.addEventListener('click', () => {
    envVisible = !envVisible;
    els.envStrip.hidden = !envVisible;
    els.envToggle.textContent = envVisible ? 'Hide environment' : 'Show environment';
    els.envToggle.setAttribute('aria-expanded', String(envVisible));
  });

  if (demoMode) {
    const demo = demoSnapshot();
    state.logs = demo.logs;
    setSnapshot(demo);
    if (demoMode === 'logs') state.selectedJobId = 'demo-running';
    if (demoMode === 'config') state.selectedActionId = 'mn-bench-rss';
    render();
    return;
  }

  const response = await fetch('/api/jobs');
  setSnapshot(await response.json());
  connectEvents();
}

init().catch((error) => {
  els.serverInfo.textContent = error.message;
});
