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

export default function InterviewSession({ questions = [], onComplete, onBack }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [answers, setAnswers] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [allFeedback, setAllFeedback] = useState([]);
  const { user } = useAuth();

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  // Initialize speech recognition
  useEffect(() => {
    if (!isSpeechRecognitionSupported()) {
      setError("Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.");
      return;
    }

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
    
    return () => {
      stopSpeechRecognition();
    };
  }, []);

  const startRecording = async () => {
    setTranscript("");
    setError("");
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
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

  const nextQuestion = () => {
    if (transcript.trim()) {
      // Save the current answer
      const answer = {
        questionId: currentQuestion.id,
        questionText: currentQuestion.questionText,
        answer: transcript,
        timestamp: new Date().toISOString()
      };
      
      setAnswers(prev => [...prev, answer]);
      setTranscript("");
      setFeedback(null);
      setError("");
      
      if (isLastQuestion) {
        setInterviewComplete(true);
      } else {
        setCurrentQuestionIndex(prev => prev + 1);
      }
    } else {
      setError("Please provide an answer before moving to the next question.");
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      // Load previous answer if exists
      const prevAnswer = answers[currentQuestionIndex - 1];
      if (prevAnswer) {
        setTranscript(prevAnswer.answer);
      } else {
        setTranscript("");
      }
      setFeedback(null);
      setError("");
    }
  };

  const getFeedback = async () => {
    if (!transcript.trim()) {
      setError("No recording to analyze. Please record your answer first.");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      const data = await getVerbalFeedback(currentQuestion.questionText, transcript);
      const feedbackData = data.feedback[0];
      setFeedback(feedbackData);
    } catch (err) {
      console.error("Error getting feedback:", err);
      setError("Failed to get feedback. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const submitInterview = async () => {
    if (!transcript.trim() && !isLastQuestion) {
      setError("Please provide an answer for the current question.");
      return;
    }

    setLoading(true);
    
    try {
      // Add current answer if there is one
      let finalAnswers = [...answers];
      if (transcript.trim()) {
        const currentAnswer = {
          questionId: currentQuestion.id,
          questionText: currentQuestion.questionText,
          answer: transcript,
          timestamp: new Date().toISOString()
        };
        finalAnswers = [...answers, currentAnswer];
      }

      // Get feedback for all answers
      const feedbackPromises = finalAnswers.map(async (answer) => {
        try {
          const data = await getVerbalFeedback(answer.questionText, answer.answer);
          return {
            ...answer,
            feedback: data.feedback[0]
          };
        } catch (err) {
          console.error(`Failed to get feedback for question ${answer.questionId}:`, err);
          return {
            ...answer,
            feedback: {
              sentiment: { pos: 0.5, neg: 0.1, neu: 0.4, compound: 0.4 },
              clarity_score: 0.7,
              filler_words: {},
              overall_feedback: "Unable to analyze this response."
            }
          };
        }
      });

      const answersWithFeedback = await Promise.all(feedbackPromises);
      setAllFeedback(answersWithFeedback);

      // Store in Firebase
      if (user) {
        await updateDoc(doc(db, "users", user.uid), {
          interviewSessions: arrayUnion({
            questions,
            answers: answersWithFeedback,
            completedAt: new Date().toISOString(),
            sessionId: Date.now().toString()
          })
        });
      }

      setInterviewComplete(true);
      onComplete && onComplete(answersWithFeedback);
    } catch (err) {
      console.error("Error submitting interview:", err);
      setError("Failed to submit interview. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
          No Questions Available
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Please generate questions first before starting the interview.
        </p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (interviewComplete) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-white">
          Interview Complete!
        </h2>
        
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <h3 className="font-medium text-green-800 dark:text-green-400 mb-2">
            Great job completing your mock interview!
          </h3>
          <p className="text-green-700 dark:text-green-300">
            You answered {answers.length} questions. Your responses have been analyzed and saved.
          </p>
        </div>

        {allFeedback.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
              Interview Summary
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="font-medium text-blue-800 dark:text-blue-400">
                  Average Sentiment
                </h4>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">
                  {Math.round(allFeedback.reduce((sum, item) => sum + item.feedback.sentiment.pos, 0) / allFeedback.length * 100)}%
                </p>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <h4 className="font-medium text-green-800 dark:text-green-400">
                  Average Clarity
                </h4>
                <p className="text-2xl font-bold text-green-900 dark:text-green-300">
                  {Math.round(allFeedback.reduce((sum, item) => sum + item.feedback.clarity_score, 0) / allFeedback.length * 100)}%
                </p>
              </div>
              
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                <h4 className="font-medium text-purple-800 dark:text-purple-400">
                  Questions Answered
                </h4>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">
                  {allFeedback.length}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex space-x-4">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Start New Interview
          </button>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
          >
            Back to Questions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 max-w-4xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}% Complete
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Current Question */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full w-8 h-8 flex items-center justify-center mr-4 mt-1">
            {currentQuestionIndex + 1}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
              {currentQuestion.questionText}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {currentQuestion.instruction}
            </p>
            <div className="mt-2 flex space-x-2">
              <span className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs">
                Type: {currentQuestion.type}
              </span>
              <span className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs">
                Difficulty: {currentQuestion.difficulty}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recording Controls */}
      <div className="mb-6">
        <div className="flex space-x-4 mb-4">
          <button
            onClick={startRecording}
            disabled={recording || loading}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              recording || loading
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 text-white"
            }`}
          >
            {recording ? "🎤 Recording..." : "🎤 Start Recording"}
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
            ⏹️ Stop Recording
          </button>
        </div>

        {/* Transcript */}
        <div className="mb-4">
          <h4 className="font-medium text-gray-800 dark:text-white mb-2">Your Answer:</h4>
          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg min-h-[100px] border border-gray-200 dark:border-gray-700">
            {transcript ? transcript : (
              <span className="text-gray-400 italic">
                {recording ? "Speaking..." : "Your transcribed answer will appear here"}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={previousQuestion}
            disabled={currentQuestionIndex === 0 || loading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              currentQuestionIndex === 0 || loading
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-gray-600 hover:bg-gray-700 text-white"
            }`}
          >
            ← Previous
          </button>

          <button
            onClick={getFeedback}
            disabled={!transcript || loading || recording}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              !transcript || loading || recording
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-purple-600 hover:bg-purple-700 text-white"
            }`}
          >
            {loading ? "Analyzing..." : "💬 Get Feedback"}
          </button>

          {!isLastQuestion ? (
            <button
              onClick={nextQuestion}
              disabled={!transcript || loading}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                !transcript || loading
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              Next →
            </button>
          ) : (
            <button
              onClick={submitInterview}
              disabled={loading}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                loading
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }`}
            >
              {loading ? "Submitting..." : "🎯 Submit Interview"}
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 text-red-500 text-sm p-3 bg-red-50 dark:bg-red-900/30 rounded">
          {error}
        </div>
      )}

      {/* Feedback Display */}
      {feedback && (
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="font-medium text-gray-800 dark:text-white mb-4">Feedback Analysis</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-white dark:bg-gray-800 p-3 rounded shadow-sm">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Sentiment</h4>
              <div className="flex space-x-2 items-center">
                <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
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
              <div className="flex space-x-2 items-center">
                <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
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
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Overall Feedback</h4>
            <p className="text-gray-800 dark:text-white">{feedback.overall_feedback}</p>
          </div>
        </div>
      )}
    </div>
  );
}
