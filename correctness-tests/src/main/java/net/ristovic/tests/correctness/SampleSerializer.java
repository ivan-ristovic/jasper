package net.ristovic.tests.correctness;

class SampleSerializer implements Serializer {

    public SampleSerializer() {
    }
    
    @Override
    public Object preSerialize(Object obj) throws Exception {
        return obj;
    }

    @Override
    public Object serialize(Object obj) throws Exception {
        return obj;
    }

    @Override
    public Object preDeserialize(Class<?> clazz, Object data) throws Exception {
        return data;
    }

    @Override
    public Object deserialize(Class<?> clazz, Object data) throws Exception {
        return data;
    }

    @Override
    public long sizeOf(Object obj) {
        return 0;
    }
}

