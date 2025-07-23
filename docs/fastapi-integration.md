# FastAPI Integration Guide

This document outlines how MockMate integrates with the FastAPI backend.

## API Configuration

The API connection is configured in `app/lib/config.js`. By default, it connects to:

```
http://localhost:8000
```

## API Endpoints

MockMate uses the following FastAPI endpoints:

### 1. Extract Skills from CV

- **Endpoint:** `/extract-skills`
- **Method:** POST
- **Request Format:** FormData with a 'file' field
- **Response Format:**
  ```json
  {
    "cv_data": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "experience": [...],
      "education": [...],
      "filename": "resume.pdf"
    },
    "skills": ["JavaScript", "React", "Node.js", "Python", ...]
  }
  ```

### 2. Generate Interview Questions

- **Endpoint:** `/generate-questions`
- **Method:** POST
- **Request Format:**
  ```json
  {
    "cv_data": "{\"name\":\"John Doe\", ...}",  // CV data as a JSON string
    "skills": ["JavaScript", "React", ...],
    "question_count": 5
  }
  ```
- **Response Format:**
  ```json
  {
    "questions": [
      {
        "id": "q1",
        "type": "technical",
        "difficulty": "medium",
        "questionText": "Explain how you have used JavaScript in your previous projects.",
        "instruction": "Focus on specific examples and technical details related to JavaScript."
      },
      ...
    ]
  }
  ```

### 3. Get Verbal Feedback

- **Endpoint:** `/verbal-feedback`
- **Method:** POST
- **Request Format (array of objects):**
  ```json
  [
    {
      "questionText": "Tell me about your experience with JavaScript",
      "voiceConvertedToText": "I have been using JavaScript for 5 years..."
    }
  ]
  ```
- **Response Format:**
  ```json
  {
    "feedback": [
      {
        "question": "Tell me about your experience with JavaScript",
        "answer": "I have been using JavaScript for 5 years...",
        "sentiment": {
          "pos": 0.45,
          "neg": 0.05,
          "neu": 0.5,
          "compound": 0.4
        },
        "clarity_score": 0.85,
        "filler_words": { "um": 1, "like": 2 },
        "overall_feedback": "Your answer was clear and well-articulated..."
      }
    ]
  }
  ```

## Fallback Mechanism

If the FastAPI backend is not available or returns an error, MockMate uses mock data for testing and development. This behavior is controlled by:

```javascript
// In app/lib/config.js
useMockDataFallback: true;
```

Set this to `false` to disable the fallback and show real errors.

## Testing API Connection

To test the connection to the FastAPI backend, run:

```
node scripts/test-api.js
```

Or using the shell script:

```
./scripts/test-api.sh
```

## Troubleshooting

1. **Backend Not Responding:**

   - Ensure the FastAPI server is running at http://localhost:8000
   - Check network connectivity and firewall settings

2. **CORS Issues:**

   - The FastAPI backend should have CORS configured to allow requests from your Next.js frontend

3. **JSON Format Errors:**
   - Ensure the request data matches the format expected by the FastAPI endpoints
