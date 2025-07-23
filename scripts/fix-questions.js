/**
 * Utility script to test and fix question generation
 * Run with: node scripts/fix-questions.js
 */

// Simulate the questions generation process with mock data
const mockQuestionGeneration = () => {
  // Sample skills - similar to what would be extracted from a CV
  const skills = ["JavaScript", "React", "Node.js", "API Integration", "Testing"];
  
  // Generate mock questions based on skills
  const questions = [];
  const questionTypes = [
    { type: "technical", weight: 0.5 },
    { type: "behavioral", weight: 0.3 },
    { type: "situational", weight: 0.2 }
  ];
  
  const questionCount = 5;
  
  for (let i = 0; i < questionCount; i++) {
    // Pick a random skill
    const skill = skills[Math.floor(Math.random() * skills.length)];
    
    // Pick a question type based on weights
    const rand = Math.random();
    let typeIndex = 0;
    let cumulativeWeight = questionTypes[0].weight;
    
    while (rand > cumulativeWeight && typeIndex < questionTypes.length - 1) {
      typeIndex++;
      cumulativeWeight += questionTypes[typeIndex].weight;
    }
    
    const questionType = questionTypes[typeIndex].type;
    
    // Generate a question based on skill and type
    let question = {
      id: `q${i+1}`,
      type: questionType,
      difficulty: ["easy", "medium", "hard"][Math.floor(Math.random() * 3)],
      questionText: "",
      instruction: ""
    };
    
    if (questionType === "technical") {
      question.questionText = `Explain how you have used ${skill} in your previous projects.`;
      question.instruction = `Focus on specific examples and technical details related to ${skill}.`;
    } else if (questionType === "behavioral") {
      question.questionText = `Describe a situation where you had to apply your knowledge of ${skill} to solve a problem.`;
      question.instruction = `Use the STAR method: Situation, Task, Action, Result.`;
    } else {
      question.questionText = `If you were faced with a project requiring ${skill}, how would you approach it?`;
      question.instruction = `Consider both technical implementation and project management aspects.`;
    }
    
    questions.push(question);
  }
  
  return { questions };
};

// Run the mock question generation to verify it produces valid output
const testQuestionGeneration = () => {
  console.log('=== Testing Question Generation ===');
  
  try {
    // Test with valid data
    const result = mockQuestionGeneration();
    console.log('Generated questions successfully:');
    console.log(JSON.stringify(result, null, 2));
    
    // Verify the structure
    if (result && result.questions && Array.isArray(result.questions)) {
      console.log(`✅ Successfully generated ${result.questions.length} questions`);
    } else {
      console.log('❌ Failed to generate valid questions');
    }
    
    // Test accessing the questions array (this should work)
    try {
      const count = result.questions.length;
      console.log(`✅ Successfully accessed questions array with ${count} items`);
      
      // Check the first question's structure
      const firstQuestion = result.questions[0];
      console.log('First question:');
      console.log(JSON.stringify(firstQuestion, null, 2));
      
      // Check required properties
      if (firstQuestion.id && firstQuestion.type && firstQuestion.questionText) {
        console.log('✅ Question has required properties');
      } else {
        console.log('❌ Question is missing required properties');
      }
    } catch (err) {
      console.log(`❌ Error accessing questions array: ${err.message}`);
    }
    
  } catch (err) {
    console.log(`❌ Error during test: ${err.message}`);
  }
};

// Run the test
testQuestionGeneration();
