import { NextRequest, NextResponse } from 'next/server';

export async function POST(request) {
  try {
    console.log('🎯 Verbal feedback proxy called');
    
    // Get the JSON data from the request
    const body = await request.json();
    console.log('📤 Request body:', JSON.stringify(body, null, 2));
    
    // Validate request data
    if (!Array.isArray(body)) {
      console.error('❌ Invalid request: body is not an array');
      return NextResponse.json(
        { error: 'Request body must be an array of questions and answers' },
        { status: 400 }
      );
    }
    
    // Forward the request to the FastAPI backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const fullUrl = `${backendUrl}/verbal-feedback/`;
    
    console.log('🔗 Proxying verbal feedback request to:', fullUrl);
    console.log('📋 Request payload size:', JSON.stringify(body).length, 'characters');
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    console.log('📥 Backend response status:', response.status);
    console.log('📊 Backend response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', response.status, errorText);
      
      // Try to parse error as JSON for better error messages
      let errorData;
      try {
        errorData = JSON.parse(errorText);
        console.error('📄 Parsed backend error:', errorData);
      } catch (parseErr) {
        console.error('📄 Raw backend error (not JSON):', errorText);
        errorData = { detail: errorText };
      }
      
      return NextResponse.json(
        { 
          error: `Backend error: ${response.status}`,
          details: errorData,
          message: errorData.detail || errorText || 'Unknown backend error'
        },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log('✅ Backend response received successfully');
    console.log('📄 Response data structure:', {
      hasFeedback: !!data.feedback,
      feedbackLength: data.feedback?.length,
      firstFeedbackKeys: data.feedback?.[0] ? Object.keys(data.feedback[0]) : 'N/A'
    });
    
    // Validate response structure
    if (!data.feedback || !Array.isArray(data.feedback)) {
      console.error('❌ Invalid response structure from backend:', data);
      return NextResponse.json(
        { error: 'Invalid response structure from backend' },
        { status: 502 }
      );
    }
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('❌ Proxy error:', error);
    console.error('🔍 Error stack:', error.stack);
    
    // Provide more specific error messages based on error type
    let errorMessage = `Proxy error: ${error.message}`;
    let statusCode = 500;
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      errorMessage = 'Failed to connect to backend server. Please ensure it is running.';
      statusCode = 502;
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Backend request timed out. Please try again.';
      statusCode = 504;
    } else if (error.message.includes('JSON')) {
      errorMessage = 'Invalid JSON in request or response.';
      statusCode = 400;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        originalError: error.message,
        timestamp: new Date().toISOString()
      },
      { status: statusCode }
    );
  }
}
