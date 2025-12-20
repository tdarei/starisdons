/* global MEDIA_PATHS */

/**
 * GTA 6 Videos Manager
 * Handles video listing, search, and playback
 */

class GTA6VideosManager {
    constructor() {
        this.videos = [];
        this.filteredVideos = [];
        this.searchTerm = '';
        this.currentVideo = null;
        // Use external media URL if configured, otherwise use local
        this.videosBasePath = (typeof MEDIA_PATHS !== 'undefined' && MEDIA_PATHS.videos) 
            ? MEDIA_PATHS.videos 
            : 'gta-6-videos';
        this.init();
    }

    async init() {
        this.trackEvent('g_ta6v_id_eo_sm_an_ag_er_initialized');
        
        // Load videos list
        await this.loadVideosList();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Render videos
        this.renderVideos();
        
        console.log(`✅ GTA 6 Videos Manager initialized with ${this.videos.length}

    trackEvent(eventName, data = {}) {
        try {
            if (typeof window !== 'undefined' && window.performanceMonitoring) {
                window.performanceMonitoring.recordMetric("g_ta6v_id_eo_sm_an_ag_er_" + eventName, 1, data);
            }
        } catch (e) { /* Silent fail */ }
    }
 videos`);
    }

    async loadVideosList() {
        try {
            // Try to load a manifest file (try external first, then local)
            const manifestPaths = [
                `${this.videosBasePath}/videos-manifest.json`,
                `${this.videosBasePath}/videos-list.txt`,
                'gta-6-videos/videos-manifest.json',
                'gta-6-videos/videos-list.txt'
            ];
            
            let response = null;
            for (const manifestPath of manifestPaths) {
                try {
                    response = await fetch(manifestPath);
                    if (response.ok) break;
                } catch (e) {
                    continue;
                }
            }
            
            if (response && response.ok) {
                const manifest = await response.json();
                this.videos = manifest.videos || [];
                console.log(`✅ Loaded ${this.videos.length} videos from manifest`);
            } else {
                // Generate file list from common video structure
                this.videos = await this.generateVideoList();
                console.log(`✅ Generated video list with ${this.videos.length} videos`);
            }
        } catch (error) {
            console.warn('⚠️ Could not load manifest, generating list...', error);
            this.videos = await this.generateVideoList();
        }
        
        this.filteredVideos = [...this.videos];
    }

    async generateVideoList() {
        // Try to load a videos list file (try external first, then local)
        const listPaths = [
            `${this.videosBasePath}/videos-list.txt`,
            `${this.videosBasePath}/videos-manifest.json`,
            'gta-6-videos/videos-list.txt',
            'gta-6-videos/videos-manifest.json'
        ];
        
        for (const listPath of listPaths) {
            try {
                const response = await fetch(listPath);
                if (response.ok) {
                    const text = await response.text();
                    const files = text.split('\n')
                        .map(line => line.trim())
                        .filter(line => line.endsWith('.mp4') && !line.endsWith('.ia.mp4') && line.length > 0);
                    
                    return files.map(filename => ({
                        name: this.cleanVideoName(filename),
                        filename: filename,
                        path: `${this.videosBasePath}/${filename}`,
                        date: this.extractDate(filename)
                    }));
                }
            } catch (e) {
                continue;
            }
        }
        
        console.warn('⚠️ Could not load videos-list.txt from any location');
        
        // Fallback: return empty array
        return [];
    }

    cleanVideoName(filename) {
        // Remove .mp4 extension
        let name = filename.replace(/\.mp4$/i, '');
        
        // Remove common prefixes
        name = name.replace(/^(AIWE_|Americas|Americas_1|GAME_TEST_)/i, '');
        
        // Clean up date patterns
        name = name.replace(/\s+\d{4}-\d{2}-\d{2}\s+\d{2}-\d{2}-\d{2}/g, '');
        
        // Replace underscores and dashes with spaces
        name = name.replace(/[_-]/g, ' ');
        
        // Clean up multiple spaces
        name = name.replace(/\s+/g, ' ').trim();
        
        // Capitalize first letter
        if (name.length > 0) {
            name = name.charAt(0).toUpperCase() + name.slice(1);
        }
        
        return name || filename.replace(/\.mp4$/i, '');
    }

