const express = require('express');
const fs = require('fs');
const fsp = fs.promises;
const os = require('os');
const path = require('path');
const { randomUUID } = require('crypto');
const { spawn } = require('child_process');

const APP_ROOT = __dirname;
const BENCH_ROOT = path.resolve(APP_ROOT, '..', '..');
const RUNS_DIR = path.join(APP_ROOT, 'runs');
const HOST = process.env.JASPER_WEBUI_HOST || process.env.CNSD_BENCH_WEBUI_HOST || '127.0.0.1';
const PORT = Number(process.env.JASPER_WEBUI_PORT || process.env.CNSD_BENCH_WEBUI_PORT || process.env.PORT || 5177);
const HISTORY_LIMIT = 100;
const CANCEL_GRACE_MS = 5000;

function benchPath(...parts) {
  return path.join(BENCH_ROOT, ...parts);
}

function field(name, label, type, options = {}) {
  return { name, label, type, ...options };
}

// Action schemas define both the browser form controls and server-side validation.
const safePathField = field('outputDir', 'Output directory', 'path', {
  default: '_webui-metadata',
  help: 'Relative path below the benchmark directory.',
  required: true
});

const jmhFields = [
  field('benchmarkFilter', 'Benchmark filter', 'jmh-filter', {
    default: '',
    required: false,
    help: 'Optional single JMH include filter, for example SerializationBenchmark.'
  }),
  field('warmupIterations', 'Warmup iterations', 'integer', {
    default: '',
    required: false,
    min: 1,
    max: 1000
  }),
  field('iterations', 'Measurement iterations', 'integer', {
    default: '',
    required: false,
    min: 1,
    max: 1000
  })
];

function jmhArgs(values) {
  const args = [];
  if (values.benchmarkFilter) args.push(values.benchmarkFilter);
  if (values.warmupIterations) args.push('-wi', String(values.warmupIterations));
  if (values.iterations) args.push('-i', String(values.iterations));
  return args;
}

const memoryFields = [
  field('iterations', 'Iterations', 'integer', {
    default: 100000,
    required: true,
    min: 1,
    max: 1000000000
  }),
  field('chunkSize', 'Memory chunk size override', 'integer', {
    default: '',
    required: false,
    min: 1,
    max: 1073741824,
    help: 'Optional byte size passed as the second script argument.'
  })
];

function memoryArgs(values) {
  const args = [String(values.iterations)];
  if (values.chunkSize) args.push(String(values.chunkSize));
  return args;
}

