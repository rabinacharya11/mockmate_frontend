"use client";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Pie, Bar } from "react-chartjs-2";
import Chart from "chart.js/auto";
import { 
  prepareSentimentChartData, 
  prepareClarityChartData, 
  prepareFillerWordsChartData,
  formatTimestamp,
  generatePerformanceSummary
} from "../lib/chartUtils";

export default function ReportCharts() {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const fetchFeedback = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        const data = userSnap.data();
        
        if (data && data.interviewFeedback && data.interviewFeedback.length > 0) {
          setFeedbacks(data.interviewFeedback);
          setSummary(generatePerformanceSummary(data.interviewFeedback));
          
          // Prepare chart data
          window.sentimentChartData = prepareSentimentChartData(data.interviewFeedback);
          window.clarityChartData = prepareClarityChartData(data.interviewFeedback);
          window.fillerWordsChartData = prepareFillerWordsChartData(data.interviewFeedback);
        } else {
          setFeedbacks([]);
          setError("No feedback data available yet. Complete some interview questions to see your performance analytics.");
        }
      } catch (err) {
        console.error("Error fetching feedback:", err);
        setError("Failed to load feedback data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchFeedback();
  }, [user]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-300">Loading your interview performance data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="text-center py-8">
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
            />
          </svg>
          <p className="text-gray-600 dark:text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  // Get chart data from utility functions
  const sentimentChartData = prepareSentimentChartData(feedbacks);
  const clarityChartData = prepareClarityChartData(feedbacks);
  const fillerWordsChartData = prepareFillerWordsChartData(feedbacks);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 w-full">
      <h2 className="text-xl font-semibold mb-6 text-gray-800 dark:text-white">Interview Performance Analytics</h2>
      
      {loading ? (
        <LoadingState message="Loading your interview performance data..." />
      ) : error ? (
        <ErrorDisplay 
          message={error} 
          title="Could Not Load Reports"
          showRetry={true}
          onRetry={() => window.location.reload()}
        />
      ) : feedbacks.length === 0 ? (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-white">No Interview Data Yet</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Complete some interview questions to see your performance analytics here.
          </p>
        </div>
      ) : (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-8">
          <h3 className="text-lg font-medium mb-3 text-gray-800 dark:text-white">Performance Summary</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 p-3 rounded shadow-sm">
              <p className="text-sm text-gray-500 dark:text-gray-400">Questions Answered</p>
              <p className="text-2xl font-bold">{summary.totalQuestions}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded shadow-sm">
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Sentiment</p>
              <p className="text-2xl font-bold">{summary.averageSentiment}%</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded shadow-sm">
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Clarity</p>
              <p className="text-2xl font-bold">{summary.averageClarity}%</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded shadow-sm sm:col-span-2 md:col-span-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">Most Common Filler Word</p>
              <p className="text-xl font-bold">
                {summary.mostCommonFillerWord !== 'None' 
                  ? `"${summary.mostCommonFillerWord}" (${summary.mostCommonFillerWordCount} times)` 
                  : 'None detected'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Total filler words: {summary.totalFillerWords}
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-white">Sentiment Per Question</h3>
          <div className="h-64">
            <Bar 
              data={sentimentChartData} 
              options={sentimentChartData.options} 
            />
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-white">Clarity Score Per Question</h3>
          <div className="h-64">
            <Bar 
              data={clarityChartData} 
              options={clarityChartData.options} 
            />
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg shadow-sm md:col-span-2">
          <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-white">Top Filler Words</h3>
          <div className="h-64">
            <Bar 
              data={fillerWordsChartData} 
              options={fillerWordsChartData.options} 
            />
          </div>
        </div>
      </div>
      
      <div className="mt-8">
        <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-white">Interview Feedback Summary</h3>
        <div className="space-y-4">
          {feedbacks.map((item, index) => (
            <div key={index} className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-gray-800 dark:text-white">
                  Question {index + 1}
                </h4>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {item.timestamp ? formatTimestamp(item.timestamp) : 'Unknown date'}
                </span>
              </div>
              
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {item.question}
              </p>
              
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-3 bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 max-h-24 overflow-y-auto">
                {item.answer}
              </div>
              
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs">
                  Clarity: {Math.round(item.feedback.clarity_score * 100)}%
                </span>
                <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded text-xs">
                  Positive: {Math.round(item.feedback.sentiment.pos * 100)}%
                </span>
                {Object.entries(item.feedback.filler_words || {})
                  .filter(([_, count]) => count > 0)
                  .map(([word, count]) => (
                    <span key={word} className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded text-xs">
                      "{word}": {count}x
                    </span>
                  ))
                }
              </div>
              
              <p className="text-gray-800 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                {item.feedback.overall_feedback}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}