    extractDate(filename) {
        // Try to extract date from filename (format: YYYY-MM-DD)
        const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
            return dateMatch[1];
        }
        return null;
    }

    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('video-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.filterVideos();
            });
        }

        // Clear search button
        const clearBtn = document.getElementById('clear-search');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                searchInput.value = '';
                this.searchTerm = '';
                this.filterVideos();
            });
        }

        // Close modal buttons
        const closeModalBtn = document.getElementById('close-video-modal');
        const closeVideoBtn = document.getElementById('close-video-btn');
        const videoModal = document.getElementById('video-modal');

        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => this.closeVideoModal());
        }
        if (closeVideoBtn) {
            closeVideoBtn.addEventListener('click', () => this.closeVideoModal());
        }
        if (videoModal) {
            videoModal.addEventListener('click', (e) => {
                if (e.target === videoModal) {
                    this.closeVideoModal();
                }
            });
        }

        // Fullscreen button
        const fullscreenBtn = document.getElementById('fullscreen-video-btn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }

        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && videoModal && videoModal.style.display !== 'none') {
                this.closeVideoModal();
            }
        });
    }

    filterVideos() {
        if (!this.searchTerm) {
            this.filteredVideos = [...this.videos];
        } else {
            this.filteredVideos = this.videos.filter(video => 
                video.name.toLowerCase().includes(this.searchTerm) ||
                video.filename.toLowerCase().includes(this.searchTerm) ||
                (video.date && video.date.includes(this.searchTerm))
            );
        }

        // Update clear button visibility
        const clearBtn = document.getElementById('clear-search');
        if (clearBtn) {
            clearBtn.style.display = this.searchTerm ? 'block' : 'none';
        }

        this.renderVideos();
    }

    renderVideos() {
        const grid = document.getElementById('videos-grid');
        const loading = document.getElementById('videos-loading');
        const noVideos = document.getElementById('no-videos-found');
        const videosCount = document.getElementById('videos-count');

        if (!grid) return;

        // Hide loading
        if (loading) loading.style.display = 'none';

        // Update count
        if (videosCount) {
            videosCount.textContent = `${this.filteredVideos.length} video${this.filteredVideos.length !== 1 ? 's' : ''} available`;
        }

        // Clear grid
        grid.innerHTML = '';

        // Show no videos message if needed
        if (this.filteredVideos.length === 0) {
            if (noVideos) noVideos.style.display = 'block';
            return;
        } else {
            if (noVideos) noVideos.style.display = 'none';
        }

        // Render videos
        this.filteredVideos.forEach((video, index) => {
            const videoCard = this.createVideoCard(video, index);
            grid.appendChild(videoCard);
        });
    }

    createVideoCard(video, index) {
        const card = document.createElement('div');
        card.className = 'video-card';
        card.style.animationDelay = `${index * 0.05}s`;
        
        const thumbnail = document.createElement('div');
        thumbnail.className = 'video-thumbnail';
        thumbnail.innerHTML = `
            <div class="play-icon">▶️</div>
            <div class="video-overlay"></div>
        `;
        
        const content = document.createElement('div');
        content.className = 'video-card-content';
        
        const title = document.createElement('h3');
        title.className = 'video-card-title';
        title.textContent = this.escapeHtml(video.name);
        content.appendChild(title);
        
        if (video.date) {
            const date = document.createElement('p');
            date.className = 'video-card-date';
            date.textContent = `📅 ${video.date}`;
            content.appendChild(date);
        }
        
        card.appendChild(thumbnail);
        card.appendChild(content);
        
        // Add click handler
        card.addEventListener('click', () => {
            this.playVideo(video.path, video.name);
        });
        
        return card;
    }

    playVideo(videoPath, videoName) {
        console.log(`▶️ Playing video: ${videoName} from ${videoPath}`);
        
        const modal = document.getElementById('video-modal');
        const modalTitle = document.getElementById('video-modal-title');
        const videoPlayer = document.getElementById('video-player');

        if (!modal || !videoPlayer) return;

        // Show modal
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        // Set title
        if (modalTitle) {
            modalTitle.textContent = videoName;
        }

        // Set video source
        videoPlayer.src = videoPath;
        videoPlayer.load();

        // Play video
        videoPlayer.play().catch(err => {
            console.error('Error playing video:', err);
        });

        this.currentVideo = { path: videoPath, name: videoName };
    }

    closeVideoModal() {
        const modal = document.getElementById('video-modal');
        const videoPlayer = document.getElementById('video-player');
        
        if (!modal) return;

        // Stop video
        if (videoPlayer) {
            videoPlayer.pause();
            videoPlayer.src = '';
        }

        this.currentVideo = null;
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }

    toggleFullscreen() {
        const videoPlayer = document.getElementById('video-player');
        if (!videoPlayer) return;

        if (!document.fullscreenElement) {
            videoPlayer.requestFullscreen().catch(err => {
                console.error('Error entering fullscreen:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new GTA6VideosManager();
});

