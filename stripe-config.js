/**
 * Stripe Payment Configuration
 * 
 * For production, inject STRIPE_PUBLIC_KEY from GitLab CI/CD variables during build
 * For local development, update this file with your Stripe publishable key
 * 
 * Get your keys from: https://dashboard.stripe.com/apikeys
 * 
 * IMPORTANT: This is a LIVE key (pk_live_...) - use with caution!
 * For testing, use a test key (pk_test_...)
 */

// Stripe Publishable Key
// This will be injected from GitLab CI/CD variable STRIPE_PUBLIC_KEY during build
// For local development, uncomment and set your key below:
// const STRIPE_PUBLIC_KEY = 'pk_live_51MqMskC7XtJZK01IulzGo8IItJE6NE8RmgoXhCizcLxbbDxit8VxQekWUpQbHSdlw14B2Geay5xVKYrBGPMgGPAl00lr0OvaIv';

// Try to get from GitLab CI/CD variable (injected during build) or use local config
// NOTE: In production, this is replaced by inject-api-keys.ps1 during CI/CD build
const STRIPE_PUBLIC_KEY = 'YOUR_STRIPE_PUBLIC_KEY_HERE'; // Replaced during build

// Make it available globally
if (typeof window !== 'undefined') {
    // Check if key was injected (not placeholder)
    const isPlaceholder = STRIPE_PUBLIC_KEY === 'YOUR_STRIPE_PUBLIC_KEY_HERE' || !STRIPE_PUBLIC_KEY;
    
    if (!isPlaceholder) {
        window.STRIPE_PUBLIC_KEY = STRIPE_PUBLIC_KEY;
        console.log('✅ Stripe public key configured');
    } else {
        // Try to get from window if already set elsewhere
        if (window.STRIPE_PUBLIC_KEY) {
            console.log('✅ Stripe public key found in window');
        } else {
            console.log('⚠️ Stripe public key not found. Payment features will be disabled.');
            window.STRIPE_PUBLIC_KEY = null;
        }
    }
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { STRIPE_PUBLIC_KEY };
}

