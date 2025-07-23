"use client";

/**
 * Application configuration settings
 */
const config = {
  /**
   * API Settings
   */
  api: {
    /**
     * Base URL for API requests
     * Set to null to use the NEXT_PUBLIC_API_URL environment variable
     */
    baseUrl: null,
    
    /**
     * Whether to use mock data when API calls fail
     * Set to true to enable fallback to mock data
     * Set to false to show actual errors
     */
    useMockDataFallback: true,
    
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
