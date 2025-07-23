"use client";
import { useState, useEffect } from "react";
import { useAuth } from "./context/AuthContext";
import AuthButton from "./components/AuthButton";
import LoadingState from "./components/LoadingState";
import ErrorDisplay from "./components/ErrorDisplay";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Home() {
  const { user, loading: authLoading, error: authError } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (user) {
      // Redirect authenticated users to dashboard
      router.push("/dashboard");
    }
  }, [user, router]);

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

  // If user is authenticated, don't show landing page content
  if (user) {
    return <LoadingState message="Redirecting to dashboard..." fullPage />;
  }

  return (
    <div className="font-sans min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header className="bg-white dark:bg-gray-800 shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">🎯</div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              MockMate
            </h1>
          </div>
          <AuthButton />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <LandingPage />
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

function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12">
      <div className="text-6xl mb-6">🎯</div>
      <h1 className="text-5xl font-bold mb-6 text-gray-800 dark:text-white">
        MockMate
      </h1>
      <p className="text-xl mb-8 text-gray-600 dark:text-gray-300 max-w-2xl">
        Prepare for your next interview with AI-powered mock interviews tailored to your skills and experience.
      </p>
      
      <div className="mb-12">
        <AuthButton className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
        <FeatureCard 
          icon="📄"
          title="Resume Analysis"
          description="Upload your CV and get personalized interview questions based on your skills and experience."
        />
        <FeatureCard 
          icon="🎤"
          title="Practice Interviews"
          description="Record your answers and receive detailed feedback on clarity, sentiment, and communication skills."
        />
        <FeatureCard 
          icon="📊"
          title="Performance Reports"
          description="Track your progress with comprehensive analytics and actionable feedback to improve your interview skills."
        />
      </div>

      {/* How it Works Section */}
      <div className="mt-16 w-full max-w-4xl">
        <h2 className="text-3xl font-bold mb-8 text-gray-800 dark:text-white">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StepCard 
            step="1"
            title="Sign Up"
            description="Create your account with Google authentication"
          />
          <StepCard 
            step="2"
            title="Upload CV"
            description="Upload your resume and we'll extract your skills automatically"
          />
          <StepCard 
            step="3"
            title="Mock Interview"
            description="Answer AI-generated questions based on your profile"
          />
          <StepCard 
            step="4"
            title="Get Feedback"
            description="Receive detailed analysis and improvement suggestions"
          />
        </div>
      </div>

      {/* Features Section */}
      <div className="mt-16 w-full max-w-4xl">
        <h2 className="text-3xl font-bold mb-8 text-gray-800 dark:text-white">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="text-left">
            <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">🤖 AI-Powered Question Generation</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Our AI analyzes your CV and generates relevant interview questions based on your skills, experience, and industry.
            </p>
          </div>
          <div className="text-left">
            <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">🎯 Real-time Feedback</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Get instant analysis of your answers including sentiment analysis, clarity scoring, and filler word detection.
            </p>
          </div>
          <div className="text-left">
            <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">📈 Progress Tracking</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Monitor your improvement over time with detailed charts and analytics showing your interview performance trends.
            </p>
          </div>
          <div className="text-left">
            <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">🔒 Secure & Private</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Your data is securely stored with Firebase and Google authentication. We prioritize your privacy and data security.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-white">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300">{description}</p>
    </div>
  );
}

function StepCard({ step, title, description }) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-4">
        {step}
      </div>
      <h3 className="font-semibold mb-2 text-gray-800 dark:text-white">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
    </div>
  );
}
