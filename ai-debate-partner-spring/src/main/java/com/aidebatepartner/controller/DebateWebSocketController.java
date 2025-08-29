package com.aidebatepartner.controller;

import com.aidebatepartner.model.DebateMessage;
import com.aidebatepartner.service.DebateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Slf4j
@Controller
@RequiredArgsConstructor
public class DebateWebSocketController {

    private final SimpMessagingTemplate messagingTemplate;
    private final DebateService debateService;

    @MessageMapping("/debate/audio")
    public void handleAudioMessage(@Payload byte[] audioData) {
        try {
            // Process audio data and get analysis
            DebateMessage analysis = debateService.analyzeAudio(audioData);
            
            // Send analysis back to the client
            messagingTemplate.convertAndSend("/topic/analysis", analysis);
            
        } catch (Exception e) {
            log.error("Error processing audio message: {}", e.getMessage(), e);
        }
    }

    @MessageMapping("/debate/text")
    public void handleTextMessage(@Payload String message) {
        try {
            // Process text message and get analysis
            DebateMessage analysis = debateService.analyzeText(message);
            
            // Send analysis back to the client
            messagingTemplate.convertAndSend("/topic/analysis", analysis);
            
        } catch (Exception e) {
            log.error("Error processing text message: {}", e.getMessage(), e);
        }
    }
}
