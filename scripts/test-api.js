/**
 * Test script for the MockMate FastAPI backend
 * 
 * This script tests the connection to the FastAPI backend
 * and checks the available endpoints.
 * 
 * Run with: node scripts/test-api.js
 */

async function testEndpoint(url, method = 'GET', data = null) {
  console.log(`Testing ${method} ${url}...`);
  
  const options = {
    method,
    headers: data ? { 'Content-Type': 'application/json' } : {},
    body: data ? JSON.stringify(data) : undefined
  };
  
  try {
    const response = await fetch(url, options);
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      try {
        const responseData = await response.json();
        console.log('Response data:', JSON.stringify(responseData, null, 2));
        return { success: true, data: responseData };
      } catch (e) {
        const text = await response.text();
        console.log('Response text:', text);
        return { success: true, text };
      }
    } else {
      const text = await response.text();
      console.log('Error response:', text);
      return { success: false, error: text };
    }
  } catch (error) {
    console.error('Request failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  const API_URL = process.env.API_URL || 'http://localhost:8000';
  console.log(`Testing FastAPI backend at ${API_URL}\n`);
  
  // Test root endpoint (usually has API documentation)
  console.log('=== Testing root endpoint ===');
  await testEndpoint(`${API_URL}/`);
  console.log('\n');
  
  // Test extracting skills from CV
  console.log('=== Testing generate-questions endpoint with sample data ===');
  const testData = {
    cv_data: JSON.stringify({
      name: "John Doe",
      email: "john@example.com",
      experience: [{ title: "Software Engineer", company: "Tech Co" }]
    }),
    skills: ["JavaScript", "React", "Python"],
    question_count: 3
  };
  await testEndpoint(`${API_URL}/generate-questions`, 'POST', testData);
  console.log('\n');
  
  // Test verbal feedback endpoint
  console.log('=== Testing verbal-feedback endpoint with sample data ===');
  const feedbackData = [{
    questionText: "Tell me about your experience with JavaScript",
    voiceConvertedToText: "I have been using JavaScript for 5 years, working on various web applications and frameworks like React and Vue."
  }];
  await testEndpoint(`${API_URL}/verbal-feedback`, 'POST', feedbackData);
  console.log('\n');
  
  console.log('Tests completed.');
}

runTests().catch(error => {
  console.error('Test script failed:', error);
  process.exit(1);
});
