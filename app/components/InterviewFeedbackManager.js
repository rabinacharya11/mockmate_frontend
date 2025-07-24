"use client";
import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { doc, getDoc, collection, query, orderBy, getDocs } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import LoadingState from "./LoadingState";
import ErrorDisplay from "./ErrorDisplay";

export default function InterviewFeedbackManager() {
  const [feedbackData, setFeedbackData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadUserFeedback();
    }
  }, [user]);

  const loadUserFeedback = async () => {
    try {
      setLoading(true);
      setError("");

      // Load feedback data from the new collection
      const feedbackRef = doc(db, "interviewFeedback", user.uid);
      const feedbackSnap = await getDoc(feedbackRef);

      if (feedbackSnap.exists()) {
        const data = feedbackSnap.data();
        setFeedbackData(data);

        // Extract sessions data
        const sessionsData = [];
        if (data.sessions) {
          Object.entries(data.sessions).forEach(([sessionId, sessionData]) => {
            sessionsData.push({
              id: sessionId,
              ...sessionData
            });
          });
        }

        // Sort sessions by completion date (newest first)
        sessionsData.sort((a, b) => {
          const dateA = a.completedAt?.toDate ? a.completedAt.toDate() : new Date(a.completedAt);
          const dateB = b.completedAt?.toDate ? b.completedAt.toDate() : new Date(b.completedAt);
          return dateB - dateA;
        });

        setSessions(sessionsData);
        
        // Select the most recent session by default
        if (sessionsData.length > 0) {
          setSelectedSessionId(sessionsData[0].sessionId);
        }
      } else {
        setError("No feedback data found. Complete an interview to see feedback here.");
      }
    } catch (err) {
      console.error("Error loading feedback:", err);
      setError("Failed to load feedback data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getSelectedSession = () => {
    return sessions.find(session => session.sessionId === selectedSessionId);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const calculateSessionAverages = (session) => {
    if (!session || !session.questionsAndFeedback) return { clarity: 0, sentiment: 0 };
    
    const feedback = session.questionsAndFeedback;
    const claritySum = feedback.reduce((sum, item) => sum + (item.feedbackAnalysis?.clarityScore || 0), 0);
    const sentimentSum = feedback.reduce((sum, item) => sum + (item.feedbackAnalysis?.sentiment?.compound || 0), 0);
    
    return {
      clarity: Math.round((claritySum / feedback.length) * 100),
      sentiment: Math.round((((sentimentSum / feedback.length) + 1) / 2) * 100)
    };
  };

  if (loading) {
    return <LoadingState message="Loading your interview feedback..." />;
  }

  if (error) {
    return <ErrorDisplay message={error} onRetry={loadUserFeedback} />;
  }

  if (!feedbackData || sessions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
        <div className="text-gray-400 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">No Feedback Available</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Complete some interview sessions to see detailed feedback analysis here.
        </p>
      </div>
    );
  }

  const selectedSession = getSelectedSession();
  const averages = selectedSession ? calculateSessionAverages(selectedSession) : { clarity: 0, sentiment: 0 };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Sessions</p>
              <p className="text-2xl font-semibold text-gray-800 dark:text-white">{feedbackData.totalSessions || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Session Clarity</p>
              <p className="text-2xl font-semibold text-gray-800 dark:text-white">{averages.clarity}%</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.5a2.5 2.5 0 000-5H9m4 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Session Sentiment</p>
              <p className="text-2xl font-semibold text-gray-800 dark:text-white">{averages.sentiment}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Session Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Select Interview Session</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((session) => (
            <div
              key={session.sessionId}
              onClick={() => setSelectedSessionId(session.sessionId)}
              className={`p-4 rounded-lg cursor-pointer transition-colors ${
                selectedSessionId === session.sessionId
                  ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-700'
                  : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border-2 border-transparent'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-800 dark:text-white">
                    {formatDate(session.completedAt).split(' ')[0]}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {session.questionsAndFeedback?.length || 0} questions
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-800 dark:text-white">
                    {formatDate(session.completedAt).split(' ')[1]}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Feedback for Selected Session */}
      {selectedSession && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">
            📋 Detailed Feedback - {formatDate(selectedSession.completedAt)}
          </h3>
          
          <div className="space-y-6">
            {selectedSession.questionsAndFeedback?.map((item, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <div className="flex items-start mb-4">
                  <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full w-8 h-8 flex items-center justify-center mr-4">
                    {item.questionNumber}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800 dark:text-white mb-2">
                      {item.questionText}
                    </h4>
                    <div className="flex space-x-2 mb-3">
                      <span className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs">
                        Type: {item.questionType}
                      </span>
                      <span className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs">
                        Difficulty: {item.questionDifficulty}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="ml-12">
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Your Answer:</p>
                    <p className="text-gray-800 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      {item.userAnswer}
                    </p>
                  </div>
                  
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Clarity Score</p>
                          <p className="text-lg font-semibold text-blue-600">
                            {Math.round((item.feedbackAnalysis?.clarityScore || 0) * 100)}%
                          </p>
                          <p className="text-xs text-blue-500">
                            {item.feedbackAnalysis?.clarityInsights?.level || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Sentiment</p>
                          <p className="text-lg font-semibold text-green-600">
                            {item.feedbackAnalysis?.sentiment?.compound 
                              ? Math.round(((item.feedbackAnalysis.sentiment.compound + 1) / 2) * 100)
                              : 50}%
                          </p>
                          <p className="text-xs text-green-500">
                            {item.feedbackAnalysis?.sentimentAnalysis?.mood || 'neutral'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Filler Words</p>
                          <p className="text-lg font-semibold text-orange-600">
                            {item.feedbackAnalysis?.fillerAnalysis?.total || 
                             (item.feedbackAnalysis?.fillerWords 
                               ? Object.values(item.feedbackAnalysis.fillerWords).reduce((a, b) => a + b, 0)
                               : 0)}
                          </p>
                          <p className="text-xs text-orange-500">
                            {item.feedbackAnalysis?.fillerAnalysis?.level || 'good'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Confidence</p>
                          <p className="text-lg font-semibold text-purple-600">
                            {item.feedbackAnalysis?.sentimentAnalysis?.confidence || 'moderate'}
                          </p>
                          <p className="text-xs text-purple-500">
                            {item.feedbackAnalysis?.sentiment?.pos > 0.3 ? 'high' : 'moderate'}
                          </p>
                        </div>
                      </div>

                      {/* Enhanced Analysis Display */}
                      {item.feedbackAnalysis?.sentimentAnalysis && (
                        <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-lg">
                          <h6 className="font-medium text-gray-800 dark:text-white mb-2">🔍 Advanced Analysis</h6>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Sentiment Breakdown</p>
                              <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-green-600">Positive</span>
                                  <span className="text-xs font-semibold">{Math.round((item.feedbackAnalysis.sentiment?.pos || 0) * 100)}%</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-gray-600">Neutral</span>
                                  <span className="text-xs font-semibold">{Math.round((item.feedbackAnalysis.sentiment?.neu || 0) * 100)}%</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-red-600">Negative</span>
                                  <span className="text-xs font-semibold">{Math.round((item.feedbackAnalysis.sentiment?.neg || 0) * 100)}%</span>
                                </div>
                                <div className="flex justify-between items-center border-t pt-1">
                                  <span className="text-xs font-medium text-gray-700">Compound</span>
                                  <span className="text-xs font-bold">{(item.feedbackAnalysis.sentiment?.compound || 0).toFixed(3)}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Key Insights</p>
                              <div className="space-y-1">
                                {item.feedbackAnalysis.sentimentAnalysis?.insights?.slice(0, 3).map((insight, idx) => (
                                  <div key={idx} className="flex items-start space-x-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1"></span>
                                    <span className="text-xs text-gray-600 dark:text-gray-400">{insight}</span>
                                  </div>
                                ))}
                                
                                {item.feedbackAnalysis.fillerAnalysis?.mostUsed?.length > 0 && (
                                  <div className="mt-2 pt-2 border-t">
                                    <p className="text-xs font-medium text-gray-500 mb-1">Most Used Fillers</p>
                                    <div className="flex flex-wrap gap-1">
                                      {item.feedbackAnalysis.fillerAnalysis.mostUsed.slice(0, 3).map((filler, idx) => (
                                        <span key={idx} className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs">
                                          {filler.word}: {filler.count}x
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}                  <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">🤖 AI Feedback Analysis</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {item.feedbackAnalysis?.overallFeedback || "No feedback available"}
                    </p>
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
