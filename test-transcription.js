#!/usr/bin/env node

// Test script to verify AssemblyAI transcription functionality

async function testTranscription() {
  console.log('🧪 Testing AssemblyAI transcription...');
  
  const apiKey = '9bc55ef3d3e9443287e422dd2957dbee';
  
  try {
    // Test API key validity
    console.log('1️⃣ Testing API key...');
    const response = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'GET',
      headers: {
        'authorization': apiKey,
        'content-type': 'application/json'
      }
    });
    
    if (response.ok) {
      console.log('✅ API key is valid');
      const data = await response.json();
      console.log('Response sample:', data);
    } else {
      console.error('❌ API key invalid:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return;
    }
    
    // Test upload endpoint with a small buffer
    console.log('2️⃣ Testing upload endpoint...');
    const testAudio = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]); // Small test buffer
    
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'authorization': apiKey,
      },
      body: testAudio,
    });
    
    if (uploadResponse.ok) {
      console.log('✅ Upload endpoint accessible');
      const uploadResult = await uploadResponse.json();
      console.log('Upload result:', uploadResult);
    } else {
      console.error('❌ Upload failed:', uploadResponse.status, uploadResponse.statusText);
      const errorText = await uploadResponse.text();
      console.error('Error details:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testTranscription();
