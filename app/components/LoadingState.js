"use client";

/**
 * LoadingState component
 * @param {Object} props - Component props
 * @param {string} props.message - Loading message to display
 * @param {string} props.size - Size of the spinner (sm, md, lg)
 * @param {boolean} props.fullPage - Whether to display as a full page loading state
 * @returns {JSX.Element} - Loading state component
 */
export default function LoadingState({ message = "Loading...", size = "md", fullPage = false }) {
  const spinnerSizes = {
    sm: "h-6 w-6 border-2",
    md: "h-10 w-10 border-2",
    lg: "h-16 w-16 border-3",
  };

  const spinner = (
    <div 
      className={`animate-spin rounded-full border-t-blue-500 border-blue-500/20 ${spinnerSizes[size] || spinnerSizes.md}`}
      role="status"
      aria-label="Loading"
    />
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50">
        {spinner}
        {message && (
          <p className="mt-4 text-gray-700 dark:text-gray-300 text-center max-w-xs">
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-8">
      {spinner}
      {message && (
        <p className="mt-4 text-gray-600 dark:text-gray-400 text-center">
          {message}
        </p>
      )}
    </div>
  );
}
