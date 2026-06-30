#!/usr/bin/env node

const fs = require('fs');
const fsp = fs.promises;
const os = require('os');
const path = require('path');
const { randomUUID } = require('crypto');
const { spawn } = require('child_process');

const TOOL_ROOT = __dirname;
const BENCH_ROOT = path.resolve(TOOL_ROOT, '..', '..');
const PUBLIC_ROOT = path.join(TOOL_ROOT, 'public');
const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 5177;
const DEFAULT_STATE_DIR = path.join(BENCH_ROOT, '.jasper');
const DEFAULT_GRAALVM_HOME = '/home/ivan/ol/graalvm-jdk-21.0.11+9.1';
const HISTORY_LIMIT = 100;
const CANCEL_GRACE_MS = 5000;
const TERMINAL_STATUSES = new Set(['succeeded', 'failed', 'canceled', 'interrupted']);

function benchPath(...parts) {
  return path.join(BENCH_ROOT, ...parts);
}

function field(name, label, type, options = {}) {
  return { name, label, type, ...options };
}

const safePathField = field('outputDir', 'Output directory', 'path', {
  default: '_jasper-metadata',
  help: 'Relative path below the benchmark directory.',
  required: true
});

const jmhFields = [
  field('benchmarkFilter', 'Benchmark filter', 'jmh-filter', {
    default: '',
    required: false,
    help: 'Optional single JMH include filter, for example SerializationBenchmark.'
  }),
  field('serializerTag', 'Serializer tag', 'jmh-param', {
    default: '',
    required: false,
    help: 'Optional serTag override, for example java.'
  }),
  field('workloadTag', 'Workload tag', 'jmh-param', {
    default: '',
    required: false,
    help: 'Optional objTag override, for example lst<int>[1] or map<int,client>[1].'
  }),
  field('warmupIterations', 'Warmup iterations', 'integer', {
    default: '',
    required: false,
    min: 0,
    max: 1000
  }),
  field('iterations', 'Measurement iterations', 'integer', {
    default: '',
    required: false,
    min: 1,
    max: 1000
  }),
  field('warmupTime', 'Warmup time', 'duration', {
    default: '',
    required: false,
    help: 'Optional JMH warmup time, for example 100ms or 1s.'
  }),
  field('measurementTime', 'Measurement time', 'duration', {
    default: '',
    required: false,
    help: 'Optional JMH measurement time, for example 100ms or 1s.'
  }),
  field('forks', 'Forks', 'integer', {
    default: '',
    required: false,
    min: 0,
    max: 1000
  })
];

