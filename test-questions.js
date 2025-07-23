// Simple test script to verify question generation with mock data

// Mock data to use for testing
const mockData = {
  cv_data: {
    name: "Test User",
    email: "test@example.com",
    experience: [
      { title: "Software Engineer", company: "Tech Co", duration: "2020-2022" }
    ]
  },
  skills: ["JavaScript", "React", "Node.js", "API Design"],
  question_count: 5
};

// Import the generateQuestions function (will use the mock data fallback)
const generateQuestions = require('./app/lib/api').generateQuestions;

// Run the test
async function testQuestionGeneration() {
  console.log("Testing question generation...");
  
  try {
    // Force an API error to test fallback
    global.fetch = () => Promise.reject(new Error("Test: Forcing API error"));
    
    const result = await generateQuestions(mockData);
    
    console.log("RESULT:", JSON.stringify(result, null, 2));
    
    if (result && result.questions && result.questions.length > 0) {
      console.log(`✅ SUCCESS: Generated ${result.questions.length} questions`);
      console.log(`First question: "${result.questions[0].questionText}"`);
    } else {
      console.log("❌ ERROR: No questions generated");
    }
  } catch (error) {
    console.error("❌ TEST FAILED:", error.message);
  }
}

// Run the test
testQuestionGeneration().catch(console.error);
