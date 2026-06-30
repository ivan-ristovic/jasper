#!/usr/bin/env node

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { spawn } = require('child_process');

const TOOL_ROOT = path.resolve(__dirname, '..');
const BENCH_ROOT = path.resolve(TOOL_ROOT, '..', '..');
const JASPER = path.join(BENCH_ROOT, 'jasper');
const SERVER = path.join(TOOL_ROOT, 'server.js');
const PORT = Number(process.env.JASPER_VERIFY_PORT || 5199);
const URL = `http://127.0.0.1:${PORT}`;
const GRAALVM_HOME = process.env.JASPER_VERIFY_GRAALVM_HOME || '/home/ivan/ol/graalvm-jdk-21.0.11+9.1';
const STATE_DIR = process.env.JASPER_VERIFY_STATE_DIR || '.jasper';
const RUN_TIMEOUT_MS = Number(process.env.JASPER_VERIFY_RUN_TIMEOUT_MS || 45 * 60 * 1000);
const START_TIMEOUT_MS = Number(process.env.JASPER_VERIFY_START_TIMEOUT_MS || 8 * 60 * 1000);
const POLL_MS = 1000;
const JMH_SMOKE_ARGS = {
  benchmarkFilter: 'SerializationBenchmark.benchmarkS',
  serializerTag: 'java',
  workloadTag: 'lst<int>[1]',
  warmupIterations: 0,
  iterations: 1,
  measurementTime: '100ms',
  forks: 0
};

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.join(BENCH_ROOT, '.jasper', 'verification', stamp);
const transcriptPath = path.join(outDir, 'transcript.log');
const summaryPath = path.join(outDir, 'summary.json');

const finiteChecks = [
  { actionId: 'core-tests-build' },
  { actionId: 'core-tests-run-jvm', expect: ['Type java.lang.Boolean', 'Deserialized'] },
  { actionId: 'core-tests-build-native' },
  { actionId: 'core-tests-run-native', expect: ['Type java.lang.Boolean', 'Deserialized'] },
  { actionId: 'core-tests-build-native-pgo' },
  { actionId: 'core-tests-run-native-pgo', expect: ['Type java.lang.Boolean', 'Deserialized'] },
  { actionId: 'sd-jmh-build' },
  { actionId: 'sd-jmh-run-jvm', args: JMH_SMOKE_ARGS, expect: ['Benchmark', 'lst<int>[1]', 'ops/s'] },
  { actionId: 'sd-jmh-build-native' },
  { actionId: 'sd-jmh-run-native', args: JMH_SMOKE_ARGS, expect: ['Benchmark', 'lst<int>[1]', 'ops/s'] },
  { actionId: 'sd-jmh-build-native-pgo', args: JMH_SMOKE_ARGS },
  { actionId: 'sd-jmh-run-native-pgo', args: JMH_SMOKE_ARGS, expect: ['Benchmark', 'lst<int>[1]', 'ops/s'] },
  { actionId: 'sd-baselines-run-all', args: { iterations: 1 }, expect: ['test_memcpy.out', 'test_malloc.out'] },
  { actionId: 'sd-baselines-memcpy', args: { iterations: 1, chunkSize: 16 }, expect: ['test_memcpy.out'] },
  { actionId: 'sd-baselines-malloc', args: { iterations: 1, chunkSize: 16 }, expect: ['test_malloc.out'] },
  { actionId: 'sd-baselines-malloc-fragmented', args: { iterations: 1, chunkSize: 16 }, expect: ['test_malloc_fragmented.out'] },
  { actionId: 'sd-baselines-free', args: { iterations: 1, chunkSize: 16 }, expect: ['test_free.out'] },
  { actionId: 'sd-baselines-free-fragmented', args: { iterations: 1, chunkSize: 16 }, expect: ['test_free_fragmented.out'] },
  { actionId: 'sd-baselines-mmap-anon', args: { iterations: 1, chunkSize: 16 }, expect: ['test_mmap_anon.out'] },
  { actionId: 'sd-baselines-mmap-file-private', args: { iterations: 1, chunkSize: 16 }, expect: ['test_mmap_file_private.out'] },
  { actionId: 'sd-baselines-mmap-file-shared', args: { iterations: 1, chunkSize: 16 }, expect: ['test_mmap_file_shared.out'] },
  { actionId: 'sd-baselines-mmap-file-fixed', args: { iterations: 1, chunkSize: 16 }, expect: ['test_mmap_file_fixed.out'] },
  { actionId: 'mn-cache-isolate-build-native' },
  { actionId: 'mn-cache-isolate-build-native-pgo' },
  { actionId: 'mn-cache-isolate-bench-rss', args: { isolates: 1, timeout: '5s', loadCache: 'n' }, expect: ['Measured RSS'] },
  { actionId: 'mn-cache-isolate-bench-latency', args: { iterations: 1, timeout: '5s' }, expect: ['latency'] },
  { actionId: 'mn-cache-isolate-bench-startup', args: { iterations: 1, timeout: '5s' }, expect: ['runs completed'] },
  { actionId: 'stanfordnlp-preload-build' },
  { actionId: 'stanfordnlp-preload-run-jvm', expect: ['docAnnotate', 'BUILD SUCCESS'] },
  { actionId: 'stanfordnlp-preload-build-native' },
  { actionId: 'stanfordnlp-preload-run-native', expect: ['docAnnotate', 'examples'] },
  { actionId: 'stanfordnlp-preload-build-native-pgo' },
  { actionId: 'stanfordnlp-preload-run-native-pgo', expect: ['docAnnotate', 'examples'] }
];

