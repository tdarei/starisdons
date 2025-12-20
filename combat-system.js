/**
 * Combat System
 * Handles tactical auto-battles between fleets.
 */

class CombatManager {
    constructor(game) {
        this.game = game;
        this.active = false;
        this.playerFleet = [];
        this.enemyFleet = [];
        this.combatLog = [];
        this.round = 0;
        this.autoPlayInterval = null;
    }

    startCombat(playerShips, encounter) {
        this.active = true;
        this.playerFleet = playerShips;
        this.enemyFleet = encounter.ships;
        this.reward = encounter.reward;
        this.combatLog = [`Combat Started against ${encounter.name}!`];
        this.round = 0;

        this.openCombatUI();
        this.updateCombatUI();
    }

    resolveRound() {
        if (!this.active) return;
        this.round++;
        this.log(`--- Round ${this.round} ---`);

        // Player turn
        this.playerFleet.forEach(ship => {
            if (ship.stats.hp <= 0) return;
            const target = this.findTarget(this.enemyFleet);
            if (target) {
                this.attack(ship, target);
            }
        });

        // Enemy turn
        this.enemyFleet.forEach(ship => {
            if (ship.stats.hp <= 0) return;
            const target = this.findTarget(this.playerFleet);
            if (target) {
                this.attack(ship, target);
            }
        });

        this.updateCombatUI();
        this.checkCombatStatus();
    }

    findTarget(fleet) {
        // Simple mechanic: target living ship with lowest HP
        const living = fleet.filter(s => s.stats.hp > 0);
        if (living.length === 0) return null;
        return living.sort((a, b) => a.stats.hp - b.stats.hp)[0];
    }

    attack(attacker, defender) {
        let damage = attacker.design.stats.damage || 5;

        // --- Capital Ship Logic ---
        // 1. Dreadnought Multiplier
        if (attacker.design.hull && attacker.design.hull.stats.dpsMultiplier) {
            damage *= attacker.design.hull.stats.dpsMultiplier;
        }

        // 2. Carrier Hangar Support
        if (attacker.design.hull && attacker.design.hull.stats.hangarValue) {
            const fighterDps = attacker.design.hull.stats.hangarValue * 0.5; // Fighters add extra punch
            damage += fighterDps;
            if (this.round % 3 === 0) {
                this.log(`✈️ ${attacker.name}'s fighter wings are strafing ${defender.name}!`);
            }
        }

        // 3. Doomsday Weapon Logic (Judgment Beam)
        const doomsdayWeapon = attacker.design.weapons.find(w => w.stats.isDoomsday);
        if (doomsdayWeapon) {
            // Doomsday weapons only fire every 5 rounds due to massive recharge
            if (this.round % 5 === 0) {
                damage = doomsdayWeapon.stats.damage;
                this.log(`💥 JUDGMENT BEAM ACTIVATED! ${attacker.name} erases ${defender.name}!`, 'warning');
                if (window.hapticFeedbackSystem) window.hapticFeedbackSystem.triggerHaptic("explosion", 1000, 1.0);
            } else {
                damage = 0; // Charging...
                if (this.round % 5 === 4) {
                    this.log(`☢️ ${attacker.name}'s Doomsday weapon is 90% CHARGED...`);
                }
            }
        }

        defender.stats.hp -= damage;
        if (damage > 0) {
            this.log(`${attacker.name} fires at ${defender.name} for ${Math.floor(damage)} dmg!`);
        }

        if (defender.stats.hp <= 0) {
            defender.stats.hp = 0;
            this.log(`${defender.name} was destroyed!`, 'danger');
        }
    }

    log(msg, type = 'info') {
        this.combatLog.push({ text: msg, type: type });
    }

    checkCombatStatus() {
        const playerAlive = this.playerFleet.some(s => s.stats.hp > 0);
        const enemyAlive = this.enemyFleet.some(s => s.stats.hp > 0);

        if (!playerAlive) {
            this.endCombat(false);
        } else if (!enemyAlive) {
            this.endCombat(true);
        }
    }

    endCombat(victory) {
        this.active = false;
        clearInterval(this.autoPlayInterval);

        if (victory) {
            this.log("VICTORY! Enemy fleet eliminated.", "success");
            this.game.notify("Combat Victory! Resources salvaged.", "success");
            // Give Rewards
            if (this.reward) {
                this.game.resources.alloys += this.reward.alloys || 0;
                this.game.resources.credits += this.reward.credits || 0;
            }
        } else {
            this.log("DEFEAT! Your fleet was destroyed.", "danger");
            this.game.notify("Combat Defeat! Ships lost.", "danger");
        }

        // Show close button
        const btn = document.getElementById('ep-btn-retreat');
        if (btn) {
            btn.innerText = "Close Combat";
            btn.onclick = () => this.closeCombatUI();
        }
    }

    // UI ========================================================

