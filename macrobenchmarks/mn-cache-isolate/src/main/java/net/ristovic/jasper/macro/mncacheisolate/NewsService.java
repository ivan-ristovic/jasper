package net.ristovic.jasper.macro.mncacheisolate;

import io.micronaut.cache.annotation.CacheConfig;
import io.micronaut.cache.annotation.CacheInvalidate;
import io.micronaut.cache.annotation.CachePut;
import io.micronaut.cache.annotation.Cacheable;

import jakarta.inject.Singleton;
import java.time.Month;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Singleton
@CacheConfig("headlines")
public class NewsService {

    @Cacheable
    public List<String> headlines(Integer month) {
        return Headlines.instance().get(month);
    }

    @CachePut(parameters = {"month"})
    public List<String> addHeadline(Integer month, String headline) {
        Headlines.instance().put(month, headline);
        return Headlines.instance().get(month);
    }

    @CacheInvalidate(parameters = {"month"})
    public void removeHeadline(Integer month, String headline) {
        var l = Headlines.instance().get(month);
        l.remove(headline);
        Headlines.instance().replace(month, l);
    }
}
