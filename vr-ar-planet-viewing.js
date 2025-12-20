/**
 * VR/AR Planet Viewing using WebXR API
 * Enables virtual and augmented reality planet exploration
 */

class VRARPlanetViewing {
    constructor() {
        this.xrSession = null;
        this.xrSpace = null;
        this.isSupported = false;
        this.currentPlanet = null;
        this.isInitialized = false;
        
        this.init();
    }

    async init() {
        // Check for WebXR support
        if (navigator.xr) {
            this.isSupported = await navigator.xr.isSessionSupported('immersive-vr');
            console.log('VR Support:', this.isSupported);
        }

    trackEvent(eventName, data = {}) {
        try {
            if (typeof window !== 'undefined' && window.performanceMonitoring) {
                window.performanceMonitoring.recordMetric("v_ra_rp_la_ne_tv_ie_wi_ng_" + eventName, 1, data);
            }
        } catch (e) { /* Silent fail */ }
    }


        // Check for AR support
        if (navigator.xr) {
            const arSupported = await navigator.xr.isSessionSupported('immersive-ar');
            console.log('AR Support:', arSupported);
        }

        this.isInitialized = true;
        console.log('🥽 VR/AR Planet Viewing System initialized');
    }

    /**
     * Check if VR is supported
     */
    async checkVRSupport() {
        if (!navigator.xr) {
            return { supported: false, reason: 'WebXR not available' };
        }

        try {
            const vrSupported = await navigator.xr.isSessionSupported('immersive-vr');
            return { supported: vrSupported, reason: vrSupported ? 'VR supported' : 'VR not supported' };
        } catch (error) {
            return { supported: false, reason: error.message };
        }
    }

    /**
     * Check if AR is supported
     */
    async checkARSupport() {
        if (!navigator.xr) {
            return { supported: false, reason: 'WebXR not available' };
        }

        try {
            const arSupported = await navigator.xr.isSessionSupported('immersive-ar');
            return { supported: arSupported, reason: arSupported ? 'AR supported' : 'AR not supported' };
        } catch (error) {
            return { supported: false, reason: error.message };
        }
    }

    /**
     * Start VR session
     */
    async startVRSession(canvas, planetData) {
        if (!navigator.xr) {
            alert('WebXR is not supported in this browser');
            return false;
        }

        try {
            const vrSupported = await navigator.xr.isSessionSupported('immersive-vr');
            if (!vrSupported) {
                alert('VR is not supported on this device');
                return false;
            }

            this.currentPlanet = planetData;

            // Request VR session
            this.xrSession = await navigator.xr.requestSession('immersive-vr', {
                requiredFeatures: ['local-floor'],
                optionalFeatures: ['bounded-floor', 'hand-tracking']
            });

            // Get WebGL context
            const gl = canvas.getContext('webgl', { xrCompatible: true });
            if (!gl) {
                alert('WebGL context not available');
                return false;
            }

            // Set up XR
            this.xrSpace = await this.xrSession.requestReferenceSpace('local-floor');
            gl.makeXRCompatible().then(() => {
                this.xrSession.updateRenderState({
                    baseLayer: new XRWebGLLayer(this.xrSession, gl)
                });

                // Start render loop
                this.xrSession.requestAnimationFrame(this.onXRFrame.bind(this));
            });

            // Handle session end
            this.xrSession.addEventListener('end', () => {
                this.xrSession = null;
                this.xrSpace = null;
            });

            return true;
        } catch (error) {
            console.error('Error starting VR session:', error);
            alert('Failed to start VR session: ' + error.message);
            return false;
        }
    }

    /**
     * Start AR session
     */
    async startARSession(canvas, planetData) {
        if (!navigator.xr) {
            alert('WebXR is not supported in this browser');
            return false;
        }

        try {
            const arSupported = await navigator.xr.isSessionSupported('immersive-ar');
            if (!arSupported) {
                alert('AR is not supported on this device');
                return false;
            }

            this.currentPlanet = planetData;

            // Request AR session
            this.xrSession = await navigator.xr.requestSession('immersive-ar', {
                requiredFeatures: ['local'],
                optionalFeatures: ['hit-test', 'anchors']
            });

            // Get WebGL context
            const gl = canvas.getContext('webgl', { xrCompatible: true });
            if (!gl) {
                alert('WebGL context not available');
                return false;
            }

            // Set up XR
            this.xrSpace = await this.xrSession.requestReferenceSpace('local');
            gl.makeXRCompatible().then(() => {
                this.xrSession.updateRenderState({
                    baseLayer: new XRWebGLLayer(this.xrSession, gl)
                });

                // Start render loop
                this.xrSession.requestAnimationFrame(this.onXRFrame.bind(this));
            });

            // Handle session end
            this.xrSession.addEventListener('end', () => {
                this.xrSession = null;
                this.xrSpace = null;
            });

            return true;
        } catch (error) {
            console.error('Error starting AR session:', error);
            alert('Failed to start AR session: ' + error.message);
            return false;
        }
    }

    /**
     * XR frame render loop
     */
    onXRFrame(time, frame) {
        if (!this.xrSession || !this.xrSpace) return;

        const session = frame.session;
        const pose = frame.getViewerPose(this.xrSpace);

        if (pose) {
            // Render planet in XR space
            this.renderPlanetInXR(pose, frame);
        }

        // Continue animation loop
        this.xrSession.requestAnimationFrame(this.onXRFrame.bind(this));
    }

    /**
     * Render planet in XR
     */
    renderPlanetInXR(pose, frame) {
        if (!this.currentPlanet || !frame) return;

        const gl = frame.session.renderState.baseLayer.context;
        const views = frame.getViewerPose(this.xrSpace)?.views;
        
        if (!views) return;

        // Clear canvas
        gl.clearColor(0.0, 0.0, 0.1, 1.0);
        gl.clearDepth(1.0);
        gl.enable(gl.DEPTH_TEST);

        // Render for each eye
        for (const view of views) {
            const viewport = frame.session.renderState.baseLayer.getViewport(view);
            gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);

            // Set up projection matrix based on view
            // In a full implementation, you would:
            // 1. Create WebGL program with vertex/fragment shaders
            // 2. Set up projection and view matrices from view.projectionMatrix and view.transform
            // 3. Render planet sphere at position (0, 0, -2) meters in front of user
            // 4. Apply planet texture based on currentPlanet data
            // 5. Add lighting and rotation

            // Simplified rendering - would need full WebGL setup
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            
            // Placeholder: In full implementation, render 3D planet sphere here
            // using view.projectionMatrix and view.transform for proper positioning
        }
    }

    /**
     * End XR session
     */
    endSession() {
        if (this.xrSession) {
            this.xrSession.end();
            this.xrSession = null;
            this.xrSpace = null;
        }
    }

    /**
     * Get session info
     */
    getSessionInfo() {
        if (!this.xrSession) return null;

        return {
            mode: this.xrSession.mode,
            inputSources: this.xrSession.inputSources,
            environmentBlendMode: this.xrSession.environmentBlendMode
        };
    }
}

if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        if (!window.vrARPlanetViewing) {
            window.vrARPlanetViewing = new VRARPlanetViewing();
        }
    });
}


