package net.ristovic.benchmarks.safepoint;

import org.graalvm.nativeimage.ObjectSnapshots;
import org.graalvm.nativeimage.ObjectSnapshots.ObjectSnapshot;
import org.graalvm.nativeimage.ObjectSnapshots.ObjectSnapshotProvider;
import org.graalvm.nativeimage.ObjectSnapshots.ObjectSnapshotRegion;
import org.graalvm.nativeimage.ObjectSnapshots.ObjectSnapshotSlot;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;

public class Main {
    
    private static final int[] SIZES = new int[] {
        0,
        10,
        100,
        1000,
        10000,
    };
    
    private static ObjectSnapshots.ObjectSnapshotProvider provider = ObjectSnapshots.provider();
    private static ObjectSnapshots.ObjectSnapshotSlot slot = ObjectSnapshots.snapshotRegion().getSlot(0);
    private static Path snapshotPath;

    public static void main(String[] args) throws Exception {
        snapshotPath = Files.createTempFile("ni-oss-", ".snapshot");

        for (int size : SIZES) {
            System.out.println("Testing size: " + size);

            // Allocate objects
            Obj[] objs = allocateObjects(size);

            // Preparations
            prepareGc();
            prepareDoss(objs);

            // Drop reference to objs
            objs = null;

            // Measurements
            measureGc();
            measureDoss();
        }   
    }

    public static void prepareGc() throws Exception {
        // Ensure clean heap state
        System.gc();
    }

    public static void prepareDoss(Object obj) throws Exception {
        // Delete previous snapshot files
        Files.delete(snapshotPath);

        // Create and store snapshot
        // (without keeping references to snapshotted objects!)
        provider.createObjectSnapshot(obj, slot);
        provider.store(slot, snapshotPath);
        
        // Unlink snapshot from slot to allow loading.
        // This operation DOES NOT move objects to the runtime heap
        // as the reference to snapshotted objects is purposefully dropped!
        provider.unload(slot);

        // Load snapshot from file
        provider.load(snapshotPath, slot);
    }

    public static void measureGc() throws Exception {
        long start = System.nanoTime();
        System.gc();
        long end = System.nanoTime();
        System.out.println("GC  : " + (end - start) + "ns");
    }

    public static void measureDoss() throws Exception {
        long start = System.nanoTime();
        provider.unload(slot);
        long end = System.nanoTime();
        System.out.println("DOSS: " + (end - start) + "ns");
    }

    private static Obj[] allocateObjects(int size) {
        Obj[] objs = new Obj[size];
        for (int i = 0; i < objs.length; i++) {
            objs[i] = new Obj(i);
        }
        return objs;
    }

    private static class Obj {
        int value;

        Obj(int v) {
            value = v;
        }

        int getValue() {
            return value;
        }
    }

}
