/**
 * Ship Designer System
 * Allows players to design custom ships using modular parts.
 */

class ShipModule {
    constructor(id, name, type, stats, cost, desc) {
        this.id = id;
        this.name = name;
        this.type = type; // 'hull', 'engine', 'weapon', 'shield'
        this.stats = stats; // { hp, speed, damage, range, capacity }
        this.cost = cost; // { alloys, energy, circuits }
        this.desc = desc;
    }

    toString() {
        return this.name;
    }
}

class ShipDesign {
    constructor(name, hull, engine, weapons = [], shields = []) {
        this.id = 'design_' + Date.now().toString(36);
        this.name = name;
        this.hull = hull;
        this.engine = engine;
        this.weapons = weapons;
        this.shields = shields;
        this.modules = [this.hull, this.engine, ...this.weapons, ...this.shields].filter(m => m);
        this.stats = this.calculateStats();
        this.cost = this.calculateCost();
    }

    calculateStats() {
        const s = { hp: 0, speed: 0, damage: 0, range: 0, capacity: 0 };

        // Base Hull Stats
        if (this.hull) {
            s.hp += this.hull.stats.hp || 0;
            s.capacity += this.hull.stats.capacity || 0;
            s.speed += this.hull.stats.speed || 0; // Base maneuverability
        }

        // Engine
        if (this.engine) {
            s.speed += this.engine.stats.speed || 0;
        }

        // Weapons
        this.weapons.forEach(w => {
            s.damage += w.stats.damage || 0;
            s.range = Math.max(s.range, w.stats.range || 0);
        });

        // Shields
        this.shields.forEach(sh => {
            s.hp += sh.stats.hp || 0; // Shields add effectively to HP for now
        });

        return s;
    }

    calculateCost() {
        const c = { alloys: 0, energy: 0, circuits: 0 };
        const modules = [this.hull, this.engine, ...this.weapons, ...this.shields].filter(m => m);

        modules.forEach(m => {
            if (m.cost) {
                c.alloys += m.cost.alloys || 0;
                c.energy += m.cost.energy || 0;
                c.circuits += m.cost.circuits || 0;
            }
        });
        return c;
    }
}

class ShipDesigner {
    constructor(game) {
        this.game = game;
        this.modules = {};
        this.designs = [];
        this.unlockedModules = []; // IDs
    }

    init() {
        this.registerModules();
        this.unlockInitialModules();
        console.log("Ship Designer Initialized");
    }

