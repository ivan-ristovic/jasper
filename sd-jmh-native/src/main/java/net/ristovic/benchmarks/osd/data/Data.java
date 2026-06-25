package net.ristovic.benchmarks.osd.data;

import java.math.BigDecimal;
import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.time.OffsetDateTime;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.UUID;

import net.ristovic.benchmarks.osd.data.gen.*;
import net.ristovic.benchmarks.osd.data.model.*;

/* Denotes a value type (int, float, etc), or a more complex data type from a string tag:
 *  - int          - random integer
 *  - str[n]       - random string of size n
 *  - recI[n]      - record with n int fields
 *  - recD[n]      - record with n double fields
 *  - recS[n]      - record with n string fields
 *  - arr<T>[n]    - array of size n where elements are determined by tag T
 *      example: arr<str[4]>[16]
 *  - client       - POJO client
 *  - <class>      - POJO class name, either fully-qualified or in the data model package
 *  - map<K,V>[n]  - map of size n where keys are determined by tag T and 
 *                   values are determined by tag V
 *      example: map<str[4],client>[16]
 *      example: map<int,com.example.MyType>[16]
 */
public abstract class Data {

    public static Class<?>[] CLASSES = {
        Object[].class,
        String[].class,
        long[].class,
        UUID.class,
        ArrayList.class,
        HashMap.class,
        BigDecimal.class,
        LocalDate.class,
        LocalDateTime.class,
        OffsetDateTime.class,
        Client.class,
        Client.EyeColor.class,
        Client.Partner.class,
        RecInt.One.class,
        RecInt.Two.class,
        RecInt.Three.class,
        RecInt.Four.class,
        RecInt.Five.class,
        RecInt.Six.class,
        RecInt.Seven.class,
        RecInt.Eight.class,
        RecInt.Nine.class,
        RecInt.Ten.class,
        RecInt.Eleven.class,
        RecInt.Twelve.class,
        RecInt.Thirteen.class,
        RecInt.Fourteen.class,
        RecInt.Fifteen.class,
        RecInt.Sixteen.class,
        RecDbl.One.class,
        RecDbl.Two.class,
        RecDbl.Three.class,
        RecDbl.Four.class,
        RecDbl.Five.class,
        RecDbl.Six.class,
        RecDbl.Seven.class,
        RecDbl.Eight.class,
        RecDbl.Nine.class,
        RecDbl.Ten.class,
        RecDbl.Eleven.class,
        RecDbl.Twelve.class,
        RecDbl.Thirteen.class,
        RecDbl.Fourteen.class,
        RecDbl.Fifteen.class,
        RecDbl.Sixteen.class,
        RecStr.One.class,
        RecStr.Two.class,
        RecStr.Three.class,
        RecStr.Four.class,
        RecStr.Five.class,
        RecStr.Six.class,
        RecStr.Seven.class,
        RecStr.Eight.class,
        RecStr.Nine.class,
        RecStr.Ten.class,
        RecStr.Eleven.class,
        RecStr.Twelve.class,
        RecStr.Thirteen.class,
        RecStr.Fourteen.class,
        RecStr.Fifteen.class,
        RecStr.Sixteen.class,
    };

    private static Random rng;
   
    public static void setRng(Random r) {
        rng = r;
    }
    
    public static void debugPrint(Object obj) {
        if (obj instanceof byte[] arr) {
            System.out.println(Arrays.toString(arr));
        } else {
            System.out.println(obj.getClass().isArray() ? Arrays.toString((Object[]) obj) : obj);
        }
    }

    public static Object createDataObject(String tag) {
        assert rng != null : "RNG not setup";
        Data d = parseTag(tag);
        return d.generateObject(rng);
    } 

    public static Class<?>[] classesForTag(String tag) {
        LinkedHashSet<Class<?>> classes = new LinkedHashSet<>(Arrays.asList(CLASSES));
        parseTag(tag).collectClasses(classes);
        return classes.toArray(Class<?>[]::new);
    }

