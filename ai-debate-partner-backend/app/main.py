from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, status, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.routing import APIRouter
from typing import List, Optional, Dict, Any, Union
import os
import uuid
import json
import asyncio
import base64
import wave
import io
import numpy as np
from datetime import datetime, timedelta
import speech_recognition as sr
from speech_recognition import UnknownValueError, RequestError
from scipy.io import wavfile
import nltk
from nltk.tokenize import sent_tokenize
import openai
from openai import OpenAI
import logging

# Import our fixed settings and services
from .core.config import settings
from .services.ai_analyzer import AIAnalyzer

# Configure logging
logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL))
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title=settings.PROJECT_NAME)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.client_data: Dict[str, Dict[str, Any]] = {}
        self.recognizer = sr.Recognizer()

    async def connect(self, client_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.client_data[client_id] = {
            "transcript": "",
            "last_activity": datetime.utcnow(),
            "audio_chunks": []
        }
        logger.info(f"Client {client_id} connected")

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        if client_id in self.client_data:
            del self.client_data[client_id]
        logger.info(f"Client {client_id} disconnected")

manager = ConnectionManager()

# WebSocket endpoint for audio streaming and analysis
@app.websocket("/ws/debate/{session_id}")
async def debate_websocket(websocket: WebSocket, session_id: str):
    await websocket.accept()
    logger.info(f"New debate session started: {session_id}")
    
    try:
        # Send initial connection acknowledgment
        await websocket.send_json({
            "type": "connection_ack",
            "message": "Connected to debate analysis service",
            "session_id": session_id,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        while True:
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                message_type = message.get("type")
                
                if message_type == "audio_chunk":
                    # Process audio chunk
                    audio_data = base64.b64decode(message["data"].split(",")[1])
                    audio_duration = message.get("duration_seconds")  # Duration of the audio chunk in seconds
                    
                    # For now, we'll just log that we received audio
                    # In a real implementation, we would process the audio here
                    logger.debug(f"Received audio chunk of {len(audio_data)} bytes")
                    
                elif message_type == "transcript":
                    # Process transcript
                    transcript = message.get("text", "")
                    audio_duration = message.get("duration_seconds")
                    
                    if transcript.strip():
                        # Analyze the speech
                        analysis = await ai_analyzer.analyze_speech(
                            text=transcript,
                            audio_duration=audio_duration
                        )
                        
                        # Send analysis back to client
                        await websocket.send_json({
                            "type": "analysis_update",
                            "transcript": transcript,
                            "metrics": analysis.get("metrics", {}),
                            "feedback": analysis.get("feedback", {})
                        })
                        try:
                            # Use speech recognition
                            audio_file.seek(0)
                            with sr.AudioFile(audio_file) as source:
                                audio = manager.recognizer.record(source)
                                text = manager.recognizer.recognize_google(audio)
                                
                                # Update transcript
                                manager.client_data[client_id]["transcript"] += " " + text
                                
                                # Send transcript update to client
                                await websocket.send_json({
                                    "type": "transcript_update",
                                    "transcript": text,
                                    "full_transcript": manager.client_data[client_id]["transcript"]
                                })
                                
                        except sr.UnknownValueError:
                            logger.warning("Speech Recognition could not understand audio")
                        except sr.RequestError as e:
                            logger.error(f"Could not request results from Google Speech Recognition service; {e}")
                        except Exception as e:
                            logger.error(f"Error processing audio: {e}")
                
                elif message.get("type") == "connection_init":
                    await websocket.send_json({
                        "type": "connection_ack",
                        "message": "Connection established",
                        "timestamp": datetime.utcnow().isoformat()
                    })
                    
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON received from client {client_id}")
                await websocket.send_json({
                    "type": "error",
                    "message": "Invalid JSON format"
                })
            except Exception as e:
                logger.error(f"Error processing message: {e}")
                await websocket.send_json({
                    "type": "error",
                    "message": str(e)
                })

    except WebSocketDisconnect:
        manager.disconnect(client_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(client_id)

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "AI Debate Partner API is running",
        "docs": "/docs"
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
