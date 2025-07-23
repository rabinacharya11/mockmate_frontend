"use client";

import { useState } from 'react';
import { generateQuestions } from '../lib/api';

export default function TestQuestionsPage() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [debugInfo, setDebugInfo] = useState(null);

  async function testGeneration() {
    setLoading(true);
    setError("");
    setDebugInfo(null);
    
    try {
      // Test data with Flutter skills to match your example
      const testData = {
        cv_data: "This is cool",
        skills: ["Flutter", "Dart", "Firebase", "Clean Code", "TDD", "CI/CD", "Mentoring", "Project Management"],
        question_count: 3
      };
      
      console.log("Generating questions with test data:", testData);
      
      const result = await generateQuestions(testData);
      
      console.log("Question generation result:", result);
      
      if (result && result.questions && result.questions.length > 0) {
        setQuestions(result.questions);
        setDebugInfo({
          source: result.source || "API",
          count: result.questions.length,
          timestamp: result.generated || new Date().toISOString()
        });
      } else {
        setError("No questions were generated");
      }
    } catch (err) {
      console.error("Error in test:", err);
      setError(err.message || "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Question Generation Test</h1>
      
      <div className="mb-6">
        <button 
          onClick={testGeneration}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
        >
          {loading ? "Generating..." : "Generate Test Questions"}
        </button>
      </div>
      
      {error && (
        <div className="mb-6 p-4 border border-red-300 bg-red-50 text-red-800 rounded">
          <h3 className="font-bold mb-2">Error:</h3>
          <p>{error}</p>
        </div>
      )}
      
      {debugInfo && (
        <div className="mb-6 p-4 border border-blue-300 bg-blue-50 text-blue-800 rounded">
          <h3 className="font-bold mb-2">Debug Info:</h3>
          <p>Source: {debugInfo.source}</p>
          <p>Questions Count: {debugInfo.count}</p>
          <p>Generated: {debugInfo.timestamp}</p>
        </div>
      )}
      
      {questions.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">Generated Questions:</h2>
          <div className="space-y-4">
            {questions.map((q, index) => (
              <div key={q.id || index} className="p-4 border rounded">
                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-1">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-bold">{q.questionText}</p>
                    <p className="text-gray-600 italic mt-1">{q.instruction}</p>
                    <div className="mt-2 text-sm">
                      <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded mr-2">
                        Type: {q.type}
                      </span>
                      <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        Difficulty: {q.difficulty}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
