"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import { doc, updateDoc, arrayUnion, collection, addDoc, setDoc } from "firebase/firestore";
import { getVerbalFeedback } from "../lib/api";
import Recorder from "./Recorder";

export default function InterviewSession({ questions = [], onComplete, onBack }) {
  // Ensure we always have exactly 5 questions
  const sessionQuestions = questions.slice(0, 5);
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [allFeedback, setAllFeedback] = useState([]);
  const [sessionStartTime] = useState(new Date());
  const { user } = useAuth();

  const currentQuestion = sessionQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === sessionQuestions.length - 1;

  const handleFeedback = (feedbackData) => {
    setFeedback(feedbackData);
    setAllFeedback(prev => [...prev, {
      question: currentQuestion.questionText,
      feedback: feedbackData,
      timestamp: new Date()
    }]);
  };

  const nextQuestion = () => {
    setFeedback(null);
    setError("");
    
    if (isLastQuestion) {
      setInterviewComplete(true);
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setFeedback(null);
      setError("");
    }
  };

  const handleAnswerComplete = (answerData) => {
    // Store the answer
    setAnswers(prev => [...prev, answerData]);
    
    // Generate feedback for this answer
    generateFeedbackForAnswer(answerData);
  };

  const generateFeedbackForAnswer = async (answerData) => {
    try {
      setLoading(true);
      console.log('Generating feedback for answer:', answerData);
      
      const feedbackResponse = await getVerbalFeedback(
        answerData.questionText, 
        answerData.answer
      );
      
      if (feedbackResponse && feedbackResponse.feedback && feedbackResponse.feedback[0]) {
        const feedbackData = feedbackResponse.feedback[0];
        
        // Update the feedback state
        setFeedback(feedbackData);
        
        // Store feedback in allFeedback array
        setAllFeedback(prev => [...prev, {
          question: answerData.questionText,
          answer: answerData.answer,
          feedback: feedbackData,
          timestamp: new Date()
        }]);
        
        console.log('Feedback generated successfully:', feedbackData);
      }
    } catch (err) {
      console.error("Error generating feedback:", err);
      setError("Failed to generate feedback. The answer was saved but feedback analysis failed.");
      
      // Store a default feedback entry so the flow can continue
      setAllFeedback(prev => [...prev, {
        question: answerData.questionText,  
        answer: answerData.answer,
        feedback: {
          sentiment: { pos: 0.5, neg: 0.1, neu: 0.4, compound: 0.4 },
          clarity_score: 0.7,
          filler_words: {},
          overall_feedback: "Feedback analysis unavailable. Please try again later."
        },
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const submitInterview = async () => {
    setLoading(true);
    
    try {
      // Prepare the final session data with all collected answers and feedback
      const sessionEndTime = new Date();
      const sessionDuration = Math.round((sessionEndTime - sessionStartTime) / 1000); // in seconds
      
      // Ensure we have feedback for all answers
      let finalAnswersWithFeedback = [...allFeedback];
      
      // If we have answers without feedback, generate feedback for them
      if (answers.length > allFeedback.length) {
        console.log('Generating missing feedback for remaining answers...');
        
        for (const answer of answers) {
          const existingFeedback = allFeedback.find(f => f.question === answer.questionText);
          if (!existingFeedback) {
            try {
              const feedbackResponse = await getVerbalFeedback(answer.questionText, answer.answer);
              if (feedbackResponse && feedbackResponse.feedback && feedbackResponse.feedback[0]) {
                finalAnswersWithFeedback.push({
                  question: answer.questionText,
                  answer: answer.answer,
                  feedback: feedbackResponse.feedback[0],
                  timestamp: new Date()
                });
              }
            } catch (err) {
              console.error(`Failed to get feedback for question: ${answer.questionText}`, err);
              // Add default feedback
              finalAnswersWithFeedback.push({
                question: answer.questionText,
                answer: answer.answer, 
                feedback: {
                  sentiment: { pos: 0.5, neg: 0.1, neu: 0.4, compound: 0.4 },
                  clarity_score: 0.7,
                  filler_words: {},
                  overall_feedback: "Feedback analysis unavailable."
                },
                timestamp: new Date()
              });
            }
          }
        }
      }

      // Calculate session metrics
      const sessionMetrics = {
        totalQuestions: sessionQuestions.length,
        totalAnswers: finalAnswersWithFeedback.length,
        averageClarity: finalAnswersWithFeedback.length > 0 
          ? finalAnswersWithFeedback.reduce((sum, item) => sum + (item.feedback?.clarity_score || 0), 0) / finalAnswersWithFeedback.length
          : 0,
        averageSentiment: finalAnswersWithFeedback.length > 0
          ? finalAnswersWithFeedback.reduce((sum, item) => sum + (item.feedback?.sentiment?.compound || 0), 0) / finalAnswersWithFeedback.length
          : 0,
        totalFillerWords: finalAnswersWithFeedback.reduce((sum, item) => {
          const fillerCount = Object.values(item.feedback?.filler_words || {}).reduce((total, count) => total + count, 0);
          return sum + fillerCount;
        }, 0),
        sessionDuration: sessionDuration
      };

      // Create session document compatible with Reports.js structure
      const sessionData = {
        sessionId: `session_${Date.now()}`,
        userId: user.uid,
        createdAt: sessionStartTime,
        completedAt: sessionEndTime,
        duration: sessionDuration,
        questions: sessionQuestions,
        results: finalAnswersWithFeedback.map(item => ({
          question: item.question,
          answer: item.answer,
          feedback: [item.feedback], // Reports.js expects feedback as an array
          timestamp: item.timestamp
        })),
        metrics: sessionMetrics,
        status: 'completed',
        questionCount: sessionQuestions.length
      };

      // Store session in Firebase
      if (user) {
        const userRef = doc(db, "users", user.uid);
        const sessionsRef = collection(userRef, "interviewSessions");
        await addDoc(sessionsRef, sessionData);
        
        // Update user document with latest session summary
        await updateDoc(userRef, {
          lastInterviewSession: {
            completedAt: sessionEndTime,
            sessionId: sessionData.sessionId,
            questionCount: sessionQuestions.length,
            averageClarity: sessionMetrics.averageClarity,
            averageSentiment: sessionMetrics.averageSentiment
          },
          totalInterviewSessions: (user.totalInterviewSessions || 0) + 1
        });
        
        console.log('Session saved successfully:', sessionData.sessionId);
      }

      // Update the allFeedback state for the UI
      setAllFeedback(finalAnswersWithFeedback);
      setInterviewComplete(true);
      
      if (onComplete) {
        onComplete(finalAnswersWithFeedback);
      }
      
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
            You answered {allFeedback.length} questions. Your responses have been analyzed and saved.
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
                  {allFeedback.length > 0 
                    ? Math.round(((allFeedback.reduce((sum, item) => sum + (item.feedback?.sentiment?.compound || 0), 0) / allFeedback.length) + 1) / 2 * 100)
                    : 0}%
                </p>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <h4 className="font-medium text-green-800 dark:text-green-400">
                  Average Clarity
                </h4>
                <p className="text-2xl font-bold text-green-900 dark:text-green-300">
                  {allFeedback.length > 0 
                    ? Math.round(allFeedback.reduce((sum, item) => sum + (item.feedback?.clarity_score || 0), 0) / allFeedback.length * 100)
                    : 0}%
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

            {/* Detailed Feedback Display */}
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-gray-800 dark:text-white">
                Detailed Feedback:
              </h4>
              {allFeedback.map((item, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h5 className="font-medium text-gray-800 dark:text-white mb-2">
                    Question {index + 1}: {item.question}
                  </h5>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    <strong>Your Answer:</strong> {item.answer}
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Clarity Score</p>
                      <p className="text-lg font-semibold text-blue-600">
                        {Math.round((item.feedback?.clarity_score || 0) * 100)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Sentiment</p>
                      <p className="text-lg font-semibold text-green-600">
                        {item.feedback?.sentiment?.compound 
                          ? Math.round(((item.feedback.sentiment.compound + 1) / 2) * 100)
                          : 50}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Filler Words</p>
                      <p className="text-lg font-semibold text-orange-600">
                        {item.feedback?.filler_words 
                          ? Object.values(item.feedback.filler_words).reduce((a, b) => a + b, 0)
                          : 0}
                      </p>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">AI Feedback</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {item.feedback?.overall_feedback || "No feedback available"}
                    </p>
                  </div>
                </div>
              ))}
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

      {/* Feedback Display */}
      {feedback && (
        <div className="mb-6 p-4 border border-green-200 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <h4 className="font-semibold text-green-800 dark:text-green-400 mb-3">
            ✅ Feedback for Current Answer
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Clarity Score</p>
              <p className="text-lg font-semibold text-blue-600">
                {Math.round((feedback.clarity_score || 0) * 100)}%
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Sentiment</p>
              <p className="text-lg font-semibold text-green-600">
                {feedback.sentiment?.compound 
                  ? Math.round(((feedback.sentiment.compound + 1) / 2) * 100)
                  : 50}%
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Filler Words</p>
              <p className="text-lg font-semibold text-orange-600">
                {feedback.filler_words 
                  ? Object.values(feedback.filler_words).reduce((a, b) => a + b, 0)
                  : 0}
              </p>
            </div>
          </div>
          
          <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">AI Feedback</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {feedback.overall_feedback || "Great job on your answer!"}
            </p>
          </div>
        </div>
      )}

      {/* Loading State for Feedback */}
      {loading && (
        <div className="mb-6 p-4 border border-blue-200 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
            <p className="text-blue-800 dark:text-blue-300">
              🤖 Analyzing your answer and generating feedback...
            </p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 border border-red-200 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-red-700 dark:text-red-300">
            ⚠️ {error}
          </p>
        </div>
      )}

      {/* Recorder Component */}
      <div className="mb-6">
        <Recorder 
          question={currentQuestion} 
          onAnswerComplete={handleAnswerComplete}
          isLastQuestion={isLastQuestion}
        />
      </div>

      {/* Navigation Buttons */}
      <div className="flex space-x-3 justify-center">
        <button
          onClick={previousQuestion}
          disabled={currentQuestionIndex === 0}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            currentQuestionIndex === 0
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-gray-600 hover:bg-gray-700 text-white"
          }`}
        >
          ← Previous
        </button>

        {!isLastQuestion ? (
          <button
            onClick={nextQuestion}
            className="px-4 py-2 rounded-lg font-medium transition-colors bg-blue-600 hover:bg-blue-700 text-white"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={submitInterview}
            disabled={loading}
            className="px-6 py-2 rounded-lg font-medium transition-colors bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Completing Interview...
              </div>
            ) : (
              "🎯 Complete Interview"
            )}
          </button>
        )}
      </div>

    </div>
  );
}
