package com.aidebatepartner.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DebateMessage {
    private String sessionId;
    private String messageType; // "AUDIO" or "TEXT"
    private String content;
    private DebateMetrics metrics;
    private String speakerId;
    private LocalDateTime timestamp;
}
