package net.ristovic.jasper.macro.stanfordnlp.preload;

public class Stopwatch {

    private long start;
    private long stop;

    public Stopwatch() {
    }

    public void reset() {
        stop = 0;
        start = 0;
    }

    public void start() {
        reset();
        start = System.nanoTime();
    }

    public void stop() {
        stop = System.nanoTime();
    }

    public long elapsed() {
        return stop - start;
    }

    public void printElapsed(String tag) {
        double elapsed = elapsed();
        String unit = "ns";
        if (elapsed >= 1000) {
            elapsed /= 1000;
            unit = "us";
        }
        if (elapsed >= 1000) {
            elapsed /= 1000;
            unit = "ms";
        }
        if (elapsed >= 1000) {
            elapsed /= 1000;
            unit = "s";
        }
        System.out.println("[" + tag + "]:\t" + elapsed + " " + unit);
    }
}
