package net.ristovic.jasper.micro.sdjmh;

import net.ristovic.jasper.micro.sdjmh.data.Data;
import net.ristovic.jasper.micro.sdjmh.serializers.Serializer;
import net.ristovic.jasper.micro.sdjmh.serializers.Serializers;

import org.junit.jupiter.api.Test;
import org.openjdk.jmh.annotations.Param;
import org.openjdk.jmh.infra.Blackhole;

import java.io.Serializable;
import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Random;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class WorkloadTagTest {

    private static final long TEST_SEED = 42L;
    private static final Blackhole BLACKHOLE = new Blackhole(
        "Today's password is swordfish. I understand instantiating Blackholes directly is dangerous."
    );

    @Test
    void allBenchmarkWorkloadTagsCanRunThroughEverySerializer() throws Exception {
        for (String serTag : benchmarkParamValues("serTag")) {
            for (String objTag : benchmarkParamValues("objTag")) {
                assertDoesNotThrow(() -> runOneSerializationCycle(serTag, objTag), serTag + " / " + objTag);
            }
        }
    }

    @Test
    void allBenchmarkWorkloadTagsCanRunBenchmarkMethods() throws Exception {
        for (String serTag : benchmarkParamValues("serTag")) {
            for (String objTag : benchmarkParamValues("objTag")) {
                assertDoesNotThrow(() -> runBenchmarkMethods(serTag, objTag), serTag + " / " + objTag);
            }
        }
    }

    @Test
    void arbitraryClassWorkloadTagsCanBeNestedInListsAndMaps() throws Exception {
        String payloadTag = ArbitraryPayload.class.getName();
        List<String> tags = List.of(
            "lst<" + payloadTag + ">[2]",
            "map<int," + payloadTag + ">[2]",
            "map<int,lst<" + payloadTag + ">[2]>[2]"
        );

        for (String serTag : benchmarkParamValues("serTag")) {
            for (String objTag : tags) {
                assertDoesNotThrow(() -> runOneSerializationCycle(serTag, objTag), serTag + " / " + objTag);
                assertDoesNotThrow(() -> runBenchmarkMethods(serTag, objTag), serTag + " / " + objTag);
            }
        }
    }

    @Test
    void arbitraryClassWorkloadTagsSupportRequestExamplesWithoutSizeSpecifiers() {
        String payloadTag = ArbitraryPayload.class.getName();

        Data.setRng(new Random(TEST_SEED));
        Object list = Data.createDataObject("lst<" + payloadTag + ">");
        Object map = Data.createDataObject("map<int," + payloadTag + ">");

        assertEquals(ArrayList.class, list.getClass());
        assertTrue(((List<?>) list).isEmpty());
        assertTrue(((java.util.Map<?, ?>) map).isEmpty());
    }

    @Test
    void arbitraryClassWorkloadTagsRegisterDiscoveredClasses() {
        String payloadTag = ArbitraryPayload.class.getName();
        List<Class<?>> classes = Arrays.asList(Data.classesForTag("map<int,lst<" + payloadTag + ">[2]>[2]"));

        assertTrue(classes.contains(ArbitraryPayload.class));
        assertTrue(classes.contains(NestedPayload.class));
    }

    private static void runOneSerializationCycle(String serTag, String objTag) throws Exception {
        Data.setRng(new Random(TEST_SEED));
        Object obj = Data.createDataObject(objTag);
        assertNotNull(obj, objTag);

        Serializer serializer = Serializers.fromTag(serTag);
        try {
            serializer.register(Data.classesForTag(objTag));
            Object preparedObj = serializer.preSerialize(obj);
            Object serialized = serializer.serialize(preparedObj);
            Object preparedSerialized = serializer.preDeserialize(preparedObj.getClass(), serialized);
            Object deserialized = serializer.deserialize(preparedObj.getClass(), preparedSerialized);
            assertNotNull(deserialized, serTag + " / " + objTag);
        } finally {
            serializer.flush();
        }
    }

    private static void runBenchmarkMethods(String serTag, String objTag) throws Exception {
        setBenchmarkParam("iters", 1);
        setBenchmarkParam("serTag", serTag);
        setBenchmarkParam("objTag", objTag);
        setBenchmarkParam("seed", TEST_SEED);
        SerializationBenchmark serializationBenchmark = new SerializationBenchmark();
        serializationBenchmark.setup();
        serializationBenchmark.invocationSetup();
        SerializationBenchmark.benchmarkS(BLACKHOLE);

        serializationBenchmark.setup();
        serializationBenchmark.invocationSetup();
        SerializationBenchmark.benchmarkD(BLACKHOLE);
    }

    private static void setBenchmarkParam(String fieldName, Object value) throws Exception {
        Field field = SerializationBenchmark.class.getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(null, value);
    }

    private static String[] benchmarkParamValues(String fieldName) throws Exception {
        Field field = SerializationBenchmark.class.getDeclaredField(fieldName);
        return field.getAnnotation(Param.class).value();
    }

    public static final class ArbitraryPayload implements Serializable {
        public int id;
        public String name;
        public BigDecimal balance;
        public LocalDate createdAt;
        public NestedPayload nested;
        public List<NestedPayload> nestedItems;

        public ArbitraryPayload() {
        }
    }

    public record NestedPayload(long id, String label) implements Serializable {
    }
}
