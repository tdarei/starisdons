/**
 * LiveKit Voice Manager
 * Handles real-time voice communication with the AI Agent.
 */

class LiveKitVoiceManager {
    constructor() {
        this.room = null;
        this.isConnected = false;
        this.isMuted = false;
        this.tokenEndpoint = 'https://adriano-backend-lzsrcfva-uc.a.run.app/api/livekit/token';
        // Note: The URL above is a guess/placeholder. The actual URL will come from the gcloud deploy output.
        // We will update it dynamically or user can set it.
    }

    async connect() {
        if (this.isConnected) return;

        try {
            console.log('🔌 Connecting to LiveKit...');

            // 1. Get Token
            const roomName = 'game-session-' + Math.random().toString(36).substring(7);
            const participantName = 'Player-' + Math.random().toString(36).substring(7);

            // We need to know the backend URL. 
            // For now, we'll try to detect or use a relative path if served from same origin, 
            // but since backend is on Cloud Run and frontend is likely GitLab Pages/Local, we need absolute.
            // Let's assume the user will likely be running this locally for now against the deployed backend.

            // We will fetch from the backend we just deployed. 
            // I'll leave the URL configurable or discoverable.
            let backendUrl = 'https://adriano-backend-lzsrcfva-uc.a.run.app';
            // For prototyping, we might need to ask the user for the URL if we can't capture it.
            // But let's assume a standard Cloud Run URL format or that we can get it from the deploy output.

            let apiToken = null;
            try {
                apiToken = window.STELLAR_AI_API_TOKEN || window.API_TOKEN || null;
            } catch (_e) {
                apiToken = null;
            }
            if (!apiToken) {
                try {
                    apiToken = localStorage.getItem('stellarAiApiToken') || localStorage.getItem('puterAuthToken') || null;
                } catch (_e) {
                    apiToken = null;
                }
            }

            const headers = { 'Content-Type': 'application/json' };
            if (apiToken) {
                headers['Authorization'] = `Bearer ${String(apiToken).trim()}`;
            }

            const response = await fetch(`${backendUrl}/api/livekit/token`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    roomName,
                    participantName,
                    // These should be set in backend ENV, but we can pass empty to use backend's env
                })
            });

            if (!response.ok) throw new Error('Failed to fetch token');
            const data = await response.json();

            // 2. Connect to Room
            const { Room, RoomEvent } = LiveKitClient;

            this.room = new Room();

            this.room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
                this.attachTrack(track, participant);
            });

            this.room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
                this.detachTrack(track, participant);
            });

            await this.room.connect(data.url, data.token);
            console.log('✅ Connected to LiveKit Room:', roomName);
            this.isConnected = true;

            // 3. Publish Microphone
            await this.room.localParticipant.enableCameraAndMicrophone(false, true);
            console.log('🎤 Microphone enabled');

            this.updateUI(true);

        } catch (e) {
            console.error('LiveKit Connection Failed:', e);
            alert('Voice Connection Failed: ' + e.message);
        }
    }

    disconnect() {
        if (!this.room) return;
        this.room.disconnect();
        this.room = null;
        this.isConnected = false;
        this.updateUI(false);
        console.log('🛑 Disconnected from LiveKit');
    }

    toggleMute() {
        if (!this.room) return;
        this.isMuted = !this.isMuted;
        this.room.localParticipant.setMicrophoneEnabled(!this.isMuted);
    }

    attachTrack(track, participant) {
        if (track.kind === 'audio') {
            const element = track.attach();
            document.body.appendChild(element);
        }
    }

    detachTrack(track, participant) {
        track.detach().forEach(element => element.remove());
    }

    updateUI(connected) {
        const btn = document.getElementById('comms-btn');
        if (btn) {
            btn.textContent = connected ? '🔴 Terminate Link' : '📡 Open Comms';
            btn.style.borderColor = connected ? '#f44336' : '#4caf50';
            btn.style.color = connected ? '#f44336' : '#4caf50';
        }
    }
}

// Global Injector
if (typeof window !== 'undefined') {
    // We expect LiveKitClient to be available via CDN script in HTML
    window.LiveKitVoiceManager = LiveKitVoiceManager;
    window.liveKitVoiceManager = new LiveKitVoiceManager();
}
