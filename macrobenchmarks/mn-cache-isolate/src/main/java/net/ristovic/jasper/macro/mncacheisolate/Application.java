package net.ristovic.jasper.macro.mncacheisolate;

import io.micronaut.runtime.Micronaut;

import java.nio.file.Path;
import java.nio.file.Files;

import org.graalvm.nativeimage.*;
import org.graalvm.nativeimage.c.function.*;

public class Application {

    public static final int ISOLATES = 4;
    public static final int MAX_ISOLATES = 16;
    public static final String OPT_ISOLATES = "--isolates";

    public static void main(String[] args) throws Exception {

        if (args.length > 0 && !args[0].isBlank()) {
            switch (args[0]) {
                case OPT_ISOLATES:
                    spawnIsolates(args);
                    break;
                default:
                    throw new RuntimeException("Unknown option: " + args[1]);
            }
        } else {
            spawnSingle(args);
        }
    }

    private static void spawnSingle(String[] args) {
        Micronaut.run(Application.class, args);
    }

    private static void spawnIsolates(String[] args) throws InterruptedException {
        assert args[0].equals(OPT_ISOLATES);

        int n = determineIsolateCount(args);
        System.err.println("Spawning " + n + " isolates...");

        Thread[] ths = new Thread[n];
        for (int i = 0; i < n; i++) {
            final int port = 8080 + i;
            ths[i] = new Thread(() -> {
                IsolateThread isolate = Isolates.createIsolate(Isolates.CreateIsolateParameters.getDefault());
                isolateMain(isolate, port);
                Isolates.tearDownIsolate(isolate);
            });
            ths[i].start();
            System.err.println("Started isolate " + i);
        }

        for (Thread th : ths) {
            th.join();
        }
    }

    @CEntryPoint(include = CEntryPoint.NotIncludedAutomatically.class)
    private static void isolateMain(IsolateThread context, int port) {
        System.out.println("Hello from isolate " + context.rawValue());
        String[] args = { "-Dmicronaut.server.port=" + port };
        Micronaut.run(Application.class, args);
        try {
            Thread.sleep(60 * 60 * 1000);   // 1h
        } catch (InterruptedException e) {
            System.err.println("Interrupted");
            e.printStackTrace();
        }
    }

    private static int determineIsolateCount(String[] args) {
        assert args[0].equals(OPT_ISOLATES);

        int n = ISOLATES;
        if (args.length > 1) {
            try {
                n = Integer.parseUnsignedInt(args[1]);
            } catch (NumberFormatException e) {
                throw new RuntimeException(OPT_ISOLATES + " option requires an integer argument", e);
            }
            if (n > MAX_ISOLATES) {
                throw new RuntimeException("Spawning more than " + MAX_ISOLATES + " isolates is not supported");
            }
        }

        return n;
    }

}

