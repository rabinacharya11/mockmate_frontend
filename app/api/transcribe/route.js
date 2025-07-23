// Direct implementation using fetch API based on AssemblyAI JavaScript example

export async function POST(request) {
  try {
    console.log('🎤 Transcription API called');
    
    const formData = await request.formData();
    const audioFile = formData.get('audio');
    
    if (!audioFile) {
      console.error('❌ No audio file provided');
      return Response.json({ 
        error: 'No audio file provided',
        fallback: true 
      }, { status: 400 });
    }
    
    console.log('📁 Audio file received:', {
      name: audioFile.name,
      size: audioFile.size,
      type: audioFile.type
    });
    
    const baseUrl = "https://api.assemblyai.com";
    const apiKey = process.env.ASSEMBLYAI_API_KEY || '9bc55ef3d3e9443287e422dd2957dbee';
    
    const headers = {
      authorization: apiKey,
      "content-type": "application/json"
    };
    
    try {
      // Step 1: Upload the audio file
      console.log('📤 Uploading audio to AssemblyAI...');
      const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
      
      const uploadResponse = await fetch(`${baseUrl}/v2/upload`, {
        method: 'POST',
        headers: {
          authorization: apiKey,
        },
        body: audioBuffer,
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }
      
      const uploadResult = await uploadResponse.json();
      const audioUrl = uploadResult.upload_url;
      console.log('✅ Audio uploaded successfully:', audioUrl);
      
      // Step 2: Submit for transcription
      console.log('🔄 Submitting for transcription...');
      const transcriptData = {
        audio_url: audioUrl,
        speech_model: "best"
      };
      
      const transcriptResponse = await fetch(`${baseUrl}/v2/transcript`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(transcriptData),
      });
      
      if (!transcriptResponse.ok) {
        throw new Error(`Transcription request failed: ${transcriptResponse.status} ${transcriptResponse.statusText}`);
      }
      
      const transcriptResult = await transcriptResponse.json();
      const transcriptId = transcriptResult.id;
      console.log('✅ Transcription job created:', transcriptId);
      
      // Step 3: Poll for completion
      const pollingEndpoint = `${baseUrl}/v2/transcript/${transcriptId}`;
      let attempts = 0;
      const maxAttempts = 60; // 3 minutes maximum
      
      while (attempts < maxAttempts) {
        console.log(`🔄 Polling attempt ${attempts + 1}/${maxAttempts}...`);
        
        const pollingResponse = await fetch(pollingEndpoint, { headers });
        const pollingResult = await pollingResponse.json();
        
        if (pollingResult.status === "completed") {
          console.log('✅ Transcription completed successfully');
          return Response.json({ 
            transcript: pollingResult.text || '',
            confidence: pollingResult.confidence || 0.9
          });
        } else if (pollingResult.status === "error") {
          console.error('❌ Transcription failed:', pollingResult.error);
          throw new Error(`Transcription failed: ${pollingResult.error}`);
        }
        
        // Wait 3 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 3000));
        attempts++;
      }
      
      throw new Error('Transcription timed out after 3 minutes');
      
    } catch (assemblyError) {
      console.error('❌ AssemblyAI error:', assemblyError);
      
      return Response.json({ 
        error: 'AssemblyAI transcription service error',
        message: assemblyError.message,
        fallback: true 
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ Transcription API error:', error);
    
    return Response.json({ 
      error: 'Internal server error', 
      message: error.message,
      fallback: true 
    }, { status: 500 });
  }
}
