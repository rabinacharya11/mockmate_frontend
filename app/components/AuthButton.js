"use client";
import { useAuth } from "../context/AuthContext";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function AuthButton() {
  const { user, login, logout, loading, error: authError } = useAuth();
  const [loginError, setLoginError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      setLoginError(null);
      await login();
    } catch (err) {
      console.error("Login failed:", err);
      setLoginError(err.message || "Failed to sign in with Google");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await logout();
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <button 
        disabled
        className="bg-gray-400 text-white px-8 py-3 rounded-lg font-medium cursor-not-allowed"
      >
        Loading...
      </button>
    );
  }

  if (user) {
    return (
      <div className="flex items-center space-x-4">
        <Link href="/dashboard" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
          Go to Dashboard
        </Link>
        <div className="flex items-center space-x-2">
          <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-200">
            {user.photoURL && (
              <Image 
                src={user.photoURL} 
                alt={user.displayName || 'User'} 
                fill
                className="object-cover"
              />
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-gray-800 dark:text-white">{user.displayName}</span>
            <button 
              onClick={handleLogout}
              disabled={isLoading}
              className={`text-sm text-gray-500 hover:text-red-500 text-left ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? 'Signing Out...' : 'Sign Out'}
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center">
      <button 
        onClick={handleLogin}
        disabled={isLoading}
        data-login-button
        className={`bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors ${
          isLoading ? 'opacity-75 cursor-not-allowed' : ''
        }`}
      >
        {isLoading ? 'Signing in...' : 'Sign in with Google'}
      </button>
      
      {(loginError || authError) && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md text-sm max-w-md">
          <strong>Error: </strong> {loginError || authError}
          {(loginError || authError)?.includes('api-key-not-valid') && (
            <p className="mt-2">
              This appears to be a Firebase configuration issue. Please check your Firebase API key in the environment variables.
            </p>
          )}
        </div>
      )}
    </div>
  );
}