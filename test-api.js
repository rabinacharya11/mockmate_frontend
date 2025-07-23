// test-api.js
// Simple script to test our API response handling

// Import the function directly from the file
const generateMockQuestions = (skills = [], questionCount = 5) => {
  // Generate mock questions based on skills
  const questions = [];
  const questionTypes = [
    { type: "technical", weight: 0.5 },
    { type: "behavioral", weight: 0.3 },
    { type: "situational", weight: 0.2 }
  ];
  
  // Ensure we generate at least 1 question
  const numQuestions = Math.max(1, Math.min(10, questionCount));
  
  for (let i = 0; i < numQuestions; i++) {
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

// Test with some skills
const testSkills = ["JavaScript", "React", "Node.js", "API Design", "Communication"];
const result = generateMockQuestions(testSkills, 5);

console.log("Generated Mock Questions:");
console.log(JSON.stringify(result, null, 2));
console.log(`Successfully generated ${result.questions.length} questions`);

// Verify the structure
const allValid = result.questions.every(q => 
  q.id && q.type && q.questionText && typeof q.instruction === 'string'
);
console.log(`All questions have required fields: ${allValid ? 'Yes' : 'No'}`);

// Export the function for possible reuse
module.exports = { generateMockQuestions };
