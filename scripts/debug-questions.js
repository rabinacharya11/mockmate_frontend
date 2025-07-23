/**
 * Debug script for question generation issues
 * Run with: node scripts/debug-questions.js
 */

// Mock environment for testing
global.window = {}; 
process.env.NODE_ENV = 'development';

// Import the API functions
const { generateQuestions } = require('../app/lib/api');

// Create a logger that will show detailed output
const logger = {
  debug: (...args) => console.log('DEBUG:', ...args),
  info: (...args) => console.log('INFO:', ...args),
  warn: (...args) => console.log('WARN:', ...args),
  error: (...args) => console.log('ERROR:', ...args)
};

// Mock config object
const config = {
  api: {
    baseUrl: "http://localhost:8000",
    useMockDataFallback: true,
    timeout: 30000
  },
  debug: {
    enabled: true,
    level: 4
  }
};

// Override module imports for testing
require.cache[require.resolve('../app/lib/config')].exports = config;
require.cache[require.resolve('../app/lib/config')].exports.logger = logger;

// Test data
const testData = {
  cv_data: "This is a test CV for debugging",
  skills: ["JavaScript", "React", "Node.js", "API Integration"],
  question_count: 3
};

// Run the test
async function runTest() {
  console.log('=== Starting Question Generation Debug Test ===');
  console.log('Test data:', testData);
  
  try {
    console.log('\nAttempting to generate questions...');
    const result = await generateQuestions(testData);
    
    console.log('\n=== Success! Generated Questions ===');
    console.log(JSON.stringify(result, null, 2));
    
    // Validate the result
    if (result && result.questions && Array.isArray(result.questions)) {
      console.log(`\n✅ Successfully generated ${result.questions.length} questions`);
      
      // Check question format
      const sampleQuestion = result.questions[0];
      console.log('\nSample question format:');
      console.log(JSON.stringify(sampleQuestion, null, 2));
      
      // Verify required fields
      const requiredFields = ['id', 'type', 'questionText'];
      const missingFields = requiredFields.filter(field => !sampleQuestion.hasOwnProperty(field));
      
      if (missingFields.length > 0) {
        console.log(`\n⚠️ Warning: Sample question is missing fields: ${missingFields.join(', ')}`);
      } else {
        console.log('\n✅ Sample question has all required fields');
      }
    } else {
      console.log('\n❌ Invalid question data format!');
      console.log('Expected: { questions: [...] }');
      console.log('Received:', result);
    }
  } catch (error) {
    console.log('\n❌ Error generating questions:');
    console.error(error);
  }
  
  console.log('\n=== Test Complete ===');
}

// Run the test
runTest().catch(console.error);
