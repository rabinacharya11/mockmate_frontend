"use client";
import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import LoadingState from "./LoadingState";
import ErrorDisplay from "./ErrorDisplay";
import { Bar, Line, Pie, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadReports();
    }
  }, [user]);

  const loadReports = async () => {
    try {
      setLoading(true);
      
      // Load interview sessions from Firebase
      const userRef = doc(db, "users", user.uid);
      const sessionsRef = collection(userRef, "interviewSessions");
      const q = query(sessionsRef, orderBy("createdAt", "desc"), limit(10));
      
      const querySnapshot = await getDocs(q);
      const sessions = [];
      
      querySnapshot.forEach((doc) => {
        sessions.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        });
      });
      
      setReports(sessions);
      if (sessions.length > 0) {
        setSelectedReport(sessions[0]);
      }
    } catch (err) {
      console.error("Error loading reports:", err);
      setError("Failed to load interview reports");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to calculate average scores
  const calculateAverageScores = (sessions) => {
    if (!sessions.length) return { clarity: 0, sentiment: 0 };
    
    let totalClarity = 0;
    let totalSentiment = 0;
    let totalAnswers = 0;
    
    sessions.forEach(session => {
      if (session.results && session.results.length) {
        session.results.forEach(result => {
          if (result.feedback && result.feedback.length) {
            result.feedback.forEach(feedback => {
              totalClarity += feedback.clarity_score || 0;
              totalSentiment += feedback.sentiment?.compound || 0;
              totalAnswers++;
            });
          }
        });
      }
    });
    
    return {
      clarity: totalAnswers > 0 ? (totalClarity / totalAnswers * 100) : 0,
      sentiment: totalAnswers > 0 ? ((totalSentiment + 1) / 2 * 100) : 50
    };
  };

  // Chart data for performance over time
  const getPerformanceChartData = () => {
    const last7Sessions = reports.slice(0, 7).reverse();
    
    const labels = last7Sessions.map((session, index) => 
      session.createdAt ? session.createdAt.toLocaleDateString() : `Session ${index + 1}`
    );
    
    const clarityData = last7Sessions.map(session => {
      if (!session.results) return 0;
      
      let totalClarity = 0;
      let count = 0;
      
      session.results.forEach(result => {
        if (result.feedback && result.feedback.length) {
          result.feedback.forEach(feedback => {
            totalClarity += feedback.clarity_score || 0;
            count++;
          });
        }
      });
      
      return count > 0 ? (totalClarity / count * 100) : 0;
    });
    
    const sentimentData = last7Sessions.map(session => {
      if (!session.results) return 50;
      
      let totalSentiment = 0;
      let count = 0;
      
      session.results.forEach(result => {
        if (result.feedback && result.feedback.length) {
          result.feedback.forEach(feedback => {
            totalSentiment += feedback.sentiment?.compound || 0;
            count++;
          });
        }
      });
      
      return count > 0 ? ((totalSentiment / count + 1) / 2 * 100) : 50;
    });

    return {
      labels,
      datasets: [
        {
          label: 'Clarity Score (%)',
          data: clarityData,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Sentiment Score (%)',
          data: sentimentData,
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          fill: true,
          tension: 0.4
        }
      ]
    };
  };

  // Chart data for filler words analysis
  const getFillerWordsChartData = () => {
    if (!selectedReport || !selectedReport.results) return null;
    
    const fillerWordsCount = {};
    
    selectedReport.results.forEach(result => {
      if (result.feedback && result.feedback.length) {
        result.feedback.forEach(feedback => {
          if (feedback.filler_words) {
            Object.entries(feedback.filler_words).forEach(([word, count]) => {
              fillerWordsCount[word] = (fillerWordsCount[word] || 0) + count;
            });
          }
        });
      }
    });
    
    const labels = Object.keys(fillerWordsCount);
    const data = Object.values(fillerWordsCount);
    
    if (labels.length === 0) return null;

    return {
      labels,
      datasets: [
        {
          label: 'Filler Words Count',
          data,
          backgroundColor: [
            'rgba(255, 99, 132, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 205, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)',
            'rgba(255, 159, 64, 0.8)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 205, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)'
          ],
          borderWidth: 1
        }
      ]
    };
  };

  // Chart data for skills radar
  const getSkillsRadarData = () => {
    if (!selectedReport || !selectedReport.results) return null;
    
    // Extract skills performance from questions and feedback
    const skillsPerformance = {};
    
    selectedReport.results.forEach(result => {
      if (result.question && result.feedback && result.feedback.length) {
        // Extract skill from question (simple approach)
        const questionText = result.question.toLowerCase();
        let skill = 'Communication';
        
        if (questionText.includes('technical') || questionText.includes('programming') || questionText.includes('code')) {
          skill = 'Technical';
        } else if (questionText.includes('leadership') || questionText.includes('manage') || questionText.includes('team')) {
          skill = 'Leadership';
        } else if (questionText.includes('problem') || questionText.includes('solve') || questionText.includes('analytical')) {
          skill = 'Problem Solving';
        } else if (questionText.includes('project') || questionText.includes('plan') || questionText.includes('organize')) {
          skill = 'Project Management';
        }
        
        result.feedback.forEach(feedback => {
          if (!skillsPerformance[skill]) {
            skillsPerformance[skill] = { total: 0, count: 0 };
          }
          skillsPerformance[skill].total += (feedback.clarity_score || 0) * 100;
          skillsPerformance[skill].count++;
        });
      }
    });
    
    const labels = Object.keys(skillsPerformance);
    const data = labels.map(skill => 
      skillsPerformance[skill].count > 0 
        ? skillsPerformance[skill].total / skillsPerformance[skill].count 
        : 0
    );
    
    if (labels.length === 0) return null;

    return {
      labels,
      datasets: [
        {
          label: 'Skills Performance (%)',
          data,
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 2,
          pointBackgroundColor: 'rgb(59, 130, 246)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgb(59, 130, 246)'
        }
      ]
    };
  };

  const averageScores = calculateAverageScores(reports);

  if (loading) {
    return <LoadingState message="Loading your interview reports..." />;
  }

  if (error) {
    return <ErrorDisplay message={error} onRetry={loadReports} />;
  }

  if (reports.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
        <div className="text-gray-400 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">No Interview Reports Yet</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Complete some interview sessions to see your performance analytics here.
        </p>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('startInterview'))}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
        >
          Start Your First Interview
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Sessions</p>
              <p className="text-2xl font-semibold text-gray-800 dark:text-white">{reports.length}</p>
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
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Clarity</p>
              <p className="text-2xl font-semibold text-gray-800 dark:text-white">{averageScores.clarity.toFixed(1)}%</p>
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
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Sentiment</p>
              <p className="text-2xl font-semibold text-gray-800 dark:text-white">{averageScores.sentiment.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Over Time Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Performance Over Time</h3>
        <div className="h-64">
          <Line 
            data={getPerformanceChartData()} 
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'top' },
                title: { display: false }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  max: 100,
                  ticks: {
                    callback: function(value) {
                      return value + '%';
                    }
                  }
                }
              }
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Session Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Select Interview Session</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {reports.map((report) => (
              <div
                key={report.id}
                onClick={() => setSelectedReport(report)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedReport?.id === report.id 
                    ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700' 
                    : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">
                      {report.createdAt.toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {report.results?.length || 0} questions answered
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-800 dark:text-white">
                      {report.createdAt.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filler Words Chart */}
        {getFillerWordsChartData() && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Filler Words Analysis</h3>
            <div className="h-64">
              <Bar 
                data={getFillerWordsChartData()} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    title: { display: false }
                  },
                  scales: {
                    y: { beginAtZero: true }
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Skills Radar Chart */}
      {getSkillsRadarData() && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Skills Performance Radar</h3>
          <div className="h-64 flex justify-center">
            <Radar 
              data={getSkillsRadarData()} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'top' },
                  title: { display: false }
                },
                scales: {
                  r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                      callback: function(value) {
                        return value + '%';
                      }
                    }
                  }
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Detailed Session Report */}
      {selectedReport && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Session Details - {selectedReport.createdAt.toLocaleDateString()}
          </h3>
          
          {selectedReport.results && selectedReport.results.length > 0 ? (
            <div className="space-y-4">
              {selectedReport.results.map((result, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 dark:text-white mb-2">
                    Question {index + 1}: {result.question}
                  </h4>
                  
                  {result.feedback && result.feedback.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Your Answer:</strong> {result.feedback[0].answer}
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Clarity Score</p>
                          <p className="text-lg font-semibold text-blue-600">
                            {(result.feedback[0].clarity_score * 100).toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Sentiment</p>
                          <p className="text-lg font-semibold text-green-600">
                            {result.feedback[0].sentiment?.compound 
                              ? ((result.feedback[0].sentiment.compound + 1) / 2 * 100).toFixed(1) 
                              : 'N/A'}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Filler Words</p>
                          <p className="text-lg font-semibold text-orange-600">
                            {result.feedback[0].filler_words 
                              ? Object.values(result.feedback[0].filler_words).reduce((a, b) => a + b, 0)
                              : 0}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Feedback</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {result.feedback[0].overall_feedback}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No detailed feedback available for this session.</p>
          )}
        </div>
      )}
    </div>
  );
}