    registerModules() {
        // --- HULLS ---
        this.addModule(new ShipModule('hull_interceptor', 'Interceptor Hull', 'hull', { hp: 75, speed: 15, capacity: 2 }, { alloys: 40, circuits: 10 }, 'Ultra-fast dominance fighter.'));
        this.addModule(new ShipModule('hull_corvette', 'Corvette Hull', 'hull', { hp: 120, speed: 10, capacity: 4 }, { alloys: 60 }, 'Balanced patrol craft.'));
        this.addModule(new ShipModule('hull_bomber', 'Bomber Hull', 'hull', { hp: 150, speed: 8, capacity: 6 }, { alloys: 100, energy: 20 }, 'Heavy payload delivery system.'));
        this.addModule(new ShipModule('hull_frigate', 'Frigate Hull', 'hull', { hp: 300, speed: 6, capacity: 8 }, { alloys: 200 }, 'Backbone of the fleet.'));
        this.addModule(new ShipModule('hull_destroyer', 'Destroyer Hull', 'hull', { hp: 600, speed: 4, capacity: 10 }, { alloys: 400, circuits: 50 }, 'Anti-ship weapons platform.'));
        this.addModule(new ShipModule('hull_cruiser', 'Cruiser Hull', 'hull', { hp: 1200, speed: 2, capacity: 14 }, { alloys: 800, circuits: 100 }, 'Long-range command vessel.'));
        this.addModule(new ShipModule('hull_carrier', 'Carrier Hull', 'hull', { hp: 2000, speed: 1.5, capacity: 30, hangarValue: 20 }, { alloys: 1500, circuits: 200 }, 'Fighter deployment platform.'));
        this.addModule(new ShipModule('hull_dreadnought', 'Dreadnought Hull', 'hull', { hp: 5000, speed: 0.8, capacity: 20, dpsMultiplier: 1.5 }, { alloys: 3000, circuits: 500 }, 'Flying fortress.'));
        this.addModule(new ShipModule('hull_titan', 'Titan Hull', 'hull', { hp: 15000, speed: 0.4, capacity: 40, canMountDoomsday: true }, { alloys: 10000, energy: 2000, circuits: 1000 }, 'The ultimate projection of power.'));

        // --- ENGINES ---
        this.addModule(new ShipModule('eng_ion', 'Ion Drive', 'engine', { speed: 20 }, { energy: 20, circuits: 10 }, 'Standard efficient propulsion.'));
        this.addModule(new ShipModule('eng_fusion', 'Fusion Drive', 'engine', { speed: 40 }, { energy: 50, circuits: 30 }, 'High-thrust combat drive.'));
        this.addModule(new ShipModule('eng_antimatter', 'Antimatter Drive', 'engine', { speed: 80 }, { energy: 200, circuits: 100 }, 'Experimental high-speed propulsion.'));
        this.addModule(new ShipModule('eng_slipspace', 'Slipspace Drive', 'engine', { speed: 120 }, { energy: 500, circuits: 200, unknown_material: 10 }, 'Instantaneous tactical relocation.'));

        // --- WEAPONS ---
        this.addModule(new ShipModule('wep_laser', 'Laser Cannon', 'weapon', { damage: 15, range: 60 }, { alloys: 10, energy: 10, circuits: 5 }, 'Rapid-fire directed energy.'));
        this.addModule(new ShipModule('wep_plasma', 'Plasma Repeater', 'weapon', { damage: 45, range: 40 }, { alloys: 30, energy: 30, circuits: 15 }, 'Superheated bolts, low accuracy.'));
        this.addModule(new ShipModule('wep_missile', 'Missile Battery', 'weapon', { damage: 80, range: 150 }, { alloys: 50, circuits: 30 }, 'Long-range guidance.'));
        this.addModule(new ShipModule('wep_railgun', 'Railgun Turret', 'weapon', { damage: 120, range: 90 }, { alloys: 120, energy: 60, circuits: 25 }, 'Heavy kinetic penetrator.'));
        this.addModule(new ShipModule('wep_torpedo', 'Proton Torpedo', 'weapon', { damage: 300, range: 200 }, { alloys: 200, energy: 100, circuits: 50 }, 'Capital ship killer. Slow reload.'));
        this.addModule(new ShipModule('wep_flak', 'Flak Cannon', 'weapon', { damage: 10, range: 30 }, { alloys: 40, circuits: 10 }, 'Area denial anti-fighter system.'));
        this.addModule(new ShipModule('wep_doomsday_judgment', 'Judgment Beam', 'weapon', { damage: 5000, range: 500, isDoomsday: true }, { energy: 1000, circuits: 500 }, 'Titan-only weapon. Erases anything in its path.'));

        // --- SHIELDS ---
        this.addModule(new ShipModule('mod_shield_basic', 'Deflector Shield', 'shield', { hp: 80 }, { energy: 40, circuits: 20 }, 'Basic energy barrier.'));
        this.addModule(new ShipModule('mod_shield_heavy', 'Fortress Shield', 'shield', { hp: 300 }, { energy: 150, circuits: 60 }, 'Sustained heavy protection.'));
        this.addModule(new ShipModule('mod_shield_regenerative', 'Bi-Weave Shield', 'shield', { hp: 150 }, { energy: 100, circuits: 100 }, 'Fast regeneration cycles.'));

        // --- UTILITY ---
        this.addModule(new ShipModule('wep_mining', 'Mining Beam', 'weapon', { damage: 5, range: 25 }, { alloys: 20, circuits: 20 }, 'Resource extraction tool.'));
        this.addModule(new ShipModule('mod_repair', 'Nano-Repair Bots', 'shield', { hp: 50 }, { alloys: 100, circuits: 100 }, 'Passive hull regeneration.'));
    }

    addModule(module) {
        this.modules[module.id] = module;
    }

