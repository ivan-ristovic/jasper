package net.ristovic.benchmarks.osd;

import net.ristovic.benchmarks.osd.data.Data;
import net.ristovic.benchmarks.osd.serializers.Serializer;
import net.ristovic.benchmarks.osd.serializers.Serializers;

import org.openjdk.jmh.annotations.*;
import org.openjdk.jmh.infra.Blackhole;

import java.util.Random;
import java.util.concurrent.*;

@Warmup(iterations = 1, time = 3, timeUnit = TimeUnit.SECONDS)
@Measurement(iterations = 1, time = 5, timeUnit = TimeUnit.SECONDS)
@State(Scope.Benchmark)
public class SerializationBenchmark {

    /*********************** Parameters **************************/

    @Param("1")
    // @Param({"1", "10", "100"})
    private static int iters;

    @Param({"java", "jackson-databind", "gson", "dsljson", "fastjson", "kryo", "kryo-ref"})
    private static String serTag;

    @Param({
        
        // "int", 
        // "dbl", 

        // "arr<int>[8]", 
        // "arr<int>[16]", 
        // "arr<int>[32]", 
        // "arr<int>[64]", 
        // "arr<int>[128]", 
        // "arr<int>[256]", 
        // "arr<int>[512]", 
        // "arr<int>[1024]", 
        // "arr<int>[2048]", 
        "arr<int>[4096]", 
        // "arr<dbl>[8]", 
        // "arr<dbl>[16]", 
        // "arr<dbl>[32]", 
        // "arr<dbl>[64]", 
        // "arr<dbl>[128]", 
        // "arr<dbl>[256]", 
        // "arr<dbl>[512]", 
        // "arr<dbl>[1024]", 
        // "arr<dbl>[2048]", 
        "arr<dbl>[4096]", 

        // "str[8]", 
        // "str[16]", 
        // "str[32]", 
        // "str[64]", 
        // "str[128]", 
        // "str[256]", 
        "str[512]", 
        "recI[2]", 
        "recI[4]", 
        "recI[8]", 
        "recI[16]", 
        "recD[2]", 
        "recD[4]", 
        "recD[8]", 
        "recD[16]", 
        "recS[2]", 
        "recS[4]", 
        "recS[8]", 
        "recS[16]", 

        "client",

        // "lst<int>[4]",
        // "lst<int>[8]",
        // "lst<int>[16]",
        // "lst<int>[32]",
        // "lst<int>[64]",
        // "lst<int>[128]",
        // "lst<int>[256]",
        "lst<int>[512]",
        // "lst<dbl>[4]",
        // "lst<dbl>[8]",
        // "lst<dbl>[16]",
        // "lst<dbl>[32]",
        // "lst<dbl>[64]",
        // "lst<dbl>[128]",
        // "lst<dbl>[256]",
        "lst<dbl>[512]",
        // "lst<str[32]>[4]",
        // "lst<str[32]>[8]",
        // "lst<str[32]>[16]",
        // "lst<str[32]>[32]",
        // "lst<str[32]>[64]",
        // "lst<str[32]>[128]",
        // "lst<str[32]>[256]",
        "lst<str[32]>[512]",
        // "lst<recI[2]>[4]",
        // "lst<recI[2]>[8]",
        // "lst<recI[2]>[16]",
        // "lst<recI[2]>[32]",
        // "lst<recI[2]>[64]",
        // "lst<recI[2]>[128]",
        // "lst<recI[2]>[256]",
        "lst<recI[2]>[512]",
        // "lst<recI[16]>[4]",
        // "lst<recI[16]>[8]",
        // "lst<recI[16]>[16]",
        // "lst<recI[16]>[32]",
        // "lst<recI[16]>[64]",
        // "lst<recI[16]>[128]",
        // "lst<recI[16]>[256]",
        "lst<recI[16]>[512]",
        // "lst<recD[2]>[4]",
        // "lst<recD[2]>[8]",
        // "lst<recD[2]>[16]",
        // "lst<recD[2]>[32]",
        // "lst<recD[2]>[64]",
        // "lst<recD[2]>[128]",
        // "lst<recD[2]>[256]",
        "lst<recD[2]>[512]",
        // "lst<recD[16]>[4]",
        // "lst<recD[16]>[8]",
        // "lst<recD[16]>[16]",
        // "lst<recD[16]>[32]",
        // "lst<recD[16]>[64]",
        // "lst<recD[16]>[128]",
        // "lst<recD[16]>[256]",
        "lst<recD[16]>[512]",
        // "lst<recS[2]>[4]",
        // "lst<recS[2]>[8]",
        // "lst<recS[2]>[16]",
        // "lst<recS[2]>[32]",
        // "lst<recS[2]>[64]",
        // "lst<recS[2]>[128]",
        // "lst<recS[2]>[256]",
        "lst<recS[2]>[512]",
        // "lst<recS[16]>[4]",
        // "lst<recS[16]>[8]",
        // "lst<recS[16]>[16]",
        // "lst<recS[16]>[32]",
        // "lst<recS[16]>[64]",
        // "lst<recS[16]>[128]",
        // "lst<recS[16]>[256]",
        "lst<recS[16]>[512]",
        // "lst<client>[4]",
        // "lst<client>[8]",
        // "lst<client>[16]",
        // "lst<client>[32]",
        // "lst<client>[64]",
        // "lst<client>[128]",
        // "lst<client>[256]",
        "lst<client>[512]",

        // "map<int,int>[4]",
        // "map<int,int>[8]",
        // "map<int,int>[16]",
        // "map<int,int>[32]",
        // "map<int,int>[64]",
        // "map<int,int>[128]",
        // "map<int,int>[256]",
        "map<int,int>[512]",
        // "map<int,str[8]>[4]",
        // "map<int,str[8]>[8]",
        // "map<int,str[8]>[16]",
        // "map<int,str[8]>[32]",
        // "map<int,str[8]>[64]",
        // "map<int,str[8]>[128]",
        // "map<int,str[8]>[256]",
        "map<int,str[8]>[512]",
        // "map<int,str[32]>[4]",
        // "map<int,str[32]>[8]",
        // "map<int,str[32]>[16]",
        // "map<int,str[32]>[32]",
        // "map<int,str[32]>[64]",
        // "map<int,str[32]>[128]",
        // "map<int,str[32]>[256]",
        "map<int,str[32]>[512]",
        // "map<int,recI[2]>[4]",
        // "map<int,recI[2]>[8]",
        // "map<int,recI[2]>[16]",
        // "map<int,recI[2]>[32]",
        // "map<int,recI[2]>[64]",
        // "map<int,recI[2]>[128]",
        // "map<int,recI[2]>[256]",
        "map<int,recI[2]>[512]",
        // "map<int,recI[16]>[4]",
        // "map<int,recI[16]>[8]",
        // "map<int,recI[16]>[16]",
        // "map<int,recI[16]>[32]",
        // "map<int,recI[16]>[64]",
        // "map<int,recI[16]>[128]",
        // "map<int,recI[16]>[256]",
        "map<int,recI[16]>[512]",
        // "map<int,recD[2]>[4]",
        // "map<int,recD[2]>[8]",
        // "map<int,recD[2]>[16]",
        // "map<int,recD[2]>[32]",
        // "map<int,recD[2]>[64]",
        // "map<int,recD[2]>[128]",
        // "map<int,recD[2]>[256]",
        "map<int,recD[2]>[512]",
        // "map<int,recD[16]>[4]",
        // "map<int,recD[16]>[8]",
        // "map<int,recD[16]>[16]",
        // "map<int,recD[16]>[32]",
        // "map<int,recD[16]>[64]",
        // "map<int,recD[16]>[128]",
        // "map<int,recD[16]>[256]",
        "map<int,recD[16]>[512]",
        // "map<int,recS[2]>[4]",
        // "map<int,recS[2]>[8]",
        // "map<int,recS[2]>[16]",
        // "map<int,recS[2]>[32]",
        // "map<int,recS[2]>[64]",
        // "map<int,recS[2]>[128]",
        // "map<int,recS[2]>[256]",
        "map<int,recS[2]>[512]",
        // "map<int,recS[16]>[4]",
        // "map<int,recS[16]>[8]",
        // "map<int,recS[16]>[16]",
        // "map<int,recS[16]>[32]",
        // "map<int,recS[16]>[64]",
        // "map<int,recS[16]>[128]",
        // "map<int,recS[16]>[256]",
        "map<int,recS[16]>[512]",
        // "map<int,client>[4]",
        // "map<int,client>[8]",
        // "map<int,client>[16]",
        // "map<int,client>[32]",
        // "map<int,client>[64]",
        // "map<int,client>[128]",
        // "map<int,client>[256]",
        "map<int,client>[512]",
        // "map<str[8],int>[4]",
        // "map<str[8],int>[8]",
        // "map<str[8],int>[16]",
        // "map<str[8],int>[32]",
        // "map<str[8],int>[64]",
        // "map<str[8],int>[128]",
        // "map<str[8],int>[256]",
        "map<str[8],int>[512]",
        // "map<str[8],str[8]>[4]",
        // "map<str[8],str[8]>[8]",
        // "map<str[8],str[8]>[16]",
        // "map<str[8],str[8]>[32]",
        // "map<str[8],str[8]>[64]",
        // "map<str[8],str[8]>[128]",
        // "map<str[8],str[8]>[256]",
        "map<str[8],str[8]>[512]",
        // "map<str[8],str[32]>[4]",
        // "map<str[8],str[32]>[8]",
        // "map<str[8],str[32]>[16]",
        // "map<str[8],str[32]>[32]",
        // "map<str[8],str[32]>[64]",
        // "map<str[8],str[32]>[128]",
        // "map<str[8],str[32]>[256]",
        "map<str[8],str[32]>[512]",
        // "map<str[8],recI[2]>[4]",
        // "map<str[8],recI[2]>[8]",
        // "map<str[8],recI[2]>[16]",
        // "map<str[8],recI[2]>[32]",
        // "map<str[8],recI[2]>[64]",
        // "map<str[8],recI[2]>[128]",
        // "map<str[8],recI[2]>[256]",
        "map<str[8],recI[2]>[512]",
        // "map<str[8],recI[16]>[4]",
        // "map<str[8],recI[16]>[8]",
        // "map<str[8],recI[16]>[16]",
        // "map<str[8],recI[16]>[32]",
        // "map<str[8],recI[16]>[64]",
        // "map<str[8],recI[16]>[128]",
        // "map<str[8],recI[16]>[256]",
        "map<str[8],recI[16]>[512]",
        // "map<str[8],recD[2]>[4]",
        // "map<str[8],recD[2]>[8]",
        // "map<str[8],recD[2]>[16]",
        // "map<str[8],recD[2]>[32]",
        // "map<str[8],recD[2]>[64]",
        // "map<str[8],recD[2]>[128]",
        // "map<str[8],recD[2]>[256]",
        "map<str[8],recD[2]>[512]",
        // "map<str[8],recD[16]>[4]",
        // "map<str[8],recD[16]>[8]",
        // "map<str[8],recD[16]>[16]",
        // "map<str[8],recD[16]>[32]",
        // "map<str[8],recD[16]>[64]",
        // "map<str[8],recD[16]>[128]",
        // "map<str[8],recD[16]>[256]",
        "map<str[8],recD[16]>[512]",
        // "map<str[8],recS[2]>[4]",
        // "map<str[8],recS[2]>[8]",
        // "map<str[8],recS[2]>[16]",
        // "map<str[8],recS[2]>[32]",
        // "map<str[8],recS[2]>[64]",
        // "map<str[8],recS[2]>[128]",
        // "map<str[8],recS[2]>[256]",
        "map<str[8],recS[2]>[512]",
        // "map<str[8],recS[16]>[4]",
        // "map<str[8],recS[16]>[8]",
        // "map<str[8],recS[16]>[16]",
        // "map<str[8],recS[16]>[32]",
        // "map<str[8],recS[16]>[64]",
        // "map<str[8],recS[16]>[128]",
        // "map<str[8],recS[16]>[256]",
        "map<str[8],recS[16]>[512]",
        // "map<str[8],client>[4]",
        // "map<str[8],client>[8]",
        // "map<str[8],client>[16]",
        // "map<str[8],client>[32]",
        // "map<str[8],client>[64]",
        // "map<str[8],client>[128]",
        // "map<str[8],client>[256]",
        "map<str[8],client>[512]",

    })
    private static String objTag;

