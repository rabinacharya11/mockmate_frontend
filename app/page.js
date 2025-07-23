"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import AuthButton from "./components/AuthButton";
import CVUpload from "./components/CVUpload";
import QuestionList from "./components/QuestionList";
import ReportCharts from "./components/ReportCharts";
import { useAuth } from "./context/AuthContext";
import LoadingState from "./components/LoadingState";
import ErrorDisplay from "./components/ErrorDisplay";

export default function Home() {
  const { user, loading: authLoading, error: authError } = useAuth();
  const [activeTab, setActiveTab] = useState("home");
  const [skills, setSkills] = useState([]);
  
  // If user is logged in and has uploaded a CV, default to questions tab
  useEffect(() => {
    if (user && skills.length > 0) {
      setActiveTab("questions");
    } else if (user) {
      setActiveTab("upload");
    }
  }, [user, skills]);

  if (authLoading) {
    return <LoadingState message="Initializing MockMate..." fullPage />;
  }

  if (authError) {
    return (
      <div className="container mx-auto px-4 py-16">
        <ErrorDisplay 
          title="Authentication Error" 
          message={authError.message || "Failed to authenticate. Please try again later."} 
        />
      </div>
    );
  }

  return (
    <div className="font-sans min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header className="bg-white dark:bg-gray-800 shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            MockMate
          </h1>
          <AuthButton />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!user ? (
          // Landing page for non-authenticated users
          <LandingPage />
        ) : (
          // Application for authenticated users
          <div className="w-full">
            <nav className="mb-8">
              <ul className="flex border-b border-gray-200 dark:border-gray-700">
                <TabButton 
                  active={activeTab === "upload"} 
                  onClick={() => setActiveTab("upload")}
                  label="Upload CV"
                />
                <TabButton 
                  active={activeTab === "questions"} 
                  onClick={() => setActiveTab("questions")}
                  label="Interview Questions"
                  disabled={skills.length === 0}
                />
                <TabButton 
                  active={activeTab === "reports"} 
                  onClick={() => setActiveTab("reports")}
                  label="Performance Reports"
                />
              </ul>
            </nav>

            <div className="w-full">
              {activeTab === "upload" && (
                <CVUpload onSkillsExtracted={setSkills} />
              )}
              {activeTab === "questions" && (
                <QuestionList skills={skills} />
              )}
              {activeTab === "reports" && (
                <ReportCharts />
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-12">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-gray-600 dark:text-gray-400">
            © {new Date().getFullYear()} MockMate - Your AI Interview Preparation Assistant
          </p>
        </div>
      </footer>
    </div>
  );
}

function TabButton({ active, onClick, label, disabled = false }) {
  return (
    <li className="mr-2">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`inline-block py-4 px-4 text-sm font-medium ${
          active
            ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        } ${
          disabled
            ? "opacity-50 cursor-not-allowed"
            : "cursor-pointer"
        }`}
      >
        {label}
      </button>
    </li>
  );
}

function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12">
      <h1 className="text-5xl font-bold mb-6 text-gray-800 dark:text-white">
        MockMate
      </h1>
      <p className="text-xl mb-8 text-gray-600 dark:text-gray-300 max-w-2xl">
        Prepare for your next interview with AI-powered mock interviews tailored to your skills and experience.
      </p>
      
      <div className="mb-12">
        <button
          onClick={() => document.querySelector("[data-login-button]")?.click()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
        >
          Get Started
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
        <FeatureCard 
          icon="/file.svg"
          title="Resume Analysis"
          description="Upload your CV and get personalized interview questions based on your skills and experience."
        />
        <FeatureCard 
          icon="/globe.svg"
          title="Practice Interviews"
          description="Record your answers and receive detailed feedback on both verbal and non-verbal communication."
        />
        <FeatureCard 
          icon="/window.svg"
          title="Performance Reports"
          description="Track your progress with comprehensive analytics and actionable feedback."
        />
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
      <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-blue-100 dark:bg-blue-900 mx-auto">
        <Image src={icon} alt={title} width={24} height={24} className="dark:invert" />
      </div>
      <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-white">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300">{description}</p>
    </div>
  );
}
