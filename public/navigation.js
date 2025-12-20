/**
 * Navigation Menu System
 * 
 * Handles hamburger menu, mobile navigation, and smooth page transitions.
 * Creates a fixed-position hamburger menu button and full-screen overlay menu.
 * 
 * Features:
 * - Hamburger menu button (top-right corner)
 * - Full-screen overlay menu with navigation links
 * - Smooth animations and transitions
 * - Keyboard support (Escape to close)
 * - Mobile responsive design
 * - Event listener cleanup for memory management
 * 
 * @class NavigationMenu
 * @author Adriano To The Star
 * @version 1.0.0
 * @example
 * // Automatically initializes on page load
 * // Manual initialization:
 * const nav = new NavigationMenu();
 */
(function () {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return;
    }

    if (window.__navigationJsLoaded) {
        return;
    }

    window.__navigationJsLoaded = true;

class NavigationMenu {
    /**
     * Creates a new NavigationMenu instance
     * @constructor
     */
    constructor() {
        /** @type {boolean} Whether the menu is currently open */
        this.isOpen = false;
        this.closeTimeoutId = null;
        this.init();
    }

    /**
     * Initialize the navigation menu system
     * Creates menu button, overlay, and sets up event listeners
     * @private
     */
    init() {
        this.createMenuButton();
        this.createMenuOverlay();
        this.setupEventListeners();
    }

    /**
     * Create the hamburger menu toggle button
     * Creates or updates the menu toggle button in the top-right corner
     * @private
     * @returns {void}
     */
    createMenuButton() {
        // Check if button already exists
        let button = document.getElementById('menu-toggle');

        if (!button) {
            button = document.createElement('button');
            button.id = 'menu-toggle';
            button.className = 'menu-toggle';
            button.setAttribute('aria-label', 'Toggle menu');
            button.innerHTML = `
                <span class="menu-icon"></span>
                <span class="menu-icon"></span>
                <span class="menu-icon"></span>
            `;
            document.body.appendChild(button);
        } else {
            // Ensure existing button has the correct class
            if (!button.classList.contains('menu-toggle')) {
                button.classList.add('menu-toggle');
            }
        }

        // Ensure button is visible and positioned top-right
        button.style.cssText = `
            position: fixed !important;
            top: 30px !important;
            right: 30px !important;
            left: auto !important;
            bottom: auto !important;
            z-index: 10001 !important;
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
            margin: 0 !important;
            padding: 0 !important;
        `;
    }

    /**
     * Create the full-screen menu overlay
     * Creates a full-screen overlay containing navigation links, search, and login button
     * @private
     * @returns {void}
     */
    createMenuOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'menu-overlay';
        overlay.className = 'menu-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            z-index: 10000;
            opacity: 0;
            visibility: hidden;
            overflow-y: auto;
        `;
        overlay.innerHTML = `
            <div class="menu-content">
                <button id="menu-close" class="menu-close" aria-label="Close menu">
                    <span>Close</span>
                </button>
                
                <div class="menu-header">
                    <h2>ADRIANO TO THE STAR</h2>
                </div>

                <nav class="menu-nav">
                    <ul>
                        <li><a href="index.html" data-page="home">Home</a></li>
                        <li><a href="business-promise.html" data-page="business-promise">Business Promise</a></li>
                        <li><a href="education.html" data-page="education">Education</a></li>
                        <li><a href="projects.html" data-page="projects">Projects</a></li>
                        <li><a href="about.html" data-page="about">About me</a></li>
                        <li><a href="database.html" data-page="database">DATABASE</a></li>
                        <li><a href="stellar-ai.html" data-page="stellar-ai">🤖 Stellar AI</a></li>
                        <li><a href="mechgen.html" data-page="mechgen">🧪 MechGen</a></li>
                        <li><a href="secure-chat.html" data-page="secure-chat">🔐 Secure Chat</a></li>
                        <li><a href="messaging.html" data-page="messaging">💬 Direct Messages</a></li>
                        <li><a href="marketplace.html" data-page="marketplace">🛒 Marketplace</a></li>
                        <li><a href="badges.html" data-page="badges">🏆 Badges & Achievements</a></li>
                        <li><a href="analytics-dashboard.html" data-page="analytics">📊 Analytics</a></li>
                        <li><a href="education.html" data-page="education">📚 Education</a></li>
                        <li><a href="event-calendar.html" data-page="event-calendar">📅 Events Calendar</a></li>
                        <li><a href="newsletter.html" data-page="newsletter">📧 Newsletter</a></li>
                        <li><a href="tracker.html" data-page="tracker">📍 Tracker</a></li>
                        <li><a href="file-storage.html" data-page="file-storage">📁 File Storage</a></li>
                        <li><a href="games.html" data-page="games">🎮 Games</a></li>
                        <li><a href="total-war-2.html" data-page="total-war-2">⚔️ Total War 2</a></li>
                        <li><a href="gta-6-videos.html" data-page="gta-6-videos">🎬 GTA 6 Leaked Videos</a></li>
                        <li><a href="broadband-checker.html" data-page="broadband">🌐 Broadband Checker</a></li>
                        <li><a href="book-online.html" data-page="book">Book Online</a></li>
                        <li><a href="loyalty.html" data-page="loyalty">Loyalty</a></li>
                        <li><a href="events.html" data-page="events">Events</a></li>
                        <li><a href="shop.html" data-page="shop">Shop</a></li>
                        <li><a href="groups.html" data-page="groups">Groups</a></li>
                        <li><a href="members.html" data-page="members">Members</a></li>
                        <li><a href="followers.html" data-page="followers">Followers</a></li>
                        <li><a href="dashboard.html" data-page="dashboard">📊 Dashboard</a></li>
                        <li><a href="forum.html" data-page="forum">Forum</a></li>
                        <li><a href="blog.html" data-page="blog">Blog</a></li>
                        <li><a href="hiv-market-analysis.html" data-page="hiv-market">HIV Market Analysis</a></li>
                        <li><a href="star-maps.html" data-page="star-maps">Star Maps</a></li>
                        <li><a href="space-dashboard.html" data-page="space-dashboard">Space Dashboard</a></li>
                        <li><a href="ai-metrics-dashboard.html" data-page="ai-metrics">AI Metrics Dashboard</a></li>
                        <li><a href="ai-fairness.html" data-page="ai-fairness">AI Fairness</a></li>
                        <li><a href="database-analytics.html" data-page="database-analytics">Database Analytics</a></li>
                        <li><a href="offline.html" data-page="offline">Offline</a></li>
                        <li><a href="test-index.html" data-page="test-index">Test Pages Index</a></li>
                    </ul>
                </nav>

                <div class="menu-footer">
                    <div class="search-container">
                        <input type="text" placeholder="Search..." class="menu-search" id="menu-search">
                        <button class="search-btn" aria-label="Search">🔍</button>
                    </div>
                    <button class="login-btn">Log In</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
    }

    /**
     * Set up all event listeners for menu interactions
     * Handles click events for toggle/close buttons, overlay clicks, and keyboard (Escape)
     * Stores handlers for proper cleanup
     * @private
     * @returns {void}
     */
    setupEventListeners() {
        const toggleBtn = document.getElementById('menu-toggle');
        const closeBtn = document.getElementById('menu-close');
        const overlay = document.getElementById('menu-overlay');

        if (!toggleBtn || !closeBtn || !overlay) {
            console.warn('⚠️ Navigation menu elements not found');
            return;
        }

        // Store handlers for cleanup
        this.toggleHandler = () => {
            if (this.isOpen) {
                this.closeMenu();
            } else {
                this.openMenu();
            }
        };
        this.closeHandler = () => this.closeMenu();
        this.overlayHandler = (e) => {
            if (e.target === overlay) {
                this.closeMenu();
            }
        };
        this.keydownHandler = (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeMenu();
            }
        };

        toggleBtn.addEventListener('click', this.toggleHandler);
        closeBtn.addEventListener('click', this.closeHandler);
        overlay.addEventListener('click', this.overlayHandler);
        document.addEventListener('keydown', this.keydownHandler);

        // Animate menu items
        const menuItems = document.querySelectorAll('.menu-nav a');
        if (menuItems) {
            menuItems.forEach((item, index) => {
                item.style.transitionDelay = `${index * 50}ms`;
            });
        }
    }

    /**
     * Clean up event listeners to prevent memory leaks
     * Removes all event listeners attached by this instance
     * Should be called when the menu is no longer needed
     * @public
     * @returns {void}
     */
    cleanup() {
        const toggleBtn = document.getElementById('menu-toggle');
        const closeBtn = document.getElementById('menu-close');
        const overlay = document.getElementById('menu-overlay');

        if (toggleBtn && this.toggleHandler) {
            toggleBtn.removeEventListener('click', this.toggleHandler);
        }
        if (closeBtn && this.closeHandler) {
            closeBtn.removeEventListener('click', this.closeHandler);
        }
        if (overlay && this.overlayHandler) {
            overlay.removeEventListener('click', this.overlayHandler);
        }
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
        }
    }

    /**
     * Open the navigation menu
     * Shows the overlay, animates menu items, and prevents body scrolling
     * @public
     * @returns {void}
     */
    openMenu() {
        const overlay = document.getElementById('menu-overlay');
        const toggleBtn = document.getElementById('menu-toggle');

        if (!overlay || !toggleBtn) return;

        if (this.closeTimeoutId) {
            clearTimeout(this.closeTimeoutId);
            this.closeTimeoutId = null;
        }

        this.isOpen = true;
        overlay.classList.add('active');
        toggleBtn.classList.add('active');
        document.body.style.overflow = 'hidden';

        const skipAnimations = typeof document !== 'undefined' && document && document.visibilityState !== 'visible';
        if (skipAnimations) {
            overlay.style.transition = 'none';
            overlay.style.opacity = '1';
            overlay.style.visibility = 'visible';
        } else {
            overlay.style.transition = '';
            overlay.style.opacity = '';
            overlay.style.visibility = '';
        }

        // Animate menu items
        const menuItems = document.querySelectorAll('.menu-nav a');
        if (menuItems) {
            if (skipAnimations) {
                menuItems.forEach(item => item.classList.add('visible'));
            } else {
                setTimeout(() => {
                    menuItems.forEach(item => item.classList.add('visible'));
                }, 100);
            }
        }
    }

    /**
     * Close the navigation menu
     * Hides the overlay, removes animations, and restores body scrolling
     * @public
     * @returns {void}
     */
    closeMenu() {
        const overlay = document.getElementById('menu-overlay');
        const toggleBtn = document.getElementById('menu-toggle');
        const menuItems = document.querySelectorAll('.menu-nav a');

        if (!overlay || !toggleBtn) return;

        this.isOpen = false;
        if (menuItems) {
            menuItems.forEach(item => item.classList.remove('visible'));
        }

        if (this.closeTimeoutId) {
            clearTimeout(this.closeTimeoutId);
            this.closeTimeoutId = null;
        }

        const skipAnimations = typeof document !== 'undefined' && document && document.visibilityState !== 'visible';
        if (skipAnimations) {
            overlay.style.transition = 'none';
            overlay.style.opacity = '0';
            overlay.style.visibility = 'hidden';
            overlay.classList.remove('active');
            toggleBtn.classList.remove('active');
            document.body.style.overflow = '';
            return;
        }

        this.closeTimeoutId = setTimeout(() => {
            overlay.classList.remove('active');
            toggleBtn.classList.remove('active');
            document.body.style.overflow = '';
            this.closeTimeoutId = null;
        }, 300);
    }
}

