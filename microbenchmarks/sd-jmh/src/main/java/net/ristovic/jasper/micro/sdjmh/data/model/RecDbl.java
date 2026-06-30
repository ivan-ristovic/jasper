package net.ristovic.jasper.micro.sdjmh.data.model;

import java.io.Serializable;
import net.ristovic.jasper.micro.sdjmh.data.gen.ValueDataGenerator;

public final class RecDbl {
    public static Object withNFields(ValueDataGenerator rng, int n) {
        double v1 = rng.randDouble();
        double v2 = rng.randDouble();
        double v3 = rng.randDouble();
        double v4 = rng.randDouble();
        double v5 = rng.randDouble();
        double v6 = rng.randDouble();
        double v7 = rng.randDouble();
        double v8 = rng.randDouble();
        double v9 = rng.randDouble();
        double v10 = rng.randDouble();
        double v11 = rng.randDouble();
        double v12 = rng.randDouble();
        double v13 = rng.randDouble();
        double v14 = rng.randDouble();
        double v15 = rng.randDouble();
        double v16 = rng.randDouble();
        switch (n) {
            case 1:
                return new RecDbl.One(v1);
            case 2:
                return new RecDbl.Two(v1, v2);
            case 3:
                return new RecDbl.Three(v1, v2, v3);
            case 4:
                return new RecDbl.Four(v1, v2, v3, v4);
            case 5:
                return new RecDbl.Five(v1, v2, v3, v4, v5);
            case 6:
                return new RecDbl.Six(v1, v2, v3, v4, v5, v6);
            case 7:
                return new RecDbl.Seven(v1, v2, v3, v4, v5, v6, v7);
            case 8:
                return new RecDbl.Eight(v1, v2, v3, v4, v5, v6, v7, v8);
            case 9:
                return new RecDbl.Nine(v1, v2, v3, v4, v5, v6, v7, v8, v9);
            case 10:
                return new RecDbl.Ten(v1, v2, v3, v4, v5, v6, v7, v8, v9, v10);
            case 11:
                return new RecDbl.Eleven(v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11);
            case 12:
                return new RecDbl.Twelve(v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12);
            case 13:
                return new RecDbl.Thirteen(v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13);
            case 14:
                return new RecDbl.Fourteen(v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14);
            case 15:
                return new RecDbl.Fifteen(v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14, v15);
            case 16:
                return new RecDbl.Sixteen(v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14, v15, v16);
            default:
                return new RecDbl();
        }
    }

    public record One(double v) implements Serializable {
    };
    public record Two(double v1, double v2) implements Serializable {
    };
    public record Three(double v1, double v2, double v3) implements Serializable {
    };
    public record Four(double v1, double v2, double v3, double v4) implements Serializable {
    };
    public record Five(double v1, double v2, double v3, double v4, double v5) implements Serializable {
    };
    public record Six(double v1, double v2, double v3, double v4, double v5, double v6) implements Serializable {
    };
    public record Seven(double v1, double v2, double v3, double v4, double v5, double v6, double v7) implements Serializable {
    };
    public record Eight(double v1, double v2, double v3, double v4, double v5, double v6, double v7, double v8) implements Serializable {
    };
    public record Nine(double v1, double v2, double v3, double v4, double v5, double v6, double v7, double v8, double v9) implements Serializable {
    };
    public record Ten(double v1, double v2, double v3, double v4, double v5, double v6, double v7, double v8, double v9, double v10) implements Serializable {
    };
    public record Eleven(double v1, double v2, double v3, double v4, double v5, double v6, double v7, double v8, double v9, double v10, double v11) implements Serializable {
    };
    public record Twelve(double v1, double v2, double v3, double v4, double v5, double v6, double v7, double v8, double v9, double v10, double v11, double v12) implements Serializable {
    };
    public record Thirteen(double v1, double v2, double v3, double v4, double v5, double v6, double v7, double v8, double v9, double v10, double v11, double v12, double v13) implements Serializable {
    };
    public record Fourteen(double v1, double v2, double v3, double v4, double v5, double v6, double v7, double v8, double v9, double v10, double v11, double v12, double v13, double v14) implements Serializable {
    };
    public record Fifteen(double v1, double v2, double v3, double v4, double v5, double v6, double v7, double v8, double v9, double v10, double v11, double v12, double v13, double v14, double v15) implements Serializable {
    };
    public record Sixteen(double v1, double v2, double v3, double v4, double v5, double v6, double v7, double v8, double v9, double v10, double v11, double v12, double v13, double v14, double v15, double v16) implements Serializable {
    };
}