    public static Data parseTag(String tag) {
        String type = tag.trim();
        if (type.isEmpty()) {
            throw new RuntimeException("empty object type tag");
        }

        int size = parseSizeSpecifier(type);
        if (size >= 0) {
            type = type.substring(0, type.lastIndexOf('['));
        } else {
            size = 0;
        }

        String t = parseTypeSpecifier(type);
        if (t != null) {
            type = type.substring(0, type.indexOf('<'));
        }

        switch (type) {
            case "int":
                return new IntData();
            case "dbl":
                return new DoubleData();
            case "str":
                return new StrData(size);
            case "arr":
                Data arrType = parseTag(t);
                return new ArrData(arrType, size);
            case "lst":
                Data lstType = parseTag(t);
                return new ListData(lstType, size);
            case "map":
                String[] kv = splitMapTypes(t);
                Data k = parseTag(kv[0]);
                Data v = parseTag(kv[1]);
                return new MapData(k, v, size);
            case "recI":
                return new RecIntData(size);
            case "recD":
                return new RecDblData(size);
            case "recS":
                return new RecStrData(size);
            case "client":
                return new ClientData();
            default:
                return new ClassData(resolveClass(type));
        }
    }

    private static String[] splitMapTypes(String typeSpec) {
        int comma = findTopLevelComma(typeSpec);
        if (comma < 0) {
            throw new RuntimeException("map type requires key and value types: " + typeSpec);
        }
        return new String[] {
            typeSpec.substring(0, comma).trim(),
            typeSpec.substring(comma + 1).trim()
        };
    }

    private static int findTopLevelComma(String s) {
        int angleDepth = 0;
        int bracketDepth = 0;
        for (int i = 0; i < s.length(); i++) {
            char ch = s.charAt(i);
            if (ch == '<') {
                angleDepth++;
            } else if (ch == '>') {
                angleDepth--;
            } else if (ch == '[') {
                bracketDepth++;
            } else if (ch == ']') {
                bracketDepth--;
            } else if (ch == ',' && angleDepth == 0 && bracketDepth == 0) {
                return i;
            }
        }
        return -1;
    }

    private static Class<?> resolveClass(String type) {
        try {
            return Class.forName(type);
        } catch (ClassNotFoundException ignored) {
        }

        if (!type.contains(".")) {
            String[] packagePrefixes = {
                "net.ristovic.benchmarks.osd.data.model.",
                "net.ristovic.benchmarks.osd."
            };
            for (String packagePrefix : packagePrefixes) {
                try {
                    return Class.forName(packagePrefix + type);
                } catch (ClassNotFoundException ignored) {
                }
            }
        }

        throw new RuntimeException("unknown object type: " + type);
    }

    void collectClasses(Set<Class<?>> classes) {
    }

    private static int parseSizeSpecifier(String tag) {
        if (tag.endsWith("]")) {
            return asInt(tag.substring(tag.lastIndexOf('[') + 1, tag.length() - 1));
        } else {
            return -1;
        }
    }

    private static String parseTypeSpecifier(String tag) {
        if (tag.endsWith(">")) {
            return tag.substring(tag.indexOf('<') + 1, tag.length() - 1);
        } else {
            return null;
        }
    }

    abstract Object generateObject(Random rng);


    private static final class IntData extends Data {
        public IntData() {} 

        public Integer generateObject(Random rng) {
            return new ValueDataGenerator(rng).randInt();
        }
    }

    private static final class DoubleData extends Data {
        public DoubleData() {} 

        public Double generateObject(Random rng) {
            return new ValueDataGenerator(rng).randDouble();
        }
    }

    private static final class StrData extends Data {
        private int size;

        public StrData(int size) {
            this.size = size;
        }

        public String generateObject(Random rng) {
            return new ValueDataGenerator(rng).randStr(size);
        }
    }

    private static final class RecIntData extends Data {
        private int fields;

        public RecIntData(int fields) {
            this.fields = fields;
        }

        public Object generateObject(Random rng) {
            return RecInt.withNFields(new ValueDataGenerator(rng), fields);
        }
    }