// Only actions in this allowlist can be launched from the web UI.
const ACTIONS = [
  {
    id: 'correctness-build',
    benchmark: 'correctness-tests',
    group: 'Core tests',
    label: 'Build JVM package',
    description: 'Package the correctness test benchmark.',
    cwd: benchPath('correctness-tests'),
    script: 'build',
    argsSchema: [],
    requirements: [
      { type: 'env', name: 'GRAALVM_HOME' },
      { type: 'tool', name: 'java' }
    ]
  },
  {
    id: 'correctness-collect-metadata',
    benchmark: 'correctness-tests',
    group: 'Core tests',
    label: 'Collect Native Image metadata',
    description: 'Run the tracing agent and write metadata to a relative output directory.',
    cwd: benchPath('correctness-tests'),
    script: 'collect-metadata',
    argsSchema: [safePathField],
    buildArgs: (v) => [v.outputDir],
    requirements: [
      { type: 'env', name: 'GRAALVM_HOME' },
      { type: 'tool', name: 'java' },
      { type: 'tool', name: 'mvn' }
    ]
  },
  {
    id: 'correctness-build-native',
    benchmark: 'correctness-tests',
    group: 'Core tests',
    label: 'Build native executable',
    description: 'Build the correctness test benchmark with GraalVM Native Image.',
    cwd: benchPath('correctness-tests'),
    script: 'build-native',
    argsSchema: [],
    requirements: [
      { type: 'env', name: 'GRAALVM_HOME' },
      { type: 'tool', name: 'mvn' },
      { type: 'graal-tool', name: 'native-image' }
    ]
  },
  {
    id: 'correctness-build-native-pgo',
    benchmark: 'correctness-tests',
    group: 'Core tests',
    label: 'Build native executable with PGO',
    description: 'Build an instrumented native executable, run it, then build an optimized image.',
    cwd: benchPath('correctness-tests'),
    script: 'build-native-pgo',
    argsSchema: [],
    requirements: [
      { type: 'env', name: 'GRAALVM_HOME' },
      { type: 'tool', name: 'mvn' },
      { type: 'graal-tool', name: 'native-image' }
    ]
  },
  {
    id: 'correctness-run-native',
    benchmark: 'correctness-tests',
    group: 'Core tests',
    label: 'Run native executable',
    description: 'Run the native correctness test executable.',
    cwd: benchPath('correctness-tests'),
    script: 'run-native',
    argsSchema: [],
    requirements: [{ type: 'file', name: 'target/correctness-tests' }]
  },
  {
    id: 'correctness-run-native-pgo',
    benchmark: 'correctness-tests',
    group: 'Core tests',
    label: 'Run PGO native executable',
    description: 'Run the optimized native correctness test executable.',
    cwd: benchPath('correctness-tests'),
    script: 'run-native-pgo',
    argsSchema: [],
    requirements: [{ type: 'file', name: 'target/correctness-tests-opt' }]
  },

  {
    id: 'sd-jmh-build',
    benchmark: 'sd-jmh-native',
    group: 'Serializer microbenchmarks',
    label: 'Build JVM package',
    description: 'Package the JMH serializer microbenchmark.',
    cwd: benchPath('sd-jmh-native'),
    script: 'build',
    argsSchema: [],
    requirements: [{ type: 'tool', name: 'java' }]
  },
  {
    id: 'sd-jmh-run-jvm',
    benchmark: 'sd-jmh-native',
    group: 'Serializer microbenchmarks',
    label: 'Run JMH on JVM',
    description: 'Run the serializer JMH benchmark on the configured JVM.',
    cwd: benchPath('sd-jmh-native'),
    script: 'run-jvm',
    argsSchema: jmhFields,
    buildArgs: jmhArgs,
    requirements: [
      { type: 'env', name: 'GRAALVM_HOME' },
      { type: 'tool', name: 'java' }
    ]
  },
  {
    id: 'sd-jmh-collect-metadata',
    benchmark: 'sd-jmh-native',
    group: 'Serializer microbenchmarks',
    label: 'Collect Native Image metadata',
    description: 'Run the tracing agent for the serializer JMH benchmark.',
    cwd: benchPath('sd-jmh-native'),
    script: 'collect-metadata',
    argsSchema: [safePathField],
    buildArgs: (v) => [v.outputDir],
    requirements: [
      { type: 'env', name: 'GRAALVM_HOME' },
      { type: 'tool', name: 'java' }
    ]
  },
  {
    id: 'sd-jmh-build-native',
    benchmark: 'sd-jmh-native',
    group: 'Serializer microbenchmarks',
    label: 'Build native executable',
    description: 'Build the native serializer JMH executable.',
    cwd: benchPath('sd-jmh-native'),
    script: 'build-native',
    argsSchema: [],
    requirements: [
      { type: 'env', name: 'GRAALVM_HOME' },
      { type: 'tool', name: 'java' }
    ]
  },
  {
    id: 'sd-jmh-build-native-pgo',
    benchmark: 'sd-jmh-native',
    group: 'Serializer microbenchmarks',
    label: 'Build native executable with PGO',
    description: 'Build, profile, and optimize the native serializer JMH executable.',
    cwd: benchPath('sd-jmh-native'),
    script: 'build-native-pgo',
    argsSchema: jmhFields,
    buildArgs: jmhArgs,
    requirements: [
      { type: 'env', name: 'GRAALVM_HOME' },
      { type: 'graal-tool', name: 'native-image' }
    ]
  },
  {
    id: 'sd-jmh-run-native',
    benchmark: 'sd-jmh-native',
    group: 'Serializer microbenchmarks',
    label: 'Run native executable',
    description: 'Run the native serializer JMH executable, building it first if needed.',
    cwd: benchPath('sd-jmh-native'),
    script: 'run-native',
    argsSchema: jmhFields,
    buildArgs: jmhArgs,
    requirements: [
      { type: 'env', name: 'GRAALVM_HOME' },
      { type: 'graal-tool', name: 'native-image' }
    ]
  },
  {
    id: 'sd-jmh-run-native-pgo',
    benchmark: 'sd-jmh-native',
    group: 'Serializer microbenchmarks',
    label: 'Run PGO native executable',
    description: 'Run the optimized native serializer JMH executable, building it first if needed.',
    cwd: benchPath('sd-jmh-native'),
    script: 'run-native-pgo',
    argsSchema: jmhFields,
    buildArgs: jmhArgs,
    requirements: [
      { type: 'env', name: 'GRAALVM_HOME' },
      { type: 'tool', name: 'java' }
    ]
  },

  ...[
    ['memory-run-all', 'All memory syscall demos', benchPath('memory-syscalls-scalability'), 'run_all.sh', false],
    ['memory-memcpy', 'memcpy demo', benchPath('memory-syscalls-scalability', 'memcpy'), 'run.sh', true],
    ['memory-malloc', 'malloc demo', benchPath('memory-syscalls-scalability', 'malloc'), 'run.sh', true],
    ['memory-malloc-fragmented', 'fragmented malloc demo', benchPath('memory-syscalls-scalability', 'malloc_fragmented'), 'run.sh', true],
    ['memory-free', 'free demo', benchPath('memory-syscalls-scalability', 'free'), 'run.sh', true],
    ['memory-free-fragmented', 'fragmented free demo', benchPath('memory-syscalls-scalability', 'free_fragmented'), 'run.sh', true],
    ['memory-mmap-anon', 'anonymous mmap demo', benchPath('memory-syscalls-scalability', 'mmap_anon'), 'run.sh', true],
    ['memory-mmap-file-private', 'private file mmap demo', benchPath('memory-syscalls-scalability', 'mmap_file_private'), 'run.sh', true],
    ['memory-mmap-file-shared', 'shared file mmap demo', benchPath('memory-syscalls-scalability', 'mmap_file_shared'), 'run.sh', true],
    ['memory-mmap-file-fixed', 'fixed-address file mmap demo', benchPath('memory-syscalls-scalability', 'mmap_file_fixed'), 'run.sh', true]
  ].map(([id, label, cwd, script, chunk]) => ({
    id,
    benchmark: 'memory-syscalls-scalability',
    group: 'POSIX memory baselines',
    label,
    description: chunk
      ? 'Compile and run one POSIX memory-operation baseline.'
      : 'Compile and run all POSIX memory-operation baselines.',
    cwd,
    script,
    argsSchema: chunk ? memoryFields : [memoryFields[0]],
    buildArgs: chunk ? memoryArgs : (v) => [String(v.iterations)],
    requirements: [{ type: 'tool', name: 'gcc' }]
  })),

  {
    id: 'mn-run-jvm',
    benchmark: 'mn-cache-isolate',
    group: 'Micronaut macrobenchmark',
    label: 'Run JVM service',
    description: 'Run the Micronaut web API on the JVM.',
    cwd: benchPath('mn-cache-isolate'),
    script: 'run-jvm',
    argsSchema: [],
    requirements: [
      { type: 'env', name: 'GRAALVM_HOME' },
      { type: 'graal-tool', name: 'native-image' }
    ]
  },
  {
    id: 'mn-build-native',
    benchmark: 'mn-cache-isolate',
    group: 'Micronaut macrobenchmark',
    label: 'Build native service',
    description: 'Build the Micronaut web API native executable.',
    cwd: benchPath('mn-cache-isolate'),
    script: 'build-native',
    argsSchema: [],
    requirements: [
      { type: 'env', name: 'GRAALVM_HOME' },
      { type: 'graal-tool', name: 'native-image' }
    ]
  },
  {
    id: 'mn-build-native-pgo',
    benchmark: 'mn-cache-isolate',
    group: 'Micronaut macrobenchmark',
    label: 'Build native service with PGO',
    description: 'Build and profile the Micronaut native executable.',
    cwd: benchPath('mn-cache-isolate'),
    script: 'build-native-pgo',
    argsSchema: [],
    requirements: [
      { type: 'env', name: 'GRAALVM_HOME' },
      { type: 'graal-tool', name: 'native-image' },
      { type: 'tool', name: 'curl' }
    ]
  },
  {
    id: 'mn-run-native',
    benchmark: 'mn-cache-isolate',
    group: 'Micronaut macrobenchmark',
    label: 'Run native service',
    description: 'Run the native Micronaut service with a configurable isolate count.',
    cwd: benchPath('mn-cache-isolate'),
    script: 'run-native',
    argsSchema: [field('isolates', 'Isolates', 'integer', { default: 1, required: true, min: 1, max: 128 })],
    buildArgs: (v) => ['--isolates', String(v.isolates)],
    requirements: [
      { type: 'env', name: 'GRAALVM_HOME' },
      { type: 'graal-tool', name: 'native-image' }
    ]
  },
  {
    id: 'mn-run-native-pgo',
    benchmark: 'mn-cache-isolate',
    group: 'Micronaut macrobenchmark',
    label: 'Run PGO native service',
    description: 'Run the optimized native Micronaut service with a configurable isolate count.',
    cwd: benchPath('mn-cache-isolate'),
    script: 'run-native-pgo',
    argsSchema: [field('isolates', 'Isolates', 'integer', { default: 1, required: true, min: 1, max: 128 })],
    buildArgs: (v) => ['--isolates', String(v.isolates)],
    requirements: [
      { type: 'env', name: 'GRAALVM_HOME' },
      { type: 'graal-tool', name: 'native-image' }
    ]
  },
  {
    id: 'mn-bench-rss',
    benchmark: 'mn-cache-isolate',
    group: 'Micronaut macrobenchmark',
    label: 'Measure RSS',
    description: 'Run the external RSS measurement script.',
    cwd: benchPath('mn-cache-isolate'),
    script: 'bench-rss',
    argsSchema: [
      field('isolates', 'Isolates', 'integer', { default: 16, required: true, min: 1, max: 128 }),
      field('timeout', 'Request timeout', 'duration', { default: '5s', required: true }),
      field('loadCache', 'Load cache before second RSS sample', 'choice', {
        default: 'y',
        required: true,
        choices: [
          { value: 'y', label: 'yes' },
          { value: 'n', label: 'no' }
        ]
      })
    ],
    buildArgs: (v) => [String(v.isolates), v.timeout, v.loadCache],
    requirements: [
      { type: 'env', name: 'GRAALVM_HOME' },
      { type: 'graal-tool', name: 'native-image' },
      { type: 'tool', name: 'curl' }
    ]
  },
  {
    id: 'mn-bench-latency',
    benchmark: 'mn-cache-isolate',
    group: 'Micronaut macrobenchmark',
    label: 'Measure latency',
    description: 'Run the external latency measurement script with hyperfine.',
    cwd: benchPath('mn-cache-isolate'),
    script: 'bench-latency',
    argsSchema: [
      field('iterations', 'Iterations', 'integer', { default: 100, required: true, min: 1, max: 10000 }),
      field('timeout', 'Request timeout', 'duration', { default: '5s', required: true })
    ],
    buildArgs: (v) => [String(v.iterations), v.timeout],
    requirements: [
      { type: 'env', name: 'GRAALVM_HOME' },
      { type: 'graal-tool', name: 'native-image' },
      { type: 'tool', name: 'curl' },
      { type: 'tool', name: 'hyperfine' }
    ]
  },
  {
    id: 'mn-bench-startup',
    benchmark: 'mn-cache-isolate',
    group: 'Micronaut macrobenchmark',
    label: 'Measure startup',
    description: 'Run the startup-time measurement script.',
    cwd: benchPath('mn-cache-isolate'),
    script: 'bench-startup',
    argsSchema: [
      field('iterations', 'Iterations', 'integer', { default: 100, required: true, min: 1, max: 10000 }),
      field('timeout', 'Per-run timeout', 'duration', { default: '0.1s', required: true })
    ],
    buildArgs: (v) => [String(v.iterations), v.timeout],
    requirements: [
      { type: 'env', name: 'GRAALVM_HOME' },
      { type: 'graal-tool', name: 'native-image' },
      { type: 'tool', name: 'datamash' }
    ]
  },

  {
    id: 'nlp-build',
    benchmark: 'stanfordnlp-preload',
    group: 'NLP macrobenchmark',
    label: 'Build JVM package',
    description: 'Package the Stanford CoreNLP workload.',
    cwd: benchPath('stanfordnlp-preload'),
    script: 'build',
    argsSchema: [],
    requirements: [{ type: 'tool', name: 'java' }]
  },
  {
    id: 'nlp-run-jvm',
    benchmark: 'stanfordnlp-preload',
    group: 'NLP macrobenchmark',
    label: 'Run JVM workload',
    description: 'Run the Stanford CoreNLP workload on the JVM.',
    cwd: benchPath('stanfordnlp-preload'),
    script: 'run-jvm',
    argsSchema: [],
    requirements: [{ type: 'tool', name: 'java' }]
  },
  {
    id: 'nlp-collect-metadata',
    benchmark: 'stanfordnlp-preload',
    group: 'NLP macrobenchmark',
    label: 'Collect Native Image metadata',
    description: 'Run the tracing agent for the Stanford CoreNLP workload.',
    cwd: benchPath('stanfordnlp-preload'),
    script: 'collect-metadata',
    argsSchema: [safePathField],
    buildArgs: (v) => [v.outputDir],
    requirements: [
      { type: 'env', name: 'GRAALVM_HOME' },
      { type: 'tool', name: 'java' },
      { type: 'tool', name: 'mvn' }
    ]
  },
  {
    id: 'nlp-build-native',
    benchmark: 'stanfordnlp-preload',
    group: 'NLP macrobenchmark',
    label: 'Build native executable',
    description: 'Build the Stanford CoreNLP native executable.',
    cwd: benchPath('stanfordnlp-preload'),
    script: 'build-native',
    argsSchema: [],
    requirements: [
      { type: 'env', name: 'GRAALVM_HOME' },
      { type: 'graal-tool', name: 'native-image' }
    ]
  },
  {
    id: 'nlp-build-native-pgo',
    benchmark: 'stanfordnlp-preload',
    group: 'NLP macrobenchmark',
    label: 'Build native executable with PGO',
    description: 'Build, profile, and optimize the Stanford CoreNLP native executable.',
    cwd: benchPath('stanfordnlp-preload'),
    script: 'build-native-pgo',
    argsSchema: [],
    requirements: [
      { type: 'env', name: 'GRAALVM_HOME' },
      { type: 'tool', name: 'mvn' },
      { type: 'graal-tool', name: 'native-image' }
    ]
  },
  {
    id: 'nlp-run-native',
    benchmark: 'stanfordnlp-preload',
    group: 'NLP macrobenchmark',
    label: 'Run native executable',
    description: 'Run the Stanford CoreNLP native executable.',
    cwd: benchPath('stanfordnlp-preload'),
    script: 'run-native',
    argsSchema: [],
    requirements: [{ type: 'file', name: 'target/stanfordnlp-preload' }]
  },
  {
    id: 'nlp-run-native-pgo',
    benchmark: 'stanfordnlp-preload',
    group: 'NLP macrobenchmark',
    label: 'Run PGO native executable',
    description: 'Run the optimized Stanford CoreNLP native executable.',
    cwd: benchPath('stanfordnlp-preload'),
    script: 'run-native-pgo',
    argsSchema: [],
    requirements: [{ type: 'file', name: 'target/stanfordnlp-preload-opt' }]
  }
].map((action) => ({
  buildArgs: () => [],
  requirements: [],
  ...action,
  scriptPath: path.join(action.cwd, action.script)
}));

