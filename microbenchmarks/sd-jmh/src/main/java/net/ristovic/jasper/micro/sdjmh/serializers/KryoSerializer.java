package net.ristovic.jasper.micro.sdjmh.serializers;

import com.esotericsoftware.kryo.Kryo;
import com.esotericsoftware.kryo.io.Input;
import com.esotericsoftware.kryo.io.Output;

import java.io.OutputStream;
import java.io.ByteArrayOutputStream;

class KryoSerializer implements Serializer {

    private final int BUF_SIZE = 1024 * 1024;

    private final Kryo kryo;
    private final Output output;

    public KryoSerializer() {
        this(false);
    }

    public KryoSerializer(boolean references) {
        kryo = new Kryo();
        output = new Output(BUF_SIZE);
        kryo.setReferences(references);
    }

    @Override
    public void register(Class<?>[] classes) {
        for (Class<?> clazz : classes) {
            kryo.register(clazz);
        }
    }

    @Override
    public Object serialize(Object obj) {
        output.reset();
        kryo.writeObject(output, obj);
        // return output.toBytes();
        return output.getBuffer();
    }
    
    @Override
    public Object preDeserialize(Class<?> clazz, Object data) throws Exception  {
        output.flush();
        return new Input(output.toBytes());
    }

    @Override
    public Object deserialize(Class<?> clazz, Object data) throws Exception  {
        Input input = (Input) data;
        Object obj = kryo.readObject(input, clazz);
        input.reset();
        return obj;
    }

    @Override
    public long sizeOf(Object obj) {
        serialize(obj);
        output.flush();
        return output.total();
    }

    @Override
    public void flush() {
        output.flush();
        output.close();
    }

}
