// Test script specifically for the generate-questions endpoint
// Run with: node scripts/test-generate-questions.js

async function testGenerateQuestions() {
  const API_URL = process.env.API_URL || 'http://localhost:8000';
  console.log(`Testing generate-questions endpoint at ${API_URL}\n`);
  
  const requestData = {
    cv_data: "This is cool", 
    skills: ["Flutter", "Dart", "Firebase", "Clean Code", "TDD", "CI/CD", "Mentoring", "Project Management"], 
    question_count: 3
  };
  
  console.log("Request data:", JSON.stringify(requestData, null, 2));
  
  try {
    const response = await fetch(`${API_URL}/generate-questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      try {
        const data = await response.json();
        console.log("Response data:", JSON.stringify(data, null, 2));
        return data;
      } catch (e) {
        const text = await response.text();
        console.log("Raw response:", text);
        console.error("Error parsing JSON:", e.message);
      }
    } else {
      const text = await response.text();
      console.error("Error response:", text);
    }
  } catch (error) {
    console.error("Request failed:", error.message);
  }
}

testGenerateQuestions().catch(console.error);