const actionById = new Map(ACTIONS.map((action) => [action.id, action]));
let queue = [];
let currentJob = null;
let history = [];
const clients = new Set();

function commandExists(command) {
  const pathValue = process.env.PATH || '';
  const extensions = process.platform === 'win32' ? ['', '.exe', '.cmd', '.bat'] : [''];
  for (const dir of pathValue.split(path.delimiter)) {
    for (const ext of extensions) {
      const candidate = path.join(dir, `${command}${ext}`);
      try {
        fs.accessSync(candidate, fs.constants.X_OK);
        return candidate;
      } catch (_) {
        // Try the next PATH entry.
      }
    }
  }
  return null;
}

function evaluateRequirement(requirement, action) {
  if (requirement.type === 'env') {
    const value = process.env[requirement.name];
    return {
      ...requirement,
      ok: Boolean(value),
      value: value || null,
      message: value ? `${requirement.name} is set` : `${requirement.name} is not set`
    };
  }

  if (requirement.type === 'tool') {
    const resolved = commandExists(requirement.name);
    return {
      ...requirement,
      ok: Boolean(resolved),
      value: resolved,
      message: resolved ? `${requirement.name} found` : `${requirement.name} not found on PATH`
    };
  }

  if (requirement.type === 'graal-tool') {
    const graalHome = process.env.GRAALVM_HOME;
    const fromGraalHome = graalHome ? path.join(graalHome, 'bin', requirement.name) : null;
    let resolved = null;
    if (fromGraalHome) {
      try {
        fs.accessSync(fromGraalHome, fs.constants.X_OK);
        resolved = fromGraalHome;
      } catch (_) {
        resolved = null;
      }
    }
    resolved = resolved || commandExists(requirement.name);
    return {
      ...requirement,
      ok: Boolean(resolved),
      value: resolved,
      message: resolved
        ? `${requirement.name} found`
        : `${requirement.name} not found in GRAALVM_HOME/bin or PATH`
    };
  }

  if (requirement.type === 'file') {
    const filePath = path.join(action.cwd, requirement.name);
    const ok = fs.existsSync(filePath);
    return {
      ...requirement,
      ok,
      value: ok ? filePath : null,
      message: ok ? `${requirement.name} exists` : `${requirement.name} has not been built`
    };
  }

  return {
    ...requirement,
    ok: false,
    value: null,
    message: `Unknown requirement type ${requirement.type}`
  };
}

