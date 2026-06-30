package net.ristovic.jasper.core.correctness.pojo;

public class Notification {
    private Long notificationId;
    private String message;
    private boolean read;

    public Notification() {}

    public Notification(Long notificationId, String message, boolean read) {
        this.notificationId = notificationId;
        this.message = message;
        this.read = read;
    }

    public Long getNotificationId() { return notificationId; }
    public void setNotificationId(Long notificationId) { this.notificationId = notificationId; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public boolean isRead() { return read; }
    public void setRead(boolean read) { this.read = read; }
}
