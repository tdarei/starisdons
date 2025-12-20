class TerraformingManager {
    constructor(game) {
        this.game = game;

        // Planet Stats (0-100 Scale)
        this.stats = {
            temperature: 20, // Too cold (-50C to 50C mapped)
            atmosphere: 10,  // Thin
            water: 5,        // Dry
            biomass: 0       // Barren
        };

        // Target ideal stats for Earth-like
        this.ideals = {
            temperature: 50, // ~15C
            atmosphere: 50,  // 1 ATM
            water: 60,       // 60% Coverage
            biomass: 80      // Thriving
        };

        this.rate = {
            temperature: 0,
            atmosphere: 0,
            water: 0,
            biomass: 0
        };

        this.currentWeather = null;
        this.weatherTimer = 60; // Start with 60s safe time
        this.habitability = 0;
    }

    init() {
        console.log("Terraforming System Initiated");
        this.createOverlay();
    }

    update(delta) {
        // 1. Recalculate Rates based on buildings
        this.recalculateRates();

        // 2. Weather Events (Random)
        this.handleWeather(delta);

        // 3. Apply Rates
        for (let key in this.stats) {
            let change = this.rate[key] * delta;

            // Weather modifiers
            if (this.currentWeather === 'sandstorm' && key === 'temperature') change -= 0.5 * delta;
            if (this.currentWeather === 'solar_flare' && key === 'temperature') change += 1.0 * delta;

            this.stats[key] += change;
            this.stats[key] = Math.max(0, Math.min(100, this.stats[key]));
        }

        this.calculateHabitability();
        this.updateVisuals();
        this.updateUI();
    }

    handleWeather(delta) {
        if (this.currentWeather) {
            this.weatherTimer -= delta;
            if (this.weatherTimer <= 0) {
                this.notifyWeatherEnd(this.currentWeather);
                this.currentWeather = null;
                this.weatherTimer = Math.random() * 60 + 60; // Cooldown 1-2 min
            }
        } else {
            this.weatherTimer -= delta;
            if (this.weatherTimer <= 0) {
                const rand = Math.random();
                if (rand < 0.3) this.triggerWeather('sandstorm', 20); // 20s duration
                else if (rand < 0.5) this.triggerWeather('solar_flare', 10);
                else if (rand < 0.7 && this.stats.atmosphere > 30) this.triggerWeather('acid_rain', 15);
                else this.weatherTimer = 30; // Retry later
            }
        }
    }

    triggerWeather(type, duration) {
        this.currentWeather = type;
        this.weatherTimer = duration;
        console.log(`Weather Event: ${type} started.`);

        let msg = "";
        if (type === 'sandstorm') msg = "⚠️ Sandstorm approaching! Solar efficiency dropping.";
        if (type === 'solar_flare') msg = "⚠️ Solar Flare detected! Temperature rising.";
        if (type === 'acid_rain') msg = "⚠️ Acid Rain! Structure corrosion Imminent.";

        this.game.notify(msg, "warning");

        // Apply immediate effects
        if (type === 'sandstorm') {
            if (this.game.modifiers) this.game.modifiers.solarOutput = 0.5;
            // Visuals: Fog
            if (this.game.scene.fog) this.game.scene.fog.density = 0.05;
        }
    }

    notifyWeatherEnd(type) {
        this.game.notify(`Weather Event: ${type} ended.`, "success");
        // Reset effects
        if (type === 'sandstorm') {
            if (this.game.modifiers) this.game.modifiers.solarOutput = 1.0; // Reset
            if (this.game.scene.fog) this.game.scene.fog.density = 0.005; // Default (assuming linear)
        }
    }

    recalculateRates() {
        // Reset rates
        this.rate = { temperature: 0, atmosphere: 0, water: 0, biomass: 0 };

        // Scan buildings
        if (!this.game.structures) return;

        for (let s of this.game.structures) {
            // Apply rates per building type
            if (s.type === 'oxy') {
                this.rate.atmosphere += 0.05;
            }
            if (s.type === 'farm') {
                this.rate.biomass += 0.05;
            }
            if (s.type === 'geothermal') {
                this.rate.temperature += 0.05;
            }
            if (s.type === 'mine') {
                this.rate.temperature += 0.01;
            }
        }
    }

    calculateHabitability() {
        // Ideal: Temp 50, Atmo 50, Water 60, Bio 80

        let score = 100;
        if (this.stats.temperature < 20 || this.stats.temperature > 80) score -= 30;
        if (this.stats.atmosphere < 20) score -= 50; // Critical
        if (this.stats.water < 10) score -= 10;
        if (this.stats.biomass < 10) score -= 10;

        this.habitability = Math.max(0, score);
    }

    modifyParameter(param, amount) {
        if (this.stats[param] !== undefined) {
            this.stats[param] += amount;
            this.updateUI();
        }
    }

    setRate(param, rate) {
        if (this.rate[param] !== undefined) {
            this.rate[param] = rate;
        }
    }

    updateVisuals() {
        if (!this.game.planetMesh || !this.game.planetMesh.material.uniforms) return;

        const uniforms = this.game.planetMesh.material.uniforms;

        // Biomass -> Grass Color
        const bio = this.stats.biomass / 100;
        const r = 0.6 * (1 - bio) + 0.1 * bio;
        const g = 0.5 * (1 - bio) + 0.6 * bio;
        const b = 0.3 * (1 - bio) + 0.1 * bio;

        if (uniforms.colorGrass) {
            uniforms.colorGrass.value.setRGB(r, g, b);
        }

        // Temperature -> Water Color
        const temp = this.stats.temperature / 100;
        if (uniforms.colorWater) {
            if (temp < 0.3) {
                uniforms.colorWater.value.setHex(0xdbeafe);
            } else {
                uniforms.colorWater.value.setHex(0x1e3a8a);
            }
        }

        // Atmosphere Opacity
        if (this.game.cloudMesh && this.game.cloudMesh.material) {
            const atmo = this.stats.atmosphere / 100;
            this.game.cloudMesh.material.opacity = Math.max(0.1, atmo);
        }
    }

    createOverlay() {
        const ui = document.createElement('div');
        ui.id = 'ep-terraforming-panel';
        ui.style.cssText = `
            position: absolute;
            top: 60px;
            right: 10px;
            width: 200px;
            background: rgba(15, 23, 42, 0.9);
            border: 1px solid #38bdf8;
            border-radius: 8px;
            padding: 10px;
            color: white;
            font-family: 'Segoe UI', sans-serif;
            display: none;
            pointer-events: auto;
        `;
        ui.innerHTML = `<h3>Planetary Status</h3><div id='ep-tf-content'></div>`;
        document.body.appendChild(ui);
        this.panel = ui;
    }

    updateUI() {
        const content = document.getElementById('ep-tf-content');
        if (!content) return;

        // Add arrows for rates
        const rateStr = (r) => r > 0 ? `<span style="color:#4ade80">▲</span>` : (r < 0 ? `<span style="color:#f87171">▼</span>` : '');

        // Determine Habitability Label
        let habLabel = "Uninhabitable 💀";
        let habColor = "#ef4444";
        if (this.habitability > 80) { habLabel = "Earth-Like 🌍"; habColor = "#4ade80"; }
        else if (this.habitability > 50) { habLabel = "Harsh ⚠️"; habColor = "#fbbf24"; }
        else if (this.habitability > 20) { habLabel = "Lethal ☢️"; habColor = "#f87171"; }

        content.innerHTML = `
            <div style="margin-bottom:10px; text-align:center; padding:5px; background:${habColor}22; border:1px solid ${habColor}; border-radius:4px;">
                <div style="font-size:0.8rem; color:${habColor}">Habitability</div>
                <div style="font-size:1.1rem; font-weight:bold; color:${habColor}">${Math.floor(this.habitability)}%</div>
                <div style="font-size:0.8rem;">${habLabel}</div>
            </div>

            <div style="margin-bottom:8px;">
                <label>🌡️ Temp: ${Math.floor(this.stats.temperature)}% ${rateStr(this.rate.temperature)}</label>
                <div style="width:100%; height:4px; background:#334155; border-radius:2px;">
                    <div style="width:${this.stats.temperature}%; height:100%; background:#f87171; border-radius:2px;"></div>
                </div>
            </div>
             <div style="margin-bottom:8px;">
                <label>🌬️ Atmo: ${Math.floor(this.stats.atmosphere)}% ${rateStr(this.rate.atmosphere)}</label>
                <div style="width:100%; height:4px; background:#334155; border-radius:2px;">
                    <div style="width:${this.stats.atmosphere}%; height:100%; background:#94a3b8; border-radius:2px;"></div>
                </div>
            </div>
             <div style="margin-bottom:8px;">
                <label>💧 Water: ${Math.floor(this.stats.water)}% ${rateStr(this.rate.water)}</label>
                <div style="width:100%; height:4px; background:#334155; border-radius:2px;">
                    <div style="width:${this.stats.water}%; height:100%; background:#38bdf8; border-radius:2px;"></div>
                </div>
            </div>
             <div style="margin-bottom:8px;">
                <label>🌿 Bio: ${Math.floor(this.stats.biomass)}% ${rateStr(this.rate.biomass)}</label>
                <div style="width:100%; height:4px; background:#334155; border-radius:2px;">
                    <div style="width:${this.stats.biomass}%; height:100%; background:#4ade80; border-radius:2px;"></div>
                </div>
            </div>
            
            ${this.currentWeather ? `<div style="margin-top:10px; background:#ef444444; padding:5px; border-radius:4px; font-size:0.8rem;">⚠️ ${this.currentWeather.toUpperCase()}</div>` : ''}
        `;
    }

    toggleUI() {
        if (this.panel.style.display === 'none') {
            this.panel.style.display = 'block';
            this.updateUI();
        } else {
            this.panel.style.display = 'none';
        }
    }
}
