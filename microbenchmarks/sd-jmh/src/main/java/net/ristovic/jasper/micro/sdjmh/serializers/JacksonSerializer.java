package net.ristovic.jasper.micro.sdjmh.serializers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

class JacksonSerializer implements Serializer {

    private final ObjectMapper mapper;

    public JacksonSerializer() {
        mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false);
    }

    @Override
    public Object serialize(Object obj) throws Exception {
        return mapper.writeValueAsString(obj);
    }

    @Override
    public Object deserialize(Class<?> clazz, Object data) throws Exception {
        return mapper.readValue((String) data, clazz);
    }

}
