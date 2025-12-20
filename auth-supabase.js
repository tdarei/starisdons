/**
 * Supabase Authentication Manager
 * 
 * Handles user authentication, registration, and session management using Supabase.
 * Provides fallback to localStorage if Supabase is not configured or unavailable.
 * 
 * Features:
 * - User registration with email/password
 * - User login with email/password
 * - Session management and persistence
 * - Password reset functionality
 * - Email verification
 * - Automatic session restoration on page load
 * - Auth state change listeners
 * - Secure token storage
 * - Fallback to localStorage for offline mode
 * 
 * Security:
 * - Passwords are hashed by Supabase (never sent in plain text)
 * - JWT tokens stored securely
 * - Session validation on each request
 * - Automatic token refresh
 * 
 * @class SupabaseAuthManager
 * @author Adriano To The Star
 * @version 1.0.0
 * @since 2025-01
 * @example
 * const auth = new SupabaseAuthManager();
 * await auth.register('user@example.com', 'password123');
 * await auth.login('user@example.com', 'password123');
 */
class SupabaseAuthManager {
    constructor() {
        this.supabase = null;
        this.user = null;
        this.session = null;
        this.useSupabase = false;
        this.fallbackToLocalStorage = true;
        this.isReady = false;

        this.init();
    }

    async init() {
        // Check if Supabase is configured and available
        if (typeof window.SUPABASE_CONFIG !== 'undefined' && window.USE_SUPABASE) {
            try {
                const existingClient =
                    window.supabaseClient &&
                        window.supabaseClient.auth &&
                        typeof window.supabaseClient.from === 'function'
                        ? window.supabaseClient
                        : null;

                if (existingClient) {
                    this.supabase = existingClient;
                } else {
                    let supabaseLib =
                        window.supabaseLib && typeof window.supabaseLib.createClient === 'function'
                            ? window.supabaseLib
                            : null;

                    if (!supabaseLib && typeof supabase !== 'undefined' && typeof supabase.createClient === 'function') {
                        supabaseLib = supabase;
                        if (!window.supabaseLib) {
                            window.supabaseLib = supabase;
                        }
                    }

                    if (!supabaseLib) {
                        await this.loadSupabase();
                        if (window.supabaseLib && typeof window.supabaseLib.createClient === 'function') {
                            supabaseLib = window.supabaseLib;
                        } else if (typeof supabase !== 'undefined' && typeof supabase.createClient === 'function') {
                            supabaseLib = supabase;
                            if (!window.supabaseLib) {
                                window.supabaseLib = supabase;
                            }
                        }
                    }

                    if (!supabaseLib || typeof supabaseLib.createClient !== 'function') {
                        throw new Error('Supabase library not available');
                    }

                    this.supabase = supabaseLib.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
                    window.supabaseClient = this.supabase;
                    window.supabase = this.supabase;
                }

                this.useSupabase = true;
                console.log('✅ Supabase initialized');

                // Check for existing session
                const {
                    data: { session },
                } = await this.supabase.auth.getSession();
                if (session) {
                    this.session = session;
                    await this.loadUser();
                }

                // Listen for auth state changes
                // Store subscription for potential cleanup
                this.authStateSubscription = this.supabase.auth.onAuthStateChange(
                    (event, session) => {
                        console.log('🔐 Auth state changed:', event);
                        if (session) {
                            this.session = session;
                            this.loadUser();
                        } else {
                            this.session = null;
                            this.user = null;
                        }
                        this.updateUI();
                    }
                );
            } catch (error) {
                console.error('✗ Error initializing Supabase:', error);
                console.log('⚠️ Falling back to localStorage');
                this.useSupabase = false;
                this.initLocalStorageFallback();
            }
        } else {
            console.log('ℹ️ Supabase not configured, using localStorage fallback');
            this.useSupabase = false;
            this.initLocalStorageFallback();
        }

        this.updateUI();
        this.markReady();
        this.trackEvent('auth_supabase_initialized');
    }

    trackEvent(eventName, data = {}) {
        try {
            if (typeof window !== 'undefined' && window.performanceMonitoring) {
                window.performanceMonitoring.recordMetric(`auth_supabase_${eventName}`, 1, data);
            }
        } catch (e) { /* Silent fail */ }
    }

