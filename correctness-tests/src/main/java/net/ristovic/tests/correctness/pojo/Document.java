package net.ristovic.tests.correctness.pojo;

public class Document {
    private Long docId;
    private String title;
    private String type;

    public Document() {}

    public Document(Long docId, String title, String type) {
        this.docId = docId;
        this.title = title;
        this.type = type;
    }

    public Long getDocId() { return docId; }
    public void setDocId(Long docId) { this.docId = docId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
}