const serviceChecks = [
  {
    actionId: 'mn-cache-isolate-run-jvm',
    readyText: 'Server Running:',
    expect: ['Cancellation requested', 'Server Running:']
  },
  {
    actionId: 'mn-cache-isolate-run-native',
    args: { isolates: 1 },
    readyText: 'Server Running:',
    expect: ['Cancellation requested', 'Server Running:']
  },
  {
    actionId: 'mn-cache-isolate-run-native-pgo',
    args: { isolates: 1 },
    readyText: 'Server Running:',
    expect: ['Cancellation requested', 'Server Running:']
  }
];

const summary = {
  startedAt: new Date().toISOString(),
  url: URL,
  graalvmHome: GRAALVM_HOME,
  outDir,
  checks: []
};

let transcript = '';
let serverChild = null;

function append(text) {
  transcript += text;
  process.stdout.write(text);
  fs.appendFileSync(transcriptPath, text);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function httpJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(data.error || `${response.status} ${response.statusText}`);
  return data;
}

async function httpText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.text();
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd || BENCH_ROOT,
      env: { ...process.env, ...(options.env || {}) },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
      if (options.mirror) append(chunk.toString());
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      if (options.mirror) append(chunk.toString());
    });
    child.on('close', (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
}

async function waitForHealth() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      return await httpJson(`${URL}/api/health`);
    } catch (_) {
      await sleep(500);
    }
  }
  throw new Error(`jasper serve did not become healthy at ${URL}`);
}

