"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";

export default function Recorder({ question, onAnswerComplete, isLastQuestion, currentAnswerState }) {
  const [manualText, setManualText] = useState("");
  const [inputMode, setInputMode] = useState("voice"); // "voice" or "text"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [recognitionInstance, setRecognitionInstance] = useState(null);
  const [browserSupported, setBrowserSupported] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioStream, setAudioStream] = useState(null);
  const [useWebSpeechAPI, setUseWebSpeechAPI] = useState(false); // Start with false to avoid network issues
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [supportedMimeType, setSupportedMimeType] = useState('audio/webm');
  const [debugInfo, setDebugInfo] = useState({});
  const { user } = useAuth();

  // Debug mode (can be enabled via localStorage)
  const DEBUG_MODE = typeof window !== 'undefined' && localStorage.getItem('transcription_debug') === 'true';

  // Detect browser capabilities
  const detectBrowserCapabilities = () => {
    // Detect best supported MIME type
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4;codecs=mp4a.40.2',
      'audio/mp4',
      'audio/mpeg',
      'audio/wav'
    ];
    
    let bestMimeType = 'audio/webm'; // Default fallback
    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        bestMimeType = mimeType;
        break;
      }
    }
    
    setSupportedMimeType(bestMimeType);
    console.log('🎵 Best supported MIME type:', bestMimeType);
    
    // Detect browser for specific handling
    const userAgent = navigator.userAgent;
    const isChrome = userAgent.includes('Chrome');
    const isFirefox = userAgent.includes('Firefox');
    const isSafari = userAgent.includes('Safari') && !isChrome;
    const isEdge = userAgent.includes('Edge');
    
    console.log('🌐 Browser detection:', { isChrome, isFirefox, isSafari, isEdge });
    
    // Store debug info
    setDebugInfo({
      mimeType: bestMimeType,
      browser: { isChrome, isFirefox, isSafari, isEdge },
      userAgent,
      mediaRecorderSupported: typeof MediaRecorder !== 'undefined',
      getUserMediaSupported: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    });
    
    return { bestMimeType, isChrome, isFirefox, isSafari, isEdge };
  };

  // Initialize Speech Recognition and detect browser capabilities
  useEffect(() => {
    const initializeSpeechRecognition = () => {
      try {
        // Check if we're in browser environment
        if (typeof window === 'undefined') {
          console.log('❌ Not in browser environment');
          return;
        }

        // Detect browser capabilities
        detectBrowserCapabilities();

        // Check for speech recognition support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
          setError("Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari, or use the 'Text Answer' mode.");
          return;
        }

        setBrowserSupported(true);
        console.log('✅ Speech recognition supported');

        // Create speech recognition instance
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        // Add more configuration to handle network issues
        recognition.maxAlternatives = 1;
        
        let finalTranscript = '';
        let isManualStop = false;
        
        recognition.onresult = (event) => {
          let interimTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcriptPart = event.results[i][0].transcript;
            
            if (event.results[i].isFinal) {
              finalTranscript += transcriptPart + ' ';
              console.log('🎯 Final transcription:', transcriptPart);
            } else {
              interimTranscript += transcriptPart;
              console.log('📝 Interim transcription:', transcriptPart);
            }
          }
          
          // Update state with combined transcript
          setTranscript(finalTranscript + interimTranscript);
        };
        
        recognition.onerror = (event) => {
          console.error('❌ Speech Recognition Error:', event.error);
          
          // If network error, switch to MediaRecorder fallback
          if (event.error === 'network' && retryCount >= 2) {
            console.log('🔄 Switching to MediaRecorder fallback due to network issues');
            setUseWebSpeechAPI(false);
            setError("Speech recognition service unavailable. Using local recording mode.");
            return;
          }
          
          // Handle different types of errors
          switch (event.error) {
            case 'network':
              setError("Network error occurred. Please check your internet connection and try again.");
              break;
            case 'not-allowed':
              setError("Microphone access denied. Please allow microphone access and try again.");
              break;
            case 'no-speech':
              setError("No speech detected. Please try speaking again.");
              break;
            case 'audio-capture':
              setError("Audio capture failed. Please check your microphone and try again.");
              break;
            case 'service-not-allowed':
              setError("Speech recognition service not allowed. Please try again.");
              break;
            default:
              setError(`Speech recognition error: ${event.error}. Please try again.`);
          }
          
          setIsRecording(false);
        };
        
        recognition.onstart = () => {
          console.log('🚀 Speech recognition started');
          setError(""); // Clear any previous errors
          isManualStop = false;
        };
        
        recognition.onend = () => {
          console.log('🛑 Speech recognition ended');
          setIsRecording(false);
          
          // If it ended unexpectedly (not manually stopped), try to restart
          if (!isManualStop && isRecording) {
            console.log('🔄 Recognition ended unexpectedly, attempting restart...');
            setTimeout(() => {
              if (isRecording) {
                try {
                  recognition.start();
                } catch (err) {
                  console.error('❌ Failed to restart recognition:', err);
                  setError("Speech recognition stopped unexpectedly. Please try again.");
                  setIsRecording(false);
                }
              }
            }, 1000);
          }
        };
        
        // Store the manual stop flag
        recognition.manualStop = () => {
          isManualStop = true;
          recognition.stop();
        };

        setRecognitionInstance(recognition);
        console.log('🚀 Speech recognition initialized successfully');

      } catch (err) {
        console.error('❌ Failed to initialize speech recognition:', err);
        setError(`Failed to initialize speech recognition: ${err.message}`);
      }
    };

    initializeSpeechRecognition();
  }, []);

  const startRecording = async () => {
    console.log('🎬 Starting recording...');
    try {
      // Start with MediaRecorder to avoid network issues
      return startMediaRecording();

    } catch (err) {
      console.error('❌ Error starting recording:', err);
      setError(`Failed to start recording: ${err.message}`);
      setIsRecording(false);
    }
  };

  const startMediaRecording = async () => {
    try {
      console.log('🎤 Starting audio recording...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
      setAudioStream(stream);
      
      // Use the detected MIME type
      const mimeType = supportedMimeType;
      console.log('🎵 Using MIME type:', mimeType);
      
      const recorder = new MediaRecorder(stream, { 
        mimeType: mimeType,
        bitsPerSecond: 128000 // Set a reasonable bitrate
      });
      const audioChunks = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
          console.log('📦 Audio chunk received:', event.data.size, 'bytes');
        }
      };
      
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: supportedMimeType });
        console.log('🎵 Audio recorded, blob size:', audioBlob.size, 'bytes, type:', supportedMimeType);
        
        // Check if we have enough audio data
        if (audioBlob.size < 1000) { // Less than 1KB
          setError("❌ Recording too short. Please record for at least 2-3 seconds and try again.");
          return;
        }
        
        setError("🔄 Transcribing your audio with AssemblyAI... Please wait...");
        
        try {
          // Send audio to our transcription API
          const formData = new FormData();
          // Use the original MIME type as filename extension
          const fileExtension = supportedMimeType.includes('webm') ? 'webm' : 
                               supportedMimeType.includes('mp4') ? 'mp4' : 
                               supportedMimeType.includes('wav') ? 'wav' : 
                               supportedMimeType.includes('mpeg') ? 'mp3' : 'audio';
          formData.append('audio', audioBlob, `recording.${fileExtension}`);
          
          console.log('📤 Sending audio to transcription API...');
          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });
          
          console.log('📥 Transcription API response status:', response.status);
          const result = await response.json();
          console.log('📄 Transcription API result:', result);
          
          if (response.ok && result.transcript && result.transcript.trim()) {
            setTranscript(result.transcript);
            setError("✅ Transcription completed! Your answer has been converted to text.");
            console.log('✅ Transcription successful:', result.transcript);
          } else {
            // Handle different types of errors
            let errorMessage = "❌ Transcription failed. ";
            if (result.error) {
              if (result.error.includes('timeout')) {
                errorMessage += "The transcription service timed out. Please try with a shorter recording.";
              } else if (result.error.includes('network')) {
                errorMessage += "Network error occurred. Please check your internet connection.";
              } else if (result.error.includes('format')) {
                errorMessage += "Audio format not supported. Please try recording again.";
              } else {
                errorMessage += result.message || result.error;
              }
            } else {
              errorMessage += "Please try recording again or use the 'Text Answer' mode.";
            }
            setError(errorMessage);
            console.error('❌ Transcription failed:', result);
          }
        } catch (transcriptionError) {
          console.error('❌ Transcription error:', transcriptionError);
          setError("❌ Failed to transcribe audio. Please check your internet connection and try again, or use the 'Text Answer' mode.");
        }
      };
      
      setMediaRecorder(recorder);
      recorder.start(1000); // Collect data every second for better streaming
      setIsRecording(true);
      setError("🎤 Recording audio... Speak clearly and click 'Stop Recording' when finished. We'll automatically transcribe it using AssemblyAI!");
      
    } catch (err) {
      console.error('❌ MediaRecorder failed:', err);
      if (err.name === 'NotAllowedError') {
        setError("Microphone access denied. Please allow microphone access in your browser settings and try again, or use the 'Text Answer' mode.");
      } else {
        setError("Failed to access microphone. Please check your device settings and try using 'Text Answer' mode instead.");
      }
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    console.log('🛑 Stopping recording...');
    try {
      // Stop MediaRecorder if being used
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        if (audioStream) {
          audioStream.getTracks().forEach(track => track.stop());
          setAudioStream(null);
        }
        setMediaRecorder(null);
        console.log('✅ MediaRecorder stopped');
        setIsRecording(false);
        return;
      }

      // Stop Web Speech API if being used
      if (recognitionInstance) {
        // Use manual stop to prevent auto-restart
        if (recognitionInstance.manualStop) {
          recognitionInstance.manualStop();
        } else {
          recognitionInstance.stop();
        }
        console.log('✅ Speech recognition stopped');
      }

      setIsRecording(false);
      
      // Wait a moment for final results
      setTimeout(() => {
        if (transcript.trim()) {
          console.log('🎯 Final transcript for feedback:', transcript.trim());
          submitForFeedback(transcript.trim());
        } else {
          setError("No speech detected. Please try speaking again or use text input.");
        }
      }, 1000);

    } catch (err) {
      console.error('❌ Error stopping recording:', err);
      setError(`Failed to stop recording: ${err.message}`);
      setIsRecording(false);
    }
  };

  const submitForFeedback = async (answerText) => {
    if (!answerText.trim()) {
      setError("No answer to analyze. Please provide your answer first.");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      console.log('📤 Submitting answer:', {
        question: question.questionText,
        answer: answerText
      });
      
      // Create answer data to pass to parent component
      const answerData = {
        questionId: question.id,
        questionText: question.questionText,
        answer: answerText,
        voiceConvertedToText: answerText, // Store the voice-converted text for API
        timestamp: new Date().toISOString(),
        isComplete: true
      };

      // Store answer in Firestore (without feedback for now)
      if (user) {
        await updateDoc(doc(db, "users", user.uid), {
          interviewAnswers: arrayUnion({
            questionId: question.id,
            question: question.questionText,
            answer: answerText,
            voiceConvertedToText: answerText,
            timestamp: new Date(),
          }),
        });
      }

      // Set submitted state
      setIsSubmitted(true);

      // Call the parent component's callback
      if (onAnswerComplete) {
        onAnswerComplete(answerData);
      }

    } catch (err) {
      console.error('❌ Error submitting answer:', err);
      setError(`Failed to submit answer: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTextSubmit = () => {
    if (!manualText.trim()) {
      setError("Please enter your answer first.");
      return;
    }
    submitForFeedback(manualText.trim());
  };

  const clearAnswer = () => {
    setTranscript("");
    setManualText("");
    setError("");
    setRetryCount(0);
    setIsSubmitted(false);
  };

  const retryRecording = () => {
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1);
      setError("");
      setTranscript("");
      console.log(`🔄 Retrying recording (attempt ${retryCount + 1})`);
      
      setTimeout(() => {
        startRecording();
      }, 1000);
    } else {
      setError("Unable to start recording after multiple attempts. Please use the 'Text Answer' mode above.");
    }
  };

  // Show success message if answer has been submitted
  if (isSubmitted || currentAnswerState) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6 text-center">
          <div className="text-green-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Answer Recorded!</h3>
          <p className="text-gray-600 mb-4">
            Your response has been saved. {isLastQuestion ? 'Complete all questions to see your analysis.' : 'Continue to the next question when ready.'}
          </p>
          <button
            onClick={clearAnswer}
            className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-200"
          >
            Record New Answer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Input Mode Toggle */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setInputMode("voice")}
          className={`flex-1 py-2 px-4 rounded-lg transition duration-200 ${
            inputMode === "voice"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          🎤 Voice Answer
        </button>
        <button
          onClick={() => setInputMode("text")}
          className={`flex-1 py-2 px-4 rounded-lg transition duration-200 ${
            inputMode === "text"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          ✍️ Text Answer
        </button>
      </div>

      {/* Voice Input Mode */}
      {inputMode === "voice" && (
        <div className="space-y-4">
          {!browserSupported ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">
                Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.
              </p>
            </div>
          ) : (
            <>
              {/* Recording Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-blue-800 text-sm">
                  🎤 <strong>Voice Recording with AI Transcription:</strong> Click "Start Recording" to record your answer. We'll automatically transcribe it using AssemblyAI's advanced speech-to-text technology!
                  <br/>
                  ✨ <strong>How it works:</strong> Record → Stop → Auto-transcribe → Review → Submit answer
                </p>
              </div>

              {/* Recording Controls */}
              <div className="flex justify-center space-x-4">
                {!isRecording ? (
                  <>
                    <button
                      onClick={startRecording}
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-full transition duration-200 disabled:opacity-50"
                    >
                      🎤 Start Recording
                    </button>
                    {retryCount > 0 && retryCount < 3 && (
                      <button
                        onClick={retryRecording}
                        disabled={loading}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-6 rounded-full transition duration-200 disabled:opacity-50"
                      >
                        🔄 Retry ({retryCount}/3)
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-full transition duration-200 animate-pulse"
                  >
                    ⏹️ Stop Recording
                  </button>
                )}
              </div>

              {/* Live Transcript Display */}
              {(isRecording || transcript) && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">
                    {isRecording ? "🎤 Live Transcription:" : "📝 Your Answer:"}
                  </h4>
                  <div className="bg-white rounded-lg p-3 border min-h-[100px]">
                    <p className="text-gray-800 whitespace-pre-wrap">
                      {transcript || "Speak to see your words appear here..."}
                    </p>
                  </div>
                </div>
              )}

              {/* Submit Button for Voice Input */}
              {transcript && !isRecording && (
                <button
                  onClick={() => submitForFeedback(transcript)}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200 disabled:opacity-50"
                >
                  {loading ? "Submitting Answer..." : "Submit Answer"}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Text Input Mode */}
      {inputMode === "text" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type your answer:
            </label>
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Type your interview answer here..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={6}
            />
          </div>
          <button
            onClick={handleTextSubmit}
            disabled={loading || !manualText.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200 disabled:opacity-50"
          >
            {loading ? "Getting Feedback..." : "Get Feedback"}
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-red-700">{error}</p>
              {retryCount > 0 && (
                <p className="text-red-600 text-sm mt-1">
                  Retry attempt: {retryCount}/3
                </p>
              )}
            </div>
            {(error.includes('microphone') || error.includes('access')) && retryCount < 3 && (
              <button
                onClick={retryRecording}
                className="ml-4 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition duration-200"
              >
                🔄 Retry
              </button>
            )}
          </div>
          {retryCount >= 3 && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-blue-800 text-sm">
                💡 <strong>Recommended:</strong> Switch to "Text Answer" mode above for the best experience, or check your internet connection and microphone permissions.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Debug Panel - only shown when debug mode is enabled */}
      {DEBUG_MODE && (
        <div className="mt-4 p-4 bg-gray-100 border border-gray-300 rounded-lg">
          <h4 className="font-bold text-gray-800 mb-2">🔧 Debug Information</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <p><strong>MIME Type:</strong> {debugInfo.mimeType}</p>
            <p><strong>Browser:</strong> {JSON.stringify(debugInfo.browser)}</p>
            <p><strong>MediaRecorder Support:</strong> {debugInfo.mediaRecorderSupported ? '✅' : '❌'}</p>
            <p><strong>getUserMedia Support:</strong> {debugInfo.getUserMediaSupported ? '✅' : '❌'}</p>
            <p><strong>Browser Supported:</strong> {browserSupported ? '✅' : '❌'}</p>
            <p><strong>Current Input Mode:</strong> {inputMode}</p>
            <p><strong>Is Recording:</strong> {isRecording ? '✅' : '❌'}</p>
            <p><strong>Retry Count:</strong> {retryCount}</p>
            <p><strong>Transcript Length:</strong> {transcript.length} chars</p>
            {error && <p><strong>Last Error:</strong> {error}</p>}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            To disable debug mode: <code>localStorage.removeItem(&apos;transcription_debug&apos;)</code>
          </div>
        </div>
      )}
    </div>
  );
}
