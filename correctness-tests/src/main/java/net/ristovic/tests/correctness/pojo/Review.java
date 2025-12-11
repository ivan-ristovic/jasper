package net.ristovic.tests.correctness.pojo;

public class Review {
    private Long reviewId;
    private Long productId;
    private String comment;

    public Review() {}
    public Review(Long reviewId, Long productId, String comment) {
        this.reviewId = reviewId;
        this.productId = productId;
        this.comment = comment;
    }
    public Long getReviewId() { return reviewId; }
    public void setReviewId(Long reviewId) { this.reviewId = reviewId; }
    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }
    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }
}
