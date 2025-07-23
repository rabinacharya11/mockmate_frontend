"use client";
import config, { logger } from './config';
import axios from 'axios';  // Import axios at the top

/**
 * Helper function to make API calls to the backend
 * @param {string} endpoint - The API endpoint to call
 * @param {object} options - Fetch options (method, headers, body)
 * @returns {Promise<object>} - The JSON response from the API
 */
export async function apiCall(endpoint, options = {}) {
  // Determine API URL from config or environment variable - ensure default is FastAPI backend
  const mainApiUrl = config.api.baseUrl || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  
  // Get alternative URLs to try if the main one fails
  const alternativeUrls = config.api.alternativeUrls || ["http://127.0.0.1:8000", "http://0.0.0.0:8000"];
  
  // Add the main URL at the beginning of the array of URLs to try
  const urlsToTry = [mainApiUrl, ...alternativeUrls];
  
  // To track all errors for better reporting
  const errors = [];
  
  // Try each URL in succession
  for (let i = 0; i < urlsToTry.length; i++) {
    const apiUrl = urlsToTry[i];
    const url = `${apiUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    const isLastAttempt = i === urlsToTry.length - 1;
    
    // Log the full URL being called for debugging
    logger.debug(`Trying API URL (${i+1}/${urlsToTry.length}): ${url}`);
    
    // Don't set Content-Type for FormData as it sets its own with boundary
    const isFormData = options.body instanceof FormData;
    const headers = isFormData ? {} : { 'Content-Type': 'application/json', ...options.headers };
    
    try {
      logger.info(`Making ${options.method || 'GET'} request to ${endpoint} via ${apiUrl}`);
      
      // Log request body for debugging (but don't log large files in FormData)
      if (!isFormData && options.body) {
        logger.debug(`Request body: ${options.body.substring(0, 500)}${options.body.length > 500 ? '...' : ''}`);
      }
      
      // Set up request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.api.timeout);
      
      // Log before fetch attempt to help with debugging
      console.log(`Attempting to fetch from ${url}`);
      
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: headers,
        body: options.body,
        signal: controller.signal,
        // Using 'omit' for simplicity in testing, can be changed to 'same-origin' if needed
        credentials: 'omit',
        // Add mode: 'cors' to explicitly enable CORS
        mode: 'cors'
      });
      
      clearTimeout(timeoutId);
      
      // Log response status and headers for debugging
      logger.debug(`Response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`API error response: ${errorText}`);
        throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const responseData = await response.json();
      logger.debug(`Response data: ${JSON.stringify(responseData).substring(0, 500)}...`);
      
      // Successfully received a response, return it
      return responseData;
    } catch (error) {
      // Store the error for this attempt
      errors.push({
        url: apiUrl,
        error: error.message
      });
      
      // Log the error but don't throw it yet if we have more URLs to try
      logger.warn(`Error connecting to ${apiUrl}: ${error.message}`);
      
      // Only throw if this is the last URL to try
      if (isLastAttempt) {
        // Check if it's a timeout error
        if (error.name === 'AbortError') {
          logger.error(`All API endpoints timed out for ${endpoint}`);
          const timeoutError = new Error(`API call timed out. Please try again later.`);
          timeoutError.error = {
            type: 'Timeout',
            details: `The server did not respond within ${config.api.timeout/1000} seconds`,
            endpoint,
            attempts: errors
          };
          throw timeoutError;
        }
        
        // Handle network errors specially
        if (error.message && error.message.includes('fetch')) {
          const networkError = new Error(`Network error when connecting to the API. Please check your internet connection and ensure the backend server is running.`);
          networkError.error = {
            type: 'Network',
            details: 'Could not reach any server. This could be due to connectivity issues, CORS configuration, or the server not running.',
            attempts: errors
          };
          logger.error(`All API endpoints failed for ${endpoint}`, errors);
          
          // Add extra console logging for easier debugging
          console.error(`Network error details:`, {
            endpoints: errors.map(e => e.url),
            errors: errors.map(e => e.error)
          });
          
          // If we're in development mode, provide more helpful guidance
          if (process.env.NODE_ENV === 'development') {
            console.info(`
              Debugging tips for "Failed to fetch" errors:
              1. Ensure your FastAPI backend is running at one of these URLs: ${urlsToTry.join(', ')}
              2. Check CORS configuration in your FastAPI app
              3. Check for network connectivity issues
              4. Verify that the endpoint ${endpoint} exists on your server
            `);
          }
          
          throw networkError;
        }
        
        // Generic error for other types of failures
        const genericError = new Error(`API call failed after trying multiple endpoints: ${error.message}`);
        genericError.error = {
          type: 'API Error',
          details: `Error occurred while calling ${endpoint}`,
          attempts: errors
        };
        logger.error(`API call error for ${endpoint}:`, error);
        throw genericError;
      }
      
      // If not the last attempt, continue to the next URL
      logger.info(`Trying next API URL for ${endpoint}`);
      continue;
    }
  }
}

