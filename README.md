# JASPER: Cloud-Native Java Serializer Performance Evaluation fRamework

This repository contains tools and benchmarks for evaluating the performance of a S/D library in a cloud-native environment.
Benchmarks are written in Java and are available both in JIT and AOT modes. For AOT mode, benchmarks are compiled ahead-of-time using GraalVM.

## Table of contents

- Microbenchmarks
    - [sd-baselines](./microbenchmarks/sd-baselines/)
    - [sd-jmh](./microbenchmarks/sd-jmh/)
- Macrobenchmarks
    - [mn-cache-isolate](./macrobenchmarks/mn-cache-isolate/)
    - [stanfordnlp-preload](./macrobenchmarks/stanfordnlp-preload/)

### core-tests

Core serializer correctness tests for validating S/D behavior before running performance benchmarks.

### sd-baselines

A set of microbenchmarks that evaluates the performance of POSIX system calls.
Useful when comparting the speed of a S/D library to the theoretical maximum operational throughputs.

### sd-jmh

A set of S/D JMH microbenchmarks with an extensible workload generator.
Can be used to evaluate S/D performance of any S/D library, regardless of the format (JSON, binary).

### mn-cache-isolate

Cloud-native microservice web API using the Micronaut framework. The benchmark includes a driver that provides scaling inside GraalVM memory isolates.

### stanfordnlp-preload

Cloud-native NLP application that uses StanfordNLP CoreNLP large language models (LLMs).


## Building and running

Benchmarks can run in both JIT and AOT modes. All benchmarks include tooling needed for building and running the benchmarks in both modes. 

1. JIT mode:
    - `build` - package the application
    - `run-jvm` - run the application using the configured JVM
1. AOT mode:
    - `collect-metadata` - collect metadata needed for reflection/serialization/resource support during image-run time
    - `build-native` - build a native executable
    - `build-native-pgo` - build a native executable using PGO
    - `run-native` - run the native executable
    - `run-native-pgo` - run the native executable that is the product of the PGO build

Additional tooling that measures external RSS and request-response times is also included (`bench-rss`, `bench-latency`, etc.).

The root `jasper` control script provides a queued CLI and WebUI over the same benchmark registry:

```sh
./jasper serve
./jasper list
./jasper run sd-jmh-run-jvm --arg benchmarkFilter=SerializationBenchmark --arg warmupIterations=1 --arg iterations=1
```

`jasper serve` binds to `127.0.0.1` and stores runtime metadata/logs in `.jasper/`. For remote runs, start `jasper serve` on the benchmark machine and connect through SSH port forwarding.
