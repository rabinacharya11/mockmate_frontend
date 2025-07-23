"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { generateQuestions as apiGenerateQuestions } from "../lib/api";
import LoadingState from "./LoadingState";
import ErrorDisplay from "./ErrorDisplay";
import InterviewSession from "./InterviewSession";

export default function QuestionList({ skills = [], questionCount = 6, onQuestionSelected }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [viewMode, setViewMode] = useState("list"); // "list", "interview", or "results"
  const [interviewResults, setInterviewResults] = useState(null);
  const { user } = useAuth();
  
  // Auto-generate questions when component mounts if skills are provided
  useEffect(() => {
    if (skills.length > 0 && questions.length === 0 && !loading) {
      generateQuestions();
    }
  }, [skills]);

  const generateQuestions = async () => {
    if (!user) {
      setError("You must be logged in to generate questions");
      return;
    }
    
    setLoading(true);
    setError("");
    
    // Increment retry counter to help with debugging
    setRetryCount(prev => prev + 1);
    
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        throw new Error("User data not found");
      }
      
      const userData = userSnap.data();
      
      // Use passed skills prop if available, otherwise use skills from Firestore
      const skillsToUse = skills.length > 0 ? skills : (userData.skills || []);
      
      if (skillsToUse.length === 0) {
        throw new Error("No skills found. Please upload your CV first to extract your skills.");
      }
      
      const cv_data = userData.cv_data || {};
      
      console.log("Generating questions with data:", {
        skillsCount: skillsToUse.length,
        questionCount,
        skills: skillsToUse
      });

      const data = await apiGenerateQuestions({
        cv_data: typeof cv_data === 'string' ? cv_data : JSON.stringify(cv_data),
        skills: skillsToUse,
        question_count: questionCount,
      });
      
      console.log("Question generation response:", data);
      
      // Check if there was an error in the API response
      if (data && data.error) {
        console.error("API returned an error:", data.error);
        throw new Error(`${data.error.details || data.error.message || "API Error"}`);
      }
      
      // Ensure data is in the correct format
      if (!data) {
        console.error("No data returned from question generation");
        throw new Error("Failed to generate interview questions. Please try again.");
      }
      
      // Log if we're using mock data
      if (data.source === 'mock-data') {
        console.info("Using mock question data because API call failed");
      } else {
        console.info("Successfully received questions from API");
      }
      
      // Make sure we have a questions array, even if the API returned something unexpected
      const questionsList = data.questions && Array.isArray(data.questions) 
        ? data.questions 
        : Array.isArray(data) ? data : [];
      
      console.log("Processed questions:", questionsList);
      
      if (questionsList.length === 0) {
        throw new Error("No questions were generated. Please try again.");
      }
      
      // Always ensure questions have the required fields
      const validatedQuestions = questionsList.map((q, i) => ({
        id: q.id || `q${i+1}`,
        type: (q.type || "technical").toLowerCase(),
        difficulty: q.difficulty || "medium",
        questionText: q.questionText || q.question || q.text || `Question ${i+1}`,
        instruction: q.instruction || q.instructions || ""
      }));
      
      setQuestions(validatedQuestions);

      // Store questions in Firestore
      await updateDoc(userRef, { 
        questions: validatedQuestions,
        lastInterviewDate: new Date() 
      });
      
    } catch (err) {
      console.error("Error generating questions:", err);
      
      // Check if the error has a specific type from our enhanced API error handling
      if (err.error && err.error.type) {
        const errorType = err.error.type;
        
        // Provide more user-friendly error messages based on error type
        if (errorType === 'Timeout') {
          setError("Our question generation service is taking longer than expected. Please try again in a moment.");
        } else if (errorType === 'Server Error') {
          setError("Our AI service is experiencing high demand. Please try again in a few minutes.");
        } else if (errorType === 'Not Found') {
          setError("The question generation service couldn't be reached. Please check your internet connection.");
        } else {
          setError(`${err.error.details || 'Failed to generate questions'}. Please try again.`);
        }
      } else if (err.message && err.message.includes('API call failed')) {
        // Handle API errors more gracefully
        if (err.message.includes('timeout')) {
          setError("Request timed out. Our servers might be experiencing high traffic. Please try again shortly.");
        } else if (err.message.includes('404')) {
          setError("The question generation service couldn't be found. Please try again later.");
        } else if (err.message.includes('500')) {
          setError("Our servers encountered an issue. Our team has been notified and is working on a fix.");
        } else {
          setError("Connection issue with our AI service. Please check your internet connection and try again.");
        }
      } else {
        // Default error message for other cases
        setError(err.message || "Failed to generate questions. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleQuestionSelect = (question) => {
    setSelectedQuestion(question);
    onQuestionSelected && onQuestionSelected(question);
  };

  const startInterview = () => {
    setViewMode("interview");
    setError("");
  };

  const handleInterviewComplete = (results) => {
    setInterviewResults(results);
    setViewMode("results");
  };

  const handleBackToQuestions = () => {
    setViewMode("list");
    setInterviewResults(null);
  };

  // Show interview session
  if (viewMode === "interview") {
    return (
      <InterviewSession 
        questions={questions}
        onComplete={handleInterviewComplete}
        onBack={handleBackToQuestions}
      />
    );
  }

  // Show interview results
  if (viewMode === "results" && interviewResults) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-white">
          Interview Analysis Complete
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg text-center">
            <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-400 mb-2">
              Average Sentiment
            </h3>
            <p className="text-3xl font-bold text-blue-900 dark:text-blue-300">
              {Math.round(interviewResults.reduce((sum, item) => sum + item.feedback.sentiment.pos, 0) / interviewResults.length * 100)}%
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">Positive tone</p>
          </div>
          
          <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg text-center">
            <h3 className="text-lg font-semibold text-green-800 dark:text-green-400 mb-2">
              Average Clarity
            </h3>
            <p className="text-3xl font-bold text-green-900 dark:text-green-300">
              {Math.round(interviewResults.reduce((sum, item) => sum + item.feedback.clarity_score, 0) / interviewResults.length * 100)}%
            </p>
            <p className="text-sm text-green-700 dark:text-green-400 mt-1">Speech clarity</p>
          </div>
          
          <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg text-center">
            <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-400 mb-2">
              Questions Completed
            </h3>
            <p className="text-3xl font-bold text-purple-900 dark:text-purple-300">
              {interviewResults.length}
            </p>
            <p className="text-sm text-purple-700 dark:text-purple-400 mt-1">Out of {questions.length}</p>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
            Detailed Feedback
          </h3>
          
          {interviewResults.map((result, index) => (
            <div key={result.questionId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 dark:text-white mb-2">
                Question {index + 1}: {result.questionText}
              </h4>
              
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded mb-4">
                <p className="text-gray-700 dark:text-gray-300 text-sm">
                  <strong>Your Answer:</strong> {result.answer.substring(0, 200)}
                  {result.answer.length > 200 && "..."}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
                  <p className="text-sm font-medium text-green-800 dark:text-green-400">
                    Sentiment: {Math.round(result.feedback.sentiment.pos * 100)}%
                  </p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-400">
                    Clarity: {Math.round(result.feedback.clarity_score * 100)}%
                  </p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded">
                  <p className="text-sm font-medium text-orange-800 dark:text-orange-400">
                    Filler Words: {Object.values(result.feedback.filler_words).reduce((a, b) => a + b, 0)}
                  </p>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Feedback:</strong> {result.feedback.overall_feedback}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex space-x-4 mt-8">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Start New Interview
          </button>
          <button
            onClick={handleBackToQuestions}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
          >
            Back to Questions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 w-full max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
          Mock Interview Questions
          {retryCount > 1 && <span className="ml-2 text-xs text-gray-400">(Attempt {retryCount})</span>}
        </h2>
        <button 
          onClick={generateQuestions} 
          disabled={loading}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            loading
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {loading ? "Generating..." : questions.length ? "Regenerate Questions" : "Generate Questions"}
        </button>
      </div>
      
      {error && (
        <ErrorDisplay
          message={error}
          title="Error Generating Questions"
          hint={error.includes('timeout') || error.includes('high demand') ? 
                "This is usually a temporary issue. Our systems might be experiencing high traffic." : 
                error.includes('internet') ? 
                "Please check your network connection and try again." : 
                "If this problem persists, please contact support."}
          showRetry={true}
          onRetry={generateQuestions}
        />
      )}
      
      {loading ? (
        <LoadingState message="Generating personalized interview questions..." />
      ) : questions.length > 0 ? (
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
            <h3 className="font-medium text-gray-800 dark:text-white mb-2">Your Interview is Ready!</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              We've generated {questions.length} questions based on your skills. You can review them below or start the full interview experience.
            </p>
            <button
              onClick={startInterview}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              🎤 Start Full Interview
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-full mb-4">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                Question Preview
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Here are the questions that will be asked during your interview:
              </p>
            </div>
            {questions.map((question, index) => (
              <div 
                key={index}
                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all"
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800 dark:text-white mb-1">
                      {question.questionText}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      {question.instruction}
                    </p>
                    <div className="flex space-x-2">
                      <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs">
                        {question.type}
                      </span>
                      <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs">
                        {question.difficulty}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : !loading && (
        <div className="text-center py-10">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-12 w-12 text-gray-400 mx-auto mb-4" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" 
            />
          </svg>
          <p className="text-gray-600 dark:text-gray-300">
            Click the button above to generate interview questions based on your CV.
          </p>
        </div>
      )}
    </div>
  );
}