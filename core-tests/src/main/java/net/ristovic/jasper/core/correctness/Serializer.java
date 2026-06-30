package net.ristovic.jasper.core.correctness;

public interface Serializer {
    
    /**
     * Register types for serialization
     */
    default void register(Class<?>[] classes) throws Exception {
    }

    /**
     * Prepare for serialization
     */
    default Object preSerialize(Object obj) throws Exception {
        return obj;
    }

    /**
     * Serialize an object, returning JSON representation or stream
     */
    default Object serialize(Object obj) throws Exception {
        return obj;
    }
   
    /**
     * Prepare for deserialization
     */
    default Object preDeserialize(Class<?> clazz, Object data) throws Exception {
        return data;
    }

    /**
     * Deserialize an object of type clazz, from JSON representation or stream
     */
    default Object deserialize(Class<?> clazz, Object data) throws Exception {
        return data;
    }

    /**
     * Perform cleanup - e.g., flush and close streams
     */
    default void flush() throws Exception {
    }

    /**
     * Return serialized object size 
     */
    default long sizeOf(Object obj) throws Exception {
        return serialize(obj).toString().length();
    }

}

