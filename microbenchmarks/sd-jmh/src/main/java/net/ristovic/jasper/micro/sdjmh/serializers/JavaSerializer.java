package net.ristovic.jasper.micro.sdjmh.serializers;

import java.io.*;

class JavaSerializer implements Serializer {

    private ObjectOutputStream oos;
    private ByteArrayOutputStream baos;

    public JavaSerializer() throws IOException {
        baos = new ByteArrayOutputStream();
        oos = new ObjectOutputStream(baos);
    }
    
    @Override
    public Object serialize(Object obj) throws IOException {
        oos.reset();
        oos.writeObject(obj);
        return oos;
    }

    @Override
    public Object preDeserialize(Class<?> clazz, Object data) throws Exception  {
        oos.flush();
        var bytes = baos.toByteArray();
        return new ObjectInputStream(new ByteArrayInputStream(bytes));
    }

    @Override
    public Object deserialize(Class<?> clazz, Object data) throws Exception  {
        ObjectInputStream is = (ObjectInputStream) data;
        Object obj = is.readObject();
        return obj;
    }

    @Override
    public long sizeOf(Object obj) throws IOException {
        serialize(obj);
        oos.flush();
        return baos.size();
    }

    @Override
    public void flush() throws IOException {
        oos.flush();
        oos.close();
    }

}