function actionStatus(action) {
  const checks = action.requirements.map((requirement) => evaluateRequirement(requirement, action));
  return {
    ...publicAction(action),
    ready: checks.every((check) => check.ok),
    checks
  };
}

function publicAction(action) {
  return {
    id: action.id,
    benchmark: action.benchmark,
    group: action.group,
    label: action.label,
    description: action.description,
    argsSchema: action.argsSchema,
    requirements: action.requirements,
    script: action.script
  };
}

function publicJob(job) {
  return {
    id: job.id,
    actionId: job.actionId,
    actionLabel: job.actionLabel,
    benchmark: job.benchmark,
    args: job.args,
    status: job.status,
    createdAt: job.createdAt,
    startedAt: job.startedAt || null,
    endedAt: job.endedAt || null,
    durationMs: job.durationMs || null,
    exitCode: job.exitCode ?? null,
    signal: job.signal || null,
    commandPreview: job.commandPreview,
    logFile: job.logFile
  };
}

function snapshot() {
  // The browser receives only public job/action metadata and runtime version details.
  return {
    host: HOST,
    port: PORT,
    currentJob: currentJob ? publicJob(currentJob) : null,
    queue: queue.map(publicJob),
    history: history.slice(0, HISTORY_LIMIT).map(publicJob),
    actions: ACTIONS.map(actionStatus),
    server: {
      version: process.version,
      node: process.version,
      platform: `${os.type()} ${os.release()}`
    }
  };
}