    unlockInitialModules() {
        // Unlock everything for sandbox/testing purposes
        this.unlockedModules = Object.keys(this.modules);
    }

    getAvailableModules(type) {
        return Object.values(this.modules).filter(m => m.type === type && this.unlockedModules.includes(m.id));
    }

    saveDesign(design) {
        this.designs.push(design);
        this.game.notify(`Ship Design Saved: ${design.name}`, 'success');
        // Save to local storage or cloud later
    }

    // UI METHODS ========================================================

    openDesigner() {
        let modal = document.getElementById('ep-designer-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'ep-designer-modal';
            modal.className = 'ep-modal-overlay';
            modal.style.display = 'none';
            // Glassmorphism UI Structure
            modal.innerHTML = `
                <div class="ep-modal" style="width:1000px; max-width:95vw; height:90vh; display:flex; flex-direction:column; background:rgba(15, 23, 42, 0.95);">
                    <div class="ep-modal-header">
                        <h2 style="margin:0; color:#f472b6;">🛠️ Shipyards - Advanced Designer</h2>
                        <button class="ep-sys-btn" onclick="document.getElementById('ep-designer-modal').style.display='none'">CLOSE</button>
                    </div>
                    <div class="ep-modal-body" style="flex:1; display:flex; gap:20px; padding:20px; overflow:hidden;">
                        
                        <!-- Left: Components -->
                        <div style="width:350px; display:flex; flex-direction:column; gap:15px; overflow-y:auto; padding-right:10px;">
                            <div class="ep-panel" style="padding:15px;">
                                <h3 style="color:#a855f7; border-bottom:1px solid #334155; margin-bottom:10px;">1. Hull Chassis</h3>
                                <div id="ep-design-hulls" style="display:flex; flex-direction:column; gap:5px;"></div>
                            </div>

                            <div class="ep-panel" style="padding:15px;">
                                <h3 style="color:#38bdf8; border-bottom:1px solid #334155; margin-bottom:10px;">2. Propulsion</h3>
                                <div id="ep-design-engines" style="display:flex; flex-direction:column; gap:5px;"></div>
                            </div>

                            <div class="ep-panel" style="padding:15px;">
                                <h3 style="color:#ef4444; border-bottom:1px solid #334155; margin-bottom:10px;">3. Weapons & Utils</h3>
                                <div id="ep-design-weapons" style="display:flex; flex-direction:column; gap:5px;"></div>
                            </div>

                            <div class="ep-panel" style="padding:15px;">
                                <h3 style="color:#60a5fa; border-bottom:1px solid #334155; margin-bottom:10px;">4. Shields</h3>
                                <div id="ep-design-shields" style="display:flex; flex-direction:column; gap:5px;"></div>
                            </div>
                        </div>

                        <!-- Right: Preview & Stats -->
                        <div style="flex:1; display:flex; flex-direction:column; gap:15px;">
                            <!-- Preview Area -->
                            <div class="ep-panel" style="flex:2; display:flex; align-items:center; justify-content:center; position:relative; background: radial-gradient(circle at center, #1e293b 0%, #020617 100%); overflow:hidden;">
                                <div id="ep-design-preview" style="width:100%; height:100%; display:flex; justify-content:center; align-items:center;">
                                    <canvas id="ep-ship-preview-canvas" width="600" height="400"></canvas>
                                </div>
                                <div style="position:absolute; top:15px; right:15px; text-align:right;">
                                    <div style="color:#94a3b8; font-size:0.8em; margin-bottom:5px;">CLASS NAME</div>
                                    <input type="text" id="ep-design-name" value="Starfighter Mk.I" 
                                           style="background:rgba(0,0,0,0.5); border:1px solid #38bdf8; color:#fff; padding:8px; text-align:right; font-family:var(--ep-font-header); font-size:1.2em; width:200px; border-radius:4px;">
                                </div>
                            </div>
                            
                            <!-- Stats Panel -->

                            <div class="ep-panel" style="flex:1; padding:20px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:20px;">
                                <div>
                                    <h4 style="margin:0 0 10px 0; color:#f472b6;">⚔️ Combat</h4>
                                    <div class="ep-stat-row" id="ep-stat-hp">Hit Points: <span style="float:right; color:#fff;">0</span></div>
                                    <div class="ep-stat-row" id="ep-stat-dmg">Damage: <span style="float:right; color:#fff;">0</span></div>
                                    <div class="ep-stat-row" id="ep-stat-range">Range: <span style="float:right; color:#fff;">0</span></div>
                                </div>
                                <div>
                                    <h4 style="margin:0 0 10px 0; color:#38bdf8;">🚀 Performance</h4>
                                    <div class="ep-stat-row" id="ep-stat-speed">Speed: <span style="float:right; color:#fff;">0</span></div>
                                    <div class="ep-stat-row" id="ep-stat-cap">Capacity: <span style="float:right; color:#fff;">0</span></div>
                                </div>
                                <div>
                                    <h4 style="margin:0 0 10px 0; color:#fbbf24;">📦 Cost</h4>
                                    <div class="ep-stat-row" id="ep-stat-cost-alloys">Alloys: <span style="float:right; color:#fff;">0</span></div>
                                    <div class="ep-stat-row" id="ep-stat-cost-energy">Energy: <span style="float:right; color:#fff;">0</span></div>
                                    <div class="ep-stat-row" id="ep-stat-cost-circuits">Circuits: <span style="float:right; color:#fff;">0</span></div>
                                </div>
                            </div>

                            <button class="ep-sys-btn" id="ep-btn-save-design" style="height:50px; background:linear-gradient(90deg, #a855f7 0%, #ec4899 100%); font-size:1.2em; border:none; box-shadow:0 0 15px rgba(168, 85, 247, 0.4);">CONFIRM DESIGN & BUILD PROTOTYPE</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        // Reset State
        this.currentDraft = { hull: null, engine: null, weapons: [], shields: [] };
        this.renderDesignerUI();
        modal.style.display = 'flex';

        // Bind Save
        const saveBtn = document.getElementById('ep-btn-save-design');
        if (saveBtn) saveBtn.onclick = () => this.finalizeDesign();
    }

    renderDesignerUI() {
        // Init draft if empty (safety)
        if (!this.currentDraft) this.currentDraft = { hull: null, engine: null, weapons: [], shields: [] };
        if (!this.currentDraft.shields) this.currentDraft.shields = []; // Backwards compat


        const renderList = (type, containerId, clickHandler) => {
            const container = document.getElementById(containerId);
            if (!container) return; // Guard
            container.innerHTML = '';
            this.getAvailableModules(type).forEach(m => {
                const el = document.createElement('div');
                el.className = 'ep-design-item';
                el.style.cssText = 'padding:10px; background:rgba(255,255,255,0.05); border:1px solid transparent; border-radius:6px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; transition:all 0.2s;';
                el.innerHTML = `
                    <div style="display:flex; flex-direction:column;">
                        <span style="font-weight:bold; color:#e2e8f0;">${m.name}</span>
                        <span style="font-size:0.75em; color:#94a3b8;">${m.desc}</span>
                    </div>
                    <span style="font-size:0.8em; color:#fbbf24;">${m.cost.alloys || 0} A</span>
                `;

                // Active state
                const isSelected = (type === 'hull' && this.currentDraft.hull === m) ||
                    (type === 'engine' && this.currentDraft.engine === m) ||
                    (type === 'weapon' && this.currentDraft.weapons.includes(m)) ||
                    (type === 'shield' && this.currentDraft.shields.includes(m));

                if (isSelected) {
                    el.style.borderColor = '#38bdf8';
                    el.style.background = 'rgba(56, 189, 248, 0.2)';
                    el.style.boxShadow = '0 0 10px rgba(56, 189, 248, 0.2)';
                }

                el.onclick = () => clickHandler(m);
                el.onmouseenter = () => { if (!isSelected) el.style.background = 'rgba(255,255,255,0.1)'; };
                el.onmouseleave = () => { if (!isSelected) el.style.background = 'rgba(255,255,255,0.05)'; };
                container.appendChild(el);
            });
        };

        renderList('hull', 'ep-design-hulls', (m) => { this.currentDraft.hull = m; this.updatePreview(); });
        renderList('engine', 'ep-design-engines', (m) => { this.currentDraft.engine = m; this.updatePreview(); });

        renderList('weapon', 'ep-design-weapons', (m) => {
            if (this.currentDraft.weapons.includes(m)) {
                this.currentDraft.weapons = this.currentDraft.weapons.filter(w => w !== m);
            } else {
                if (this.currentDraft.weapons.length < 4) this.currentDraft.weapons.push(m); // Up to 4 weapons
            }
            this.updatePreview();
        });

        renderList('shield', 'ep-design-shields', (m) => {
            if (this.currentDraft.shields.includes(m)) {
                this.currentDraft.shields = this.currentDraft.shields.filter(s => s !== m);
            } else {
                if (this.currentDraft.shields.length < 2) this.currentDraft.shields.push(m); // Up to 2 shields
            }
            this.updatePreview();
        });

        this.updatePreview();
    }

    updatePreview() {
        const refreshHighlight = (type, containerId) => {
            const container = document.getElementById(containerId);
            if (!container) return;
            Array.from(container.children).forEach(el => {
                // Reset standard style
                el.style.borderColor = 'transparent';
                el.style.background = 'rgba(255,255,255,0.05)';
                el.style.boxShadow = 'none';

                // Check name (hacky but works)
                const name = el.querySelector('span').innerText;
                const m = Object.values(this.modules).find(mod => mod.name === name);
                if (m) {
                    const isSelected = (type === 'hull' && this.currentDraft.hull === m) ||
                        (type === 'engine' && this.currentDraft.engine === m) ||
                        (type === 'weapon' && this.currentDraft.weapons.includes(m)) ||
                        (type === 'shield' && this.currentDraft.shields.includes(m));

                    if (isSelected) {
                        el.style.borderColor = '#38bdf8';
                        el.style.background = 'rgba(56, 189, 248, 0.2)';
                        el.style.boxShadow = '0 0 10px rgba(56, 189, 248, 0.2)';
                    }
                }
            });
        };

        refreshHighlight('hull', 'ep-design-hulls');
        refreshHighlight('engine', 'ep-design-engines');
        refreshHighlight('weapon', 'ep-design-weapons');
        refreshHighlight('shield', 'ep-design-shields');

        // Update Stats
        const tempDesign = new ShipDesign('Preview', this.currentDraft.hull, this.currentDraft.engine, this.currentDraft.weapons, this.currentDraft.shields);

        const updateStat = (id, val, suffix = '') => {
            const el = document.querySelector(`#${id} span`);
            if (el) el.innerText = val + suffix;
        };

        updateStat('ep-stat-hp', tempDesign.stats.hp);
        updateStat('ep-stat-dmg', tempDesign.stats.damage);
        updateStat('ep-stat-range', tempDesign.stats.range);
        updateStat('ep-stat-speed', tempDesign.stats.speed);
        updateStat('ep-stat-cap', tempDesign.stats.capacity);

        updateStat('ep-stat-cost-alloys', tempDesign.cost.alloys);
        updateStat('ep-stat-cost-energy', tempDesign.cost.energy);
        updateStat('ep-stat-cost-circuits', tempDesign.cost.circuits);

        // Render Visuals
        if (!this.renderer) {
            const canvas = document.getElementById('ep-ship-preview-canvas');
            if (canvas) this.renderer = new ShipRenderer(canvas);
        }
        if (this.renderer) {
            this.renderer.render(this.currentDraft);
        }
    }

