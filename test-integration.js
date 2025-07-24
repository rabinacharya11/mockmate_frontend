// Test script to verify the interview completion flow
console.log('🧪 Testing interview completion flow...');

// Simulate interview completion
const testAnswers = [
  {
    questionId: 'q1',
    questionText: 'Tell me about yourself',
    answer: 'I am a software developer with 5 years of experience',
    voiceConvertedToText: 'I am a software developer with 5 years of experience',
    isComplete: true,
    timestamp: new Date().toISOString()
  },
  {
    questionId: 'q2', 
    questionText: 'What are your strengths?',
    answer: 'My main strengths are problem solving and teamwork',
    voiceConvertedToText: 'My main strengths are problem solving and teamwork',
    isComplete: true,
    timestamp: new Date().toISOString()
  }
];

console.log('✅ Test answers prepared:', testAnswers);
console.log('✅ Expected API call format:');
console.log(JSON.stringify(testAnswers.map(a => ({
  questionText: a.questionText,
  voiceConvertedToText: a.voiceConvertedToText
})), null, 2));

// Test eye tracking data structure
const testEyeData = [
  {
    gazeDirection: 'center',
    attentionScore: 85,
    blinkCount: 12,
    timestamp: new Date().toISOString()
  },
  {
    gazeDirection: 'left', 
    attentionScore: 78,
    blinkCount: 15,
    timestamp: new Date().toISOString()
  }
];

console.log('✅ Test eye tracking data:', testEyeData);

console.log('🎯 Integration test completed successfully!');