function sendEvent(event, payload) {
  const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of clients) {
    client.write(message);
  }
}

async function ensureRunsDir() {
  await fsp.mkdir(RUNS_DIR, { recursive: true });
}

async function loadHistory() {
  await ensureRunsDir();
  const entries = await fsp.readdir(RUNS_DIR).catch(() => []);
  const loaded = [];
  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue;
    try {
      const raw = await fsp.readFile(path.join(RUNS_DIR, entry), 'utf8');
      const job = JSON.parse(raw);
      if (['queued', 'running', 'canceling'].includes(job.status)) {
        job.status = 'interrupted';
        job.endedAt = new Date().toISOString();
      }
      loaded.push(job);
    } catch (_) {
      // Ignore malformed history files.
    }
  }
  history = loaded.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, HISTORY_LIMIT);
}

async function writeJobMeta(job) {
  await ensureRunsDir();
  await fsp.writeFile(path.join(RUNS_DIR, `${job.id}.json`), JSON.stringify(publicJob(job), null, 2));
}

function appendLog(job, stream, text) {
  fs.appendFileSync(path.join(RUNS_DIR, `${job.id}.log`), text);
  sendEvent('log', { jobId: job.id, stream, text });
}

function validateSafePath(value, fieldDef) {
  // Path inputs are intentionally relative so scripts cannot write outside a benchmark.
  if (typeof value !== 'string') {
    throw new Error(`${fieldDef.label} must be a string`);
  }
  if (!value || value.length > 160) {
    throw new Error(`${fieldDef.label} must be a non-empty relative path`);
  }
  if (path.isAbsolute(value) || value.includes('\0')) {
    throw new Error(`${fieldDef.label} must be relative`);
  }
  const parts = value.split(/[\\/]+/);
  if (parts.some((part) => part === '..' || part === '')) {
    throw new Error(`${fieldDef.label} must not contain empty or parent path segments`);
  }
  if (!/^[A-Za-z0-9._/-]+$/.test(value)) {
    throw new Error(`${fieldDef.label} may contain only letters, numbers, dot, dash, underscore, and slash`);
  }
  return value;
}

