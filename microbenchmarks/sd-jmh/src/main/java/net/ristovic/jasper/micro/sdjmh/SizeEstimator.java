package net.ristovic.jasper.micro.sdjmh;

import net.ristovic.jasper.micro.sdjmh.data.Data;
import net.ristovic.jasper.micro.sdjmh.serializers.Serializer;
import net.ristovic.jasper.micro.sdjmh.serializers.Serializers;

import org.openjdk.jmh.annotations.*;

import java.util.Random;

public final class SizeEstimator {
    public static void main (String[] args) throws Exception {
        Data.setRng(new Random(System.nanoTime()));

        String[] tags = SerializationBenchmark.class
            .getDeclaredField("objTag")
            .getAnnotation(Param.class)
            .value();
        String[] serializers = SerializationBenchmark.class
            .getDeclaredField("serTag")
            .getAnnotation(Param.class)
            .value();

        for (String serTag : serializers) {
            Serializer serializer = Serializers.fromTag(serTag);
            for (String objTag : tags) {
                serializer.register(Data.classesForTag(objTag));
                Object obj = Data.createDataObject(objTag); 
                long size = serializer.sizeOf(obj);
                System.out.println(serTag + "\t" + objTag + "\t\\num{" + size + "}");
            }
        }

    }
}
