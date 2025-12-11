package net.ristovic.tests.correctness.pojo;

public class Order {
    private Long orderId;
    private Long userId;
    private String status;

    public Order() {}
    public Order(Long orderId, Long userId, String status) {
        this.orderId = orderId;
        this.userId = userId;
        this.status = status;
    }
    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
