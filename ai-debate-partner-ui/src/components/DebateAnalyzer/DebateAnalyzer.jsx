import React, { useState, useRef, useEffect, memo } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Chip,
  Grid,
  LinearProgress,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
} from '@mui/material';
import {
  Mic as MicIcon,
  Stop as StopIcon,
  VolumeUp as VolumeUpIcon,
  SentimentSatisfied as SentimentSatisfiedIcon,
  Speed as SpeedIcon,
  Gavel as GavelIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

// Helper component for metric display
const MetricCard = memo(({ title, value, icon: Icon, color = 'primary', max = 10 }) => {
  const isPercentage = typeof value === 'number' && value <= 1;
  const displayValue = isPercentage ? `${Math.round(value * 100)}%` : value;

  return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={1}>
            <Icon color={color} sx={{ mr: 1 }} />
            <Typography variant="h6" component="div">
              {title}
            </Typography>
          </Box>
          <Box display="flex" alignItems="center">
            <Typography variant="h4" component="div" sx={{ flexGrow: 1 }}>
              {displayValue}
            </Typography>
            {typeof value === 'number' && max && (
                <Box width="60%" ml={2}>
                  <LinearProgress
                      variant="determinate"
                      value={isPercentage ? value * 100 : (value / max) * 100}
                      color={color}
                      sx={{ height: 10, borderRadius: 5 }}
                  />
                </Box>
            )}
          </Box>
        </CardContent>
      </Card>
  );
});

// Helper component for feedback items
const FeedbackItem = memo(({ type, text }) => {
  const [expanded, setExpanded] = useState(false);

  const getIcon = () => {
    switch (type) {
      case 'strength':
        return <CheckCircleIcon color="success" />;
      case 'improvement':
        return <WarningIcon color="warning" />;
      case 'suggestion':
        return <InfoIcon color="info" />;
      default:
        return <InfoIcon color="primary" />;
    }
  };

  return (
      <>
        <ListItem
            button
            onClick={() => setExpanded(!expanded)}
            sx={{
              borderLeft: `4px solid ${
                  type === 'strength' ? '#4caf50' : type === 'improvement' ? '#ff9800' : '#2196f3'
              }`,
              mb: 1,
              borderRadius: 1,
            }}
        >
          <ListItemIcon>{getIcon()}</ListItemIcon>
          <ListItemText
              primary={text}
              primaryTypographyProps={{
                variant: 'body2',
                style: {
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                },
              }}
          />
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </ListItem>
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Box px={4} py={2}>
            <Typography variant="body2" color="text.secondary">
              {text}
            </Typography>
          </Box>
        </Collapse>
      </>
  );
});