/**
 * Extract skills from a CV
 * @param {FormData} formData - FormData containing the CV file
 * @returns {Promise<object>} - The extracted CV data and skills
 */
export async function extractSkills(formData) {
  logger.info('Extracting skills from CV using extract-skills/ endpoint');
  
  const apiUrl = config.api.baseUrl || "/api/proxy";
  
  console.log('Making API request to:', `${apiUrl}/extract-skills`);
  
  try {
    const response = await axios.post(`${apiUrl}/extract-skills`, formData, {
      headers: {
        // Let axios set the Content-Type automatically for FormData
        // This ensures proper boundary is set for multipart/form-data
      }
      // No timeout - let it take as long as needed
    });
    
    const result = response.data;
    console.log('API response received:', result);
    
    // Validate the response format according to API specification
    if (!result || !result.skills || !result.cv_data) {
      throw new Error('Invalid response format from extract-skills API. Expected: {skills: [], cv_data: {}}');
    }
    
    if (!Array.isArray(result.skills) || result.skills.length === 0) {
      throw new Error('No skills found in the CV. Please ensure your CV contains clear skill information.');
    }
    
    logger.info('Successfully extracted skills:', result.skills.length, 'skills found');
    return result;
    
  } catch (error) {
    console.error('Extract skills API error:', error);
    
    // Handle different types of errors
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to API server. Please ensure the FastAPI backend is running on localhost:8000');
    }
    
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timed out. The file might be too large or the server is slow to respond.');
    }
    
    if (error.message === 'Network Error') {
      throw new Error('Network Error: This is likely a CORS issue. Please ensure your FastAPI backend has CORS enabled for http://localhost:3000');
    }
    
    if (error.response?.status === 422) {
      throw new Error('Invalid file format. Please upload a valid PDF file.');
    }
    
    if (error.response?.status === 500) {
      const detail = error.response.data?.detail || 'Internal server error';
      if (detail.includes('PDF processing failed')) {
        throw new Error('PDF processing failed. Please ensure you upload a valid PDF file, not a text file.');
      }
      throw new Error(`Server error: ${detail}`);
    }
    
    // Re-throw the original error if we can't handle it specifically
    throw new Error(`CV extraction failed: ${error.message}`);
  }
}

/**
 * Generate interview questions based on CV data and skills
 * @param {object} data - Object containing cv_data, skills, and question_count
 * @returns {Promise<object>} - The generated questions
 */
export async function generateQuestions(data) {
  // Ensure we have required data
  const skills = data?.skills || [];
  const questionCount = data?.question_count || config.api.defaultQuestionCount || 5; 
  const cvData = data?.cv_data || {};
  
  if (skills.length === 0) {
    throw new Error('No skills provided for question generation. Please upload and extract skills from your CV first.');
  }
  
  // Get API URL from config
  const apiUrl = config.api.baseUrl || "/api/proxy";
  
  // Format request data according to API specification
  const requestData = {
    cv_data: typeof cvData === 'string' ? cvData : JSON.stringify(cvData),
    skills: skills,
    question_count: questionCount
  };

  console.log('Generating questions with data:', requestData);
  
  // Make direct axios request to generate-questions API
  const response = await axios.post(`${apiUrl}/generate-questions`, requestData, {
    headers: { 'Content-Type': 'application/json' }
    // No timeout - let it take as long as needed for AI processing
  });

  const result = response.data;
  console.log('Question generation response:', result);
  
  // Handle different response formats from the backend
  let questionsList = [];
  
  if (result && result.questions && Array.isArray(result.questions)) {
    // Handle nested format: { questions: [{ questions: [...] }] }
    if (result.questions.length > 0 && result.questions[0].questions && Array.isArray(result.questions[0].questions)) {
      questionsList = result.questions[0].questions;
    } else {
      questionsList = result.questions;
    }
  } else if (Array.isArray(result)) {
    questionsList = result;
  } else {
    throw new Error('Invalid response format from generate-questions API. Expected questions array.');
  }
  
  // Filter out error responses
  questionsList = questionsList.filter(q => !q.error);
  
  if (questionsList.length === 0) {
    throw new Error('API returned no valid questions. Please check your skills and CV data.');
  }
  
  logger.info('Successfully generated questions:', questionsList.length, 'questions');
  
  // Process and standardize question format
  const processedQuestions = questionsList.map((q, index) => ({
    id: q.id || `q${index+1}`,
    type: (q.questionType || q.type || "technical").toLowerCase().replace(/\s+/g, '-'),
    difficulty: q.difficulty || "medium",
    questionText: q.questionText || q.question || q.text || `Question ${index+1}`,
    instruction: q.instruction || q.instructions || ""
  }));
  
  return {
    questions: processedQuestions.slice(0, questionCount),
    source: 'API',
    generated: new Date().toISOString()
  };
}

