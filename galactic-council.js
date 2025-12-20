/**
 * Galactic Council System
 * Q4 2025 Feature: Transcendence
 * 
 * Manages the Galactic Community, resolutions, and voting sessions.
 */
class GalacticCouncilSystem {
    constructor() {
        this.factions = ['United Sol Federation', 'Alpha Centauri Combine', 'Sirius Syndicate', 'Proxima Republic'];
        this.resolutions = [
            { id: 'sanctions', name: 'Economic Sanctions', desc: 'Reduce trade value by 20%.', support: 0 },
            { id: 'science', name: 'Scientific Cooperation', desc: 'Research speed +20%.', support: 0 },
            { id: 'military', name: 'Pan-Galactic Defense', desc: 'Ship maintenance -10%.', support: 0 },
            { id: 'peace', name: 'Galactic Peace Accord', desc: 'War declaration cost +100%.', support: 0 }
        ];
        this.activeSession = false;
        this.currentResolution = null;
        this.votes = { yes: 0, no: 0 };
        this.timer = null;
        this.init();
    }

    init() {
        if (typeof window !== 'undefined') {
            console.log('🏛️ Galactic Council Online');
            // Schedule first session
            setTimeout(() => this.startSession(), 10000); // 10s for demo
        }
    }

    startSession() {
        if (this.activeSession) return;

        this.currentResolution = this.resolutions[Math.floor(Math.random() * this.resolutions.length)];
        this.activeSession = true;
        this.votes = { yes: 0, no: 0 };
        this.notify(`Galactic Council Session Started: Voting on "${this.currentResolution.name}"`, 'info');

        // Allow player voting
        this.showUI();

        // Simulate faction votes after delay
        this.timer = setTimeout(() => {
            this.resolveSession();
        }, 15000); // 15s to vote
    }

    vote(choice) {
        if (!this.activeSession) return;

        // Player vote weight = 100 + influence (mock)
        const weight = 100;

        if (choice === 'yes') this.votes.yes += weight;
        else this.votes.no += weight;

        this.notify(`You voted ${choice.toUpperCase()}.`, 'success');
        this.updateUI();
    }

    resolveSession() {
        this.activeSession = false;

        // Random AI votes
        this.factions.forEach(f => {
            // Check relations via DiplomacySystem
            let rel = 0;
            if (window.diplomacySystem) rel = window.diplomacySystem.getRelation(f);

            // Random + bias
            const vote = (Math.random() * 100 + rel) > 50 ? 'yes' : 'no';
            if (vote === 'yes') this.votes.yes += 100;
            else this.votes.no += 100;
        });

        const passed = this.votes.yes > this.votes.no;
        const result = passed ? 'PASSED' : 'FAILED';
        const color = passed ? 'success' : 'warning';

        this.notify(`Resolution "${this.currentResolution.name}" ${result}. (Yes: ${this.votes.yes} vs No: ${this.votes.no})`, color);

        if (passed) {
            // Apply modifiers
            this.applyResolution(this.currentResolution);
        }

        // Cleanup UI
        const ui = document.getElementById('council-modal');
        if (ui) ui.remove();

        // Schedule next
        setTimeout(() => this.startSession(), 30000);
    }

    applyResolution(res) {
        // Hook into economy/combat
    }

    notify(msg, type) {
        console.log(`[Council] ${msg}`);
        if (window.showNotification) {
            window.showNotification(msg, type);
        } else {
            alert(msg);
        }
    }

    updateUI() {
        const ui = document.getElementById('council-modal');
        if (ui) this.showUI(); // Refresh
    }

    showUI() {
        const modalId = 'council-modal';
        let modal = document.getElementById(modalId);

        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 10006; display: flex; justify-content: center; align-items: center;';
            document.body.appendChild(modal);
        }

        let content = '';
        if (this.activeSession && this.currentResolution) {
            content = `
                <div style="text-align: center;">
                    <div style="font-size: 1.2rem; margin-bottom: 0.5rem; color: #888;">Session in Progress</div>
                    <h2 style="color: #60a5fa; margin: 0 0 1rem 0;">${this.currentResolution.name}</h2>
                    <p style="color: #ccc; font-style: italic; margin-bottom: 2rem;">"${this.currentResolution.desc}"</p>
                    
                    <div style="display: flex; gap: 2rem; justify-content: center;">
                        <button onclick="window.galacticCouncilSystem.vote('yes')" style="background: rgba(16, 185, 129, 0.2); border: 2px solid #10b981; color: #10b981; padding: 1rem 3rem; border-radius: 8px; font-size: 1.2rem; cursor: pointer;">VOTE YES</button>
                        <button onclick="window.galacticCouncilSystem.vote('no')" style="background: rgba(239, 68, 68, 0.2); border: 2px solid #ef4444; color: #ef4444; padding: 1rem 3rem; border-radius: 8px; font-size: 1.2rem; cursor: pointer;">VOTE NO</button>
                    </div>

                    <div style="margin-top: 2rem;">
                        <div>Current Tally (Projection)</div>
                        <div style="display: flex; justify-content: center; gap: 2rem; font-weight: bold; font-size: 1.1rem; margin-top: 0.5rem;">
                            <span style="color: #10b981">YES: ${this.votes.yes}</span>
                            <span style="color: #ef4444">NO: ${this.votes.no}</span>
                        </div>
                    </div>
                </div>
             `;
        } else {
            content = `
                <div style="text-align: center; color: #888;">
                    <h2>Council is currently in recess.</h2>
                    <p>Next session scheduled soon...</p>
                </div>
            `;
        }

        modal.innerHTML = `
            <div style="background: rgba(15, 23, 42, 0.95); border: 2px solid #60a5fa; padding: 3rem; border-radius: 12px; width: 600px; color: #eee; font-family: 'Raleway', sans-serif;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h2 style="color: #60a5fa; margin: 0;">🏛️ Galactic Council</h2>
                    <button onclick="document.getElementById('${modalId}').remove()" style="background: transparent; border: none; color: #888; font-size: 1.5rem; cursor: pointer;">×</button>
                </div>
                ${content}
            </div>
        `;
    }
}

// Export
if (typeof window !== 'undefined') {
    window.GalacticCouncilSystem = GalacticCouncilSystem;
}
