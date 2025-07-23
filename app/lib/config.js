"use client";

/**
 * Application configuration settings
 */
const config = {
  /**
   * API Settings
   */
  /**
   * API Configuration
   */
  api: {
    /**
     * Base URL for the FastAPI backend
     * Using Next.js API proxy routes to avoid CORS issues
     */
    baseUrl: "/api/proxy",
    
    /**
     * Alternative API URLs to try if the main one fails
     * Using direct FastAPI endpoints as fallback
     */
    alternativeUrls: [
      "http://localhost:8000",
      "http://127.0.0.1:8000",
      "http://0.0.0.0:8000"
    ],
    
    /**
     * Whether to use mock data when API calls fail
     * Set to true to enable fallback to mock data
     * Set to false to show actual errors
     */
    useMockDataFallback: false,
    
    /**
     * Timeout for API requests in milliseconds
     */
    timeout: 30000,
  },
  
  /**
   * Feature Flags
   */
  features: {
    /**
     * Whether to enable speech recognition
     */
    speechRecognition: true,
    
    /**
     * Whether to enable performance analytics
     */
    performanceAnalytics: true,
  },
  
  /**
   * Debug Settings
   */
  debug: {
    /**
     * Whether to enable debug logging
     */
    enabled: process.env.NODE_ENV === 'development',
    
    /**
     * Log level
     * 0: None, 1: Error, 2: Warn, 3: Info, 4: Debug
     */
    level: 4,
  }
};

/**
 * Debug logger
 */
export const logger = {
  error: (...args) => {
    if (config.debug.enabled && config.debug.level >= 1) {
      console.error('[MockMate]', ...args);
    }
  },
  warn: (...args) => {
    if (config.debug.enabled && config.debug.level >= 2) {
      console.warn('[MockMate]', ...args);
    }
  },
  info: (...args) => {
    if (config.debug.enabled && config.debug.level >= 3) {
      console.info('[MockMate]', ...args);
    }
  },
  debug: (...args) => {
    if (config.debug.enabled && config.debug.level >= 4) {
      console.debug('[MockMate]', ...args);
    }
  }
};

export default config;
