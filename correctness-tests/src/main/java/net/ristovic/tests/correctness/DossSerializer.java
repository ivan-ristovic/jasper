package net.ristovic.tests.correctness;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import org.graalvm.nativeimage.ObjectSnapshots;
import org.graalvm.nativeimage.ObjectSnapshots.ObjectSnapshot;
import org.graalvm.nativeimage.ObjectSnapshots.ObjectSnapshotProvider;
import org.graalvm.nativeimage.ObjectSnapshots.ObjectSnapshotRegion;
import org.graalvm.nativeimage.ObjectSnapshots.ObjectSnapshotSlot;

class DossSerializer implements Serializer {

    private final ObjectSnapshotProvider provider;
    private final ObjectSnapshotSlot slot;
    private final Path snapshotPath;

    public DossSerializer() {
        provider = ObjectSnapshots.provider();
        slot = ObjectSnapshots.snapshotRegion().getSlot(0);
        try {
            snapshotPath = Files.createTempFile("ni-oss-", ".snapshot");
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }
    
    @Override
    public Object preSerialize(Object obj) throws Exception {
        System.gc();
        return obj;
    }

    @Override
    public Object serialize(Object obj) throws Exception {
        ObjectSnapshot s = provider.createObjectSnapshot(obj, slot);
        return s.get();
    }

    @Override
    public Object preDeserialize(Class<?> clazz, Object data) throws Exception {
        provider.store(slot, snapshotPath);
        provider.unload(slot);
        return snapshotPath;
    }

    @Override
    public Object deserialize(Class<?> clazz, Object data) throws Exception {
        ObjectSnapshot s = provider.load(snapshotPath, slot);
        return s.get();
    }

    @Override
    public long sizeOf(Object obj) {
        ObjectSnapshot s = provider.createObjectSnapshot(obj, slot);
        return s.getSizeInBytes().rawValue();
    }
}

