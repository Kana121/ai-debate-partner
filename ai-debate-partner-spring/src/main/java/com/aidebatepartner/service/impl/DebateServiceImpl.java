package com.aidebatepartner.service.impl;

import com.aidebatepartner.model.DebateMessage;
import com.aidebatepartner.model.DebateMetrics;
import com.aidebatepartner.service.DebateService;
import com.theokanning.openai.completion.chat.ChatCompletionRequest;
import com.theokanning.openai.completion.chat.ChatMessage;
import com.theokanning.openai.service.OpenAiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class DebateServiceImpl implements DebateService {

    private static final Set<String> FILLER_WORDS = new HashSet<>(Arrays.asList(
            "uh", "um", "er", "ah", "like", "you know", "i mean", "so", "well", "basically",
            "actually", "literally", "honestly", "right", "okay", "ok", "anyway", "anyways"
    ));
    
    private static final Pattern HESITATION_PATTERN = Pattern.compile("\\b(uh+|um+|er+|ah+)\\b", Pattern.CASE_INSENSITIVE);
    private static final double IDEAL_WORDS_PER_MINUTE = 150.0; // For speaking rate calculation
    
    @Value("${openai.api.model:gpt-4}")
    private String openAiModel;
    
    private final OpenAiService openAiService;

    @Override
    @Async
    public CompletableFuture<DebateMessage> analyzeAudio(byte[] audioData) {
        try {
            // In a real implementation, integrate with a speech-to-text service
            // For now, we'll simulate a delay for audio processing
            Thread.sleep(1000); // Simulate processing time
            String text = convertAudioToText(audioData);
            return CompletableFuture.completedFuture(analyzeText(text));
        } catch (Exception e) {
            log.error("Error processing audio: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to process audio", e);
        }
    }

    @Override
    public DebateMessage analyzeText(String text) {
        if (text == null || text.trim().isEmpty()) {
            throw new IllegalArgumentException("Text cannot be empty");
        }
        
        DebateMetrics metrics = new DebateMetrics();
        String processedText = preprocessText(text);
        
        // Basic text analysis
        String[] words = processedText.split("\\s+");
        String[] sentences = processedText.split("[.!?]+");
        
        // Calculate metrics
        metrics.setWordCount(words.length);
        metrics.setSentenceCount(sentences.length > 0 ? sentences.length : 1); // Avoid division by zero
        metrics.setAvgWordLength(calculateAverageWordLength(words));
        metrics.setFillerWordCount(countFillerWords(processedText));
        metrics.setHesitationCount(countHesitations(processedText));
        metrics.setVocabularyRichness(calculateVocabularyRichness(words));
        metrics.setSpeakingRate(calculateSpeakingRate(words, 60)); // Assuming 60 seconds of speaking time
        metrics.setPauseFrequency(calculatePauseFrequency(processedText));
        metrics.setTimestamp(LocalDateTime.now());
        metrics.setTranscript(text);
        
        // Enhanced analysis using OpenAI
        enhanceWithAIAnalysis(metrics, text);
        
        return DebateMessage.builder()
                .messageType("TEXT")
                .content(text)
                .metrics(metrics)
                .timestamp(LocalDateTime.now())
                .build();
    }
    
    private String preprocessText(String text) {
        // Remove extra whitespace and normalize text
        return text.replaceAll("\\s+", " ").trim();
    }
    
    private int countHesitations(String text) {
        Matcher matcher = HESITATION_PATTERN.matcher(text.toLowerCase());
        int count = 0;
        while (matcher.find()) {
            count++;
        }
        return count;
    }
    
    private double calculateSpeakingRate(String[] words, int seconds) {
        if (seconds <= 0) return 0;
        return (double) words.length / seconds * 60; // Words per minute
    }
    
    private double calculatePauseFrequency(String text) {
        // Count pauses based on punctuation and filler words
        int pauseCount = text.split("[,;:—\\.!?]").length - 1;
        pauseCount += countFillerWords(text);
        return (double) pauseCount / (text.length() / 1000.0); // Pauses per second
    }
    
    private void enhanceWithAIAnalysis(DebateMetrics metrics, String text) {
        try {
            // Prepare the prompt for AI analysis
            String prompt = String.format("""
                Analyze the following debate transcript and provide feedback on the following metrics:
                - Clarity of arguments (1-10)
                - Logical flow (1-10)
                - Use of evidence (1-10)
                - Persuasiveness (1-10)
                - Areas for improvement
                
                Transcript: %s
                
                Please provide the response in JSON format with these fields:
                {
                    "clarity": number,
                    "logical_flow": number,
                    "evidence_use": number,
                    "persuasiveness": number,
                    "improvement_suggestions": string[]
                }
                """, text);
            
            // Call OpenAI API
            ChatCompletionRequest request = ChatCompletionRequest.builder()
                .model(openAiModel)
                .messages(Collections.singletonList(new ChatMessage("user", prompt)))
                .temperature(0.7)
                .maxTokens(500)
                .build();
            
            // Parse and process the response
            // Note: In a real implementation, you would parse the JSON response
            // and update the metrics accordingly
            
        } catch (Exception e) {
            log.warn("Failed to enhance analysis with AI: {}", e.getMessage());
        }
    }
    
    private String convertAudioToText(byte[] audioData) {
        // In a real implementation, integrate with a speech-to-text service like:
        // - Google Cloud Speech-to-Text
        // - AWS Transcribe
        // - Mozilla DeepSpeech
        // - AssemblyAI
        // - Or any other STT service
        
        // For now, return a placeholder
        return "This is a sample transcript from the audio input. In a real implementation, " +
               "this would be the actual transcribed text from the audio data.";
    }
    
    private double calculateAverageWordLength(String[] words) {
        if (words.length == 0) return 0;
        int totalLength = 0;
        for (String word : words) {
            totalLength += word.length();
        }
        return (double) totalLength / words.length;
    }
    
    private int countFillerWords(String text) {
        int count = 0;
        String lowerText = text.toLowerCase();
        for (String filler : FILLER_WORDS) {
            int index = lowerText.indexOf(filler);
            while (index != -1) {
                count++;
                index = lowerText.indexOf(filler, index + 1);
            }
        }
        return count;
    }
    
    private double calculateVocabularyRichness(String[] words) {
        if (words.length == 0) return 0;
        Set<String> uniqueWords = new HashSet<>(Arrays.asList(words));
        return (double) uniqueWords.size() / words.length;
    }
}
