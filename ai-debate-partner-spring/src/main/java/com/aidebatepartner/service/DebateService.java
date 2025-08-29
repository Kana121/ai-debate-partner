package com.aidebatepartner.service;

import com.aidebatepartner.model.DebateMessage;

import java.util.concurrent.CompletableFuture;

public interface DebateService {
    CompletableFuture<DebateMessage> analyzeAudio(byte[] audioData);
    DebateMessage analyzeText(String text);
}
