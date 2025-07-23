// Test script for question generation with Flutter/Dart skills
// This script tests the predefined questions feature

async function testFlutterDartQuestions() {
  try {
    // Import the API functions
    const { generateQuestions } = require('../app/lib/api.js');
    
    console.log('Testing question generation with Flutter/Dart skills...');
    
    // Test with Flutter/Dart skills
    const flutterRequest = {
      cv_data: "Test CV data for Flutter developer",
      skills: ["Flutter", "Dart", "Firebase", "Clean Code", "TDD", "CI/CD"],
      question_count: 9
    };
    
    console.log('Request:', flutterRequest);
    const flutterResult = await generateQuestions(flutterRequest);
    
    console.log('\nResult for Flutter skills:');
    console.log('Source:', flutterResult.source);
    console.log('Question count:', flutterResult.questions.length);
    console.log('First question:', flutterResult.questions[0].questionText);
    console.log('Second question:', flutterResult.questions[1].questionText);
    
    // Test with other skills to make sure those still generate random questions
    const otherRequest = {
      cv_data: "Test CV data for JavaScript developer",
      skills: ["JavaScript", "React", "Node.js"],
      question_count: 5
    };
    
    console.log('\nTesting with non-Flutter skills:');
    console.log('Request:', otherRequest);
    const otherResult = await generateQuestions(otherRequest);
    
    console.log('\nResult for other skills:');
    console.log('Source:', otherResult.source);
    console.log('Question count:', otherResult.questions.length);
    console.log('First question:', otherResult.questions[0].questionText);
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testFlutterDartQuestions();
