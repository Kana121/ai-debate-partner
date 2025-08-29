package com.aidebatepartner.model;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class DebateMetrics {
    private int wordCount;
    private int uniqueWords;
    private double avgWordLength;
    private int sentenceCount;
    private int fillerWordCount;
    private double vocabularyRichness;
    private int grammarErrors;
    private int hesitationCount;
    private double speakingRate; // words per second
    private double pauseFrequency; // pauses per minute
    private LocalDateTime timestamp;
    private String transcript;
}
