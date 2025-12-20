/**
 * SpaceLoader - Main Entry Point
 * 
 * This is a simple wrapper that loads the core loader and optional modules.
 * The core loader ALWAYS works and ALWAYS unblocks the page.
 * Optional modules can fail without breaking anything.
 * 
 * Architecture:
 * - Core loader (loader-core-minimal.js): Critical, must load - guarantees page unblock
 * - Animations module (loader-animations.js): Optional, can fail safely
 * - Features module (loader-features.js): Optional, can fail safely
 * 
 * Loading Strategy:
 * 1. Load core loader first (critical path)
 * 2. Load optional modules in parallel (non-blocking)
 * 3. If core fails, use emergency fallback to unblock page
 * 
 * @module loader
 * @author Adriano To The Star
 * @version 2.0.0-modular
 * @since 2025-01
 */

(function() {
    'use strict';

    /**
     * Load the core loader module (critical path)
     * Tries minimal loader first, falls back to full core if needed
     * Includes emergency fallback if both fail
     * @private
     * @returns {Promise<void>} Resolves when core loader is loaded or fallback activated
     */
    function loadCore() {
        return new Promise((resolve) => {
            // TEST: Try minimal loader first
            const script = document.createElement('script');
            script.src = 'loader-core-minimal.js';
            script.onload = () => {
                console.log('✅ Minimal loader core loaded');
                resolve();
            };
            script.onerror = () => {
                console.error('❌ Failed to load minimal loader - trying full core');
                // Fallback to full core
                const fullScript = document.createElement('script');
                fullScript.src = 'loader-core.js';
                fullScript.onload = () => {
                    console.log('✅ Full loader core loaded');
                    resolve();
                };
                fullScript.onerror = () => {
                    console.error('❌ Failed to load full core - using emergency fallback');
                    // Emergency fallback if core fails to load
                    setTimeout(() => {
                        if (document.body) {
                            document.body.style.overflow = '';
                            document.body.classList.add('loaded');
                        }
                    }, 1000);
                    resolve(); // Continue anyway
                };
                document.head.appendChild(fullScript);
            };
            document.head.appendChild(script);
        });
    }

    /**
     * Load the optional animations module
     * Checks for reduced motion preference before loading
     * Can fail safely without affecting page functionality
     * @private
     * @returns {Promise<void>} Resolves when animations load or are skipped
     */
    function loadAnimations() {
        return new Promise((resolve) => {
            // Check if animations should be loaded
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (prefersReducedMotion) {
                console.log('Skipping animations (reduced motion preferred)');
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'loader-animations.js';
            script.onload = () => {
                console.log('✅ Loader animations loaded');
                resolve();
            };
            script.onerror = () => {
                console.warn('⚠️ Failed to load animations (non-critical)');
                resolve(); // Continue anyway
            };
            document.head.appendChild(script);
        });
    }

    /**
     * Load the optional features module
     * Contains i18n, themes, analytics, and config UI
     * Can fail safely without affecting page functionality
     * @private
     * @returns {Promise<void>} Resolves when features load or fail
     */
    function loadFeatures() {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'loader-features.js';
            script.onload = () => {
                console.log('✅ Loader features loaded');
                resolve();
            };
            script.onerror = () => {
                console.warn('⚠️ Failed to load features (non-critical)');
                resolve(); // Continue anyway
            };
            document.head.appendChild(script);
        });
    }

    /**
     * Initialize the loader system
     * Loads core first, then optional modules in parallel
     * Includes error handling and emergency fallback
     * @private
     * @async
     * @returns {Promise<void>}
     */
    async function init() {
        try {
            // Load core first (critical)
            await loadCore();

            // Load optional modules (non-critical, can fail)
            // Load in parallel for speed
            Promise.all([
                loadAnimations(),
                loadFeatures()
            ]).catch(err => {
                console.warn('Some optional modules failed to load (non-critical):', err);
            });

            console.log('✅ Loader initialized - all modules loading');

        } catch (error) {
            console.error('Error initializing loader system:', error);
            // Emergency fallback - ensure page always loads
            setTimeout(() => {
                if (document.body) {
                    document.body.style.overflow = '';
                    document.body.classList.add('loaded');
                }
            }, 1000);
        }
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOM already ready
        init();
    }

    // Export for backward compatibility
    if (typeof window !== 'undefined') {
        window.SpaceLoader = {
            version: '2.0.0-modular',
            core: null, // Will be set by loader-core.js
            features: null // Will be set by loader-features.js
        };
    }
})();