function validateField(fieldDef, rawValue) {
  const hasValue = rawValue !== undefined && rawValue !== null && rawValue !== '';
  if (!hasValue) {
    if (fieldDef.required) {
      if (fieldDef.default !== undefined && fieldDef.default !== '') return fieldDef.default;
      throw new Error(`${fieldDef.label} is required`);
    }
    return '';
  }

  if (fieldDef.type === 'integer') {
    const value = Number(rawValue);
    if (!Number.isInteger(value)) throw new Error(`${fieldDef.label} must be an integer`);
    if (fieldDef.min !== undefined && value < fieldDef.min) throw new Error(`${fieldDef.label} must be at least ${fieldDef.min}`);
    if (fieldDef.max !== undefined && value > fieldDef.max) throw new Error(`${fieldDef.label} must be at most ${fieldDef.max}`);
    return value;
  }

  if (fieldDef.type === 'duration') {
    const value = String(rawValue).trim();
    if (!/^\d+(\.\d+)?(ms|s|m|h)?$/.test(value)) {
      throw new Error(`${fieldDef.label} must look like 5s, 100ms, or 1m`);
    }
    return value;
  }

  if (fieldDef.type === 'choice') {
    const value = String(rawValue);
    if (!fieldDef.choices.some((choice) => choice.value === value)) {
      throw new Error(`${fieldDef.label} has an unsupported value`);
    }
    return value;
  }

  if (fieldDef.type === 'path') {
    return validateSafePath(String(rawValue).trim(), fieldDef);
  }

  if (fieldDef.type === 'jmh-filter') {
    const value = String(rawValue).trim();
    if (!value) return '';
    if (value.length > 120 || !/^[A-Za-z0-9_.$*?+\-[\]():|]+$/.test(value)) {
      throw new Error(`${fieldDef.label} contains unsupported characters`);
    }
    return value;
  }

  return String(rawValue);
}

