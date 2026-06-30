package net.ristovic.jasper.micro.sdjmh.data.gen;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.Random;
import java.util.UUID;

public class ValueDataGenerator {

    private final Random r;

    public ValueDataGenerator(Random rng) {
        r = rng;
    }

    public int randInt() {
        return r.nextInt();
    }

    public int randInt(int bound) {
        return r.nextInt(bound);
    }

    public long randLong() {
        return r.nextLong();
    }

    public double randDouble() {
        return r.nextDouble();
    }

    public double randDouble(double bound) {
        return r.nextDouble(bound);
    }

    public UUID randUUID() {
        return new UUID(r.nextLong(), r.nextLong());
    }

    public boolean randBool() {
        return r.nextBoolean();
    }

    public BigDecimal randBigDecimal() {
        return BigDecimal.valueOf(r.nextDouble());
    }

    public String randStr(int len) {
        String alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuv";
        return randStr(alphabet, len);
    }

    public String randStr(String alphabet, int len) {
        StringBuffer str = new StringBuffer(len);
        for (int i = 0; i < len; i++) {
            int randomIndex = r.nextInt(alphabet.length());
            char randomChar = alphabet.charAt(randomIndex);
            str.append(randomChar);
        }
        return str.toString();
    }

    public String[] randStrArr(int arrSize, int strSize) {
        String[] arr = new String[arrSize];
        for (int i = 0;i < arrSize; i++) {
            arr[i] = randStr(strSize);
        }
        return arr;
    }
    
    
    public long[] randLongArr(int size) {
        long[] arr = new long[size];
        for (int i = 0; i < size; i++) {
            arr[i] = Math.abs(randInt());
        }
        return arr;
    }

}