function jmhArgs(values) {
  const args = [];
  if (values.benchmarkFilter) args.push(values.benchmarkFilter);
  if (values.serializerTag) args.push('-p', `serTag=${values.serializerTag}`);
  if (values.workloadTag) args.push('-p', `objTag=${values.workloadTag}`);
  if (values.warmupIterations !== '') args.push('-wi', String(values.warmupIterations));
  if (values.iterations !== '') args.push('-i', String(values.iterations));
  if (values.warmupTime) args.push('-w', String(values.warmupTime));
  if (values.measurementTime) args.push('-r', String(values.measurementTime));
  if (values.forks !== '') args.push('-f', String(values.forks));
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

function action(definition) {
  return {
    buildArgs: () => [],
    requirements: [],
    queue: 'default',
    ...definition,
    scriptPath: path.join(definition.cwd, definition.script)
  };
}

function createActions() {
  const core = benchPath('core-tests');
  const sdJmh = benchPath('microbenchmarks', 'sd-jmh');
  const sdBaselines = benchPath('microbenchmarks', 'sd-baselines');
  const mn = benchPath('macrobenchmarks', 'mn-cache-isolate');
  const nlp = benchPath('macrobenchmarks', 'stanfordnlp-preload');

  return [
    action({
      id: 'core-tests-build',
      benchmark: 'core-tests',
      group: 'Core tests',
      label: 'Build JVM package',
      description: 'Package the core serializer correctness tests.',
      cwd: core,
      script: 'build',
      requirements: [{ type: 'java-runtime' }]
    }),
    action({
      id: 'core-tests-run-jvm',
      benchmark: 'core-tests',
      group: 'Core tests',
      label: 'Run JVM tests',
      description: 'Run the core serializer correctness tests on the configured JVM.',
      cwd: core,
      script: 'run-jvm',
      requirements: [{ type: 'java-runtime' }]
    }),
    action({
      id: 'core-tests-collect-metadata',
      benchmark: 'core-tests',
      group: 'Core tests',
      label: 'Collect Native Image metadata',
      description: 'Run the tracing agent and write metadata to a relative output directory.',
      cwd: core,
      script: 'collect-metadata',
      argsSchema: [safePathField],
      buildArgs: (v) => [v.outputDir],
      requirements: [{ type: 'java-runtime' }, { type: 'tool', name: 'mvn' }]
    }),
    action({
      id: 'core-tests-build-native',
      benchmark: 'core-tests',
      group: 'Core tests',
      label: 'Build native executable',
      description: 'Build the core serializer correctness tests with GraalVM Native Image.',
      cwd: core,
      script: 'build-native',
      requirements: [{ type: 'java-runtime' }, { type: 'graal-tool', name: 'native-image' }]
    }),
    action({
      id: 'core-tests-build-native-pgo',
      benchmark: 'core-tests',
      group: 'Core tests',
      label: 'Build native executable with PGO',
      description: 'Build an instrumented image, run it, then build an optimized image.',
      cwd: core,
      script: 'build-native-pgo',
      requirements: [{ type: 'java-runtime' }, { type: 'graal-tool', name: 'native-image' }]
    }),
    action({
      id: 'core-tests-run-native',
      benchmark: 'core-tests',
      group: 'Core tests',
      label: 'Run native executable',
      description: 'Run the native core serializer correctness tests.',
      cwd: core,
      script: 'run-native',
      requirements: [{ type: 'file', name: 'target/core-tests' }]
    }),
    action({
      id: 'core-tests-run-native-pgo',
      benchmark: 'core-tests',
      group: 'Core tests',
      label: 'Run PGO native executable',
      description: 'Run the optimized native core serializer correctness tests.',
      cwd: core,
      script: 'run-native-pgo',
      requirements: [{ type: 'file', name: 'target/core-tests-opt' }]
    }),

    action({
      id: 'sd-jmh-build',
      benchmark: 'sd-jmh',
      group: 'Serializer microbenchmarks',
      label: 'Build JVM package',
      description: 'Package the JMH serializer microbenchmark.',
      cwd: sdJmh,
      script: 'build',
      requirements: [{ type: 'java-runtime' }]
    }),
    action({
      id: 'sd-jmh-run-jvm',
      benchmark: 'sd-jmh',
      group: 'Serializer microbenchmarks',
      label: 'Run JMH on JVM',
      description: 'Run the serializer JMH benchmark on the configured JVM.',
      cwd: sdJmh,
      script: 'run-jvm',
      argsSchema: jmhFields,
      buildArgs: jmhArgs,
      requirements: [{ type: 'java-runtime' }]
    }),
    action({
      id: 'sd-jmh-collect-metadata',
      benchmark: 'sd-jmh',
      group: 'Serializer microbenchmarks',
      label: 'Collect Native Image metadata',
      description: 'Run the tracing agent for the serializer JMH benchmark.',
      cwd: sdJmh,
      script: 'collect-metadata',
      argsSchema: [safePathField],
      buildArgs: (v) => [v.outputDir],
      requirements: [{ type: 'java-runtime' }]
    }),
    action({
      id: 'sd-jmh-build-native',
      benchmark: 'sd-jmh',
      group: 'Serializer microbenchmarks',
      label: 'Build native executable',
      description: 'Build the native serializer JMH executable.',
      cwd: sdJmh,
      script: 'build-native',
      requirements: [{ type: 'java-runtime' }, { type: 'graal-tool', name: 'native-image' }]
    }),
    action({
      id: 'sd-jmh-build-native-pgo',
      benchmark: 'sd-jmh',
      group: 'Serializer microbenchmarks',
      label: 'Build native executable with PGO',
      description: 'Build, profile, and optimize the native serializer JMH executable.',
      cwd: sdJmh,
      script: 'build-native-pgo',
      argsSchema: jmhFields,
      buildArgs: jmhArgs,
      requirements: [{ type: 'java-runtime' }, { type: 'graal-tool', name: 'native-image' }]
    }),
    action({
      id: 'sd-jmh-run-native',
      benchmark: 'sd-jmh',
      group: 'Serializer microbenchmarks',
      label: 'Run native executable',
      description: 'Run the native serializer JMH executable, building it first if needed.',
      cwd: sdJmh,
      script: 'run-native',
      argsSchema: jmhFields,
      buildArgs: jmhArgs,
      requirements: [{ type: 'java-runtime' }, { type: 'graal-tool', name: 'native-image' }]
    }),
    action({
      id: 'sd-jmh-run-native-pgo',
      benchmark: 'sd-jmh',
      group: 'Serializer microbenchmarks',
      label: 'Run PGO native executable',
      description: 'Run the optimized native serializer JMH executable, building it first if needed.',
      cwd: sdJmh,
      script: 'run-native-pgo',
      argsSchema: jmhFields,
      buildArgs: jmhArgs,
      requirements: [{ type: 'java-runtime' }]
    }),

    ...[
      ['sd-baselines-run-all', 'All memory syscall demos', sdBaselines, 'run_all.sh', false],
      ['sd-baselines-memcpy', 'memcpy demo', path.join(sdBaselines, 'memcpy'), 'run.sh', true],
      ['sd-baselines-malloc', 'malloc demo', path.join(sdBaselines, 'malloc'), 'run.sh', true],
      ['sd-baselines-malloc-fragmented', 'fragmented malloc demo', path.join(sdBaselines, 'malloc_fragmented'), 'run.sh', true],
      ['sd-baselines-free', 'free demo', path.join(sdBaselines, 'free'), 'run.sh', true],
      ['sd-baselines-free-fragmented', 'fragmented free demo', path.join(sdBaselines, 'free_fragmented'), 'run.sh', true],
      ['sd-baselines-mmap-anon', 'anonymous mmap demo', path.join(sdBaselines, 'mmap_anon'), 'run.sh', true],
      ['sd-baselines-mmap-file-private', 'private file mmap demo', path.join(sdBaselines, 'mmap_file_private'), 'run.sh', true],
      ['sd-baselines-mmap-file-shared', 'shared file mmap demo', path.join(sdBaselines, 'mmap_file_shared'), 'run.sh', true],
      ['sd-baselines-mmap-file-fixed', 'fixed-address file mmap demo', path.join(sdBaselines, 'mmap_file_fixed'), 'run.sh', true]
    ].map(([id, label, cwd, script, chunk]) => action({
      id,
      benchmark: 'sd-baselines',
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

    action({
      id: 'mn-cache-isolate-run-jvm',
      benchmark: 'mn-cache-isolate',
      group: 'Micronaut macrobenchmark',
      label: 'Run JVM service',
      description: 'Run the Micronaut web API on the JVM.',
      cwd: mn,
      script: 'run-jvm',
      requirements: [{ type: 'java-runtime' }]
    }),
    action({
      id: 'mn-cache-isolate-build-native',
      benchmark: 'mn-cache-isolate',
      group: 'Micronaut macrobenchmark',
      label: 'Build native service',
      description: 'Build the Micronaut web API native executable.',
      cwd: mn,
      script: 'build-native',
      requirements: [{ type: 'java-runtime' }, { type: 'graal-tool', name: 'native-image' }]
    }),
    action({
      id: 'mn-cache-isolate-build-native-pgo',
      benchmark: 'mn-cache-isolate',
      group: 'Micronaut macrobenchmark',
      label: 'Build native service with PGO',
      description: 'Build and profile the Micronaut native executable.',
      cwd: mn,
      script: 'build-native-pgo',
      requirements: [{ type: 'java-runtime' }, { type: 'graal-tool', name: 'native-image' }, { type: 'tool', name: 'curl' }]
    }),
    action({
      id: 'mn-cache-isolate-run-native',
      benchmark: 'mn-cache-isolate',
      group: 'Micronaut macrobenchmark',
      label: 'Run native service',
      description: 'Run the native Micronaut service with a configurable isolate count.',
      cwd: mn,
      script: 'run-native',
      argsSchema: [field('isolates', 'Isolates', 'integer', { default: 1, required: true, min: 1, max: 128 })],
      buildArgs: (v) => ['--isolates', String(v.isolates)],
      requirements: [{ type: 'java-runtime' }, { type: 'graal-tool', name: 'native-image' }]
    }),
    action({
      id: 'mn-cache-isolate-run-native-pgo',
      benchmark: 'mn-cache-isolate',
      group: 'Micronaut macrobenchmark',
      label: 'Run PGO native service',
      description: 'Run the optimized native Micronaut service with a configurable isolate count.',
      cwd: mn,
      script: 'run-native-pgo',
      argsSchema: [field('isolates', 'Isolates', 'integer', { default: 1, required: true, min: 1, max: 128 })],
      buildArgs: (v) => ['--isolates', String(v.isolates)],
      requirements: [{ type: 'java-runtime' }, { type: 'graal-tool', name: 'native-image' }]
    }),
    action({
      id: 'mn-cache-isolate-bench-rss',
      benchmark: 'mn-cache-isolate',
      group: 'Micronaut macrobenchmark',
      label: 'Measure RSS',
      description: 'Run the external RSS measurement script.',
      cwd: mn,
      script: 'bench-rss',
      argsSchema: [
        field('isolates', 'Isolates', 'integer', { default: 16, required: true, min: 1, max: 128 }),
        field('timeout', 'Request timeout', 'duration', { default: '5s', required: true }),
        field('loadCache', 'Load cache before second RSS sample', 'choice', {
          default: 'y',
          required: true,
          choices: [{ value: 'y', label: 'yes' }, { value: 'n', label: 'no' }]
        })
      ],
      buildArgs: (v) => [String(v.isolates), v.timeout, v.loadCache],
      requirements: [{ type: 'java-runtime' }, { type: 'graal-tool', name: 'native-image' }, { type: 'tool', name: 'curl' }]
    }),
    action({
      id: 'mn-cache-isolate-bench-latency',
      benchmark: 'mn-cache-isolate',
      group: 'Micronaut macrobenchmark',
      label: 'Measure latency',
      description: 'Run the external latency measurement script with hyperfine.',
      cwd: mn,
      script: 'bench-latency',
      argsSchema: [
        field('iterations', 'Iterations', 'integer', { default: 100, required: true, min: 1, max: 10000 }),
        field('timeout', 'Request timeout', 'duration', { default: '5s', required: true })
      ],
      buildArgs: (v) => [String(v.iterations), v.timeout],
      requirements: [{ type: 'java-runtime' }, { type: 'graal-tool', name: 'native-image' }, { type: 'tool', name: 'curl' }, { type: 'tool', name: 'hyperfine' }]
    }),
    action({
      id: 'mn-cache-isolate-bench-startup',
      benchmark: 'mn-cache-isolate',
      group: 'Micronaut macrobenchmark',
      label: 'Measure startup',
      description: 'Run the startup-time measurement script.',
      cwd: mn,
      script: 'bench-startup',
      argsSchema: [
        field('iterations', 'Iterations', 'integer', { default: 100, required: true, min: 1, max: 10000 }),
        field('timeout', 'Per-run timeout', 'duration', { default: '0.1s', required: true })
      ],
      buildArgs: (v) => [String(v.iterations), v.timeout],
      requirements: [{ type: 'java-runtime' }, { type: 'graal-tool', name: 'native-image' }, { type: 'tool', name: 'datamash' }]
    }),

    action({
      id: 'stanfordnlp-preload-build',
      benchmark: 'stanfordnlp-preload',
      group: 'NLP macrobenchmark',
      label: 'Build JVM package',
      description: 'Package the Stanford CoreNLP workload.',
      cwd: nlp,
      script: 'build',
      requirements: [{ type: 'java-runtime' }]
    }),
    action({
      id: 'stanfordnlp-preload-run-jvm',
      benchmark: 'stanfordnlp-preload',
      group: 'NLP macrobenchmark',
      label: 'Run JVM workload',
      description: 'Run the Stanford CoreNLP workload on the JVM.',
      cwd: nlp,
      script: 'run-jvm',
      requirements: [{ type: 'java-runtime' }]
    }),
    action({
      id: 'stanfordnlp-preload-collect-metadata',
      benchmark: 'stanfordnlp-preload',
      group: 'NLP macrobenchmark',
      label: 'Collect Native Image metadata',
      description: 'Run the tracing agent for the Stanford CoreNLP workload.',
      cwd: nlp,
      script: 'collect-metadata',
      argsSchema: [safePathField],
      buildArgs: (v) => [v.outputDir],
      requirements: [{ type: 'java-runtime' }, { type: 'tool', name: 'mvn' }]
    }),
    action({
      id: 'stanfordnlp-preload-build-native',
      benchmark: 'stanfordnlp-preload',
      group: 'NLP macrobenchmark',
      label: 'Build native executable',
      description: 'Build the Stanford CoreNLP native executable.',
      cwd: nlp,
      script: 'build-native',
      requirements: [{ type: 'java-runtime' }, { type: 'graal-tool', name: 'native-image' }]
    }),
    action({
      id: 'stanfordnlp-preload-build-native-pgo',
      benchmark: 'stanfordnlp-preload',
      group: 'NLP macrobenchmark',
      label: 'Build native executable with PGO',
      description: 'Build, profile, and optimize the Stanford CoreNLP native executable.',
      cwd: nlp,
      script: 'build-native-pgo',
      requirements: [{ type: 'java-runtime' }, { type: 'tool', name: 'mvn' }, { type: 'graal-tool', name: 'native-image' }]
    }),
    action({
      id: 'stanfordnlp-preload-run-native',
      benchmark: 'stanfordnlp-preload',
      group: 'NLP macrobenchmark',
      label: 'Run native executable',
      description: 'Run the Stanford CoreNLP native executable.',
      cwd: nlp,
      script: 'run-native',
      requirements: [{ type: 'file', name: 'target/stanfordnlp-preload' }]
    }),
    action({
      id: 'stanfordnlp-preload-run-native-pgo',
      benchmark: 'stanfordnlp-preload',
      group: 'NLP macrobenchmark',
      label: 'Run PGO native executable',
      description: 'Run the optimized Stanford CoreNLP native executable.',
      cwd: nlp,
      script: 'run-native-pgo',
      requirements: [{ type: 'file', name: 'target/stanfordnlp-preload-opt' }]
    })
  ];
}

function parseOptions(args) {
  const options = {};
  const positionals = [];
  const setOption = (key, value) => {
    if (options[key] === undefined) {
      options[key] = value;
    } else if (Array.isArray(options[key])) {
      options[key].push(value);
    } else {
      options[key] = [options[key], value];
    }
  };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith('--')) {
      positionals.push(arg);
      continue;
    }
    const equals = arg.indexOf('=');
    const key = arg.slice(2, equals >= 0 ? equals : undefined);
    if (equals >= 0) {
      setOption(key, arg.slice(equals + 1));
    } else {
      const next = args[i + 1];
      if (!next || next.startsWith('--')) {
        setOption(key, true);
      } else {
        setOption(key, next);
        i++;
      }
    }
  }
  return { options, positionals };
}

function publicActionMetadata(actionDef) {
  return {
    id: actionDef.id,
    benchmark: actionDef.benchmark,
    group: actionDef.group,
    label: actionDef.label,
    description: actionDef.description,
    argsSchema: actionDef.argsSchema || [],
    script: actionDef.script,
    queue: actionDef.queue || 'default'
  };
}

function resolveUrl(options) {
  return String(options.url || process.env.JASPER_URL || `http://${DEFAULT_HOST}:${DEFAULT_PORT}`).replace(/\/+$/, '');
}

function normalizeStateDir(value) {
  if (!value) return DEFAULT_STATE_DIR;
  return path.resolve(BENCH_ROOT, value);
}

function runtimeEnv(graalvmHome) {
  const home = graalvmHome || DEFAULT_GRAALVM_HOME;
  return {
    ...process.env,
    JAVA_HOME: home,
    GRAALVM_HOME: home,
    PATH: `${path.join(home, 'bin')}${path.delimiter}${process.env.PATH || ''}`
  };
}

function commandExists(command, env) {
  const pathValue = env.PATH || '';
  const extensions = process.platform === 'win32' ? ['', '.exe', '.cmd', '.bat'] : [''];
  for (const dir of pathValue.split(path.delimiter)) {
    for (const ext of extensions) {
      const candidate = path.join(dir, `${command}${ext}`);
      try {
        fs.accessSync(candidate, fs.constants.X_OK);
        return candidate;
      } catch (_) {
      }
    }
  }
  return null;
}

function validateSafePath(value, fieldDef) {
  if (typeof value !== 'string') throw new Error(`${fieldDef.label} must be a string`);
  if (!value || value.length > 160) throw new Error(`${fieldDef.label} must be a non-empty relative path`);
  if (path.isAbsolute(value) || value.includes('\0')) throw new Error(`${fieldDef.label} must be relative`);
  const parts = value.split(/[\\/]+/);
  if (parts.some((part) => part === '..' || part === '')) {
    throw new Error(`${fieldDef.label} must not contain empty or parent path segments`);
  }
  if (!/^[A-Za-z0-9._/-]+$/.test(value)) {
    throw new Error(`${fieldDef.label} may contain only letters, numbers, dot, dash, underscore, and slash`);
  }
  return value;
}

function validateQueueName(value) {
  const queue = value || 'default';
  if (typeof queue !== 'string' || queue.length > 64 || !/^[A-Za-z0-9._-]+$/.test(queue)) {
    throw new Error('Queue name may contain only letters, numbers, dot, dash, and underscore');
  }
  return queue;
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
    if (!/^\d+(\.\d+)?(ms|s|m|h)?$/.test(value)) throw new Error(`${fieldDef.label} must look like 5s, 100ms, or 1m`);
    return value;
  }
  if (fieldDef.type === 'choice') {
    const value = String(rawValue);
    if (!fieldDef.choices.some((choice) => choice.value === value)) throw new Error(`${fieldDef.label} has an unsupported value`);
    return value;
  }
  if (fieldDef.type === 'path') return validateSafePath(String(rawValue).trim(), fieldDef);
  if (fieldDef.type === 'jmh-filter') {
    const value = String(rawValue).trim();
    if (!value) return '';
    if (value.length > 120 || !/^[A-Za-z0-9_.$*?+\-[\]():|]+$/.test(value)) {
      throw new Error(`${fieldDef.label} contains unsupported characters`);
    }
    return value;
  }
  if (fieldDef.type === 'jmh-param') {
    const value = String(rawValue).trim();
    if (!value) return '';
    if (value.length > 240 || !/^[A-Za-z0-9_.$,<>\[\]-]+$/.test(value)) {
      throw new Error(`${fieldDef.label} contains unsupported characters`);
    }
    return value;
  }
  return String(rawValue);
}

function createService(config = {}) {
  const express = require('express');
  const host = DEFAULT_HOST;
  const port = Number(config.port || process.env.JASPER_PORT || process.env.PORT || DEFAULT_PORT);
  const stateDir = normalizeStateDir(config.stateDir || process.env.JASPER_STATE_DIR);
  const runsDir = path.join(stateDir, 'runs');
  const graalvmHome = config.graalvmHome || process.env.JASPER_GRAALVM_HOME || DEFAULT_GRAALVM_HOME;
  const env = runtimeEnv(graalvmHome);
  const actions = createActions();
  const actionById = new Map(actions.map((item) => [item.id, item]));
  const clients = new Set();
  let queue = [];
  let currentJob = null;
  let history = [];

  function evaluateRequirement(requirement, actionDef) {
    if (requirement.type === 'java-runtime') {
      const javaPath = path.join(graalvmHome, 'bin', 'java');
      const ok = fs.existsSync(javaPath);
      return {
        ...requirement,
        name: 'Java 21 GraalVM',
        ok,
        value: ok ? graalvmHome : null,
        message: ok ? `Java runtime ${graalvmHome}` : `Java runtime not found: ${graalvmHome}`
      };
    }
    if (requirement.type === 'tool') {
      const resolved = commandExists(requirement.name, env);
      return {
        ...requirement,
        ok: Boolean(resolved),
        value: resolved,
        message: resolved ? `${requirement.name} found` : `${requirement.name} not found on PATH`
      };
    }
    if (requirement.type === 'graal-tool') {
      const resolved = commandExists(requirement.name, env);
      return {
        ...requirement,
        ok: Boolean(resolved),
        value: resolved,
        message: resolved ? `${requirement.name} found in configured GraalVM` : `${requirement.name} not found in configured GraalVM/PATH`
      };
    }
    if (requirement.type === 'file') {
      const filePath = path.join(actionDef.cwd, requirement.name);
      const ok = fs.existsSync(filePath);
      return {
        ...requirement,
        ok,
        value: ok ? filePath : null,
        message: ok ? `${requirement.name} exists` : `${requirement.name} has not been built`
      };
    }
    return { ...requirement, ok: false, value: null, message: `Unknown requirement type ${requirement.type}` };
  }

  function publicAction(actionDef) {
    return { ...publicActionMetadata(actionDef), requirements: actionDef.requirements || [] };
  }

  function actionStatus(actionDef) {
    const checks = actionDef.requirements.map((requirement) => evaluateRequirement(requirement, actionDef));
    return { ...publicAction(actionDef), ready: checks.every((check) => check.ok), checks };
  }

  function publicJob(job) {
    return {
      id: job.id,
      actionId: job.actionId,
      actionLabel: job.actionLabel,
      benchmark: job.benchmark,
      queue: job.queue,
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
    return {
      host,
      port,
      currentJob: currentJob ? publicJob(currentJob) : null,
      queue: queue.map(publicJob),
      history: history.slice(0, HISTORY_LIMIT).map(publicJob),
      actions: actions.map(actionStatus),
      server: {
        version: process.version,
        node: process.version,
        platform: `${os.type()} ${os.release()}`,
        benchRoot: BENCH_ROOT,
        stateDir,
        graalvmHome
      }
    };
  }

  function sendEvent(event, payload) {
    const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const client of clients) client.write(message);
  }

  async function ensureRunsDir() {
    await fsp.mkdir(runsDir, { recursive: true });
  }

  async function loadHistory() {
    await ensureRunsDir();
    const entries = await fsp.readdir(runsDir).catch(() => []);
    const loaded = [];
    for (const entry of entries) {
      if (!entry.endsWith('.json')) continue;
      try {
        const raw = await fsp.readFile(path.join(runsDir, entry), 'utf8');
        const job = JSON.parse(raw);
        if (['queued', 'running', 'canceling'].includes(job.status)) {
          job.status = 'interrupted';
          job.endedAt = new Date().toISOString();
        }
        loaded.push(job);
      } catch (_) {
      }
    }
    history = loaded.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, HISTORY_LIMIT);
  }

  async function writeJobMeta(job) {
    await ensureRunsDir();
    await fsp.writeFile(path.join(runsDir, `${job.id}.json`), JSON.stringify(publicJob(job), null, 2));
  }

  function appendLog(job, stream, text) {
    fs.appendFileSync(path.join(runsDir, `${job.id}.log`), text);
    sendEvent('log', { jobId: job.id, stream, text });
  }

  function validateArgs(actionDef, rawArgs = {}) {
    const schema = actionDef.argsSchema || [];
    const allowed = new Set(schema.map((arg) => arg.name));
    for (const key of Object.keys(rawArgs)) {
      if (!allowed.has(key)) throw new Error(`Unsupported argument: ${key}`);
    }
    const values = {};
    for (const fieldDef of schema) values[fieldDef.name] = validateField(fieldDef, rawArgs[fieldDef.name]);
    return values;
  }

  function assertReady(actionDef) {
    const checks = actionDef.requirements.map((requirement) => evaluateRequirement(requirement, actionDef));
    const missing = checks.filter((check) => !check.ok);
    if (missing.length > 0) {
      throw new Error(`Action requirements are not met: ${missing.map((check) => check.message).join('; ')}`);
    }
  }

  function commandPreview(actionDef, args) {
    return `${path.relative(BENCH_ROOT, actionDef.scriptPath)} ${args.map((arg) => JSON.stringify(arg)).join(' ')}`.trim();
  }

  async function enqueue(actionId, rawArgs = {}, requestedQueue = 'default') {
    const actionDef = actionById.get(actionId);
    if (!actionDef) throw new Error(`Unknown action: ${actionId}`);
    assertReady(actionDef);
    const values = validateArgs(actionDef, rawArgs);
    const args = actionDef.buildArgs(values);
    const jobQueue = validateQueueName(requestedQueue || actionDef.queue || 'default');
    const id = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`;
    const job = {
      id,
      actionId: actionDef.id,
      actionLabel: actionDef.label,
      benchmark: actionDef.benchmark,
      queue: jobQueue,
      args: values,
      spawnArgs: args,
      status: 'queued',
      createdAt: new Date().toISOString(),
      commandPreview: commandPreview(actionDef, args),
      logFile: path.relative(BENCH_ROOT, path.join(runsDir, `${id}.log`)),
      action: actionDef
    };
    await ensureRunsDir();
    await fsp.writeFile(path.join(runsDir, `${job.id}.log`), '');
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
    const actionDef = job.action;
    job.status = 'running';
    job.startedAt = new Date().toISOString();
    writeJobMeta(job).catch(() => {});
    appendLog(job, 'system', `$ ${job.commandPreview}\n`);
    appendLog(job, 'system', `cwd: ${path.relative(BENCH_ROOT, actionDef.cwd) || '.'}\n`);
    appendLog(job, 'system', `JAVA_HOME: ${env.JAVA_HOME}\nGRAALVM_HOME: ${env.GRAALVM_HOME}\n\n`);

    const child = spawn(actionDef.scriptPath, job.spawnArgs, {
      cwd: actionDef.cwd,
      env,
      shell: false,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    job.child = child;
    child.stdout.on('data', (chunk) => appendLog(job, 'stdout', chunk.toString()));
    child.stderr.on('data', (chunk) => appendLog(job, 'stderr', chunk.toString()));
    child.on('error', (error) => appendLog(job, 'system', `\nFailed to start process: ${error.message}\n`));
    child.on('close', (code, signal) => {
      job.endedAt = new Date().toISOString();
      job.durationMs = new Date(job.endedAt).getTime() - new Date(job.startedAt).getTime();
      job.exitCode = code;
      job.signal = signal;
      job.status = job.cancelRequested ? 'canceled' : code === 0 ? 'succeeded' : 'failed';
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
    if (!currentJob || currentJob.id !== id) throw new Error(`No queued or running job with id ${id}`);
    const job = currentJob;
    job.cancelRequested = true;
    job.status = 'canceling';
    appendLog(job, 'system', '\nCancellation requested. Sending SIGTERM to process group.\n');
    try {
      process.kill(-job.child.pid, 'SIGTERM');
    } catch (error) {
      appendLog(job, 'system', `SIGTERM failed: ${error.message}\n`);
    }
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

  function findJob(id) {
    return [currentJob, ...queue, ...history].filter(Boolean).find((job) => job.id === id);
  }

  const app = express();
  app.use(express.json({ limit: '64kb' }));
  app.use(express.static(PUBLIC_ROOT));
  app.get('/api/health', (_req, res) => res.json({ ok: true, server: snapshot().server }));
  app.get('/api/actions', (_req, res) => res.json({ actions: actions.map(actionStatus), server: snapshot().server }));
  app.get('/api/jobs', (_req, res) => res.json(snapshot()));
  app.get('/api/jobs/:id', (req, res) => {
    const job = findJob(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    return res.json({ job: publicJob(job) });
  });
  app.get('/api/jobs/:id/log', async (req, res) => {
    try {
      const log = await fsp.readFile(path.join(runsDir, `${req.params.id}.log`), 'utf8');
      res.type('text/plain').send(log);
    } catch (_) {
      res.status(404).json({ error: 'Log not found' });
    }
  });
  app.post('/api/jobs', async (req, res) => {
    try {
      const job = await enqueue(req.body.actionId, req.body.args || {}, req.body.queue || 'default');
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
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    });
    res.write(`event: snapshot\ndata: ${JSON.stringify(snapshot())}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
  });

  return {
    app,
    snapshot,
    enqueue,
    cancelJob,
    actions,
    async listen() {
      await loadHistory();
      return new Promise((resolve, reject) => {
        const server = app.listen(port, host, () => {
          resolve(server);
        });
        server.on('error', reject);
      });
    },
    config: { host, port, stateDir, runsDir, graalvmHome }
  };
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

