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
    
    // Check file size - AssemblyAI has limits
    if (audioFile.size > 50 * 1024 * 1024) { // 50MB limit
      return Response.json({ 
        error: 'Audio file too large. Please keep recordings under 50MB.',
        fallback: true 
      }, { status: 413 });
    }
    
    if (audioFile.size < 500) { // Too small, likely empty
      return Response.json({ 
        error: 'Audio file too small. Please record for at least 2-3 seconds.',
        fallback: true 
      }, { status: 400 });
    }
    
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
        const uploadError = await uploadResponse.text();
        console.error('❌ Upload failed:', uploadResponse.status, uploadError);
        throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText} - ${uploadError}`);
      }
      
      const uploadResult = await uploadResponse.json();
      const audioUrl = uploadResult.upload_url;
      console.log('✅ Audio uploaded successfully:', audioUrl);
      
      // Step 2: Submit for transcription with better configuration
      console.log('🔄 Submitting for transcription...');
      const transcriptData = {
        audio_url: audioUrl,
        speech_model: "best",
        language_detection: true,
        punctuate: true,
        format_text: true,
        dual_channel: false,
        webhook_url: null,
        auto_highlights: false,
        filter_profanity: false
      };
      
      const transcriptResponse = await fetch(`${baseUrl}/v2/transcript`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(transcriptData),
      });
      
      if (!transcriptResponse.ok) {
        const transcriptError = await transcriptResponse.text();
        console.error('❌ Transcription request failed:', transcriptResponse.status, transcriptError);
        throw new Error(`Transcription request failed: ${transcriptResponse.status} ${transcriptResponse.statusText} - ${transcriptError}`);
      }
      
      const transcriptResult = await transcriptResponse.json();
      const transcriptId = transcriptResult.id;
      console.log('✅ Transcription job created:', transcriptId);
      
      // Step 3: Poll for completion with improved error handling
      const pollingEndpoint = `${baseUrl}/v2/transcript/${transcriptId}`;
      let attempts = 0;
      const maxAttempts = 40; // 2 minutes maximum (3 seconds * 40)
      
      while (attempts < maxAttempts) {
        console.log(`🔄 Polling attempt ${attempts + 1}/${maxAttempts}...`);
        
        try {
          const pollingResponse = await fetch(pollingEndpoint, { headers });
          
          if (!pollingResponse.ok) {
            console.error(`❌ Polling failed: ${pollingResponse.status}`);
            // Don't throw immediately, try a few more times
            if (attempts > 3) {
              throw new Error(`Polling failed: ${pollingResponse.status} ${pollingResponse.statusText}`);
            }
          } else {
            const pollingResult = await pollingResponse.json();
            console.log(`📊 Transcription status: ${pollingResult.status}`);
            
            if (pollingResult.status === "completed") {
              console.log('✅ Transcription completed successfully');
              
              // Validate transcript
              if (!pollingResult.text || pollingResult.text.trim().length === 0) {
                console.warn('⚠️ Empty transcript received');
                return Response.json({ 
                  transcript: '',
                  confidence: 0,
                  error: 'No speech detected in the audio. Please try speaking louder and more clearly.'
                });
              }
              
              return Response.json({ 
                transcript: pollingResult.text.trim(),
                confidence: pollingResult.confidence || 0.9,
                words: pollingResult.words ? pollingResult.words.length : 0
              });
            } else if (pollingResult.status === "error") {
              console.error('❌ Transcription failed:', pollingResult.error);
              return Response.json({ 
                error: 'Transcription service error',
                message: pollingResult.error || 'Unknown transcription error',
                fallback: true 
              }, { status: 422 });
            } else if (pollingResult.status === "queued" || pollingResult.status === "processing") {
              // Continue polling
              console.log(`⏳ Still ${pollingResult.status}...`);
            } else {
              console.warn(`⚠️ Unknown status: ${pollingResult.status}`);
            }
          }
        } catch (pollError) {
          console.error(`❌ Polling error on attempt ${attempts + 1}:`, pollError.message);
          if (attempts > 5) {
            throw pollError;
          }
        }
        
        // Wait 3 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 3000));
        attempts++;
      }
      
      console.error('❌ Transcription timed out after 2 minutes');
      return Response.json({ 
        error: 'Transcription timeout',
        message: 'Transcription took too long to complete. Please try with a shorter recording.',
        fallback: true 
      }, { status: 408 });
      
    } catch (assemblyError) {
      console.error('❌ AssemblyAI error:', assemblyError);
      
      // Determine error type for better user messaging
      let errorMessage = 'AssemblyAI transcription service error';
      let statusCode = 500;
      
      if (assemblyError.message.includes('Upload failed')) {
        errorMessage = 'Failed to upload audio file. Please try again with a different recording.';
        statusCode = 422;
      } else if (assemblyError.message.includes('timeout') || assemblyError.message.includes('Transcription timeout')) {
        errorMessage = 'Transcription timed out. Please try with a shorter recording.';
        statusCode = 408;
      } else if (assemblyError.message.includes('network') || assemblyError.message.includes('fetch')) {
        errorMessage = 'Network error connecting to transcription service. Please check your internet connection.';
        statusCode = 502;
      }
      
      return Response.json({ 
        error: errorMessage,
        message: assemblyError.message,
        fallback: true 
      }, { status: statusCode });
    }
    
  } catch (error) {
    console.error('❌ Transcription API error:', error);
    
    // Provide helpful error messages based on error type
    let userMessage = 'Internal server error';
    let statusCode = 500;
    
    if (error.message.includes('fetch')) {
      userMessage = 'Network connection error. Please check your internet connection and try again.';
      statusCode = 502;
    } else if (error.message.includes('timeout')) {
      userMessage = 'Request timed out. Please try with a shorter audio recording.';
      statusCode = 408;
    } else if (error.message.includes('Too Many Requests')) {
      userMessage = 'Transcription service is busy. Please wait a moment and try again.';
      statusCode = 429;
    } else if (error.message.includes('format') || error.message.includes('codec')) {
      userMessage = 'Audio format not supported. Please try recording again.';
      statusCode = 415;
    }
    
    return Response.json({ 
      error: userMessage, 
      message: error.message,
      fallback: true,
      suggestion: 'Try using the "Text Answer" mode as an alternative.'
    }, { status: statusCode });
  }
}
