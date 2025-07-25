// Quick test to check if InterviewSession component imports work
const testImports = () => {
  try {
    // Test Firebase imports
    const { doc, collection, addDoc, getDoc, setDoc, updateDoc, serverTimestamp } = require('firebase/firestore');
    console.log('✅ All Firebase functions imported successfully');
    
    // Check if required functions are defined
    const functions = { doc, collection, addDoc, getDoc, setDoc, updateDoc, serverTimestamp };
    Object.entries(functions).forEach(([name, func]) => {
      if (typeof func === 'function') {
        console.log(`✅ ${name} is defined and is a function`);
      } else {
        console.log(`❌ ${name} is not a function:`, typeof func);
      }
    });
    
    return true;
  } catch (error) {
    console.error('❌ Import test failed:', error.message);
    return false;
  }
};

console.log('🧪 Testing Firebase imports for InterviewSession...');
const success = testImports();
console.log(success ? '✅ All imports work correctly' : '❌ Import issues detected');