    private static final class RecDblData extends Data {
        private int fields;

        public RecDblData(int fields) {
            this.fields = fields;
        }

        public Object generateObject(Random rng) {
            return RecDbl.withNFields(new ValueDataGenerator(rng), fields);
        }
    }

    private static final class RecStrData extends Data {
        private int fields;

        public RecStrData(int fields) {
            this.fields = fields;
        }

        public Object generateObject(Random rng) {
            return RecStr.withNFields(new ValueDataGenerator(rng), fields);
        }
    }

    private static final class ArrData extends Data {
        private int size;
        private Data element;

        public ArrData(Data element, int size) {
            this.element = element;
            this.size = size;
        }

        public Object generateObject(Random rng) {
            Object[] objArr = new Object[size];
            for (int i = 0; i < objArr.length; i++) {
                objArr[i] = element.generateObject(rng);
            }
            return objArr;
        }

        @Override
        void collectClasses(Set<Class<?>> classes) {
            element.collectClasses(classes);
        }
    }

    private static final class ListData extends Data {
        private int size;
        private Data element;

        public ListData(Data element, int size) {
            this.element = element;
            this.size = size;
        }

        public Object generateObject(Random rng) {
            ArrayList<Object> lst = new ArrayList<>(size);
            for (int i = 0; i < size; i++) {
                lst.add(element.generateObject(rng));
            }
            return lst;
        }

        @Override
        void collectClasses(Set<Class<?>> classes) {
            element.collectClasses(classes);
        }
    }

    private static final class MapData extends Data {
        private int size;
        private Data k;
        private Data v;

        public MapData(Data k, Data v, int size) {
            this.k = k;
            this.v = v;
            this.size = size;
        }

        public Object generateObject(Random rng) {
            HashMap<Object, Object> map = new HashMap<>(size);
            for (int i = 0; i < size; i++) {
                Object key = k.generateObject(rng);
                Object value = v.generateObject(rng);
                map.put(key, value);
            }
            return map;
        }

        @Override
        void collectClasses(Set<Class<?>> classes) {
            k.collectClasses(classes);
            v.collectClasses(classes);
        }
    }

    private static final class ClientData extends Data {
        public ClientData() {}

        public Client generateObject(Random rng) {
            Client client = new Client(); 
            new ClientGenerator(rng).generateFields(client);
            return client; 
        }
    }

    private static final class ClassData extends Data {
        private static final int DEFAULT_STRING_SIZE = 32;
        private static final int DEFAULT_COLLECTION_SIZE = 4;
        private static final int MAX_NESTING_DEPTH = 2;

        private final Class<?> clazz;

        public ClassData(Class<?> clazz) {
            this.clazz = clazz;
        }

        public Object generateObject(Random rng) {
            return generateValue(clazz, rng, MAX_NESTING_DEPTH);
        }

        @Override
        void collectClasses(Set<Class<?>> classes) {
            collectClassGraph(clazz, classes, MAX_NESTING_DEPTH);
        }

