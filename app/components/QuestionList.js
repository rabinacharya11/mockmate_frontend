"use client";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { generateQuestions } from "../lib/api";

export default function QuestionList({ questionCount = 6, onQuestionSelected }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const { user } = useAuth();

  const generateQuestions = async () => {
    if (!user) return;
    
    setLoading(true);
    setError("");
    
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        throw new Error("User data not found");
      }
      
      const userData = userSnap.data();
      
      if (!userData.cv_data || !userData.skills) {
        throw new Error("CV data not found. Please upload your CV first.");
      }
      
      const { cv_data, skills } = userData;

      const data = await generateQuestions({
        cv_data,
        skills,
        question_count: questionCount,
      });
      
      setQuestions(data.questions);

      // Store questions in Firestore
      await updateDoc(userRef, { 
        questions: data.questions,
        lastInterviewDate: new Date() 
      });
      
    } catch (err) {
      console.error("Error generating questions:", err);
      setError(err.message || "Failed to generate questions. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleQuestionSelect = (question) => {
    setSelectedQuestion(question);
    onQuestionSelected && onQuestionSelected(question);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 w-full max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Mock Interview Questions</h2>
        <button 
          onClick={generateQuestions} 
          disabled={loading}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            loading
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {loading ? "Generating..." : questions.length ? "Regenerate Questions" : "Start Mock Interview"}
        </button>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {questions.length > 0 ? (
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300 mb-2">
            Select a question to begin answering:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {questions.map((question, index) => (
              <div 
                key={index}
                onClick={() => handleQuestionSelect(question)}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedQuestion === question
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                    : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700"
                }`}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800 dark:text-white mb-1">
                      {question.questionText}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {question.questionType}
                    </p>
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