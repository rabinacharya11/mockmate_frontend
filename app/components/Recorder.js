"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { getVerbalFeedback } from "../lib/api";
import { 
  initSpeechRecognition, 
  startSpeechRecognition, 
  stopSpeechRecognition,
  isSpeechRecognitionSupported
} from "../lib/speechRecognition";

export default function Recorder({ question, onFeedback }) {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [manualText, setManualText] = useState("");
  const [inputMode, setInputMode] = useState("voice"); // "voice" or "text"
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [microphoneReady, setMicrophoneReady] = useState(false);
  const { user } = useAuth();

  // Initialize speech recognition
  useEffect(() => {
    console.log('Initializing speech recognition...');
    
    if (!isSpeechRecognitionSupported()) {
      setError("Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    // Request microphone permissions upfront
    const requestMicrophonePermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('Microphone permission granted');
        stream.getTracks().forEach(track => track.stop()); // Release immediately
        
        // Initialize speech recognition after permission is granted
        const recognition = initSpeechRecognition({
          continuous: true,
          interimResults: true,
          lang: "en-US",
          onResult: ({ finalTranscript, interimTranscript }) => {
            console.log('Speech result received:', { 
              final: finalTranscript, 
              interim: interimTranscript,
              finalLength: finalTranscript.length,
              interimLength: interimTranscript.length
            });
            
            // Update interim transcript for live display
            if (interimTranscript) {
              setInterimTranscript(interimTranscript);
            }
            
            // Add final transcript to the accumulated transcript
            if (finalTranscript) {
              setTranscript(prev => {
                const newTranscript = prev + finalTranscript;
                console.log('Updated accumulated transcript:', newTranscript);
                return newTranscript;
              });
              // Clear interim transcript when we get final results
              setInterimTranscript("");
            }
          },
          onError: (event) => {
            console.error('Speech recognition error:', event.error, event);
            
            // Check if it's a user-friendly error message
            if (event.userMessage) {
              setError(event.userMessage);
              setRecording(false);
              return;
            }
            
            // Handle specific error types
            switch (event.error) {
              case 'no-speech':
                // Don't show error for no-speech, just log it
                console.log('No speech detected - waiting for speech...');
                break;
              case 'audio-capture':
                setError('Microphone not available. Please check your microphone connection.');
                setRecording(false);
                break;
              case 'not-allowed':
                setError('Microphone access denied. Please allow microphone permissions and refresh the page.');
                setRecording(false);
                break;
              case 'network':
                // Network errors are often false positives - don't show them unless persistent
                console.warn('Speech recognition network error (often temporary)');
                break;
              case 'service-not-allowed':
                setError('Speech recognition service not available. Please try again or use a different browser.');
                setRecording(false);
                break;
              case 'aborted':
                // Don't show error for intentional stops
                console.log('Speech recognition aborted');
                break;
              default:
                console.log('Speech recognition error:', event.error);
                // Don't show generic errors to avoid confusing users
            }
          }
        });
        
        if (!recognition) {
          setError("Failed to initialize speech recognition. Please refresh the page.");
        } else {
          console.log('Speech recognition initialized successfully');
          setMicrophoneReady(true);
        }
        
      } catch (permissionError) {
        console.error('Microphone permission error:', permissionError);
        setError("Microphone access denied. Please allow microphone permissions in your browser settings and refresh the page.");
      }
    };

    requestMicrophonePermission();
    
    // Cleanup
    return () => {
      console.log('Cleaning up speech recognition');
      stopSpeechRecognition();
    };
  }, []);

  const startRecording = async () => {
    console.log('Starting recording...');
    setTranscript("");
    setInterimTranscript("");
    setFeedback(null);
    setError("");
    setRetryCount(0);
    
    setRecording(true);
    
    if (!startSpeechRecognition()) {
      setError("Failed to start speech recognition. Please refresh and try again.");
      setRecording(false);
    } else {
      console.log('Speech recognition started successfully');
    }
  };

  const retryRecording = () => {
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1);
      setError("");
      console.log(`Retrying speech recognition (attempt ${retryCount + 1})`);
      
      setTimeout(() => {
        if (!startSpeechRecognition()) {
          setError("Failed to restart speech recognition. Please try again.");
          setRecording(false);
        }
      }, 1000);
    } else {
      setError("Unable to start speech recognition after multiple attempts. Please refresh the page.");
      setRecording(false);
    }
  };

  const stopRecording = () => {
    console.log('Stopping recording...');
    setRecording(false);
    setInterimTranscript(""); // Clear interim text when stopping
    stopSpeechRecognition();
    console.log('Recording stopped');
  };

  const sendForFeedback = async () => {
    const answerText = inputMode === "voice" ? transcript : manualText;
    
    if (!answerText.trim()) {
      setError("No answer to analyze. Please provide your answer first.");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
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

      onFeedback && onFeedback(feedbackData);
    } catch (err) {
      console.error("Error getting feedback:", err);
      setError("Failed to get feedback. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 w-full max-w-3xl mx-auto mt-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
        Answer the Question
      </h2>
      
      <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg mb-6">
        <h3 className="font-medium text-gray-800 dark:text-white mb-2">
          {question.questionText}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {question.instruction}
        </p>
      </div>
      
      <div className="space-y-4">
        {/* Input Mode Switcher */}
        <div className="flex justify-center mb-4">
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setInputMode("voice")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                inputMode === "voice"
                  ? "bg-white dark:bg-gray-800 text-blue-600 shadow"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              🎤 Voice Input
            </button>
            <button
              onClick={() => setInputMode("text")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                inputMode === "text"
                  ? "bg-white dark:bg-gray-800 text-blue-600 shadow"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              ✏️ Text Input
            </button>
          </div>
        </div>

        {inputMode === "voice" && (
          <>
            {/* Microphone Status */}
            <div className="text-center p-2">
              {microphoneReady ? (
                <div className="text-green-600 text-sm">
                  🎤 Microphone ready
                </div>
              ) : (
                <div className="text-yellow-600 text-sm">
                  🎤 Setting up microphone...
                </div>
              )}
            </div>

            <div className="flex space-x-4">
              <button
                onClick={startRecording}
                disabled={recording || loading || !microphoneReady}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                  recording || loading || !microphoneReady
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700 text-white"
                }`}
              >
                {recording ? "Recording..." : "Start Recording"}
              </button>
              
              <button
                onClick={stopRecording}
                disabled={!recording || loading}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                  !recording || loading
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700 text-white"
                }`}
              >
                Stop Recording
              </button>
            </div>
          </>
        )}

        {inputMode === "text" && (
          <div className="space-y-4">
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Type your answer here..."
              className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white min-h-[120px] resize-vertical"
              disabled={loading}
            />
            <div className="text-sm text-gray-500">
              Words: {manualText.trim().split(/\s+/).filter(word => word.length > 0).length}
            </div>
          </div>
        )}
        
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg">
            <div className="text-red-500 text-sm mb-2">
              {error}
            </div>
            {retryCount < 3 && (
              <button
                onClick={retryRecording}
                className="text-sm bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded"
              >
                Retry ({3 - retryCount} attempts left)
              </button>
            )}
          </div>
        )}
        {inputMode === "voice" && (
          <div className="mt-4">
            <h3 className="font-medium text-gray-800 dark:text-white mb-2">
              Your Answer:
              {recording && (
                <span className="ml-2 text-sm text-green-600 animate-pulse">
                  🎤 Listening...
                </span>
              )}
            </h3>
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg min-h-[100px] border border-gray-200 dark:border-gray-700">
              {transcript || interimTranscript ? (
                <div className="whitespace-pre-wrap">
                  {/* Final transcript in normal text */}
                  <span className="text-gray-900 dark:text-white">
                    {transcript}
                  </span>
                  {/* Interim transcript in lighter text */}
                  {interimTranscript && (
                    <span className="text-gray-500 dark:text-gray-400 italic">
                      {transcript ? ' ' : ''}{interimTranscript}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-gray-400 italic">
                  {recording ? "Start speaking... your words will appear here in real-time" : "Your transcribed answer will appear here"}
                </span>
              )}
            </div>
            
            {/* Word count and speaking indicator */}
            <div className="mt-2 text-sm text-gray-500 flex justify-between">
              <span>
                Words: {(transcript + ' ' + interimTranscript).trim().split(/\s+/).filter(word => word.length > 0).length}
              </span>
              {recording && interimTranscript && (
                <span className="text-green-600 animate-pulse">
                  Processing speech...
                </span>
              )}
            </div>
          </div>
        )}
        
        <button
          onClick={sendForFeedback}
          disabled={
            (inputMode === "voice" && (!transcript || recording)) || 
            (inputMode === "text" && !manualText.trim()) || 
            loading
          }
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            (inputMode === "voice" && (!transcript || recording)) || 
            (inputMode === "text" && !manualText.trim()) || 
            loading
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {loading ? "Analyzing..." : "Get Feedback"}
        </button>
      </div>
      
      {feedback && (
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="font-medium text-gray-800 dark:text-white mb-4">Feedback Analysis</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 p-3 rounded shadow-sm">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Sentiment</h4>
                <div className="flex space-x-2">
                  <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2 mt-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${feedback.sentiment.pos * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">
                    {Math.round(feedback.sentiment.pos * 100)}%
                  </span>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-3 rounded shadow-sm">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Clarity Score</h4>
                <div className="flex space-x-2">
                  <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2 mt-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ width: `${feedback.clarity_score * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">
                    {Math.round(feedback.clarity_score * 100)}%
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-3 rounded shadow-sm">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Filler Words</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(feedback.filler_words).map(([word, count]) => (
                  count > 0 && (
                    <div 
                      key={word} 
                      className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs"
                    >
                      "{word}" <span className="font-medium text-gray-600 dark:text-gray-300">{count}x</span>
                    </div>
                  )
                ))}
                {Object.values(feedback.filler_words).every(count => count === 0) && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">No filler words detected! Great job!</p>
                )}
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-3 rounded shadow-sm">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Overall Feedback</h4>
              <p className="text-gray-800 dark:text-white">{feedback.overall_feedback}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}