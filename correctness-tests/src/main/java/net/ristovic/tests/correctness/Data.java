package net.ristovic.tests.correctness;

import java.util.*;
import java.util.stream.*;

class Data {

    record Box(Object ref) {
    }

    record Box2(Object ref1, Object ref2) {
    }

    record Box3(Object ref1, Object ref2, Object ref3) {
    }

    static abstract class MapObj<K, V> {
        final Map<K, V> map = new HashMap<>();

        abstract String type();
        abstract K generateKey(int i);
        abstract V generateVal(int i);

        MapObj(int size) {
            IntStream.range(0, size).forEach(i -> map.put(generateKey(i), generateVal(i)));
        }

        @Override
        public String toString() {
            return "Map<" + type() + ">[" + map.size() + "]";
        }

        @Override
        public boolean equals(Object obj) {
            return (obj instanceof MapObj<?, ?> other) && other.type().equals(this.type());
        }

        int size() {
            return map.size();
        }
    }

    static final class MapIntStr extends MapObj<Integer, String> {
        MapIntStr(int size) {
            super(size);
        }

        @Override
        public String type() {
            return "int-str";
        }

        @Override
        public Integer generateKey(int i) {
            return i;
        }

        @Override
        public String generateVal(int i) {
            return "Hello #" + i;
        }
    }

    static final class MapStrStr extends MapObj<String, String> {
        MapStrStr(int size) {
            super(size);
        }

        @Override
        public String type() {
            return "str-str";
        }

        @Override
        public String generateKey(int i) {
            return "Key #" + i;
        }

        @Override
        public String generateVal(int i) {
            return "Value #" + i;
        }
    }

    static final class MapBox2Box3 extends MapObj<Box2, Box3> {
        MapBox2Box3(int size) {
            super(size);
        }

        @Override
        public String type() {
            return "box2-box3";
        }

        @Override
        public Box2 generateKey(int i) {
            return new Box2(new Box(i), new Box(new Box(i)));
        }

        @Override
        public Box3 generateVal(int i) {
            return new Box3(new Box(i), new Box(new Box(i)), new Box2(new Box(i), new Box(new Box(i))));
        }
    }

    /**
     *        root <--+
     *        /  \    |
     *      box  box  |
     *        \  /    |
     *        leaf ---+
     */
    static final class Cycle {

        static class Leaf {
            Object ref;
        }

        Leaf leaf = new Leaf();
        Box left = new Box(leaf);
        Box right = new Box(leaf);
        Box2 root = new Box2(left, right);

        Cycle() {
            leaf.ref = root;
        }

        @Override
        public boolean equals(Object obj) {
            return (obj instanceof Cycle other) && Objects.equals(this.left, other.left) && Objects.equals(this.right, other.right) && Objects.equals(this.leaf.ref, other.leaf.ref);
        }

        @Override
        public int hashCode() {
            return Objects.hash(leaf, left, right, root);
        }
    }

}
