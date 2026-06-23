# JASPER: Cloud-Native Java Serializer Performance Evaluation fRamework

This repository contains tools and benchmarks for evaluating the performance of a S/D library in a cloud-native environment.
Benchmarks are written in Java and are available both in JIT and AOT modes. For AOT mode, benchmarks are compiled ahead-of-time using GraalVM.

Latest results can be found in the [Results.pdf](./Results.pdf).

Checkout `graaldoss` branch for details on GraalDOSS integration and benchmarks.

## Table of contents

- Microbenchmarks
    - [memory-syscalls-scalability](./memory-syscalls-scalability/)
    - [sd-jmh-native](./sd-jmh-native/)
- Macrobenchmarks
    - [mn-cache-isolate](./mn-cache-isolate/)
    - [stanfordnlp-preload](./stanfordnlp-preload/)

### memory-syscalls-scalability

A set of microbenchmarks that evaluates the performance of POSIX system calls.
Useful when comparting the speed of a S/D library to the theoretical maximum operational throughputs.

### sd-jmh-native

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
    - `run` - run the application using the default JVM
1. AOT mode:
    - `collect-metadata` - collect metadata needed for reflection/serialization/resource support during image-run time
    - `build-native` - build a native executable
    - `build-native-pgo` - build a native executable using PGO
    - `run-native` - run the native executable
    - `run-native-pgo` - run the native executable that is the product of the PGO build

Additional tooling that measures external RSS and request-response times is also included (`bench-rss`, `bench-latency`, etc.).