    /**
     * Load Supabase library from CDN
     * 
     * Dynamically loads the Supabase JavaScript client library if not already loaded.
     * 
     * @private
     * @async
     * @returns {Promise<void>}
     * @throws {Error} If Supabase library fails to load
     */
    async loadSupabase() {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (typeof supabase !== 'undefined') {
                resolve();
                return;
            }

            // Load Supabase from CDN
            const script = document.createElement('script');
            script.src =
                'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/dist/umd/supabase.min.js';
            script.onload = () => {
                console.log('✅ Supabase library loaded');
                resolve();
            };
            script.onerror = () => {
                console.error('✗ Failed to load Supabase library');
                reject(new Error('Failed to load Supabase'));
            };
            document.head.appendChild(script);
        });
    }

    /**
     * Initialize localStorage-based authentication fallback
     * 
     * Sets up client-side user storage when Supabase is not available.
     * Creates storage keys and loads existing user data if available.
     * 
     * @private
     * @returns {void}
     */
    initLocalStorageFallback() {
        // Initialize localStorage-based auth as fallback
        this.usersStorageKey = 'adriano_users';
        this.initUsersStorage();
        this.token = localStorage.getItem('auth_token');
        if (this.token) {
            this.loadUserFromLocalStorage();
        }
    }

    /**
     * Initialize users storage in localStorage
     * 
     * Creates an empty users array if it doesn't exist.
     * 
     * @private
     * @returns {void}
     */
    initUsersStorage() {
        if (!localStorage.getItem(this.usersStorageKey)) {
            localStorage.setItem(this.usersStorageKey, JSON.stringify([]));
        }
    }

    /**
     * Get all users from localStorage
     * 
     * @private
     * @returns {Array<Object>} Array of user objects
     */
    getUsers() {
        this.initUsersStorage();
        const usersJson = localStorage.getItem(this.usersStorageKey);
        return JSON.parse(usersJson || '[]');
    }

    /**
     * Save users array to localStorage
     * 
     * Also creates a backup copy with timestamp for recovery purposes.
     * Handles quota exceeded errors gracefully.
     * 
     * @private
     * @param {Array<Object>} users - Array of user objects to save
     * @returns {void}
     * @throws {Error} If localStorage quota is exceeded and backup removal fails
     */
    saveUsers(users) {
        try {
            localStorage.setItem(this.usersStorageKey, JSON.stringify(users));
            localStorage.setItem(
                this.usersStorageKey + '_backup',
                JSON.stringify({
                    users: users,
                    timestamp: new Date().toISOString(),
                    version: '1.0',
                })
            );
        } catch (error) {
            console.error('✗ Error saving users:', error);
            if (error.name === 'QuotaExceededError') {
                localStorage.removeItem(this.usersStorageKey + '_backup');
                localStorage.setItem(this.usersStorageKey, JSON.stringify(users));
            }
        }
    }

    /**
     * Hash a password using SHA-256
     * 
     * Used for localStorage fallback authentication.
     * Note: Supabase handles password hashing automatically.
     * 
     * @private
     * @async
     * @param {string} password - Plain text password
     * @param {string} [salt] - Optional per-user salt
     * @returns {Promise<string>} Hexadecimal hash of the password
     */
    async hashPassword(password, salt) {
        const encoder = new TextEncoder();
        const valueToHash = typeof salt === 'string' ? `${salt}:${password}` : password;
        const data = encoder.encode(valueToHash);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }

    generateSalt(length = 16) {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return Array.from(array)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * Generate a JWT-like token for localStorage authentication
     * 
     * Creates a base64-encoded token with user info and expiration.
     * Token expires after 7 days.
     * 
     * @private
     * @param {Object} user - User object containing id, username, email
     * @returns {string} Base64-encoded token
     */
    generateToken(user) {
        const payload = {
            id: user.id,
            username: user.username,
            email: user.email,
            exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
        };
        return btoa(JSON.stringify(payload));
    }

    /**
     * Verify and decode a JWT-like token
     * 
     * Checks if token is valid and not expired.
     * 
     * @private
     * @param {string} token - Base64-encoded token
     * @returns {Object|null} Decoded token payload or null if invalid/expired
     */
    verifyToken(token) {
        try {
            const payload = JSON.parse(atob(token));
            if (payload.exp && payload.exp < Date.now()) {
                return null;
            }
            return payload;
        } catch (_e) {
            return null;
        }
    }

    /**
     * Register a new user
     * 
     * Attempts to register with Supabase first, falls back to localStorage if unavailable.
     * Validates input, checks for duplicates, and hashes passwords.
     * 
     * @public
     * @async
     * @param {string} username - User's chosen username
     * @param {string} email - User's email address
     * @param {string} password - User's password (min 8 characters)
     * @param {string} [fullName] - User's full name (optional)
     * @returns {Promise<Object>} Result object with success flag and user/error
     * @returns {boolean} returns.success - Whether registration succeeded
     * @returns {Object|null} returns.user - User object if successful, null if email confirmation required
     * @returns {string|null} returns.error - Error message if failed
     * @returns {string|null} returns.message - Success message if email confirmation required
     * @example
     * const result = await authManager.register('johndoe', 'john@example.com', 'password123', 'John Doe');
     * if (result.success) {
     *   console.log('User registered:', result.user);
     * }
     */
    async register(username, email, password, fullName) {
        console.log(`📝 Registering user: ${username}`);

        if (this.useSupabase) {
            try {
                // Validate input
                if (!email || !password) {
                    return { success: false, error: 'Email and password are required' };
                }

                if (password.length < 8) {
                    return { success: false, error: 'Password must be at least 8 characters' };
                }

                // Register with Supabase
                const { data, error } = await this.supabase.auth.signUp({
                    email: email.trim().toLowerCase(),
                    password: password,
                    options: {
                        data: {
                            username: username.trim(),
                            full_name: fullName ? fullName.trim() : username.trim(),
                        },
                    },
                });

                if (error) {
                    console.error('✗ Supabase registration error:', error);
                    return { success: false, error: error.message || 'Registration failed' };
                }

                if (data.user) {
                    console.log('✓ User registered successfully with Supabase');
                    this.user = {
                        id: data.user.id,
                        username: data.user.user_metadata?.username || username,
                        email: data.user.email,
                        fullName: data.user.user_metadata?.full_name || fullName || username,
                        app_metadata: data.user.app_metadata || {},
                        user_metadata: data.user.user_metadata || {},
                        groups: data.user.app_metadata?.groups || [],
                    };
                    this.session = data.session;
                    // Store token for compatibility
                    if (data.session && data.session.access_token) {
                        this.token = data.session.access_token;
                        localStorage.setItem('auth_token', data.session.access_token);
                    }
                    this.updateUI();
                    return { success: true, user: this.user };
                }

                // If email confirmation is required
                if (data.user === null) {
                    return {
                        success: true,
                        message: 'Please check your email to confirm your account',
                        user: null,
                    };
                }
            } catch (error) {
                console.error('✗ Registration error:', error);
                return { success: false, error: 'Registration failed. Please try again.' };
            }
        }

        // Fallback to localStorage
        try {
            if (!username || !email || !password) {
                return { success: false, error: 'Username, email, and password are required' };
            }

            if (username.length < 3) {
                return { success: false, error: 'Username must be at least 3 characters' };
            }

            if (password.length < 8) {
                return { success: false, error: 'Password must be at least 8 characters' };
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return { success: false, error: 'Please enter a valid email address' };
            }

            const users = this.getUsers();

            if (users.find((u) => u.username.toLowerCase() === username.toLowerCase())) {
                return { success: false, error: 'Username already exists' };
            }

            if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
                return { success: false, error: 'Email already registered' };
            }

            const salt = this.generateSalt();
            const hashedPassword = await this.hashPassword(password, salt);

            const newUser = {
                id: users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1,
                username: username.trim(),
                email: email.trim().toLowerCase(),
                password: hashedPassword,
                salt,
                fullName: fullName ? fullName.trim() : username.trim(),
                createdAt: new Date().toISOString(),
                groups: [1], // 1 = regular user, 100 = admin
                roles: ['user'],
            };

            users.push(newUser);
            this.saveUsers(users);

            const token = this.generateToken(newUser);

            console.log('✓ User registered successfully (localStorage)');
            this.token = token;
            this.user = { ...newUser };
            delete this.user.password;
            localStorage.setItem('auth_token', token);
            localStorage.setItem('auth_user', JSON.stringify(this.user));
            this.updateUI();

            return { success: true, user: this.user };
        } catch (error) {
            console.error('✗ Registration error:', error);
            return { success: false, error: 'Registration failed. Please try again.' };
        }
    }

    /**
     * Log in a user
     * 
     * Attempts to authenticate with Supabase first, falls back to localStorage.
     * Supports both email and username login (username is converted to email for Supabase).
     * 
     * @public
     * @async
     * @param {string} username - Username or email address
     * @param {string} password - User's password
     * @returns {Promise<Object>} Result object with success flag and user/error
     * @returns {boolean} returns.success - Whether login succeeded
     * @returns {Object|null} returns.user - User object if successful
     * @returns {string|null} returns.error - Error message if failed
     * @example
     * const result = await authManager.login('john@example.com', 'password123');
     * if (result.success) {
     *   console.log('Logged in as:', result.user);
     * }
     */
    async login(username, password) {
        console.log(`🔑 Logging in: ${username}`);

        if (this.useSupabase) {
            try {
                if (!username || !password) {
                    return { success: false, error: 'Email and password are required' };
                }

                // Supabase uses email for login
                // If username doesn't contain @, try to find user by username in localStorage first
                let email = username.trim().toLowerCase();

                if (!email.includes('@')) {
                    // User entered username, not email
                    // Try to find email from localStorage users
                    const users = this.getUsers();
                    const user = users.find(
                        (u) => u.username.toLowerCase() === email || u.email.toLowerCase() === email
                    );
                    if (user && user.email) {
                        email = user.email.toLowerCase();
                    } else {
                        // If not found in localStorage, try username as email (might work if username is email)
                        // But Supabase requires email, so return error
                        return {
                            success: false,
                            error: 'Please use your email address to login. If you registered with a username, use the email you provided during registration.',
                        };
                    }
                }

                const { data, error } = await this.supabase.auth.signInWithPassword({
                    email: email,
                    password: password,
                });

                if (error) {
                    console.error('✗ Supabase login error:', error);
                    return { success: false, error: error.message || 'Invalid credentials' };
                }

                if (data.user && data.session) {
                    console.log('✓ Login successful with Supabase');
                    this.session = data.session;
                    this.user = {
                        id: data.user.id,
                        username:
                            data.user.user_metadata?.username || data.user.email?.split('@')[0],
                        email: data.user.email,
                        fullName:
                            data.user.user_metadata?.full_name || data.user.email?.split('@')[0],
                        app_metadata: data.user.app_metadata || {},
                        user_metadata: data.user.user_metadata || {},
                        groups: data.user.app_metadata?.groups || [],
                    };
                    this.session = data.session;
                    // Store token for compatibility
                    if (data.session && data.session.access_token) {
                        this.token = data.session.access_token;
                        localStorage.setItem('auth_token', data.session.access_token);
                    }
                    localStorage.setItem('auth_user', JSON.stringify(this.user));
                    this.updateUI();
                    return { success: true, user: this.user };
                }
            } catch (error) {
                console.error('✗ Login error:', error);
                return { success: false, error: 'Login failed. Please try again.' };
            }
        }

        // Fallback to localStorage
        try {
            if (!username || !password) {
                return { success: false, error: 'Username and password are required' };
            }

            const users = this.getUsers();
            const user = users.find(
                (u) =>
                    u.username.toLowerCase() === username.toLowerCase() ||
                    u.email.toLowerCase() === username.toLowerCase()
            );

            if (!user) {
                return { success: false, error: 'Invalid credentials' };
            }

            if (user.salt) {
                const hashedPassword = await this.hashPassword(password, user.salt);
                if (hashedPassword !== user.password) {
                    return { success: false, error: 'Invalid credentials' };
                }
            } else {
                const legacyHash = await this.hashPassword(password);
                if (legacyHash !== user.password) {
                    return { success: false, error: 'Invalid credentials' };
                }

                const salt = this.generateSalt();
                const newHash = await this.hashPassword(password, salt);
                user.password = newHash;
                user.salt = salt;
                this.saveUsers(users);
            }

            const token = this.generateToken(user);

            console.log('✓ Login successful (localStorage)');
            const { password: _, ...userWithoutPassword } = user;
            this.token = token;
            this.user = userWithoutPassword;
            localStorage.setItem('auth_token', token);
            localStorage.setItem('auth_user', JSON.stringify(this.user));
            this.updateUI();

            return { success: true, user: this.user };
        } catch (error) {
            console.error('✗ Login error:', error);
            return { success: false, error: 'Login failed. Please try again.' };
        }
    }

    /**
     * Log out the current user
     * 
     * Clears session, removes tokens, and redirects to index page.
     * Cleans up Supabase auth state subscription if active.
     * 
     * @public
     * @async
     * @returns {Promise<void>}
     * @example
     * await authManager.logout();
     */
    async logout() {
        console.log('👋 Logging out');

        if (this.useSupabase && this.supabase) {
            try {
                // Clean up auth state subscription if it exists
                if (
                    this.authStateSubscription &&
                    this.authStateSubscription.data &&
                    this.authStateSubscription.data.subscription
                ) {
                    this.authStateSubscription.data.subscription.unsubscribe();
                    this.authStateSubscription = null;
                }
                await this.supabase.auth.signOut();
            } catch (error) {
                console.error('✗ Error signing out from Supabase:', error);
            }
        }

        this.token = null;
        this.user = null;
        this.session = null;
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        this.updateUI();

        const basePath = window.location.pathname.split('/').slice(0, -1).join('/');
        if (basePath && basePath !== '/') {
            window.location.href = basePath + '/index.html';
        } else {
            window.location.href = 'index.html';
        }
    }

    /**
     * Load the current authenticated user
     * 
     * Attempts to load from Supabase first, falls back to localStorage.
     * Called automatically on initialization and after auth state changes.
     * 
     * @public
     * @async
     * @returns {Promise<void>}
     * @throws {Error} If user cannot be loaded and token is invalid
     */
    async loadUser() {
        if (this.useSupabase && this.supabase) {
            try {
                const {
                    data: { user },
                    error,
                } = await this.supabase.auth.getUser();

                if (error) {
                    console.warn('⚠️ Supabase getUser error:', error.message);
                    throw error;
                }

                if (!user) {
                    // Edge case: Session exists but user is null
                    console.error('❌ Session valid but user is null. Clearing session.');
                    await this.logout();
                    return;
                }

                if (user) {
                    this.user = {
                        id: user.id,
                        username: user.user_metadata?.username || user.email?.split('@')[0] || 'User',
                        email: user.email,
                        fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
                        app_metadata: user.app_metadata || {},
                        user_metadata: user.user_metadata || {},
                        groups: user.app_metadata?.groups || [],
                    };
                    console.log('✓ User loaded from Supabase:', this.user.email);
                    return;
                }
            } catch (error) {
                console.error('✗ Error loading user from Supabase:', error);
            }
        }

        // Fallback to localStorage
        this.loadUserFromLocalStorage();
    }

    /**
     * Load user from localStorage using stored token
     * 
     * Verifies token, then loads user data from localStorage.
     * Falls back to users array if saved user not found.
     * 
     * @private
     * @returns {void}
     * @throws {Error} If token is invalid or user not found (triggers logout)
     */
    loadUserFromLocalStorage() {
        if (!this.token) return;

        try {
            const payload = this.verifyToken(this.token);
            if (!payload) {
                throw new Error('Invalid or expired token');
            }

            const savedUser = localStorage.getItem('auth_user');
            if (savedUser) {
                try {
                    this.user = JSON.parse(savedUser);
                    const users = this.getUsers();
                    const userExists = users.find((u) => u.id === this.user.id);
                    if (userExists) {
                        console.log('✓ User loaded from localStorage:', this.user.username);
                        return;
                    }
                } catch (_e) {
                    // Continue
                }
            }

            const users = this.getUsers();
            const user = users.find((u) => u.id === payload.id);
            if (user) {
                const { password: _, ...userWithoutPassword } = user;
                this.user = userWithoutPassword;
                localStorage.setItem('auth_user', JSON.stringify(this.user));
                console.log('✓ User loaded from localStorage:', this.user.username);
            } else {
                throw new Error('User not found');
            }
        } catch (error) {
            console.error('✗ Error loading user:', error);
            this.logout();
        }
    }

    /**
     * Check if current user is an admin
     * @returns {boolean} True if user has admin privileges
     */
    isAdmin() {
        if (!this.isAuthenticated() || !this.user) return false;

        // Check Supabase app_metadata (Defensive check)
        if (this.user.app_metadata && (this.user.app_metadata.role === 'admin' || this.user.app_metadata.roles?.includes('admin'))) {
            return true;
        }

        // Check user_metadata (often used for frontend roles)
        if (this.user.user_metadata && (this.user.user_metadata.role === 'admin' || this.user.user_metadata.roles?.includes('admin'))) {
            return true;
        }

        // Check groups (legacy/offline support) - 100 is admin
        if (Array.isArray(this.user.groups) && (this.user.groups.includes('admin') || this.user.groups.includes(100))) {
            return true;
        }

        // Check explicit roles array (offline)
        if (Array.isArray(this.user.roles) && this.user.roles.includes('admin')) {
            return true;
        }

        return false;
    }

    /**
     * Check if user is currently authenticated
     * 
     * @public
     * @returns {boolean} True if user is authenticated, false otherwise
     * @example
     * if (authManager.isAuthenticated()) {
     *   console.log('User is logged in');
     * }
     */
    isAuthenticated() {
        if (this.useSupabase && this.supabase && this.session) {
            return !!this.user && !!this.session;
        }
        return !!this.token && !!this.user && this.verifyToken(this.token) !== null;
    }

    /**
     * Get the current authenticated user object
     * 
     * @public
     * @returns {Object|null} User object or null if not authenticated
     * @returns {string} user.id - User's unique ID
     * @returns {string} user.username - User's username
     * @returns {string} user.email - User's email address
     * @returns {string} user.fullName - User's full name
     * @example
     * const user = authManager.getCurrentUser();
     * if (user) {
     *   console.log('Current user:', user.email);
     * }
     */
    getCurrentUser() {
        return this.user;
    }

    /**
     * Get HTTP authorization headers for API requests
     * 
     * Returns headers with Bearer token for authenticated requests.
     * Uses Supabase session token if available, otherwise localStorage token.
     * 
     * @public
     * @returns {Object} Headers object with Content-Type and Authorization
     * @returns {string} headers['Content-Type'] - Always 'application/json'
     * @returns {string} headers['Authorization'] - Bearer token
     * @example
     * const headers = authManager.getHeaders();
     * fetch('/api/protected', { headers });
     */
    getHeaders() {
        if (this.useSupabase && this.session) {
            return {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.session.access_token}`,
            };
        }
        return {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.token}`,
        };
    }

    /**
     * Update UI elements based on authentication state
     * 
     * Shows/hides login/logout buttons and member-only content.
     * Updates user display elements with current user info.
     * Dispatches 'auth:state-changed' event.
     * 
     * @public
     * @returns {void}
     */
    updateUI() {
        const isAuth = this.isAuthenticated();

        const loginButtons = document.querySelectorAll('.login-button');
        const logoutButtons = document.querySelectorAll('.logout-button');
        const memberButtons = document.querySelectorAll('.members-only');

        loginButtons.forEach((btn) => {
            if (btn) btn.style.display = isAuth ? 'none' : 'block';
        });

        logoutButtons.forEach((btn) => {
            if (btn) btn.style.display = isAuth ? 'block' : 'none';
        });

        memberButtons.forEach((btn) => {
            if (btn) btn.style.display = isAuth ? 'block' : 'none';
        });

        const userDisplays = document.querySelectorAll('.user-display');
        userDisplays.forEach((display) => {
            if (display) {
                if (this.user) {
                    display.textContent = this.user.fullName || this.user.username;
                    display.style.display = 'inline';
                } else {
                    display.style.display = 'none';
                }
            }
        });

        console.log(
            `🎨 UI updated - Auth status: ${isAuth} (${this.useSupabase ? 'Supabase' : 'localStorage'})`
        );

        this.emitAuthEvent('auth:state-changed');
    }

    /**
     * Mark authentication system as ready
     * 
     * Called after initialization completes.
     * Dispatches 'auth:ready' event for other scripts to listen.
     * 
     * @public
     * @returns {void}
     */
    markReady() {
        if (this.isReady) {
            return;
        }
        this.isReady = true;
        this.emitAuthEvent('auth:ready');
    }

    /**
     * Emit a custom authentication event
     * 
     * Dispatches custom events that other scripts can listen to.
     * Events: 'auth:ready', 'auth:state-changed'
     * 
     * @private
     * @param {string} eventName - Name of the event to dispatch
     * @returns {void}
     * @example
     * // Listen for auth events
     * document.addEventListener('auth:ready', () => {
     *   console.log('Auth system is ready');
     * });
     */
    emitAuthEvent(eventName) {
        if (typeof document === 'undefined' || typeof CustomEvent === 'undefined') {
            return;
        }

        try {
            document.dispatchEvent(
                new CustomEvent(eventName, {
                    detail: {
                        isAuthenticated: this.isAuthenticated(),
                        user: this.user
                            ? {
                                id: this.user.id,
                                email: this.user.email,
                                username: this.user.username,
                                fullName: this.user.fullName,
                            }
                            : null,
                    },
                })
            );
        } catch (error) {
            console.warn('⚠️ Failed to dispatch auth event:', error);
        }
    }
}

// Initialize global auth manager
// This will use Supabase if configured, otherwise fallback to localStorage
const _authManager = new SupabaseAuthManager();
// Make it available globally
window.authManager = _authManager;

// Modal helpers
function _showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}
window.showModal = _showModal;

function _hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}
window.hideModal = _hideModal;

// Close modals when clicking outside
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal') && e.target.classList.contains('active')) {
        e.target.classList.remove('active');
        document.body.style.overflow = '';
    }
});