function argsFromOptions(options) {
  const args = {};
  const values = Array.isArray(options.arg) ? options.arg : options.arg ? [options.arg] : [];
  for (const item of values) {
    const index = String(item).indexOf('=');
    if (index < 1) throw new Error(`Invalid --arg value ${item}; use name=value`);
    args[item.slice(0, index)] = item.slice(index + 1);
  }
  if (options.json) {
    Object.assign(args, JSON.parse(options.json));
  }
  return args;
}

function localActions() {
  return createActions().map(publicActionMetadata);
}

async function loadActionCatalog(options, { allowFallback = true } = {}) {
  const baseUrl = resolveUrl(options);
  try {
    const data = await httpJson(`${baseUrl}/api/actions`);
    return { actions: data.actions, source: baseUrl, remote: true };
  } catch (error) {
    if (!allowFallback) throw error;
    return { actions: localActions(), source: 'local catalog', remote: false, error };
  }
}

function groupedActions(actions) {
  const groups = new Map();
  for (const actionDef of actions) {
    const group = actionDef.group || actionDef.benchmark || 'Benchmarks';
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(actionDef);
  }
  return groups;
}

function formatActionCatalog(actions, { showStatus = false } = {}) {
  const idWidth = Math.max(10, ...actions.map((actionDef) => actionDef.id.length));
  const lines = [];
  for (const [group, items] of groupedActions(actions)) {
    if (lines.length > 0) lines.push('');
    lines.push(`${group}:`);
    for (const actionDef of items) {
      const status = showStatus && actionDef.ready !== undefined ? `${actionDef.ready ? 'ready' : 'blocked'}  ` : '';
      const args = (actionDef.argsSchema || []).length > 0 ? ` [args: ${actionDef.argsSchema.map((arg) => arg.name).join(', ')}]` : '';
      lines.push(`  ${status}${actionDef.id.padEnd(idWidth)}  ${actionDef.label}${args}`);
    }
  }
  return lines.join('\n');
}