    @Param({"0"})
    // @Param({"42"})
    private static long seed;

    /*********************** Bench args **************************/

    private static Serializer serializer;
    private static Object obj;
    private static Object serObj;

    /*********************** Bench setup *************************/

    @Setup(Level.Iteration)
    public void setup() throws Exception {
        Data.setRng(new Random(seed == 0 ? System.nanoTime() : seed));
        obj = Data.createDataObject(objTag); 
        serializer = Serializers.fromTag(serTag);
        serializer.register(Data.classesForTag(objTag));
    }

    @Setup(Level.Invocation)
    public void invocationSetup() throws Exception {
        obj = serializer.preSerialize(obj);
        serObj = serializer.serialize(obj);
        serObj = serializer.preDeserialize(obj.getClass(), serObj);
    }

    /*********************** Benchmarks **************************/

    @Benchmark
    @Fork(0)
    public static void benchmarkS(Blackhole blackhole) throws Exception {
        for (int i = 0; i < iters; i++) {
            Object data = serializer.serialize(obj);
            blackhole.consume(data);
        }
        serializer.flush();
    }

    @Benchmark
    @Fork(0)
    public static void benchmarkD(Blackhole blackhole) throws Exception {
        for (int i = 0; i < iters; i++) {
            Object data = serializer.deserialize(obj.getClass(), serObj);
            blackhole.consume(data);
        }
        serializer.flush();
    }

    /*************************************************************/

}
