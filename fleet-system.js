/**
 * Fleet System
 * Manages active ships, fleet capacity, and fleet operations.
 */

class FleetManager {
    constructor(game) {
        this.game = game;
        this.maxSize = 10; // Increased base cap for wings
        this.wings = {
            'Alpha': { name: 'Alpha Wing', bonus: 'damage', ships: [] },
            'Beta': { name: 'Beta Wing', bonus: 'speed', ships: [] }
        };
        this.missions = {
            'scout_patrol': { name: 'Sector Patrol', duration: 10, risk: 0.5, reward: { data: 50 }, req: { speed: 10 } },
            'asteroid_mining': { name: 'Asteroid Belt', duration: 30, risk: 0.1, reward: { minerals: 100 }, req: { capacity: 20 } },
            'trader_protection': { name: 'Escort Duty', duration: 60, risk: 0.2, reward: { credits: 200 }, req: { damage: 20 } }
        };
    }

    init() {
        if (!this.game.ships) this.game.ships = [];
        console.log("Fleet Manager Initialized");
    }

    update(dt) {
        const now = Date.now();
        this.game.ships.forEach(ship => {
            if (ship.status === 'mission' && ship.mission) {
                if (now >= ship.mission.startTime + ship.mission.duration) {
                    this.completeMission(ship);
                }
            }
        });
    }

    getFleetPower() {
        return this.game.ships.reduce((total, ship) => {
            return total + (ship.design.stats.damage * 10) + (ship.design.stats.hp / 2);
        }, 0);
    }

    scrapShip(shipId) {
        const idx = this.game.ships.findIndex(s => s.id === shipId);
        if (idx > -1) {
            const ship = this.game.ships[idx];
            // Refund some resources (50%)
            const refund = { alloys: 0, circuits: 0 };
            if (ship.design && ship.design.cost) {
                refund.alloys = Math.floor(ship.design.cost.alloys * 0.5);
                refund.circuits = Math.floor(ship.design.cost.circuits * 0.5);
            }

            this.game.resources.alloys = (this.game.resources.alloys || 0) + refund.alloys;
            this.game.resources.circuits = (this.game.resources.circuits || 0) + refund.circuits;

            this.game.ships.splice(idx, 1);
            this.game.notify(`Ship Scrapped. Refunded ${refund.alloys} Alloys, ${refund.circuits} Circuits.`, "info");
            this.game.updateResourceUI();
            this.openFleetUI(); // Refresh
        }
    }

    startMission(ship, missionKey) {
        const m = this.missions[missionKey];
        ship.status = 'mission';
        ship.mission = {
            type: missionKey,
            startTime: Date.now(),
            duration: m.duration * 1000 // ms
        };
        this.game.notify(`${ship.name} deployed on ${m.name}!`, 'info');
        this.openFleetUI(); // Refresh UI to show status

        // Combat Trigger for Patrol
        if (missionKey === 'scout_patrol') {
            // 50% chance of encounter
            if (Math.random() > 0.5) {
                setTimeout(() => {
                    if (this.game.aliens && this.game.combat) {
                        const encounter = this.game.aliens.generateEncounter(2); // Diff 2
                        this.game.notify(`⚠️ ALIEN SIGNATURE DETECTED! ${ship.name} interception imminent.`, "warning");
                        this.game.combat.startCombat([ship], encounter);
                    }
                }, 2000); // Delay for effect
            }
        }
    }

    completeMission(ship) {
        const m = this.missions[ship.mission.type];
        ship.status = 'docked';
        ship.mission = null;

        // Add rewards
        if (m.reward) {
            for (let res in m.reward) {
                this.game.resources[res] = (this.game.resources[res] || 0) + m.reward[res];
            }
        }
        this.game.notify(`${ship.name} returned from ${m.name}.`, 'success');
        this.game.updateResourceUI();

        // Refresh UI if open
        if (document.getElementById('ep-fleet-modal') && document.getElementById('ep-fleet-modal').style.display !== 'none') {
            this.openFleetUI();
        }
    }

