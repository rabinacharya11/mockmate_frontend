"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { getVerbalFeedback } from "../lib/api";

export default function Recorder({ question, onFeedback }) {
  const [manualText, setManualText] = useState("");
  const [inputMode, setInputMode] = useState("voice"); // "voice" or "text"
  const [feedback, setFeedback] = useState(null);
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
  const { user } = useAuth();

  // Initialize Speech Recognition
  useEffect(() => {
    const initializeSpeechRecognition = () => {
      try {
        // Check if we're in browser environment
        if (typeof window === 'undefined') {
          console.log('❌ Not in browser environment');
          return;
        }

        // Check for speech recognition support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
          setError("Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.");
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      
      const recorder = new MediaRecorder(stream);
      const audioChunks = [];
      
      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
      
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        console.log('🎵 Audio recorded, blob size:', audioBlob.size);
        
        // Clear any recording status messages
        setError("");
        setTranscript("Audio recorded successfully! Please use the 'Text Answer' tab above to type your response for analysis.");
        
        // Automatically switch to text mode for convenience
        setTimeout(() => {
          setInputMode("text");
        }, 2000);
      };
      
      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
      setError("🎤 Recording audio... When done, click 'Stop Recording' and then switch to 'Text Answer' mode to type your response.");
      
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
      console.log('📤 Sending for feedback:', {
        question: question.questionText,
        answer: answerText
      });
      
      const data = await getVerbalFeedback(question.questionText, answerText);
      const feedbackData = data.feedback[0];
      setFeedback(feedbackData);

      // Store feedback in Firestore
      if (user) {
        await updateDoc(doc(db, "users", user.uid), {
          interviewFeedback: arrayUnion({
            question: question.questionText,
            answer: answerText,
            feedback: feedbackData,
            timestamp: new Date(),
          }),
        });
      }

      if (onFeedback) {
        onFeedback(feedbackData);
      }

    } catch (err) {
      console.error('❌ Error getting feedback:', err);
      setError(`Failed to get feedback: ${err.message}`);
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

  const clearFeedback = () => {
    setFeedback(null);
    setTranscript("");
    setManualText("");
    setError("");
    setRetryCount(0);
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

  if (feedback) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Interview Feedback</h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Overall Score</h4>
              <div className="bg-white rounded-lg p-3 border">
                <span className="text-2xl font-bold text-blue-600">{feedback.overallScore}/10</span>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-700 mb-2">Strengths</h4>
              <div className="bg-white rounded-lg p-3 border">
                <p className="text-gray-800">{feedback.strengths}</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-700 mb-2">Areas for Improvement</h4>
              <div className="bg-white rounded-lg p-3 border">
                <p className="text-gray-800">{feedback.improvements}</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-700 mb-2">Specific Feedback</h4>
              <div className="bg-white rounded-lg p-3 border">
                <p className="text-gray-800">{feedback.specificFeedback}</p>
              </div>
            </div>
          </div>

          <button
            onClick={clearFeedback}
            className="mt-6 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-200"
          >
            Continue to Next Question
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
                  🎤 <strong>Voice Recording:</strong> Click "Start Recording" to record your answer. After recording, you'll be prompted to type your response in the "Text Answer" section for analysis.
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
                  {loading ? "Getting Feedback..." : "Get Feedback"}
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
    </div>
  );
}
