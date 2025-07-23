import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { doc, updateDoc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { extractSkills } from "../lib/api";
import LoadingState from "./LoadingState";
import ErrorDisplay from "./ErrorDisplay";
import { logger } from "../lib/config";

export default function CVUpload({ onSkillsExtracted, onStartInterview }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [existingSkills, setExistingSkills] = useState([]);
  const { user } = useAuth();

  // Check if user already has skills in Firestore
  useEffect(() => {
    const checkExistingSkills = async () => {
      if (!user) return;
      
      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const data = userSnap.data();
          if (data && data.skills && data.skills.length > 0) {
            setExistingSkills(data.skills);
            // If the user already has skills, call the callback
            onSkillsExtracted && onSkillsExtracted(data.skills);
          }
        } else {
          // Create user document if it doesn't exist
          await setDoc(userRef, {
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            createdAt: new Date(),
            skills: [],
            cv_data: {}
          });
          console.log('Created new user document for:', user.email);
        }
      } catch (err) {
        console.error("Error checking existing skills:", err);
        logger.error("Error checking existing skills:", err);
      }
    };
    
    checkExistingSkills();
  }, [user, onSkillsExtracted]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Check file type
      const validTypes = [
        "application/pdf",
        "application/msword", 
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ];
      
      if (validTypes.includes(selectedFile.type)) {
        setFile(selectedFile);
        setError("");
        console.log('Valid file selected:', selectedFile.name, selectedFile.type);
      } else {
        setFile(null);
        setError("Please select a valid document (PDF, DOC, DOCX)");
        console.log('Invalid file type:', selectedFile.type);
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !user) {
      setError("Please select a file to upload");
      return;
    }
    
    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError("File size exceeds 5MB limit. Please select a smaller file.");
      return;
    }
    
    setLoading(true);
    setError("");
    setSuccess(false);
    
    try {
      console.log('Creating FormData with file:', file.name, file.type, file.size);
      const formData = new FormData();
      formData.append("file", file);
      
      // Log FormData entries to debug
      for (let [key, value] of formData.entries()) {
        console.log(`FormData contains: ${key} = ${value instanceof File ? value.name : value}`);
      }

      console.log('Calling extractSkills API...');
      const data = await extractSkills(formData);
      console.log('Skills extracted successfully:', data);

      if (!data || !data.skills || data.skills.length === 0) {
        throw new Error("Could not extract skills from the CV. Please try a different document.");
      }

      // Ensure user document exists before updating
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      
      const updateData = {
        cv_data: data.cv_data || {},
        skills: data.skills || [],
        lastUpdated: new Date(),
        fileName: file.name,
        uploadTimestamp: new Date()
      };

      if (userSnap.exists()) {
        await updateDoc(userRef, updateData);
      } else {
        // Create the document with all necessary fields
        await setDoc(userRef, {
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: new Date(),
          ...updateData
        });
      }

      console.log('User data updated in Firestore');
      
      setExistingSkills(data.skills);
      setSuccess(true);
      setFile(null);
      
      // Call the callback with the extracted skills
      onSkillsExtracted && onSkillsExtracted(data.skills);
      
      // Auto-clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
      
    } catch (err) {
      console.error("Error uploading CV:", err);
      
      let errorMessage = "Failed to upload CV. ";
      
      if (err.message.includes("NetworkError") || err.message.includes("Failed to fetch")) {
        errorMessage += "Network error. Please check your connection and ensure the API server is running.";
      } else if (err.message.includes("Cannot connect to API server")) {
        errorMessage += "Cannot connect to the API server. Please ensure the backend is running on localhost:8000.";
      } else {
        errorMessage += err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 w-full max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Upload Your CV</h2>
      
      {existingSkills.length > 0 && !success && !loading && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-4 py-3 rounded-lg mb-6">
          <h3 className="font-medium">You already have a CV uploaded</h3>
          <p className="mt-1 mb-2">We found the following skills from your previous upload:</p>
          <div className="flex flex-wrap gap-2 my-2">
            {existingSkills.map((skill, index) => (
              <span key={index} className="bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-sm">
                {skill}
              </span>
            ))}
          </div>
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm">You can continue with these skills or upload a new CV.</p>
            <button
              onClick={() => {
                if (typeof onStartInterview === 'function') {
                  onStartInterview();
                } else {
                  // Fallback to using the custom event
                  window.dispatchEvent(new CustomEvent('startInterview'));
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors text-sm font-medium"
            >
              Start Interview Now →
            </button>
          </div>
        </div>
      )}
      
      {loading ? (
        <LoadingState message="Analyzing your CV and extracting skills..." />
      ) : success ? (
        <div className="bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-6 rounded-lg mb-4 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium mb-2">CV Uploaded Successfully!</h3>
          <p className="mb-4">Your skills have been extracted and you can now proceed to interview practice.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button 
              onClick={() => setSuccess(false)} 
              className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Upload Another CV
            </button>
            <button
              onClick={() => {
                if (typeof onStartInterview === 'function') {
                  onStartInterview();
                } else {
                  // Fallback to using the custom event
                  window.dispatchEvent(new CustomEvent('startInterview'));
                }
              }}
              className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
            >
              Start Interview Now
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
            <div className="relative">
              <input
                type="file"
                id="cv-upload"
                onChange={handleFileChange}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                accept=".pdf,.doc,.docx"
              />
              <label
                htmlFor="cv-upload"
                className="cursor-pointer flex flex-col items-center justify-center"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-16 w-16 text-gray-400 mb-4" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
                  />
                </svg>
                <p className="text-gray-600 dark:text-gray-300 mb-2 text-lg font-semibold">
                  {file ? file.name : "Click or drag to upload your CV"}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  PDF, DOC, or DOCX formats (Max 5MB)
                </p>
              </label>
            </div>
          </div>
          
          {error && (
            <ErrorDisplay 
              message={error} 
              title="Upload Error"
              showRetry={false}
            />
          )}
          
          <div className="flex justify-center space-x-4">
            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className={`py-3 px-8 rounded-lg font-medium transition-colors ${
                !file
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              Upload & Analyze CV
            </button>
          </div>
          
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h3 className="text-md font-medium mb-2 text-gray-800 dark:text-white">What happens next?</h3>
            <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-300 space-y-1">
              <li>Your CV will be analyzed to extract your skills and experience</li>
              <li>Based on your profile, relevant interview questions will be generated</li>
              <li>Practice answering these questions to prepare for your interview</li>
              <li>Get feedback on your answers and track your progress</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}