/**
 * Get verbal feedback for an answer
 * @param {string} questionText - The interview question
 * @param {string} voiceConvertedToText - The transcribed answer
 * @returns {Promise<object>} - The feedback analysis
 */
export async function getVerbalFeedback(questionText, voiceConvertedToText) {
  try {
    logger.info('Getting verbal feedback from FastAPI backend');
    
    // Format request data according to API specification
    const requestData = {
      question: questionText,
      answer: voiceConvertedToText
    };
    
    const apiUrl = config.api.baseUrl || "/api/proxy";
    
    // Use axios for the request
    const response = await axios.post(`${apiUrl}/verbal-feedback`, requestData, {
      headers: { 'Content-Type': 'application/json' }
      // No timeout - let it take as long as needed for AI analysis
    });
    
    const result = response.data;
    
    // Validate response format according to API specification
    if (result && (result.sentiment || result.clarity_score !== undefined || result.overall_feedback)) {
      // Convert to standardized format for the frontend
      return {
        feedback: [{
          question: questionText,
          answer: voiceConvertedToText,
          sentiment: result.sentiment || { pos: 0.5, neg: 0.1, neu: 0.4, compound: 0.4 },
          clarity_score: result.clarity_score || 0.7,
          filler_words: result.filler_words || {},
          overall_feedback: result.overall_feedback || "Thank you for your answer."
        }]
      };
    } else {
      logger.warn('Verbal feedback API returned unexpected format');
      throw new Error('Invalid response format from verbal feedback API');
    }
  } catch (error) {
    logger.error('Verbal feedback API failed:', error.message);
    
    // Check for specific error types and provide helpful error messages
    if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
      throw new Error('Cannot connect to API server. Please ensure the backend is running on localhost:8000');
    }
    
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timed out. Please try again.');
    }
    
    if (error.response?.status === 422) {
      throw new Error('Invalid data format. Please check your question and answer data.');
    }
    
    if (error.response?.status === 500) {
      throw new Error('Server error occurred during feedback analysis. Please try again.');
    }
    
    // Re-throw the error to force the frontend to handle it
    throw new Error(`Verbal feedback failed: ${error.message}`);
  }
}

/**
 * Get verbal feedback for multiple questions and answers
 * @param {Array} questionsAndAnswers - Array of {questionText, voiceConvertedToText} objects
 * @returns {Promise<object>} - The feedback analysis for all questions
 */
export async function getMultipleVerbalFeedback(questionsAndAnswers) {
  try {
    logger.info('Getting verbal feedback for multiple questions from FastAPI backend');
    
    // Format request data according to the new API specification
    const requestData = questionsAndAnswers.map(qa => ({
      questionText: qa.questionText,
      voiceConvertedToText: qa.voiceConvertedToText
    }));
    
    const apiUrl = config.api.baseUrl || "/api/proxy";
    
    // Use axios for the request
    const response = await axios.post(`${apiUrl}/verbal-feedback`, requestData, {
      headers: { 'Content-Type': 'application/json' }
      // No timeout - let it take as long as needed for AI analysis
    });
    
    const result = response.data;
    
    // Validate response format according to API specification
    if (result && result.feedback && Array.isArray(result.feedback)) {
      return result;
    } else {
      logger.warn('Multiple verbal feedback API returned unexpected format');
      throw new Error('Invalid response format from verbal feedback API');
    }
  } catch (error) {
    logger.error('Multiple verbal feedback API failed:', error.message);
    
    // Check for specific error types and provide helpful error messages
    if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
      throw new Error('Cannot connect to API server. Please ensure the backend is running on localhost:8000');
    }
    
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timed out. Please try again.');
    }
    
    if (error.response?.status === 422) {
      throw new Error('Invalid data format. Please check your question and answer data.');
    }
    
    if (error.response?.status === 500) {
      throw new Error('Server error occurred during feedback analysis. Please try again.');
    }
    
    // Re-throw the error to force the frontend to handle it
    throw new Error(`Verbal feedback failed: ${error.message}`);
  }
}
