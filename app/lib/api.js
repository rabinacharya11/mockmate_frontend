"use client";
import config, { logger } from './config';

/**
 * Helper function to make API calls to the backend
 * @param {string} endpoint - The API endpoint to call
 * @param {object} options - Fetch options (method, headers, body)
 * @returns {Promise<object>} - The JSON response from the API
 */
export async function apiCall(endpoint, options = {}) {
  // Determine API URL from config or environment variable
  const apiUrl = config.api.baseUrl || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const url = `${apiUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  
  // Don't set Content-Type for FormData as it sets its own with boundary
  const isFormData = options.body instanceof FormData;
  const headers = isFormData ? {} : { 'Content-Type': 'application/json', ...options.headers };
  
  try {
    logger.info(`Making ${options.method || 'GET'} request to ${endpoint}`);
    
    // Set up request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.api.timeout);
    
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    logger.error(`Error calling ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Extract skills from a CV
 * @param {FormData} formData - FormData containing the CV file
 * @returns {Promise<object>} - The extracted CV data and skills
 */
export async function extractSkills(formData) {
  logger.info('Extracting skills from CV');
  
  try {
    // Try to call the real API first
    return await apiCall('extract-skills', {
      method: 'POST',
      body: formData,
    });
  } catch (error) {
    logger.warn('API call failed, using mock data instead:', error);
    
    // Only use mock data if the fallback is enabled
    if (!config.api.useMockDataFallback) {
      throw error;
    }
    
    // Get the file name from the FormData for a more realistic mock
    const file = formData.get('file');
    const fileName = file ? file.name : 'unknown.pdf';
    
    logger.info('Using mock data for CV extraction');
    
    // Return realistic mock data
    return {
      cv_data: {
        name: "John Doe",
        email: "john@example.com",
        phone: "+1234567890",
        experience: [
          {
            title: "Software Engineer",
            company: "Tech Company",
            duration: "2020-2023"
          }
        ],
        education: [
          {
            degree: "Bachelor of Science in Computer Science",
            institution: "University",
            year: "2020"
          }
        ],
        filename: fileName
      },
      skills: ["JavaScript", "React", "Node.js", "Python", "Machine Learning", "Data Analysis", "Communication"]
    };
  }
}

/**
 * Generate interview questions based on CV data and skills
 * @param {object} data - Object containing cv_data, skills, and question_count
 * @returns {Promise<object>} - The generated questions
 */
export async function generateQuestions(data) {
  try {
    // Try to call the real API first
    return await apiCall('generate-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch (error) {
    console.warn('API call failed, using mock data instead:', error);
    
    // If the API call fails, use mock data based on the provided skills
    const skills = data.skills || [];
    const questionCount = data.question_count || 5;
    
    // Generate mock questions based on skills
    const questions = [];
    const questionTypes = [
      { type: "technical", weight: 0.5 },
      { type: "behavioral", weight: 0.3 },
      { type: "situational", weight: 0.2 }
    ];
    
    for (let i = 0; i < questionCount; i++) {
      // Pick a random skill
      const skill = skills[Math.floor(Math.random() * skills.length)];
      
      // Pick a question type based on weights
      const rand = Math.random();
      let typeIndex = 0;
      let cumulativeWeight = questionTypes[0].weight;
      
      while (rand > cumulativeWeight && typeIndex < questionTypes.length - 1) {
        typeIndex++;
        cumulativeWeight += questionTypes[typeIndex].weight;
      }
      
      const questionType = questionTypes[typeIndex].type;
      
      // Generate a question based on skill and type
      let question = {
        id: `q${i+1}`,
        type: questionType,
        difficulty: ["easy", "medium", "hard"][Math.floor(Math.random() * 3)],
        questionText: "",
        instruction: ""
      };
      
      if (questionType === "technical") {
        question.questionText = `Explain how you have used ${skill} in your previous projects.`;
        question.instruction = `Focus on specific examples and technical details related to ${skill}.`;
      } else if (questionType === "behavioral") {
        question.questionText = `Describe a situation where you had to apply your knowledge of ${skill} to solve a problem.`;
        question.instruction = `Use the STAR method: Situation, Task, Action, Result.`;
      } else {
        question.questionText = `If you were faced with a project requiring ${skill}, how would you approach it?`;
        question.instruction = `Consider both technical implementation and project management aspects.`;
      }
      
      questions.push(question);
    }
    
    return { questions };
  }
}

/**
 * Get verbal feedback for an interview answer
 * @param {string} questionText - The interview question
 * @param {string} voiceConvertedToText - The transcribed answer
 * @returns {Promise<object>} - The feedback analysis
 */
export async function getVerbalFeedback(questionText, voiceConvertedToText) {
  try {
    // Try to call the real API first
    return await apiCall('verbal-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ questionText, voiceConvertedToText }]),
    });
  } catch (error) {
    console.warn('API call failed, using mock data instead:', error);
    
    // Calculate mock sentiment based on keywords in the answer
    const positiveWords = ['good', 'great', 'excellent', 'best', 'effective', 'success', 'achieved', 'accomplished'];
    const negativeWords = ['bad', 'difficult', 'problem', 'challenge', 'hard', 'fail', 'issue', 'trouble'];
    const fillerWords = ['um', 'uh', 'like', 'you know', 'so', 'well', 'actually'];
    
    const words = voiceConvertedToText.toLowerCase().split(/\s+/);
    
    // Count positive, negative words
    let posCount = 0;
    let negCount = 0;
    
    words.forEach(word => {
      if (positiveWords.some(pw => word.includes(pw))) posCount++;
      if (negativeWords.some(nw => word.includes(nw))) negCount++;
    });
    
    const totalWords = words.length;
    const pos = totalWords > 0 ? posCount / totalWords * 2 : 0.5;
    const neg = totalWords > 0 ? negCount / totalWords * 2 : 0.1;
    const neu = 1 - (pos + neg);
    
    // Count filler words
    const fillerWordCounts = {};
    fillerWords.forEach(fw => {
      const regex = new RegExp(`\\b${fw}\\b`, 'gi');
      const count = (voiceConvertedToText.match(regex) || []).length;
      fillerWordCounts[fw] = count;
    });
    
    // Calculate clarity score based on filler word ratio
    const totalFillerWords = Object.values(fillerWordCounts).reduce((a, b) => a + b, 0);
    const fillerRatio = totalWords > 0 ? totalFillerWords / totalWords : 0;
    const clarityScore = Math.max(0.3, Math.min(0.95, 1 - fillerRatio * 2));
    
    // Generate overall feedback
    let overallFeedback = '';
    
    if (clarityScore > 0.8) {
      overallFeedback += "Your answer was clear and well-articulated. ";
    } else if (clarityScore > 0.5) {
      overallFeedback += "Your answer was generally clear, but try to reduce filler words. ";
    } else {
      overallFeedback += "Your answer could be clearer. Try to reduce filler words and organize your thoughts. ";
    }
    
    if (pos > 0.3) {
      overallFeedback += "You conveyed a positive tone, which is good. ";
    }
    
    if (totalWords < 50) {
      overallFeedback += "Consider providing more detail in your answer. ";
    } else if (totalWords > 200) {
      overallFeedback += "Your answer was comprehensive, but try to be more concise. ";
    } else {
      overallFeedback += "Your answer had a good length. ";
    }
    
    if (totalFillerWords > 5) {
      overallFeedback += "Watch out for filler words which can distract from your message. ";
    }
    
    return {
      feedback: [
        {
          question: questionText,
          answer: voiceConvertedToText,
          sentiment: {
            pos: Math.min(1, Math.max(0, pos)),
            neg: Math.min(1, Math.max(0, neg)),
            neu: Math.min(1, Math.max(0, neu)),
            compound: Math.min(1, Math.max(-1, pos - neg))
          },
          clarity_score: clarityScore,
          filler_words: fillerWordCounts,
          overall_feedback: overallFeedback
        }
      ]
    };
  }
}
