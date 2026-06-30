package net.ristovic.jasper.macro.mncacheisolate;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Files;

import java.time.Month;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

public class Headlines {

    private static final Path headlineDataPath = Path.of("data");
    
    private Map<Integer, List<String>> headlines = new HashMap<Integer, List<String>>() {{
        put(1, List.of());
        put(2, List.of());
        put(3, List.of());
        put(4, List.of());
        put(5, List.of());
        put(6, List.of());
        put(7, List.of());
        put(8, List.of());
        put(9, List.of());
        put(10, List.of());
        put(11, List.of());
        put(12, List.of());
    }};

    public static Headlines instance = null;

    public static Headlines instance() {
        if (instance == null) {
            instance = new Headlines();
        }
        return instance;
    }

    public List<String> get(Integer month) {
        var hls = headlines.get(month);
        if (hls.isEmpty()) {
            hls = new ArrayList();
            Path f = headlineDataPath.resolve(month.toString() + ".txt");
            System.out.println("Reading headlines from " + f);
            try (var in = Files.newBufferedReader(f)) {
                String line = null;
                while ((line = in.readLine()) != null) {
                    hls.add(line);
                }
            } catch (IOException e) {
                e.printStackTrace();
                return null;
            }
            Collections.sort(hls);
            System.gc();
            System.out.println("Finished reading headlines from " + f);

            headlines.put(month, hls);
        }
        return hls;
    }
    
    public void put(Integer month, String headline) {
        get(month).add(headline);
    }

    public void replace(Integer month, List<String> hls) {
        headlines.put(month, hls);
    }
}