/**
 * Initialize the navigation menu system
 * Creates a singleton instance of NavigationMenu and sets up the menu
 * Handles DOM ready state and includes retry logic for robustness
 * @global
 * @returns {void}
 */
/**
 * Initialize the navigation menu system
 * Creates a singleton instance of NavigationMenu and sets up the menu
 * Handles DOM ready state and uses MutationObserver for robustness
 * @global
 * @returns {void}
 */
function initNavigation() {
    // Check if already initialized
    if (window.navigationMenuInstance) {
        console.log('🔗 Navigation menu already initialized');
        return;
    }

    try {
        window.navigationMenuInstance = new NavigationMenu();

        // Use MutationObserver to ensure button persists
        const observer = new MutationObserver((mutations) => {
            if (!document.getElementById('menu-toggle')) {
                console.warn('⚠️ Menu toggle button missing, recreating...');
                if (window.navigationMenuInstance) {
                    window.navigationMenuInstance.cleanup();
                    window.navigationMenuInstance.createMenuButton();
                    // Re-attach listeners since the button was recreated
                    window.navigationMenuInstance.setupEventListeners();
                }
            }
        });

        if (document.body) {
            observer.observe(document.body, { childList: true, subtree: false });
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                observer.observe(document.body, { childList: true, subtree: false });
            });
        }

    } catch (error) {
        console.error('❌ Error initializing navigation menu:', error);
    }

    // Add dynamic CSS for navigation
    if (!document.getElementById('navigation-styles')) {
        const style = document.createElement('style');
        style.id = 'navigation-styles';
        style.textContent = `
        /* Menu Toggle Button - Always Top Right */
        #menu-toggle,
        .menu-toggle,
        button#menu-toggle,
        button.menu-toggle {
            position: fixed !important;
            top: 30px !important;
            right: 30px !important;
            left: auto !important;
            bottom: auto !important;
            z-index: 10001 !important;
            background: transparent !important;
            border: 2px solid rgba(255, 255, 255, 0.5) !important;
            width: 50px !important;
            height: 50px !important;
            border-radius: 4px !important;
            cursor: pointer !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            align-items: center !important;
            gap: 6px !important;
            transition: all 0.3s ease !important;
            visibility: visible !important;
            opacity: 1 !important;
            margin: 0 !important;
            padding: 0 !important;
        }

        .menu-toggle:hover {
            border-color: rgba(255, 255, 255, 0.8);
            background: rgba(255, 255, 255, 0.1);
        }

        .menu-icon {
            display: block;
            width: 25px;
            height: 2px;
            background: #ffffff;
            transition: all 0.3s ease;
        }

        .menu-toggle.active .menu-icon:nth-child(1) {
            transform: translateY(8px) rotate(45deg);
        }

        .menu-toggle.active .menu-icon:nth-child(2) {
            opacity: 0;
        }

        .menu-toggle.active .menu-icon:nth-child(3) {
            transform: translateY(-8px) rotate(-45deg);
        }

        /* Menu Overlay */
        .menu-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            z-index: 10000;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.4s ease, visibility 0.4s ease;
            overflow-y: auto;
        }

        .menu-overlay.active {
            opacity: 1;
            visibility: visible;
        }

        .menu-content {
            max-width: 600px;
            margin: 0 auto;
            padding: 100px 40px 60px;
            position: relative;
        }

        .menu-close {
            position: absolute;
            top: 30px;
            right: 30px;
            background: transparent;
            border: 2px solid rgba(255, 255, 255, 0.5);
            color: #ffffff;
            padding: 12px 24px;
            font-size: 1rem;
            font-family: 'Raleway', sans-serif;
            font-weight: 300;
            letter-spacing: 1px;
            text-transform: uppercase;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .menu-close:hover {
            border-color: rgba(255, 255, 255, 0.8);
            background: rgba(255, 255, 255, 0.1);
        }

        .menu-header {
            text-align: right;
            margin-bottom: 60px;
        }

        .menu-header h2 {
            font-family: 'Raleway', sans-serif;
            font-size: 1.2rem;
            font-weight: 300;
            letter-spacing: 3px;
            color: #ffffff;
            text-transform: uppercase;
        }

        /* Navigation Menu */
        .menu-nav {
            margin: 60px 0;
        }

        .menu-nav ul {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .menu-nav li {
            margin: 0;
            padding: 0;
        }

        .menu-nav a {
            display: block;
            font-family: 'Raleway', sans-serif;
            font-size: 1.8rem;
            font-weight: 300;
            color: #ffffff;
            text-decoration: none;
            padding: 15px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            opacity: 0;
            transform: translateX(-30px);
            transition: all 0.3s ease;
        }

        .menu-nav a.visible {
            opacity: 1;
            transform: translateX(0);
        }

        .menu-nav a:hover {
            color: rgba(255, 255, 255, 0.7);
            padding-left: 20px;
        }

        /* Menu Footer */
        .menu-footer {
            margin-top: 60px;
            padding-top: 40px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .search-container {
            display: flex;
            margin-bottom: 30px;
            border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .menu-search {
            flex: 1;
            background: transparent;
            border: none;
            padding: 15px 20px;
            color: #ffffff;
            font-family: 'Raleway', sans-serif;
            font-size: 1rem;
            outline: none;
        }

        .menu-search::placeholder {
            color: rgba(255, 255, 255, 0.5);
        }

        .search-btn {
            background: transparent;
            border: none;
            border-left: 1px solid rgba(255, 255, 255, 0.3);
            padding: 15px 20px;
            color: #ffffff;
            cursor: pointer;
            transition: background 0.3s ease;
        }

        .search-btn:hover {
            background: rgba(255, 255, 255, 0.1);
        }

        .login-btn {
            width: 100%;
            background: transparent;
            border: 2px solid #ffffff;
            color: #ffffff;
            padding: 15px;
            font-family: 'Raleway', sans-serif;
            font-size: 1rem;
            font-weight: 400;
            letter-spacing: 2px;
            text-transform: uppercase;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .login-btn:hover {
            background: #ffffff;
            color: #000000;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
            .menu-toggle {
                top: 20px;
                right: 20px;
                width: 45px;
                height: 45px;
            }

            .menu-content {
                padding: 80px 20px 40px;
            }

            .menu-close {
                top: 20px;
                right: 80px;
                padding: 10px 20px;
                font-size: 0.9rem;
            }

            .menu-nav a {
                font-size: 1.4rem;
                padding: 12px 0;
            }

            .menu-header h2 {
                font-size: 0.9rem;
            }
        }

        /* Smooth page transitions */
        .page-transition {
            animation: fadeIn 0.5s ease;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
        document.head.appendChild(style);
    }

    console.log(' Navigation menu initialized!');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigation);
} else {
    // DOM is already loaded
    initNavigation();
}
window.NavigationMenu = NavigationMenu;
window.initNavigation = initNavigation;
})();
