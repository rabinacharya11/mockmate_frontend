import { useRef, useState, useCallback } from 'react';

export const useAssemblyAIStreaming = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');
  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);

  const startStreaming = useCallback(async () => {
    setError('');
    setTranscript('');
    setIsRecording(true);

    // 1. Get token
    let token;
    try {
      const res = await fetch('/api/assemblyai-token');
      const data = await res.json();
      if (!data.token) throw new Error(data.error || 'Failed to get AssemblyAI token');
      token = data.token;
    } catch (err) {
      setError('Failed to get AssemblyAI token: ' + err.message);
      setIsRecording(false);
      return;
    }

    // 2. Open WebSocket
    const ws = new window.WebSocket(`wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => {
      setIsConnected(false);
      setIsRecording(false);
    };
    ws.onerror = (e) => setError('WebSocket error: ' + e.message);

    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data.message_type === 'PartialTranscript') {
          setTranscript((prev) => prev + ' ' + data.text);
        }
        if (data.message_type === 'FinalTranscript') {
          setTranscript((prev) => prev + ' ' + data.text);
        }
      } catch (e) {
        // ignore
      }
    };

    // 3. Get mic and send audio
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && ws.readyState === 1) {
          const arrayBuffer = await event.data.arrayBuffer();
          ws.send(arrayBuffer);
        }
      };
      mediaRecorder.start(250);
    } catch (err) {
      setError('Failed to access microphone: ' + err.message);
      setIsRecording(false);
      ws.close();
    }
  }, []);

  const stopStreaming = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsRecording(false);
    setIsConnected(false);
  }, []);

  return {
    startStreaming,
    stopStreaming,
    isConnected,
    isRecording,
    transcript,
    error
  };
};
