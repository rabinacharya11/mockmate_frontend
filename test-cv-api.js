// Test script for CV extraction API
const axios = require('axios');
const FormData = require('form-data');

async function testExtractSkillsAPI() {
  console.log('Testing extract-skills API...');
  
  const apiUrl = 'http://localhost:8000';
  
  try {
    // Test the extract-skills endpoint directly
    console.log('Testing extract-skills endpoint...');
    
    const formData = new FormData();
    // Create a simple text file as a mock CV
    const mockCV = Buffer.from(`John Doe
Software Engineer

Experience:
- Senior Developer at TechCorp (2020-2023)
- Junior Developer at StartupInc (2018-2020)

Skills: JavaScript, React, Node.js, Python, Machine Learning, Data Analysis

Education:
- Bachelor of Computer Science, University (2018)`);
    
    formData.append('file', mockCV, {
      filename: 'test-cv.pdf',
      contentType: 'application/pdf'
    });
    
    console.log('Making request to:', `${apiUrl}/extract-skills/`);
    
    const response = await axios.post(`${apiUrl}/extract-skills/`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 30000
    });
    
    console.log('✅ Extract skills API successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ API test failed:');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   - Connection refused. Is the FastAPI server running on localhost:8000?');
    } else if (error.code === 'ECONNABORTED') {
      console.error('   - Request timed out');
    } else if (error.response) {
      console.error('   - HTTP Error:', error.response.status, error.response.statusText);
      console.error('   - Response:', error.response.data);
    } else {
      console.error('   - Error:', error.message);
    }
    
    console.log('\n📝 Troubleshooting steps:');
    console.log('   1. Start your FastAPI server: uvicorn main:app --host 0.0.0.0 --port 8000');
    console.log('   2. Ensure CORS is enabled in your FastAPI app');
    console.log('   3. Check that the /extract-skills/ endpoint exists and accepts POST requests');
    console.log('   4. Verify the endpoint accepts multipart/form-data');
    
    console.log('\n🔧 Since the API is not available, the frontend will use mock data automatically.');
    console.log('   This is normal for development and testing purposes.');
  }
}

// Run the test
testExtractSkillsAPI();