        private static Object generateValue(Class<?> valueClass, Random rng, int depth) {
            ValueDataGenerator values = new ValueDataGenerator(rng);

            if (valueClass == String.class) {
                return values.randStr(DEFAULT_STRING_SIZE);
            } else if (valueClass == int.class || valueClass == Integer.class) {
                return values.randInt();
            } else if (valueClass == long.class || valueClass == Long.class) {
                return values.randLong();
            } else if (valueClass == double.class || valueClass == Double.class) {
                return values.randDouble();
            } else if (valueClass == float.class || valueClass == Float.class) {
                return (float) values.randDouble();
            } else if (valueClass == boolean.class || valueClass == Boolean.class) {
                return values.randBool();
            } else if (valueClass == short.class || valueClass == Short.class) {
                return (short) values.randInt(Short.MAX_VALUE + 1);
            } else if (valueClass == byte.class || valueClass == Byte.class) {
                return (byte) values.randInt(Byte.MAX_VALUE + 1);
            } else if (valueClass == char.class || valueClass == Character.class) {
                return values.randStr(1).charAt(0);
            } else if (valueClass == BigDecimal.class) {
                return values.randBigDecimal();
            } else if (valueClass == UUID.class) {
                return values.randUUID();
            } else if (valueClass == LocalDate.class) {
                return LocalDate.of(1900 + values.randInt(110), 1 + values.randInt(12), 1 + values.randInt(28));
            } else if (valueClass == LocalDateTime.class) {
                return LocalDateTime.of(1900 + values.randInt(110), 1 + values.randInt(12), 1 + values.randInt(28),
                    values.randInt(24), values.randInt(60), values.randInt(60), values.randInt(1000000000));
            } else if (valueClass == OffsetDateTime.class) {
                return OffsetDateTime.of(1900 + values.randInt(110), 1 + values.randInt(12), 1 + values.randInt(28),
                    values.randInt(24), values.randInt(60), values.randInt(60), values.randInt(1000000000), ZoneOffset.UTC);
            } else if (valueClass.isEnum()) {
                Object[] constants = valueClass.getEnumConstants();
                return constants.length == 0 ? null : constants[values.randInt(constants.length)];
            } else if (valueClass.isArray()) {
                return generateArray(valueClass.getComponentType(), rng, depth - 1);
            } else if (Collection.class.isAssignableFrom(valueClass)) {
                return new ArrayList<>();
            } else if (Map.class.isAssignableFrom(valueClass)) {
                return new HashMap<>();
            } else if (depth <= 0) {
                return null;
            }

            Object obj = newInstance(valueClass, rng, depth - 1);
            populateFields(obj, rng, depth - 1);
            return obj;
        }

        private static Object generateArray(Class<?> componentClass, Random rng, int depth) {
            Object array = java.lang.reflect.Array.newInstance(componentClass, DEFAULT_COLLECTION_SIZE);
            for (int i = 0; i < DEFAULT_COLLECTION_SIZE; i++) {
                java.lang.reflect.Array.set(array, i, generateValue(componentClass, rng, depth));
            }
            return array;
        }

        private static Object newInstance(Class<?> valueClass, Random rng, int depth) {
            try {
                Constructor<?> ctor = valueClass.getDeclaredConstructor();
                ctor.setAccessible(true);
                return ctor.newInstance();
            } catch (Exception e) {
                return newInstanceWithGeneratedArgs(valueClass, rng, depth, e);
            }
        }

        private static Object newInstanceWithGeneratedArgs(Class<?> valueClass, Random rng, int depth, Exception noArgFailure) {
            Constructor<?>[] constructors = valueClass.getDeclaredConstructors();
            Arrays.sort(constructors, (left, right) -> Integer.compare(left.getParameterCount(), right.getParameterCount()));
            for (Constructor<?> ctor : constructors) {
                try {
                    ctor.setAccessible(true);
                    Class<?>[] paramTypes = ctor.getParameterTypes();
                    Object[] args = new Object[paramTypes.length];
                    for (int i = 0; i < paramTypes.length; i++) {
                        args[i] = paramTypes[i].isPrimitive()
                            ? generateValue(paramTypes[i], rng, depth)
                            : tryGenerateValue(paramTypes[i], rng, depth);
                    }
                    return ctor.newInstance(args);
                } catch (Exception ignored) {
                }
            }
            throw new RuntimeException("cannot instantiate class from workload type tag: " + valueClass.getName(), noArgFailure);
        }

        private static void populateFields(Object obj, Random rng, int depth) {
            Class<?> current = obj.getClass();
            while (current != null && current != Object.class) {
                for (Field field : current.getDeclaredFields()) {
                    int modifiers = field.getModifiers();
                    if (Modifier.isStatic(modifiers) || Modifier.isFinal(modifiers)) {
                        continue;
                    }
                    try {
                        field.setAccessible(true);
                        Object value = generateFieldValue(field, rng, depth);
                        if (value != null || !field.getType().isPrimitive()) {
                            field.set(obj, value);
                        }
                    } catch (Exception e) {
                        throw new RuntimeException("cannot populate field " + field.getName() + " on " + obj.getClass().getName(), e);
                    }
                }
                current = current.getSuperclass();
            }
        }

