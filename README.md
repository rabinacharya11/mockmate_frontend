# MockMate

MockMate is an AI-powered interview preparation platform that helps users practice for job interviews with personalized feedback.

## Features

- **User Authentication**: Sign in with Google to create a personalized account
- **Resume Parsing**: Upload your CV to extract skills and experience
- **Question Generation**: Get custom interview questions based on your CV
- **Mock Interviews**: Record your answers and receive detailed feedback
- **Performance Reports**: View analytics on your interview performance

## Tech Stack

- Next.js 15
- Firebase (Authentication, Firestore)
- Tailwind CSS
- Chart.js for visualizations
- React Hook Form for form handling

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm or yarn
- Firebase account

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/mockmate.git
   cd mockmate
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a Firebase project:

   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Set up Authentication with Google Sign-In
   - Create a Firestore database

4. Configure environment variables:

   - Copy `.env.local.example` to `.env.local`
   - Fill in your Firebase configuration details

5. Run the development server:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Backend Setup

In a production environment, you would need to set up a Python backend server with the following endpoints:

1. `/extract-skills/` - For CV parsing
2. `/generate-questions/` - For generating interview questions
3. `/verbal-feedback/` - For analyzing interview responses

For development purposes, we've included mock API routes in `/app/api/` that simulate these endpoints.

## Deployment

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new) from the creators of Next.js.

1. Build the application:

   ```bash
   npm run build
   ```

2. Deploy to Vercel:
   ```bash
   vercel --prod
   ```

## User Flow

1. User sees landing page
2. User creates profile with Google Sign-In
3. User uploads CV
4. CV is parsed and skills are extracted
5. User starts mock interview
6. Questions are generated based on skills
7. User records answers to questions
8. Answers are analyzed for verbal feedback
9. Feedback is stored and reports are generated
10. User can view performance analytics

## License

This project is licensed under the MIT License.
