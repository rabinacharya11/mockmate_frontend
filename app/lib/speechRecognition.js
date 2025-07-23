"use client";

let recognitionInstance = null;
let shouldKeepRecording = false;

/**
 * Initialize the speech recognition API
 * @param {object} options - Configuration options
 * @param {boolean} options.continuous - Whether recognition should continue after results
 * @param {boolean} options.interimResults - Whether to return interim results
 * @param {string} options.lang - Language for recognition (e.g., 'en-US')
 * @param {function} options.onResult - Callback for results
 * @param {function} options.onError - Callback for errors
 * @returns {object|null} - The recognition instance or null if not supported
 */
export function initSpeechRecognition(options = {}) {
  if (typeof window === "undefined") {
    return null;
  }

  const defaults = {
    continuous: true,
    interimResults: true,
    lang: 'en-US',
    onResult: () => {},
    onError: () => {},
  };

  const config = { ...defaults, ...options };

  // Check if the browser supports speech recognition
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    console.log('Speech recognition not supported in this browser');
    return null;
  }

  // Create a new recognition instance
  recognitionInstance = new SpeechRecognition();
  
  // Configure the recognition instance with more robust settings
  recognitionInstance.continuous = config.continuous;
  recognitionInstance.interimResults = config.interimResults;
  recognitionInstance.lang = config.lang;
  recognitionInstance.maxAlternatives = 1;
  
  // Set up event handlers
  recognitionInstance.onresult = (event) => {
    let finalTranscript = '';
    let interimTranscript = '';
    
    // Process all results from the current event
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      
      if (event.results[i].isFinal) {
        finalTranscript += transcript + ' ';
        console.log('Final transcript:', transcript);
      } else {
        interimTranscript += transcript;
        console.log('Interim transcript:', transcript);
      }
    }
    
    // Call the result callback with both final and interim results
    config.onResult({
      finalTranscript: finalTranscript.trim(),
      interimTranscript: interimTranscript.trim(),
      event,
    });
  };
  
  recognitionInstance.onerror = (event) => {
    console.log('Speech recognition error details:', {
      error: event.error,
      message: event.message,
      type: event.type
    });
    
    // Handle specific error types better
    switch (event.error) {
      case 'network':
        // Network errors are often temporary - don't show to user unless persistent
        console.warn('Speech recognition network error - this is usually temporary');
        // Don't call onError for network errors as they're often false positives
        break;
      case 'not-allowed':
        config.onError({
          ...event,
          userMessage: 'Microphone permission denied. Please allow microphone access and try again.'
        });
        break;
      case 'no-speech':
        // Don't treat no-speech as an error - just log it
        console.log('No speech detected');
        break;
      case 'audio-capture':
        config.onError({
          ...event,
          userMessage: 'No microphone found. Please check your microphone connection.'
        });
        break;
      case 'service-not-allowed':
        config.onError({
          ...event,
          userMessage: 'Speech recognition service not allowed. Please check your browser settings.'
        });
        break;
      default:
        // Only show generic errors for unknown types
        console.log('Speech recognition error:', event.error);
        config.onError({
          ...event,
          userMessage: `Speech recognition error: ${event.error}`
        });
    }
  };
  
  recognitionInstance.onend = () => {
    console.log('Speech recognition ended, shouldKeepRecording:', shouldKeepRecording);
    
    // If we're still supposed to be recording, restart recognition
    if (shouldKeepRecording && recognitionInstance) {
      console.log('Attempting to restart continuous recognition...');
      setTimeout(() => {
        try {
          recognitionInstance.start();
          console.log('Successfully restarted recognition');
        } catch (error) {
          if (error.name !== 'InvalidStateError') {
            console.error('Recognition restart error:', error);
          }
        }
      }, 100);
    }
  };
  
  recognitionInstance.onstart = () => {
    console.log('Speech recognition started successfully');
  };
  
  recognitionInstance.onnomatch = () => {
    console.log('No speech match found');
  };
  
  recognitionInstance.onsoundstart = () => {
    console.log('Sound detected');
  };
  
  recognitionInstance.onsoundend = () => {
    console.log('Sound ended');
  };
  
  recognitionInstance.onspeechstart = () => {
    console.log('Speech started');
  };
  
  recognitionInstance.onspeechend = () => {
    console.log('Speech ended');
  };
  
  return recognitionInstance;
}

/**
 * Start speech recognition
 * @returns {boolean} - Whether recognition was started successfully
 */
export function startSpeechRecognition() {
  if (!recognitionInstance) {
    console.error('Recognition instance not initialized');
    return false;
  }
  
  try {
    shouldKeepRecording = true;
    
    // Stop any existing recognition first
    try {
      recognitionInstance.stop();
    } catch (e) {
      // Ignore error if already stopped
    }
    
    // Small delay to ensure previous instance is fully stopped
    setTimeout(() => {
      try {
        recognitionInstance.start();
        console.log('Speech recognition start requested');
      } catch (startError) {
        console.error('Error starting speech recognition:', startError);
        if (startError.name === 'InvalidStateError') {
          console.log('Recognition already running');
        }
      }
    }, 100);
    
    return true;
  } catch (error) {
    console.error('Failed to start speech recognition:', error);
    shouldKeepRecording = false;
    return false;
  }
}

/**
 * Stop speech recognition
 * @returns {boolean} - Whether recognition was stopped successfully
 */
export function stopSpeechRecognition() {
  shouldKeepRecording = false;
  
  if (!recognitionInstance) {
    return false;
  }
  
  try {
    recognitionInstance.stop();
    console.log('Speech recognition stop requested');
    return true;
  } catch (error) {
    console.error('Failed to stop speech recognition:', error);
    return false;
  }
}

/**
 * Check if the browser supports speech recognition
 * @returns {boolean} - Whether speech recognition is supported
 */
export function isSpeechRecognitionSupported() {
  if (typeof window === "undefined") {
    return false;
  }
  
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}
