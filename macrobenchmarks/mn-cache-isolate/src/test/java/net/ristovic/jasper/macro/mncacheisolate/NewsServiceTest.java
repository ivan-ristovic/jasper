/*
 * Copyright 2017-2024 original authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package net.ristovic.jasper.macro.mncacheisolate;

import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.junit.jupiter.api.Timeout;

import jakarta.inject.Inject;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;

@TestMethodOrder(MethodOrderer.OrderAnnotation.class) // <1>
@MicronautTest(startApplication = false) // <2>
class NewsServiceTest {

    private static final int HEADLINE_COUNT = 4110;

    @Inject // <3>
    NewsService newsService;

    @Timeout(4) // <4>
    @Test
    @Order(1) // <5>
    public void firstInvocationOfNovemberDoesNotHitCache() {
        List<String> headlines = newsService.headlines(11);
        assertEquals(HEADLINE_COUNT, headlines.size());
    }

    @Timeout(1) // <4>
    @Test
    @Order(2) // <5>
    public void secondInvocationOfNovemberHitsCache() {
        List<String> headlines = newsService.headlines(11);
        assertEquals(HEADLINE_COUNT, headlines.size());
    }

    @Timeout(4) // <4>
    @Test
    @Order(3) // <5>
    public void firstInvocationOfOctoberDoesNotHitCache() {
        List<String> headlines = newsService.headlines(10);
        assertEquals(HEADLINE_COUNT, headlines.size());
    }

    @Timeout(1) // <4>
    @Test
    @Order(4) // <5>
    public void secondInvocationOfOctoberHitsCache() {
        List<String> headlines = newsService.headlines(10);
        assertEquals(HEADLINE_COUNT, headlines.size());
    }

    @Timeout(1) // <4>
    @Test
    @Order(5) // <5>
    public void addingAHeadlineToNovemberUpdatesCache() {
        List<String> headlines = newsService.addHeadline(11, "Micronaut 1.3 Milestone 1 Released");
        assertEquals(HEADLINE_COUNT + 1, headlines.size());
    }

    @Timeout(1) // <4>
    @Test
    @Order(6) // <5>
    public void novemberCacheWasUpdatedByCachePutAndThusTheValueIsRetrievedFromTheCache() {
        List<String> headlines = newsService.headlines(11);
        assertEquals(HEADLINE_COUNT + 1, headlines.size());
    }

    @Timeout(1) // <4>
    @Test
    @Order(7) // <5>
    public void invalidateNovemberCacheWithCacheInvalidate() {
        assertDoesNotThrow(() -> {
            newsService.removeHeadline(11, "Micronaut 1.3 Milestone 1 Released");
        });
    }

    @Timeout(1) // <4>
    @Test
    @Order(8) // <5>
    public void octoberCacheIsStillValid() {
        List<String> headlines = newsService.headlines(10);
        assertEquals(HEADLINE_COUNT, headlines.size());
    }

    @Timeout(4) // <4>
    @Test
    @Order(9) // <5>
    public void novemberCacheWasInvalidated() {
        List<String> headlines = newsService.headlines(11);
        assertEquals(HEADLINE_COUNT, headlines.size());
    }
}
