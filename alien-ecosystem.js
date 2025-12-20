
class AlienEcosystem {
    constructor() {
        this.species = {
            flora: [],
            fauna: []
        };
        this.tileLife = {}; // Map tileID -> { flora: id, fauna: id, scanned: boolean }
        this.xenodex = {
            flora: [], // Discovered flora IDs
            fauna: []  // Discovered fauna IDs
        };

        this.prefixes = ['Xeno', 'Cryo', 'Pyro', 'Hydro', 'Litho', 'Aero', 'Bio', 'Mech'];
        this.suffixes = ['phyte', 'saur', 'pod', 'morph', 'vore', 'synth', 'form'];
    }

    init() {
        this.generateFlora(5);
        this.generateFauna(5);
        console.log("Alien Ecosystem Initialized:", this.species);
    }

    generateName() {
        const p = this.prefixes[Math.floor(Math.random() * this.prefixes.length)];
        const s = this.suffixes[Math.floor(Math.random() * this.suffixes.length)];
        return p + s;
    }

    generateFlora(count) {
        for (let i = 0; i < count; i++) {
            const id = `flora_${i}`;
            const name = this.generateName();
            const type = ['Medicinal', 'Toxic', 'Bioluminescent', 'Carnivorous'][Math.floor(Math.random() * 4)];
            const effect = ['morale_boost', 'health_drain', 'energy_boost', 'research_boost'][Math.floor(Math.random() * 4)];

            this.species.flora.push({ id, name, type, effect, desc: `A native ${type.toLowerCase()} plant.` });
        }
    }

    generateFauna(count) {
        for (let i = 0; i < count; i++) {
            const id = `fauna_${i}`;
            const name = this.generateName();
            const behavior = ['Aggressive', 'Passive', 'Skittish', 'Curious'][Math.floor(Math.random() * 4)];
            const diet = ['Herbivore', 'Carnivore', 'Lithovore', 'Photovore'][Math.floor(Math.random() * 4)];

            this.species.fauna.push({ id, name, behavior, diet, desc: `A ${behavior.toLowerCase()} ${diet.toLowerCase()} creature.` });
        }
    }

    populateTile(tileId, tileType) {
        // Chance to spawn life based on tile type
        const life = { flora: null, fauna: null, scanned: false };

        let floraChance = 0.3;
        let faunaChance = 0.1;

        if (tileType === 'plains') { floraChance = 0.5; faunaChance = 0.2; }
        if (tileType === 'mountains') { floraChance = 0.1; faunaChance = 0.1; }

        if (Math.random() < floraChance && this.species.flora.length > 0) {
            life.flora = this.species.flora[Math.floor(Math.random() * this.species.flora.length)].id;
        }

        if (Math.random() < faunaChance && this.species.fauna.length > 0) {
            life.fauna = this.species.fauna[Math.floor(Math.random() * this.species.fauna.length)].id;
        }

        this.tileLife[tileId] = life;
        return life;
    }

    scanTile(tileId) {
        const life = this.tileLife[tileId];
        if (!life) return null;

        life.scanned = true;
        const results = [];

        if (life.flora) {
            const species = this.species.flora.find(s => s.id === life.flora);
            if (!this.xenodex.flora.includes(life.flora)) {
                this.xenodex.flora.push(life.flora);
                results.push({ type: 'flora', species, newDiscovery: true });
            } else {
                results.push({ type: 'flora', species, newDiscovery: false });
            }
        }

        if (life.fauna) {
            const species = this.species.fauna.find(s => s.id === life.fauna);
            if (!this.xenodex.fauna.includes(life.fauna)) {
                this.xenodex.fauna.push(life.fauna);
                results.push({ type: 'fauna', species, newDiscovery: true });
            } else {
                results.push({ type: 'fauna', species, newDiscovery: false });
            }
        }

        return results;
    }

    getDiscoveredFlora() {
        return this.species.flora.filter(s => this.xenodex.flora.includes(s.id));
    }

    getDiscoveredFauna() {
        return this.species.fauna.filter(s => this.xenodex.fauna.includes(s.id));
    }

    // --- HAZMAT / HOSTILE ENCOUNTERS ---

    checkForHostileEncounter(tileId, game) {
        const life = this.tileLife[tileId];
        if (!life || !life.fauna) return null;

        const fauna = this.species.fauna.find(s => s.id === life.fauna);
        if (!fauna || fauna.behavior !== 'Aggressive') return null;

        // 15% chance of hostile encounter when near aggressive fauna
        if (Math.random() > 0.15) return null;

        const encounter = {
            type: 'hostile',
            species: fauna,
            dangerLevel: this.calculateDangerLevel(fauna),
            outcome: null
        };

        // Determine outcome based on danger and defense
        const defense = game.military ? game.military.getDefensePower() : 0;
        const threat = encounter.dangerLevel * 10;

        if (defense >= threat) {
            encounter.outcome = 'repelled';
            game.notify(`⚔️ ${fauna.name} attacked but was repelled!`, 'success');
        } else if (Math.random() < 0.5) {
            encounter.outcome = 'injury';
            this.injureColonist(game);
            game.notify(`🩸 ${fauna.name} attacked! A colonist was injured!`, 'danger');
        } else {
            encounter.outcome = 'escaped';
            game.notify(`🏃 ${fauna.name} attacked! Colonists escaped safely.`, 'info');
        }

        return encounter;
    }

    calculateDangerLevel(fauna) {
        let danger = 1;
        if (fauna.behavior === 'Aggressive') danger += 2;
        if (fauna.diet === 'Carnivore') danger += 1;
        return Math.min(danger, 5);
    }

    injureColonist(game) {
        if (!game.colonists || game.colonists.length === 0) return;

        const victim = game.colonists[Math.floor(Math.random() * game.colonists.length)];
        victim.injured = true;
        victim.morale = Math.max(0, (victim.morale || 50) - 20);

        // Injured colonists work slower
        if (!victim.traits) victim.traits = [];
        if (!victim.traits.includes('Injured')) {
            victim.traits.push('Injured');
        }
    }

    healColonist(colonist) {
        colonist.injured = false;
        const idx = colonist.traits ? colonist.traits.indexOf('Injured') : -1;
        if (idx > -1) colonist.traits.splice(idx, 1);
    }

    // Hazmat - Toxic tiles from certain flora
    checkToxicHazard(tileId, game) {
        const life = this.tileLife[tileId];
        if (!life || !life.flora) return null;

        const flora = this.species.flora.find(s => s.id === life.flora);
        if (!flora || flora.type !== 'Toxic') return null;

        // 10% chance of toxic exposure when working on toxic tile
        if (Math.random() > 0.10) return null;

        game.notify(`☠️ Toxic exposure from ${flora.name}! Morale decreased.`, 'danger');
        game.morale = Math.max(0, game.morale - 5);

        return { type: 'toxic', species: flora };
    }

    // Building for protection
    static HAZMAT_BUILDING = {
        key: 'hazmat_suit',
        name: 'Hazmat Station',
        cost: { alloys: 30, circuits: 10 },
        icon: '🧪',
        desc: 'Reduces toxic hazard damage',
        color: 0x22c55e
    };
}
