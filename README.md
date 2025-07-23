# MockMate - AI-Powered Interview Preparation Platform

MockMate is a comprehensive AI-powered interview preparation platform that helps users practice for job interviews through personalized questions, real-time feedback, and detailed performance analytics.

## 🎯 Features

### Core Functionality

- **CV Analysis & Skill Extraction**: Upload your resume and automatically extract skills and experience
- **AI-Generated Questions**: Get personalized interview questions based on your background
- **Voice Recording & Analysis**: Record your answers and receive detailed feedback
- **Real-time Feedback**: Instant analysis of clarity, sentiment, and communication patterns
- **Performance Tracking**: Comprehensive reports and charts to track your progress
- **Firebase Integration**: Secure data storage and Google authentication

### Key Components

- **Resume Parsing**: Extract skills and experience from PDF, DOC, DOCX files
- **Question Generation**: AI-powered interview questions tailored to your profile
- **Voice-to-Text**: Browser-based speech recognition for answer recording
- **Sentiment Analysis**: Real-time analysis of your responses
- **Filler Word Detection**: Identify and track usage of filler words
- **Progress Charts**: Visual analytics using Chart.js and react-chartjs-2

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Firebase project with Firestore and Authentication enabled
- FastAPI backend server running on localhost:8000

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd mockmate
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory:

   ```env
   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

   # API Configuration
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

4. **Start the development server**

   ```bash
   npm run dev
   ```

5. **Access the application**
   Open [http://localhost:3000](http://localhost:3000) in your browser

## 🏗️ Architecture

### Frontend (Next.js 15.4.3)

- **React**: Component-based UI framework
- **Tailwind CSS**: Utility-first CSS framework
- **Firebase**: Authentication and Firestore database
- **Chart.js**: Data visualization and analytics
- **Axios**: HTTP client for API requests

### Backend API Integration

The application integrates with a FastAPI backend that provides three main endpoints:

#### 1. Extract Skills Endpoint

```http
POST /extract-skills/
Content-Type: multipart/form-data

Body: FormData with 'file' containing CV document

Response:
{
  "cv_data": {
    "name": "John Doe",
    "email": "john@example.com",
    "experience": [...],
    "education": [...]
  },
  "skills": ["JavaScript", "React", "Python", ...]
}
```

#### 2. Generate Questions Endpoint

```http
POST /generate-questions/
Content-Type: application/json

Body:
{
  "cv_data": "CV data as string or object",
  "skills": ["skill1", "skill2", ...],
  "question_count": 5
}

Response:
{
  "questions": [
    "Tell me about your experience with JavaScript",
    "How do you handle challenging projects?",
    ...
  ]
}
```

#### 3. Verbal Feedback Endpoint

```http
POST /verbal-feedback/
Content-Type: application/json

Body:
{
  "question": "Interview question text",
  "answer": "User's spoken answer text"
}

Response:
{
  "sentiment": {
    "pos": 0.6,
    "neg": 0.1,
    "neu": 0.3,
    "compound": 0.5
  },
  "clarity_score": 0.85,
  "filler_words": {
    "um": 2,
    "uh": 1,
    "like": 3
  },
  "overall_feedback": "Your answer was clear and well-structured..."
}
```

## 📱 User Flow

1. **Landing Page**: Welcome screen with feature overview and sign-up
2. **Authentication**: Google OAuth integration via Firebase
3. **Dashboard**: Main application interface with three tabs:
   - **Upload CV**: Resume upload and skill extraction
   - **Mock Interview**: Question generation and interview practice
   - **Performance Reports**: Analytics and progress tracking

### Complete Interview Process

1. User uploads CV → Skills extracted and stored in Firebase
2. AI generates personalized interview questions
3. User records answers using browser speech recognition
4. Real-time feedback analysis (sentiment, clarity, filler words)
5. Results stored in Firebase for progress tracking
6. Comprehensive reports with charts and analytics

## 🔧 Configuration

### Firebase Setup

1. Create a Firebase project at [https://console.firebase.google.com](https://console.firebase.google.com)
2. Enable Google Authentication
3. Create a Firestore database
4. Set up security rules for user data access

### API Configuration

The application expects a FastAPI backend with the following characteristics:

- **Base URL**: `http://localhost:8000`
- **CORS enabled** for frontend domain
- **File upload support** for CV processing
- **JSON responses** matching the specified formats

## 📊 Data Structure

### Firebase Collections

#### Users Collection

```javascript
users/{userId}: {
  cv_data: Object,           // Extracted CV information
  skills: Array<string>,     // User's skills
  lastUpdated: Timestamp,    // Last profile update
  fileName: string,          // Uploaded CV filename
  uploadTimestamp: Timestamp // Upload time
}
```

#### Interview Sessions Sub-collection

```javascript
users/{userId}/interviewSessions/{sessionId}: {
  createdAt: Timestamp,
  results: [
    {
      question: string,
      answer: string,
      feedback: [
        {
          sentiment: Object,
          clarity_score: number,
          filler_words: Object,
          overall_feedback: string
        }
      ]
    }
  ]
}
```

## 🎨 UI Components

### Core Components

- **CVUpload**: File upload and skill extraction interface
- **QuestionList**: Display generated questions and interview controls
- **InterviewSession**: Complete interview flow with recording
- **Reports**: Analytics dashboard with charts and insights
- **AuthButton**: Google authentication integration
- **LoadingState**: User-friendly loading indicators
- **ErrorDisplay**: Comprehensive error handling

### Chart Components

- **Performance Over Time**: Line chart tracking improvement
- **Filler Words Analysis**: Bar chart of speech patterns
- **Skills Radar**: Radar chart showing skill-based performance
- **Session Details**: Detailed breakdown of interview sessions

## 🛠️ Development

### Available Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run start`: Start production server
- `npm run lint`: Run ESLint

### Code Structure

```
app/
├── components/          # React components
├── context/            # React context providers
├── lib/               # Utilities and API functions
├── dashboard/         # Dashboard page
└── page.js           # Landing page

Key Files:
├── app/lib/api.js     # API integration functions
├── app/lib/firebase.js # Firebase configuration
├── app/components/InterviewSession.js # Main interview component
└── app/components/Reports.js # Analytics dashboard
```

## 🔒 Security

- **Firebase Authentication**: Secure Google OAuth integration
- **Firestore Security Rules**: User data access control
- **Input Validation**: File type and size restrictions
- **Error Handling**: Comprehensive error management
- **Data Privacy**: User data stored securely in Firebase

## 📈 Analytics & Reporting

### Metrics Tracked

- **Clarity Score**: Speech clarity and articulation
- **Sentiment Analysis**: Positive/negative/neutral tone
- **Filler Word Usage**: Detection and counting
- **Response Time**: Time taken to answer questions
- **Progress Tracking**: Improvement over multiple sessions

### Visualization

- **Performance Charts**: Line charts showing trends
- **Skill Analysis**: Radar charts for skill assessment
- **Word Usage**: Bar charts for filler word patterns
- **Session Comparison**: Detailed session breakdowns

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, please create an issue on GitHub or contact the development team.

---

**MockMate** - Prepare for success, one interview at a time! 🎯