async function startServer() {
  append(`Starting jasper serve on ${URL}\n`);
  serverChild = spawn(process.execPath, [
    SERVER,
    'serve',
    '--port',
    String(PORT),
    '--state-dir',
    STATE_DIR,
    '--graalvm-home',
    GRAALVM_HOME
  ], {
    cwd: BENCH_ROOT,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  serverChild.stdout.on('data', (chunk) => append(`[serve] ${chunk}`));
  serverChild.stderr.on('data', (chunk) => append(`[serve] ${chunk}`));
  serverChild.on('exit', (code, signal) => append(`[serve] exited code=${code} signal=${signal || 'none'}\n`));
  await waitForHealth();
}

async function stopServer() {
  if (!serverChild || serverChild.killed) return;
  append('Stopping jasper serve\n');
  serverChild.kill('SIGINT');
  await new Promise((resolve) => {
    const timer = setTimeout(resolve, 5000);
    serverChild.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function actionsById() {
  const data = await httpJson(`${URL}/api/actions`);
  return new Map(data.actions.map((action) => [action.id, action]));
}

async function enqueue(actionId, args = {}) {
  const data = await httpJson(`${URL}/api/jobs`, {
    method: 'POST',
    body: JSON.stringify({ actionId, args, queue: 'default' })
  });
  return data.job;
}

async function job(id) {
  return (await httpJson(`${URL}/api/jobs/${id}`)).job;
}

async function waitTerminal(id, timeoutMs = RUN_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const current = await job(id);
    if (['succeeded', 'failed', 'canceled', 'interrupted'].includes(current.status)) return current;
    await sleep(POLL_MS);
  }
  throw new Error(`job ${id} did not finish within ${timeoutMs}ms`);
}

async function waitForLog(id, needle, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const log = await httpText(`${URL}/api/jobs/${id}/log`).catch(() => '');
    if (log.includes(needle)) return log;
    const current = await job(id);
    if (['failed', 'canceled', 'interrupted', 'succeeded'].includes(current.status)) return log;
    await sleep(POLL_MS);
  }
  throw new Error(`job ${id} log did not contain ${JSON.stringify(needle)} within ${timeoutMs}ms`);
}

async function cancel(id) {
  return (await httpJson(`${URL}/api/jobs/${id}/cancel`, { method: 'POST' })).job;
}

async function collectLogSurfaces(id, actionId) {
  const apiLog = await httpText(`${URL}/api/jobs/${id}/log`);
  const cli = await runProcess(JASPER, ['logs', id, '--url', URL]);
  if (cli.code !== 0) {
    throw new Error(`CLI logs failed for ${id}: ${cli.stderr || cli.stdout}`);
  }
  const safeName = `${actionId}-${id}`.replace(/[^A-Za-z0-9_.-]+/g, '_');
  await fsp.writeFile(path.join(outDir, `${safeName}.api.log`), apiLog);
  await fsp.writeFile(path.join(outDir, `${safeName}.cli.log`), cli.stdout);
  if (!apiLog.includes(`$ `)) throw new Error(`API/WebUI log for ${id} did not contain command output`);
  if (!cli.stdout.includes(`$ `)) throw new Error(`CLI log for ${id} did not contain command output`);
  if (apiLog.trim() !== cli.stdout.trim()) {
    throw new Error(`CLI and API/WebUI logs differ for ${id}`);
  }
  return apiLog;
}

async function verifyExpected(log, expected = [], actionId) {
  for (const needle of expected) {
    if (!log.includes(needle)) {
      throw new Error(`${actionId} log did not contain ${JSON.stringify(needle)}`);
    }
  }
}

async function runFinite(check, actionMap) {
  const action = actionMap.get(check.actionId);
  if (!action) {
    append(`FAIL ${check.actionId}: unknown action\n`);
    return { actionId: check.actionId, status: 'failed', error: `Unknown action ${check.actionId}` };
  }
  if (!action.ready) {
    const missing = (action.checks || []).filter((item) => !item.ok).map((item) => item.message).join('; ');
    append(`SKIP ${check.actionId}: ${missing}\n`);
    return { actionId: check.actionId, status: 'skipped', reason: missing };
  }

  append(`RUN ${check.actionId}\n`);
  let queued = null;
  try {
    queued = await enqueue(check.actionId, check.args || {});
    const finalJob = await waitTerminal(queued.id, check.timeoutMs || RUN_TIMEOUT_MS);
    const log = await collectLogSurfaces(queued.id, check.actionId);
    await verifyExpected(log, check.expect || [], check.actionId);
    if (finalJob.status !== 'succeeded') {
      throw new Error(`${check.actionId} ended with ${finalJob.status}`);
    }
    append(`PASS ${check.actionId} (${finalJob.durationMs} ms)\n`);
    return { actionId: check.actionId, jobId: queued.id, status: finalJob.status, durationMs: finalJob.durationMs };
  } catch (error) {
    const result = { actionId: check.actionId, status: 'failed', error: error.stack || error.message };
    if (queued) {
      result.jobId = queued.id;
      try {
        const current = await job(queued.id);
        result.jobStatus = current.status;
        result.durationMs = current.durationMs;
        result.logFile = current.logFile;
      } catch (_) {
        result.jobStatus = 'unknown';
      }
    }
    append(`FAIL ${check.actionId}: ${error.message}\n`);
    return result;
  }
}

async function runService(check, actionMap) {
  const action = actionMap.get(check.actionId);
  if (!action) {
    append(`FAIL ${check.actionId}: unknown action\n`);
    return { actionId: check.actionId, status: 'failed', error: `Unknown action ${check.actionId}` };
  }
  if (!action.ready) {
    const missing = (action.checks || []).filter((item) => !item.ok).map((item) => item.message).join('; ');
    append(`SKIP ${check.actionId}: ${missing}\n`);
    return { actionId: check.actionId, status: 'skipped', reason: missing };
  }

  append(`START ${check.actionId}\n`);
  let queued = null;
  try {
    queued = await enqueue(check.actionId, check.args || {});
    await waitForLog(queued.id, check.readyText, check.timeoutMs || START_TIMEOUT_MS);
    await cancel(queued.id);
    const finalJob = await waitTerminal(queued.id, 30000);
    const log = await collectLogSurfaces(queued.id, check.actionId);
    await verifyExpected(log, check.expect || [], check.actionId);
    if (finalJob.status !== 'canceled') {
      throw new Error(`${check.actionId} expected canceled status, got ${finalJob.status}`);
    }
    append(`PASS ${check.actionId} startup/cancel (${finalJob.durationMs} ms)\n`);
    return { actionId: check.actionId, jobId: queued.id, status: finalJob.status, durationMs: finalJob.durationMs };
  } catch (error) {
    if (queued) await cancel(queued.id).catch(() => {});
    const result = { actionId: check.actionId, status: 'failed', error: error.stack || error.message };
    if (queued) {
      result.jobId = queued.id;
      try {
        const current = await job(queued.id);
        result.jobStatus = current.status;
        result.durationMs = current.durationMs;
        result.logFile = current.logFile;
      } catch (_) {
        result.jobStatus = 'unknown';
      }
    }
    append(`FAIL ${check.actionId}: ${error.message}\n`);
    return result;
  }
}

async function verifyCliWebuiLogPlumbing() {
  append('VERIFY CLI/WebUI/SSE log plumbing\n');
  const webui = await httpText(`${URL}/`);
  if (!webui.includes('JASPER')) throw new Error('WebUI index did not render JASPER content');

  const eventResponse = await fetch(`${URL}/api/events`);
  if (!eventResponse.ok || !eventResponse.body) throw new Error('SSE endpoint did not open');
  const reader = eventResponse.body.getReader();
  const decoder = new TextDecoder();
  let eventBuffer = '';
  let sawLogEvent = false;
  const readEvents = (async () => {
    while (!sawLogEvent) {
      const { value, done } = await reader.read();
      if (done) break;
      eventBuffer += decoder.decode(value, { stream: true });
      if (eventBuffer.includes('event: log')) sawLogEvent = true;
    }
  })();

  const queued = await enqueue('sd-baselines-memcpy', { iterations: 1, chunkSize: 16 });
  const finalJob = await waitTerminal(queued.id, 60000);
  await readEvents;
  await reader.cancel().catch(() => {});
  if (!sawLogEvent) throw new Error('SSE/WebUI event stream did not receive a log event');
  const log = await collectLogSurfaces(queued.id, 'log-plumbing');
  await verifyExpected(log, ['test_memcpy.out', 'Process finished with status succeeded'], 'log-plumbing');
  if (finalJob.status !== 'succeeded') throw new Error(`log plumbing job ended with ${finalJob.status}`);
  append(`PASS log plumbing via CLI/API/WebUI/SSE for ${queued.id}\n`);
  return { actionId: 'log-plumbing', jobId: queued.id, status: 'succeeded' };
}

async function runCliSmoke() {
  const result = await runProcess(JASPER, ['list', '--url', URL]);
  await fsp.writeFile(path.join(outDir, 'jasper-list.cli.log'), result.stdout + result.stderr);
  if (result.code !== 0) throw new Error(`jasper list failed: ${result.stderr}`);
  if (!result.stdout.includes('core-tests-run-jvm') || !result.stdout.includes('sd-jmh-run-native')) {
    throw new Error('jasper list did not include expected actions');
  }
  append('PASS jasper list CLI smoke\n');
}

async function writeSummary() {
  summary.finishedAt = new Date().toISOString();
  await fsp.writeFile(summaryPath, JSON.stringify(summary, null, 2));
}

async function main() {
  await fsp.mkdir(outDir, { recursive: true });
  fs.writeFileSync(transcriptPath, '');
  append(`JASPER full verification ${stamp}\n`);
  append(`Logs: ${outDir}\n`);

  try {
    await startServer();
    await runCliSmoke();
    summary.checks.push(await verifyCliWebuiLogPlumbing());

    let actionMap = await actionsById();
    for (const check of finiteChecks) {
      const result = await runFinite(check, actionMap);
      summary.checks.push(result);
      actionMap = await actionsById();
      await writeSummary();
    }

    actionMap = await actionsById();
    for (const check of serviceChecks) {
      const result = await runService(check, actionMap);
      summary.checks.push(result);
      actionMap = await actionsById();
      await writeSummary();
    }

    if (summary.checks.some((item) => item.status === 'failed')) {
      summary.status = 'failed';
      process.exitCode = 1;
    } else {
      summary.status = summary.checks.some((item) => item.status === 'skipped') ? 'completed-with-skips' : 'succeeded';
    }
  } catch (error) {
    summary.status = 'failed';
    summary.error = error.stack || error.message;
    append(`FAIL ${error.stack || error.message}\n`);
    process.exitCode = 1;
  } finally {
    await writeSummary().catch(() => {});
    await stopServer().catch((error) => append(`Failed to stop server: ${error.message}\n`));
    append(`Summary: ${summaryPath}\n`);
  }
}

main();
