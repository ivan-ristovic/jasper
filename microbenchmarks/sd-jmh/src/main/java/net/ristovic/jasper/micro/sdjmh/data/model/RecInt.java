package net.ristovic.jasper.micro.sdjmh.data.model;

import java.io.Serializable;
import net.ristovic.jasper.micro.sdjmh.data.gen.ValueDataGenerator;

public final class RecInt {
    public static Object withNFields(ValueDataGenerator rng, int n) {
        int v1 = rng.randInt();
        int v2 = rng.randInt();
        int v3 = rng.randInt();
        int v4 = rng.randInt();
        int v5 = rng.randInt();
        int v6 = rng.randInt();
        int v7 = rng.randInt();
        int v8 = rng.randInt();
        int v9 = rng.randInt();
        int v10 = rng.randInt();
        int v11 = rng.randInt();
        int v12 = rng.randInt();
        int v13 = rng.randInt();
        int v14 = rng.randInt();
        int v15 = rng.randInt();
        int v16 = rng.randInt();
        switch (n) {
            case 1:
                return new RecInt.One(v1);
            case 2:
                return new RecInt.Two(v1, v2);
            case 3:
                return new RecInt.Three(v1, v2, v3);
            case 4:
                return new RecInt.Four(v1, v2, v3, v4);
            case 5:
                return new RecInt.Five(v1, v2, v3, v4, v5);
            case 6:
                return new RecInt.Six(v1, v2, v3, v4, v5, v6);
            case 7:
                return new RecInt.Seven(v1, v2, v3, v4, v5, v6, v7);
            case 8:
                return new RecInt.Eight(v1, v2, v3, v4, v5, v6, v7, v8);
            case 9:
                return new RecInt.Nine(v1, v2, v3, v4, v5, v6, v7, v8, v9);
            case 10:
                return new RecInt.Ten(v1, v2, v3, v4, v5, v6, v7, v8, v9, v10);
            case 11:
                return new RecInt.Eleven(v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11);
            case 12:
                return new RecInt.Twelve(v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12);
            case 13:
                return new RecInt.Thirteen(v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13);
            case 14:
                return new RecInt.Fourteen(v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14);
            case 15:
                return new RecInt.Fifteen(v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14, v15);
            case 16:
                return new RecInt.Sixteen(v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14, v15, v16);
            default:
                return new RecInt();
        }
    }

    public record One(int v) implements Serializable {
    };
    public record Two(int v1, int v2) implements Serializable {
    };
    public record Three(int v1, int v2, int v3) implements Serializable {
    };
    public record Four(int v1, int v2, int v3, int v4) implements Serializable {
    };
    public record Five(int v1, int v2, int v3, int v4, int v5) implements Serializable {
    };
    public record Six(int v1, int v2, int v3, int v4, int v5, int v6) implements Serializable {
    };
    public record Seven(int v1, int v2, int v3, int v4, int v5, int v6, int v7) implements Serializable {
    };
    public record Eight(int v1, int v2, int v3, int v4, int v5, int v6, int v7, int v8) implements Serializable {
    };
    public record Nine(int v1, int v2, int v3, int v4, int v5, int v6, int v7, int v8, int v9) implements Serializable {
    };
    public record Ten(int v1, int v2, int v3, int v4, int v5, int v6, int v7, int v8, int v9, int v10) implements Serializable {
    };
    public record Eleven(int v1, int v2, int v3, int v4, int v5, int v6, int v7, int v8, int v9, int v10, int v11) implements Serializable {
    };
    public record Twelve(int v1, int v2, int v3, int v4, int v5, int v6, int v7, int v8, int v9, int v10, int v11, int v12) implements Serializable {
    };
    public record Thirteen(int v1, int v2, int v3, int v4, int v5, int v6, int v7, int v8, int v9, int v10, int v11, int v12, int v13) implements Serializable {
    };
    public record Fourteen(int v1, int v2, int v3, int v4, int v5, int v6, int v7, int v8, int v9, int v10, int v11, int v12, int v13, int v14) implements Serializable {
    };
    public record Fifteen(int v1, int v2, int v3, int v4, int v5, int v6, int v7, int v8, int v9, int v10, int v11, int v12, int v13, int v14, int v15) implements Serializable {
    };
    public record Sixteen(int v1, int v2, int v3, int v4, int v5, int v6, int v7, int v8, int v9, int v10, int v11, int v12, int v13, int v14, int v15, int v16) implements Serializable {
    };
}
