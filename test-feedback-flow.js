/**
 * Test script to verify the feedback system is working end-to-end
 */

const { getVerbalFeedback, getMultipleVerbalFeedback } = require('./app/lib/api');

async function testSingleFeedback() {
  console.log('🧪 Testing single feedback...');
  
  const question = "Tell me about yourself and your background.";
  const answer = "Hi, I'm a software developer with 5 years of experience. I've worked on various web applications using React and Node.js. I enjoy solving complex problems and learning new technologies.";
  
  try {
    const result = await getVerbalFeedback(question, answer);
    console.log('✅ Single feedback result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ Single feedback failed:', error.message);
    return null;
  }
}

async function testMultipleFeedback() {
  console.log('🧪 Testing multiple feedback...');
  
  const questionsAndAnswers = [
    {
      questionText: "What are your strengths?",
      voiceConvertedToText: "My main strengths are problem-solving, teamwork, and adaptability. I work well under pressure and can learn new technologies quickly."
    },
    {
      questionText: "Describe a challenging project you worked on.",
      voiceConvertedToText: "I worked on a real-time chat application that needed to handle thousands of concurrent users. We used WebSockets and implemented proper scaling techniques."
    }
  ];
  
  try {
    const result = await getMultipleVerbalFeedback(questionsAndAnswers);
    console.log('✅ Multiple feedback result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ Multiple feedback failed:', error.message);
    return null;
  }
}

async function validateFeedbackStructure(feedback) {
  console.log('🔍 Validating feedback structure...');
  
  if (!feedback) {
    console.error('❌ Feedback is null or undefined');
    return false;
  }
  
  if (!feedback.feedback || !Array.isArray(feedback.feedback)) {
    console.error('❌ Feedback should have a feedback array');
    return false;
  }
  
  for (const item of feedback.feedback) {
    if (!item.sentiment || typeof item.clarity_score !== 'number') {
      console.error('❌ Feedback item missing required fields');
      return false;
    }
    
    if (!item.overall_feedback || typeof item.overall_feedback !== 'string') {
      console.error('❌ Feedback item missing overall_feedback');
      return false;
    }
  }
  
  console.log('✅ Feedback structure is valid');
  return true;
}

async function runTests() {
  console.log('🚀 Starting feedback system tests...\n');
  
  // Test single feedback
  const singleResult = await testSingleFeedback();
  if (singleResult) {
    await validateFeedbackStructure(singleResult);
  }
  
  console.log('\n---\n');
  
  // Test multiple feedback
  const multipleResult = await testMultipleFeedback();
  if (multipleResult) {
    await validateFeedbackStructure(multipleResult);
  }
  
  console.log('\n🏁 Tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testSingleFeedback,
  testMultipleFeedback,
  validateFeedbackStructure,
  runTests
};
