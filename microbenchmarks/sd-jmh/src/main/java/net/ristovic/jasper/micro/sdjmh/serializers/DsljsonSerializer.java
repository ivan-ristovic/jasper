package net.ristovic.jasper.micro.sdjmh.serializers;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

import com.dslplatform.json.*;
import com.dslplatform.json.runtime.Settings;

class DsljsonSerializer implements Serializer {

    private final int BUF_SIZE = 1024 * 1024;

    private final DslJson<Object> dslJson;
    private final ByteArrayOutputStream out;

    public DsljsonSerializer() {
        dslJson = new DslJson<>(Settings.basicSetup());
        out = new ByteArrayOutputStream(BUF_SIZE);
    }

    @Override
    public Object serialize(Object obj) throws Exception {
        out.reset();
        dslJson.serialize(obj, out);
        return out;
    }

    @Override
    public Object preDeserialize(Class<?> clazz, Object data) throws Exception  {
        out.flush();
        var bytes = out.toByteArray();
        return new ByteArrayInputStream(bytes);
    }

    @Override
    public Object deserialize(Class<?> clazz, Object data) throws Exception  {
        ByteArrayInputStream is = (ByteArrayInputStream) data;
        Object obj = dslJson.deserialize(clazz, is);
        return obj;
    }

    @Override
    public long sizeOf(Object obj) throws Exception {
        serialize(obj);
        out.flush();
        return out.size();
    } 

    @Override
    public void flush() throws IOException {
        out.flush();
        out.close();
    }
}
