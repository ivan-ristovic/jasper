package net.ristovic.jasper.macro.mncacheisolate;

import io.micronaut.serde.annotation.Serdeable;

import java.util.List;

@Serdeable
public class News {
    private Integer month;

    private List<String> headlines;

    public News() {

    }

    public News(Integer month, List<String> headlines) {
        this.month = month;
        this.headlines = headlines;
    }

    public Integer getMonth() {
        return month;
    }

    public void setMonth(Integer month) {
        this.month = month;
    }

    public List<String> getHeadlines() {
        return headlines;
    }

    public void setHeadlines(List<String> headlines) {
        this.headlines = headlines;
    }
}
