package net.ristovic.tests.correctness;

import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.zip.ZipFile;
import java.lang.ref.Cleaner;

public class Main {

    public static void main(String[] args) throws Exception {
        Serializer doss = new DossSerializer();
        testCorrectness(doss);
        testRobustness(doss);
    }

    private static void testCorrectness(Serializer serializer) throws Exception {

        WorkloadCollection w = new WorkloadCollection();
        w.register(serializer);
        
        for (Object obj : w.all()) {
            Class<?> type = obj.getClass();
            if (obj == null) {
                throw new Exception("Null workload object detected");
            }
            System.out.println("> Type " + type.getName() + ", obj: " + toStr(obj));
            
            // Serialize
            obj = serializer.preSerialize(obj);
            Object data = serializer.serialize(obj);            
            serializer.flush();
            System.out.println(">>> Serialized  : " + toStr(data));

            // Deserialize
            data = serializer.preDeserialize(type, data);
            Object deserialized = serializer.deserialize(type, data);
            System.out.println(">>> Deserialized: " + toStr(deserialized));
        }

    }

    private static void testRobustness(Serializer serializer) throws Exception {
        Object[] objs = new Object[] {
            new Thread(() -> { System.out.println("Hello from thread");}),
            new FileDescriptor(),
            Cleaner.create(),
            new ZipFile("test.zip")
        };
        for (Object obj : objs) {
            RuntimeException caughtException = null;
            try {
                serializer.serialize(obj);            
            } catch (RuntimeException e) {
                caughtException = e;
            }
            if (caughtException == null) {
                throw new Exception("Did not throw exception for " + obj.getClass().getName());
            }
        }
    }

    private static String toStr(Object o) {
        String s = o.toString();
        if (s.length() <= 10) {
            return s;
        } else {
            return s.substring(0, 10) + "...";
        }
    }

}
