/**
 * Megastructures System
 * Q4 2025 Feature: Transcendence
 * 
 * Manages the construction and effects of massive stellar engineering projects.
 */
class MegastructuresSystem {
    constructor() {
        this.structures = new Map(); // planetName -> structureData
        this.types = {
            'dyson_swarm': { name: 'Dyson Swarm', cost: 50000, description: 'Massive energy generation around a star.', bonus: 'Energy +500/tick' },
            'orbital_ring': { name: 'Orbital Ring', cost: 25000, description: 'Enhanced trade and defense platform.', bonus: 'Trade Income +50%' },
            'stellar_engine': { name: 'Stellar Engine', cost: 100000, description: 'Move the entire system (endgame).', bonus: 'Mobility +10' }
        };
        this.init();
    }

    init() {
        if (typeof window !== 'undefined') {
            console.log('🏗️ Megastructures System Online');
        }
    }

    getStructure(planetName) {
        return this.structures.get(planetName);
    }

    canAfford(type) {
        if (!window.economySystem) return false;
        const cost = this.types[type].cost;
        return window.economySystem.playerResources.credits >= cost;
    }

    startConstruction(planetName, type) {
        if (this.structures.has(planetName)) {
            this.notify(`A megastructure already exists at ${planetName}.`, 'warning');
            return;
        }

        if (!this.canAfford(type)) {
            this.notify(`Insufficient funds. Need ${this.types[type].cost} Cr.`, 'error');
            return;
        }

        // Deduct resources
        if (window.economySystem) {
            window.economySystem.playerResources.credits -= this.types[type].cost;
        }

        const structure = {
            planet: planetName,
            type: type,
            name: this.types[type].name,
            progress: 0,
            state: 'building'
        };

        this.structures.set(planetName, structure);
        this.notify(`Construction of ${structure.name} started at ${planetName}!`, 'success');
        this.showUI(planetName);
    }

    update(deltaTime) {
        // Construction progress loop
        this.structures.forEach(struct => {
            if (struct.state === 'building') {
                struct.progress += 0.1; // Slow build
                if (struct.progress >= 100) {
                    struct.progress = 100;
                    struct.state = 'active';
                    this.notify(`${struct.name} at ${struct.planet} completed!`, 'success');
                    // Apply bonuses logic here (hook into economy)
                }
            }
        });
    }

    notify(msg, type) {
        console.log(`[Megastructures] ${msg}`);
        if (window.showNotification) {
            window.showNotification(msg, type);
        } else {
            alert(msg);
        }
    }

    showUI(planetName) {
        const modalId = 'megastructure-modal';
        let modal = document.getElementById(modalId);

        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 10004; display: flex; justify-content: center; align-items: center;';
            document.body.appendChild(modal);
        }

        const existing = this.structures.get(planetName);

        let content = '';
        if (existing) {
            content = `
                <div style="text-align: center;">
                    <h3 style="color: #fbbf24; margin: 0 0 1rem 0;">${existing.name}</h3>
                    <div style="margin-bottom: 0.5rem;">Status: <strong style="color: ${existing.state === 'active' ? '#10b981' : '#f59e0b'}">${existing.state.toUpperCase()}</strong></div>
                    <div style="margin-bottom: 1rem;">Progress: ${existing.progress.toFixed(1)}%</div>
                    <div style="width: 100%; background: #333; height: 10px; border-radius: 5px;">
                        <div style="width: ${existing.progress}%; background: #fbbf24; height: 100%; border-radius: 5px;"></div>
                    </div>
                </div>
            `;
        } else {
            content = `
                <div style="display: grid; gap: 1rem;">
                    ${Object.entries(this.types).map(([key, data]) => `
                        <button onclick="window.megastructuresSystem.startConstruction('${planetName}', '${key}')" 
                            style="background: rgba(251, 191, 36, 0.1); border: 1px solid #fbbf24; color: #fbbf24; padding: 1rem; border-radius: 8px; cursor: pointer; text-align: left;">
                            <div style="font-weight: bold; font-size: 1.1rem;">${data.name}</div>
                            <div style="font-size: 0.9rem; opacity: 0.8;">${data.description}</div>
                            <div style="margin-top: 0.5rem; color: #fff;">Cost: ${data.cost.toLocaleString()} Cr</div>
                        </button>
                    `).join('')}
                </div>
            `;
        }

        modal.innerHTML = `
            <div style="background: rgba(20, 20, 20, 0.95); border: 2px solid #fbbf24; padding: 2rem; border-radius: 12px; width: 600px; color: #eee; font-family: 'Raleway', sans-serif;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                    <h2 style="color: #fbbf24; margin: 0;">🏗️ Stellar Engineering: ${planetName}</h2>
                    <button onclick="document.getElementById('${modalId}').remove()" style="background: transparent; border: none; color: #888; font-size: 1.5rem; cursor: pointer;">×</button>
                </div>
                ${content}
            </div>
        `;
    }
}

// Export
if (typeof window !== 'undefined') {
    window.MegastructuresSystem = MegastructuresSystem;
}
