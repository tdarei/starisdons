/**
 * Gemini API Configuration
 * 
 * The free tier includes unlimited requests on the live model (gemini-2.5-flash-live)
 * Update this file with your Gemini API key
 * 
 * Get your API key from: https://aistudio.google.com/app/apikey
 * 
 * IMPORTANT: The free tier has unlimited requests on the live model!
 * This means you can use AI features without worrying about rate limits.
 */

// Set your Gemini API key here
// Replace 'YOUR_GEMINI_API_KEY_HERE' with your actual API key from Google AI Studio
// Note: This is used for direct REST API calls when backend WebSocket is not available
const GEMINI_API_KEY = (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) ||
                       (typeof window !== 'undefined' && window.ENV && window.ENV.GEMINI_API_KEY) ||
                       'YOUR_API_KEY_HERE';

// Derive Gemini proxy URL (Supabase Edge Function) without exposing API key in the client
const GEMINI_PROXY_URL = (function () {
    try {
        if (typeof SUPABASE_CONFIG !== 'undefined' && SUPABASE_CONFIG && typeof SUPABASE_CONFIG.url === 'string') {
            var base = SUPABASE_CONFIG.url.replace(/^https?:\/\//, '');
            var projectRef = base.split('.')[0];
            if (projectRef) {
                return 'https://' + projectRef + '.functions.supabase.co/gemini-proxy';
            }
        }
    } catch (e) { }

    if (typeof window !== 'undefined' && window.ENV && window.ENV.GEMINI_PROXY_URL) {
        return window.ENV.GEMINI_PROXY_URL;
    }

    return null;
})();

// Make it available globally
if (typeof window !== 'undefined') {
    window.GEMINI_API_KEY = GEMINI_API_KEY;
    window.GEMINI_PROXY_URL = GEMINI_PROXY_URL;
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GEMINI_API_KEY, GEMINI_PROXY_URL };
}

