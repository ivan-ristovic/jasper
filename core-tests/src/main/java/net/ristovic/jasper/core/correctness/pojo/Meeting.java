package net.ristovic.jasper.core.correctness.pojo;

import java.time.OffsetDateTime;

public class Meeting {
    private Long meetingId;
    private String topic;
    private OffsetDateTime scheduledTime;

    public Meeting() {}

    public Meeting(Long meetingId, String topic, OffsetDateTime scheduledTime) {
        this.meetingId = meetingId;
        this.topic = topic;
        this.scheduledTime = scheduledTime;
    }

    public Long getMeetingId() { return meetingId; }
    public void setMeetingId(Long meetingId) { this.meetingId = meetingId; }

    public String getTopic() { return topic; }
    public void setTopic(String topic) { this.topic = topic; }

    public OffsetDateTime getScheduledTime() { return scheduledTime; }
    public void setScheduledTime(OffsetDateTime scheduledTime) { this.scheduledTime = scheduledTime; }
}
