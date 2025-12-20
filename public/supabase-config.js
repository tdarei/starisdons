// Supabase Configuration
// This file contains the Supabase project configuration
// Replace these values with your actual Supabase project credentials

// To get your Supabase credentials:
// 1. Go to https://supabase.com and sign up (free)
// 2. Create a new project
// 3. Go to Settings > API
// 4. Copy your Project URL and anon/public key

window.SUPABASE_CONFIG = {
    /** @type {string} Your Supabase project URL */
    url: 'https://sepesbfytkmbgjyfqriw.supabase.co',

    /** 
     * @type {string} Your Supabase publishable key (safe for frontend use)
     * This is the new format - publishable keys start with "sb_publishable_"
     * Never commit service_role keys to version control
     */
    anonKey: 'sb_publishable_aU2YdyJxTZFH9D5JJJPzeQ_oND2bpw0',

    /** @type {boolean} Whether Supabase is enabled */
    enabled: true
};

/**
 * Auto-detect if we should use Supabase
 * 
 * Checks if Supabase is enabled and properly configured.
 * Automatically set to true once you've configured your Supabase project.
 * 
 * @type {boolean}
 * @readonly
 */
window.USE_SUPABASE = window.SUPABASE_CONFIG.enabled &&
    window.SUPABASE_CONFIG.url !== 'https://your-project-id.supabase.co' &&
    window.SUPABASE_CONFIG.anonKey !== 'your-anon-key-here';

// Initialize Supabase Client
if (typeof supabase !== 'undefined' && window.USE_SUPABASE) {
    try {
        if (!window.supabaseLib && supabase && typeof supabase.createClient === 'function') {
            window.supabaseLib = supabase;
        }

        const clientAlreadyInitialized =
            window.supabaseClient &&
            window.supabaseClient.auth &&
            typeof window.supabaseClient.from === 'function';

        const supabaseLib = window.supabaseLib && typeof window.supabaseLib.createClient === 'function'
            ? window.supabaseLib
            : supabase;

        if (!clientAlreadyInitialized && supabaseLib && typeof supabaseLib.createClient === 'function') {
            const client = supabaseLib.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);
            window.supabaseClient = client;
            window.supabase = client;
        }

        console.log('✅ Supabase client initialized');
    } catch (err) {
        console.error('❌ Failed to initialize Supabase client:', err);
    }
} else if (!window.USE_SUPABASE) {
    console.warn('⚠️ Supabase not configured or enabled. Backend features will not work.');
}

/**
 * Export configuration (for Node.js environments)
 * 
 * Note: This file is primarily for browser use.
 * Exports are available for Node.js/CommonJS environments.
 * 
 * @exports {Object} SUPABASE_CONFIG - Configuration object
 * @exports {boolean} USE_SUPABASE - Whether Supabase should be used
 */
// eslint-disable-next-line no-undef
if (typeof module !== 'undefined' && module.exports) {
    // eslint-disable-next-line no-undef
    module.exports = { SUPABASE_CONFIG: window.SUPABASE_CONFIG, USE_SUPABASE: window.USE_SUPABASE };
}

