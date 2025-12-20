/**
 * Victory System
 * Manages game winning conditions and the victory screen.
 */

class VictoryManager {
    constructor(game) {
        this.game = game;
        this.hasWon = false;
    }

    init() {
        console.log("Victory Manager Initialized");
    }

    checkVictory() {
        if (this.hasWon) return;

        // Domination Victory: Check if Boss is dead (Boss ID 'alien_dreadnought_01')
        // This will be triggered by CombatManager when the specific ship dies
    }

    triggerVictory(type) {
        if (this.hasWon) return;
        this.hasWon = true;
        this.game.isPaused = true;
        this.showVictoryScreen(type);

        // Log it
        if (this.game.log) this.game.log.addEntry(`VICTORY ACHIEVED: ${type} Victory!`, 'success');

        // Play sound
        if (this.game.audio && this.game.audio.playVictory) this.game.audio.playVictory();
    }

    showVictoryScreen(type) {
        let title, message, icon;

        if (type === 'Science') {
            title = "TRANSCENDENCE ACHIEVED";
            message = "The Ascension Gate hums with energy not of this universe. Your colony has left the physical realm behind, embarking on a journey to the very center of creation.";
            icon = "🌌";
        } else if (type === 'Domination') {
            title = "GALACTIC DOMINION";
            message = "The Dreadnought burns, its wreckage a testament to your might. The sector is safe, and your fleet stands undisputed masters of the stars.";
            icon = "⚔️";
        } else {
            title = "VICTORY";
            message = "You have conquered the challenges of Kepler-186f.";
            icon = "🏆";
        }

        const modal = document.createElement('div');
        modal.className = 'ep-modal-overlay';
        modal.style.zIndex = '9999';
        modal.innerHTML = `
            <div class="ep-modal" style="width:600px; text-align:center; border:2px solid #facc15; box-shadow:0 0 50px #facc15;">
                <div style="font-size:4rem; margin-bottom:10px;">${icon}</div>
                <h1 style="color:#facc15; font-family:'Orbitron'; margin:0 0 20px 0;">${title}</h1>
                <p style="color:#e2e8f0; font-size:1.2em; line-height:1.6;">${message}</p>
                
                <div style="margin:20px 0; padding:10px; background:#1e293b; border-radius:8px;">
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:0.9em; color:#94a3b8;">
                        <div>Colony Age: Day ${this.game.day}</div>
                        <div>Population: ${this.game.colonists.length}</div>
                        <div>Fleets Built: ${this.game.fleetManager ? this.game.fleetManager.game.ships.length : 0}</div>
                        <div>Tech Level: ${this.game.technologies ? Object.values(this.game.technologies).filter(t => t.researched).length : 0}</div>
                    </div>
                </div>

                <div style="display:flex; justify-content:center; gap:20px;">
                    <button class="ep-sys-btn" id="ep-btn-continue" style="font-size:1.1em; padding:10px 20px;">Continue Playing (Sandbox)</button>
                    <button class="ep-sys-btn" onclick="location.reload()" style="font-size:1.1em; padding:10px 20px; border-color:#f87171; color:#f87171;">New Game</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('ep-btn-continue').onclick = () => {
            modal.style.display = 'none';
            this.game.isPaused = false;
            this.game.notify("Game Resumed in Sandbox Mode.", "info");
        };
    }
}

window.VictoryManager = VictoryManager;
