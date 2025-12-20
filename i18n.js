/**
 * Internationalization (i18n) System
 * 
 * Multi-language support for Adriano To The Star website.
 * Provides translation management, language switching, and dynamic content translation.
 * 
 * Features:
 * - Multi-language support (EN, ES, FR, DE, IT, PT, RU, ZH, JA, KO)
 * - Dynamic translation of page content
 * - Language preference persistence (localStorage)
 * - Browser language detection
 * - Language switcher UI component
 * - Error handling and debugging
 * - Performance monitoring
 * - Infinite loop prevention
 * 
 * Architecture:
 * - Translations loaded from JSON files in /translations/ directory
 * - Uses data-i18n attributes on HTML elements
 * - Batch processing for performance (prevents freezing)
 * - Completion flag prevents infinite loops
 * 
 * @class I18n
 * @author Adriano To The Star
 * @version 2.0.0
 * @since 2025-01
 * @example
 * // Automatically initializes on page load
 * // Manual usage:
 * const i18n = new I18n();
 * await i18n.setLanguage('es');
 */

(function () {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return;
    }

    if (window.__i18nJsLoaded) {
        return;
    }

    window.__i18nJsLoaded = true;

class I18n {
    constructor() {
        this.currentLanguage = 'en';
        this.translations = {};
        this.fallbackLanguage = 'en';
        this.loadedLanguages = new Set();
        this.observers = [];

        // Debug and error tracking
        this.debugMode = true;
        this.errorCount = 0;
        this.maxErrors = 10;
        this.performanceLog = [];

        // Infinite loop prevention - GLOBAL lock
        this._applyCallCount = 0;
        this._applyCallLimit = 2; // Maximum 2 calls allowed
        this._loopDetected = false; // Global flag - once set, never allow calls

        // Setup global error handler for i18n
        this.setupErrorHandler();

        this.init();
    }

    /**
     * Setup global error handler for i18n operations
     */
    setupErrorHandler() {
        // Store original error handler
        const originalError = window.onerror;

        window.addEventListener('error', (event) => {
            if (event.filename && event.filename.includes('i18n.js')) {
                this.logError('Global Error', {
                    message: event.message,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    error: event.error
                });
            }
        }, true);

        window.addEventListener('unhandledrejection', (event) => {
            if (event.reason && event.reason.stack && event.reason.stack.includes('i18n.js')) {
                this.logError('Unhandled Promise Rejection', {
                    reason: event.reason,
                    promise: event.promise
                });
            }
        });
    }

    /**
     * Log error with context
     */
    logError(type, details) {
        this.errorCount++;
        const errorInfo = {
            type,
            details,
            timestamp: new Date().toISOString(),
            language: this.currentLanguage,
            errorCount: this.errorCount
        };

        console.error(`[i18n ERROR #${this.errorCount}] ${type}:`, errorInfo);

        if (this.debugMode) {
            // Show error in console with stack trace
            if (details.error) {
                console.error('Stack trace:', details.error.stack);
            }
        }

        // Prevent infinite error loops
        if (this.errorCount >= this.maxErrors) {
            console.error('[i18n] Too many errors, disabling i18n operations');
            this.disable();
        }

        return errorInfo;
    }

    /**
     * Log debug info
     */
    logDebug(message, data = {}) {
        if (this.debugMode) {
            console.log(`[i18n DEBUG] ${message}`, data);
        }
    }

    /**
     * Log performance metrics
     */
    logPerformance(operation, duration) {
        this.performanceLog.push({ operation, duration, timestamp: Date.now() });
        if (this.debugMode) {
            console.log(`[i18n PERFORMANCE] ${operation}: ${duration}ms`);
        }
    }

    /**
     * Disable i18n to prevent further errors
     */
    disable() {
        console.error('[i18n] DISABLED due to too many errors');
        this._disabled = true;
    }

    /**
     * Initialize i18n system
     */
    async init() {
        // Load saved language preference
        const saved = localStorage.getItem('language-preference');
        if (saved) {
            this.currentLanguage = saved;
        } else {
            // Detect browser language
            const browserLang = navigator.language || navigator.userLanguage || 'en';
            this.currentLanguage = this.detectLanguage(browserLang);
        }

        // Load translations
        await this.loadTranslations(this.currentLanguage);

        // Apply translations - DISABLED in init to prevent loops
        // Translations will be applied on first language change
        // this.applyTranslations();
        this.logDebug('Skipping applyTranslations in init() to prevent loops');

        // Create language switcher
        this.createLanguageSwitcher();

        // Watch for dynamic content - DISABLED for performance
        // this.observeDynamicContent(); // Disabled - was causing performance issues
        console.log('ℹ️ Dynamic content observer disabled for performance');
    }

    /**
     * Detect language from browser locale
     */
    detectLanguage(browserLang) {
        const lang = browserLang.split('-')[0].toLowerCase();
        const supported = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko'];
        return supported.includes(lang) ? lang : 'en';
    }

    /**
     * Load translations for a language
     */
    async loadTranslations(lang) {
        if (this.loadedLanguages.has(lang) && this.translations[lang]) {
            console.log(`ℹ️ Translations for ${lang} already loaded`);
            return;
        }

        try {
            const response = await fetch(`./translations/${lang}.json`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Failed to load translations for ${lang}`);
            }
            const data = await response.json();
            if (!data || typeof data !== 'object') {
                throw new Error(`Invalid translation data for ${lang}`);
            }
            this.translations[lang] = data;
            this.loadedLanguages.add(lang);
            console.log(`✅ Loaded translations for ${lang}`);
        } catch (error) {
            console.warn(`⚠️ Could not load translations for ${lang}:`, error.message);
            if (lang !== this.fallbackLanguage) {
                // Try to load fallback
                if (!this.loadedLanguages.has(this.fallbackLanguage)) {
                    console.log(`🔄 Attempting to load fallback language: ${this.fallbackLanguage}`);
                    await this.loadTranslations(this.fallbackLanguage);
                }
                // Use fallback translations if available
                if (this.translations[this.fallbackLanguage]) {
                    this.translations[lang] = this.translations[this.fallbackLanguage];
                    console.log(`✅ Using fallback translations for ${lang}`);
                }
            } else {
                throw error; // Re-throw if fallback also fails
            }
        }
    }

    /**
     * Get translation for a key
     * 
     * Retrieves translation from current language, with fallback to English.
     * Supports nested keys (e.g., 'common.home') and parameter replacement.
     * 
     * @public
     * @param {string} key - Translation key (supports dot notation for nested keys)
     * @param {Object} [params={}] - Parameters to replace in translation (e.g., {{name}})
     * @returns {string} Translated text or key if translation not found
     * @example
     * i18n.t('common.home'); // Returns "Home" in current language
     * i18n.t('welcome.message', { name: 'John' }); // Replaces {{name}} with "John"
     */
    t(key, params = {}) {
        const translation = this.getTranslation(key);
        if (!translation) {
            console.warn(`Translation missing for key: ${key}`);
            return key;
        }

        // Replace parameters
        let result = translation;
        Object.keys(params).forEach(param => {
            result = result.replace(new RegExp(`{{${param}}}`, 'g'), params[param]);
        });

        return result;
    }

    /**
     * Get translation from current language or fallback
     */
    getTranslation(key) {
        const keys = key.split('.');
        let value = this.translations[this.currentLanguage];

        // Navigate through nested keys
        for (const k of keys) {
            if (value && typeof value === 'object') {
                value = value[k];
            } else {
                value = null;
                break;
            }
        }

        // Fallback to English if not found
        if (!value && this.currentLanguage !== this.fallbackLanguage) {
            value = this.translations[this.fallbackLanguage];
            for (const k of keys) {
                if (value && typeof value === 'object') {
                    value = value[k];
                } else {
                    value = null;
                    break;
                }
            }
        }

        return value || key;
    }

    /**
     * Change the current language
     * 
     * Loads translations for the new language and applies them to the page.
     * Includes comprehensive error handling and loop prevention.
     * 
     * @public
     * @async
     * @param {string} lang - Language code (e.g., 'en', 'es', 'fr')
     * @returns {Promise<void>}
     * @throws {Error} If translations cannot be loaded
     * @example
     * await i18n.setLanguage('es'); // Switch to Spanish
     */
    async setLanguage(lang) {
        const startTime = performance.now();
        this.logDebug('setLanguage called', { lang, current: this.currentLanguage });

        // Check if disabled
        if (this._disabled) {
            this.logError('setLanguage called but i18n is disabled');
            return;
        }

        if (this.currentLanguage === lang) {
            this.logDebug('Language already set', { lang });
            return;
        }

        // Prevent multiple simultaneous language changes
        if (this._changingLanguage) {
            this.logDebug('Language change already in progress', { lang });
            return;
        }

        this._changingLanguage = true;
        this.logDebug('Starting language change', { from: this.currentLanguage, to: lang });

        try {
            // Load translations if not already loaded
            try {
                const loadStart = performance.now();
                await this.loadTranslations(lang);
                const loadDuration = performance.now() - loadStart;
                this.logPerformance('loadTranslations', loadDuration);
            } catch (error) {
                const errorInfo = this.logError('Failed to load translations', {
                    lang,
                    error: error.message,
                    stack: error.stack
                });
                this._changingLanguage = false;
                throw error; // Re-throw to be caught by outer try-catch
            }

            // Check if translations were loaded
            if (!this.translations[lang]) {
                const errorInfo = this.logError('Translations not available', { lang });
                this._changingLanguage = false;
                return;
            }

            this.currentLanguage = lang;

            try {
                localStorage.setItem('language-preference', lang);
            } catch (error) {
                this.logError('Failed to save language preference', { error: error.message });
            }

            // Show loading state IMMEDIATELY (don't wait)
            try {
                const langCode = document.querySelector('.lang-code');
                if (langCode) {
                    langCode.textContent = '...';
                    langCode.style.opacity = '0.5';
                }
            } catch (error) {
                this.logError('Failed to update language code display', { error: error.message });
            }

            // Update language switcher FIRST (immediate feedback)
            try {
                this.updateLanguageSwitcher();
            } catch (error) {
                this.logError('Failed to update language switcher', { error: error.message });
            }

            // Restore opacity immediately (don't wait for translations)
            try {
                const langCode = document.querySelector('.lang-code');
                if (langCode) {
                    langCode.style.opacity = '1';
                }
            } catch (error) {
                this.logError('Failed to restore language code opacity', { error: error.message });
            }

            // Apply translations in background (completely non-blocking)
            // Use requestIdleCallback or setTimeout to ensure it doesn't block
            // ONLY call once - prevent multiple calls with scheduling flag
            if (this._translationsScheduled) {
                this.logDebug('Translations already scheduled, skipping duplicate call');
            } else {
                this._translationsScheduled = true;
                // CRITICAL: Reset flags when scheduling a NEW translation
                // This allows ONE translation cycle per language change
                this._applyCallCount = 0; // Reset for new translation
                this._applyTranslationsCompleted = false; // Allow new translation
                try {
                    if (window.requestIdleCallback) {
                        requestIdleCallback(() => {
                            this._translationsScheduled = false; // Reset flag
                            try {
                                this.applyTranslations();
                            } catch (error) {
                                // DON'T reset call count on error - keep it high to prevent loops
                                this.logError('Error in requestIdleCallback applyTranslations', {
                                    error: error.message,
                                    stack: error.stack
                                });
                            }
                        }, { timeout: 500 });
                    } else {
                        // Fallback: use longer delay
                        setTimeout(() => {
                            this._translationsScheduled = false; // Reset flag
                            try {
                                this.applyTranslations();
                            } catch (error) {
                                // DON'T reset call count on error - keep it high to prevent loops
                                this.logError('Error in setTimeout applyTranslations', {
                                    error: error.message,
                                    stack: error.stack
                                });
                            }
                        }, 100);
                    }
                } catch (error) {
                    this._translationsScheduled = false; // Reset flag on error
                    // DON'T reset call count on error
                    this.logError('Failed to schedule translations', { error: error.message });
                }
            }

            // Notify observers after a longer delay
            setTimeout(() => {
                try {
                    this.notifyObservers(lang);
                } catch (error) {
                    this.logError('Failed to notify observers', { error: error.message });
                }
            }, 300);

            // Dispatch event after a longer delay
            setTimeout(() => {
                try {
                    window.dispatchEvent(new CustomEvent('languagechange', {
                        detail: { language: lang }
                    }));
                } catch (error) {
                    this.logError('Failed to dispatch languagechange event', { error: error.message });
                }
            }, 300);

            const totalDuration = performance.now() - startTime;
            this.logPerformance('setLanguage (total)', totalDuration);
            this.logDebug('Language successfully changed', { lang, duration: totalDuration });
        } catch (error) {
            const errorInfo = this.logError('setLanguage failed', {
                lang,
                error: error.message,
                stack: error.stack
            });
            // Try to recover
            try {
                if (this.translations[this.fallbackLanguage]) {
                    this.logDebug('Attempting fallback recovery');
                    this.currentLanguage = this.fallbackLanguage;
                    this.updateLanguageSwitcher();
                }
            } catch (recoveryError) {
                this.logError('Recovery attempt failed', { error: recoveryError.message });
            }
        } finally {
            // Reset flag after a short delay to allow async operations
            setTimeout(() => {
                this._changingLanguage = false;
                this.logDebug('Language change lock released');
            }, 100);
        }
    }

    /**
     * Apply translations to all elements with data-i18n attributes
     * 
     * Uses requestIdleCallback for non-blocking execution.
     * Processes visible elements first, then hidden elements.
     * Includes infinite loop prevention and completion tracking.
     * 
     * @public
     * @returns {void}
     * @description
     * This method:
     * 1. Checks for completion flag (prevents infinite loops)
     * 2. Separates visible and hidden elements
     * 3. Translates visible elements first (user sees changes immediately)
     * 4. Translates hidden elements during idle time
     * 5. Sets completion flag to prevent re-execution
     */
    applyTranslations() {
        // CRITICAL: Check completion flag FIRST - before ANY processing
        if (this._applyTranslationsCompleted) {
            // SILENTLY return - don't log to avoid spam
            return; // BLOCKED - already completed
        }

        // CRITICAL: Check for infinite loop SECOND
        if (this._loopDetected) {
            return; // PERMANENTLY BLOCKED
        }

        this._applyCallCount = (this._applyCallCount || 0) + 1;

        // DETECT INFINITE LOOP IMMEDIATELY - if called more than limit, STOP FOREVER!
        if (this._applyCallCount > this._applyCallLimit) {
            const callStack = new Error().stack;
            console.error('[i18n] 🚨🚨🚨 INFINITE LOOP DETECTED - PERMANENTLY BLOCKING!', {
                callCount: this._applyCallCount,
                limit: this._applyCallLimit
            });
            this._loopDetected = true; // PERMANENT LOCK
            this._applyTranslationsPending = false;
            this._applyCallCount = 0;
            return; // STOP IMMEDIATELY AND FOREVER
        }

        // CRITICAL: Check if already pending - prevent simultaneous calls
        if (this._applyTranslationsPending) {
            return; // Already in progress
        }

        const startTime = performance.now();
        const callStack = new Error().stack;

        this.logDebug('applyTranslations called', {
            language: this.currentLanguage,
            pending: this._applyTranslationsPending,
            callCount: this._applyCallCount
        });

        // Check if disabled
        if (this._disabled) {
            this.logError('applyTranslations called but i18n is disabled');
            this._applyCallCount = 0; // Reset on exit
            return;
        }

        if (!this.translations[this.currentLanguage]) {
            this.logError('Translations not loaded', { language: this.currentLanguage });
            this._applyCallCount = 0; // Reset on exit
            return;
        }

        // Prevent multiple simultaneous translation runs - STRICT CHECK
        if (this._applyTranslationsPending) {
            this.logDebug('Translation already in progress, skipping', {
                callCount: this._applyCallCount
            });
            this._applyCallCount = Math.max(0, this._applyCallCount - 1); // Decrement since we're not processing
            return; // Already queued
        }

        this._applyTranslationsPending = true;

        // Use requestIdleCallback if available (for non-critical work)
        const scheduleWork = (callback) => {
            if (window.requestIdleCallback) {
                requestIdleCallback(callback, { timeout: 1000 });
            } else {
                // Fallback: use setTimeout with longer delay
                setTimeout(callback, 50);
            }
        };

        // Get all elements ONCE (cache it)
        let elements, elementsArray;
        try {
            elements = document.querySelectorAll('[data-i18n]');
            elementsArray = Array.from(elements);
            this.logDebug('Found elements to translate', { count: elementsArray.length });
        } catch (error) {
            this.logError('Failed to query elements', { error: error.message });
            this._applyTranslationsPending = false;
            return;
        }

        // Separate visible and hidden elements (translate visible first)
        const visibleElements = [];
        const hiddenElements = [];

        try {
            elementsArray.forEach(el => {
                try {
                    const rect = el.getBoundingClientRect();
                    const styles = window.getComputedStyle(el);
                    const isVisible = rect.width > 0 && rect.height > 0 &&
                        styles.visibility !== 'hidden' &&
                        styles.display !== 'none';
                    if (isVisible) {
                        visibleElements.push(el);
                    } else {
                        hiddenElements.push(el);
                    }
                } catch (error) {
                    // If we can't determine visibility, add to hidden (safer)
                    hiddenElements.push(el);
                    this.logDebug('Error checking element visibility', { error: error.message });
                }
            });
            this.logDebug('Element separation complete', {
                visible: visibleElements.length,
                hidden: hiddenElements.length
            });
        } catch (error) {
            this.logError('Failed to separate visible/hidden elements', { error: error.message });
            // Continue with all elements in visible array as fallback
            visibleElements.push(...elementsArray);
        }

        let translatedCount = 0;
        let currentIndex = 0;
        const allElements = [...visibleElements, ...hiddenElements]; // Visible first

        const translateElement = (element) => {
            try {
                const key = element.getAttribute('data-i18n');
                if (!key) {
                    this.logDebug('Element has no data-i18n attribute', { element: element.tagName });
                    return false;
                }

                const translation = this.t(key);
                if (!translation || translation === key) {
                    this.logDebug('Translation missing or same as key', { key });
                }

                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                    element.placeholder = translation;
                } else if (element.hasAttribute('data-i18n-html')) {
                    element.innerHTML = translation;
                } else {
                    element.textContent = translation;
                }
                return true;
            } catch (e) {
                this.logError('Error translating element', {
                    error: e.message,
                    stack: e.stack,
                    element: element.tagName,
                    key: element.getAttribute('data-i18n')
                });
                return false;
            }
        };

        const processNext = () => {
            try {
                if (currentIndex >= allElements.length) {
                    // All elements processed, handle title and meta
                    try {
                        const titleElement = document.querySelector('title');
                        if (titleElement) {
                            const titleKey = titleElement.getAttribute('data-i18n');
                            if (titleKey) {
                                document.title = this.t(titleKey);
                            }
                        }

                        const metaDesc = document.querySelector('meta[name="description"]');
                        if (metaDesc) {
                            const descKey = metaDesc.getAttribute('data-i18n');
                            if (descKey) {
                                metaDesc.setAttribute('content', this.t(descKey));
                            }
                        }
                    } catch (e) {
                        this.logError('Error updating title/meta', { error: e.message });
                    }

                    const totalDuration = performance.now() - startTime;
                    this.logPerformance('applyTranslations (total)', totalDuration);

                    // CRITICAL: Set completion flag IMMEDIATELY, before any logging
                    this._applyTranslationsPending = false;
                    this._applyTranslationsCompleted = true; // Mark as completed - BLOCKS ALL FUTURE CALLS

                    // Log completion
                    console.log(`✅ Applied ${translatedCount} translations for ${this.currentLanguage}`);
                    this.logDebug('All translations applied', {
                        count: translatedCount,
                        total: allElements.length,
                        duration: totalDuration
                    });
                    console.log('[i18n] 🛡️ Translation completed - ALL future calls blocked until new language change');
                    return;
                }

                // Translate one element
                const element = allElements[currentIndex];
                if (element && element.nodeType === Node.ELEMENT_NODE) {
                    if (translateElement(element)) {
                        translatedCount++;
                    }
                } else {
                    this.logDebug('Invalid element skipped', { index: currentIndex });
                }
                currentIndex++;

                // Schedule next element using idle callback or setTimeout
                scheduleWork(() => {
                    try {
                        requestAnimationFrame(processNext);
                    } catch (error) {
                        this.logError('Error scheduling next translation', { error: error.message });
                        this._applyTranslationsPending = false;
                    }
                });
            } catch (error) {
                this.logError('Error in processNext', {
                    error: error.message,
                    stack: error.stack,
                    currentIndex,
                    totalElements: allElements.length
                });
                // Reset flags on error - BUT DON'T reset call count
                // Keeping count high prevents loops
                this._applyTranslationsPending = false;
                // DON'T reset call count - keep it high to prevent loops
            }
        };

        // Start processing after a delay to ensure UI is responsive
        scheduleWork(() => {
            requestAnimationFrame(processNext);
        });
    }

    /**
     * Create the language switcher UI component
     * 
     * Creates a floating button with dropdown menu for language selection.
     * Positioned in top-right corner, similar to navigation menu button.
     * 
     * @public
     * @returns {void}
     * @description
     * Creates:
     * - Toggle button with globe icon and current language code
     * - Dropdown menu with all available languages
     * - Event listeners for language selection
     * - Click-outside handler to close dropdown
     */
    createLanguageSwitcher() {
        // Check if switcher already exists
        if (document.getElementById('language-switcher')) {
            console.log('ℹ️ Language switcher already exists');
            return;
        }

        console.log('🌍 Creating language switcher...');

        const switcher = document.createElement('div');
        switcher.id = 'language-switcher';
        switcher.className = 'language-switcher';
        switcher.innerHTML = `
            <button id="lang-toggle-btn" class="lang-toggle-btn" aria-label="Select Language" title="Select Language">
                <span class="lang-icon">🌍</span>
                <span class="lang-code">${this.currentLanguage.toUpperCase()}</span>
            </button>
            <div id="lang-dropdown" class="lang-dropdown" style="display: none;">
                <div class="lang-list">
                    <button class="lang-option ${this.currentLanguage === 'en' ? 'active' : ''}" data-lang="en">
                        <span class="lang-flag">🇬🇧</span>
                        <span class="lang-name">English</span>
                    </button>
                    <button class="lang-option ${this.currentLanguage === 'es' ? 'active' : ''}" data-lang="es">
                        <span class="lang-flag">🇪🇸</span>
                        <span class="lang-name">Español</span>
                    </button>
                    <button class="lang-option ${this.currentLanguage === 'fr' ? 'active' : ''}" data-lang="fr">
                        <span class="lang-flag">🇫🇷</span>
                        <span class="lang-name">Français</span>
                    </button>
                    <button class="lang-option ${this.currentLanguage === 'de' ? 'active' : ''}" data-lang="de">
                        <span class="lang-flag">🇩🇪</span>
                        <span class="lang-name">Deutsch</span>
                    </button>
                    <button class="lang-option ${this.currentLanguage === 'it' ? 'active' : ''}" data-lang="it">
                        <span class="lang-flag">🇮🇹</span>
                        <span class="lang-name">Italiano</span>
                    </button>
                    <button class="lang-option ${this.currentLanguage === 'pt' ? 'active' : ''}" data-lang="pt">
                        <span class="lang-flag">🇵🇹</span>
                        <span class="lang-name">Português</span>
                    </button>
                    <button class="lang-option ${this.currentLanguage === 'ru' ? 'active' : ''}" data-lang="ru">
                        <span class="lang-flag">🇷🇺</span>
                        <span class="lang-name">Русский</span>
                    </button>
                    <button class="lang-option ${this.currentLanguage === 'zh' ? 'active' : ''}" data-lang="zh">
                        <span class="lang-flag">🇨🇳</span>
                        <span class="lang-name">中文</span>
                    </button>
                    <button class="lang-option ${this.currentLanguage === 'ja' ? 'active' : ''}" data-lang="ja">
                        <span class="lang-flag">🇯🇵</span>
                        <span class="lang-name">日本語</span>
                    </button>
                    <button class="lang-option ${this.currentLanguage === 'ko' ? 'active' : ''}" data-lang="ko">
                        <span class="lang-flag">🇰🇷</span>
                        <span class="lang-name">한국어</span>
                    </button>
                </div>
            </div>
        `;

        // Add to a fixed position in top-right corner (similar to menu toggle)
        // Try to find header first, otherwise append to body with fixed positioning
        const header = document.querySelector('.site-header') || document.querySelector('header');
        if (header) {
            // Add to header with positioning
            switcher.style.position = 'fixed';
            switcher.style.top = '30px';
            switcher.style.right = '100px'; // Position to left of menu toggle
            switcher.style.zIndex = '10002';
            switcher.style.pointerEvents = 'auto';
            header.appendChild(switcher);
            console.log('✅ Language switcher added to header');
        } else {
            // Fallback: add to body with fixed positioning
            switcher.style.position = 'fixed';
            switcher.style.top = '30px';
            switcher.style.right = '100px';
            switcher.style.zIndex = '10002';
            switcher.style.pointerEvents = 'auto';
            document.body.appendChild(switcher);
            console.log('✅ Language switcher added to body');
        }

        // Add event listeners with proper error handling
        const toggleBtn = document.getElementById('lang-toggle-btn');
        const dropdown = document.getElementById('lang-dropdown');
        const langOptions = switcher.querySelectorAll('.lang-option');

        if (!toggleBtn) {
            console.error('❌ Language toggle button not found');
            return;
        }

        if (!dropdown) {
            console.error('❌ Language dropdown not found');
            return;
        }

        // Toggle button click handler
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const isVisible = dropdown.style.display !== 'none';
            dropdown.style.display = isVisible ? 'none' : 'block';
            console.log(`🌍 Language dropdown ${isVisible ? 'closed' : 'opened'}`);
        });

        // Language option click handlers
        langOptions.forEach(option => {
            option.addEventListener('click', async (e) => {
                e.stopPropagation();
                e.preventDefault();
                const lang = option.dataset.lang;
                console.log(`🌍 Language option clicked: ${lang}`);
                if (lang && lang !== this.currentLanguage) {
                    try {
                        await this.setLanguage(lang);
                        dropdown.style.display = 'none';
                        console.log(`✅ Language changed to ${lang}`);
                    } catch (error) {
                        console.error(`❌ Failed to change language to ${lang}:`, error);
                    }
                } else {
                    dropdown.style.display = 'none';
                    console.log(`ℹ️ Language already set to ${lang}`);
                }
            });
        });

        // Close dropdown when clicking outside
        // Use a named function so we can remove it if needed
        this.closeDropdownHandler = (e) => {
            if (switcher && dropdown && !switcher.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        };
        document.addEventListener('click', this.closeDropdownHandler);

        // Verify the button is clickable
        setTimeout(() => {
            const verifyBtn = document.getElementById('lang-toggle-btn');
            if (verifyBtn) {
                console.log('✅ Language toggle button is ready and clickable');
                // Test if button is visible and has proper styles
                const styles = window.getComputedStyle(verifyBtn);
                console.log('🌍 Button styles:', {
                    display: styles.display,
                    visibility: styles.visibility,
                    opacity: styles.opacity,
                    pointerEvents: styles.pointerEvents,
                    zIndex: styles.zIndex
                });
            } else {
                console.error('❌ Language toggle button not found after creation');
            }
        }, 100);
    }

    /**
     * Update language switcher UI
     */
    updateLanguageSwitcher() {
        const langCode = document.querySelector('.lang-code');
        if (langCode) {
            langCode.textContent = this.currentLanguage.toUpperCase();
        }

        // Update active state
        document.querySelectorAll('.lang-option').forEach(option => {
            option.classList.toggle('active', option.dataset.lang === this.currentLanguage);
        });
    }

    /**
     * Observe dynamic content for translation - DISABLED to prevent performance issues
     * Only translate on explicit language change, not on every DOM mutation
     */
    observeDynamicContent() {
        // DISABLED: MutationObserver was causing performance issues
        // Translations will only be applied on language change, not on DOM mutations
        // If dynamic content needs translation, call applyTranslations() explicitly
        console.log('ℹ️ Dynamic content observer disabled for performance');

        // Optional: Only observe specific containers if needed
        // const observer = new MutationObserver((mutations) => {
        //     // Disabled for performance
        // });
        // this.mutationObserver = null;
    }

    /**
     * Subscribe to language changes
     */
    subscribe(callback) {
        this.observers.push(callback);
    }

    /**
     * Notify observers of language change
     */
    notifyObservers(lang) {
        this.observers.forEach(callback => {
            try {
                callback(lang);
            } catch (error) {
                console.error('Error in language change observer:', error);
            }
        });
    }

    /**
     * Get current language
     */
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    /**
     * Get available languages
     */
    getAvailableLanguages() {
        return [
            { code: 'en', name: 'English', flag: '🇬🇧' },
            { code: 'es', name: 'Español', flag: '🇪🇸' },
            { code: 'fr', name: 'Français', flag: '🇫🇷' },
            { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
            { code: 'it', name: 'Italiano', flag: '🇮🇹' },
            { code: 'pt', name: 'Português', flag: '🇵🇹' },
            { code: 'ru', name: 'Русский', flag: '🇷🇺' },
            { code: 'zh', name: '中文', flag: '🇨🇳' },
            { code: 'ja', name: '日本語', flag: '🇯🇵' },
            { code: 'ko', name: '한국어', flag: '🇰🇷' }
        ];
    }
}

// Initialize i18n
let i18nInstance = null;

function initI18n() {
    if (!i18nInstance) {
        i18nInstance = new I18n();
    }
    return i18nInstance;
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initI18n);
} else {
    initI18n();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = I18n;
}

// Make available globally
window.I18n = I18n;
window.i18n = () => i18nInstance;
window.t = (key, params) => i18nInstance ? i18nInstance.t(key, params) : key;

})();

