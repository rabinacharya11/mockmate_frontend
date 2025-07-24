// Test the multiple verbal feedback API
const axios = require('axios');

const testData = [
  {
    questionText: "Tell me about yourself",
    voiceConvertedToText: "Hi, umm, I am a software developer with, uh, 5 years of experience in, well, JavaScript and React."
  },
  {
    questionText: "What are your strengths?",
    voiceConvertedToText: "I think my main strength is that I'm a good problem solver and I work well in teams."
  }
];

async function testMultipleVerbalFeedback() {
  console.log('Testing multiple verbal feedback API...');
  console.log('Test data:', JSON.stringify(testData, null, 2));

  try {
    const response = await axios.post('http://localhost:8000/verbal-feedback/', testData, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ API Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ API Error:', error.response?.data || error.message);
    console.error('Error details:', error.response?.status, error.response?.statusText);
  }
}

testMultipleVerbalFeedback();
