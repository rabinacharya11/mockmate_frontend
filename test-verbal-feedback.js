const axios = require('axios');

// Test the verbal feedback API with the new format
async function testVerbalFeedback() {
  try {
    console.log('Testing verbal feedback API...');
    
    // Test data according to the specification in the user request
    const testData = [
      {  
        "questionText": "This is cool",
        "voiceConvertedToText": "This umm..., is cool, but, right, um, ahh"
      },
      {  
        "questionText": "How are you as a person?",
        "voiceConvertedToText": "Hi sir, I am a good person. But I think I have a lot of ground to improve. I hope one day at your company I will get much more things done."
      }
    ];

    console.log('Sending request to http://localhost:8000/verbal-feedback/');
    console.log('Request body:', JSON.stringify(testData, null, 2));

    const response = await axios.post('http://localhost:8000/verbal-feedback/', testData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 seconds timeout
    });

    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));

    // Validate the response format
    if (response.data && response.data.feedback && Array.isArray(response.data.feedback)) {
      console.log('✅ Response format is correct!');
      
      response.data.feedback.forEach((feedback, index) => {
        console.log(`\nFeedback for question ${index + 1}:`);
        console.log(`- Question: ${feedback.question}`);
        console.log(`- Sentiment: ${JSON.stringify(feedback.sentiment)}`);
        console.log(`- Clarity Score: ${feedback.clarity_score}`);
        console.log(`- Filler Words: ${JSON.stringify(feedback.filler_words)}`);
        console.log(`- Overall Feedback: ${feedback.overall_feedback}`);
      });
    } else {
      console.log('❌ Response format is incorrect');
    }

  } catch (error) {
    console.error('❌ Error testing verbal feedback API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testVerbalFeedback();