    finalizeDesign() {
        if (!this.currentDraft.hull) { this.game.notify("Hull Required!", "danger"); return; }
        if (!this.currentDraft.engine) { this.game.notify("Engine Required!", "danger"); return; }

        const name = document.getElementById('ep-design-name').value || "Unknown Class";
        const design = new ShipDesign(name, this.currentDraft.hull, this.currentDraft.engine, this.currentDraft.weapons, this.currentDraft.shields);

        this.saveDesign(design);

        if (this.game && typeof this.game.buildShipFromDesign === 'function') {
            this.game.buildShipFromDesign(design);
        }
        document.getElementById('ep-designer-modal').style.display = 'none';

        if (this.game.fleetManager) {
            this.game.fleetManager.openFleetUI(); // Return to fleet
        }
    }
}

class ShipRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }

    render(design) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const cx = w / 2;
        const cy = h / 2;

        // Clear
        ctx.clearRect(0, 0, w, h);

        // Grid Background
        this.drawGrid(ctx, w, h);

        if (!design.hull) return;

        ctx.save();
        ctx.translate(cx, cy);

        // Scale based on hull size generally
        let scale = 1.0;
        if (design.hull.id.includes('titan')) scale = 0.4;
        else if (design.hull.id.includes('dreadnought')) scale = 0.5;
        else if (design.hull.id.includes('carrier')) scale = 0.55;
        else if (design.hull.id.includes('battleship') || design.hull.id.includes('cruiser')) scale = 0.7;
        ctx.scale(scale, scale);

        // 1. Draw Engine Flames (Behind)
        if (design.engine) {
            this.drawEngineFlames(ctx, design.engine);
        }

        // 2. Draw Hull (Body)
        this.drawHull(ctx, design.hull);

        // 3. Draw Engine Nozzles (On Hull)
        if (design.engine) {
            this.drawEngineHardware(ctx, design.engine);
        }

        // 4. Draw Weapons
        if (design.weapons && design.weapons.length > 0) {
            this.drawWeapons(ctx, design.weapons, design.hull);
        }

        // 5. Draw Shields (Overlay)
        if (design.shields && design.shields.length > 0) {
            this.drawShields(ctx, design.shields);
        }

        ctx.restore();
    }

    drawGrid(ctx, w, h) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)';
        ctx.lineWidth = 1;
        const size = 40;
        for (let x = 0; x < w; x += size) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y < h; y += size) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }
    }

    drawHull(ctx, hull) {
        // Style
        ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
        ctx.strokeStyle = '#38bdf8'; // Cyan
        ctx.lineWidth = 3;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 15;

        ctx.beginPath();

        switch (hull.id) {
            case 'hull_corvette':
                // Triangle / Needle
                ctx.moveTo(0, -60);
                ctx.lineTo(25, 40);
                ctx.lineTo(0, 30);
                ctx.lineTo(-25, 40);
                ctx.closePath();
                break;
            case 'hull_frigate':
                // Arrowhead
                ctx.moveTo(0, -80);
                ctx.lineTo(35, 20);
                ctx.lineTo(45, 60);
                ctx.lineTo(0, 50);
                ctx.lineTo(-45, 60);
                ctx.lineTo(-35, 20);
                ctx.closePath();
                break;
            case 'hull_destroyer':
                // Angular heavy
                ctx.moveTo(0, -100);
                ctx.lineTo(30, -40);
                ctx.lineTo(40, 20);
                ctx.lineTo(50, 70);
                ctx.lineTo(0, 80);
                ctx.lineTo(-50, 70);
                ctx.lineTo(-40, 20);
                ctx.lineTo(-30, -40);
                ctx.closePath();
                break;
            case 'hull_cruiser':
                // Elongated Hex
                ctx.moveTo(0, -120);
                ctx.lineTo(30, -80);
                ctx.lineTo(30, 80);
                ctx.lineTo(50, 100);
                ctx.lineTo(0, 90);
                ctx.lineTo(-50, 100);
                ctx.lineTo(-30, 80);
                ctx.lineTo(-30, -80);
                ctx.closePath();
                break;
            case 'hull_carrier':
                // Wide, flat deck look
                ctx.moveTo(-60, -100);
                ctx.lineTo(60, -100);
                ctx.lineTo(70, 100);
                ctx.lineTo(-70, 100);
                ctx.closePath();
                // Flight deck stripes
                ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                ctx.lineWidth = 2;
                for (let i = -80; i < 80; i += 40) {
                    ctx.beginPath(); ctx.moveTo(-30, i); ctx.lineTo(30, i); ctx.stroke();
                }
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 3;
                break;
            case 'hull_dreadnought':
                // Massive
                ctx.moveTo(0, -150);
                ctx.lineTo(40, -100);
                ctx.lineTo(60, 0);
                ctx.lineTo(80, 100);
                ctx.lineTo(30, 120);
                ctx.lineTo(0, 110);
                ctx.lineTo(-30, 120);
                ctx.lineTo(-80, 100);
                ctx.lineTo(-60, 0);
                ctx.lineTo(-40, -100);
                ctx.closePath();
                break;
            case 'hull_titan':
                // Gigantic Spear/Diamond
                ctx.moveTo(0, -200);
                ctx.lineTo(60, -50);
                ctx.lineTo(100, 100);
                ctx.lineTo(0, 180);
                ctx.lineTo(-100, 100);
                ctx.lineTo(-60, -50);
                ctx.closePath();
                // Core glow
                ctx.fill();
                ctx.save();
                ctx.shadowBlur = 30;
                ctx.shadowColor = '#f472b6';
                ctx.fillStyle = 'rgba(244, 114, 182, 0.5)';
                ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
                break;
            default:
                ctx.arc(0, 0, 50, 0, Math.PI * 2);
        }

        ctx.fill();
        ctx.stroke();

        // Cockpit
        ctx.fillStyle = '#0ea5e9';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.fillRect(-5, -20, 10, 15);
    }

    drawEngineFlames(ctx, engine) {
        // Glowy flames
        const thrust = engine.stats.speed;
        const len = thrust * 1.5 + 20;

        ctx.fillStyle = '#f59e0b'; // Amber
        if (engine.id === 'eng_fusion') ctx.fillStyle = '#3b82f6'; // Blue
        if (engine.id === 'eng_antimatter') ctx.fillStyle = '#a855f7'; // Purple

        ctx.globalAlpha = 0.6;
        ctx.shadowBlur = 20;
        ctx.shadowColor = ctx.fillStyle;

        // Draw multiple plumes based on engine type logic (simplified)
        // Center plume
        this.drawPlume(ctx, 0, 40, 15, len);

        if (thrust > 30) {
            this.drawPlume(ctx, 20, 40, 10, len * 0.8);
            this.drawPlume(ctx, -20, 40, 10, len * 0.8);
        }

        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
    }

    drawPlume(ctx, x, y, w, h) {
        ctx.beginPath();
        ctx.moveTo(x - w / 2, y);
        ctx.lineTo(x, y + h);
        ctx.lineTo(x + w / 2, y);
        ctx.fill();
    }

    drawEngineHardware(ctx, engine) {
        ctx.fillStyle = '#64748b';
        ctx.fillRect(-10, 30, 20, 10); // Center nozzle
    }

    drawWeapons(ctx, weapons, hull) {
        // Mount positions vary by hull, but for procedural simplicity we'll fan them out
        let positions = [];
        if (weapons.length === 1) positions = [{ x: 0, y: -10 }];
        else if (weapons.length === 2) positions = [{ x: -20, y: 0 }, { x: 20, y: 0 }];
        else if (weapons.length === 3) positions = [{ x: 0, y: -40 }, { x: -25, y: 10 }, { x: 25, y: 10 }];
        else positions = [{ x: -20, y: -20 }, { x: 20, y: -20 }, { x: -35, y: 20 }, { x: 35, y: 20 }];

        weapons.forEach((w, i) => {
            if (!positions[i]) return;
            const pos = positions[i];

            ctx.save();
            ctx.translate(pos.x, pos.y);

            // Draw Turret
            ctx.fillStyle = '#ef4444'; // Red for weapon
            if (w.id.includes('mining')) ctx.fillStyle = '#fcd34d'; // Yellow
            if (w.id.includes('railgun')) ctx.fillStyle = '#fff';

            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI * 2);
            ctx.fill();

            // Barrel
            ctx.strokeStyle = ctx.fillStyle;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -15);
            ctx.stroke();

            ctx.restore();
        });
    }

    drawShields(ctx, shields) {
        // Draw Bubble
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#60a5fa';
        ctx.shadowBlur = 10;
        ctx.globalAlpha = 0.3;

        let size = 80;
        if (shields.some(s => s.id === 'mod_shield_heavy')) size = 110;

        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(96, 165, 250, 0.1)';
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

window.ShipModule = ShipModule;
window.ShipDesign = ShipDesign;
window.ShipDesigner = ShipDesigner;