function validateArgs(action, rawArgs = {}) {
  // Reject unknown fields before coercing values to avoid accidental script arguments.
  const allowed = new Set(action.argsSchema.map((arg) => arg.name));
  for (const key of Object.keys(rawArgs)) {
    if (!allowed.has(key)) throw new Error(`Unsupported argument: ${key}`);
  }

  const values = {};
  for (const fieldDef of action.argsSchema) {
    values[fieldDef.name] = validateField(fieldDef, rawArgs[fieldDef.name]);
  }
  return values;
}

function assertReady(action) {
  const checks = action.requirements.map((requirement) => evaluateRequirement(requirement, action));
  const missing = checks.filter((check) => !check.ok);
  if (missing.length > 0) {
    const labels = missing.map((check) => check.message).join('; ');
    throw new Error(`Action requirements are not met: ${labels}`);
  }
}

function commandPreview(action, args) {
  return `${path.relative(BENCH_ROOT, action.scriptPath)} ${args.map((arg) => JSON.stringify(arg)).join(' ')}`.trim();
}

async function enqueue(actionId, rawArgs) {
  const action = actionById.get(actionId);
  if (!action) throw new Error(`Unknown action: ${actionId}`);
  assertReady(action);

  const values = validateArgs(action, rawArgs);
  const args = action.buildArgs(values);
  const id = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`;
  const job = {
    id,
    actionId: action.id,
    actionLabel: action.label,
    benchmark: action.benchmark,
    args: values,
    spawnArgs: args,
    status: 'queued',
    createdAt: new Date().toISOString(),
    commandPreview: commandPreview(action, args),
    logFile: path.join('runs', `${id}.log`),
    action
  };

  await ensureRunsDir();
  await fsp.writeFile(path.join(RUNS_DIR, `${job.id}.log`), '');
  await writeJobMeta(job);
  queue.push(job);
  history.unshift(job);
  history = history.slice(0, HISTORY_LIMIT);
  sendEvent('snapshot', snapshot());
  startNextJob();
  return publicJob(job);
}

function startNextJob() {
  if (currentJob || queue.length === 0) return;
  const job = queue.shift();
  currentJob = job;
  const action = job.action;
  job.status = 'running';
  job.startedAt = new Date().toISOString();
  writeJobMeta(job).catch(() => {});

  appendLog(job, 'system', `$ ${job.commandPreview}\n`);
  appendLog(job, 'system', `cwd: ${path.relative(BENCH_ROOT, action.cwd) || '.'}\n\n`);

  // Run each script as its own process group so cancellation can stop child processes.
  const child = spawn(action.scriptPath, job.spawnArgs, {
    cwd: action.cwd,
    env: process.env,
    shell: false,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  job.child = child;

  child.stdout.on('data', (chunk) => appendLog(job, 'stdout', chunk.toString()));
  child.stderr.on('data', (chunk) => appendLog(job, 'stderr', chunk.toString()));
  child.on('error', (error) => {
    appendLog(job, 'system', `\nFailed to start process: ${error.message}\n`);
  });
  child.on('close', (code, signal) => {
    job.endedAt = new Date().toISOString();
    job.durationMs = new Date(job.endedAt).getTime() - new Date(job.startedAt).getTime();
    job.exitCode = code;
    job.signal = signal;
    if (job.cancelRequested) {
      job.status = 'canceled';
    } else {
      job.status = code === 0 ? 'succeeded' : 'failed';
    }
    appendLog(job, 'system', `\nProcess finished with status ${job.status}, exit code ${code}, signal ${signal || 'none'}.\n`);
    delete job.child;
    writeJobMeta(job).catch(() => {});
    currentJob = null;
    sendEvent('snapshot', snapshot());
    startNextJob();
  });

  sendEvent('snapshot', snapshot());
}

async function cancelJob(id) {
  const queuedIndex = queue.findIndex((job) => job.id === id);
  if (queuedIndex >= 0) {
    const [job] = queue.splice(queuedIndex, 1);
    job.status = 'canceled';
    job.endedAt = new Date().toISOString();
    await writeJobMeta(job);
    sendEvent('snapshot', snapshot());
    return publicJob(job);
  }

  if (!currentJob || currentJob.id !== id) {
    throw new Error(`No queued or running job with id ${id}`);
  }

  const job = currentJob;
  job.cancelRequested = true;
  job.status = 'canceling';
  appendLog(job, 'system', '\nCancellation requested. Sending SIGTERM to process group.\n');
  try {
    process.kill(-job.child.pid, 'SIGTERM');
  } catch (error) {
    appendLog(job, 'system', `SIGTERM failed: ${error.message}\n`);
  }

  // Escalate only if the process group ignores the graceful termination request.
  setTimeout(() => {
    if (currentJob && currentJob.id === id && currentJob.child) {
      appendLog(job, 'system', 'Grace period expired. Sending SIGKILL to process group.\n');
      try {
        process.kill(-job.child.pid, 'SIGKILL');
      } catch (error) {
        appendLog(job, 'system', `SIGKILL failed: ${error.message}\n`);
      }
    }
  }, CANCEL_GRACE_MS).unref();

  await writeJobMeta(job);
  sendEvent('snapshot', snapshot());
  return publicJob(job);
}

const app = express();
app.use(express.json({ limit: '64kb' }));
app.use(express.static(path.join(APP_ROOT, 'public')));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/actions', (_req, res) => {
  res.json({ actions: ACTIONS.map(actionStatus), server: snapshot().server });
});

app.get('/api/jobs', (_req, res) => {
  res.json(snapshot());
});

app.get('/api/jobs/:id/log', async (req, res) => {
  const logPath = path.join(RUNS_DIR, `${req.params.id}.log`);
  try {
    const log = await fsp.readFile(logPath, 'utf8');
    res.type('text/plain').send(log);
  } catch (_) {
    res.status(404).json({ error: 'Log not found' });
  }
});

app.post('/api/jobs', async (req, res) => {
  try {
    const job = await enqueue(req.body.actionId, req.body.args || {});
    res.status(201).json({ job });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/jobs/:id/cancel', async (req, res) => {
  try {
    const job = await cancelJob(req.params.id);
    res.json({ job });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

app.get('/api/events', (req, res) => {
  // Server-sent events keep the dashboard synchronized without polling.
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive'
  });
  res.write(`event: snapshot\ndata: ${JSON.stringify(snapshot())}\n\n`);
  clients.add(res);
  req.on('close', () => clients.delete(res));
});

loadHistory()
  .then(() => {
    app.listen(PORT, HOST, () => {
      console.log(`jasper-webui listening on http://${HOST}:${PORT}`);
      console.log(`benchmark root: ${BENCH_ROOT}`);
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