function sampleValue(fieldDef) {
  if (fieldDef.default !== undefined && fieldDef.default !== '') return fieldDef.default;
  if (fieldDef.name === 'benchmarkFilter') return 'SerializationBenchmark.benchmarkS';
  if (fieldDef.name === 'serializerTag') return 'java';
  if (fieldDef.name === 'workloadTag') return 'lst<int>[1]';
  if (fieldDef.name === 'outputDir') return '_jasper-metadata';
  if (fieldDef.name === 'timeout') return '5s';
  if (fieldDef.name === 'loadCache') return 'n';
  if (fieldDef.type === 'integer') return fieldDef.min || 1;
  if (fieldDef.type === 'duration') return '5s';
  if (fieldDef.type === 'choice') return fieldDef.choices[0].value;
  return 'value';
}

function formatArgHelp(fieldDef) {
  const parts = [
    `  --arg ${fieldDef.name}=VALUE`,
    fieldDef.required ? 'required' : 'optional',
    `type: ${fieldDef.type}`
  ];
  if (fieldDef.default !== undefined && fieldDef.default !== '') parts.push(`default: ${fieldDef.default}`);
  if (fieldDef.min !== undefined) parts.push(`min: ${fieldDef.min}`);
  if (fieldDef.max !== undefined) parts.push(`max: ${fieldDef.max}`);
  if (fieldDef.choices) parts.push(`choices: ${fieldDef.choices.map((choice) => choice.value).join(', ')}`);
  if (fieldDef.help) parts.push(fieldDef.help);
  return parts.join(' | ');
}

