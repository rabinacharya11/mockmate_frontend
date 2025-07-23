"use client";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import CVUpload from "../components/CVUpload";
import QuestionList from "../components/QuestionList";
import Recorder from "../components/Recorder";
import ReportCharts from "../components/ReportCharts";
import { redirect } from "next/navigation";

export default function Dashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("upload");
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  
  if (!user) {
    // Redirect to home if not logged in
    redirect("/");
    return null;
  }

  const tabs = [
    { id: "upload", label: "Upload CV" },
    { id: "interview", label: "Mock Interview" },
    { id: "reports", label: "Performance Reports" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">MockMate</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {user.photoURL && (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName} 
                  className="h-8 w-8 rounded-full"
                />
              )}
              <span className="text-sm text-gray-700 dark:text-gray-300">{user.displayName}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.id !== "interview") {
                      setSelectedQuestion(null);
                    }
                  }}
                  className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="mt-8">
          {activeTab === "upload" && <CVUpload />}
          
          {activeTab === "interview" && !selectedQuestion && (
            <QuestionList onQuestionSelected={setSelectedQuestion} />
          )}
          
          {activeTab === "interview" && selectedQuestion && (
            <div>
              <button 
                onClick={() => setSelectedQuestion(null)}
                className="mb-4 text-blue-600 dark:text-blue-400 flex items-center"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-4 w-4 mr-1" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M10 19l-7-7m0 0l7-7m-7 7h18" 
                  />
                </svg>
                Back to questions
              </button>
              <Recorder 
                question={selectedQuestion} 
                onFeedback={() => {}}
              />
            </div>
          )}
          
          {activeTab === "reports" && <ReportCharts />}
        </div>
      </main>
    </div>
  );
}
