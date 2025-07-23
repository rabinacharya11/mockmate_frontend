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
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { user } = useAuth();

  // Initialize speech recognition
  useEffect(() => {
    if (!isSpeechRecognitionSupported()) {
      setError("Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    // Initialize speech recognition with our custom handler
    const recognition = initSpeechRecognition({
      continuous: true,
      interimResults: true,
      lang: "en-US",
      onResult: ({ finalTranscript, interimTranscript }) => {
        if (finalTranscript) {
          setTranscript(prev => prev + finalTranscript);
        }
      },
      onError: (event) => {
        console.error('Speech recognition error:', event.error);
        let errorMessage = '';
        
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'No speech detected. Please try speaking again.';
            break;
          case 'audio-capture':
            errorMessage = 'Microphone not available. Please check your microphone connection.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone access denied. Please allow microphone permissions.';
            break;
          case 'network':
            errorMessage = 'Network error. Please check your internet connection.';
            break;
          default:
            errorMessage = `Microphone error: ${event.error}. Please try again.`;
        }
        
        setError(errorMessage);
        setRecording(false);
      }
    });
    
    if (!recognition) {
      setError("Failed to initialize speech recognition. Please refresh the page.");
    }
    
    // Cleanup
    return () => {
      stopSpeechRecognition();
    };
  }, []);

  const startRecording = async () => {
    setTranscript("");
    setFeedback(null);
    setError("");
    
    // Check for microphone permissions first
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Release the stream immediately
    } catch (permissionError) {
      setError("Microphone access denied. Please allow microphone permissions and try again.");
      return;
    }
    
    setRecording(true);
    
    if (!startSpeechRecognition()) {
      setError("Failed to start speech recognition. Please refresh and try again.");
      setRecording(false);
    }
  };

  const stopRecording = () => {
    setRecording(false);
    stopSpeechRecognition();
  };

  const sendForFeedback = async () => {
    if (!transcript.trim()) {
      setError("No recording to analyze. Please record your answer first.");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      const data = await getVerbalFeedback(question.questionText, transcript);
      const feedbackData = data.feedback[0];
      setFeedback(feedbackData);

      // Store feedback in Firestore
      if (user) {
        await updateDoc(doc(db, "users", user.uid), {
          interviewFeedback: arrayUnion({
            question: question.questionText,
            answer: transcript,
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
        <div className="flex space-x-4">
          <button
            onClick={startRecording}
            disabled={recording || loading}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              recording || loading
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
        
        {error && (
          <div className="text-red-500 text-sm p-2 bg-red-50 dark:bg-red-900/30 rounded">
            {error}
          </div>
        )}
        
        <div className="mt-4">
          <h3 className="font-medium text-gray-800 dark:text-white mb-2">Your Answer:</h3>
          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg min-h-[100px] border border-gray-200 dark:border-gray-700">
            {transcript ? transcript : (
              <span className="text-gray-400 italic">
                {recording ? "Speaking..." : "Your transcribed answer will appear here"}
              </span>
            )}
          </div>
        </div>
        
        <button
          onClick={sendForFeedback}
          disabled={!transcript || loading || recording}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            !transcript || loading || recording
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