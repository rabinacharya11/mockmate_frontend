const axios = require('axios');

/**
 * Direct backend test for the feedback system
 */
async function testBackendFeedbackSystem() {
  console.log('🚀 Testing backend feedback system directly...\n');
  
  // Mock interview data
  const mockInterviewAnswers = [
    {
      questionText: "Tell me about yourself and your background.",
      voiceConvertedToText: "Hi, I'm a software developer with 5 years of experience. I've worked on various web applications using React and Node.js. I enjoy solving complex problems and learning new technologies."
    },
    {
      questionText: "What are your greatest strengths?",
      voiceConvertedToText: "My greatest strengths are problem-solving, teamwork, and adaptability. I work well under pressure and can learn new technologies quickly. I also have strong communication skills."
    },
    {
      questionText: "Describe a challenging project you worked on.",
      voiceConvertedToText: "I worked on a real-time chat application that needed to handle thousands of concurrent users. We used WebSockets and implemented proper scaling techniques with Redis for session management."
    },
    {
      questionText: "Where do you see yourself in 5 years?",
      voiceConvertedToText: "In 5 years, I see myself in a senior engineering role, possibly leading a team. I want to continue growing my technical skills while also developing my leadership abilities."
    },
    {
      questionText: "Why do you want to work for our company?",
      voiceConvertedToText: "I'm impressed by your company's innovative approach to technology and your commitment to user experience. The work you're doing in AI and machine learning aligns with my interests."
    }
  ];

  try {
    console.log('📤 Sending batch feedback request to backend...');
    console.log(`Backend URL: http://localhost:8000/verbal-feedback/`);
    console.log(`Total questions: ${mockInterviewAnswers.length}\n`);
    
    const startTime = Date.now();
    
    const response = await axios.post('http://localhost:8000/verbal-feedback/', mockInterviewAnswers, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 seconds
    });
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    console.log('✅ Response received!');
    console.log(`⏱️  Processing time: ${processingTime}ms`);
    console.log(`📊 Response status: ${response.status}\n`);
    
    // Validate response structure
    if (!response.data || !response.data.feedback || !Array.isArray(response.data.feedback)) {
      throw new Error('Invalid response structure');
    }
    
    const feedback = response.data.feedback;
    
    if (feedback.length !== mockInterviewAnswers.length) {
      throw new Error(`Expected ${mockInterviewAnswers.length} feedback items, got ${feedback.length}`);
    }
    
    console.log('📋 DETAILED FEEDBACK ANALYSIS:');
    console.log('=' .repeat(60));
    
    let totalClarity = 0;
    let totalSentiment = 0;
    let totalFillerWords = 0;
    
    feedback.forEach((item, index) => {
      const question = mockInterviewAnswers[index];
      const clarityPercent = Math.round(item.clarity_score * 100);
      const sentimentPercent = Math.round(((item.sentiment.compound + 1) / 2) * 100);
      const fillerCount = Object.values(item.filler_words).reduce((a, b) => a + b, 0);
      
      totalClarity += item.clarity_score;
      totalSentiment += item.sentiment.compound;
      totalFillerWords += fillerCount;
      
      console.log(`\n🔍 Question ${index + 1}:`);
      console.log(`   ❓ Q: "${question.questionText}"`);
      console.log(`   💬 A: "${question.voiceConvertedToText.substring(0, 80)}..."`);
      console.log(`   📊 Clarity Score: ${clarityPercent}%`);
      console.log(`   😊 Sentiment Score: ${sentimentPercent}%`);
      console.log(`   🗣️  Filler Words: ${fillerCount} (${JSON.stringify(item.filler_words)})`);
      console.log(`   💡 AI Feedback: "${item.overall_feedback}"`);
      console.log(`   📈 Sentiment Details: pos=${item.sentiment.pos}, neu=${item.sentiment.neu}, neg=${item.sentiment.neg}`);
    });
    
    // Calculate session metrics
    const avgClarity = Math.round((totalClarity / feedback.length) * 100);
    const avgSentiment = Math.round(((totalSentiment / feedback.length + 1) / 2) * 100);
    
    console.log('\n' + '=' .repeat(60));
    console.log('📈 SESSION METRICS SUMMARY:');
    console.log(`   🎯 Average Clarity Score: ${avgClarity}%`);
    console.log(`   😊 Average Sentiment Score: ${avgSentiment}%`);
    console.log(`   🗣️  Total Filler Words: ${totalFillerWords}`);
    console.log(`   ⏱️  Total Processing Time: ${processingTime}ms`);
    console.log(`   📝 Questions Processed: ${feedback.length}`);
    console.log('=' .repeat(60));
    
    // Simulate what would be stored in Firebase
    const firebaseData = {
      userId: 'test-user-123',
      sessionId: `session_${Date.now()}`,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      questionsAndFeedback: mockInterviewAnswers.map((answer, index) => ({
        questionNumber: index + 1,
        questionId: `q${index + 1}`,
        questionText: answer.questionText,
        questionType: 'behavioral',
        questionDifficulty: 'medium',
        userAnswer: answer.voiceConvertedToText,
        answerTimestamp: new Date().toISOString(),
        feedbackAnalysis: {
          sentiment: feedback[index].sentiment,
          clarityScore: feedback[index].clarity_score,
          fillerWords: feedback[index].filler_words,
          overallFeedback: feedback[index].overall_feedback,
          analysisTimestamp: new Date().toISOString()
        }
      })),
      sessionMetrics: {
        totalQuestions: mockInterviewAnswers.length,
        totalAnswers: feedback.length,
        averageClarity: totalClarity / feedback.length,
        averageSentiment: totalSentiment / feedback.length,
        totalFillerWords: totalFillerWords,
        sessionDuration: Math.round(processingTime / 1000), // Convert to seconds
        processingTimeMs: processingTime
      },
      lastUpdated: new Date().toISOString()
    };
    
    console.log('\n🔥 SAMPLE FIREBASE DOCUMENT STRUCTURE:');
    console.log(JSON.stringify(firebaseData, null, 2));
    
    console.log('\n✅ BACKEND TEST COMPLETED SUCCESSFULLY!');
    console.log('🎉 The feedback system is ready for production use.');
    console.log('📱 Frontend can now collect answers and send them for batch processing.');
    
    return {
      success: true,
      processingTime,
      metrics: {
        avgClarity,
        avgSentiment,
        totalFillerWords
      },
      sampleData: firebaseData
    };
    
  } catch (error) {
    console.error('\n❌ BACKEND TEST FAILED:');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('🔌 Connection refused - Make sure the FastAPI backend is running on localhost:8000');
      console.error('💡 Start the backend with: python -m uvicorn main:app --reload');
    } else if (error.code === 'ECONNABORTED') {
      console.error('⏰ Request timed out - The backend might be processing slowly');
    } else if (error.response) {
      console.error(`📛 HTTP Error ${error.response.status}: ${error.response.statusText}`);
      console.error('Response data:', error.response.data);
    } else {
      console.error('💥 Unexpected error:', error.message);
    }
    
    return { success: false, error: error.message };
  }
}

// Run the test
testBackendFeedbackSystem()
  .then(result => {
    if (result.success) {
      console.log('\n🎯 All systems operational!');
      process.exit(0);
    } else {
      console.log('\n💥 System check failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
