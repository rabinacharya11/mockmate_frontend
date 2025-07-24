/**
 * End-to-end test for the interview feedback system
 */

const { getMultipleVerbalFeedback } = require('./app/lib/api');

async function testFullInterviewFlow() {
  console.log('🚀 Testing complete interview feedback flow...\n');
  
  // Simulate a complete interview with 5 questions
  const mockInterviewAnswers = [
    {
      questionText: "Tell me about yourself and your background.",
      voiceConvertedToText: "Hi, I'm a software developer with 5 years of experience. I've worked on various web applications using React and Node.js. I enjoy solving complex problems and learning new technologies. I'm passionate about creating user-friendly applications."
    },
    {
      questionText: "What are your greatest strengths?",
      voiceConvertedToText: "My greatest strengths are problem-solving, teamwork, and adaptability. I work well under pressure and can learn new technologies quickly. I also have strong communication skills and enjoy mentoring junior developers."
    },
    {
      questionText: "Describe a challenging project you worked on.",
      voiceConvertedToText: "I worked on a real-time chat application that needed to handle thousands of concurrent users. We used WebSockets and implemented proper scaling techniques. The main challenge was ensuring message delivery and handling connection drops gracefully."
    },
    {
      questionText: "Where do you see yourself in 5 years?",
      voiceConvertedToText: "In 5 years, I see myself in a senior engineering role, possibly leading a team. I want to continue growing my technical skills while also developing my leadership abilities. I'm interested in contributing to architectural decisions and mentoring other developers."
    },
    {
      questionText: "Why do you want to work for our company?",
      voiceConvertedToText: "I'm impressed by your company's innovative approach to technology and your commitment to user experience. The work you're doing in AI and machine learning aligns with my interests. I believe I can contribute to your team while also learning from the talented engineers here."
    }
  ];

  try {
    console.log('📤 Sending all answers for batch feedback analysis...');
    console.log(`Total answers: ${mockInterviewAnswers.length}`);
    
    // Test the multiple feedback API (this is what the interview completion uses)
    const startTime = Date.now();
    const feedbackResponse = await getMultipleVerbalFeedback(mockInterviewAnswers);
    const endTime = Date.now();
    
    console.log(`⏱️  Feedback generation took: ${endTime - startTime}ms`);
    console.log('✅ Feedback response received!\n');
    
    // Validate the response structure
    if (!feedbackResponse || !feedbackResponse.feedback || !Array.isArray(feedbackResponse.feedback)) {
      throw new Error('Invalid feedback response structure');
    }
    
    if (feedbackResponse.feedback.length !== mockInterviewAnswers.length) {
      throw new Error(`Expected ${mockInterviewAnswers.length} feedback items, got ${feedbackResponse.feedback.length}`);
    }
    
    console.log('📊 FEEDBACK ANALYSIS SUMMARY:');
    console.log('=' .repeat(50));
    
    let totalClarity = 0;
    let totalSentiment = 0;
    let totalFillerWords = 0;
    
    feedbackResponse.feedback.forEach((feedback, index) => {
      const question = mockInterviewAnswers[index];
      const clarityPercent = Math.round(feedback.clarity_score * 100);
      const sentimentPercent = Math.round(((feedback.sentiment.compound + 1) / 2) * 100);
      const fillerCount = Object.values(feedback.filler_words).reduce((a, b) => a + b, 0);
      
      totalClarity += feedback.clarity_score;
      totalSentiment += feedback.sentiment.compound;
      totalFillerWords += fillerCount;
      
      console.log(`\n🔍 Question ${index + 1}:`);
      console.log(`   📝 Question: "${question.questionText}"`);
      console.log(`   💬 Answer: "${question.voiceConvertedToText.substring(0, 100)}..."`);
      console.log(`   📊 Clarity: ${clarityPercent}%`);
      console.log(`   😊 Sentiment: ${sentimentPercent}%`);
      console.log(`   🗣️  Filler Words: ${fillerCount}`);
      console.log(`   💡 Feedback: "${feedback.overall_feedback}"`);
    });
    
    // Calculate averages
    const avgClarity = Math.round((totalClarity / mockInterviewAnswers.length) * 100);
    const avgSentiment = Math.round(((totalSentiment / mockInterviewAnswers.length + 1) / 2) * 100);
    
    console.log('\n' + '=' .repeat(50));
    console.log('📈 OVERALL INTERVIEW METRICS:');
    console.log(`   🎯 Average Clarity: ${avgClarity}%`);
    console.log(`   😊 Average Sentiment: ${avgSentiment}%`);
    console.log(`   🗣️  Total Filler Words: ${totalFillerWords}`);
    console.log(`   ⏱️  Processing Time: ${endTime - startTime}ms`);
    console.log('=' .repeat(50));
    
    // Simulate the Firebase data structure that would be created
    const simulatedFirebaseData = {
      userId: 'test-user-123',
      sessionId: `session_${Date.now()}`,
      createdAt: new Date(),
      completedAt: new Date(),
      questionsAndFeedback: mockInterviewAnswers.map((answer, index) => ({
        questionNumber: index + 1,
        questionId: `q${index + 1}`,
        questionText: answer.questionText,
        questionType: 'general',
        questionDifficulty: 'medium',
        userAnswer: answer.voiceConvertedToText,
        answerTimestamp: new Date(),
        feedbackAnalysis: {
          sentiment: feedbackResponse.feedback[index].sentiment,
          clarityScore: feedbackResponse.feedback[index].clarity_score,
          fillerWords: feedbackResponse.feedback[index].filler_words,
          overallFeedback: feedbackResponse.feedback[index].overall_feedback,
          analysisTimestamp: new Date()
        }
      })),
      sessionMetrics: {
        totalQuestions: mockInterviewAnswers.length,
        totalAnswers: mockInterviewAnswers.length,
        averageClarity: totalClarity / mockInterviewAnswers.length,
        averageSentiment: totalSentiment / mockInterviewAnswers.length,
        totalFillerWords: totalFillerWords,
        sessionDuration: 300 // 5 minutes
      }
    };
    
    console.log('\n🔥 FIREBASE DATA STRUCTURE:');
    console.log(JSON.stringify(simulatedFirebaseData, null, 2));
    
    console.log('\n✅ END-TO-END TEST COMPLETED SUCCESSFULLY!');
    console.log('🎉 The feedback system is working properly and ready for production use.');
    
    return {
      success: true,
      metrics: {
        avgClarity: avgClarity,
        avgSentiment: avgSentiment,
        totalFillerWords: totalFillerWords,
        processingTime: endTime - startTime
      },
      feedbackData: simulatedFirebaseData
    };
    
  } catch (error) {
    console.error('\n❌ END-TO-END TEST FAILED:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testFullInterviewFlow()
    .then(result => {
      if (result.success) {
        console.log('\n🎯 Test completed successfully!');
        process.exit(0);
      } else {
        console.log('\n💥 Test failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { testFullInterviewFlow };
