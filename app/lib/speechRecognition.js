"use client";

let recognitionInstance = null;

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
    return null;
  }

  // Create a new recognition instance
  recognitionInstance = new SpeechRecognition();
  
  // Configure the recognition instance
  recognitionInstance.continuous = config.continuous;
  recognitionInstance.interimResults = config.interimResults;
  recognitionInstance.lang = config.lang;
  
  // Set up event handlers
  recognitionInstance.onresult = (event) => {
    let finalTranscript = '';
    let interimTranscript = '';
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      
      if (event.results[i].isFinal) {
        finalTranscript += transcript + ' ';
      } else {
        interimTranscript += transcript;
      }
    }
    
    config.onResult({
      finalTranscript,
      interimTranscript,
      event,
    });
  };
  
  recognitionInstance.onerror = (event) => {
    config.onError(event);
  };
  
  return recognitionInstance;
}

/**
 * Start speech recognition
 * @returns {boolean} - Whether recognition was started successfully
 */
export function startSpeechRecognition() {
  if (!recognitionInstance) {
    return false;
  }
  
  try {
    recognitionInstance.start();
    return true;
  } catch (error) {
    console.error('Failed to start speech recognition:', error);
    return false;
  }
}

/**
 * Stop speech recognition
 * @returns {boolean} - Whether recognition was stopped successfully
 */
export function stopSpeechRecognition() {
  if (!recognitionInstance) {
    return false;
  }
  
  try {
    recognitionInstance.stop();
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