const DebateAnalyzer = () => {
  // State
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId] = useState(`session-${Date.now()}`);
  const [transcript, setTranscript] = useState('');
  const [analysis, setAnalysis] = useState({
    metrics: {
      word_count: 0,
      unique_words: 0,
      vocabulary_richness: 0,
      avg_word_length: 0,
      sentence_count: 0,
      filler_word_count: 0,
      grammar_errors: 0,
      hesitation_count: 0,
      speaking_rate: 0,
      overall_score: 0,
    },
    feedback: {
      strengths: [],
      areas_for_improvement: [],
      specific_feedback: {},
      suggestions: [],
    },
    session_summary: null,
  });
  const [volumeLevel, setVolumeLevel] = useState(0);

  // Refs
  const mediaRecorderRef = useRef(null);
  const wsRef = useRef(null);
  const sessionStartTimeRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  // WebSocket connection
  useEffect(() => {
    if (!isRecording) return;

    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    let reconnectTimeout;
    let pingInterval;

    const connectWebSocket = () => {
      try {
        const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/ws/debate/${sessionId}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          reconnectAttempts = 0;
          setError(null);
          pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping' }));
            }
          }, 30000);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            switch (data.type) {
              case 'analysis_update':
                setAnalysis((prev) => ({
                  ...prev,
                  metrics: { ...prev.metrics, ...data.metrics },
                  feedback: { ...prev.feedback, ...data.feedback },
                }));
                setIsAnalyzing(false);
                break;
              case 'session_summary':
                setAnalysis((prev) => ({ ...prev, session_summary: data }));
                break;
              case 'error':
                setError({ severity: 'error', message: data.message });
                setIsAnalyzing(false);
                break;
              case 'pong':
                break;
              default:
                console.warn('Unhandled message type:', data.type);
            }
          } catch (err) {
            setError({ severity: 'error', message: 'Error processing server response' });
          }
        };

        ws.onerror = () => {
          setError({ severity: 'warning', message: 'Connection error. Attempting to reconnect...' });
        };

        ws.onclose = (event) => {
          if (pingInterval) clearInterval(pingInterval);
          if (isRecording && event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
            const delay = Math.min(1000 * 2 ** reconnectAttempts, 30000);
            reconnectTimeout = setTimeout(() => {
              reconnectAttempts++;
              connectWebSocket();
            }, delay);
          } else {
            setError({ severity: 'error', message: 'Connection lost. Please try again.' });
          }
        };

        wsRef.current = ws;
      } catch (err) {
        setError({ severity: 'error', message: 'Failed to connect to analysis service' });
      }
    };

    connectWebSocket();

    return () => {
      if (pingInterval) clearInterval(pingInterval);
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [isRecording, sessionId]);

  // Volume visualization
  useEffect(() => {
    if (!isRecording || !analyserRef.current) return;

    const updateVolume = () => {
      if (!analyserRef.current) return;
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
      setVolumeLevel(Math.min(100, Math.round((avg / 255) * 100)));
      if (isRecording) {
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      }
    };

    updateVolume();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isRecording]);

  // Start recording
  const startRecording = async () => {
    try {
      setError(null);
      setTranscript('');
      setAnalysis({
        metrics: {
          word_count: 0,
          unique_words: 0,
          vocabulary_richness: 0,
          avg_word_length: 0,
          sentence_count: 0,
          filler_word_count: 0,
          grammar_errors: 0,
          hesitation_count: 0,
          speaking_rate: 0,
          overall_score: 0,
        },
        feedback: {
          strengths: [],
          areas_for_improvement: [],
          specific_feedback: {},
          suggestions: [],
        },
        session_summary: null,
      });

      audioChunksRef.current = [];
      sessionStartTimeRef.current = Date.now();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          sampleSize: 16,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000,
      });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 16000,
      });

      let audioChunks = [];
      let lastProcessTime = 0;
      const MIN_PROCESS_INTERVAL = 2000;

      mediaRecorderRef.current.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
          const now = Date.now();
          if (now - lastProcessTime >= MIN_PROCESS_INTERVAL && wsRef.current?.readyState === WebSocket.OPEN) {
            lastProcessTime = now;
            setIsAnalyzing(true);
            try {
              const audioBlob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });
              audioChunks = [];
              const arrayBuffer = await audioBlob.arrayBuffer();
              const base64String = btoa(
                  new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
              );
              const duration = (now - (lastProcessTime - MIN_PROCESS_INTERVAL)) / 1000;

              wsRef.current.send(
                  JSON.stringify({
                    type: 'audio_chunk',
                    data: `data:audio/webm;codecs=opus;base64,${base64String}`,
                    duration_seconds: duration,
                  })
              );

              if (transcript) {
                wsRef.current.send(
                    JSON.stringify({
                      type: 'transcript',
                      text: transcript,
                      duration_seconds: duration,
                    })
                );
              }
            } catch (err) {
              setError({ severity: 'error', message: 'Error processing audio chunk' });
              setIsAnalyzing(false);
            }
          }
        }
      };

      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
    } catch (err) {
      setError({ severity: 'error', message: `Could not access microphone: ${err.message}` });
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
            JSON.stringify({
              type: 'session_end',
              session_duration_seconds: (Date.now() - sessionStartTimeRef.current) / 1000,
            })
        );
      }
      setIsRecording(false);
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    audioChunksRef.current = [];
  };

  // Error UI
  if (error) {
    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
          <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
            <ErrorIcon color="error" sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h5" color="error" gutterBottom>
              An error occurred
            </Typography>
            <Typography paragraph>{typeof error === 'string' ? error : error.message || 'Unknown error'}</Typography>
            <Button variant="contained" color="primary" onClick={() => setError(null)} sx={{ mt: 2 }}>
              Try Again
            </Button>
          </Paper>
        </Box>
    );
  }

  return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h4" component="h1">
              AI Debate Analyzer
            </Typography>
            <Box>
              {!isRecording ? (
                  <Button
                      variant="contained"
                      color="primary"
                      startIcon={<MicIcon />}
                      onClick={startRecording}
                      disabled={isAnalyzing}
                      size="large"
                  >
                    Start Recording
                  </Button>
              ) : (
                  <Button
                      variant="contained"
                      color="secondary"
                      startIcon={<StopIcon />}
                      onClick={stopRecording}
                      size="large"
                  >
                    Stop Recording
                  </Button>
              )}
            </Box>
          </Box>

          {error && (
              <Box
                  sx={{
                    mb: 2,
                    p: 2,
                    bgcolor: error.severity === 'error' ? 'error.light' : 'warning.light',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                  }}
              >
                {error.severity === 'error' ? (
                    <ErrorIcon color="error" sx={{ mr: 1 }} />
                ) : (
                    <WarningIcon color="warning" sx={{ mr: 1 }} />
                )}
                <Typography color={error.severity}>{error.message}</Typography>
              </Box>
          )}

          <Box sx={{ mb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="h6">Live Transcript</Typography>
              {isAnalyzing && (
                  <Box display="flex" alignItems="center">
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      Analyzing...
                    </Typography>
                  </Box>
              )}
            </Box>
            <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  minHeight: 150,
                  maxHeight: 300,
                  overflowY: 'auto',
                  bgcolor: 'background.paper',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                }}
            >
              {transcript || (
                  <Typography color="textSecondary" fontStyle="italic">
                    {isRecording ? 'Start speaking to see the transcript here...' : 'Press Start Recording to begin'}
                  </Typography>
              )}
            </Paper>
          </Box>

          {isRecording && (
              <Box sx={{ mb: 3 }}>
                <Box display="flex" alignItems="center" mb={1}>
                  <VolumeUpIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="subtitle2">Volume Level</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: '100%', mr: 1 }}>
                    <LinearProgress
                        variant="determinate"
                        value={volumeLevel}
                        sx={{
                          height: 10,
                          borderRadius: 5,
                          '& .MuiLinearProgress-bar': {
                            transition: 'transform 0.1s',
                            backgroundColor: volumeLevel > 80 ? '#f44336' : volumeLevel > 50 ? '#ff9800' : '#4caf50',
                          },
                        }}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 40, textAlign: 'right' }}>
                    {volumeLevel}%
                  </Typography>
                </Box>
              </Box>
          )}
        </Paper>

        {(isAnalyzing || analysis.metrics.overall_score > 0) && (
            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h5" gutterBottom>
                Analysis
              </Typography>
              {isAnalyzing ? (
                  <Box display="flex" justifyContent="center" alignItems="center" p={4}>
                    <CircularProgress />
                    <Typography variant="body1" sx={{ ml: 2 }}>
                      Analyzing your speech...
                    </Typography>
                  </Box>
              ) : (
                  <Box>
                    <Grid container spacing={3} sx={{ mb: 3 }}>
                      <Grid item xs={12} md={4}>
                        <MetricCard
                            title="Overall Score"
                            value={analysis.metrics.overall_score}
                            icon={SentimentSatisfiedIcon}
                            color="primary"
                            max={10}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <MetricCard
                            title="Speaking Rate"
                            value={analysis.metrics.speaking_rate ? `${Math.round(analysis.metrics.speaking_rate)} wpm` : 'N/A'}
                            icon={SpeedIcon}
                            color="secondary"
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <MetricCard
                            title="Vocabulary Richness"
                            value={analysis.metrics.vocabulary_richness}
                            icon={GavelIcon}
                            color="success"
                            max={1}
                        />
                      </Grid>
                    </Grid>

                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2, height: '100%' }}>
                          <Typography variant="h6" gutterBottom>
                            Strengths
                          </Typography>
                          {analysis.feedback.strengths?.length > 0 ? (
                              <List dense>
                                {analysis.feedback.strengths.map((strength, index) => (
                                    <FeedbackItem key={index} type="strength" text={strength} />
                                ))}
                              </List>
                          ) : (
                              <Typography color="textSecondary" fontStyle="italic">
                                No strengths identified yet. Keep speaking to receive feedback.
                              </Typography>
                          )}
                        </Paper>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2, height: '100%' }}>
                          <Typography variant="h6" gutterBottom>
                            Areas for Improvement
                          </Typography>
                          {analysis.feedback.areas_for_improvement?.length > 0 ? (
                              <List dense>
                                {analysis.feedback.areas_for_improvement.map((item, index) => (
                                    <FeedbackItem key={index} type="improvement" text={item} />
                                ))}
                              </List>
                          ) : (
                              <Typography color="textSecondary" fontStyle="italic">
                                No specific areas for improvement identified yet. Keep speaking to receive feedback.
                              </Typography>
                          )}
                        </Paper>
                      </Grid>
                    </Grid>

                    {analysis.feedback.suggestions?.length > 0 && (
                        <Box mt={3}>
                          <Typography variant="h6" gutterBottom>
                            Suggestions
                          </Typography>
                          <List>
                            {analysis.feedback.suggestions.map((suggestion, index) => (
                                <FeedbackItem key={index} type="suggestion" text={suggestion} />
                            ))}
                          </List>
                        </Box>
                    )}

                    {Object.keys(analysis.feedback.specific_feedback || {}).length > 0 && (
                        <Box mt={3}>
                          <Typography variant="h6" gutterBottom>
                            Detailed Feedback
                          </Typography>
                          <Box>
                            {Object.entries(analysis.feedback.specific_feedback).map(([category, feedback]) => (
                                <Box key={category} mb={2}>
                                  <Typography variant="subtitle2" color="primary" gutterBottom>
                                    {category
                                        .split('_')
                                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                                        .join(' ')}
                                  </Typography>
                                  <Typography variant="body2" paragraph>
                                    {feedback}
                                  </Typography>
                                </Box>
                            ))}
                          </Box>
                        </Box>
                    )}
                  </Box>
              )}
            </Paper>
        )}

        {analysis?.session_summary && (
            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5">Session Summary</Typography>
                <Chip label="Completed" color="success" variant="outlined" icon={<CheckCircleIcon />} />
              </Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Session Duration: {Math.round(analysis.session_summary.session_duration_minutes * 10) / 10} minutes
                  </Typography>
                  <Typography variant="subtitle1" gutterBottom>
                    Total Words: {analysis.session_summary.total_words}
                  </Typography>
                  <Typography variant="subtitle1" gutterBottom>
                    Average Speaking Rate: {analysis.session_summary.avg_words_per_minute} words per minute
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Filler Words: {analysis.session_summary.total_filler_words} (
                    {analysis.session_summary.filler_word_rate.toFixed(1)}% of words)
                  </Typography>
                  <Typography variant="subtitle1" gutterBottom>
                    Vocabulary Richness: {(analysis.session_summary.vocabulary_richness * 100).toFixed(1)}%
                  </Typography>
                  <Typography variant="subtitle1" gutterBottom>
                    Overall Score: {analysis.session_summary.overall_score.toFixed(1)}/10
                  </Typography>
                </Grid>
              </Grid>
              {analysis.session_summary.key_takeaways?.length > 0 && (
                  <Box mt={3}>
                    <Typography variant="h6" gutterBottom>
                      Key Takeaways
                    </Typography>
                    <List>
                      {analysis.session_summary.key_takeaways.map((takeaway, index) => (
                          <FeedbackItem key={index} type="suggestion" text={takeaway} />
                      ))}
                    </List>
                  </Box>
              )}
              <Box mt={3} textAlign="center">
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<MicIcon />}
                    onClick={startRecording}
                    size="large"
                    sx={{ mt: 2 }}
                >
                  Start New Session
                </Button>
              </Box>
            </Paper>
        )}
      </Box>
  );
};

export default DebateAnalyzer;