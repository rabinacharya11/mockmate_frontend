"use client";

/**
 * Prepares data for the sentiment chart
 * @param {Array} feedbackItems - Array of feedback items from Firestore
 * @returns {Object} - Chart data and options
 */
export function prepareSentimentChartData(feedbackItems = []) {
  // Default data if no items
  if (!feedbackItems.length) {
    return {
      labels: [],
      datasets: [{
        label: 'Positive Sentiment',
        data: [],
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
      }],
      options: {
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: 'Positive Sentiment (%)'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Questions'
            }
          }
        },
        responsive: true,
        maintainAspectRatio: false,
      }
    };
  }

  // Sort by timestamp if available
  const sortedItems = [...feedbackItems].sort((a, b) => {
    if (a.timestamp && b.timestamp) {
      return a.timestamp.seconds - b.timestamp.seconds;
    }
    return 0;
  });

  // Extract data
  const labels = sortedItems.map((item, index) => `Q${index + 1}`);
  const data = sortedItems.map(item => 
    Math.round((item.feedback?.sentiment?.pos || 0) * 100)
  );

  return {
    labels,
    datasets: [{
      label: 'Positive Sentiment',
      data,
      backgroundColor: 'rgba(75, 192, 192, 0.6)',
      borderColor: 'rgba(75, 192, 192, 1)',
      borderWidth: 1
    }],
    options: {
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: 'Positive Sentiment (%)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Questions'
          }
        }
      },
      responsive: true,
      maintainAspectRatio: false,
    }
  };
}

/**
 * Prepares data for the clarity score chart
 * @param {Array} feedbackItems - Array of feedback items from Firestore
 * @returns {Object} - Chart data and options
 */
export function prepareClarityChartData(feedbackItems = []) {
  // Default data if no items
  if (!feedbackItems.length) {
    return {
      labels: [],
      datasets: [{
        label: 'Clarity Score',
        data: [],
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }],
      options: {
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: 'Clarity Score (%)'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Questions'
            }
          }
        },
        responsive: true,
        maintainAspectRatio: false,
      }
    };
  }

  // Sort by timestamp if available
  const sortedItems = [...feedbackItems].sort((a, b) => {
    if (a.timestamp && b.timestamp) {
      return a.timestamp.seconds - b.timestamp.seconds;
    }
    return 0;
  });

  // Extract data
  const labels = sortedItems.map((item, index) => `Q${index + 1}`);
  const data = sortedItems.map(item => 
    Math.round((item.feedback?.clarity_score || 0) * 100)
  );

  return {
    labels,
    datasets: [{
      label: 'Clarity Score',
      data,
      backgroundColor: 'rgba(54, 162, 235, 0.6)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1
    }],
    options: {
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: 'Clarity Score (%)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Questions'
          }
        }
      },
      responsive: true,
      maintainAspectRatio: false,
    }
  };
}

/**
 * Prepares data for the filler words chart
 * @param {Array} feedbackItems - Array of feedback items from Firestore
 * @returns {Object} - Chart data and options
 */
export function prepareFillerWordsChartData(feedbackItems = []) {
  // Default data if no items
  if (!feedbackItems.length) {
    return {
      labels: [],
      datasets: [{
        label: 'Filler Word Count',
        data: [],
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
        ],
        borderWidth: 1
      }],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Count'
            }
          }
        }
      }
    };
  }

  // Combine all filler words from all feedback items
  const fillerWordsCount = {};
  
  feedbackItems.forEach(item => {
    const fillerWords = item.feedback?.filler_words || {};
    
    Object.entries(fillerWords).forEach(([word, count]) => {
      if (count > 0) {
        fillerWordsCount[word] = (fillerWordsCount[word] || 0) + count;
      }
    });
  });

  // Sort by frequency and take top 5
  const sortedFillerWords = Object.entries(fillerWordsCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const labels = sortedFillerWords.map(([word]) => word);
  const data = sortedFillerWords.map(([_, count]) => count);

  return {
    labels,
    datasets: [{
      label: 'Filler Word Count',
      data,
      backgroundColor: [
        'rgba(255, 99, 132, 0.6)',
        'rgba(54, 162, 235, 0.6)',
        'rgba(255, 206, 86, 0.6)',
        'rgba(75, 192, 192, 0.6)',
        'rgba(153, 102, 255, 0.6)',
      ],
      borderColor: [
        'rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 206, 86, 1)',
        'rgba(75, 192, 192, 1)',
        'rgba(153, 102, 255, 1)',
      ],
      borderWidth: 1
    }],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Count'
          }
        }
      }
    }
  };
}

/**
 * Format a timestamp from Firestore to a readable date string
 * @param {Object} timestamp - Firestore timestamp
 * @returns {string} - Formatted date string
 */
export function formatTimestamp(timestamp) {
  if (!timestamp || !timestamp.seconds) {
    return 'Unknown date';
  }
  
  const date = new Date(timestamp.seconds * 1000);
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Generates a summary of interview performance
 * @param {Array} feedbackItems - Array of feedback items from Firestore
 * @returns {Object} - Summary statistics
 */
export function generatePerformanceSummary(feedbackItems = []) {
  if (!feedbackItems.length) {
    return {
      totalQuestions: 0,
      averageSentiment: 0,
      averageClarity: 0,
      mostCommonFillerWord: 'None',
      mostCommonFillerWordCount: 0,
      totalFillerWords: 0
    };
  }

  // Calculate average sentiment and clarity
  let totalSentiment = 0;
  let totalClarity = 0;
  const fillerWordsCount = {};
  let totalFillerWordCount = 0;

  feedbackItems.forEach(item => {
    totalSentiment += (item.feedback?.sentiment?.pos || 0);
    totalClarity += (item.feedback?.clarity_score || 0);
    
    const fillerWords = item.feedback?.filler_words || {};
    Object.entries(fillerWords).forEach(([word, count]) => {
      if (count > 0) {
        fillerWordsCount[word] = (fillerWordsCount[word] || 0) + count;
        totalFillerWordCount += count;
      }
    });
  });

  // Find most common filler word
  let mostCommonFillerWord = 'None';
  let mostCommonFillerWordCount = 0;

  Object.entries(fillerWordsCount).forEach(([word, count]) => {
    if (count > mostCommonFillerWordCount) {
      mostCommonFillerWord = word;
      mostCommonFillerWordCount = count;
    }
  });

  return {
    totalQuestions: feedbackItems.length,
    averageSentiment: Math.round((totalSentiment / feedbackItems.length) * 100),
    averageClarity: Math.round((totalClarity / feedbackItems.length) * 100),
    mostCommonFillerWord,
    mostCommonFillerWordCount,
    totalFillerWords: totalFillerWordCount
  };
}