    openFleetUI() {
        let modal = document.getElementById('ep-fleet-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'ep-fleet-modal';
            modal.className = 'ep-modal-overlay';
            modal.style.display = 'none';
            modal.innerHTML = `
                <div class="ep-modal" style="width:900px; max-width:95vw; height:85vh; display:flex; flex-direction:column; background:rgba(15, 23, 42, 0.95); border:1px solid #334155; box-shadow:0 0 50px rgba(0,0,0,0.8);">
                    <div class="ep-modal-header" style="background:rgba(30, 41, 59, 0.8); border-bottom:1px solid #334155; padding:15px; display:flex; justify-content:space-between; align-items:center;">
                        <h2 style="margin:0; color:#f472b6; text-shadow:0 0 10px rgba(244, 114, 182, 0.5);">🚀 Fleet Command</h2>
                        <button class="ep-sys-btn" onclick="document.getElementById('ep-fleet-modal').style.display='none'">CLOSE</button>
                    </div>
                    
                    <div style="padding:15px; background:rgba(15, 23, 42, 0.6); border-bottom:1px solid #334155; display:flex; justify-content:space-between; align-items:center;">
                        <span id="ep-fleet-stats" style="color:#e2e8f0; font-family:'Orbitron', sans-serif; font-size:1.1em;">Fleet Strength: 0 | Ships: 0/5</span>
                        <button class="ep-sys-btn" id="ep-btn-new-design" style="background:linear-gradient(45deg, #db2777, #f472b6); color:#fff; font-weight:bold; border:none; box-shadow:0 0 15px rgba(219, 39, 119, 0.5);">🛠️ NEW DESIGN</button>
                    </div>

                    <div class="ep-modal-body" id="ep-fleet-list" style="flex:1; overflow-y:auto; padding:20px; display:grid; grid-template-columns:repeat(auto-fill, minmax(300px, 1fr)); gap:20px;">
                        <!-- Ship Cards -->
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            document.getElementById('ep-btn-new-design').onclick = () => {
                modal.style.display = 'none';
                this.game.shipDesigner.openDesigner();
            };
        }

        this.renderFleetList();
        modal.style.display = 'flex';
    }

    buildShipFromSelectedDesign() {
        const select = document.getElementById('ep-fleet-build-design');
        if (!select) return;

        const designId = select.value;
        if (!designId) return;

        const designs = (this.game.shipDesigner && Array.isArray(this.game.shipDesigner.designs))
            ? this.game.shipDesigner.designs
            : [];
        const design = designs.find((d) => d && d.id != null && String(d.id) === String(designId));

        if (!design) {
            this.game.notify('Ship design not found.', 'warning');
            return;
        }

        if (this.game && typeof this.game.buildShipFromDesign === 'function') {
            this.game.buildShipFromDesign(design);
        }
        this.openFleetUI();
    }

    assignToWing(shipId, wingName) {
        const ship = this.game.ships.find(s => s.id === shipId);
        if (!ship) return;

        // Remove from old wing if any
        Object.values(this.wings).forEach(w => {
            const idx = w.ships.indexOf(shipId);
            if (idx > -1) w.ships.splice(idx, 1);
        });

        if (wingName !== 'none') {
            this.wings[wingName].ships.push(shipId);
            ship.wing = wingName;
            this.game.notify(`${ship.name} assigned to ${this.wings[wingName].name}`, "success");
        } else {
            ship.wing = null;
        }
        this.renderFleetList();
    }

    renderFleetList() {
        const container = document.getElementById('ep-fleet-list');
        const statsEl = document.getElementById('ep-fleet-stats');

        container.innerHTML = '';
        statsEl.innerText = `Fleet Strength: ${Math.floor(this.getFleetPower())} | Ships: ${this.game.ships.length}/${this.maxSize}`;

        // Render Wings Overview
        const wingHeader = document.createElement('div');
        wingHeader.style.cssText = 'grid-column:1/-1; display:flex; gap:20px; margin-bottom:10px;';
        Object.entries(this.wings).forEach(([id, w]) => {
            const activeBonus = this.game && this.game.pilotSkills ? (this.game.pilotSkills.fleet_command || 0) * 2 : 0;
            wingHeader.innerHTML += `
                <div style="flex:1; background:rgba(30, 41, 59, 0.4); border:1px solid #334155; border-radius:8px; padding:10px;">
                    <div style="color:#60a5fa; font-size:0.8rem; text-transform:uppercase; letter-spacing:1px;">${w.name}</div>
                    <div style="color:#94a3b8; font-size:1.1rem; font-weight:bold;">${w.ships.length} Units</div>
                    <div style="font-size:0.7rem; color:#4ade80;">Bonus: +${activeBonus}% ${w.bonus}</div>
                </div>
            `;
        });
        container.appendChild(wingHeader);

        const designs = (this.game.shipDesigner && Array.isArray(this.game.shipDesigner.designs))
            ? this.game.shipDesigner.designs
            : [];

        const shipyardCard = document.createElement('div');
        shipyardCard.style.cssText = `
            grid-column:1/-1;
            background:rgba(30, 41, 59, 0.4);
            border:1px solid #334155;
            border-radius:12px;
            padding:15px;
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:15px;
            flex-wrap:wrap;
        `;

        if (designs.length === 0) {
            shipyardCard.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <div style="font-weight:bold; color:#38bdf8;">🛠️ Shipyard</div>
                    <div style="color:#94a3b8; font-size:0.9em;">No designs available. Create a blueprint to build ships.</div>
                </div>
                <button class="ep-sys-btn" style="background:linear-gradient(45deg, #db2777, #f472b6); color:#fff; font-weight:bold; border:none; box-shadow:0 0 15px rgba(219, 39, 119, 0.5);" onclick="document.getElementById('ep-fleet-modal').style.display='none'; window.game.shipDesigner.openDesigner();">🛠️ NEW DESIGN</button>
            `;
        } else {
            const options = designs
                .map((d) => {
                    if (!d || d.id == null) return '';
                    const name = (d.name != null) ? String(d.name) : 'Unnamed Design';
                    const cost = (d.cost && typeof d.cost === 'object') ? d.cost : {};
                    const a = (typeof cost.alloys === 'number' && Number.isFinite(cost.alloys)) ? Math.floor(cost.alloys) : 0;
                    const e = (typeof cost.energy === 'number' && Number.isFinite(cost.energy)) ? Math.floor(cost.energy) : 0;
                    const c = (typeof cost.circuits === 'number' && Number.isFinite(cost.circuits)) ? Math.floor(cost.circuits) : 0;
                    return `<option value="${String(d.id)}">${name} (${a} A / ${e} E / ${c} C)</option>`;
                })
                .filter(Boolean)
                .join('');

            shipyardCard.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <div style="font-weight:bold; color:#38bdf8;">🛠️ Shipyard</div>
                    <div style="color:#94a3b8; font-size:0.9em;">Build a new ship from an existing blueprint.</div>
                </div>
                <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                    <select id="ep-fleet-build-design" style="background:rgba(0,0,0,0.35); border:1px solid #334155; color:#e2e8f0; padding:8px 10px; border-radius:8px; min-width:260px;">
                        ${options}
                    </select>
                    <button class="ep-sys-btn" style="background:rgba(56, 189, 248, 0.2); border-color:#38bdf8; color:#38bdf8; font-weight:bold;" onclick="window.game.fleetManager.buildShipFromSelectedDesign()">BUILD</button>
                </div>
            `;
        }

        container.appendChild(shipyardCard);

        if (this.game.ships.length === 0) {
            const emptyCard = document.createElement('div');
            emptyCard.style.cssText = 'grid-column:1/-1; text-align:center; color:#64748b; margin-top:20px; display:flex; flex-direction:column; align-items:center; gap:20px;';
            emptyCard.innerHTML = `
                <div style="font-size:4em; opacity:0.2;">🚀</div>
                <div style="font-size:1.2em;">No ships in fleet.</div>
                <div style="font-size:0.9em;">Build a ship from a blueprint to begin exploration.</div>
            `;
            container.appendChild(emptyCard);
            return;
        }

        this.game.ships.forEach(ship => {
            const card = document.createElement('div');
            const isDocked = ship.status === 'docked';
            const statusColor = isDocked ? '#4ade80' : '#facc15';

            card.style.cssText = `
                background:rgba(30, 41, 59, 0.6); 
                border:1px solid ${isDocked ? '#334155' : '#facc15'}; 
                border-radius:12px; 
                padding:15px; 
                display:flex; 
                flex-direction:column; 
                gap:10px; 
                position:relative;
                transition: transform 0.2s, box-shadow 0.2s;
                backdrop-filter: blur(5px);
            `;

            // Hover effect
            card.onmouseenter = () => { card.style.transform = 'translateY(-2px)'; card.style.boxShadow = '0 10px 20px -5px rgba(0,0,0,0.3)'; };
            card.onmouseleave = () => { card.style.transform = 'translateY(0)'; card.style.boxShadow = 'none'; };

            // Health Bar
            const hpPct = (ship.stats.hp / ship.stats.maxHp) * 100;

            let actionButtons = `
                <button class="ep-sys-btn" style="flex:1; font-size:0.8em; padding:6px; background:rgba(56, 189, 248, 0.2); border-color:#38bdf8; color:#38bdf8;" onclick="window.game.fleetManager.startMission(window.game.ships.find(s=>s.id=='${ship.id}'), 'scout_patrol')">Patrol (10s)</button>
                <button class="ep-sys-btn" style="flex:1; font-size:0.8em; padding:6px; background:rgba(239, 68, 68, 0.2); border-color:#ef4444; color:#ef4444;" onclick="window.game.fleetManager.scrapShip('${ship.id}')">Scrap</button>
            `;

            if (!isDocked) {
                actionButtons = `
                    <div style="flex:1; text-align:center; background:rgba(250, 204, 21, 0.1); border:1px dashed #facc15; border-radius:6px; color:#facc15; font-size:0.9em; padding:8px;">
                        <span class="blink">🚀 On Mission...</span>
                    </div>
                `;
            }

            const wingOptions = Object.keys(this.wings).map(wid => `<option value="${wid}" ${ship.wing === wid ? 'selected' : ''}>${this.wings[wid].name}</option>`).join('');

            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; flex-direction:column;">
                        <span style="font-weight:bold; color:#f472b6; font-size:1.1em;">${ship.name}</span>
                        <span style="font-size:0.8em; color:#94a3b8;">${ship.design.hull.name} Class</span>
                    </div>
                    <span style="font-size:0.7em; letter-spacing:1px; font-weight:bold; color:${statusColor}; border:1px solid ${statusColor}; padding:2px 8px; border-radius:12px; background:${statusColor}22;">${ship.status.toUpperCase()}</span>
                </div>
                
                <div style="margin:5px 0;">
                    <div style="display:flex; justify-content:space-between; font-size:0.7em; color:#cbd5e1; margin-bottom:2px;">
                        <span>Hull Integrity</span>
                        <span>${Math.floor(ship.stats.hp)}/${ship.stats.maxHp}</span>
                    </div>
                    <div style="background:#0f172a; height:6px; border-radius:3px; overflow:hidden;">
                        <div style="width:${hpPct}%; background:${hpPct > 50 ? '#4ade80' : '#ef4444'}; height:100%; transition:width 0.5s;"></div>
                    </div>
                </div>

                <div style="display:flex; gap:5px; align-items:center;">
                    <span style="font-size:0.75rem; color:#94a3b8;">Wing:</span>
                    <select style="flex:1; background:rgba(0,0,0,0.3); border:1px solid #334155; color:#eee; font-size:0.75rem; border-radius:4px; padding:4px;" 
                            onchange="window.game.fleetManager.assignToWing('${ship.id}', this.value)">
                        <option value="none">Unassigned</option>
                        ${wingOptions}
                    </select>
                </div>

                <div style="font-size:0.85em; color:#cbd5e1; display:grid; grid-template-columns:1fr 1fr; gap:5px; background:rgba(15, 23, 42, 0.5); padding:8px; border-radius:6px;">
                    <div style="display:flex; align-items:center; gap:5px;"><span>⚔️</span> <span>Dmg: ${ship.design.stats.damage}</span></div>
                    <div style="display:flex; align-items:center; gap:5px;"><span>🛡️</span> <span>HP: ${ship.stats.maxHp}</span></div>
                    <div style="display:flex; align-items:center; gap:5px;"><span>⚡</span> <span>Spd: ${ship.design.stats.speed}</span></div>
                    <div style="display:flex; align-items:center; gap:5px;"><span>📦</span> <span>Cap: ${ship.design.stats.capacity}</span></div>
                </div>

                <div style="margin-top:auto; display:flex; gap:10px; margin-top:10px;">
                    ${actionButtons}
                </div>
            `;
            container.appendChild(card);
        });
    }
}

window.FleetManager = FleetManager;
