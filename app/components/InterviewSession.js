"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import { doc, updateDoc, arrayUnion, collection, addDoc, setDoc, getDoc } from "firebase/firestore";
import { getVerbalFeedback, getMultipleVerbalFeedback } from "../lib/api";
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
    // Check if we already have an answer for this question and replace it
    setAnswers(prev => {
      const existingIndex = prev.findIndex(answer => answer.questionText === answerData.questionText);
      
      if (existingIndex !== -1) {
        // Replace existing answer
        const updatedAnswers = [...prev];
        updatedAnswers[existingIndex] = answerData;
        console.log('Replaced existing answer for question:', answerData.questionText);
        return updatedAnswers;
      } else {
        // Add new answer
        console.log('Added new answer for question:', answerData.questionText);
        return [...prev, answerData];
      }
    });
  };

  // Helper function to analyze sentiment and provide insights
  const analyzeSentiment = (sentiment) => {
    const { neg, neu, pos, compound } = sentiment;
    
    let mood = 'neutral';
    let confidence = 'moderate';
    let insights = [];
    
    // Determine overall mood based on compound score
    if (compound >= 0.5) {
      mood = 'very positive';
      confidence = 'high';
    } else if (compound >= 0.1) {
      mood = 'positive';
      confidence = 'good';
    } else if (compound >= -0.1) {
      mood = 'neutral';
      confidence = 'moderate';
    } else if (compound >= -0.5) {
      mood = 'negative';
      confidence = 'concerning';
    } else {
      mood = 'very negative';
      confidence = 'low';
    }
    
    // Generate insights based on sentiment distribution
    if (pos > 0.3) {
      insights.push('Strong positive language detected');
    }
    if (neg > 0.1) {
      insights.push('Some negative language detected');
    }
    if (neu > 0.8) {
      insights.push('Very neutral tone - could be more expressive');
    }
    if (pos > neg * 2) {
      insights.push('Optimistic and confident communication style');
    }
    if (neg > pos) {
      insights.push('Consider using more positive language');
    }
    
    return {
      mood,
      confidence,
      insights,
      scores: { neg, neu, pos, compound }
    };
  };

  // Helper function to get clarity insights
  const getClarityInsights = (clarityScore) => {
    if (clarityScore >= 0.9) return { level: 'excellent', message: 'Extremely clear and well-structured' };
    if (clarityScore >= 0.8) return { level: 'very good', message: 'Clear and easy to understand' };
    if (clarityScore >= 0.7) return { level: 'good', message: 'Generally clear with minor improvements needed' };
    if (clarityScore >= 0.6) return { level: 'fair', message: 'Could be clearer and more structured' };
    return { level: 'needs improvement', message: 'Requires significant clarity improvements' };
  };

  // Helper function to analyze filler words
  const analyzeFillerWords = (fillerWords) => {
    const total = Object.values(fillerWords).reduce((sum, count) => sum + count, 0);
    const mostUsed = Object.entries(fillerWords)
      .filter(([word, count]) => count > 0)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);
    
    let level = 'excellent';
    let message = 'Minimal use of filler words';
    
    if (total > 10) {
      level = 'needs improvement';
      message = 'High usage of filler words detected';
    } else if (total > 5) {
      level = 'fair';  
      message = 'Moderate use of filler words';
    } else if (total > 2) {
      level = 'good';
      message = 'Low use of filler words';
    }
    
    return {
      total,
      level,
      message,
      mostUsed: mostUsed.map(([word, count]) => ({ word, count }))
    };
  };

  const submitInterview = async () => {
    setLoading(true);
    setError("");
    
    try {
      console.log('🚀 Starting interview completion with answers:', answers.length);
      
      // Prepare all questions and answers for batch feedback generation
      const questionsAndAnswers = answers.map(answer => ({
        questionText: answer.questionText,
        voiceConvertedToText: answer.answer
      }));
      
      console.log('📤 Generating feedback for all answers...');
      
      // Generate feedback for all answers at once using the multiple feedback API
      const feedbackResponse = await getMultipleVerbalFeedback(questionsAndAnswers);
      
      if (!feedbackResponse || !feedbackResponse.feedback || !Array.isArray(feedbackResponse.feedback)) {
        throw new Error('Invalid feedback response format');
      }
      
      console.log('✅ Raw feedback response:', feedbackResponse);
      
      // Process the API response format and combine with enhanced analysis
      const answersWithEnhancedFeedback = answers.map((answer, index) => {
        const apiFeedback = feedbackResponse.feedback[index];
        
        if (!apiFeedback) {
          console.warn(`No feedback received for question ${index + 1}`);
          return {
            question: answer.questionText,
            answer: answer.answer,
            feedback: {
              sentiment: { pos: 0.5, neg: 0.1, neu: 0.4, compound: 0.4 },
              clarity_score: 0.7,
              filler_words: {},
              overall_feedback: "Feedback analysis unavailable."
            },
            enhancedAnalysis: {
              sentimentAnalysis: { mood: 'neutral', confidence: 'moderate', insights: [] },
              clarityInsights: { level: 'fair', message: 'Analysis unavailable' },
              fillerAnalysis: { total: 0, level: 'unknown', message: 'Analysis unavailable', mostUsed: [] }
            },
            timestamp: answer.timestamp || new Date()
          };
        }
        
        // Use the actual API response format
        const sentimentAnalysis = analyzeSentiment(apiFeedback.sentiment);
        const clarityInsights = getClarityInsights(apiFeedback.clarity_score);
        const fillerAnalysis = analyzeFillerWords(apiFeedback.filler_words);
        
        return {
          question: apiFeedback.question || answer.questionText, // Use API question if available
          answer: apiFeedback.answer || answer.answer, // Use API answer if available
          feedback: {
            sentiment: apiFeedback.sentiment,
            clarity_score: apiFeedback.clarity_score,
            filler_words: apiFeedback.filler_words,
            overall_feedback: apiFeedback.overall_feedback
          },
          enhancedAnalysis: {
            sentimentAnalysis,
            clarityInsights,
            fillerAnalysis
          },
          timestamp: answer.timestamp || new Date()
        };
      });
      
      console.log('✅ Enhanced feedback generated for all answers:', answersWithEnhancedFeedback.length);
      
      // Calculate comprehensive session metrics
      const sessionEndTime = new Date();
      const sessionDuration = Math.round((sessionEndTime - sessionStartTime) / 1000);
      
      const sessionMetrics = {
        totalQuestions: sessionQuestions.length,
        totalAnswers: answersWithEnhancedFeedback.length,
        averageClarity: answersWithEnhancedFeedback.length > 0 
          ? answersWithEnhancedFeedback.reduce((sum, item) => sum + (item.feedback?.clarity_score || 0), 0) / answersWithEnhancedFeedback.length
          : 0,
        averageSentiment: answersWithEnhancedFeedback.length > 0
          ? answersWithEnhancedFeedback.reduce((sum, item) => sum + (item.feedback?.sentiment?.compound || 0), 0) / answersWithEnhancedFeedback.length
          : 0,
        totalFillerWords: answersWithEnhancedFeedback.reduce((sum, item) => {
          return sum + (item.enhancedAnalysis?.fillerAnalysis?.total || 0);
        }, 0),
        sessionDuration: sessionDuration,
        // Enhanced metrics
        sentimentDistribution: {
          positive: answersWithEnhancedFeedback.filter(item => item.enhancedAnalysis?.sentimentAnalysis?.mood?.includes('positive')).length,
          neutral: answersWithEnhancedFeedback.filter(item => item.enhancedAnalysis?.sentimentAnalysis?.mood === 'neutral').length,
          negative: answersWithEnhancedFeedback.filter(item => item.enhancedAnalysis?.sentimentAnalysis?.mood?.includes('negative')).length
        },
        clarityDistribution: {
          excellent: answersWithEnhancedFeedback.filter(item => item.enhancedAnalysis?.clarityInsights?.level === 'excellent').length,
          good: answersWithEnhancedFeedback.filter(item => ['very good', 'good'].includes(item.enhancedAnalysis?.clarityInsights?.level)).length,
          needsImprovement: answersWithEnhancedFeedback.filter(item => ['fair', 'needs improvement'].includes(item.enhancedAnalysis?.clarityInsights?.level)).length
        }
      };

      // Create session document for interview sessions collection
      const sessionData = {
        sessionId: `session_${Date.now()}`,
        userId: user.uid,
        createdAt: sessionStartTime,
        completedAt: sessionEndTime,
        duration: sessionDuration,
        questions: sessionQuestions,
        results: answersWithEnhancedFeedback.map(item => ({
          question: item.question,
          answer: item.answer,
          feedback: [item.feedback], // Reports.js expects feedback as an array
          enhancedAnalysis: item.enhancedAnalysis,
          timestamp: item.timestamp
        })),
        metrics: sessionMetrics,
        status: 'completed',
        questionCount: sessionQuestions.length
      };

      // Create enhanced feedback document for new feedback collection
      const feedbackData = {
        userId: user.uid,
        sessionId: sessionData.sessionId,
        createdAt: sessionStartTime,
        completedAt: sessionEndTime,
        questionsAndFeedback: answersWithEnhancedFeedback.map((item, index) => ({
          questionNumber: index + 1,
          questionId: sessionQuestions[index]?.id || `q${index + 1}`,
          questionText: item.question,
          questionType: sessionQuestions[index]?.type || 'general',
          questionDifficulty: sessionQuestions[index]?.difficulty || 'medium',
          userAnswer: item.answer,
          answerTimestamp: item.timestamp,
          feedbackAnalysis: {
            // Original API data
            sentiment: item.feedback.sentiment,
            clarityScore: item.feedback.clarity_score,
            fillerWords: item.feedback.filler_words,
            overallFeedback: item.feedback.overall_feedback,
            
            // Enhanced analysis
            sentimentAnalysis: item.enhancedAnalysis.sentimentAnalysis,
            clarityInsights: item.enhancedAnalysis.clarityInsights,
            fillerAnalysis: item.enhancedAnalysis.fillerAnalysis,
            
            analysisTimestamp: sessionEndTime
          }
        })),
        sessionMetrics: sessionMetrics,
        lastUpdated: sessionEndTime
      };

      // Store both documents in Firebase
      if (user) {
        // Store session in interview sessions collection
        const userRef = doc(db, "users", user.uid);
        const sessionsRef = collection(userRef, "interviewSessions");
        await addDoc(sessionsRef, sessionData);
        
        // Store feedback in new feedback collection with user ID as document ID
        const feedbackRef = doc(db, "interviewFeedback", user.uid);
        
        // Check if feedback document exists and update or create
        try {
          const existingFeedback = await getDoc(feedbackRef);
          if (existingFeedback.exists()) {
            // Update existing document by adding new session feedback
            await updateDoc(feedbackRef, {
              [`sessions.${sessionData.sessionId}`]: feedbackData,
              lastUpdated: sessionEndTime,
              totalSessions: (existingFeedback.data().totalSessions || 0) + 1
            });
          } else {
            // Create new feedback document
            await setDoc(feedbackRef, {
              userId: user.uid,
              totalSessions: 1,
              [`sessions.${sessionData.sessionId}`]: feedbackData,
              createdAt: sessionEndTime,
              lastUpdated: sessionEndTime
            });
          }
        } catch (feedbackError) {
          console.error('Error storing feedback:', feedbackError);
          // Continue even if feedback storage fails
        }
        
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
        
        console.log('📊 Session and enhanced feedback stored successfully:', sessionData.sessionId);
      }

      // Update the UI state with enhanced feedback
      setAllFeedback(answersWithEnhancedFeedback);
      setInterviewComplete(true);
      
      if (onComplete) {
        onComplete(answersWithEnhancedFeedback);
      }
      
    } catch (err) {
      console.error("❌ Error submitting interview:", err);
      setError(`Failed to complete interview: ${err.message}. Please try again.`);
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
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="font-medium text-blue-800 dark:text-blue-400">
                  Average Sentiment
                </h4>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">
                  {allFeedback.length > 0 
                    ? Math.round(((allFeedback.reduce((sum, item) => sum + (item.feedback?.sentiment?.compound || 0), 0) / allFeedback.length) + 1) / 2 * 100)
                    : 0}%
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {allFeedback.length > 0 && allFeedback[0]?.enhancedAnalysis?.sentimentAnalysis?.mood 
                    ? `Overall mood: ${allFeedback.reduce((prev, item) => {
                        const compound = item.feedback?.sentiment?.compound || 0;
                        return compound > prev.compound ? { mood: item.enhancedAnalysis?.sentimentAnalysis?.mood, compound } : prev;
                      }, { mood: 'neutral', compound: -2 }).mood}`
                    : 'Neutral tone'
                  }
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
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {allFeedback.length > 0 && allFeedback[0]?.enhancedAnalysis?.clarityInsights?.level
                    ? `Clarity: ${allFeedback.reduce((counts, item) => {
                        const level = item.enhancedAnalysis?.clarityInsights?.level || 'fair';
                        counts[level] = (counts[level] || 0) + 1;
                        return counts;
                      }, {})['excellent'] > 0 ? 'Excellent' : 'Good'}`
                    : 'Good structure'
                  }
                </p>
              </div>
              
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                <h4 className="font-medium text-purple-800 dark:text-purple-400">
                  Questions Answered
                </h4>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">
                  {allFeedback.length}
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                  Complete session
                </p>
              </div>

              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                <h4 className="font-medium text-orange-800 dark:text-orange-400">
                  Filler Words
                </h4>
                <p className="text-2xl font-bold text-orange-900 dark:text-orange-300">
                  {allFeedback.reduce((sum, item) => sum + (item.enhancedAnalysis?.fillerAnalysis?.total || 0), 0)}
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  {allFeedback.length > 0 && allFeedback[0]?.enhancedAnalysis?.fillerAnalysis?.level
                    ? `Level: ${allFeedback.reduce((prev, item) => {
                        const total = item.enhancedAnalysis?.fillerAnalysis?.total || 0;
                        return total > prev.total ? { level: item.enhancedAnalysis?.fillerAnalysis?.level, total } : prev;
                      }, { level: 'excellent', total: -1 }).level}`
                    : 'Good control'
                  }
                </p>
              </div>
            </div>

            {/* Enhanced Insights Section */}
            {allFeedback.length > 0 && allFeedback[0]?.enhancedAnalysis && (
              <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg">
                <h4 className="text-md font-semibold text-indigo-800 dark:text-indigo-400 mb-3">
                  🎯 AI-Powered Interview Insights
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium text-gray-800 dark:text-white mb-2">😊 Sentiment Analysis</h5>
                    <div className="space-y-1 text-sm">
                      {allFeedback.map((item, index) => {
                        const analysis = item.enhancedAnalysis?.sentimentAnalysis;
                        if (!analysis) return null;
                        
                        return (
                          <div key={index} className="flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                            <span className="text-gray-700 dark:text-gray-300">
                              Q{index + 1}: {analysis.mood} ({analysis.confidence} confidence)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-gray-800 dark:text-white mb-2">💡 Key Insights</h5>
                    <div className="space-y-1 text-sm">
                      {(() => {
                        const allInsights = allFeedback.flatMap(item => 
                          item.enhancedAnalysis?.sentimentAnalysis?.insights || []
                        );
                        const uniqueInsights = [...new Set(allInsights)].slice(0, 4);
                        
                        return uniqueInsights.map((insight, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                            <span className="text-gray-700 dark:text-gray-300">{insight}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}

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
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Clarity Score</p>
                      <p className="text-lg font-semibold text-blue-600">
                        {Math.round((item.feedback?.clarity_score || 0) * 100)}%
                      </p>
                      <p className="text-xs text-blue-500">
                        {item.enhancedAnalysis?.clarityInsights?.level || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Sentiment</p>
                      <p className="text-lg font-semibold text-green-600">
                        {item.feedback?.sentiment?.compound 
                          ? Math.round(((item.feedback.sentiment.compound + 1) / 2) * 100)
                          : 50}%
                      </p>
                      <p className="text-xs text-green-500">
                        {item.enhancedAnalysis?.sentimentAnalysis?.mood || 'neutral'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Filler Words</p>
                      <p className="text-lg font-semibold text-orange-600">
                        {item.enhancedAnalysis?.fillerAnalysis?.total || 0}
                      </p>
                      <p className="text-xs text-orange-500">
                        {item.enhancedAnalysis?.fillerAnalysis?.level || 'good'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Confidence</p>
                      <p className="text-lg font-semibold text-purple-600">
                        {item.enhancedAnalysis?.sentimentAnalysis?.confidence || 'moderate'}
                      </p>
                      <p className="text-xs text-purple-500">
                        {item.feedback?.sentiment?.pos > 0.3 ? 'high' : 'moderate'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Enhanced Analysis Display */}
                  {item.enhancedAnalysis && (
                    <div className="mb-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sentiment Breakdown</p>
                          <div className="flex space-x-2 text-xs">
                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                              Pos: {Math.round((item.feedback?.sentiment?.pos || 0) * 100)}%
                            </span>
                            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              Neu: {Math.round((item.feedback?.sentiment?.neu || 0) * 100)}%
                            </span>
                            <span className="bg-red-100 text-red-700 px-2 py-1 rounded">
                              Neg: {Math.round((item.feedback?.sentiment?.neg || 0) * 100)}%
                            </span>
                          </div>
                        </div>
                        
                        {item.enhancedAnalysis.fillerAnalysis?.mostUsed?.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Top Filler Words</p>
                            <div className="flex space-x-2 text-xs">
                              {item.enhancedAnalysis.fillerAnalysis.mostUsed.slice(0, 3).map((filler, idx) => (
                                <span key={idx} className="bg-orange-100 text-orange-700 px-2 py-1 rounded">
                                  {filler.word}: {filler.count}x
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Insights */}
                      {item.enhancedAnalysis.sentimentAnalysis?.insights?.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">AI Insights</p>
                          <div className="space-y-1">
                            {item.enhancedAnalysis.sentimentAnalysis.insights.slice(0, 2).map((insight, idx) => (
                              <div key={idx} className="flex items-center space-x-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                                <span className="text-xs text-gray-600 dark:text-gray-400">{insight}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
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

      {/* Loading State for Interview Completion */}
      {loading && (
        <div className="mb-6 p-4 border border-blue-200 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
            <p className="text-blue-800 dark:text-blue-300">
              🤖 Analyzing all your answers and generating comprehensive feedback...
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

      {/* Progress Indicator */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-800 dark:text-blue-300 font-medium">
              📝 Answers Collected: {answers.length} / {sessionQuestions.length}
            </p>
            <p className="text-blue-600 dark:text-blue-400 text-sm">
              {answers.length === sessionQuestions.length 
                ? "✅ All questions answered! Ready to generate feedback." 
                : "Continue answering questions. Feedback will be generated at the end."}
            </p>
          </div>
          {answers.length === sessionQuestions.length && (
            <div className="text-green-600">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
      </div>

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