    openCombatUI() {
        let modal = document.getElementById('ep-combat-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'ep-combat-modal';
            modal.className = 'ep-modal-overlay';
            modal.style.zIndex = '2000'; // Above everything
            modal.innerHTML = `
                <div class="ep-modal" style="width:800px; height:600px; background:#0f172a; border:2px solid #ef4444; display:flex; flex-direction:column;">
                    <div style="padding:10px; background:#450a0a; color:#fff; font-weight:bold; display:flex; justify-content:space-between;">
                        <span>⚠️ COMBAT ALERT</span>
                        <span>Round <span id="ep-combat-round">0</span></span>
                    </div>
                    
                    <div style="flex:1; display:flex; padding:10px; gap:10px; overflow:hidden;">
                        <!-- Player Fleet -->
                        <div style="flex:1; border:1px solid #334155; padding:5px; overflow-y:auto;">
                            <h4 style="color:#4ade80; margin:0 0 10px 0; text-align:center;">Your Fleet</h4>
                            <div id="ep-combat-player"></div>
                        </div>

                        <!-- Log -->
                        <div style="flex:1; border:1px solid #334155; background:#000; padding:10px; font-family:monospace; font-size:0.9em; overflow-y:auto;" id="ep-combat-log">
                        </div>

                        <!-- Enemy Fleet -->
                        <div style="flex:1; border:1px solid #334155; padding:5px; overflow-y:auto;">
                            <h4 style="color:#ef4444; margin:0 0 10px 0; text-align:center;">Hostiles</h4>
                            <div id="ep-combat-enemy"></div>
                        </div>
                    </div>

                    <div style="padding:10px; display:flex; justify-content:center; gap:10px; background:#1e293b;">
                         <button class="ep-sys-btn" id="ep-btn-combat-next" style="width:150px;">Next Round</button>
                         <button class="ep-sys-btn" id="ep-btn-combat-auto" style="width:150px; background:#f472b6; color:#000;">Auto-Battle</button>
                         <button class="ep-sys-btn" id="ep-btn-retreat" style="width:150px; border-color:#ef4444; color:#ef4444;">Retreat</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        modal.style.display = 'flex';

        // Connect Buttons
        document.getElementById('ep-btn-combat-next').onclick = () => this.resolveRound();

        document.getElementById('ep-btn-combat-auto').onclick = () => {
            if (this.autoPlayInterval) {
                clearInterval(this.autoPlayInterval);
                this.autoPlayInterval = null;
                document.getElementById('ep-btn-combat-auto').innerText = "Auto-Battle";
            } else {
                this.autoPlayInterval = setInterval(() => this.resolveRound(), 1000);
                document.getElementById('ep-btn-combat-auto').innerText = "Stop Auto";
            }
        };

        const retreatBtn = document.getElementById('ep-btn-retreat');
        retreatBtn.innerText = "Retreat";
        retreatBtn.onclick = () => {
            this.game.notify("Retreated from battle!", "warning");
            this.closeCombatUI();
        };
    }

    closeCombatUI() {
        if (this.autoPlayInterval) clearInterval(this.autoPlayInterval);
        document.getElementById('ep-combat-modal').style.display = 'none';
        this.active = false;

        // Remove dead ships from game fleet
        // Note: In a real game we'd probably want a repair mechanic vs death
        // But for now, permadeath makes design meaningful
        const beforeCount = this.game.ships.length;
        this.game.ships = this.game.ships.filter(s => s.stats.hp > 0);
        const lost = beforeCount - this.game.ships.length;
        if (lost > 0) {
            this.game.notify(`${lost} ships were lost in battle.`, "danger");
            if (this.game.fleetManager) this.game.fleetManager.renderFleetList();
        }
    }

    updateCombatUI() {
        document.getElementById('ep-combat-round').innerText = this.round;

        const renderShip = (s) => `
            <div style="padding:5px; border:1px solid ${s.stats.hp > 0 ? '#334155' : '#ef4444'}; margin-bottom:5px; background:${s.stats.hp > 0 ? 'transparent' : '#450a0a55'}; opacity:${s.stats.hp > 0 ? 1 : 0.5};">
                <div style="font-size:0.9em;">${s.name}</div>
                <div style="height:4px; background:#333; margin-top:2px;">
                    <div style="width:${(s.stats.hp / s.stats.maxHp) * 100}%; background:${s.stats.hp > 0 ? (s.isEnemy ? '#ef4444' : '#4ade80') : 'transparent'}; height:100%;"></div>
                </div>
                <div style="font-size:0.7em; text-align:right;">${s.stats.hp}/${s.stats.maxHp} HP</div>
            </div>
        `;

        document.getElementById('ep-combat-player').innerHTML = this.playerFleet.map(renderShip).join('');
        document.getElementById('ep-combat-enemy').innerHTML = this.enemyFleet.map(renderShip).join('');

        const logEl = document.getElementById('ep-combat-log');
        // Just render last 20 logs
        const recentLogs = this.combatLog.slice(-20);
        logEl.innerHTML = recentLogs.map(l => {
            let color = '#ccc';
            if (l.text.includes('destroyed')) color = '#ef4444';
            if (l.text.includes('VICTORY')) color = '#facc15';
            return `<div style="color:${color}; margin-bottom:2px;">${l.text}</div>`;
        }).join('');
        logEl.scrollTop = logEl.scrollHeight;
    }
}

window.CombatManager = CombatManager;