function formatRunExample(actionDef) {
  const schema = actionDef.argsSchema || [];
  const fields = schema.filter((fieldDef) => fieldDef.required).slice(0, 3);
  const optionalJmh = ['serializerTag', 'workloadTag', 'iterations', 'forks'];
  for (const name of optionalJmh) {
    const fieldDef = schema.find((item) => item.name === name);
    if (fieldDef && !fields.includes(fieldDef)) fields.push(fieldDef);
  }
  const args = fields.slice(0, 5).map((fieldDef) => `--arg ${fieldDef.name}=${JSON.stringify(String(sampleValue(fieldDef)))}`);
  return `jasper run ${actionDef.id}${args.length ? ` ${args.join(' ')}` : ''}`;
}

function findAction(actions, actionId) {
  return actions.find((actionDef) => actionDef.id === actionId);
}

function suggestActionIds(actionId, actions) {
  const value = String(actionId || '').toLowerCase();
  const scored = actions.map((actionDef) => {
    const id = actionDef.id.toLowerCase();
    let score = 0;
    if (id.startsWith(value)) score += 100;
    if (id.includes(value)) score += 60;
    for (const part of value.split(/[-_]+/).filter(Boolean)) {
      if (id.includes(part)) score += 10;
    }
    return { actionDef, score };
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || a.actionDef.id.localeCompare(b.actionDef.id));
  return scored.slice(0, 5).map((item) => item.actionDef.id);
}

function runUsage(actions) {
  console.log(`Usage:
  jasper run <action-id> [--arg name=value ...] [--json '{"name":"value"}'] [--queue default]
  jasper run <action-id> --help
  jasper run --list

Examples:
  jasper run core-tests-run-jvm
  jasper run sd-jmh-run-jvm --arg serializerTag=java --arg workloadTag='lst<int>[1]' --arg iterations=1 --arg forks=0
  jasper run mn-cache-isolate-run-native --arg isolates=1

Available action ids:
${formatActionCatalog(actions)}`);
}

function actionUsage(actionDef) {
  console.log(`Usage:
  jasper run ${actionDef.id} [--arg name=value ...] [--json '{"name":"value"}'] [--queue ${actionDef.queue || 'default'}]

Action:
  ${actionDef.id}

Benchmark:
  ${actionDef.benchmark}

Description:
  ${actionDef.label}${actionDef.description ? `\n  ${actionDef.description}` : ''}

Arguments:
${(actionDef.argsSchema || []).length > 0 ? actionDef.argsSchema.map(formatArgHelp).join('\n') : '  This action runs with its script defaults.'}

Example:
  ${formatRunExample(actionDef)}`);
}

async function cmdList(options) {
  const catalog = await loadActionCatalog(options);
  if (options.json) {
    console.log(JSON.stringify(catalog.actions, null, 2));
    return;
  }
  if (!catalog.remote) {
    console.error(`Could not reach ${resolveUrl(options)} (${catalog.error.message}); showing local action catalog without readiness.`);
  }
  console.log(formatActionCatalog(catalog.actions, { showStatus: catalog.remote }));
}

async function cmdEnqueue(positionals, options) {
  const actionId = positionals[0];
  if (!actionId || options.help || options.list) {
    const catalog = await loadActionCatalog(options);
    runUsage(catalog.actions);
    return;
  }
  const data = await httpJson(`${resolveUrl(options)}/api/jobs`, {
    method: 'POST',
    body: JSON.stringify({ actionId, args: argsFromOptions(options), queue: options.queue || 'default' })
  });
  console.log(data.job.id);
}

function allJobs(snapshot) {
  return [snapshot.currentJob, ...(snapshot.queue || []), ...(snapshot.history || [])].filter(Boolean);
}

async function fetchJob(baseUrl, id) {
  const data = await httpJson(`${baseUrl}/api/jobs`);
  return allJobs(data).find((job) => job.id === id) || null;
}

async function cmdStatus(positionals, options) {
  const data = await httpJson(`${resolveUrl(options)}/api/jobs`);
  const id = positionals[0];
  if (id) {
    const job = allJobs(data).find((item) => item.id === id);
    if (!job) throw new Error(`Job not found: ${id}`);
    console.log(JSON.stringify(job, null, 2));
    return;
  }
  if (data.currentJob) console.log(`running\t${data.currentJob.id}\t${data.currentJob.actionId}`);
  for (const job of data.queue || []) console.log(`queued\t${job.id}\t${job.actionId}`);
  for (const job of data.history || []) console.log(`${job.status}\t${job.id}\t${job.actionId}`);
}

async function cmdLogs(positionals, options) {
  const id = positionals[0];
  if (!id) throw new Error('logs requires a job id');
  const baseUrl = resolveUrl(options);
  let printed = 0;
  for (;;) {
    const log = await httpText(`${baseUrl}/api/jobs/${id}/log`).catch(() => '');
    if (log.length > printed) {
      process.stdout.write(log.slice(printed));
      printed = log.length;
    }
    const job = await fetchJob(baseUrl, id);
    if (!options.follow || (job && TERMINAL_STATUSES.has(job.status))) break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

async function cmdCancel(positionals, options) {
  const id = positionals[0];
  if (!id) throw new Error('cancel requires a job id');
  const data = await httpJson(`${resolveUrl(options)}/api/jobs/${id}/cancel`, { method: 'POST', body: '{}' });
  console.log(`${data.job.status}\t${data.job.id}`);
}

async function cmdRun(positionals, options) {
  const actionId = positionals[0];
  const baseUrl = resolveUrl(options);
  const catalog = await loadActionCatalog(options);
  if (!actionId || actionId === 'help' || actionId === '-h' || options.help || options.list) {
    if (actionId && !['help', '-h'].includes(actionId) && options.help) {
      const actionDef = findAction(catalog.actions, actionId);
      if (!actionDef) {
        const suggestions = suggestActionIds(actionId, catalog.actions);
        throw new Error(`Unknown action id: ${actionId}${suggestions.length ? `\nDid you mean: ${suggestions.join(', ')}` : ''}\n\nRun 'jasper run --list' to see available action ids.`);
      }
      actionUsage(actionDef);
      return;
    }
    runUsage(catalog.actions);
    return;
  }

  const actionDef = findAction(catalog.actions, actionId);
  if (catalog.remote && !actionDef) {
    const suggestions = suggestActionIds(actionId, catalog.actions);
    throw new Error(`Unknown action id: ${actionId}${suggestions.length ? `\nDid you mean: ${suggestions.join(', ')}` : ''}\n\nRun 'jasper run --list' to see available action ids.`);
  }
  if (!catalog.remote) {
    throw new Error(`Jasper server is not reachable at ${baseUrl} (${catalog.error.message}).\nStart it with 'jasper serve' or pass --url for a remote Jasper server.\n\nRun 'jasper run --list' to see the local action catalog.`);
  }

  let data;
  try {
    data = await httpJson(`${baseUrl}/api/jobs`, {
      method: 'POST',
      body: JSON.stringify({ actionId, args: argsFromOptions(options), queue: options.queue || 'default' })
    });
  } catch (error) {
    if (actionDef) {
      throw new Error(`${error.message}\n\nRun 'jasper run ${actionId} --help' for accepted arguments.`);
    }
    throw error;
  }
  const id = data.job.id;
  console.error(`queued ${id}`);
  await cmdLogs([id], { ...options, url: baseUrl, follow: true });
  const job = await fetchJob(baseUrl, id);
  process.exitCode = job && job.status === 'succeeded' ? 0 : 1;
}

async function cmdServe(options) {
  const service = createService({
    port: options.port,
    stateDir: options['state-dir'],
    graalvmHome: options['graalvm-home']
  });
  await service.listen();
  console.log(`jasper listening on http://${service.config.host}:${service.config.port}`);
  console.log(`benchmark root: ${BENCH_ROOT}`);
  console.log(`state dir: ${service.config.stateDir}`);
  console.log(`graalvm home: ${service.config.graalvmHome}`);
}

function usage() {
  console.log(`Usage:
  jasper serve [--port 5177] [--state-dir .jasper] [--graalvm-home PATH]
  jasper list [--url http://127.0.0.1:5177] [--json]
  jasper enqueue <action-id> [--arg name=value ...] [--json '{"name":"value"}']
  jasper run <action-id> [--arg name=value ...] [--json '{"name":"value"}']
  jasper run --list
  jasper run <action-id> --help
  jasper status [job-id]
  jasper logs <job-id> [--follow]
  jasper cancel <job-id>

Discover actions:
  jasper list
  jasper run --list`);
}

async function main(argv = process.argv.slice(2)) {
  const command = argv[0] || 'help';
  const { options, positionals } = parseOptions(argv.slice(1));
  if (command === 'serve') return cmdServe(options);
  if (command === 'list') return cmdList(options);
  if (command === 'enqueue') return cmdEnqueue(positionals, options);
  if (command === 'run') return cmdRun(positionals, options);
  if (command === 'status') return cmdStatus(positionals, options);
  if (command === 'logs') return cmdLogs(positionals, options);
  if (command === 'cancel') return cmdCancel(positionals, options);
  if (command === 'help' || command === '--help' || command === '-h') return usage();
  throw new Error(`Unknown command: ${command}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { createService, createActions, main };
