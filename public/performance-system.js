/**
 * Performance System
 * LOD (Level of Detail), optimization, and mobile support
 */

class PerformanceManager {
    constructor(game) {
        this.game = game;
        this.isMobile = this.detectMobile();
        this.quality = 'high'; // 'low', 'medium', 'high'
        this.fps = 60;
        this.fpsHistory = [];
        this.lodDistances = { high: 100, medium: 200, low: 400 };
    }

    init() {
        this.detectQuality();
        this.setupMobileControls();
        this.setupFPSMonitor();
        console.log(`Performance: ${this.quality} quality, Mobile: ${this.isMobile}`);
    }

    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
            (window.innerWidth <= 768);
    }

    detectQuality() {
        // Auto-detect based on device
        if (this.isMobile) {
            this.quality = 'low';
        } else {
            // Check GPU via canvas
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl');
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                    if (renderer.includes('Intel')) {
                        this.quality = 'medium';
                    }
                }
            }
        }
        this.applyQualitySettings();
    }

    applyQualitySettings() {
        const renderer = this.game.renderer;
        if (!renderer) return;

        if (this.quality === 'low') {
            renderer.setPixelRatio(1);
            renderer.shadowMap.enabled = false;
        } else if (this.quality === 'medium') {
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.BasicShadowMap;
        } else {
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        }
    }

    setQuality(level) {
        this.quality = level;
        this.applyQualitySettings();
        this.game.notify(`Quality set to ${level}`, 'info');
    }

    // --- LOD System ---

    updateLOD() {
        if (!this.game.camera) return;

        const camPos = this.game.camera.position;

        // Update satellite LOD
        if (this.game.orbit?.satellites) {
            this.game.orbit.satellites.forEach(sat => {
                const dist = sat.mesh.position.distanceTo(camPos);
                if (dist > this.lodDistances.low) {
                    sat.mesh.visible = false;
                } else {
                    sat.mesh.visible = this.game.orbit.active;
                }
            });
        }

        // Update building LOD
        if (this.game.structures) {
            this.game.structures.forEach(s => {
                if (!s.mesh) return;
                const dist = s.mesh.position.distanceTo(camPos);
                if (dist > this.lodDistances.medium) {
                    s.mesh.visible = false;
                } else {
                    s.mesh.visible = true;
                }
            });
        }

        // Update drone LOD
        if (this.game.drones?.drones) {
            this.game.drones.drones.forEach(d => {
                const dist = d.mesh.position.distanceTo(camPos);
                if (dist > this.lodDistances.high) {
                    d.mesh.visible = false;
                } else {
                    d.mesh.visible = true;
                }
            });
        }
    }

    // --- Mobile Touch Controls ---

    setupMobileControls() {
        if (!this.isMobile) return;

        // Create touch UI
        const touchUI = document.createElement('div');
        touchUI.id = 'ep-touch-controls';
        touchUI.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);display:flex;gap:15px;z-index:1000;';
        touchUI.innerHTML = `
            <button class="ep-touch-btn" onclick="window.game.controls.rotateLeft()" style="width:50px;height:50px;font-size:1.5em;background:#1e293b;border:1px solid #38bdf8;border-radius:50%;color:#38bdf8;">◀</button>
            <button class="ep-touch-btn" onclick="window.game.controls.zoomIn()" style="width:50px;height:50px;font-size:1.5em;background:#1e293b;border:1px solid #38bdf8;border-radius:50%;color:#38bdf8;">+</button>
            <button class="ep-touch-btn" onclick="window.game.controls.zoomOut()" style="width:50px;height:50px;font-size:1.5em;background:#1e293b;border:1px solid #38bdf8;border-radius:50%;color:#38bdf8;">−</button>
            <button class="ep-touch-btn" onclick="window.game.controls.rotateRight()" style="width:50px;height:50px;font-size:1.5em;background:#1e293b;border:1px solid #38bdf8;border-radius:50%;color:#38bdf8;">▶</button>
        `;
        document.body.appendChild(touchUI);

        // Pinch to zoom
        let initialPinchDistance = 0;
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                initialPinchDistance = this.getPinchDistance(e.touches);
            }
        });

        document.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && this.game.controls) {
                const currentDistance = this.getPinchDistance(e.touches);
                const delta = currentDistance - initialPinchDistance;
                if (delta > 10) {
                    this.game.controls.dollyOut(1.1);
                    initialPinchDistance = currentDistance;
                } else if (delta < -10) {
                    this.game.controls.dollyIn(1.1);
                    initialPinchDistance = currentDistance;
                }
            }
        });
    }

    getPinchDistance(touches) {
        return Math.hypot(
            touches[0].pageX - touches[1].pageX,
            touches[0].pageY - touches[1].pageY
        );
    }

    // --- FPS Monitor ---

    setupFPSMonitor() {
        this.lastTime = performance.now();
        this.frameCount = 0;
    }

    updateFPS() {
        this.frameCount++;
        const now = performance.now();
        if (now - this.lastTime >= 1000) {
            this.fps = this.frameCount;
            this.fpsHistory.push(this.fps);
            if (this.fpsHistory.length > 60) this.fpsHistory.shift();

            // Auto-adjust quality if FPS drops
            if (this.fps < 20 && this.quality !== 'low') {
                this.setQuality('low');
            } else if (this.fps < 40 && this.quality === 'high') {
                this.setQuality('medium');
            }

            this.frameCount = 0;
            this.lastTime = now;
        }
    }

    getAverageFPS() {
        if (this.fpsHistory.length === 0) return 60;
        return Math.round(this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length);
    }

    // --- Settings UI ---

    openSettingsUI() {
        let modal = document.getElementById('ep-settings-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'ep-settings-modal';
            modal.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#0f172a;border:2px solid #38bdf8;border-radius:15px;padding:30px;z-index:1000;min-width:350px;';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <h2 style="color:#38bdf8;margin:0 0 20px 0;">⚙️ Settings</h2>
            
            <div style="margin:15px 0;">
                <label style="color:#94a3b8;">Graphics Quality</label>
                <div style="display:flex;gap:10px;margin-top:8px;">
                    ${['low', 'medium', 'high'].map(q => `
                        <button onclick="window.game.performance.setQuality('${q}')" 
                            style="flex:1;padding:10px;background:${this.quality === q ? '#38bdf8' : '#1e293b'};
                            color:${this.quality === q ? '#0f172a' : '#fff'};border:1px solid #38bdf8;
                            border-radius:5px;cursor:pointer;text-transform:capitalize;">${q}</button>
                    `).join('')}
                </div>
            </div>

            <div style="margin:15px 0;">
                <label style="color:#94a3b8;">Performance</label>
                <p style="color:#64748b;font-size:0.9em;">FPS: ${this.fps} (avg: ${this.getAverageFPS()})</p>
                <p style="color:#64748b;font-size:0.9em;">Device: ${this.isMobile ? 'Mobile' : 'Desktop'}</p>
            </div>

            <div style="margin:15px 0;">
                <label style="color:#94a3b8;">Audio</label>
                <div style="display:flex;align-items:center;gap:10px;margin-top:8px;">
                    <input type="range" id="volume-slider" min="0" max="100" value="${(this.game.audio?.masterGain?.gain?.value || 0.3) * 100}" 
                        style="flex:1;" onchange="window.game.performance.setVolume(this.value)">
                    <span style="color:#64748b;">${Math.round((this.game.audio?.masterGain?.gain?.value || 0.3) * 100)}%</span>
                </div>
            </div>

            <button onclick="document.getElementById('ep-settings-modal').remove()" 
                style="width:100%;margin-top:20px;padding:12px;background:#334155;color:#fff;border:none;border-radius:5px;cursor:pointer;">Close</button>
        `;
    }

    setVolume(percent) {
        if (this.game.audio?.masterGain) {
            this.game.audio.masterGain.gain.value = percent / 100;
        }
    }

    // --- Accessibility ---

    enableHighContrast() {
        document.body.style.filter = 'contrast(1.2)';
        this.game.notify("High contrast mode enabled", "info");
    }

    enableLargeText() {
        document.body.style.fontSize = '120%';
        this.game.notify("Large text mode enabled", "info");
    }

    enableReducedMotion() {
        // Disable animations
        document.querySelectorAll('.ep-notification, .ep-build-btn').forEach(el => {
            el.style.transition = 'none';
        });
        this.game.notify("Reduced motion enabled", "info");
    }
}

window.PerformanceManager = PerformanceManager;
