"use client";

/**
 * ErrorDisplay component
 * @param {Object} props - Component props
 * @param {string} props.message - Error message to display
 * @param {string} props.title - Title of the error
 * @param {function} props.onRetry - Function to call when retry button is clicked
 * @param {boolean} props.showRetry - Whether to show the retry button
 * @returns {JSX.Element} - Error display component
 */
export default function ErrorDisplay({ 
  message = "Something went wrong. Please try again.", 
  title = "Error",
  onRetry,
  showRetry = false,
  hint = "",
  errorCode = ""
}) {
  // Determine icon based on error type
  const getIcon = () => {
    if (title.toLowerCase().includes('timeout') || title.toLowerCase().includes('connection')) {
      // Network/timeout icon
      return (
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-8 w-8 text-orange-500 dark:text-orange-400" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
          />
        </svg>
      );
    } else {
      // Default error icon
      return (
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-8 w-8 text-red-500 dark:text-red-400" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
      );
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="text-center py-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
          {getIcon()}
        </div>
        
        <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
          {title}
        </h3>
        
        <p className="text-gray-600 dark:text-gray-300 mb-3">
          {message}
        </p>
        
        {hint && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {hint}
          </p>
        )}
        
        {showRetry && onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
