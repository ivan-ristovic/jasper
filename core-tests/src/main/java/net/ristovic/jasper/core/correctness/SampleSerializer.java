package net.ristovic.jasper.core.correctness;

import java.io.FileDescriptor;
import java.lang.ref.Cleaner;
import java.util.zip.ZipFile;

class SampleSerializer implements Serializer {

    public SampleSerializer() {
    }
    
    @Override
    public Object preSerialize(Object obj) throws Exception {
        return obj;
    }

    @Override
    public Object serialize(Object obj) throws Exception {
        if (obj instanceof Thread || obj instanceof FileDescriptor || obj instanceof Cleaner || obj instanceof ZipFile) {
            throw new RuntimeException("unsupported type: " + obj.getClass().getName());
        }
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
