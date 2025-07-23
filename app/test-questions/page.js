"use client";
import { useState } from "react";
import { generateQuestions } from "../lib/api";

export default function TestPage() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [source, setSource] = useState("");
  const [skillSet, setSkillSet] = useState("javascript"); // Default skill set
  
  const handleGenerateQuestions = async () => {
    setLoading(true);
    setError("");
    setSource("");
    
    try {
      let skills;
      
      // Determine which skills to use based on selected skill set
      if (skillSet === "flutter") {
        skills = ["Flutter", "Dart", "Firebase", "Clean Code", "TDD", "CI/CD", "Mentoring", "Project Management"];
      } else {
        skills = ["JavaScript", "React", "Node.js", "Testing"];
      }
      
      // Using test data with the selected skills
      const data = await generateQuestions({
        cv_data: `Test CV data for ${skillSet} developer`,
        skills: skills,
        question_count: 9
      });
      
      console.log("Generated questions:", data);
      setQuestions(data.questions || []);
      setSource(data.source || "unknown");
    } catch (err) {
      console.error("Error generating questions:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Question Generation Test</h1>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Skill Set:</label>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="javascript"
              checked={skillSet === "javascript"}
              onChange={() => setSkillSet("javascript")}
              className="mr-2"
            />
            JavaScript/React
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="flutter"
              checked={skillSet === "flutter"}
              onChange={() => setSkillSet("flutter")}
              className="mr-2"
            />
            Flutter/Dart
          </label>
        </div>
      </div>
      
      <button 
        onClick={handleGenerateQuestions}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300 hover:bg-blue-600"
      >
        {loading ? "Generating..." : "Generate Test Questions"}
      </button>
      
      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
          <p>Error: {error}</p>
        </div>
      )}
      
      {source && (
        <div className="mt-4 p-3 bg-blue-100 text-blue-700 rounded">
          <p>Source: {source}</p>
        </div>
      )}
      
      {questions.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-3">Generated Questions</h2>
          <div className="space-y-3">
            {questions.map((q, index) => (
              <div key={q.id || index} className="p-3 border rounded">
                <p className="font-medium">{q.questionText}</p>
                <p className="text-sm text-gray-600 mt-1">{q.instruction}</p>
                <div className="flex gap-2 mt-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    {q.type}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                    {q.difficulty}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
