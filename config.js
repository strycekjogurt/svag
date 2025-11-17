// Configuration file for SVAG Chrome Extension
// Update this file with your production API URL after Vercel deployment

// API URL Configuration
// Development: Use unpacked extension with local server
// Production: https://svag.pro
const API_CONFIG = {
  // Default API URL - Production Vercel deployment
  DEFAULT_API_URL: 'https://svag.pro',
  
  // Development URL (for unpacked extension)
  DEVELOPMENT_API_URL: 'https://svag.pro',
  
  // Auto-detect environment
  getApiUrl: function() {
    // Check if running in development (extension is unpacked)
    if (chrome.runtime.getManifest().update_url === undefined) {
      // Unpacked extension - use development URL
      return this.DEVELOPMENT_API_URL;
    }
    // Packed extension - use production URL
    return this.DEFAULT_API_URL;
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = API_CONFIG;
}

