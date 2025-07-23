"use client";

import { useState } from 'react';
import Link from 'next/link';
import config from '../lib/config';

export default function APIDebugPage() {
  const [apiInfo, setApiInfo] = useState({
    baseUrl: config.api.baseUrl || 'Not set',
    timeout: config.api.timeout || 'Default',
    mockDataEnabled: 'No (Dynamic API Only)'
  });
  
  const [connectionStatus, setConnectionStatus] = useState(null);
  
  async function testConnection() {
    setConnectionStatus({
      status: 'checking',
      message: 'Testing connection to API...'
    });
    
    try {
      const apiUrl = config.api.baseUrl || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const url = `${apiUrl}/health`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const startTime = Date.now();
      const response = await fetch(url, { signal: controller.signal });
      const endTime = Date.now();
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.text();
        setConnectionStatus({
          status: 'success',
          message: `Connection successful! Response time: ${endTime - startTime}ms`,
          details: `Response: ${data}`
        });
      } else {
        setConnectionStatus({
          status: 'error',
          message: `API responded with status: ${response.status} ${response.statusText}`,
          details: `Tried connecting to: ${url}`
        });
      }
    } catch (error) {
      setConnectionStatus({
        status: 'error',
        message: `Connection failed: ${error.message}`,
        details: `Make sure the API is running at ${config.api.baseUrl || 'localhost:8000'}`
      });
    }
  }
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">API Debug Page</h1>
      
      <div className="mb-6">
        <Link href="/" className="text-blue-600 hover:underline">
          Back to Home
        </Link>
      </div>
      
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h2 className="text-lg font-semibold mb-3">API Configuration:</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>API Base URL: <code className="bg-gray-200 px-1 py-0.5 rounded">{apiInfo.baseUrl}</code></li>
          <li>API Timeout: <code className="bg-gray-200 px-1 py-0.5 rounded">{apiInfo.timeout}ms</code></li>
          <li>Mock Data Fallback: <code className="bg-gray-200 px-1 py-0.5 rounded">{apiInfo.mockDataEnabled}</code></li>
        </ul>
      </div>
      
      <div className="mb-6">
        <button 
          onClick={testConnection}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700"
        >
          Test API Connection
        </button>
      </div>
      
      {connectionStatus && (
        <div className={`mb-6 p-4 rounded border ${
          connectionStatus.status === 'checking' ? 'bg-yellow-50 border-yellow-300' :
          connectionStatus.status === 'success' ? 'bg-green-50 border-green-300' : 
          'bg-red-50 border-red-300'
        }`}>
          <h3 className="font-bold mb-2">Connection Result:</h3>
          <p className="mb-2">{connectionStatus.message}</p>
          {connectionStatus.details && (
            <p className="text-sm">{connectionStatus.details}</p>
          )}
        </div>
      )}
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Debug Links:</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <Link href="/debug-questions" className="text-blue-600 hover:underline">
              Test Question Generation
            </Link>
          </li>
        </ul>
      </div>
      
      <div className="mt-8 text-sm text-gray-600">
        <p>
          <strong>Note:</strong> If API calls are failing, make sure your FastAPI backend is running at
          {' '}<code className="bg-gray-200 px-1 py-0.5 rounded">{apiInfo.baseUrl}</code>.
        </p>
      </div>
    </div>
  );
}
