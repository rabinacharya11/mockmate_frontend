"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import CVUpload from "../components/CVUpload";
import QuestionList from "../components/QuestionList";
import InterviewSession from "../components/InterviewSession";
import Reports from "../components/Reports";
import InterviewFeedbackManager from "../components/InterviewFeedbackManager";
import { redirect } from "next/navigation";

export default function Dashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("upload");
  const [skills, setSkills] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [showInterview, setShowInterview] = useState(false);
  
  if (!user) {
    // Redirect to home if not logged in
    redirect("/");
    return null;
  }

  // Listen for interview start event
  useEffect(() => {
    const handleStartInterview = () => {
      setShowInterview(true);
      setActiveTab("interview");
    };

    window.addEventListener('startInterview', handleStartInterview);
    return () => window.removeEventListener('startInterview', handleStartInterview);
  }, []);

  const handleSkillsExtracted = (extractedSkills) => {
    setSkills(extractedSkills);
    // Show success message and enable interview tab
    console.log("Skills extracted:", extractedSkills);
  };

  const handleQuestionsGenerated = (generatedQuestions) => {
    setQuestions(generatedQuestions);
    console.log("Questions generated:", generatedQuestions);
  };

  const handleStartInterview = (interviewQuestions) => {
    setQuestions(interviewQuestions);
    setShowInterview(true);
  };

  const handleInterviewComplete = () => {
    setShowInterview(false);
    setActiveTab("feedback");
  };

  const tabs = [
    { id: "upload", label: "Upload CV", icon: "📄" },
    { id: "interview", label: "Mock Interview", icon: "🎤", disabled: skills.length === 0 },
    { id: "reports", label: "Performance Reports", icon: "📊" },
    { id: "feedback", label: "Detailed Feedback", icon: "🤖" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">🎯</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">MockMate</h1>
          </div>
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
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center space-x-2 ${activeTab === 'upload' ? 'text-blue-600' : skills.length > 0 ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                skills.length > 0 ? 'bg-green-100 text-green-600' : activeTab === 'upload' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
              }`}>
                1
              </div>
              <span className="hidden md:block text-sm font-medium">Upload CV</span>
            </div>
            
            <div className={`w-8 h-1 ${skills.length > 0 ? 'bg-green-400' : 'bg-gray-200'}`}></div>
            
            <div className={`flex items-center space-x-2 ${activeTab === 'interview' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                activeTab === 'interview' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
              }`}>
                2
              </div>
              <span className="hidden md:block text-sm font-medium">Mock Interview</span>
            </div>
            
            <div className={`w-8 h-1 ${activeTab === 'reports' ? 'bg-blue-400' : 'bg-gray-200'}`}></div>
            
            <div className={`flex items-center space-x-2 ${activeTab === 'reports' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                activeTab === 'reports' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
              }`}>
                3
              </div>
              <span className="hidden md:block text-sm font-medium">View Reports</span>
            </div>

            <div className={`w-8 h-1 ${activeTab === 'feedback' ? 'bg-blue-400' : 'bg-gray-200'}`}></div>
            
            <div className={`flex items-center space-x-2 ${activeTab === 'feedback' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                activeTab === 'feedback' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
              }`}>
                4
              </div>
              <span className="hidden md:block text-sm font-medium">AI Feedback</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.disabled) return;
                    setActiveTab(tab.id);
                    if (tab.id !== "interview") {
                      setShowInterview(false);
                    }
                  }}
                  disabled={tab.disabled}
                  className={`py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors ${
                    tab.disabled
                      ? "border-transparent text-gray-300 cursor-not-allowed dark:text-gray-600"
                      : activeTab === tab.id
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                  {tab.disabled && (
                    <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                      Upload CV first
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-8">
          {activeTab === "upload" && (
            <CVUpload 
              onSkillsExtracted={handleSkillsExtracted}
              onStartInterview={() => {
                setShowInterview(true);
                setActiveTab("interview");
              }}
            />
          )}
          
          {activeTab === "interview" && !showInterview && (
            <QuestionList 
              skills={skills}
              questionCount={5}
              onQuestionsGenerated={handleQuestionsGenerated}
              onStartInterview={handleStartInterview}
            />
          )}
          
          {activeTab === "interview" && showInterview && (
            <InterviewSession
              questions={questions}
              onComplete={handleInterviewComplete}
              onBack={() => setShowInterview(false)}
            />
          )}
          
          {activeTab === "reports" && <Reports />}
          
          {activeTab === "feedback" && <InterviewFeedbackManager />}
        </div>
      </main>
    </div>
  );
}
