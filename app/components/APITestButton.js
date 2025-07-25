import { useState } from 'react';
import { getMultipleVerbalFeedback } from '../lib/api';

export default function APITestButton() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const testAPI = async () => {
    setTesting(true);
    setResult(null);
    setError(null);

    try {
      console.log('🧪 Testing API connection...');
      
      const testData = [
        {
          questionText: "What is your greatest strength?",
          voiceConvertedToText: "My greatest strength is my ability to work well in team environments and communicate effectively with colleagues."
        }
      ];

      const response = await getMultipleVerbalFeedback(testData);
      console.log('✅ API test successful:', response);
      
      setResult({
        success: true,
        message: 'API connection successful!',
        feedback: response.feedback[0]
      });
    } catch (err) {
      console.error('❌ API test failed:', err);
      setError({
        success: false,
        message: err.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setTesting(false);
    }
  };

  // Only show in development or when debug mode is enabled
  const shouldShow = process.env.NODE_ENV === 'development' || 
                    (typeof window !== 'undefined' && localStorage.getItem('api_debug') === 'true');

  if (!shouldShow) return null;

  return (
    <div className="p-4 bg-gray-100 border border-gray-300 rounded-lg mb-4">
      <h4 className="font-bold text-gray-800 mb-2">🧪 API Connection Test</h4>
      
      <button
        onClick={testAPI}
        disabled={testing}
        className={`px-4 py-2 rounded-lg font-medium ${
          testing 
            ? 'bg-gray-400 text-white cursor-not-allowed' 
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {testing ? 'Testing...' : 'Test Backend Connection'}
      </button>

      {result && (
        <div className="mt-3 p-3 bg-green-100 border border-green-300 rounded">
          <p className="text-green-800 font-medium">✅ {result.message}</p>
          {result.feedback && (
            <div className="mt-2 text-sm text-green-700">
              <p><strong>Sample Response:</strong></p>
              <p>Sentiment: {result.feedback.sentiment?.compound?.toFixed(2) || 'N/A'}</p>
              <p>Clarity: {result.feedback.clarity_score?.toFixed(2) || 'N/A'}</p>
              <p>Feedback: {result.feedback.overall_feedback?.substring(0, 100)}...</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded">
          <p className="text-red-800 font-medium">❌ Test Failed</p>
          <p className="text-red-700 text-sm mt-1">{error.message}</p>
          <p className="text-red-600 text-xs mt-2">Time: {error.timestamp}</p>
        </div>
      )}

      <div className="mt-2 text-xs text-gray-500">
        <p>This test button is only shown in development mode.</p>
        <p>To hide: set NODE_ENV=production or remove localStorage.api_debug</p>
      </div>
    </div>
  );
}
