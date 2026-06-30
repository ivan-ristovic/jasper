package net.ristovic.jasper.micro.sdjmh.data.model;

import java.io.Serializable;
import net.ristovic.jasper.micro.sdjmh.data.gen.ValueDataGenerator;

public final class RecStr {
    public static Object withNFields(ValueDataGenerator rng, int n) {
        String v1 = rng.randStr(32);
        String v2 = rng.randStr(32);
        String v3 = rng.randStr(32);
        String v4 = rng.randStr(32);
        String v5 = rng.randStr(32);
        String v6 = rng.randStr(32);
        String v7 = rng.randStr(32);
        String v8 = rng.randStr(32);
        String v9 = rng.randStr(32);
        String v10 = rng.randStr(32);
        String v11 = rng.randStr(32);
        String v12 = rng.randStr(32);
        String v13 = rng.randStr(32);
        String v14 = rng.randStr(32);
        String v15 = rng.randStr(32);
        String v16 = rng.randStr(32);
        switch (n) {
            case 1:
                return new RecStr.One(v1);
            case 2:
                return new RecStr.Two(v1, v2);
            case 3:
                return new RecStr.Three(v1, v2, v3);
            case 4:
                return new RecStr.Four(v1, v2, v3, v4);
            case 5:
                return new RecStr.Five(v1, v2, v3, v4, v5);
            case 6:
                return new RecStr.Six(v1, v2, v3, v4, v5, v6);
            case 7:
                return new RecStr.Seven(v1, v2, v3, v4, v5, v6, v7);
            case 8:
                return new RecStr.Eight(v1, v2, v3, v4, v5, v6, v7, v8);
            case 9:
                return new RecStr.Nine(v1, v2, v3, v4, v5, v6, v7, v8, v9);
            case 10:
                return new RecStr.Ten(v1, v2, v3, v4, v5, v6, v7, v8, v9, v10);
            case 11:
                return new RecStr.Eleven(v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11);
            case 12:
                return new RecStr.Twelve(v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12);
            case 13:
                return new RecStr.Thirteen(v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13);
            case 14:
                return new RecStr.Fourteen(v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14);
            case 15:
                return new RecStr.Fifteen(v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14, v15);
            case 16:
                return new RecStr.Sixteen(v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14, v15, v16);
            default:
                return new RecStr();
        }
    }

    public record One(String v) implements Serializable {
    };
    public record Two(String v1, String v2) implements Serializable {
    };
    public record Three(String v1, String v2, String v3) implements Serializable {
    };
    public record Four(String v1, String v2, String v3, String v4) implements Serializable {
    };
    public record Five(String v1, String v2, String v3, String v4, String v5) implements Serializable {
    };
    public record Six(String v1, String v2, String v3, String v4, String v5, String v6) implements Serializable {
    };
    public record Seven(String v1, String v2, String v3, String v4, String v5, String v6, String v7) implements Serializable {
    };
    public record Eight(String v1, String v2, String v3, String v4, String v5, String v6, String v7, String v8) implements Serializable {
    };
    public record Nine(String v1, String v2, String v3, String v4, String v5, String v6, String v7, String v8, String v9) implements Serializable {
    };
    public record Ten(String v1, String v2, String v3, String v4, String v5, String v6, String v7, String v8, String v9, String v10) implements Serializable {
    };
    public record Eleven(String v1, String v2, String v3, String v4, String v5, String v6, String v7, String v8, String v9, String v10, String v11) implements Serializable {
    };
    public record Twelve(String v1, String v2, String v3, String v4, String v5, String v6, String v7, String v8, String v9, String v10, String v11, String v12) implements Serializable {
    };
    public record Thirteen(String v1, String v2, String v3, String v4, String v5, String v6, String v7, String v8, String v9, String v10, String v11, String v12, String v13) implements Serializable {
    };
    public record Fourteen(String v1, String v2, String v3, String v4, String v5, String v6, String v7, String v8, String v9, String v10, String v11, String v12, String v13, String v14) implements Serializable {
    };
    public record Fifteen(String v1, String v2, String v3, String v4, String v5, String v6, String v7, String v8, String v9, String v10, String v11, String v12, String v13, String v14, String v15) implements Serializable {
    };
    public record Sixteen(String v1, String v2, String v3, String v4, String v5, String v6, String v7, String v8, String v9, String v10, String v11, String v12, String v13, String v14, String v15, String v16) implements Serializable {
    };
}
