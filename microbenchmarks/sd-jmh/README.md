# jmh-native

## Important Notes on Using JMH with GraalVM Native Image

To build a native executable version of this benchmark you need to run the [Tracing Agent](https://www.graalvm.org/dev/reference-manual/native-image/metadata/AutomaticMetadataCollection/) to supply the reflection configuration to the `native-image` builder. This has already been done for you to save time and the generated
configuration can be found in _src/main/resources/META-INF/native-image/_.
This configuration might need to be updated, depending on the GraalVM and S/D framework versions.
The [`collect-metadata`](./collect-metadata) script can be used to invoke the tracing agent and dump metadata to a given directory.

In order to make a JMH benchmark run as native executable, built by GraalVM Native Image, you can not fork the benchmark process 
in the same way as JMH does when running on the JVM. When running on the JVM JMH will fork a new JVM for each benchmark in order
to ensure there is no interference in the measurements for each benchmark. This forking process is not possible on GraalVM Native Image
and you should consider the following guidance when building JMH benchmarks that are meant to be run as native executables:

* You should only include a single benchmark in each native executable
* You need to annotate the benchmark with, `@Fork(0)` to ensure that the benchmark is not forked
* If you want to profile the benchmark in order to generate an optimised benchmark, you should, obviously, ignore the benchmark results whilst profiling

