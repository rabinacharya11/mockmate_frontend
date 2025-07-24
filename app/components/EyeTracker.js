"use client";
import { useRef, useEffect, useState } from 'react';

export default function EyeTracker({ onEyeMovement, isActive }) {
  const videoRef = useRef(null);
  const eyeMovementInterval = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState('');
  const [eyeData, setEyeData] = useState({
    gazeDirection: 'center',
    blinkCount: 0,
    attentionScore: 100
  });

  useEffect(() => {
    if (isActive) {
      startEyeTracking();
    } else {
      stopEyeTracking();
    }

    return () => {
      stopEyeTracking();
      if (eyeMovementInterval.current) {
        clearInterval(eyeMovementInterval.current);
      }
    };
  }, [isActive]);

  const startEyeTracking = async () => {
    try {
      console.log('🎥 Starting eye tracking...');
      
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 320,
          height: 240,
          facingMode: 'user'
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setHasPermission(true);
        setIsRecording(true);
        setError('');
        
        // Start eye movement simulation (in real implementation, this would use ML models)
        startEyeMovementSimulation();
      }
    } catch (err) {
      console.error('❌ Error accessing camera:', err);
      setError('Camera access denied. Eye tracking requires camera permission.');
      setHasPermission(false);
    }
  };

  const stopEyeTracking = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsRecording(false);
  };

  const startEyeMovementSimulation = () => {
    if (eyeMovementInterval.current) {
      clearInterval(eyeMovementInterval.current);
    }
    
    console.log('👁️ Starting eye movement simulation...');
    
    // Simulate eye movement detection (replace with actual ML model in production)
    eyeMovementInterval.current = setInterval(() => {
      // Simulate random eye movement data
      const directions = ['center', 'left', 'right', 'up', 'down', 'away'];
      const randomDirection = directions[Math.floor(Math.random() * directions.length)];
      
      const newEyeData = {
        gazeDirection: randomDirection,
        blinkCount: eyeData.blinkCount + Math.floor(Math.random() * 2),
        attentionScore: Math.max(60, Math.min(100, eyeData.attentionScore + (Math.random() - 0.5) * 10)),
        timestamp: new Date().toISOString()
      };

      console.log('👁️ Generated eye data:', newEyeData);
      setEyeData(newEyeData);

      // Report eye movement to parent component
      if (onEyeMovement) {
        console.log('👁️ Sending eye data to parent');
        onEyeMovement(newEyeData);
      } else {
        console.warn('👁️ No onEyeMovement callback provided');
      }
    }, 1000); // Update every second
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800 mb-4">
      {!isActive ? (
        <div className="text-center p-8">
          <div className="text-4xl mb-3">👁️</div>
          <h3 className="text-lg font-bold text-gray-600 dark:text-gray-400 mb-2">Eye Tracking Disabled</h3>
          <p className="text-sm text-gray-500 dark:text-gray-500">Enable eye tracking via the toggle to monitor your focus and engagement.</p>
        </div>
      ) : (
        <>
          <div className="flex items-start space-x-4">
            {/* Video Stream */}
            <div className="flex-shrink-0">
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-40 h-30 bg-gray-900 rounded-lg border-2 border-blue-300 object-cover shadow-lg"
                />
                {isRecording && (
                  <div className="absolute top-2 right-2 flex items-center space-x-1">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-white bg-red-500 px-1 rounded">REC</span>
                  </div>
                )}
                {!hasPermission && (
                  <div className="absolute inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center rounded-lg">
                    <div className="text-center text-white">
                      <div className="text-2xl mb-1">📹</div>
                      <div className="text-xs">Camera Access</div>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-center text-blue-700 dark:text-blue-400 mt-2 font-semibold">
                👁️ Eye Tracking Active
              </p>
            </div>

            {/* Eye Tracking Data */}
            <div className="flex-1">
              <h4 className="text-lg font-bold text-blue-800 dark:text-blue-300 mb-3 flex items-center">
                🎯 Live Eye Analysis
                {isRecording && <span className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>}
              </h4>
              
              {error ? (
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-700 dark:text-red-400 font-medium">⚠️ {error}</p>
                  <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                    Please allow camera access to enable eye tracking
                  </p>
                </div>
              ) : hasPermission ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-white dark:bg-gray-800 p-2 rounded">
                      <span className="text-gray-600 dark:text-gray-400 block text-xs">Gaze Direction:</span>
                      <div className="font-bold text-blue-700 dark:text-blue-400 text-lg">
                        {eyeData.gazeDirection.toUpperCase()}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-2 rounded">
                      <span className="text-gray-600 dark:text-gray-400 block text-xs">Attention Score:</span>
                      <div className="font-bold text-green-600 dark:text-green-400 text-lg">
                        {Math.round(eyeData.attentionScore)}%
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-2 rounded">
                      <span className="text-gray-600 dark:text-gray-400 block text-xs">Blink Count:</span>
                      <div className="font-bold text-purple-600 dark:text-purple-400 text-lg">
                        {eyeData.blinkCount}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-2 rounded">
                      <span className="text-gray-600 dark:text-gray-400 block text-xs">Status:</span>
                      <div className="font-bold text-green-600 dark:text-green-400 text-lg">
                        ACTIVE
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-700 dark:text-yellow-400 font-medium">
                    📷 Requesting camera permission...
                  </p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
                    This helps analyze your focus and engagement
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {hasPermission && (
            <div className="mt-4 pt-3 border-t border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-400 text-center">
                💡 <strong>Eye tracking analyzes:</strong> Focus • Engagement • Confidence • Interview Readiness
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