        private static Object generateFieldValue(Field field, Random rng, int depth) {
            Class<?> fieldClass = field.getType();
            if (Collection.class.isAssignableFrom(fieldClass)) {
                Class<?> elementClass = classArgument(field.getGenericType(), 0, String.class);
                Collection<Object> list = Set.class.isAssignableFrom(fieldClass)
                    ? new LinkedHashSet<>()
                    : new ArrayList<>(DEFAULT_COLLECTION_SIZE);
                for (int i = 0; i < DEFAULT_COLLECTION_SIZE; i++) {
                    list.add(tryGenerateValue(elementClass, rng, depth));
                }
                return list;
            } else if (Map.class.isAssignableFrom(fieldClass)) {
                HashMap<Object, Object> map = new HashMap<>(DEFAULT_COLLECTION_SIZE);
                Class<?> keyClass = classArgument(field.getGenericType(), 0, String.class);
                Class<?> valueClass = classArgument(field.getGenericType(), 1, String.class);
                for (int i = 0; i < DEFAULT_COLLECTION_SIZE; i++) {
                    Object key = tryGenerateValue(keyClass, rng, depth);
                    map.put(key == null ? i : key, tryGenerateValue(valueClass, rng, depth));
                }
                return map;
            }
            return tryGenerateValue(fieldClass, rng, depth);
        }

        private static Object tryGenerateValue(Class<?> valueClass, Random rng, int depth) {
            try {
                return generateValue(valueClass, rng, depth);
            } catch (RuntimeException e) {
                if (valueClass.isPrimitive()) {
                    throw e;
                }
                return null;
            }
        }

        private static Class<?> classArgument(Type type, int index, Class<?> defaultClass) {
            if (!(type instanceof ParameterizedType parameterizedType)) {
                return defaultClass;
            }
            Type[] args = parameterizedType.getActualTypeArguments();
            if (index >= args.length) {
                return defaultClass;
            }
            Type arg = args[index];
            if (arg instanceof Class<?> argClass) {
                return argClass;
            } else if (arg instanceof ParameterizedType argType && argType.getRawType() instanceof Class<?> rawClass) {
                return rawClass;
            }
            return defaultClass;
        }

        private static void collectClassGraph(Class<?> current, Set<Class<?>> classes, int depth) {
            if (!classes.add(current) || depth <= 0 || current.isPrimitive() || current.getName().startsWith("java.")) {
                return;
            }
            for (Field field : current.getDeclaredFields()) {
                int modifiers = field.getModifiers();
                if (Modifier.isStatic(modifiers)) {
                    continue;
                }
                Class<?> fieldClass = field.getType();
                if (fieldClass.isArray()) {
                    fieldClass = fieldClass.getComponentType();
                }
                if (shouldCollect(fieldClass)) {
                    collectClassGraph(fieldClass, classes, depth - 1);
                }
                collectTypeArguments(field.getGenericType(), classes, depth - 1);
            }
        }

        private static void collectTypeArguments(Type type, Set<Class<?>> classes, int depth) {
            if (!(type instanceof ParameterizedType parameterizedType)) {
                return;
            }
            for (Type arg : parameterizedType.getActualTypeArguments()) {
                if (arg instanceof Class<?> argClass && shouldCollect(argClass)) {
                    collectClassGraph(argClass, classes, depth);
                } else if (arg instanceof ParameterizedType argType && argType.getRawType() instanceof Class<?> rawClass && shouldCollect(rawClass)) {
                    collectClassGraph(rawClass, classes, depth);
                }
            }
        }

        private static boolean shouldCollect(Class<?> clazz) {
            return !clazz.isPrimitive() && !clazz.getName().startsWith("java.");
        }
    }

    private static int asInt(String s) {
        return Integer.parseInt(s);
    }

}
