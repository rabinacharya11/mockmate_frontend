# Mock Interview API Integration Guide

This is a quick reference guide for the current state of the API integration between MockMate and the FastAPI backend.

## Current Status

- **Verbal Feedback Endpoint** (`/verbal-feedback`): Working correctly
- **Generate Questions Endpoint** (`/generate-questions`): Having issues with the underlying AI API
- **Extract Skills Endpoint** (`/extract-skills`): Status unknown, needs testing

## Request/Response Formats

### Generate Questions

```json
// Request
{
  "cv_data": "This is cool",
  "skills": ["Flutter", "Dart", "Firebase"],
  "question_count": 3
}

// Expected Response
[
  {
    "questionText": "How do you handle state management in Flutter?",
    "instruction": "Evaluate understanding of state management options",
    "questionType": "Technical"
  },
  // More questions...
]
```

### Verbal Feedback

```json
// Request
[
  {
    "questionText": "Tell me about your experience with Flutter",
    "voiceConvertedToText": "I have worked with Flutter for 3 years..."
  }
]

// Response
{
  "feedback": [
    {
      "question": "Tell me about your experience with Flutter",
      "sentiment": {
        "neg": 0,
        "neu": 0.878,
        "pos": 0.122,
        "compound": 0.3612
      },
      "clarity_score": 0.8,
      "filler_words": {...},
      "overall_feedback": "Your answer was clear and well-articulated..."
    }
  ]
}
```

## Error Handling

The app is configured to:

1. First attempt to call the real API
2. Fall back to mock data if the API fails
3. Log details about API failures for debugging

## Next Steps

1. Fix the AI API integration in the FastAPI backend for the generate-questions endpoint
2. Test the extract-skills endpoint with real PDF uploads
3. Improve error handling for specific API error types
