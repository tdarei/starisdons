/**
 * Exoplanet Pioneer - Main Game Logic
 */

if (typeof Logger === 'undefined') {
    window.Logger = class Logger {
        constructor() {
            this.entries = [];
            this.maxEntries = 50;
        }

        add(text, type = 'info') {
            this.entries.unshift({
                text: text,
                type: type,
                timestamp: window.game ? window.game.day : 0,
                realTime: Date.now()
            });
            if (this.entries.length > this.maxEntries) {
                this.entries.pop();
            }
        }

        getEntries() { return this.entries; }

        getTypeColor(type) {
            switch (type) {
                case 'success': return '#4ade80';
                case 'warning': return '#facc15';
                case 'error': return '#ef4444';
                default: return '#38bdf8';
            }
        }
    };
} else {
    // If it exists, ensure window.Logger points to it if needed, or do nothing.
    // The class is likely already defined on window if we use this pattern.
}
/**
 * Exoplanet Pioneer
 * An advanced colony management simulation on a 3D hex-sphere.
 * Features: Resource management, procedural terrain, structure building.
 */

if (typeof TRAIT_DEFINITIONS === 'undefined') {
    window.TRAIT_DEFINITIONS = {
        'Lazy': { name: 'Lazy', desc: 'Work Speed -20%', type: 'negative', color: '#fca5a5' },
        'Workaholic': { name: 'Workaholic', desc: 'Work Speed +20%, Morale decay faster', type: 'positive', color: '#86efac' },
        'Genius': { name: 'Genius', desc: 'Research Output +50%', type: 'positive', color: '#c084fc' },
        'Dull': { name: 'Dull', desc: 'Research Output -50%', type: 'negative', color: '#94a3b8' },
        'Robust': { name: 'Robust', desc: 'Health decay -50%', type: 'positive', color: '#fcd34d' },
        'Fragile': { name: 'Fragile', desc: 'Health decay +50%', type: 'negative', color: '#fb7185' },
        'Insomniac': { name: 'Insomniac', desc: 'Loses morale at night', type: 'negative', color: '#a78bfa' },
        'NightOwl': { name: 'Night Owl', desc: 'Bonus productivity at night', type: 'positive', color: '#60a5fa' }
    };
}
class ExoplanetPioneer {
    constructor(containerOrId) {
        if (typeof containerOrId === 'string') {
            this.container = document.getElementById(containerOrId);
        } else {
            this.container = containerOrId;
        }

        if (!this.container) {
            console.error("ExoplanetPioneer: Container not found!");
            return;
        }

        // Three.js Components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Game State
        this.day = 1;
        this.timeOfDay = 8; // 8 AM start
        this.temperature = 15; // 15 C
        this.tickRate = 1000;

        // Phase 2: Professional Development
        this.attributes = {
            intelligence: 10,
            memory: 10,
            perception: 10,
            willpower: 10,
            charisma: 10
        };

        this.pilotSkillDefs = this.getPilotSkillDefinitions();
        this.pilotSkills = this.createDefaultPilotSkillsState(this.pilotSkillDefs);

        this.agentMissionDefs = this.getAgentMissionDefinitions();
        this.agentMissions = this.createDefaultAgentMissionsState(this.agentMissionDefs);

        this.isPaused = false;
        this.isCombatActive = false;
        this.autosaveIntervalMs = 120000;
        this.lastAutosaveNotifyAt = 0;
        this.autosaveEnabled = true;
        this.autoloadEnabled = true;

        this.audioMaster = 0.3;
        this.audioMusic = 1.0;
        this.audioSfx = 1.0;
        this.audioMuted = false;
        this.loadSettings();

        this.resources = {
            energy: 50,
            oxygen: 100,
            minerals: 50,
            food: 50,
            data: 0,
            credits: 0,
            alloys: 0,
            circuits: 0
        };
        this.caps = {
            energy: 200,
            oxygen: 200,
            minerals: 100,
            food: 100,
            data: 50,
            alloys: 50,
            circuits: 50,
            helium3: 0  // Moon-exclusive resource
        };
        // Phase 2: Colonists
        this.basePopulationCap = 6;
        this.colonists = [];
        this.structures = []; // Built structures
        this.buildingMeshes = {}; // Map tileId -> Mesh
        this.tiles = []; // Logical game tiles
        this.morale = 100;

        // Moon/Galaxy State
        this.isOnMoon = false;
        this.currentSystemId = 'kepler_186f';
        this.systemSecurity = {
            'kepler_186f': 0.8, // High-Sec
            'wolf_1061c': 0.4,   // Low-Sec
            'trappist_1e': 0.0,  // Null-Sec
            'proxima_b': 1.0     // Core-Sec
        };
        this.systemStates = {};
        this.claims = {}; // { systemId: 'player' }

        // Phase 5: Advanced Fleet & EWAR
        if (typeof JumpBridgeManager !== 'undefined') {
            this.jumpBridges = new JumpBridgeManager(this);
        }
        this.planetData = { name: 'Kepler-186f' };
        this.isGalaxyViewActive = false;
        this.isOrbitalViewActive = false;

        // Cloud Service
        this.cloud = new SupabaseService();

        // Alien Ecosystem
        this.ecosystem = new AlienEcosystem();
        this.ecosystem.init();

        // Production
        this.production = new CraftingManager(this);
        this.production.init();

        // Phase 1: EVE Industry
        this.inventory = [
            { type: 'solar', count: 2 },
            { type: 'hab', count: 1 },
            { type: 'mine', count: 1 }
        ]; // Items ready to be anchored/used
        this.blueprints = [
            { id: 'bpo_solar', type: 'solar', name: 'Solar Array Blueprint', isBPO: true, icon: '⚡' },
            { id: 'bpo_hab', type: 'hab', name: 'Habitat Dome Blueprint', isBPO: true, icon: '🏠' },
            { id: 'bpo_mine', type: 'mine', name: 'Auto-Miner Blueprint', isBPO: true, icon: '⛏️' },
            { id: 'bpo_citadel', type: 'citadel', name: 'Astrahus Citadel Blueprint', isBPO: true, icon: '🏰' }
        ];
        this.industry = {
            jobs: [],
            maxJobs: 2
        };
        this.selectedInventoryItem = null; // Track item selected for anchoring

        // Drones
        this.drones = new DroneController(this);
        this.drones.init();

        // Orbit (init deferred until after scene)
        this.orbit = new OrbitalManager(this);

        // Ship Designer
        this.shipDesigner = new ShipDesigner(this);
        this.shipDesigner.init();
        this.ships = []; // Fleet storage

        // Fleet Manager
        this.fleetManager = new FleetManager(this);
        this.fleetManager.init();

        // Combat System
        this.aliens = new AlienGenerator(this);
        this.combat = new CombatManager(this);

        // Archaeology System
        this.archaeology = new ArchaeologyManager(this);
        this.archaeology.init();

        // Victory System
        this.victory = new VictoryManager(this);
        this.victory.init();

        // Multiplayer System
        this.multiplayer = new MultiplayerManager(this);
        this.multiplayer.init();

        // Performance System
        this.performance = new PerformanceManager(this);
        this.performance.init();

        // Terraforming System (Roadmap)
        this.terraforming = new TerraformingManager(this);
        this.terraforming.init();

        // Tech & Modifiers
        this.technologies = {
            // Tier 1: Basics
            'bio_engineering': { name: 'Bio-Engineering', cost: 20, desc: 'Unlocks Hydroponics Efficiency (+50%)', effect: () => this.modifiers.farmOutput = 1.5, unlocked: false, req: null, pos: { x: 100, y: 300 } },
            'adv_mining': { name: 'Deep Core Mining', cost: 40, desc: 'Unlocks Auto-Miner Efficiency (+50%)', effect: () => this.modifiers.mineOutput = 1.5, unlocked: false, req: null, pos: { x: 100, y: 100 } },

            // Tier 2: Specialized (Requires Tier 1)
            'geothermal': { name: 'Geothermal Siphons', cost: 80, desc: 'Lava Biome adaptation. +Energy from heat.', effect: () => this.unlockBuilding('geothermal'), unlocked: false, req: 'adv_mining', pos: { x: 300, y: 100 } },
            'insulated_habs': { name: 'Cryo-Insulation', cost: 80, desc: 'Ice Biome adaptation. Reduces heating costs.', unlocked: false, req: 'bio_engineering', pos: { x: 300, y: 300 } },
            'quantum_storage': { name: 'Quantum Storage', cost: 100, desc: 'Doubles all storage capacity', effect: () => this.multiplyCaps(2), unlocked: false, req: 'adv_mining', pos: { x: 300, y: 200 } },

            // Tier 3: Advanced
            'fusion_power': { name: 'Fusion Power', cost: 250, desc: 'Unlocks Fusion Reactor (Massive Energy)', effect: () => this.unlockBuilding('fusion'), unlocked: false, req: 'quantum_storage', pos: { x: 500, y: 200 } },
            'atm_terraforming': { name: 'Atm. Filtering', cost: 300, desc: 'Gas Giant adaptation. Allows harvesting atmosphere.', unlocked: false, req: 'geothermal', pos: { x: 500, y: 100 } },
            'warp_drive': { name: 'Warp Drive Opt.', cost: 400, desc: 'Reduces Warp Energy cost by 50%', unlocked: false, req: 'fusion_power', pos: { x: 700, y: 200 } },

            // Tier 4: Victory
            'ascension_gate': { name: 'Ascension Gate', cost: 1000, desc: 'Construct a bridge to higher reality. WINS THE GAME.', effect: () => this.victory.triggerVictory('Science'), unlocked: false, req: 'warp_drive', pos: { x: 900, y: 200 } }
        };
        // Military System
        this.military = new MilitarySystem(this);
        // Merge Military Techs
        Object.assign(this.technologies, this.military.getTechs());

        this.modifiers = {
            farmOutput: 1.0,
            mineOutput: 1.0,
            solarOutput: 1.0,
            researchOutput: 1.0
        };

        // Building Definitions
        this.buildingTypes = {
            'solar': { name: 'Solar Array', cost: { minerals: 20 }, icon: '⚡', output: { energy: 8 }, job: 'engineer', desc: 'Generates Energy', color: 0xfacc15, buildTime: 10, maxLevel: 3, upgradeMult: 1.5 },
            'hab': { name: 'Habitat Dome', cost: { minerals: 50, alloys: 5 }, icon: '🏠', capacity: 5, desc: 'Houses 5 Colonists', color: 0x60a5fa, buildTime: 20, maxLevel: 3, upgradeMult: 1.5 },
            'mine': { name: 'Auto-Miner', cost: { minerals: 40, alloys: 2 }, icon: '⛏️', output: { minerals: 3 }, job: 'miner', desc: 'Extracts Minerals', color: 0x94a3b8, buildTime: 15, maxLevel: 3, upgradeMult: 1.5 },
            'farm': { name: 'Hydroponics', cost: { minerals: 30, alloys: 5 }, icon: '🌱', output: { food: 5 }, job: 'botanist', desc: 'Grows Food', color: 0x4ade80, buildTime: 30 },
            'lab': { name: 'Research Lab', cost: { minerals: 100, circuits: 5 }, icon: '🔬', output: { data: 2 }, job: 'researcher', desc: 'Generates Data', color: 0xa855f7, buildTime: 45 },
            'oxy': { name: 'O2 Generator', cost: { minerals: 40, alloys: 10 }, icon: '💨', output: { oxygen: 6 }, job: 'engineer', desc: 'Produces Oxygen', color: 0xa5f3fc, buildTime: 25 },
            'store': { name: 'Silo', cost: { minerals: 80, alloys: 10 }, icon: '📦', capBoost: 100, desc: 'Increases Storage', color: 0xf472b6, buildTime: 20, maxLevel: 3, upgradeMult: 1.5 },
            'refinery': { name: 'Refinery', cost: { minerals: 120, circuits: 5 }, icon: '🏭', desc: 'Refines Minerals into Alloys', color: 0xff8c00, buildTime: 60, maxLevel: 3, upgradeMult: 1.5 },
            'chip_fab': { name: 'Chip Fab', cost: { alloys: 50, circuits: 10 }, icon: '📟', desc: 'Assembles Circuits', color: 0x00ced1, buildTime: 90, maxLevel: 3, upgradeMult: 1.5 },
            'drone_hub': { name: 'Drone Hub', cost: { alloys: 50, circuits: 10 }, icon: '🚁', desc: 'Center for automation', color: 0xffffff, buildTime: 120 },
            'fusion': { name: 'Fusion Reactor', cost: { alloys: 200, circuits: 50 }, icon: '☢️', output: { energy: 100 }, job: 'engineer', desc: 'Massive Power', color: 0xef4444, buildTime: 300 },
            'launch_site': { name: 'Launch Site', cost: { alloys: 150, circuits: 80 }, icon: '🚀', desc: 'Unlocks Orbital View', color: 0xcbd5e1, buildTime: 180 },
            // Moon-specific buildings
            'helium_mine': { name: 'Helium-3 Extractor', cost: { minerals: 80, alloys: 40 }, icon: '⚛️', output: { helium3: 5 }, job: 'miner', desc: 'Extracts Helium-3 (Moon Only)', color: 0x7dd3fc, buildTime: 45, moonOnly: true },
            'lunar_hab': { name: 'Lunar Habitat', cost: { minerals: 40, alloys: 20 }, icon: '🌙', capacity: 3, desc: 'Houses 3 Colonists (Low-G)', color: 0x94a3b8, buildTime: 30, moonOnly: true },
            'low_g_factory': { name: 'Low-G Factory', cost: { alloys: 60, circuits: 20 }, icon: '🏭', output: { circuits: 3 }, job: 'engineer', desc: '+50% production in low gravity', color: 0xe879f9, moonOnly: true },
            'citadel': { name: 'Astrahus Citadel', cost: { alloys: 500, circuits: 200 }, icon: '🏰', desc: 'Huge Orbital Hub. Reduces all Manufacturing time in system by 25%.', color: 0xffd700, buildTime: 300 }
        };

        this.jobTitles = {
            'unemployed': 'Unemployed',
            'engineer': 'Engineer',
            'miner': 'Miner',
            'botanist': 'Botanist',
            'researcher': 'Researcher'
        };

        const w = this.container.clientWidth;
        const h = this.container.clientHeight || 600;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x020617);
        this.scene.fog = new THREE.FogExp2(0x020617, 0.0015);
        this.clock = new THREE.Clock(); // Initialize Clock early

        this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
        this.camera.position.set(0, 45, 65);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(w, h);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.9;
        this.container.appendChild(this.renderer.domElement);

        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.minDistance = 25; // Closer approach allowed
            this.controls.maxDistance = 200;
            this.controls.enablePan = false; // Disable panning to keep planet centered
            this.controls.enableRotate = true; // Explicitly enable rotation
            this.controls.rotateSpeed = 0.5;
            this.controls.zoomSpeed = 1.2;

            // Ensure canvas handles gestures correctly for controls
            this.renderer.domElement.style.touchAction = 'none';
        }

        // --- MANUAL ROTATION HELPERS ---
        this.rotateLeft = () => {
            if (this.controls) {
                this.camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.1);
                this.camera.lookAt(0, 0, 0);
            }
        };

        this.rotateRight = () => {
            if (this.controls) {
                this.camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), -0.1);
                this.camera.lookAt(0, 0, 0);
            }
        };

        // Lighting
        // Lighting
        this.suns = []; // Track active sun lights/meshes
        this.setupSuns(); // Setup default (single) sun initially

        // Post-Processing
        if (typeof THREE.EffectComposer !== 'undefined' && typeof THREE.RenderPass !== 'undefined') {
            this.composer = new THREE.EffectComposer(this.renderer);
            const renderPass = new THREE.RenderPass(this.scene, this.camera);
            this.composer.addPass(renderPass);

            // Bloom
            const canBloom =
                typeof THREE.UnrealBloomPass !== 'undefined' &&
                typeof THREE.LuminosityHighPassShader !== 'undefined' &&
                THREE.LuminosityHighPassShader &&
                THREE.LuminosityHighPassShader.uniforms;

            if (canBloom) {
                try {
                    this.bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(w, h), 1.5, 0.4, 0.85);
                    this.bloomPass.threshold = 0.5; // Higher threshold to avoid washing out the whole planet
                    this.bloomPass.strength = 0.4;  // Reduced intensity
                    this.bloomPass.radius = 0.3;
                    this.composer.addPass(this.bloomPass);
                } catch {
                    this.bloomPass = null;
                }
            } else {
                this.bloomPass = null;
            }
        }

        const ambient = new THREE.AmbientLight(0x1e293b, 0.4);
        this.scene.add(ambient);

        const hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x0f172a, 0.3);
        this.scene.add(hemiLight);

        this.createBackgroundStars(); // Add reference points

        this.createPlanet();
        this.createAtmosphere();
        this.createCursor();

        // Initialize orbital manager now that scene exists
        this.orbit.init();

        // Initial Population
        for (let i = 0; i < 6; i++) this.addColonist();

        this.createUI();

        this.tryAutoLoadGame();

        this.renderer.domElement.addEventListener('pointerdown', (e) => {
            this.audio.init();
            this.onPointerDown(e);
        });
        this.renderer.domElement.addEventListener('pointermove', (e) => this.onPointerMove(e));

        // Window Resize Handling
        window.addEventListener('resize', () => {
            const width = this.container.clientWidth;
            const height = this.container.clientHeight || 600;

            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();

            this.renderer.setSize(width, height);
            if (this.composer) {
                this.composer.setSize(width, height);
            }
        });

        const ro = new ResizeObserver(() => this.resize());
        ro.observe(this.container);

        // Audio
        this.audio = new SoundEngine();
        this.applyAudioSettings();
        this.log = new Logger();

        // 3D COMBAT SYSTEM INTEGRATION
        if (typeof SpaceCombatScene !== 'undefined') {
            this.combatScene = new SpaceCombatScene(this);
        } else {
            console.warn("SpaceCombatScene script not loaded!");
        }

        this.onGlobalKeyDown = (e) => {
            if (e.repeat) return;

            if (e.code === 'Escape') {
                e.preventDefault();
                this.togglePause();
                return;
            }

            if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
                e.preventDefault();
                this.saveGame();
                return;
            }

            if ((e.ctrlKey || e.metaKey) && e.code === 'KeyL') {
                e.preventDefault();
                this.loadGame();
                return;
            }

            const target = e.target;
            const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
            if (isTyping) return;

            if (e.code === 'KeyR' && this.isCombatActive) {
                e.preventDefault();
                if (this.isPaused) this.togglePause(false);
                this.retreatFromCombat();
                return;
            }

            if (e.code === 'KeyG' && !this.isCombatActive) {
                e.preventDefault();
                if (!this.isPaused) this.toggleGalaxyView();
                return;
            }

            if (e.code === 'KeyC' && !this.isCombatActive) {
                e.preventDefault();
                if (!this.isPaused) this.toggleCinematicMode();
                return;
            }
        };
        window.addEventListener('keydown', this.onGlobalKeyDown);

        this.startAutosave();
    }

    createBackgroundStars() {
        const createLayer = (count, radius, size, opacity) => {
            const bgGeo = new THREE.BufferGeometry();
            const bgPos = new Float32Array(count * 3);
            for (let i = 0; i < count * 3; i += 3) {
                const r = radius * (0.8 + Math.random() * 0.4); // Variance in depth
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                bgPos[i] = r * Math.sin(phi) * Math.cos(theta);
                bgPos[i + 1] = r * Math.sin(phi) * Math.sin(theta);
                bgPos[i + 2] = r * Math.cos(phi);
            }
            bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPos, 3));
            const bgMat = new THREE.PointsMaterial({
                color: 0xffffff,
                size: size,
                transparent: true,
                opacity: opacity,
                sizeAttenuation: false // Keep them distinct dots
            });
            const starfield = new THREE.Points(bgGeo, bgMat);
            this.scene.add(starfield);
            // Store for potential parallax animation if needed later
            if (!this.starLayers) this.starLayers = [];
            this.starLayers.push(starfield);
            return starfield;
        };

        this.starLayers = [];
        // Layer 1: Dense, faint, distant
        createLayer(3000, 1500, 0.5, 0.3);

        // Layer 2: Medium, brighter, mid-range
        createLayer(1000, 1000, 1.0, 0.6);

        // Layer 3: Sparse, bright, close (Parallax heavy)
        createLayer(200, 600, 1.5, 0.9);
    }

    initGalaxyView() {
        if (this.galaxyView) return;
        const container = document.getElementById('ep-galaxy-container');
        if (!container) return;
        this.galaxyView = new GalaxyView(container);
    }

    // Pseudo-random number generator
    seedRandom(seed) {
        let val = seed;
        return function () {
            val = (val * 9301 + 49297) % 233280;
            return val / 233280;
        }
    }

    getTilePos(id) {
        if (this.tiles[id]) return this.tiles[id].position;
        return new THREE.Vector3();
    }

    createPlanet(seed = 12345, type = 'planet') {
        if (this.planetMesh) {
            this.scene.remove(this.planetMesh);
            this.planetMesh.geometry.dispose();
            this.planetMesh.material.dispose();
        }
        if (this.cloudMesh) {
            this.scene.remove(this.cloudMesh);
            this.cloudMesh.geometry.dispose();
            this.cloudMesh.material.dispose();
            this.cloudMesh = null;
        }
        if (this.atmosphereMesh) {
            this.scene.remove(this.atmosphereMesh);
            this.atmosphereMesh.geometry.dispose();
            this.atmosphereMesh.material.dispose();
            this.atmosphereMesh = null;
        }

        // Generate planet mesh via PlanetGenerator
        const generator = new PlanetGenerator(this.scene);
        this.planetMesh = generator.createPlanet(seed, type);

        this.currentWorldSeed = seed;
        this.currentWorldType = type;

        // Generate tiles for game logic
        this.tiles = [];
        const numTiles = 1000;
        const phi = Math.PI * (3 - Math.sqrt(5));
        const rnd = this.seedRandom(seed);

        for (let i = 0; i < numTiles; i++) {
            const y = 1 - (i / (numTiles - 1)) * 2;
            const radius = Math.sqrt(1 - y * y);
            const theta = phi * i;
            const x = Math.cos(theta) * radius;
            const z = Math.sin(theta) * radius;

            // Logical position matches Visual Terrain
            let disp = 0;
            if (window.calculateHeight) { // Check direct function first
                disp = window.calculateHeight(x, y, z);
            } else if (window.getTerrainHeight) {
                disp = window.getTerrainHeight(x, y, z, seed);
            } else {
                if (i === 0) console.error("CRITICAL: No terrain height function found! Buildings will be buried.");
            }

            if (i === 0) console.log(`[Terrain Debug] Tile 0 Disp: ${disp.toFixed(2)} | Pos: ${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)}`);

            const pos = new THREE.Vector3(x, y, z).multiplyScalar(50 + disp);

            // Determine Tile Type based on Height (Logic Sync)
            let tileType = 'plains';
            // disp > 7.0 is Peak (Snow/Rock)
            // disp > 4.0 is High Grass/Rock
            // disp <= 0.0 is Water (Should not happen for tiles usually unless we want water tiles)

            // Map height to types
            if (disp > 6.0) tileType = 'mountain';
            else if (disp < 0.2) tileType = 'crater'; // Lowlands/Water -> Crater for gameplay?
            // else plains

            // Keep random variance for craters?
            // Blend logic: mostly height based, but some randomness

            this.tiles.push({
                id: i,
                position: pos,
                type: tileType,
                building: null,
                life: null
            });
            if (this.ecosystem) {
                const life = this.ecosystem.populateTile(i, tileType);
                this.tiles[i].life = life;
            }
        }

        // Recreate atmosphere and clouds for planets only
        if (type === 'planet') {
            this.createAtmosphere();
        }
    }

    createAtmosphere() {
        // Radius 54 (Planet 50 + Mountains ~3.0) -> Tight fit
        const atmoGeo = new THREE.SphereGeometry(54, 128, 128); // Increased segs for smoothness
        const atmoMat = new THREE.ShaderMaterial({
            uniforms: {
                sunDirection: { value: new THREE.Vector3(1, 0, 0) },
                colorDay: { value: new THREE.Color(0x00aaff) },
                colorSunset: { value: new THREE.Color(0xff4500) },
                viewVector: { value: new THREE.Vector3(0, 0, 1) }
            },
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vPosition;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vPosition = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 sunDirection;
                uniform vec3 colorDay;
                uniform vec3 colorSunset;
                varying vec3 vNormal;
                varying vec3 vPosition;
                
                void main() {
                    vec3 viewDir = normalize(cameraPosition - vPosition); // World space approx
                    // Fix: vPosition is local, need world for correct viewDir if camera moves? 
                    // Simplifying: dot(vNormal, viewDir) works for rim ID in view space mostly
                    
                    // Intensity based on rim (Fresnel)
                    float intensity = pow(0.65 - dot(vNormal, vec3(0,0,1)), 4.0);
                    // Actual view vector calculation in VS would be better but VdotN is cheap in view space if normalMatrix used properly
                    // Let's use standard Fresno trick
                    vec3 normal = normalize(vNormal);
                    float rim = 1.0 - max(dot(normal, vec3(0,0,1)), 0.0);
                    rim = pow(rim, 4.0);

                    // Sun influence
                    float sun = max(dot(normal, sunDirection), 0.0);
                    
                    // Scattering Color Mixing
                    // If sun is low (near 0 dot), we get sunset color
                    // This creates a band of red at the terminator
                    float terminator = smoothstep(-0.2, 0.2, sun);
                    float sunset = 1.0 - abs(sun * 2.0); 
                    sunset = pow(sunset, 4.0); // Narrow band
                    
                    vec3 finalColor = mix(colorDay, colorSunset, sunset * 0.8);
                    
                    // Fade out on night side
                    float nightFade = smoothstep(-0.4, 0.1, dot(normal, sunDirection));
                    
                    gl_FragColor = vec4(finalColor, rim * nightFade * 0.8);
                }
            `,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide,
            transparent: true,
            depthWrite: false
        });

        this.atmosphereMesh = new THREE.Mesh(atmoGeo, atmoMat);
        this.atmosphereMesh.name = 'Atmosphere';
        this.scene.add(this.atmosphereMesh);
        this.createClouds();
    }

    createClouds() {
        // Radius 53 (Clear of mountains at ~52)
        const cloudGeo = new THREE.SphereGeometry(53, 128, 128); // Higher seg
        const loader = new THREE.TextureLoader();
        const cloudTex = loader.load('planet_clouds.png'); // Ensure this texture exists or use noise

        // Custom Cloud Shader for Depth/Shadows
        const cloudMat = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: { value: cloudTex },
                sunDirection: { value: new THREE.Vector3(1, 0, 0) },
                time: { value: 0 }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vPosition;
                
                void main() {
                    vUv = uv;
                    vNormal = normalize(normalMatrix * normal);
                    vPosition = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform vec3 sunDirection;
                uniform float time;
                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vPosition;

                void main() {
                    // Moving clouds
                    vec2 uv = vUv;
                    uv.x -= time * 0.005; 
                    
                    vec4 texColor = texture2D(tDiffuse, uv);
                    
                    // Simple lighting
                    vec3 normal = normalize(vNormal);
                    float sun = max(dot(normal, sunDirection), 0.0);
                    
                    // Rim light for clouds
                    float rim = 1.0 - max(dot(normal, vec3(0,0,1)), 0.0);
                    rim = pow(rim, 3.0);
                    
                    vec3 cloudColor = vec3(1.0, 1.0, 1.0);
                    vec3 shadowColor = vec3(0.1, 0.1, 0.2);
                    
                    // Terminator darkening
                    vec3 finalColor = mix(shadowColor, cloudColor, sun);
                    finalColor += vec3(rim * 0.5);

                    gl_FragColor = vec4(finalColor, texColor.a * 0.8 * (sun + 0.2)); 
                }
            `,
            transparent: true,
            blending: THREE.NormalBlending,
            side: THREE.DoubleSide
        });

        this.cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
        this.scene.add(this.cloudMesh);
    }

    createCursor() {
        const geo = new THREE.RingGeometry(1.5, 1.8, 6);
        const mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
        this.cursorMesh = new THREE.Mesh(geo, mat);
        this.cursorMesh.visible = false;
        this.scene.add(this.cursorMesh);
    }

    createUI() {
        let ui = document.getElementById('ep-ui');
        if (ui) ui.remove();

        ui = document.createElement('div');
        ui.id = 'ep-ui';
        ui.style.pointerEvents = 'none'; // Allow clicks to pass through to canvas

        ui.innerHTML = `
            <div class="ep-top-bar">
                <div class="ep-resource-panel" id="ep-res-panel"></div>
                <div style="display:flex; align-items:center;">
                        <button class="ep-sys-btn" onclick="window.game.launchFighters()" style="background:rgba(220, 38, 38, 0.3); border-color:#ef4444; color:#fff; margin-right:10px;" title="Launch Fighters" aria-label="Launch Fighters">🚀 COMBAT</button>
                        <button class="ep-sys-btn" id="ep-btn-galaxy" title="Galaxy View" aria-label="Galaxy View">🌌</button>
                        <button class="ep-sys-btn" id="ep-btn-save" title="Save Game" aria-label="Save Game">💾</button>
                        <button class="ep-sys-btn" id="ep-btn-load" title="Load Game" aria-label="Load Game">📂</button>
                        <button class="ep-sys-btn" id="ep-btn-tech" title="Research" aria-label="Research">🔬</button>
                        <button class="ep-sys-btn" id="ep-btn-industry" title="Industrial Operations" aria-label="Industrial Operations">🏭</button>
                        <button class="ep-sys-btn" id="ep-btn-xeno" title="Xenodex" aria-label="Xenodex">👽</button>
                        <button class="ep-sys-btn" id="ep-btn-roster" title="Colony Roster" aria-label="Colony Roster">📋</button>
                        <button class="ep-sys-btn" id="ep-btn-fleet" title="Fleet" aria-label="Fleet">🚀</button>
                        <button class="ep-sys-btn" id="ep-btn-skills" title="Pilot Skills" aria-label="Pilot Skills">🧠</button>
                        <button class="ep-sys-btn" id="ep-btn-missions" title="Agent Missions" aria-label="Agent Missions">📜</button>
                        <button class="ep-sys-btn" id="ep-btn-archaeology" title="Archaeology" aria-label="Archaeology">🏺</button>
                        <button class="ep-sys-btn" id="ep-btn-profile" title="Profile" aria-label="Profile">👤</button>
                        <button class="ep-sys-btn" id="ep-btn-trade" title="Trade" aria-label="Trade">💰</button>
                        <button class="ep-sys-btn" id="ep-btn-terra" onclick="window.game.terraforming.toggleUI()" title="Terraforming Status" aria-label="Terraforming Status">🌍</button>
                        <button class="ep-sys-btn" id="ep-btn-cloud" title="Cloud Services" aria-label="Cloud Services">☁️</button>
                        <button class="ep-sys-btn" id="ep-btn-claim" title="Claim System" aria-label="Claim System" style="border-color:var(--ep-color-danger); color:var(--ep-color-danger);">🚩</button>
                        <button class="ep-sys-btn" id="ep-btn-cinematic" title="Cinematic Mode" aria-label="Cinematic Mode" style="display:none;">🎬</button>
                </div>
            </div>
            
            <div id="ep-left-hud" style="position:absolute; top:80px; left:20px; color:#fff; font-family:'Orbitron'; pointer-events:none;">
                <div style="font-size:1.5rem; text-shadow:0 0 10px #000;">KEPLER-186f</div>
                <div id="ep-morale-display" style="margin-top:0.5rem; display:flex; align-items:center; gap:0.5rem; background:rgba(0,0,0,0.6); padding:0.5rem; border-radius:5px; pointer-events:auto;">
                    <span id="ep-morale-icon" style="font-size:1.5rem;">😐</span> 
                    <div>
                        <div style="font-size:0.8rem; color:#aaa;">Morale</div>
                        <div id="ep-morale-value" style="font-weight:bold; color:#fff;">100%</div>
                    </div>
                </div>
                <div id="ep-day-display" style="margin-top:0.5rem; font-size:0.9rem; color:#cbd5e1; background:rgba(0,0,0,0.6); padding:0.3rem;">Day 1</div>
            </div>
            
            <button id="ep-btn-cinematic-toggle" style="position:absolute; bottom:20px; right:20px; background:transparent; border:none; font-size:2em; cursor:pointer; opacity:0.5; transition:opacity 0.3s; pointer-events: auto;" title="Cinematic Mode" aria-label="Cinematic Mode">
                🎥
            </button>

            <div class="ep-bottom-bar">
                <div class="ep-build-menu" id="ep-build-menu"></div>
            </div>
            <div id="ep-tooltip" class="ep-tooltip" style="display:none;"></div>
            <div id="ep-notifications" style="position:absolute; top:80px; right:20px; width:300px; display:flex; flex-direction:column; gap:10px; pointer-events:none;"></div>

            <!-- Tech Tree Modal -->
            <div class="ep-modal-overlay" id="ep-tech-modal" style="display:none;">
                <div class="ep-modal">
                    <div class="ep-modal-header">
                        <h2 style="margin:0; color:#a855f7;">🔬 Research</h2>
                        <button class="ep-sys-btn" onclick="document.getElementById('ep-tech-modal').style.display='none'">CLOSE</button>
                    </div>
                    <div class="ep-modal-body">
                        <div class="ep-tech-grid" id="ep-tech-grid"></div>
                    </div>
                </div>
            </div>

            <!-- Xenodex Modal -->
            <div class="ep-modal-overlay" id="ep-xenodex-modal" style="display:none;">
                <div class="ep-modal" style="width:600px;">
                    <div class="ep-modal-header">
                        <h2 style="margin:0; color:#4ade80;">🌿 Xenodex - Discovered Species</h2>
                        <button class="ep-sys-btn" onclick="document.getElementById('ep-xenodex-modal').style.display='none'">CLOSE</button>
                    </div>
                    <div class="ep-modal-body" id="ep-xenodex-content"></div>
                </div>
            </div>

            <!-- Roster Modal -->
            <div class="ep-modal-overlay" id="ep-roster-modal" style="display:none;">
                <div class="ep-modal">
                    <div class="ep-modal-header">
                         <h2 style="margin:0; color:#38bdf8;">👥 Colony Roster</h2>
                         <button class="ep-sys-btn" onclick="document.getElementById('ep-roster-modal').style.display='none'">CLOSE</button>
                    </div>
                    <div class="ep-modal-body">
                        <table style="width:100%; border-collapse:collapse; color:#fff;">
                            <thead>
                                <tr style="border-bottom:1px solid #444; text-align:left;">
                                    <th style="padding:0.5rem;">Name</th>
                                    <th>Job</th>
                                    <th>Morale</th>
                                    <th>Needs</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody id="ep-roster-list"></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Industry Modal -->
            <div class="ep-modal-overlay" id="ep-industry-modal" style="display:none;">
                <div class="ep-modal" style="width:800px; max-width:92vw; height:auto; max-height:92vh;">
                    <div class="ep-modal-header">
                         <h2 style="margin:0; color:#4ade80;">🏭 Industrial Operations</h2>
                         <button class="ep-sys-btn" onclick="document.getElementById('ep-industry-modal').style.display='none'">CLOSE</button>
                    </div>
                    <div class="ep-modal-body" id="ep-industry-content" style="padding:1.5rem; background: radial-gradient(circle at center, #0f172a 0%, #020617 100%);"></div>
                </div>
            </div>

            <!-- Skills Modal -->
            <div class="ep-modal-overlay" id="ep-skills-modal" style="display:none;">
                <div class="ep-modal" style="width:760px; max-width:92vw; height:auto; max-height:92vh;">
                    <div class="ep-modal-header">
                        <h2 style="margin:0; color:#38bdf8;">🧠 Pilot Skills</h2>
                        <button class="ep-sys-btn" onclick="document.getElementById('ep-skills-modal').style.display='none'">CLOSE</button>
                    </div>
                    <div class="ep-modal-body" id="ep-skills-content" style="padding:1.5rem; background: radial-gradient(circle at center, #0f172a 0%, #020617 100%);"></div>
                </div>
            </div>

            <!-- Missions Modal -->
            <div class="ep-modal-overlay" id="ep-missions-modal" style="display:none;">
                <div class="ep-modal" style="width:760px; max-width:92vw; height:auto; max-height:92vh;">
                    <div class="ep-modal-header">
                        <h2 style="margin:0; color:#38bdf8;">📜 Agent Missions</h2>
                        <button class="ep-sys-btn" onclick="document.getElementById('ep-missions-modal').style.display='none'">CLOSE</button>
                    </div>
                    <div class="ep-modal-body" id="ep-missions-content" style="padding:1.5rem; background: radial-gradient(circle at center, #0f172a 0%, #020617 100%);"></div>
                </div>
            </div>

            <!-- CRISPR Lab Modal -->
            <div class="ep-modal-overlay" id="ep-crispr-modal" style="display:none;">
                 <div class="ep-modal" style="width:800px; max-width:90vw;">
                    <div class="ep-modal-header">
                         <h2 style="margin:0; color:#a855f7;">🧬 CRISPR Lab</h2>
                         <button class="ep-sys-btn" onclick="document.getElementById('ep-crispr-modal').style.display='none'">CLOSE</button>
                    </div>
                    <div class="ep-modal-body" id="ep-crispr-content"></div>
                 </div>
            </div>

            <!-- Cloud Modal -->
            <div class="ep-modal-overlay" id="ep-cloud-modal" style="display:none;">
                <div class="ep-modal" style="width:400px;">
                    <div class="ep-modal-header">
                        <h2 style="margin:0; color:#38bdf8;">☁️ Cloud Services</h2>
                        <button class="ep-sys-btn" onclick="document.getElementById('ep-cloud-modal').style.display='none'">x</button>
                    </div>
                    <div class="ep-modal-body" id="ep-cloud-content"></div>
                </div>
            </div>

            <!-- Building Details Modal -->
            <div class="ep-modal-overlay" id="ep-building-modal" style="display:none; z-index:3000;">
                <div class="ep-modal" style="width:400px;">
                    <div class="ep-modal-header">
                        <h2 style="margin:0; color:#cbd5e1;" id="ep-bld-title">Building</h2>
                        <button class="ep-sys-btn" onclick="document.getElementById('ep-building-modal').style.display='none'">X</button>
                    </div>
                    <div class="ep-modal-body" id="ep-bld-content"></div>
                </div>
            </div>

            <!-- System Action Modal -->
            <div class="ep-modal-overlay" id="ep-system-modal" style="display:none; z-index:3000;">
                <div class="ep-modal" style="width:500px;">
                    <div class="ep-modal-header">
                        <h2 style="margin:0; color:#f87171;">🚀 Sector Action</h2>
                        <button class="ep-sys-btn" onclick="document.getElementById('ep-system-modal').style.display='none'">CANCEL</button>
                    </div>
                    <div class="ep-modal-body" id="ep-system-content"></div>
                </div>
            </div>
        `;

        this.container.appendChild(ui);

        // Galaxy Container
        const galContainer = document.createElement('div');
        galContainer.id = 'ep-galaxy-container';
        galContainer.style.position = 'absolute';
        galContainer.style.top = '0';
        galContainer.style.left = '0';
        galContainer.style.width = '100%';
        galContainer.style.height = '100%';
        galContainer.style.zIndex = '10';
        galContainer.style.background = 'black';
        galContainer.style.display = 'none';
        this.container.insertBefore(galContainer, ui);

        this.updateResourceUI();
        this.createBuildMenu();

        // Listeners
        this.container.querySelector('#ep-btn-galaxy').onclick = () => { this.audio.playClick(); this.toggleGalaxyView(); };
        this.container.querySelector('#ep-btn-save').onclick = () => { this.audio.playClick(); this.saveGame(); };
        this.container.querySelector('#ep-btn-load').onclick = () => { this.audio.playClick(); this.loadGame(); };
        this.container.querySelector('#ep-btn-tech').onclick = () => { this.audio.playClick(); this.openTechTree(); };
        this.container.querySelector('#ep-btn-industry').onclick = () => { this.audio.playClick(); this.openIndustry(); };
        this.container.querySelector('#ep-btn-xeno').onclick = () => { this.audio.playClick(); this.openXenodex(); };
        this.container.querySelector('#ep-btn-roster').onclick = () => { this.audio.playClick(); this.openRoster(); };
        this.container.querySelector('#ep-btn-fleet').onclick = () => { this.audio.playClick(); this.fleetManager.openFleetUI(); };
        this.container.querySelector('#ep-btn-skills').onclick = () => { this.audio.playClick(); this.openSkills(); };
        this.container.querySelector('#ep-btn-missions').onclick = () => { this.audio.playClick(); this.openMissions(); };
        this.container.querySelector('#ep-btn-archaeology').onclick = () => { this.audio.playClick(); this.archaeology.openUI(); };
        this.container.querySelector('#ep-btn-profile').onclick = () => { this.audio.playClick(); this.openProfile(); };

        const tradeBtn = this.container.querySelector('#ep-btn-trade');
        if (tradeBtn) {
            if (typeof window.isFeatureEnabled === 'function' && !window.isFeatureEnabled('TRADING')) {
                tradeBtn.style.display = 'none';
            } else {
                tradeBtn.onclick = () => { this.audio.playClick(); this.openMarket(); };
            }
        }

        this.container.querySelector('#ep-btn-cloud').onclick = () => { this.audio.playClick(); this.openCloudMenu(); };
        this.container.querySelector('#ep-btn-claim').onclick = () => { this.audio.playClick(); this.claimCurrentSystem(); };
        this.container.querySelector('#ep-btn-cinematic').onclick = () => { this.toggleCinematicMode(); };

        // Toggle Listener
        this.container.querySelector('#ep-btn-cinematic-toggle').onclick = () => { this.toggleCinematicMode(); };

        this.ensurePauseUI();
    }

    toggleCinematicMode() {
        this.isCinematic = !this.isCinematic;
        const ui = document.getElementById('ep-ui');
        if (!ui) return;
        const toggleBtn = document.getElementById('ep-btn-cinematic-toggle');

        ui.classList.toggle('ep-cinematic', this.isCinematic);
        document.querySelectorAll('.ep-modal-overlay').forEach(el => el.style.display = 'none');

        if (toggleBtn) {
            toggleBtn.textContent = this.isCinematic ? '❌' : '🎥';
            toggleBtn.title = this.isCinematic ? 'Exit Cinematic Mode' : 'Cinematic Mode';
        }

        this.notify(this.isCinematic ? 'Cinematic Mode Active' : 'Cinematic Mode Disabled', 'info');
    }

    loadSettings() {
        try {
            const json = localStorage.getItem('ep_settings_v1');
            if (!json) return;
            const data = JSON.parse(json);
            if (typeof data.autosaveEnabled === 'boolean') this.autosaveEnabled = data.autosaveEnabled;
            if (typeof data.autoloadEnabled === 'boolean') this.autoloadEnabled = data.autoloadEnabled;
            if (typeof data.autosaveIntervalMs === 'number' && Number.isFinite(data.autosaveIntervalMs)) {
                const ms = data.autosaveIntervalMs;
                if (ms >= 15000 && ms <= 3600000) this.autosaveIntervalMs = ms;
            }

            if (typeof data.audioMaster === 'number' && Number.isFinite(data.audioMaster)) {
                this.audioMaster = Math.max(0, Math.min(1, data.audioMaster));
            }
            if (typeof data.audioMusic === 'number' && Number.isFinite(data.audioMusic)) {
                this.audioMusic = Math.max(0, Math.min(1, data.audioMusic));
            }
            if (typeof data.audioSfx === 'number' && Number.isFinite(data.audioSfx)) {
                this.audioSfx = Math.max(0, Math.min(1, data.audioSfx));
            }
            if (typeof data.audioMuted === 'boolean') this.audioMuted = data.audioMuted;
        } catch (e) { }
    }

    saveSettings() {
        try {
            localStorage.setItem('ep_settings_v1', JSON.stringify({
                autosaveEnabled: this.autosaveEnabled,
                autosaveIntervalMs: this.autosaveIntervalMs,
                autoloadEnabled: this.autoloadEnabled,
                audioMaster: this.audioMaster,
                audioMusic: this.audioMusic,
                audioSfx: this.audioSfx,
                audioMuted: this.audioMuted
            }));
        } catch (e) { }
    }

    applyAudioSettings() {
        if (!this.audio) return;

        const clamp01 = (v, fallback) => {
            if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
            if (v < 0) return 0;
            if (v > 1) return 1;
            return v;
        };

        const master = clamp01(this.audioMaster, 0.3);
        const music = clamp01(this.audioMusic, 1);
        const sfx = clamp01(this.audioSfx, 1);
        const muted = !!this.audioMuted;

        if (this.audio.masterGain) this.audio.masterGain.gain.value = muted ? 0 : master;
        if (this.audio.musicGain) this.audio.musicGain.gain.value = music;
        if (this.audio.sfxGain) this.audio.sfxGain.gain.value = sfx;
    }

    ensurePauseUI() {
        let modal = document.getElementById('ep-pause-modal');
        if (modal) return;

        modal = document.createElement('div');
        modal.id = 'ep-pause-modal';
        modal.className = 'ep-modal-overlay';
        modal.style.display = 'none';
        modal.style.zIndex = '8000';
        modal.innerHTML = `
            <div class="ep-modal" style="width:520px; max-width:92vw; height:auto; max-height:92vh;">
                <div class="ep-modal-header">
                    <h2 style="margin:0; color:#fbbf24;">⏸ PAUSED</h2>
                    <button class="ep-sys-btn" id="ep-pause-close">RESUME</button>
                </div>
                <div class="ep-modal-body" style="padding:1.5rem; background: radial-gradient(circle at center, #0f172a 0%, #020617 100%);">
                    <div style="margin-bottom:1rem; color:#cbd5e1;">Game is paused.</div>
                    <div style="display:flex; gap:10px; flex-wrap:wrap;">
                        <button class="ep-sys-btn" id="ep-pause-resume">▶ Resume (Esc)</button>
                        <button class="ep-sys-btn" id="ep-pause-save">💾 Save (Ctrl+S)</button>
                        <button class="ep-sys-btn" id="ep-pause-load">📂 Load (Ctrl+L)</button>
                        <button class="ep-sys-btn" id="ep-pause-retreat" style="display:none; border-color:#ef4444; color:#ef4444;">↩ Retreat (R)</button>
                    </div>
                    <div style="margin-top:1rem; padding-top:1rem; border-top:1px solid rgba(148,163,184,0.25);">
                        <div style="margin-bottom:0.75rem; color:#cbd5e1; font-weight:600;">Settings</div>
                        <label style="display:flex; align-items:center; gap:8px; color:#cbd5e1; margin-bottom:0.75rem;">
                            <input type="checkbox" id="ep-setting-autosave">
                            Autosave (Local)
                        </label>
                        <label style="display:flex; align-items:center; gap:8px; color:#cbd5e1; margin-bottom:0.75rem;">
                            <input type="checkbox" id="ep-setting-autoload">
                            Auto-load (Local)
                        </label>
                        <label style="display:flex; align-items:center; gap:10px; color:#cbd5e1;">
                            Interval
                            <select id="ep-setting-autosave-interval" style="padding:6px 10px; border-radius:8px; background:rgba(15,23,42,0.8); color:#e2e8f0; border:1px solid rgba(148,163,184,0.3); outline:none;">
                                <option value="30000">30 sec</option>
                                <option value="60000">1 min</option>
                                <option value="120000">2 min</option>
                                <option value="300000">5 min</option>
                            </select>
                        </label>

                        <div style="margin-top:1rem; padding-top:1rem; border-top:1px solid rgba(148,163,184,0.25);">
                            <div style="margin-bottom:0.75rem; color:#cbd5e1; font-weight:600;">Audio</div>
                            <label style="display:flex; align-items:center; gap:8px; color:#cbd5e1; margin-bottom:0.75rem;">
                                <input type="checkbox" id="ep-setting-audio-mute">
                                Mute
                            </label>

                            <div style="display:grid; grid-template-columns:90px 1fr 50px; gap:10px; align-items:center; color:#cbd5e1; margin-bottom:0.5rem;">
                                <div>Master</div>
                                <input type="range" min="0" max="100" step="1" id="ep-setting-audio-master" style="width:100%; accent-color:#38bdf8;">
                                <div id="ep-setting-audio-master-val" style="text-align:right; color:#94a3b8;">30%</div>
                            </div>
                            <div style="display:grid; grid-template-columns:90px 1fr 50px; gap:10px; align-items:center; color:#cbd5e1; margin-bottom:0.5rem;">
                                <div>Music</div>
                                <input type="range" min="0" max="100" step="1" id="ep-setting-audio-music" style="width:100%; accent-color:#38bdf8;">
                                <div id="ep-setting-audio-music-val" style="text-align:right; color:#94a3b8;">100%</div>
                            </div>
                            <div style="display:grid; grid-template-columns:90px 1fr 50px; gap:10px; align-items:center; color:#cbd5e1;">
                                <div>SFX</div>
                                <input type="range" min="0" max="100" step="1" id="ep-setting-audio-sfx" style="width:100%; accent-color:#38bdf8;">
                                <div id="ep-setting-audio-sfx-val" style="text-align:right; color:#94a3b8;">100%</div>
                            </div>
                        </div>

                        <div style="margin-top:0.9rem; display:flex; gap:10px; flex-wrap:wrap;">
                            <button class="ep-sys-btn" id="ep-setting-reset" style="border-color:#f59e0b; color:#fbbf24;">♻ Reset Settings</button>
                        </div>
                    </div>
                    <div style="margin-top:1.25rem; padding-top:1rem; border-top:1px solid rgba(148,163,184,0.25);">
                        <div style="margin-bottom:0.75rem; color:#cbd5e1; font-weight:600;">Keybinds</div>
                        <div style="font-size:0.85rem; color:#94a3b8; line-height:1.4;">
                            Esc: Pause/Resume<br>
                            R: Retreat (combat)<br>
                            Ctrl+S: Save, Ctrl+L: Load<br>
                            G: Galaxy View, C: Cinematic Mode
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const close = () => this.togglePause(false);
        const closeBtn = document.getElementById('ep-pause-close');
        const resumeBtn = document.getElementById('ep-pause-resume');
        const saveBtn = document.getElementById('ep-pause-save');
        const loadBtn = document.getElementById('ep-pause-load');
        const retreatBtn = document.getElementById('ep-pause-retreat');
        const autosaveToggle = document.getElementById('ep-setting-autosave');
        const autoloadToggle = document.getElementById('ep-setting-autoload');
        const autosaveInterval = document.getElementById('ep-setting-autosave-interval');
        const audioMute = document.getElementById('ep-setting-audio-mute');
        const audioMaster = document.getElementById('ep-setting-audio-master');
        const audioMusic = document.getElementById('ep-setting-audio-music');
        const audioSfx = document.getElementById('ep-setting-audio-sfx');
        const audioMasterVal = document.getElementById('ep-setting-audio-master-val');
        const audioMusicVal = document.getElementById('ep-setting-audio-music-val');
        const audioSfxVal = document.getElementById('ep-setting-audio-sfx-val');
        const resetBtn = document.getElementById('ep-setting-reset');

        if (autosaveToggle) autosaveToggle.checked = this.autosaveEnabled !== false;
        if (autoloadToggle) autoloadToggle.checked = this.autoloadEnabled !== false;
        if (autosaveInterval) {
            autosaveInterval.value = String(this.autosaveIntervalMs || 120000);
            autosaveInterval.disabled = !this.autosaveEnabled;
        }

        const syncAudioUI = () => {
            const masterPct = Math.round((this.audioMaster ?? 0.3) * 100);
            const musicPct = Math.round((this.audioMusic ?? 1) * 100);
            const sfxPct = Math.round((this.audioSfx ?? 1) * 100);

            if (audioMute) audioMute.checked = !!this.audioMuted;
            if (audioMaster) audioMaster.value = String(masterPct);
            if (audioMasterVal) audioMasterVal.textContent = `${masterPct}%`;
            if (audioMusic) audioMusic.value = String(musicPct);
            if (audioMusicVal) audioMusicVal.textContent = `${musicPct}%`;
            if (audioSfx) audioSfx.value = String(sfxPct);
            if (audioSfxVal) audioSfxVal.textContent = `${sfxPct}%`;
        };
        syncAudioUI();

        const setPctFromRange = (kind, el, outEl) => {
            if (!el) return;
            const v = parseInt(el.value, 10);
            if (!Number.isFinite(v)) return;
            const n = Math.max(0, Math.min(100, v)) / 100;
            const pct = Math.round(n * 100);
            if (outEl) outEl.textContent = `${pct}%`;

            if (kind === 'master') this.audioMaster = n;
            if (kind === 'music') this.audioMusic = n;
            if (kind === 'sfx') this.audioSfx = n;

            this.applyAudioSettings();
        };

        if (audioMute) audioMute.onchange = () => {
            this.audioMuted = !!audioMute.checked;
            this.saveSettings();
            this.applyAudioSettings();
        };

        if (audioMaster) {
            audioMaster.oninput = () => setPctFromRange('master', audioMaster, audioMasterVal);
            audioMaster.onchange = () => this.saveSettings();
        }
        if (audioMusic) {
            audioMusic.oninput = () => setPctFromRange('music', audioMusic, audioMusicVal);
            audioMusic.onchange = () => this.saveSettings();
        }
        if (audioSfx) {
            audioSfx.oninput = () => setPctFromRange('sfx', audioSfx, audioSfxVal);
            audioSfx.onchange = () => this.saveSettings();
        }

        if (resetBtn) resetBtn.onclick = () => {
            try { localStorage.removeItem('ep_settings_v1'); } catch (e) { }

            this.autosaveEnabled = true;
            this.autosaveIntervalMs = 120000;
            this.autoloadEnabled = true;

            this.audioMaster = 0.3;
            this.audioMusic = 1.0;
            this.audioSfx = 1.0;
            this.audioMuted = false;

            if (autosaveToggle) autosaveToggle.checked = true;
            if (autoloadToggle) autoloadToggle.checked = true;
            if (autosaveInterval) {
                autosaveInterval.value = String(this.autosaveIntervalMs);
                autosaveInterval.disabled = false;
            }

            syncAudioUI();
            this.applyAudioSettings();
            this.startAutosave(true);
            this.notify('Settings reset to defaults.', 'info');
        };

        if (autosaveToggle) autosaveToggle.onchange = () => {
            this.autosaveEnabled = !!autosaveToggle.checked;
            if (autosaveInterval) autosaveInterval.disabled = !this.autosaveEnabled;
            this.saveSettings();
            this.startAutosave(true);
        };

        if (autoloadToggle) autoloadToggle.onchange = () => {
            this.autoloadEnabled = !!autoloadToggle.checked;
            this.saveSettings();
        };

        if (autosaveInterval) autosaveInterval.onchange = () => {
            const next = parseInt(autosaveInterval.value, 10);
            if (!Number.isFinite(next) || next < 15000) return;
            this.autosaveIntervalMs = next;
            this.saveSettings();
            this.startAutosave(true);
        };

        if (closeBtn) closeBtn.onclick = close;
        if (resumeBtn) resumeBtn.onclick = close;
        if (saveBtn) saveBtn.onclick = () => this.saveGame();
        if (loadBtn) loadBtn.onclick = () => this.loadGame();
        if (retreatBtn) retreatBtn.onclick = () => {
            if (this.isCombatActive) {
                this.togglePause(false);
                this.retreatFromCombat();
            }
        };

        modal.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });
    }

    openPauseMenu() {
        this.ensurePauseUI();
        const modal = document.getElementById('ep-pause-modal');
        if (!modal) return;
        modal.style.display = 'flex';

        const retreatBtn = document.getElementById('ep-pause-retreat');
        if (retreatBtn) retreatBtn.style.display = this.isCombatActive ? 'inline-flex' : 'none';

        const autosaveToggle = document.getElementById('ep-setting-autosave');
        const autoloadToggle = document.getElementById('ep-setting-autoload');
        const autosaveInterval = document.getElementById('ep-setting-autosave-interval');
        if (autosaveToggle) autosaveToggle.checked = this.autosaveEnabled !== false;
        if (autoloadToggle) autoloadToggle.checked = this.autoloadEnabled !== false;
        if (autosaveInterval) {
            autosaveInterval.value = String(this.autosaveIntervalMs || 120000);
            autosaveInterval.disabled = !this.autosaveEnabled;
        }

        const audioMute = document.getElementById('ep-setting-audio-mute');
        const audioMaster = document.getElementById('ep-setting-audio-master');
        const audioMusic = document.getElementById('ep-setting-audio-music');
        const audioSfx = document.getElementById('ep-setting-audio-sfx');
        const audioMasterVal = document.getElementById('ep-setting-audio-master-val');
        const audioMusicVal = document.getElementById('ep-setting-audio-music-val');
        const audioSfxVal = document.getElementById('ep-setting-audio-sfx-val');

        const setRangePct = (el, val, outEl, fallback) => {
            if (!el && !outEl) return;
            const n = (typeof val === 'number' && Number.isFinite(val)) ? val : fallback;
            const pct = Math.round(Math.max(0, Math.min(1, n)) * 100);
            if (el) el.value = String(pct);
            if (outEl) outEl.textContent = `${pct}%`;
        };

        if (audioMute) audioMute.checked = !!this.audioMuted;
        setRangePct(audioMaster, this.audioMaster, audioMasterVal, 0.3);
        setRangePct(audioMusic, this.audioMusic, audioMusicVal, 1);
        setRangePct(audioSfx, this.audioSfx, audioSfxVal, 1);
    }

    closePauseMenu() {
        const modal = document.getElementById('ep-pause-modal');
        if (!modal) return;
        modal.style.display = 'none';
    }

    togglePause(forceState = null) {
        const nextState = (typeof forceState === 'boolean') ? forceState : !this.isPaused;
        if (nextState === this.isPaused) return;

        this.isPaused = nextState;

        if (this.isPaused) {
            this._prePauseControlsEnabled = (this.controls ? this.controls.enabled : null);
            if (this.controls) this.controls.enabled = false;
            this.openPauseMenu();
        } else {
            this.closePauseMenu();
            if (this.controls && this._prePauseControlsEnabled !== null) {
                this.controls.enabled = this._prePauseControlsEnabled;
            }
        }
    }

    startAutosave(forceRestart = false) {
        if (this.autosaveTimer) {
            if (!forceRestart) return;
            clearInterval(this.autosaveTimer);
            this.autosaveTimer = null;
        }

        if (this.autosaveEnabled === false) return;

        this.autosaveTimer = setInterval(() => {
            if (this.isPaused) return;
            this.saveGame({ silent: true });

            const now = Date.now();
            if (!this.lastAutosaveNotifyAt || (now - this.lastAutosaveNotifyAt) > 300000) {
                this.notify('Autosaved (Local).', 'info');
                this.lastAutosaveNotifyAt = now;
            }
        }, this.autosaveIntervalMs);
    }

    getPilotSkillDefinitions() {
        return {
            // Combat & Navigation
            piloting: { id: 'piloting', name: 'Piloting', icon: '🧭', rank: 1, primary: 'perception', secondary: 'willpower', desc: 'Increases max speed and turn rate.' },
            gunnery: { id: 'gunnery', name: 'Gunnery', icon: '🔫', rank: 1, primary: 'perception', secondary: 'willpower', desc: 'Increases laser weapon damage.' },
            missile_ops: { id: 'missile_ops', name: 'Missile Ops', icon: '🚀', rank: 2, primary: 'perception', secondary: 'willpower', desc: 'Increases missile weapon damage.' },
            shield_management: { id: 'shield_management', name: 'Shield Management', icon: '🛡️', rank: 2, primary: 'intelligence', secondary: 'memory', desc: 'Increases shield capacity and regeneration.' },
            hull_upgrades: { id: 'hull_upgrades', name: 'Hull Upgrades', icon: '🧱', rank: 2, primary: 'intelligence', secondary: 'willpower', desc: 'Increases hull integrity.' },

            // Industry & Science
            science: { id: 'science', name: 'Science', icon: '🔬', rank: 1, primary: 'intelligence', secondary: 'memory', desc: 'Increases researcher data output by 5% per level.' },
            industry: { id: 'industry', name: 'Industry', icon: '🏭', rank: 1, primary: 'intelligence', secondary: 'memory', desc: 'Decreases manufacturing time by 5% per level.' },
            mining: { id: 'mining', name: 'Mining', icon: '⛏️', rank: 1, primary: 'perception', secondary: 'memory', desc: 'Increases automated mining yield by 5% per level.' },
            production_efficiency: { id: 'production_efficiency', name: 'Production Efficiency', icon: '⚙️', rank: 3, primary: 'intelligence', secondary: 'memory', desc: 'Reduces material requirements for jobs.' },

            // Management
            colony_mgmt: { id: 'colony_mgmt', name: 'Colony Management', icon: '🏛️', rank: 2, primary: 'charisma', secondary: 'willpower', desc: 'Increases population capacity by 2 per level.' },
            negotiation: { id: 'negotiation', name: 'Negotiation', icon: '🤝', rank: 2, primary: 'charisma', secondary: 'intelligence', desc: 'Better credit rewards from missions.' }
        };
    }

    createDefaultPilotSkillsState(defs = null) {
        const skillDefs = defs || this.pilotSkillDefs || this.getPilotSkillDefinitions();
        const skills = {};
        Object.keys(skillDefs).forEach((id) => {
            skills[id] = { level: 0 };
        });

        return {
            skills,
            queue: [],
            active: null,
            lastUpdateAt: Date.now()
        };
    }

    normalizePilotSkillsState(state) {
        const skillDefs = this.pilotSkillDefs || this.getPilotSkillDefinitions();
        const maxLevel = 5;
        const out = (state && typeof state === 'object') ? state : {};

        if (!out.skills || typeof out.skills !== 'object') out.skills = {};
        Object.keys(skillDefs).forEach((id) => {
            const entry = out.skills[id];
            const lvlRaw = entry && typeof entry.level === 'number' ? entry.level : 0;
            const lvl = Math.max(0, Math.min(maxLevel, Math.floor(lvlRaw)));
            out.skills[id] = { level: lvl };
        });

        if (!Array.isArray(out.queue)) out.queue = [];
        out.queue = out.queue
            .filter((q) => q && typeof q === 'object')
            .map((q) => {
                const skillId = String(q.skillId || '');
                const toLevelRaw = (typeof q.toLevel === 'number' && Number.isFinite(q.toLevel)) ? Math.floor(q.toLevel) : null;
                const toLevel = (toLevelRaw !== null) ? Math.max(1, Math.min(maxLevel, toLevelRaw)) : null;
                return { skillId, toLevel };
            })
            .filter((q) => q.skillId && q.toLevel !== null && !!skillDefs[q.skillId]);

        if (out.active && typeof out.active === 'object') {
            const skillId = String(out.active.skillId || '');
            const toLevel = (typeof out.active.toLevel === 'number' && Number.isFinite(out.active.toLevel)) ? Math.floor(out.active.toLevel) : null;
            const duration = (typeof out.active.duration === 'number' && Number.isFinite(out.active.duration)) ? out.active.duration : null;
            const remaining = (typeof out.active.remaining === 'number' && Number.isFinite(out.active.remaining)) ? out.active.remaining : null;

            const currentLevel = (out.skills && out.skills[skillId] && typeof out.skills[skillId].level === 'number') ? out.skills[skillId].level : 0;

            if (!skillId || !skillDefs[skillId] || toLevel === null || toLevel < 1 || toLevel > maxLevel || currentLevel >= toLevel || remaining === null || remaining <= 0 || duration === null || duration <= 0) {
                out.active = null;
            } else {
                out.active = {
                    skillId,
                    toLevel: Math.max(1, Math.min(maxLevel, toLevel)),
                    duration: Math.max(1, duration),
                    remaining: Math.max(0, Math.min(duration, remaining))
                };
            }
        } else {
            out.active = null;
        }

        const last = (typeof out.lastUpdateAt === 'number' && Number.isFinite(out.lastUpdateAt)) ? out.lastUpdateAt : Date.now();
        out.lastUpdateAt = last;

        return out;
    }

    getPilotSkillLevel(skillId) {
        const id = String(skillId || '');
        if (!id || !this.pilotSkills || !this.pilotSkills.skills) return 0;
        const entry = this.pilotSkills.skills[id];
        const lvl = entry && typeof entry.level === 'number' ? entry.level : 0;
        return Math.max(0, Math.min(5, Math.floor(lvl)));
    }

    getPilotSkillTrainingSpeed(skillId) {
        const skillDefs = this.pilotSkillDefs || this.getPilotSkillDefinitions();
        const def = skillDefs[skillId];
        if (!def) return 15 / 60; // Default: 15 SP/min = 0.25 SP/sec

        const primary = this.attributes[def.primary || 'intelligence'] || 10;
        const secondary = this.attributes[def.secondary || 'memory'] || 10;

        // EVE Formula: SP/min = Primary + (Secondary / 2)
        const spPerMin = primary + (secondary / 2);
        return spPerMin / 60; // Returns SP/sec
    }

    getPilotSkillTrainingTimeSeconds(skillId, targetLevel) {
        const skillDefs = this.pilotSkillDefs || this.getPilotSkillDefinitions();
        const def = skillDefs[String(skillId || '')];
        if (!def) return null;
        const lvl = (typeof targetLevel === 'number' && Number.isFinite(targetLevel)) ? Math.floor(targetLevel) : null;
        if (!lvl || lvl < 1 || lvl > 5) return null;

        const rank = (typeof def.rank === 'number' && Number.isFinite(def.rank) && def.rank > 0) ? def.rank : 1;

        // SP Required Formula (Simplified EVE): Level 1=250*rank, Level 2=1414*rank, etc.
        // sp = 250 * rank * multiplier^(lvl-1)
        const spRequired = 250 * rank * Math.pow(5.5, lvl - 1);
        const spPerSec = this.getPilotSkillTrainingSpeed(skillId);

        return Math.ceil(spRequired / spPerSec);
    }

    enqueuePilotSkillTraining(skillId, levels = 1) {
        if (!this.pilotSkills) this.pilotSkills = this.createDefaultPilotSkillsState(this.pilotSkillDefs);

        const id = String(skillId || '');
        if (!id) return;

        const maxLevel = 5;
        const nLevels = (typeof levels === 'number' && Number.isFinite(levels)) ? Math.floor(levels) : 1;
        const addLevels = Math.max(1, Math.min(5, nLevels));

        const currentLevel = this.getPilotSkillLevel(id);
        let next = currentLevel;

        const planned = [];
        for (let i = 0; i < this.pilotSkills.queue.length; i++) {
            const q = this.pilotSkills.queue[i];
            if (q && q.skillId === id && typeof q.toLevel === 'number') planned.push(q.toLevel);
        }
        if (this.pilotSkills.active && this.pilotSkills.active.skillId === id && typeof this.pilotSkills.active.toLevel === 'number') {
            planned.push(this.pilotSkills.active.toLevel);
        }

        for (let i = 0; i < addLevels; i++) {
            const highestPlanned = planned.length > 0 ? Math.max(...planned) : next;
            next = Math.max(next, highestPlanned);
            const toLevel = next + 1;
            if (toLevel > maxLevel) break;
            const duration = this.getPilotSkillTrainingTimeSeconds(id, toLevel);
            if (!duration) break;
            this.pilotSkills.queue.push({ skillId: id, toLevel });
            planned.push(toLevel);
            next = toLevel;
        }

        this.advancePilotSkillTraining(0);
        this.renderSkillsUI();
    }

    clearPilotSkillQueue() {
        if (!this.pilotSkills) return;
        this.pilotSkills.queue = [];
        this.renderSkillsUI();
    }

    cancelPilotSkillTraining() {
        if (!this.pilotSkills) return;
        this.pilotSkills.active = null;
        this.renderSkillsUI();
    }

    advancePilotSkillTraining(dtSeconds, options = {}) {
        if (!this.pilotSkills) this.pilotSkills = this.createDefaultPilotSkillsState(this.pilotSkillDefs);
        this.pilotSkills = this.normalizePilotSkillsState(this.pilotSkills);

        const now = Date.now();
        const last = (typeof this.pilotSkills.lastUpdateAt === 'number' && Number.isFinite(this.pilotSkills.lastUpdateAt)) ? this.pilotSkills.lastUpdateAt : now;
        const derived = Math.max(0, (now - last) / 1000);

        const inputDt = (typeof dtSeconds === 'number' && Number.isFinite(dtSeconds)) ? dtSeconds : null;
        const dt = (inputDt !== null) ? Math.max(0, inputDt) : derived;

        this.pilotSkills.lastUpdateAt = now;
        if (dt <= 0) return { completed: [] };

        const completed = [];

        const ensureActive = () => {
            if (this.pilotSkills.active) return;
            if (!Array.isArray(this.pilotSkills.queue) || this.pilotSkills.queue.length === 0) return;
            const next = this.pilotSkills.queue.shift();
            if (!next || !next.skillId) return;

            const duration = this.getPilotSkillTrainingTimeSeconds(next.skillId, next.toLevel);
            if (!duration) return;

            this.pilotSkills.active = {
                skillId: next.skillId,
                toLevel: next.toLevel,
                duration,
                remaining: duration
            };
        };

        ensureActive();
        let timeLeft = dt;

        while (timeLeft > 0 && this.pilotSkills.active) {
            const a = this.pilotSkills.active;
            const step = Math.min(timeLeft, a.remaining);
            a.remaining = Math.max(0, a.remaining - step);
            timeLeft = Math.max(0, timeLeft - step);

            if (a.remaining <= 0) {
                const current = this.getPilotSkillLevel(a.skillId);
                const toLevel = Math.max(current, Math.min(5, a.toLevel));
                this.pilotSkills.skills[a.skillId].level = toLevel;
                completed.push({ skillId: a.skillId, level: toLevel });
                this.pilotSkills.active = null;
                ensureActive();
            }
        }

        const shouldNotify = options && options.silent !== true;
        if (shouldNotify && completed.length > 0 && typeof this.notify === 'function') {
            const skillDefs = this.pilotSkillDefs || this.getPilotSkillDefinitions();
            completed.slice(0, 3).forEach((c) => {
                const def = skillDefs[c.skillId];
                const name = def ? def.name : c.skillId;
                this.notify(`${name} trained to Level ${c.level}!`, 'success');
            });
            if (completed.length > 3) {
                this.notify(`+${completed.length - 3} more skills completed.`, 'success');
            }
        }

        this.renderSkillsUI();
        return { completed };
    }

    getPilotCombatBonuses() {
        const piloting = this.getPilotSkillLevel('piloting');
        const gunnery = this.getPilotSkillLevel('gunnery');
        const missiles = this.getPilotSkillLevel('missile_ops');
        const shields = this.getPilotSkillLevel('shield_management');
        const hull = this.getPilotSkillLevel('hull_upgrades');

        return {
            speedMult: 1 + 0.02 * piloting,
            turnMult: 1 + 0.01 * piloting,
            laserDmgMult: 1 + 0.03 * gunnery,
            missileDmgMult: 1 + 0.03 * missiles,
            shieldHpMult: 1 + 0.04 * shields,
            shieldRegenMult: 1 + 0.02 * shields,
            hullHpMult: 1 + 0.04 * hull
        };
    }

    getPilotIndustryBonuses() {
        const industry = this.getPilotSkillLevel('industry');
        const prod = this.getPilotSkillLevel('production_efficiency');

        let timeMult = 1 - 0.05 * industry; // -5% time per level

        // Citadel Bonus: -25% time
        if (this.structures.some(s => s.type === 'citadel')) {
            timeMult *= 0.75;
        }

        return {
            timeMult: timeMult,
            matMult: 1 - 0.03 * prod      // -3% materials per level
        };
    }

    getPilotColonyBonuses() {
        const mgmt = this.getPilotSkillLevel('colony_mgmt');
        const neg = this.getPilotSkillLevel('negotiation');
        return {
            popCapBonus: mgmt * 2,
            missionCreditMult: 1 + 0.05 * neg
        };
    }

    getPilotProductionBonuses() {
        const science = this.getPilotSkillLevel('science');
        const mining = this.getPilotSkillLevel('mining');
        return {
            dataMult: 1 + 0.05 * science,
            mineralMult: 1 + 0.05 * mining
        };
    }

    claimCurrentSystem() {
        if (this.claims[this.currentSystemId] === 'player') {
            this.notify("System already claimed!", "warning");
            return;
        }

        const cost = { alloys: 100, circuits: 50 };
        for (let r in cost) {
            if ((this.resources[r] || 0) < cost[r]) {
                this.notify(`Insufficient ${r} to claim system! (Need ${cost[r]})`, "danger");
                return;
            }
        }

        for (let r in cost) this.resources[r] -= cost[r];
        this.claims[this.currentSystemId] = 'player';
        this.updateResourceUI();
        this.notify(`Territorial Claim Successful: ${this.planetData.name} is now yours!`, "success");
        if (this.audio && this.audio.playSuccess) this.audio.playSuccess();
    }

    formatDuration(seconds) {
        const s = (typeof seconds === 'number' && Number.isFinite(seconds)) ? Math.max(0, Math.floor(seconds)) : 0;
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const r = s % 60;
        const pad = (n) => String(n).padStart(2, '0');
        if (h > 0) return `${h}:${pad(m)}:${pad(r)}`;
        return `${m}:${pad(r)}`;
    }

    openSkills() {
        const modal = document.getElementById('ep-skills-modal');
        if (!modal) return;
        modal.style.display = 'flex';
        this.renderSkillsUI();
    }

    renderSkillsUI() {
        const modal = document.getElementById('ep-skills-modal');
        const content = document.getElementById('ep-skills-content');
        if (!modal || !content) return;
        if (modal.style.display === 'none' || modal.style.display === '') return;

        if (!this.pilotSkills) this.pilotSkills = this.createDefaultPilotSkillsState(this.pilotSkillDefs);
        this.pilotSkills = this.normalizePilotSkillsState(this.pilotSkills);

        const defs = this.pilotSkillDefs || this.getPilotSkillDefinitions();

        // Attribute Bar
        let attributesHtml = `
            <div style="display:flex; justify-content:space-between; background:rgba(15,23,42,0.9); padding:15px; border-radius:10px; margin-bottom:20px; border:1px solid #334155;">
        `;
        const attrs = ['intelligence', 'perception', 'memory', 'willpower', 'charisma'];
        attrs.forEach(a => {
            const val = this.attributes[a];
            attributesHtml += `
                <div style="text-align:center;">
                    <div style="font-size:0.7rem; color:#94a3b8; text-transform:uppercase;">${a.slice(0, 3)}</div>
                    <div style="font-size:1.2rem; font-weight:bold; color:#38bdf8;">${val}</div>
                </div>
            `;
        });
        attributesHtml += `</div>`;

        const active = this.pilotSkills.active;
        let activeHtml = '<div style="color:#64748b; background:rgba(0,0,0,0.3); padding:15px; border-radius:10px; text-align:center;">No active training.</div>';
        if (active) {
            const def = defs[active.skillId];
            const name = def ? def.name : active.skillId;
            const pct = active.duration > 0 ? Math.floor(((active.duration - active.remaining) / active.duration) * 100) : 0;
            const spSpeed = (this.getPilotSkillTrainingSpeed(active.skillId) * 60).toFixed(1);
            activeHtml = `
                <div style="background:rgba(56,189,248,0.1); border:1px solid #38bdf8; padding:15px; border-radius:10px;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
                        <div style="flex-grow:1;">
                            <div style="font-weight:700; color:#e2e8f0; font-size:1.1rem;">Training: ${name} ${'I'.repeat(active.toLevel)}</div>
                            <div style="margin-top:8px; height:12px; background:rgba(0,0,0,0.5); border-radius:9999px; overflow:hidden; border:1px solid rgba(56,189,248,0.3);">
                                <div style="height:100%; width:${pct}%; background:linear-gradient(90deg, #38bdf8, #818cf8); box-shadow:0 0 10px #38bdf8;"></div>
                            </div>
                            <div style="display:flex; justify-content:space-between; margin-top:8px; color:#94a3b8; font-size:0.85rem;">
                                <span>${pct}% Complete (${spSpeed} SP/min)</span>
                                <span>${this.formatDuration(active.remaining)} remaining</span>
                            </div>
                        </div>
                        <button class="ep-sys-btn" style="border-color:#ef4444; color:#ef4444;" onclick="window.game.cancelPilotSkillTraining()">ABORT</button>
                    </div>
                </div>
            `;
        }

        const queue = Array.isArray(this.pilotSkills.queue) ? this.pilotSkills.queue : [];
        const queueHtml = queue.length === 0
            ? '<div style="color:#64748b; background:rgba(0,0,0,0.3); padding:15px; border-radius:10px; text-align:center;">Queue empty.</div>'
            : `<div style="display:flex; flex-direction:column; gap:6px; background:rgba(0,0,0,0.3); padding:15px; border-radius:10px;">${queue.slice(0, 10).map((q, idx) => {
                const def = defs[q.skillId];
                const name = def ? def.name : q.skillId;
                return `<div style="display:flex; justify-content:space-between; gap:10px; color:#cbd5e1;"><div>${idx + 1}. ${name} ${'I'.repeat(q.toLevel)}</div><div style="color:#64748b;">${this.formatDuration(this.getPilotSkillTrainingTimeSeconds(q.skillId, q.toLevel) || 0)}</div></div>`;
            }).join('')}</div>`;

        const skillCards = Object.keys(defs).map((id) => {
            const def = defs[id];
            const lvl = this.getPilotSkillLevel(id);
            const nextLevel = Math.min(5, lvl + 1);
            const canTrain = lvl < 5;
            const nextTime = canTrain ? this.getPilotSkillTrainingTimeSeconds(id, nextLevel) : null;

            // Check if already in queue
            const inQueue = (this.pilotSkills.queue || []).some(q => q.skillId === id && q.toLevel === nextLevel) ||
                (active && active.skillId === id && active.toLevel === nextLevel);

            return `
                <div style="background:rgba(15,23,42,0.8); border:1px solid rgba(148,163,184,0.15); border-radius:10px; padding:12px; display:flex; flex-direction:column; gap:8px; transition:border 0.2s;" onmouseover="this.style.borderColor='#38bdf8'" onmouseout="this.style.borderColor='rgba(148,163,184,0.15)'">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div style="font-size:1.5rem; filter:drop-shadow(0 0 5px rgba(56,189,248,0.3));">${def.icon || '⭐'}</div>
                            <div>
                                <div style="font-weight:700; color:#e2e8f0; font-size:0.95rem;">${def.name}</div>
                                <div style="display:flex; gap:3px; margin-top:3px;">
                                    ${[1, 2, 3, 4, 5].map(i => `<div style="width:8px; height:4px; background:${i <= lvl ? '#38bdf8' : '#334155'}; border-radius:1px;"></div>`).join('')}
                                </div>
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:0.7rem; color:#64748b;">RANK ${def.rank || 1}</div>
                            <div style="font-size:0.6rem; color:#475569; text-transform:uppercase;">${(def.primary || '').slice(0, 3)}/${(def.secondary || '').slice(0, 3)}</div>
                        </div>
                    </div>
                    
                    <div style="font-size:0.8rem; color:#94a3b8; line-height:1.3;">${def.desc}</div>
                    
                    <div style="margin-top:auto; padding-top:8px; border-top:1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:0.75rem; color:#64748b;">${canTrain ? this.formatDuration(nextTime) : 'MAX LEVEL'}</span>
                        ${canTrain && !inQueue ? `
                            <button class="ep-sys-btn" style="font-size:0.7rem; padding:4px 10px;" onclick="window.game.enqueuePilotSkillTraining('${id}', 1)">Train</button>
                        ` : canTrain && inQueue ? `
                            <span style="font-size:0.7rem; color:#38bdf8;">IN QUEUE</span>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        content.innerHTML = `
            ${attributesHtml}
            <h3 style="margin:0 0 15px 0; color:#e2e8f0; border-left:3px solid #38bdf8; padding-left:10px;">Active Training</h3>
            ${activeHtml}
            
            <h3 style="margin:25px 0 15px 0; color:#e2e8f0; border-left:3px solid #38bdf8; padding-left:10px;">Available Skills</h3>
            <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap:15px;">
                ${skillCards}
            </div>
        `;
    }

    // --- INDUSTRY ---
    openIndustry() {
        const modal = document.getElementById('ep-industry-modal');
        if (modal) modal.style.display = 'flex';
        this.renderIndustryUI();
    }

    renderIndustryUI() {
        const container = document.getElementById('ep-industry-content');
        if (!container) return;

        let html = `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; color:#fff; font-family:'Orbitron';">
                <!-- Blueprints Column -->
                <div style="background:rgba(15,23,42,0.8); padding:1rem; border-radius:10px; border:1px solid #334155;">
                    <h3 style="margin-top:0; border-bottom:1px solid #334155; padding-bottom:10px; color:#4ade80;">📜 Blueprints</h3>
                    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap:10px;">
        `;

        this.blueprints.forEach(bp => {
            const b = this.buildingTypes[bp.type];
            html += `
                <div class="ep-bp-card" style="background:#1e293b; padding:10px; border-radius:8px; border:1px solid #475569; position:relative; cursor:pointer;" onclick="game.startIndustryJob('${bp.id}')">
                    <div style="font-size:1.5rem; margin-bottom:5px;">${bp.icon}</div>
                    <div style="font-size:0.8rem; font-weight:bold;">${bp.name}</div>
                    <div style="font-size:0.6rem; color:#94a3b8; margin-top:4px;">COST: ${this.formatCost(b.cost)}</div>
                    <div style="font-size:0.6rem; color:#4ade80; margin-top:2px;">TIME: ${b.buildTime || 30}s</div>
                </div>
            `;
        });

        html += `
                    </div>
                </div>

                <!-- Active Jobs Column -->
                <div style="background:rgba(15,23,42,0.8); padding:1rem; border-radius:10px; border:1px solid #334155;">
                    <h3 style="margin-top:0; border-bottom:1px solid #334155; padding-bottom:10px; color:#38bdf8;">⚙️ Industrial Queue (${this.industry.jobs.length}/${this.industry.maxJobs})</h3>
                    <div id="ep-jobs-list">
        `;

        if (this.industry.jobs.length === 0) {
            html += `<div style="color:#64748b; font-size:0.9rem; padding:20px; text-align:center;">No active jobs. Select a blueprint to start production.</div>`;
        } else {
            this.industry.jobs.forEach((job, idx) => {
                const b = this.buildingTypes[job.type];
                const progress = ((job.duration - job.timeLeft) / job.duration) * 100;
                html += `
                    <div style="background:#1e293b; padding:12px; border-radius:8px; margin-bottom:10px; border:1px solid #38bdf8;">
                        <div style="display:flex; justify-content:space-between; font-size:0.9rem; margin-bottom:8px;">
                            <span>${b.name}</span>
                            <span style="color:#38bdf8;">${Math.round(progress)}%</span>
                        </div>
                        <div style="width:100%; height:8px; background:#0f172a; border-radius:4px; overflow:hidden;">
                            <div style="width:${progress}%; height:100%; background:#38bdf8; transition:width 0.5s;"></div>
                        </div>
                        <div style="font-size:0.7rem; color:#94a3b8; margin-top:6px; text-align:right;">Remaining: ${Math.ceil(job.timeLeft)}s</div>
                    </div>
                `;
            });
        }

        html += `
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    startIndustryJob(bpId) {
        const bp = this.blueprints.find(b => b.id === bpId);
        if (!bp) return;

        if (this.industry.jobs.length >= this.industry.maxJobs) {
            this.notify("Industry Queue Full!", "danger");
            return;
        }

        const b = this.buildingTypes[bp.type];
        const ib = this.getPilotIndustryBonuses();

        // Check Resources (Skill-based reduction)
        for (let res in b.cost) {
            const finalCost = Math.ceil(b.cost[res] * ib.matMult);
            if (this.resources[res] < finalCost) {
                this.notify(`Insufficient ${res}! (Required: ${finalCost})`, "danger");
                return;
            }
        }

        // Consume Resources
        for (let res in b.cost) {
            const finalCost = Math.ceil(b.cost[res] * ib.matMult);
            this.resources[res] -= finalCost;
        }
        this.updateResourceUI();

        // Add Job (Skill-based duration reduction)
        const finalDuration = Math.max(1, (b.buildTime || 30) * ib.timeMult);
        this.industry.jobs.push({
            id: 'job_' + Date.now(),
            type: bp.type,
            duration: finalDuration,
            timeLeft: finalDuration
        });

        this.notify(`Manufacturing ${b.name} started.`, "success");
        this.renderIndustryUI();
    }

    advanceIndustryJobs(dt) {
        let changed = false;
        for (let i = this.industry.jobs.length - 1; i >= 0; i--) {
            const job = this.industry.jobs[i];
            job.timeLeft -= dt;
            if (job.timeLeft <= 0) {
                // Completed
                this.finishIndustryJob(job);
                this.industry.jobs.splice(i, 1);
                changed = true;
            }
        }
        if (changed || (document.getElementById('ep-industry-modal')?.style.display === 'flex')) {
            this.renderIndustryUI();
        }
    }

    finishIndustryJob(job) {
        const b = this.buildingTypes[job.type];

        // Add to inventory
        let invItem = this.inventory.find(i => i.type === job.type);
        if (invItem) {
            invItem.count++;
        } else {
            this.inventory.push({ type: job.type, count: 1 });
        }

        this.notify(`${b.name} Manufacturing Complete!`, "success");
        this.audio.playSuccess();
        this.createBuildMenu();
    }

    getTotalStructuresForCurrentSystem() {
        const sources = [];
        const addSource = (structures) => {
            if (Array.isArray(structures)) sources.push(structures);
        };

        addSource(this.structures);

        if (this.systemStates && this.currentSystemId !== undefined && this.currentSystemId !== null) {
            const planetId = String(this.currentSystemId);
            const moonId = `${planetId}_moon`;
            const otherId = this.isOnMoon ? planetId : moonId;
            const otherState = this.systemStates[otherId];
            if (otherState && Array.isArray(otherState.structures)) addSource(otherState.structures);
        }

        let count = 0;
        sources.forEach(structures => {
            count += structures.length;
        });
        return count;
    }

    getAgentMissionDefinitions() {
        return {
            build_outpost: {
                id: 'build_outpost',
                name: 'Establish Outpost',
                icon: '🏗️',
                desc: 'Construct 10 structures on the surface.',
                target: 10,
                reward: { credits: 250, alloys: 5 },
                standing: 1,
                lp: 40,
                getCurrent: (game) => (game && typeof game.getTotalStructuresForCurrentSystem === 'function') ? game.getTotalStructuresForCurrentSystem() : ((game && Array.isArray(game.structures)) ? game.structures.length : 0)
            },
            grow_population: {
                id: 'grow_population',
                name: 'Grow the Colony',
                icon: '👥',
                desc: 'Reach a population of 12 colonists.',
                target: 12,
                reward: { credits: 200, food: 25 },
                standing: 1,
                lp: 35,
                getCurrent: (game) => (game && Array.isArray(game.colonists)) ? game.colonists.length : 0
            },
            research_cache: {
                id: 'research_cache',
                name: 'Research Cache',
                icon: '🔬',
                desc: 'Stockpile 120 data for analysis.',
                target: 120,
                reward: { credits: 300, circuits: 2 },
                standing: 1,
                lp: 50,
                getCurrent: (game) => (game && game.resources && typeof game.resources.data === 'number' && Number.isFinite(game.resources.data)) ? game.resources.data : 0
            },
            combat_patrol: {
                id: 'combat_patrol',
                name: 'Combat Patrol',
                icon: '⚔️',
                desc: 'Win 2 space combat engagements.',
                target: 2,
                reward: { credits: 350, alloys: 10 },
                minStanding: 1,
                standing: 2,
                lp: 80,
                getCurrent: (game, state) => {
                    const s = (state && state.stats && typeof state.stats.combatWins === 'number' && Number.isFinite(state.stats.combatWins)) ? state.stats.combatWins : 0;
                    return Math.max(0, Math.floor(s));
                }
            },
            pilot_training: {
                id: 'pilot_training',
                name: 'Pilot Training',
                icon: '🧠',
                desc: 'Train a total of 6 pilot skill levels.',
                target: 6,
                reward: { credits: 400, data: 50 },
                standing: 2,
                lp: 60,
                getCurrent: (game) => {
                    const skills = (game && game.pilotSkills && game.pilotSkills.skills && typeof game.pilotSkills.skills === 'object') ? game.pilotSkills.skills : null;
                    if (!skills) return 0;
                    let sum = 0;
                    Object.keys(skills).forEach((k) => {
                        const e = skills[k];
                        const lvl = (e && typeof e.level === 'number' && Number.isFinite(e.level)) ? e.level : 0;
                        sum += Math.max(0, Math.floor(lvl));
                    });
                    return sum;
                }
            }
        };
    }

    createDefaultAgentMissionsState(defs = null) {
        const missionDefs = defs || this.agentMissionDefs || this.getAgentMissionDefinitions();
        const completed = {};
        Object.keys(missionDefs).forEach((id) => {
            completed[id] = false;
        });
        return {
            completed,
            active: null,
            stats: { combatWins: 0 },
            standing: 0,
            loyaltyPoints: 0,
            offers: [],
            cooldowns: {},
            lastOfferDay: 0,
            lastUpdateAt: Date.now()
        };
    }

    normalizeAgentMissionsState(state) {
        const defs = this.agentMissionDefs || this.getAgentMissionDefinitions();
        const out = (state && typeof state === 'object') ? state : {};

        if (!out.completed || typeof out.completed !== 'object') out.completed = {};
        Object.keys(defs).forEach((id) => {
            out.completed[id] = !!out.completed[id];
        });

        if (!out.stats || typeof out.stats !== 'object') out.stats = {};
        const winsRaw = (typeof out.stats.combatWins === 'number' && Number.isFinite(out.stats.combatWins)) ? Math.floor(out.stats.combatWins) : 0;
        out.stats.combatWins = Math.max(0, winsRaw);

        const standingRaw = (typeof out.standing === 'number' && Number.isFinite(out.standing)) ? Math.floor(out.standing) : 0;
        out.standing = Math.max(0, standingRaw);

        const lpRaw = (typeof out.loyaltyPoints === 'number' && Number.isFinite(out.loyaltyPoints)) ? Math.floor(out.loyaltyPoints) : 0;
        out.loyaltyPoints = Math.max(0, lpRaw);

        if (!Array.isArray(out.offers)) out.offers = [];
        const offerSeen = {};
        out.offers = out.offers.map((o) => {
            if (!o || typeof o !== 'object') return null;
            const missionId = String(o.missionId || o.id || '');
            if (!missionId || !defs[missionId] || offerSeen[missionId]) return null;
            offerSeen[missionId] = true;
            const offeredAtDayRaw = (typeof o.offeredAtDay === 'number' && Number.isFinite(o.offeredAtDay)) ? Math.floor(o.offeredAtDay) : 0;
            const offeredAtDay = Math.max(0, offeredAtDayRaw);
            const expiresAtDayRaw = (typeof o.expiresAtDay === 'number' && Number.isFinite(o.expiresAtDay)) ? Math.floor(o.expiresAtDay) : offeredAtDay;
            const expiresAtDay = Math.max(offeredAtDay, expiresAtDayRaw);
            return { missionId, offeredAtDay, expiresAtDay };
        }).filter(Boolean);

        if (!out.cooldowns || typeof out.cooldowns !== 'object') out.cooldowns = {};
        const cdOut = {};
        Object.keys(defs).forEach((id) => {
            const raw = out.cooldowns[id];
            const n = (typeof raw === 'number' && Number.isFinite(raw)) ? Math.floor(raw) : 0;
            if (n > 0) cdOut[id] = n;
        });
        out.cooldowns = cdOut;

        const lastOfferDayRaw = (typeof out.lastOfferDay === 'number' && Number.isFinite(out.lastOfferDay)) ? Math.floor(out.lastOfferDay) : 0;
        out.lastOfferDay = Math.max(0, lastOfferDayRaw);

        if (out.active && typeof out.active === 'object') {
            const missionId = String(out.active.missionId || out.active.id || '');
            if (!missionId || !defs[missionId]) {
                out.active = null;
            } else {
                const acceptedAtDayRaw = (typeof out.active.acceptedAtDay === 'number' && Number.isFinite(out.active.acceptedAtDay)) ? Math.floor(out.active.acceptedAtDay) : this.day;
                out.active = {
                    missionId,
                    acceptedAtDay: Math.max(1, acceptedAtDayRaw),
                    notifiedComplete: !!out.active.notifiedComplete
                };
            }
        } else {
            out.active = null;
        }

        const last = (typeof out.lastUpdateAt === 'number' && Number.isFinite(out.lastUpdateAt)) ? out.lastUpdateAt : Date.now();
        out.lastUpdateAt = last;

        return out;
    }

    getAgentMissionProgress(missionId) {
        const defs = this.agentMissionDefs || this.getAgentMissionDefinitions();
        const def = defs[String(missionId || '')];
        if (!def) return null;

        const targetRaw = (typeof def.target === 'number' && Number.isFinite(def.target)) ? def.target : 1;
        const target = Math.max(1, targetRaw);

        let cur = 0;
        if (typeof def.getCurrent === 'function') {
            const v = def.getCurrent(this, this.agentMissions);
            if (typeof v === 'number' && Number.isFinite(v)) cur = v;
        }

        const current = Math.max(0, cur);
        const complete = current >= target;
        const pct = Math.max(0, Math.min(1, current / target));
        return { current, target, complete, pct };
    }

    updateAgentMissions(options = {}) {
        if (!this.agentMissionDefs) this.agentMissionDefs = this.getAgentMissionDefinitions();
        if (!this.agentMissions) this.agentMissions = this.createDefaultAgentMissionsState(this.agentMissionDefs);
        this.agentMissions = this.normalizeAgentMissionsState(this.agentMissions);

        const curDayRaw = (typeof this.day === 'number' && Number.isFinite(this.day)) ? Math.floor(this.day) : 1;
        const curDay = Math.max(1, curDayRaw);
        const lastOfferDayRaw = (typeof this.agentMissions.lastOfferDay === 'number' && Number.isFinite(this.agentMissions.lastOfferDay)) ? Math.floor(this.agentMissions.lastOfferDay) : 0;
        const lastOfferDay = Math.max(0, lastOfferDayRaw);

        if (this.agentMissions.cooldowns && typeof this.agentMissions.cooldowns === 'object') {
            Object.keys(this.agentMissions.cooldowns).forEach((id) => {
                const until = this.agentMissions.cooldowns[id];
                const n = (typeof until === 'number' && Number.isFinite(until)) ? Math.floor(until) : 0;
                if (!(n > 0) || curDay >= n) delete this.agentMissions.cooldowns[id];
            });
        }

        if (Array.isArray(this.agentMissions.offers)) {
            this.agentMissions.offers = this.agentMissions.offers.filter((o) => {
                if (!o || typeof o !== 'object') return false;
                const expiresAtDayRaw = (typeof o.expiresAtDay === 'number' && Number.isFinite(o.expiresAtDay)) ? Math.floor(o.expiresAtDay) : 0;
                const expiresAtDay = Math.max(0, expiresAtDayRaw);
                return curDay <= expiresAtDay;
            });
        }

        if (lastOfferDay !== curDay) {
            const maxOffers = 3;
            const offerDurationDays = 1;
            const ids = Object.keys(this.agentMissionDefs);
            const cooldowns = (this.agentMissions.cooldowns && typeof this.agentMissions.cooldowns === 'object') ? this.agentMissions.cooldowns : {};
            const isOnCooldown = (id) => {
                const until = cooldowns[id];
                const n = (typeof until === 'number' && Number.isFinite(until)) ? Math.floor(until) : 0;
                return n > 0 && curDay < n;
            };

            const scoreFor = (id) => {
                let h = 2166136261;
                const s = `${curDay}|${id}`;
                for (let i = 0; i < s.length; i++) {
                    h ^= s.charCodeAt(i);
                    h = Math.imul(h, 16777619);
                }
                return h >>> 0;
            };

            const activeId = (this.agentMissions && this.agentMissions.active && this.agentMissions.active.missionId) ? String(this.agentMissions.active.missionId) : '';
            const eligible = ids.filter((id) => !isOnCooldown(id) && (!activeId || id !== activeId));
            const sorted = eligible.slice().sort((a, b) => scoreFor(b) - scoreFor(a));
            const chosen = sorted.slice(0, Math.max(0, Math.floor(maxOffers)));
            const offeredAtDay = curDay;
            const expiresAtDay = offeredAtDay + Math.max(0, Math.floor(offerDurationDays) - 1);
            this.agentMissions.offers = chosen.map((missionId) => ({ missionId, offeredAtDay, expiresAtDay }));
            this.agentMissions.lastOfferDay = curDay;
        }

        const active = this.agentMissions.active;
        if (active && active.missionId) {
            const p = this.getAgentMissionProgress(active.missionId);
            const shouldNotify = options && options.silent !== true;
            if (p && p.complete && !active.notifiedComplete && shouldNotify && typeof this.notify === 'function') {
                const defs = this.agentMissionDefs;
                const def = defs[active.missionId];
                const name = def ? def.name : active.missionId;
                this.notify(`Mission ready to claim: ${name}`, 'success');
                active.notifiedComplete = true;
            }
        }

        this.renderMissionsUI();
    }

    openMissions() {
        const modal = document.getElementById('ep-missions-modal');
        if (!modal) return;
        modal.style.display = 'flex';
        this.updateAgentMissions({ silent: true });
        this.renderMissionsUI();
    }

    acceptAgentMission(missionId) {
        if (!this.agentMissionDefs) this.agentMissionDefs = this.getAgentMissionDefinitions();
        if (!this.agentMissions) this.agentMissions = this.createDefaultAgentMissionsState(this.agentMissionDefs);
        this.agentMissions = this.normalizeAgentMissionsState(this.agentMissions);

        if (this.agentMissions.active) {
            this.notify('You can only run one agent mission at a time.', 'warning');
            return;
        }

        const id = String(missionId || '');
        const def = this.agentMissionDefs[id];
        if (!def) return;

        const curDayRaw = (typeof this.day === 'number' && Number.isFinite(this.day)) ? Math.floor(this.day) : 1;
        const curDay = Math.max(1, curDayRaw);
        const offers = Array.isArray(this.agentMissions.offers) ? this.agentMissions.offers : [];
        const offer = offers.find((o) => o && o.missionId === id);
        if (!offer) {
            this.notify('Mission not available on the board today.', 'warning');
            return;
        }

        const expiresAtDayRaw = (typeof offer.expiresAtDay === 'number' && Number.isFinite(offer.expiresAtDay)) ? Math.floor(offer.expiresAtDay) : 0;
        const expiresAtDay = Math.max(0, expiresAtDayRaw);
        if (curDay > expiresAtDay) {
            this.notify('This mission offer has expired.', 'warning');
            return;
        }

        const cooldownUntilRaw = (this.agentMissions.cooldowns && typeof this.agentMissions.cooldowns[id] === 'number' && Number.isFinite(this.agentMissions.cooldowns[id]))
            ? Math.floor(this.agentMissions.cooldowns[id])
            : 0;
        const cooldownUntil = Math.max(0, cooldownUntilRaw);
        if (cooldownUntil > 0 && curDay < cooldownUntil) {
            this.notify(`Mission is on cooldown until day ${cooldownUntil}.`, 'warning');
            return;
        }

        const minStanding = (typeof def.minStanding === 'number' && Number.isFinite(def.minStanding)) ? Math.floor(def.minStanding) : 0;
        const standing = (typeof this.agentMissions.standing === 'number' && Number.isFinite(this.agentMissions.standing)) ? this.agentMissions.standing : 0;
        if (standing < Math.max(0, minStanding)) {
            this.notify(`Requires standing ${Math.max(0, minStanding)} to accept this mission.`, 'warning');
            return;
        }

        this.agentMissions.offers = offers.filter((o) => o && o.missionId !== id);
        this.agentMissions.active = { missionId: id, acceptedAtDay: curDay, notifiedComplete: false };
        this.notify(`Mission accepted: ${def.name}`, 'info');
        this.updateAgentMissions({ silent: true });
        this.renderMissionsUI();
    }

    abandonAgentMission() {
        if (!this.agentMissions || !this.agentMissions.active) return;
        this.agentMissions.active = null;
        this.notify('Mission abandoned.', 'warning');
        this.renderMissionsUI();
    }

    claimAgentMissionReward() {
        if (!this.agentMissionDefs) this.agentMissionDefs = this.getAgentMissionDefinitions();
        if (!this.agentMissions) return;
        this.agentMissions = this.normalizeAgentMissionsState(this.agentMissions);

        const active = this.agentMissions.active;
        if (!active || !active.missionId) return;

        const def = this.agentMissionDefs[active.missionId];
        if (!def) return;

        const p = this.getAgentMissionProgress(active.missionId);
        if (!p || !p.complete) {
            this.notify('Mission not complete yet.', 'warning');
            return;
        }

        const reward = (def.reward && typeof def.reward === 'object') ? def.reward : {};
        const gained = [];
        Object.keys(reward).forEach((k) => {
            const amt = reward[k];
            const n = (typeof amt === 'number' && Number.isFinite(amt)) ? amt : Number(amt);
            if (!(typeof n === 'number' && Number.isFinite(n)) || n <= 0) return;
            if (!this.resources || !Object.prototype.hasOwnProperty.call(this.resources, k)) return;
            const cur = (typeof this.resources[k] === 'number' && Number.isFinite(this.resources[k])) ? this.resources[k] : 0;
            this.resources[k] = cur + n;
            gained.push(`+${Math.floor(n)} ${k}`);
        });

        const lpGain = (typeof def.lp === 'number' && Number.isFinite(def.lp)) ? Math.floor(def.lp) : 0;
        if (lpGain > 0) {
            const curLp = (typeof this.agentMissions.loyaltyPoints === 'number' && Number.isFinite(this.agentMissions.loyaltyPoints)) ? this.agentMissions.loyaltyPoints : 0;
            this.agentMissions.loyaltyPoints = curLp + lpGain;
            gained.push(`+${lpGain} LP`);
        }

        const standingGain = (typeof def.standing === 'number' && Number.isFinite(def.standing)) ? Math.floor(def.standing) : 0;
        if (standingGain > 0) {
            const curStanding = (typeof this.agentMissions.standing === 'number' && Number.isFinite(this.agentMissions.standing)) ? this.agentMissions.standing : 0;
            this.agentMissions.standing = curStanding + standingGain;
            gained.push(`+${standingGain} standing`);
        }

        const curDayRaw = (typeof this.day === 'number' && Number.isFinite(this.day)) ? Math.floor(this.day) : 1;
        const curDay = Math.max(1, curDayRaw);
        const cooldownDays = 2;
        const cooldownUntil = curDay + Math.max(0, Math.floor(cooldownDays));
        if (cooldownUntil > curDay) {
            if (!this.agentMissions.cooldowns || typeof this.agentMissions.cooldowns !== 'object') this.agentMissions.cooldowns = {};
            this.agentMissions.cooldowns[active.missionId] = cooldownUntil;
        }

        this.agentMissions.completed[active.missionId] = true;
        this.agentMissions.active = null;

        if (gained.length > 0) this.notify(`Mission complete! Rewards: ${gained.join(', ')}`, 'success');
        else this.notify('Mission complete!', 'success');
        this.updateResourceUI();
        this.renderMissionsUI();
    }

    getAgentLpStoreDefinitions() {
        return {
            lp_minerals: { id: 'lp_minerals', name: 'Mineral Shipment', icon: '⛏️', desc: 'Trade LP for bulk minerals.', costLp: 25, reward: { minerals: 80 } },
            lp_food: { id: 'lp_food', name: 'Food Crate', icon: '🌱', desc: 'Trade LP for preserved rations.', costLp: 20, reward: { food: 80 } },
            lp_data: { id: 'lp_data', name: 'Encrypted Data Cache', icon: '💾', desc: 'Trade LP for research data.', costLp: 35, reward: { data: 50 } },
            lp_alloys: { id: 'lp_alloys', name: 'Alloy Pack', icon: '🏭', desc: 'Trade LP for refined alloys.', costLp: 50, reward: { alloys: 10 } },
            lp_circuits: { id: 'lp_circuits', name: 'Circuit Bundle', icon: '📟', desc: 'Trade LP for electronics.', costLp: 60, reward: { circuits: 5 } }
        };
    }

    buyAgentLpStoreItem(itemId) {
        if (!this.agentMissions) return;
        this.agentMissions = this.normalizeAgentMissionsState(this.agentMissions);

        const store = this.getAgentLpStoreDefinitions();
        const id = String(itemId || '');
        const item = store[id];
        if (!item) return;

        const costRaw = (typeof item.costLp === 'number' && Number.isFinite(item.costLp)) ? Math.floor(item.costLp) : 0;
        const cost = Math.max(0, costRaw);
        if (cost <= 0) return;

        const curLp = (typeof this.agentMissions.loyaltyPoints === 'number' && Number.isFinite(this.agentMissions.loyaltyPoints)) ? this.agentMissions.loyaltyPoints : 0;
        if (curLp < cost) {
            this.notify('Not enough Loyalty Points.', 'warning');
            return;
        }

        this.agentMissions.loyaltyPoints = curLp - cost;

        const reward = (item.reward && typeof item.reward === 'object') ? item.reward : {};
        const gained = [];
        Object.keys(reward).forEach((k) => {
            const amt = reward[k];
            const n = (typeof amt === 'number' && Number.isFinite(amt)) ? amt : Number(amt);
            if (!(typeof n === 'number' && Number.isFinite(n)) || n <= 0) return;
            if (!this.resources || !Object.prototype.hasOwnProperty.call(this.resources, k)) return;
            const cur = (typeof this.resources[k] === 'number' && Number.isFinite(this.resources[k])) ? this.resources[k] : 0;
            this.resources[k] = cur + n;
            gained.push(`+${Math.floor(n)} ${k}`);
        });

        if (gained.length > 0) this.notify(`Purchased: ${item.name} (${cost} LP) · ${gained.join(', ')}`, 'success');
        else this.notify(`Purchased: ${item.name} (${cost} LP)`, 'success');

        this.updateResourceUI();
        this.renderMissionsUI();
    }

    renderMissionsUI() {
        const modal = document.getElementById('ep-missions-modal');
        const content = document.getElementById('ep-missions-content');
        if (!modal || !content) return;
        if (modal.style.display === 'none' || modal.style.display === '') return;

        if (!this.agentMissionDefs) this.agentMissionDefs = this.getAgentMissionDefinitions();
        if (!this.agentMissions) this.agentMissions = this.createDefaultAgentMissionsState(this.agentMissionDefs);
        this.agentMissions = this.normalizeAgentMissionsState(this.agentMissions);

        const defs = this.agentMissionDefs;
        const state = this.agentMissions;
        const allIds = Object.keys(defs);
        const completedCount = allIds.filter(id => !!state.completed[id]).length;

        const curDayRaw = (typeof this.day === 'number' && Number.isFinite(this.day)) ? Math.floor(this.day) : 1;
        const curDay = Math.max(1, curDayRaw);

        const resourceRewardToHtml = (reward) => {
            const r = (reward && typeof reward === 'object') ? reward : {};
            const keys = Object.keys(r);
            if (keys.length === 0) return '<span style="color:#94a3b8;">No rewards.</span>';
            return keys.map((k) => {
                const v = r[k];
                const n = (typeof v === 'number' && Number.isFinite(v)) ? v : Number(v);
                const num = (typeof n === 'number' && Number.isFinite(n)) ? Math.floor(n) : 0;
                return `<span style="color:#e2e8f0;">+${num} ${k}</span>`;
            }).join('<span style="color:#475569; padding:0 6px;">·</span>');
        };

        const rewardToHtml = (def) => {
            const parts = [];
            const r = (def && def.reward && typeof def.reward === 'object') ? def.reward : {};
            Object.keys(r).forEach((k) => {
                const v = r[k];
                const n = (typeof v === 'number' && Number.isFinite(v)) ? v : Number(v);
                const num = (typeof n === 'number' && Number.isFinite(n)) ? Math.floor(n) : 0;
                if (num > 0) parts.push(`<span style="color:#e2e8f0;">+${num} ${k}</span>`);
            });

            const lp = (def && typeof def.lp === 'number' && Number.isFinite(def.lp)) ? Math.floor(def.lp) : 0;
            if (lp > 0) parts.push(`<span style="color:#e2e8f0;">+${lp} LP</span>`);

            const standing = (def && typeof def.standing === 'number' && Number.isFinite(def.standing)) ? Math.floor(def.standing) : 0;
            if (standing > 0) parts.push(`<span style="color:#e2e8f0;">+${standing} standing</span>`);

            if (parts.length === 0) return '<span style="color:#94a3b8;">No rewards.</span>';
            return parts.join('<span style="color:#475569; padding:0 6px;">·</span>');
        };

        let activeHtml = '<div style="color:#94a3b8;">No active mission. Accept one from the board below.</div>';
        if (state.active && state.active.missionId) {
            const def = defs[state.active.missionId];
            const name = def ? def.name : state.active.missionId;
            const icon = def && def.icon ? def.icon : '📜';
            const desc = def && def.desc ? def.desc : '';
            const p = this.getAgentMissionProgress(state.active.missionId);
            const pct = p ? Math.floor(p.pct * 100) : 0;
            const cur = p ? Math.floor(p.current) : 0;
            const tgt = p ? Math.floor(p.target) : 0;
            const canClaim = !!(p && p.complete);
            activeHtml = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
                    <div style="flex:1;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div style="font-size:1.4rem;">${icon}</div>
                            <div>
                                <div style="font-weight:700; color:#e2e8f0;">${name}</div>
                                <div style="margin-top:2px; color:#94a3b8; font-size:0.9rem;">${desc}</div>
                            </div>
                        </div>
                        <div style="margin-top:10px; height:10px; background:rgba(148,163,184,0.2); border-radius:9999px; overflow:hidden;">
                            <div style="height:100%; width:${pct}%; background:#38bdf8;"></div>
                        </div>
                        <div style="margin-top:6px; color:#94a3b8; font-size:0.9rem;">${cur} / ${tgt} · ${pct}%</div>
                        <div style="margin-top:6px; color:#94a3b8; font-size:0.9rem;">Rewards: ${rewardToHtml(def)}</div>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:8px; align-items:flex-end;">
                        <button class="ep-sys-btn" ${canClaim ? '' : 'disabled'} onclick="window.game.claimAgentMissionReward()">Claim</button>
                        <button class="ep-sys-btn" onclick="window.game.abandonAgentMission()">Abandon</button>
                    </div>
                </div>
            `;
        }

        const hasActive = !!state.active;
        const offers = Array.isArray(state.offers) ? state.offers : [];
        const cardsHtml = offers.map((offer) => {
            const id = offer && offer.missionId ? String(offer.missionId) : '';
            const def = defs[id];
            if (!id || !def) return '';
            const icon = def && def.icon ? def.icon : '📜';
            const p = this.getAgentMissionProgress(id);
            const pct = p ? Math.floor(p.pct * 100) : 0;
            const cur = p ? Math.floor(p.current) : 0;
            const tgt = p ? Math.floor(p.target) : 0;
            const minStanding = (typeof def.minStanding === 'number' && Number.isFinite(def.minStanding)) ? Math.floor(def.minStanding) : 0;
            const standing = (typeof state.standing === 'number' && Number.isFinite(state.standing)) ? state.standing : 0;
            const lockedByStanding = standing < Math.max(0, minStanding);

            const expiresAtDayRaw = (typeof offer.expiresAtDay === 'number' && Number.isFinite(offer.expiresAtDay)) ? Math.floor(offer.expiresAtDay) : curDay;
            const expiresAtDay = Math.max(0, expiresAtDayRaw);
            const expired = curDay > expiresAtDay;
            const daysLeft = Math.max(0, expiresAtDay - curDay);
            let expiryLabel = `Expires Day ${expiresAtDay}`;
            if (expired) expiryLabel = 'Offer expired';
            else if (daysLeft === 0) expiryLabel = `Expires today (Day ${expiresAtDay})`;
            else expiryLabel = `Expires in ${daysLeft}d (Day ${expiresAtDay})`;

            const cooldownUntilRaw = (state.cooldowns && typeof state.cooldowns[id] === 'number' && Number.isFinite(state.cooldowns[id])) ? Math.floor(state.cooldowns[id]) : 0;
            const cooldownUntil = Math.max(0, cooldownUntilRaw);
            const onCooldown = cooldownUntil > 0 && curDay < cooldownUntil;

            const acceptDisabled = hasActive || lockedByStanding || expired || onCooldown;
            let acceptTitle = 'Accept mission';
            if (hasActive) acceptTitle = 'Finish or abandon your current mission first.';
            else if (lockedByStanding) acceptTitle = `Requires standing ${Math.max(0, minStanding)}`;
            else if (expired) acceptTitle = 'This offer has expired.';
            else if (onCooldown) acceptTitle = `On cooldown until day ${cooldownUntil}`;
            return `
                <div style="background:rgba(15,23,42,0.8); border:1px solid rgba(148,163,184,0.25); border-radius:10px; padding:12px; display:flex; flex-direction:column; gap:8px;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div style="font-size:1.4rem;">${icon}</div>
                            <div>
                                <div style="font-weight:700; color:#e2e8f0;">${def.name}</div>
                                <div style="font-size:0.9rem; color:#94a3b8;">${def.desc}</div>
                            </div>
                        </div>
                        <div style="font-weight:700; color:#38bdf8; white-space:nowrap;">${cur}/${tgt}</div>
                    </div>
                    <div style="height:8px; background:rgba(148,163,184,0.2); border-radius:9999px; overflow:hidden;">
                        <div style="height:100%; width:${pct}%; background:#38bdf8;"></div>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
                        <div style="font-size:0.85rem; color:#94a3b8;">Rewards: ${rewardToHtml(def)}</div>
                        <button class="ep-sys-btn" title="${acceptTitle}" ${acceptDisabled ? 'disabled' : ''} onclick="window.game.acceptAgentMission('${id}')">Accept</button>
                    </div>
                    <div style="font-size:0.85rem; color:#94a3b8;">${expiryLabel}${onCooldown ? ` · Cooldown until Day ${cooldownUntil}` : ''}</div>
                </div>
            `;
        }).filter(Boolean).join('');

        const cooldownListHtml = (state.cooldowns && typeof state.cooldowns === 'object')
            ? Object.keys(state.cooldowns).map((id) => {
                const untilRaw = state.cooldowns[id];
                const until = (typeof untilRaw === 'number' && Number.isFinite(untilRaw)) ? Math.floor(untilRaw) : 0;
                if (!(until > 0) || curDay >= until) return '';
                const def = defs[id];
                const name = def ? def.name : id;
                return `<div style="color:#94a3b8; font-size:0.9rem;">${name} (available Day ${until})</div>`;
            }).filter(Boolean).join('')
            : '';

        const cooldownSectionHtml = cooldownListHtml
            ? `
                <div style="background:rgba(15,23,42,0.9); border:1px solid rgba(148,163,184,0.25); border-radius:12px; padding:14px;">
                    <div style="font-weight:700; color:#e2e8f0; margin-bottom:8px;">Cooldowns</div>
                    ${cooldownListHtml}
                </div>
            `
            : '';

        const lpStore = this.getAgentLpStoreDefinitions();
        const lpBalance = (typeof state.loyaltyPoints === 'number' && Number.isFinite(state.loyaltyPoints)) ? state.loyaltyPoints : 0;
        const storeCardsHtml = Object.keys(lpStore).map((id) => {
            const item = lpStore[id];
            if (!item) return '';
            const icon = item.icon || '🎁';
            const costRaw = (typeof item.costLp === 'number' && Number.isFinite(item.costLp)) ? Math.floor(item.costLp) : 0;
            const cost = Math.max(0, costRaw);
            const canBuy = cost > 0 && lpBalance >= cost;
            const title = canBuy ? 'Purchase' : 'Not enough LP';
            return `
                <div style="background:rgba(15,23,42,0.8); border:1px solid rgba(148,163,184,0.25); border-radius:10px; padding:12px; display:flex; flex-direction:column; gap:8px;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div style="font-size:1.4rem;">${icon}</div>
                            <div>
                                <div style="font-weight:700; color:#e2e8f0;">${item.name || id}</div>
                                <div style="font-size:0.9rem; color:#94a3b8;">${item.desc || ''}</div>
                            </div>
                        </div>
                        <div style="font-weight:700; color:#38bdf8; white-space:nowrap;">${cost} LP</div>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
                        <div style="font-size:0.85rem; color:#94a3b8;">Reward: ${resourceRewardToHtml(item.reward)}</div>
                        <button class="ep-sys-btn" title="${title}" ${canBuy ? '' : 'disabled'} onclick="window.game.buyAgentLpStoreItem('${id}')">Buy</button>
                    </div>
                </div>
            `;
        }).join('');

        content.innerHTML = `
            <div style="display:grid; grid-template-columns: 1fr; gap:14px;">
                <div style="background:rgba(15,23,42,0.9); border:1px solid rgba(56,189,248,0.25); border-radius:12px; padding:14px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:10px;">
                        <div style="font-weight:700; color:#e2e8f0;">Active Mission</div>
                        <div style="color:#94a3b8; font-size:0.9rem;">Standing: ${state.standing} · LP: ${state.loyaltyPoints} · Completed: ${completedCount}/${allIds.length}</div>
                    </div>
                    ${activeHtml}
                </div>

                <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap:12px;">
                    ${cardsHtml || '<div style="color:#94a3b8;">No mission offers available today.</div>'}
                </div>

                ${cooldownSectionHtml}

                <div style="background:rgba(15,23,42,0.9); border:1px solid rgba(148,163,184,0.25); border-radius:12px; padding:14px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:10px;">
                        <div style="font-weight:700; color:#e2e8f0;">Loyalty Store</div>
                        <div style="color:#94a3b8; font-size:0.9rem;">LP: ${lpBalance}</div>
                    </div>
                    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap:12px;">
                        ${storeCardsHtml || '<div style="color:#94a3b8;">No items available.</div>'}
                    </div>
                </div>

                <div style="color:#94a3b8; font-size:0.9rem;">Combat victories recorded: ${state.stats && typeof state.stats.combatWins === 'number' ? state.stats.combatWins : 0}</div>
            </div>
        `;
    }

    async runAgentMissionsSelfTests(options = {}) {
        const opts = (options && typeof options === 'object') ? options : {};
        const shouldToast = opts.silent === false;
        const results = [];
        const record = (name, pass, details = null) => {
            results.push({ name, pass: !!pass, details: details != null ? details : '' });
        };

        const notifyOrig = (typeof this.notify === 'function') ? this.notify : null;
        if (notifyOrig) this.notify = () => { };

        let preLocalSave = null;
        let baselineData = null;
        let cloudSaveOrig = null;
        let cloudLoadOrig = null;

        try {
            try {
                preLocalSave = localStorage.getItem('ep_save_v2');
            } catch (e) {
                record('localStorage available', false, e && e.message ? e.message : String(e));
            }

            try {
                this.saveGame({ silent: true });
                const baselineStr = localStorage.getItem('ep_save_v2');
                baselineData = baselineStr ? JSON.parse(baselineStr) : null;
                record('local save parse', !!baselineData);
                record('local save includes agentMissions', !!(baselineData && baselineData.agentMissions));
                record('local save includes standing', !!(baselineData && baselineData.agentMissions && typeof baselineData.agentMissions.standing === 'number'));
                record('local save includes loyaltyPoints', !!(baselineData && baselineData.agentMissions && typeof baselineData.agentMissions.loyaltyPoints === 'number'));
                record('local save includes offers', !!(baselineData && baselineData.agentMissions && Array.isArray(baselineData.agentMissions.offers)));
                record('local save includes cooldowns', !!(baselineData && baselineData.agentMissions && baselineData.agentMissions.cooldowns && typeof baselineData.agentMissions.cooldowns === 'object'));
                record('local save includes lastOfferDay', !!(baselineData && baselineData.agentMissions && typeof baselineData.agentMissions.lastOfferDay === 'number'));
            } catch (e) {
                record('local save parse', false, e && e.message ? e.message : String(e));
            }

            try {
                if (!this.agentMissionDefs) this.agentMissionDefs = this.getAgentMissionDefinitions();
                const defs = this.agentMissionDefs;
                const norm = this.normalizeAgentMissionsState({
                    completed: { build_outpost: 1 },
                    active: { missionId: 'nope', acceptedAtDay: 'x', notifiedComplete: 'no' },
                    stats: { combatWins: -2.8 },
                    standing: -3.2,
                    loyaltyPoints: 11.9,
                    offers: [{ missionId: 'build_outpost', offeredAtDay: 2.3, expiresAtDay: 1 }, { missionId: 'build_outpost', offeredAtDay: 1, expiresAtDay: 1 }, { missionId: 'nope', offeredAtDay: 1, expiresAtDay: 1 }, null],
                    cooldowns: { build_outpost: 3.7, invalid: 2, grow_population: -1 },
                    lastOfferDay: -5,
                    lastUpdateAt: 'bad'
                });
                record('normalize clamps combatWins >= 0', !!(norm && norm.stats && norm.stats.combatWins === 0));
                record('normalize clamps standing >= 0', !!(norm && norm.standing === 0));
                record('normalize floors loyaltyPoints', !!(norm && norm.loyaltyPoints === 11));
                record('normalize clears invalid active', !!(norm && norm.active === null));
                record('normalize expands completed mission map', !!(norm && norm.completed && Object.keys(defs).every(id => Object.prototype.hasOwnProperty.call(norm.completed, id))));
                record('normalize filters offers', !!(norm && Array.isArray(norm.offers) && norm.offers.length === 1 && norm.offers[0] && norm.offers[0].missionId === 'build_outpost'));
                record('normalize filters cooldowns', !!(norm && norm.cooldowns && norm.cooldowns.build_outpost === 3 && !Object.prototype.hasOwnProperty.call(norm.cooldowns, 'invalid') && !Object.prototype.hasOwnProperty.call(norm.cooldowns, 'grow_population')));
                record('normalize clamps lastOfferDay >= 0', !!(norm && norm.lastOfferDay === 0));
            } catch (e) {
                record('normalizeAgentMissionsState', false, e && e.message ? e.message : String(e));
            }

            try {
                if (!this.agentMissionDefs) this.agentMissionDefs = this.getAgentMissionDefinitions();
                if (!this.agentMissions) this.agentMissions = this.createDefaultAgentMissionsState(this.agentMissionDefs);
                this.agentMissions = this.normalizeAgentMissionsState(this.agentMissions);

                this.agentMissions.standing = 5;
                this.agentMissions.loyaltyPoints = 77;
                if (!this.agentMissions.stats) this.agentMissions.stats = { combatWins: 0 };
                this.agentMissions.stats.combatWins = 9;
                this.agentMissions.offers = [{ missionId: 'build_outpost', offeredAtDay: 10, expiresAtDay: 11 }];
                this.agentMissions.cooldowns = { build_outpost: 12 };
                this.agentMissions.lastOfferDay = 10;
                this.saveGame({ silent: true });

                const roundtripStr = localStorage.getItem('ep_save_v2');
                const roundtrip = roundtripStr ? JSON.parse(roundtripStr) : null;
                const am = roundtrip && roundtrip.agentMissions ? roundtrip.agentMissions : null;
                record('local save persists standing', !!(am && am.standing === 5));
                record('local save persists loyaltyPoints', !!(am && am.loyaltyPoints === 77));
                record('local save persists combatWins', !!(am && am.stats && am.stats.combatWins === 9));
                record('local save persists offers', !!(am && Array.isArray(am.offers) && am.offers.length === 1 && am.offers[0] && am.offers[0].missionId === 'build_outpost'));
                record('local save persists cooldowns', !!(am && am.cooldowns && am.cooldowns.build_outpost === 12));
                record('local save persists lastOfferDay', !!(am && am.lastOfferDay === 10));
            } catch (e) {
                record('local save persists agentMissions fields', false, e && e.message ? e.message : String(e));
            }

            try {
                const savedStr = localStorage.getItem('ep_save_v2');
                const saved = savedStr ? JSON.parse(savedStr) : null;
                if (!saved) {
                    record('loadGameData normalization', false, 'missing save data');
                } else {
                    const corrupted = JSON.parse(JSON.stringify(saved));
                    corrupted.agentMissions = {
                        completed: { build_outpost: true },
                        active: { missionId: 'invalid', acceptedAtDay: 1, notifiedComplete: false },
                        stats: { combatWins: -4.2 },
                        standing: -2,
                        loyaltyPoints: 12.9,
                        lastUpdateAt: 'bad'
                    };

                    const notifyTmp = this.notify;
                    this.notify = () => { };
                    try {
                        this.loadGameData(corrupted);
                    } finally {
                        this.notify = notifyTmp;
                    }

                    record('loadGameData normalizes standing', !!(this.agentMissions && this.agentMissions.standing === 0));
                    record('loadGameData normalizes loyaltyPoints', !!(this.agentMissions && this.agentMissions.loyaltyPoints === 12));
                    record('loadGameData normalizes combatWins', !!(this.agentMissions && this.agentMissions.stats && this.agentMissions.stats.combatWins === 0));
                    record('loadGameData clears invalid active', !!(this.agentMissions && this.agentMissions.active === null));
                }
            } catch (e) {
                record('loadGameData normalization', false, e && e.message ? e.message : String(e));
            }

            try {
                if (this.cloud && typeof this.cloud.saveGame === 'function' && typeof this.cloud.loadGame === 'function' && typeof this.saveToCloud === 'function' && typeof this.loadFromCloud === 'function') {
                    cloudSaveOrig = this.cloud.saveGame;
                    cloudLoadOrig = this.cloud.loadGame;

                    let cloudData = null;
                    this.cloud.saveGame = async (gameId, slotId, saveData) => {
                        cloudData = saveData;
                        return { data: true, error: null };
                    };
                    this.cloud.loadGame = async (gameId, slotId) => ({ data: cloudData, error: null });

                    if (!this.agentMissions) this.agentMissions = this.createDefaultAgentMissionsState(this.agentMissionDefs);
                    this.agentMissions = this.normalizeAgentMissionsState(this.agentMissions);
                    this.agentMissions.standing = 6;
                    this.agentMissions.loyaltyPoints = 88;

                    await this.saveToCloud();
                    record('saveToCloud includes standing', !!(cloudData && cloudData.agentMissions && cloudData.agentMissions.standing === 6));
                    record('saveToCloud includes loyaltyPoints', !!(cloudData && cloudData.agentMissions && cloudData.agentMissions.loyaltyPoints === 88));

                    this.agentMissions.standing = 0;
                    this.agentMissions.loyaltyPoints = 0;
                    await this.loadFromCloud();
                    record('loadFromCloud restores standing', !!(this.agentMissions && this.agentMissions.standing === 6));
                    record('loadFromCloud restores loyaltyPoints', !!(this.agentMissions && this.agentMissions.loyaltyPoints === 88));
                } else {
                    record('cloud save/load hooks present', true, 'skipped');
                }
            } catch (e) {
                record('cloud save/load roundtrip (stubbed)', false, e && e.message ? e.message : String(e));
            }
        } finally {
            if (cloudSaveOrig && this.cloud) this.cloud.saveGame = cloudSaveOrig;
            if (cloudLoadOrig && this.cloud) this.cloud.loadGame = cloudLoadOrig;
            if (notifyOrig) this.notify = notifyOrig;

            try {
                if (baselineData) {
                    const notifyTmp = this.notify;
                    this.notify = () => { };
                    try {
                        this.loadGameData(baselineData);
                    } finally {
                        this.notify = notifyTmp;
                    }
                }
            } catch (e) { }

            try {
                if (preLocalSave === null) localStorage.removeItem('ep_save_v2');
                else localStorage.setItem('ep_save_v2', preLocalSave);
            } catch (e) { }
        }

        const passed = results.filter(r => r.pass).length;
        const failed = results.length - passed;
        const ok = failed === 0;

        if (ok) console.log('[AgentMissionsTest] PASS', { passed, failed, results });
        else console.warn('[AgentMissionsTest] FAIL', { passed, failed, results });

        if (shouldToast && notifyOrig) {
            notifyOrig(ok ? `Agent Missions self-tests passed (${passed}/${results.length}).` : `Agent Missions self-tests failed (${failed} failed). See console.`, ok ? 'success' : 'danger');
        }

        return { ok, passed, failed, results };
    }

    addColonist() {
        if (this.colonists.length >= this.getPopulationCap()) {
            this.notify('Insufficient housing capacity for new colonist.', 'warning');
            return;
        }
        const keys = Object.keys(TRAIT_DEFINITIONS);
        const trait = (Math.random() < 0.5) ? keys[Math.floor(Math.random() * keys.length)] : null;
        const col = {
            id: 'col_' + Date.now() + Math.random(),
            name: this.generateName(),
            job: 'unemployed',
            morale: 100,
            traits: trait ? [trait] : [],
            needs: { hunger: 100, oxygen: 100, rest: 100 }
        };
        this.colonists.push(col);
        this.notify(`New arrival: ${col.name} ${trait ? `(${trait})` : ''}`, 'success');
        this.updateResourceUI();
    }

    getPopulationCap() {
        const base = (typeof this.basePopulationCap === 'number' && Number.isFinite(this.basePopulationCap)) ? this.basePopulationCap : 0;
        const cb = this.getPilotColonyBonuses ? this.getPilotColonyBonuses() : { popCapBonus: 0 };

        const sources = [];
        const addSource = (arr) => {
            if (!Array.isArray(arr)) return;
            if (sources.includes(arr)) return;
            sources.push(arr);
        };

        addSource(this.structures);

        if (this.systemStates && this.currentSystemId !== undefined && this.currentSystemId !== null) {
            const planetId = String(this.currentSystemId);
            const moonId = `${planetId}_moon`;
            const otherId = this.isOnMoon ? planetId : moonId;
            const otherList = this.systemStates[otherId] ? this.systemStates[otherId].structures : null;
            if (otherList) addSource(otherList);
        }

        let cap = base + cb.popCapBonus;
        sources.forEach((sList) => {
            sList.forEach((s) => {
                const bDef = this.buildingTypes[s.type];
                if (bDef && bDef.capacity) {
                    cap += bDef.capacity * Math.pow(1.5, (s.level || 1) - 1);
                }
            });
        });

        return cap;
    }

    normalizeColonist(c) {
        if (!c || typeof c !== 'object') return c;

        if (!c.id) c.id = 'col_' + Date.now() + Math.random();
        if (!c.name) c.name = this.generateName();
        if (!c.job) c.job = 'unemployed';
        if (typeof c.morale !== 'number' || Number.isNaN(c.morale)) c.morale = 100;
        if (!Array.isArray(c.traits)) c.traits = [];

        if (!c.needs || typeof c.needs !== 'object') c.needs = {};
        if (typeof c.needs.hunger !== 'number' || Number.isNaN(c.needs.hunger)) c.needs.hunger = 100;
        if (typeof c.needs.oxygen !== 'number' || Number.isNaN(c.needs.oxygen)) c.needs.oxygen = 100;
        if (typeof c.needs.rest !== 'number' || Number.isNaN(c.needs.rest)) c.needs.rest = 100;

        c.needs.hunger = Math.max(0, Math.min(100, c.needs.hunger));
        c.needs.oxygen = Math.max(0, Math.min(100, c.needs.oxygen));
        c.needs.rest = Math.max(0, Math.min(100, c.needs.rest));
        c.morale = Math.max(0, Math.min(100, c.morale));

        return c;
    }

    generateName() {
        const names = ['Sarah', 'John', 'Ada', 'Elon', 'Yuri', 'Neil', 'Mae', 'Buzz', 'Valentina', 'Chris'];
        return names[Math.floor(Math.random() * names.length)] + ' ' + Math.floor(Math.random() * 100);
    }

    updateResourceUI() {
        const panel = this.container.querySelector('#ep-res-panel');
        if (!panel) return;
        const icons = { energy: '⚡', oxygen: '💨', minerals: '⛏️', food: '🌱', credits: '💳', data: '💾', alloys: '🏭', circuits: '📟', helium3: '⚛️' };
        const secStatus = this.systemSecurity[this.currentSystemId] || 1.0;
        const isClaimed = this.claims[this.currentSystemId] === 'player';
        const secColor = secStatus >= 0.5 ? '#22c55e' : (secStatus > 0 ? '#eab308' : '#ef4444');
        const secLabel = secStatus >= 0.5 ? 'High' : (secStatus > 0 ? 'Low' : 'Null');

        panel.innerHTML = `
            <div class="ep-res-item" title="System Security & Sovereignty">
                <span class="ep-res-icon" style="color:${secColor}">🛡️</span>
                <span class="ep-res-val" style="color:${secColor}">${secStatus.toFixed(1)} ${secLabel} ${isClaimed ? '[OWNED]' : ''}</span>
            </div>
            <div class="ep-res-item"><span class="ep-res-icon">👥</span><span class="ep-res-val">${this.colonists.length}<span style="font-size:0.7em; color:#64748b">/${this.getPopulationCap()}</span></span></div>
            ${Object.keys(this.resources).map(k => {
            if (k === 'credits') return '';
            const val = Math.floor(this.resources[k]);
            const max = this.caps[k] || 9999;
            const isLow = val < max * 0.1;
            const isFull = val >= max;
            return `<div class="ep-res-item"><span class="ep-res-icon">${icons[k]}</span><span class="ep-res-val" style="color:${isLow ? '#ef4444' : (isFull ? '#eab308' : '#38bdf8')}">${val}<span style="font-size:0.7em; color:#64748b">/${max}</span></span></div>`;
        }).join('')}
        `;
        const dayEl = this.container.querySelector('#ep-day-display');
        if (dayEl) dayEl.innerText = `${this.planetData.name} | Day ${this.day} | ${Math.floor(this.timeOfDay).toString().padStart(2, '0')}:00 | ${Math.round(this.temperature)}°C`;
    }

    notify(msg, type = 'info') {
        const notif = document.getElementById('ep-notifications');
        if (!notif) return;
        const el = document.createElement('div');
        el.className = 'ep-notification';
        el.textContent = msg;
        if (type === 'danger') el.style.borderLeftColor = '#ef4444';
        if (type === 'success') el.style.borderLeftColor = '#22c55e';
        notif.prepend(el);
        setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 4000);
    }

    showTooltip(e, text) {
        const tt = document.getElementById('ep-tooltip');
        if (tt) {
            tt.style.display = 'block';
            tt.innerHTML = text; // Allow HTML
            tt.style.left = e.clientX + 'px';
            tt.style.top = (e.clientY - 40) + 'px';
        }
    }

    hideTooltip() {
        const tt = document.getElementById('ep-tooltip');
        if (tt) tt.style.display = 'none';
    }

    createBuildMenu() {
        const menu = this.container.querySelector('#ep-build-menu');
        menu.innerHTML = '';

        if (this.inventory.length === 0) {
            menu.innerHTML = '<div style="color:#64748b; padding:10px; font-size:0.8rem;">Inventory Empty. Use Industry to build structures.</div>';
            return;
        }

        this.inventory.forEach(item => {
            const b = this.buildingTypes[item.type];
            if (!b) return;

            const btn = document.createElement('div');
            btn.className = 'ep-build-btn';
            if (this.selectedInventoryItem === item.type) btn.classList.add('active');

            btn.innerHTML = `
                <div class="ep-build-icon" style="color:${new THREE.Color(b.color).getStyle()}">${b.icon}</div>
                <div style="font-weight:bold;">${b.name}</div>
                <div class="ep-build-cost">Count: ${item.count}</div>
            `;

            btn.onclick = () => {
                this.audio.playClick();
                this.selectInventoryItem(item.type, btn);
            };
            btn.onmouseenter = (e) => this.showTooltip(e, b.desc + " (Click to Anchor)");
            btn.onmouseleave = () => this.hideTooltip();
            menu.appendChild(btn);
        });
    }

    selectInventoryItem(type, btnElement) {
        if (this.selectedInventoryItem === type) {
            this.selectedInventoryItem = null;
            btnElement.classList.remove('active');
        } else {
            this.selectedInventoryItem = type;
            this.container.querySelectorAll('.ep-build-btn').forEach(b => b.classList.remove('active'));
            btnElement.classList.add('active');
            this.notify(`Select a tile to anchor ${this.buildingTypes[type].name}`);
        }
    }

    formatCost(cost) {
        return Object.keys(cost).map(k => {
            const icons = { minerals: 'Min', energy: 'En', alloys: 'Aly', circuits: 'Cir', data: 'Dat' };
            return `${icons[k] || k}:${cost[k]}`;
        }).join(' ');
    }

    selectBuilding(type, btnElement) {
        if (this.selectedBuilding === type) {
            this.selectedBuilding = null;
            btnElement.classList.remove('active');
        } else {
            this.selectedBuilding = type;
            this.container.querySelectorAll('.ep-build-btn').forEach(b => b.classList.remove('active'));
            btnElement.classList.add('active');
            this.notify(`Select a tile to construct ${this.buildingTypes[type].name}`);
        }
    }

    getClosestTile(point) {
        let minDist = Infinity;
        let closest = null;
        let index = -1;
        // Optimization: Could use spatial hash/octree, but for 200 tiles linear scan is fine.
        this.tiles.forEach((t, i) => {
            const d = t.position.distanceTo(point);
            if (d < minDist) { minDist = d; closest = t; index = i; }
        });
        if (minDist < 4) return { tile: closest, index: index }; // Threshold for selection
        return null;
    }

    onPointerMove(e) {
        if (this.isCombatActive) {
            if (this.cursorMesh) this.cursorMesh.visible = false;
            return;
        }
        if (!this.planetMesh) return;
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.planetMesh);
        if (intersects.length > 0) {
            const point = intersects[0].point;
            const match = this.getClosestTile(point);

            if (match) {
                const faceNormal = point.clone().normalize(); // Accurate normal for sphere
                if (this.cursorMesh) {
                    this.cursorMesh.position.copy(match.tile.position).add(faceNormal.multiplyScalar(0.5));
                    this.cursorMesh.lookAt(match.tile.position.clone().add(faceNormal));
                    this.cursorMesh.visible = true;
                }
            } else if (this.cursorMesh) this.cursorMesh.visible = false;
        } else {
            if (this.cursorMesh) this.cursorMesh.visible = false;
        }
    }

    onPointerDown(e) {
        if (this.isCombatActive) return;
        console.log("onPointerDown", e.clientX, e.clientY);
        if (e.target.closest('.ep-build-menu') || e.target.closest('.ep-top-bar') || e.target.closest('.ep-modal')) {
            console.log("Click blocked by UI");
            return;
        }

        // Safety check for camera/raycaster/planet
        if (!this.camera || !this.raycaster || !this.planetMesh) {
            console.error("Missing core components for raycast:", this.camera, this.raycaster, this.planetMesh);
            return;
        }

        this.raycaster.setFromCamera(this.mouse, this.camera);
        // Intersect object default recursive is false. If planetMesh has children but geometry is on child, we need recursive=true if planetMesh is a Group.
        // Earlier code showed planetMesh is a MESH from createPlanet. So recursive logic holds.
        // But let's check intersections count.
        const intersects = this.raycaster.intersectObject(this.planetMesh, false);
        console.log("Intersects:", intersects.length);

        if (intersects.length > 0) {
            const point = intersects[0].point;
            const match = this.getClosestTile(point);
            console.log("Closest Tile Match:", match);
            if (match) {
                const normal = match.tile.position.clone().normalize();
                this.handleTileClick(match.index, point, normal);
            }
        }
    }

    handleTileClick(tileIdx, point, normal) {
        const tile = this.tiles[tileIdx];
        if (!tile) return;

        // Archaeology Hook
        if (this.archaeology && this.archaeology.handleTileClick(tile)) return;

        if (this.selectedInventoryItem) {
            const itemType = this.selectedInventoryItem;
            const itemIdx = this.inventory.findIndex(i => i.type === itemType);

            if (itemIdx === -1) {
                this.notify(`No ${itemType} items in inventory!`, "danger");
                this.selectedInventoryItem = null;
                return;
            }

            const building = this.buildingTypes[itemType];
            const mesh = this.placeBuildingMesh(point, normal, itemType);
            if (mesh) this.buildingMeshes[tileIdx] = mesh;
            this.createEffect(point, normal, 0x4ade80);

            // Set Tile Data
            tile.building = itemType;
            tile.level = 1;

            // Add to structures list
            this.structures.push({
                id: 'str_' + Date.now(),
                type: itemType,
                level: 1,
                tileId: tileIdx,
                health: 100
            });

            // Consume from inventory
            this.inventory[itemIdx].count--;
            if (this.inventory[itemIdx].count <= 0) {
                this.inventory.splice(itemIdx, 1);
                this.selectedInventoryItem = null;
            }

            this.updateResourceUI();
            this.audio.playBuild();
            this.notify(`${building.name} Anchored!`, "success");
            this.createBuildMenu(); // Refresh to show updated inventory counts
        } else if (this.selectedBuilding) {
            this.notify("Instant construction disabled. Use the Industry menu to manufacture structures.", "warning");
            this.selectedBuilding = null;
            this.createBuildMenu();
        } else {
            // Interact with existing building
            if (tile.building) {
                this.showBuildingUI(tileIdx);
            } else {
                this.notify("Empty tile. Select a building to construct.", "info");
            }
        }
    }

    showBuildingUI(tileIdx) {
        const tile = this.tiles[tileIdx];
        if (!tile || !tile.building) return;

        const struct = this.structures.find(s => s.tileId === tileIdx);
        if (!struct) return; // Should detect mismatch

        const def = this.buildingTypes[struct.type];
        const modal = document.getElementById('ep-building-modal');
        const title = document.getElementById('ep-bld-title');
        const content = document.getElementById('ep-bld-content');

        if (modal) modal.style.display = 'flex';
        if (title) title.innerText = `${def.name} (Lv ${struct.level || 1})`;

        // Calculate Upgrade Cost
        const nextLevel = (struct.level || 1) + 1;
        const upgradeCost = {};
        let costHtml = '';
        let canAfford = true;

        for (let res in def.cost) {
            upgradeCost[res] = Math.floor(def.cost[res] * Math.pow(1.5, (struct.level || 1)));
            const afford = this.resources[res] >= upgradeCost[res];
            if (!afford) canAfford = false;
            costHtml += `<div style="color:${afford ? '#fff' : '#ef4444'}">${res}: ${upgradeCost[res]}</div>`;
        }

        // Stats
        let statsHtml = '';
        if (def.output) {
            statsHtml += '<div><b>Production:</b></div>';
            for (let res in def.output) {
                const current = (def.output[res] * Math.pow(1.2, (struct.level || 1) - 1)).toFixed(1);
                const next = (def.output[res] * Math.pow(1.2, nextLevel - 1)).toFixed(1);
                statsHtml += `<div>${res}: <span style="color:#38bdf8">${current}</span> ➤ <span style="color:#4ade80">${next}</span></div>`;
            }
        }
        if (def.capacity) {
            statsHtml += '<div><b>Capacity:</b></div>';
            const current = Math.floor(def.capacity * Math.pow(1.2, (struct.level || 1) - 1));
            const next = Math.floor(def.capacity * Math.pow(1.2, nextLevel - 1));
            statsHtml += `<div>Residents: <span style="color:#38bdf8">${current}</span> ➤ <span style="color:#4ade80">${next}</span></div>`;
        }

        content.innerHTML = `
            <div style="text-align:center; padding:10px;">
                <div style="font-size:3em; margin-bottom:10px;">${def.icon}</div>
                <div style="margin-bottom:15px; color:#94a3b8;">${def.desc}</div>
                
                <div style="background:#1e293b; padding:10px; border-radius:6px; margin-bottom:15px; text-align:left;">
                    ${statsHtml || 'No active output.'}
                </div>

                <div style="margin-bottom:5px; font-weight:bold; color:#fbbf24;">Upgrade Cost:</div>
                <div style="display:flex; gap:10px; justify-content:center; margin-bottom:15px; font-size:0.9em;">
                    ${costHtml}
                </div>

                <div style="display:flex; gap:10px; justify-content:center;">
                    <button class="ep-sys-btn" ${canAfford ? '' : 'disabled'} onclick="window.game.upgradeBuilding(${tileIdx})" style="border-color:${canAfford ? '#4ade80' : '#475569'}; color:${canAfford ? '#4ade80' : '#475569'}">
                        UPGRADE
                    </button>
                    <button class="ep-sys-btn" onclick="window.game.demolishBuilding(${tileIdx})" style="border-color:#ef4444; color:#ef4444;">
                        DEMOLISH
                    </button>
                </div>
            </div>
        `;
    }

    upgradeBuilding(tileIdx) {
        const struct = this.structures.find(s => s.tileId === tileIdx);
        if (!struct) return;
        const def = this.buildingTypes[struct.type];

        // Final resource check
        const upgradeCost = {};
        for (let res in def.cost) {
            upgradeCost[res] = Math.floor(def.cost[res] * Math.pow(1.5, (struct.level || 1)));
            if (this.resources[res] < upgradeCost[res]) {
                this.notify("Insufficient Resources!", "danger");
                return;
            }
        }

        // Deduct
        for (let res in upgradeCost) {
            this.resources[res] -= upgradeCost[res];
        }

        struct.level = (struct.level || 1) + 1;
        this.audio.playUnlock(); // or level up sound
        this.notify(`${def.name} upgraded to Level ${struct.level}!`, "success");
        this.createEffect(this.getTilePos(tileIdx), new THREE.Vector3(0, 1, 0), 0xfbbf24);

        // Refresh UI
        this.showBuildingUI(tileIdx);
        this.updateResourceUI();
        this.showBuildingUI(tileIdx);
        this.updateResourceUI();
    }

    // --- 3D SPACE COMBAT CONTROL ---

    launchFighters() {
        if (!this.combatScene) return;

        console.log("Launching Fighters into Orbit...");
        this.notify("Alert! Fighters Launching... Switching to Combat View.", "warning");
        this.audio.playWarp(); // Re-use warp sound

        // 1. Hide Planet View
        document.getElementById('ui-container').style.display = 'none';

        // 2. Start Combat Scene
        this.combatScene.start();

        // 3. Switch Rendering Loop
        this.isCombatActive = true;
    }

    retreatFromCombat(result = null) {
        if (!this.combatScene) return;

        console.log("Retreating to Surface...");
        this.notify("Fighters Returning to Base.", "info");

        const outcome = (result && result.outcome != null) ? String(result.outcome) : null;
        const reward = (result && result.reward && typeof result.reward === 'object') ? result.reward : null;
        if (outcome === 'victory') {
            if (!this.agentMissionDefs) this.agentMissionDefs = this.getAgentMissionDefinitions();
            if (!this.agentMissions) this.agentMissions = this.createDefaultAgentMissionsState(this.agentMissionDefs);
            this.agentMissions = this.normalizeAgentMissionsState(this.agentMissions);
            if (!this.agentMissions.stats) this.agentMissions.stats = { combatWins: 0 };
            const wins = (typeof this.agentMissions.stats.combatWins === 'number' && Number.isFinite(this.agentMissions.stats.combatWins)) ? this.agentMissions.stats.combatWins : 0;
            this.agentMissions.stats.combatWins = Math.max(0, Math.floor(wins)) + 1;
        }
        if (outcome === 'victory' && reward && this.resources) {
            const gained = [];
            Object.keys(reward).forEach((k) => {
                const amt = reward[k];
                const n = (typeof amt === 'number' && Number.isFinite(amt)) ? amt : Number(amt);
                if (!(typeof n === 'number' && Number.isFinite(n)) || n <= 0) return;
                if (!Object.prototype.hasOwnProperty.call(this.resources, k)) return;
                const cur = (typeof this.resources[k] === 'number' && Number.isFinite(this.resources[k])) ? this.resources[k] : 0;
                this.resources[k] = cur + n;
                gained.push(`+${Math.floor(n)} ${k}`);
            });
            if (gained.length > 0) {
                this.notify(`Combat rewards: ${gained.join(', ')}`, 'success');
                this.updateResourceUI();
            }
        }

        this.updateAgentMissions();

        // 1. Stop Combat Scene
        this.combatScene.stop();
        this.isCombatActive = false;

        // 2. Show Planet UI
        document.getElementById('ui-container').style.display = 'block';

        // 3. Reset Camera to Planet
        // this.camera.position.set(0, 50, 100);
        // this.camera.lookAt(0, 0, 0);
        this.controls.enabled = true;
    }

    demolishBuilding(tileIdx) {
        const tile = this.tiles[tileIdx];
        if (!tile || !tile.building) return;

        // Refund? 50% of base cost
        const def = this.buildingTypes[tile.building];
        for (let res in def.cost) {
            this.resources[res] += Math.floor(def.cost[res] * 0.5);
        }

        // Remove from structures
        this.structures = this.structures.filter(s => s.tileId !== tileIdx);
        this.removeBuildingMesh(tileIdx);

        // Clear Tile
        tile.building = null;
        tile.level = null;

        // Visuals? Need to remove mesh.
        // Quick hack: Redraw planet or specific tile?
        // Ideally we keep a map of tileId -> Mesh Group to remove it.
        // For now, just removing the structure logic. 
        // Force refresh visual if possible
        // Let's assume re-entering system or save/load fixes visuals, but for immediate effect:
        // We'd need to track mesh objects. 
        // Note: The current `exoplanet-pioneer.js` handles placement by `placeBuildingMesh` which adds to scene/group?
        // Actually `placeBuildingMesh` is implemented where? It was in `handleTileClick` but I don't see the definition in the previous view. 
        // It's likely lower down or in `BuildingArchitect`.
        // Wait, `placeBuildingMesh` was called in `handleTileClick` line 999. 
        // If I don't remove the mesh, it stays. 
        // I will notify the user to refresh for visual update or implement mesh removal if the map exists.

        this.notify("Building Demolished. Resources refunded.", "info");
        document.getElementById('ep-building-modal').style.display = 'none';
        this.updateResourceUI();

        // Trigger a visual refresh if possible, otherwise just update logic.
        // If we want to be fancy, we'd add `this.buildingMeshes` map.
    }

    placeBuildingMesh(worldPosition, normal, buildingDef) {
        console.log("placeBuildingMesh:", worldPosition);

        // Initialize Architect for beautiful buildings
        if (!this.architect) this.architect = new BuildingArchitect(this.scene);

        // Deduce Type
        let type = 'generic';
        if (typeof buildingDef === 'string') {
            type = buildingDef;
        } else if (buildingDef && buildingDef.icon) {
            if (buildingDef.icon === '⚡') type = 'solar';
            else if (buildingDef.icon === '🏠') type = 'hab';
            else if (buildingDef.icon === '⛏️') type = 'mine';
            else if (buildingDef.icon === '☢️') type = 'fusion';
            else if (buildingDef.icon === '📦') type = 'store';
            else if (buildingDef.icon === '🔬') type = 'lab';
            else if (buildingDef.icon === '🌱') type = 'farm';
            else if (buildingDef.icon === '🏭') type = 'refinery';
            else if (buildingDef.icon === '💨') type = 'oxy';
            else if (buildingDef.icon === '🚀') type = 'launch_site';
        }

        // Position at WORLD coordinates, lifted above surface
        const liftedPos = worldPosition.clone().add(normal.clone().multiplyScalar(1.5));

        let meshGroup;
        try {
            // Create beautiful building using Architect (pass world position)
            meshGroup = this.architect.createBuilding(type, liftedPos, normal);
        } catch (e) {
            console.error("BuildingArchitect failed, using fallback cube:", e);
            // Fallback to colored cube if architect fails
            const colorMap = {
                'solar': 0xfacc15, 'hab': 0x60a5fa, 'mine': 0x94a3b8, 'fusion': 0xef4444,
                'store': 0xf472b6, 'lab': 0xa855f7, 'farm': 0x4ade80, 'refinery': 0xff8c00,
                'oxy': 0xa5f3fc, 'launch_site': 0xcbd5e1, 'generic': 0xff0000
            };
            const geo = new THREE.BoxGeometry(2, 2, 2);
            const mat = new THREE.MeshBasicMaterial({ color: colorMap[type] || 0xff0000 });
            meshGroup = new THREE.Mesh(geo, mat);
            meshGroup.position.copy(liftedPos);
        }

        if (meshGroup) {
            // Orient to surface normal
            meshGroup.lookAt(liftedPos.clone().add(normal));
            meshGroup.rotateX(Math.PI / 2); // Correct orientation

            // User Rotation
            if (this.buildingOrient) {
                meshGroup.rotateY(this.buildingOrient * (Math.PI / 2));
            }

            // Scale up for visibility
            meshGroup.scale.set(1.5, 1.5, 1.5);

            // Disable culling on all children
            meshGroup.frustumCulled = false;
            meshGroup.traverse(c => {
                c.frustumCulled = false;
                if (c.material) c.material.side = THREE.DoubleSide;
            });

            // CRITICAL: Add to SCENE, not planetMesh
            this.scene.add(meshGroup);

            console.log("Beautiful building placed:", type, "at", meshGroup.position);
        }

        return meshGroup;
    }

    /**
     * DEBUG TOOL: Verifies that all logical buildings have visible meshes.
     * Can trigger auto-repairs if meshes are missing.
     */
    verifyBuildingIntegrity() {
        if (!this.structures || !this.buildingMeshes) return;

        let issues = 0;
        this.structures.forEach(struct => {
            const mesh = this.buildingMeshes[struct.tileId];

            // 1. Check if mesh exists
            if (!mesh) {
                console.warn(`⚠️ Integrity Issue: Structure at Tile ${struct.tileId} (${struct.type}) has NO MESH. Attempting repair...`);
                // Attempt Rebuild
                const tile = this.tiles.find(t => t.id === struct.tileId);
                if (tile) {
                    const normal = tile.position.clone().normalize();
                    const newMesh = this.placeBuildingMesh(tile.position, normal, struct.type);
                    if (newMesh) {
                        this.buildingMeshes[struct.tileId] = newMesh;
                        console.log(`✅ Repaired Mesh for Tile ${struct.tileId}`);
                    } else {
                        console.error(`❌ Failed to repair Mesh for Tile ${struct.tileId}`);
                    }
                }
                issues++;
                return;
            }

            // 2. Check Scene Graph
            if (mesh.parent !== this.planetMesh) {
                console.warn(`⚠️ Integrity Issue: Mesh for Tile ${struct.tileId} is detached from Planet! Re-attaching...`);
                this.planetMesh.add(mesh);
                issues++;
            }

            // 3. Check Visibility/Scale
            if (!mesh.visible) {
                console.warn(`⚠️ Integrity Issue: Mesh for Tile ${struct.tileId} is HIDDEN. Setting visible = true.`);
                mesh.visible = true;
                issues++;
            }
            if (mesh.scale.length() < 0.1) {
                console.warn(`⚠️ Integrity Issue: Mesh for Tile ${struct.tileId} has near-zero scale. Resetting to 1.`);
                mesh.scale.set(1, 1, 1);
                issues++;
            }
        });

        if (issues === 0) {
            // console.log("Building Integrity Check Passed: All systems nominal.");
        } else {
            console.log(`Building Integrity Check Complete. Found and attempted to fix ${issues} issues.`);
        }
    }

    removeBuildingMesh(tileId) {
        if (this.buildingMeshes[tileId]) {
            this.planetMesh.remove(this.buildingMeshes[tileId]);
            delete this.buildingMeshes[tileId];
        }
    }

    checkMerge(tile) {
        // Find partners
        const partners = [];
        const range = 5; // User approved leeway

        this.structures.forEach(s => {
            if (s.tileId === tile.id) return;
            if (s.type === tile.building && s.level === 3) { // Require Level 3 to merge
                const otherTile = this.tiles.find(t => t.id === s.tileId);
                if (otherTile) {
                    const d = tile.position.distanceTo(otherTile.position);
                    if (d <= range) {
                        partners.push(otherTile);
                    }
                }
            }
        });
        return partners;
    }

    mergeBuildings(tileId) {
        const tile = this.tiles.find(t => t.id === tileId);
        if (!tile) return;

        // Find FIRST valid partner (simplest logic)
        const partners = this.checkMerge(tile);
        if (partners.length === 0) return;

        const partner = partners[0];
        const type = tile.building;

        // Remove Partner
        partner.building = null;
        partner.level = 0;
        this.structures = this.structures.filter(s => s.tileId !== partner.id);
        this.removeBuildingMesh(partner.id);
        this.removeBuildingMesh(tile.id); // Remove current to replace with Ultimate

        // Upgrade Current Tile to Ultimate
        const ultType = `ultimate_${type}`;
        const mesh = this.placeBuildingMesh(tile.position, tile.position.clone().normalize(), ultType);
        if (mesh) this.buildingMeshes[tile.id] = mesh;

        // Logic Update
        tile.building = ultType; // New type 
        tile.level = 1; // Reset level or keep? unique type doesn't need levels yet.

        const struct = this.structures.find(s => s.tileId === tileId);
        if (struct) struct.type = ultType;

        this.notify(`MERGE COMPLETE! Ultimate Structure Created!`, 'success');
        this.audio.playScan(); // Sound effect
    }
    setupSuns(config = null) {
        // Clear existing suns
        if (this.suns) {
            this.suns.forEach(s => {
                this.scene.remove(s.light);
                if (s.mesh) this.scene.remove(s.mesh);
                if (s.helper) this.scene.remove(s.helper);
            });

        }

        this.suns = [];
        this.sunLight = null; // Reference to main shadow caster

        // Default Config
        if (!config) {
            config = { type: 'single', stars: [{ color: 0xfff7ed, size: 1.0 }] };
        }

        config.stars.forEach((star, index) => {
            const light = new THREE.DirectionalLight(star.color, 1.5);

            // Positioning Logic for Binary/Trinary
            let pos = new THREE.Vector3(20, 10, 20); // Default
            if (config.type === 'binary') {
                if (index === 0) pos.set(30, 20, 20);
                else pos.set(-30, 10, -20);
            } else if (config.type === 'trinary') {
                if (index === 0) pos.set(30, 25, 30);
                else if (index === 1) pos.set(-30, 10, 0);
                else pos.set(0, -10, -30);
            }

            light.position.copy(pos);

            // Only the first/main star casts shadows to save perf/complexity
            if (index === 0) {
                light.castShadow = true;
                light.shadow.mapSize.width = 2048;
                light.shadow.mapSize.height = 2048;
                this.sunLight = light;
            }

            this.scene.add(light);

            // Visual Representation (a glowing sphere)
            const geo = new THREE.SphereGeometry(2 * star.size, 16, 16);
            const mat = new THREE.MeshBasicMaterial({ color: star.color });
            const mesh = new THREE.Mesh(geo, mat);
            // Push sun far away but visible
            mesh.position.copy(pos.normalize().multiplyScalar(400));
            this.scene.add(mesh);

            this.suns.push({ light, mesh });
        });
    }

    createEffect(pos, normal, color) {
        const particleCount = 8;
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const velocities = [];
        for (let i = 0; i < particleCount; i++) {
            positions.push(pos.x, pos.y, pos.z);
            velocities.push((Math.random() - 0.5) * 0.5 + normal.x, (Math.random() - 0.5) * 0.5 + normal.y, (Math.random() - 0.5) * 0.5 + normal.z);
        }
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({ color: color, size: 0.8, transparent: true });
        const points = new THREE.Points(geometry, material);
        this.scene.add(points);
        let life = 1.0;
        const anim = setInterval(() => {
            life -= 0.05;
            if (life <= 0) { clearInterval(anim); this.scene.remove(points); geometry.dispose(); material.dispose(); return; }
            const posAttr = geometry.attributes.position;
            for (let i = 0; i < particleCount; i++) {
                posAttr.setXYZ(i, posAttr.getX(i) + velocities[i * 3], posAttr.getY(i) + velocities[i * 3 + 1], posAttr.getZ(i) + velocities[i * 3 + 2] * 0.5);
            }
            posAttr.needsUpdate = true;
            material.opacity = life;
        }, 30);
    }

    openTechTree() {
        const modal = document.getElementById('ep-tech-modal');
        const grid = document.getElementById('ep-tech-grid');
    }

    openXenodex() {
        const modal = document.getElementById('ep-xenodex-modal');
        const content = document.getElementById('ep-xenodex-content');
        if (!modal || !content) return;

        modal.style.display = 'flex';

        const flora = (this.ecosystem && this.ecosystem.xenodex) ? this.ecosystem.xenodex.flora : [];
        const fauna = (this.ecosystem && this.ecosystem.xenodex) ? this.ecosystem.xenodex.fauna : [];

        if (flora.length === 0 && fauna.length === 0) {
            content.innerHTML = `<div style="text-align:center; color:#64748b; padding:40px;">No species discovered yet.<br>Build a Research Lab or explore more tiles!</div>`;
            return;
        }

        let html = '<div style="display:flex; flex-direction:column; gap:20px;">';

        // Flora Section
        if (flora.length > 0) {
            html += `
                <div>
                    <h3 style="color:#4ade80; border-bottom:1px solid #334155; margin-bottom:10px;">🌿 Flora (${flora.length})</h3>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                        ${flora.map(f => `
                            <div style="background:#0f172a; padding:10px; border-radius:6px; border:1px solid #166534;">
                                <div style="font-weight:bold; color:#86efac;">${f.name}</div>
                                <div style="font-size:0.8em; color:#cbd5e1;">${f.description || 'Unknown properties.'}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // Fauna Section
        if (fauna.length > 0) {
            html += `
                <div>
                    <h3 style="color:#f472b6; border-bottom:1px solid #334155; margin-bottom:10px;">🐾 Fauna (${fauna.length})</h3>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                        ${fauna.map(f => `
                            <div style="background:#0f172a; padding:10px; border-radius:6px; border:1px solid #9d174d;">
                                <div style="font-weight:bold; color:#f9a8d4;">${f.name}</div>
                                <div style="font-size:0.8em; color:#cbd5e1;">${f.description || 'Unknown behavior.'}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        html += '</div>';
        content.innerHTML = html;
    }

    researchTech(key) {
        const tech = this.technologies[key];
        if (this.resources.data >= tech.cost) {
            this.resources.data -= tech.cost;
            tech.unlocked = true;
            if (tech.effect) tech.effect();
            this.audio.playUnlock();
            this.notify(`${tech.name} Researched!`, "success");
            this.openTechTree();
            this.updateResourceUI();
        } else {
            this.audio.playError();
            this.notify("Insufficient Data!", "danger");
        }
    }

    serializeShipDesign(design) {
        if (!design || typeof design !== 'object') return null;

        const idsFrom = (arr) => Array.isArray(arr)
            ? arr.map(m => (m && m.id != null) ? String(m.id) : null).filter(Boolean)
            : [];

        return {
            id: (design.id != null) ? String(design.id) : null,
            name: (design.name != null) ? String(design.name) : 'Unknown Class',
            hullId: (design.hull && design.hull.id != null) ? String(design.hull.id) : null,
            engineId: (design.engine && design.engine.id != null) ? String(design.engine.id) : null,
            weaponIds: idsFrom(design.weapons),
            shieldIds: idsFrom(design.shields)
        };
    }

    deserializeShipDesigns(savedDesigns) {
        if (!this.shipDesigner || !this.shipDesigner.modules || !Array.isArray(savedDesigns)) return [];

        const out = [];
        savedDesigns.forEach((raw) => {
            if (!raw || typeof raw !== 'object') return;

            const name = (raw.name != null) ? String(raw.name) : 'Unknown Class';
            const hullId = (raw.hullId != null) ? String(raw.hullId) : null;
            const engineId = (raw.engineId != null) ? String(raw.engineId) : null;

            const hull = hullId ? this.shipDesigner.modules[hullId] : null;
            const engine = engineId ? this.shipDesigner.modules[engineId] : null;
            if (!hull || !engine || typeof ShipDesign !== 'function') return;

            const weaponIds = Array.isArray(raw.weaponIds)
                ? raw.weaponIds.map((id) => (id != null) ? String(id) : null).filter(Boolean)
                : [];
            const shieldIds = Array.isArray(raw.shieldIds)
                ? raw.shieldIds.map((id) => (id != null) ? String(id) : null).filter(Boolean)
                : [];

            const weapons = weaponIds.map(id => this.shipDesigner.modules[id]).filter(Boolean);
            const shields = shieldIds.map(id => this.shipDesigner.modules[id]).filter(Boolean);

            const design = new ShipDesign(name, hull, engine, weapons, shields);
            if (raw.id != null) design.id = String(raw.id);
            out.push(design);
        });

        return out;
    }

    serializeFleetShip(ship) {
        if (!ship || typeof ship !== 'object') return null;

        const id = (ship.id != null) ? String(ship.id) : null;
        const name = (ship.name != null) ? String(ship.name) : 'Unnamed Ship';
        const status = (ship.status != null) ? String(ship.status) : 'docked';

        const designId = (ship.designId != null)
            ? String(ship.designId)
            : (ship.design && ship.design.id != null)
                ? String(ship.design.id)
                : null;

        if (!id || !designId) return null;

        const statsRaw = (ship.stats && typeof ship.stats === 'object') ? ship.stats : {};
        const hpRaw = statsRaw.hp;
        const maxHpRaw = statsRaw.maxHp;
        const hp = (typeof hpRaw === 'number' && Number.isFinite(hpRaw)) ? Math.max(0, Math.floor(hpRaw)) : null;
        const maxHp = (typeof maxHpRaw === 'number' && Number.isFinite(maxHpRaw)) ? Math.max(1, Math.floor(maxHpRaw)) : null;

        const missionRaw = (ship.mission && typeof ship.mission === 'object') ? ship.mission : null;
        const mission = missionRaw
            ? {
                type: (missionRaw.type != null) ? String(missionRaw.type) : null,
                startTime: (typeof missionRaw.startTime === 'number' && Number.isFinite(missionRaw.startTime)) ? missionRaw.startTime : null,
                duration: (typeof missionRaw.duration === 'number' && Number.isFinite(missionRaw.duration)) ? missionRaw.duration : null
            }
            : null;

        const safeMaxHp = (maxHp != null) ? maxHp : (hp != null ? Math.max(1, hp) : 1);
        const safeHp = (hp != null) ? Math.min(hp, safeMaxHp) : safeMaxHp;

        return {
            id,
            name,
            status,
            designId,
            mission,
            wing: ship.wing || null,
            stats: { hp: safeHp, maxHp: safeMaxHp }
        };
    }

    deserializeFleetShips(savedShips) {
        if (!Array.isArray(savedShips) || !this.shipDesigner || !Array.isArray(this.shipDesigner.designs)) return [];

        const designsById = {};
        this.shipDesigner.designs.forEach((d) => {
            if (!d || d.id == null) return;
            designsById[String(d.id)] = d;
        });

        const out = [];
        savedShips.forEach((raw) => {
            if (!raw || typeof raw !== 'object') return;

            const id = (raw.id != null) ? String(raw.id) : null;
            const name = (raw.name != null) ? String(raw.name) : 'Unnamed Ship';
            const status = (raw.status != null) ? String(raw.status) : 'docked';

            const designId = (raw.designId != null)
                ? String(raw.designId)
                : (raw.design && raw.design.id != null)
                    ? String(raw.design.id)
                    : null;
            if (!id || !designId) return;

            const design = designsById[designId];
            if (!design) return;

            const designHpRaw = (design.stats && typeof design.stats.hp === 'number' && Number.isFinite(design.stats.hp))
                ? design.stats.hp
                : 1;
            const designHp = Math.max(1, Math.floor(designHpRaw));

            const statsRaw = (raw.stats && typeof raw.stats === 'object') ? raw.stats : {};
            const hpRaw = statsRaw.hp;
            const maxHpRaw = statsRaw.maxHp;

            const maxHp = (typeof maxHpRaw === 'number' && Number.isFinite(maxHpRaw)) ? Math.max(1, Math.floor(maxHpRaw)) : designHp;
            const hp = (typeof hpRaw === 'number' && Number.isFinite(hpRaw)) ? Math.max(0, Math.floor(hpRaw)) : maxHp;

            const missionRaw = (raw.mission && typeof raw.mission === 'object') ? raw.mission : null;
            const mission = missionRaw
                ? {
                    type: (missionRaw.type != null) ? String(missionRaw.type) : null,
                    startTime: (typeof missionRaw.startTime === 'number' && Number.isFinite(missionRaw.startTime)) ? missionRaw.startTime : null,
                    duration: (typeof missionRaw.duration === 'number' && Number.isFinite(missionRaw.duration)) ? missionRaw.duration : null
                }
                : null;

            out.push({
                id,
                name,
                status,
                mission,
                designId,
                design,
                wing: raw.wing || null,
                stats: { hp: Math.min(hp, maxHp), maxHp }
            });

            // Rebuild wing data in fleet manager
            if (raw.wing && this.fleetManager && this.fleetManager.wings[raw.wing]) {
                this.fleetManager.wings[raw.wing].ships.push(id);
            }
        });

        return out;
    }

    buildShipFromDesign(design) {
        if (!design || typeof design !== 'object') return null;
        if (!Array.isArray(this.ships)) this.ships = [];

        const maxSize = (this.fleetManager && typeof this.fleetManager.maxSize === 'number' && Number.isFinite(this.fleetManager.maxSize))
            ? Math.floor(this.fleetManager.maxSize)
            : 5;
        if (this.ships.length >= maxSize) {
            this.notify('Fleet at capacity. Scrap a ship or increase fleet limit.', 'warning');
            return null;
        }

        if (!this.resources || typeof this.resources !== 'object') this.resources = {};

        const cost = (design.cost && typeof design.cost === 'object') ? design.cost : {};
        const normalizedCost = {};
        Object.keys(cost).forEach((key) => {
            const raw = cost[key];
            if (typeof raw !== 'number' || !Number.isFinite(raw)) return;
            const need = Math.max(0, Math.floor(raw));
            if (need <= 0) return;
            normalizedCost[key] = need;
        });

        const haveByKey = {};
        const missing = [];
        Object.keys(normalizedCost).forEach((key) => {
            const have = (typeof this.resources[key] === 'number' && Number.isFinite(this.resources[key])) ? this.resources[key] : 0;
            haveByKey[key] = have;
            if (have < normalizedCost[key]) {
                missing.push(`${key} (${Math.floor(have)}/${normalizedCost[key]})`);
            }
        });

        if (missing.length > 0) {
            this.notify(`Insufficient resources to build ship: ${missing.join(', ')}`, 'warning');
            return null;
        }

        Object.keys(normalizedCost).forEach((key) => {
            this.resources[key] = haveByKey[key] - normalizedCost[key];
        });

        const designHpRaw = (design.stats && typeof design.stats.hp === 'number' && Number.isFinite(design.stats.hp)) ? design.stats.hp : 100;
        const maxHp = Math.max(1, Math.floor(designHpRaw));

        const shipId = `ship_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
        const shipName = `${(design.name != null) ? String(design.name) : 'Ship'} Prototype`;
        const designId = (design.id != null) ? String(design.id) : null;

        const ship = {
            id: shipId,
            name: shipName,
            status: 'docked',
            mission: null,
            designId,
            design,
            stats: { hp: maxHp, maxHp }
        };

        this.ships.push(ship);
        this.updateResourceUI();
        this.notify(`Prototype constructed: ${shipName}`, 'success');
        return ship;
    }

    saveGame(options = {}) {
        // Save current system state first
        this.saveCurrentSystemState();

        this.advancePilotSkillTraining(0, { silent: true });

        const data = {
            resources: this.resources,
            colonists: this.colonists,
            day: this.day,
            tech: Object.keys(this.technologies).filter(k => this.technologies[k].unlocked),
            caps: this.caps,
            currentSystemId: this.currentSystemId,
            isOnMoon: this.isOnMoon,
            systemStates: this.systemStates,
            tiles: this.tiles.map(t => ({ id: t.id, type: t.type, building: t.building })),
            pilotSkills: this.pilotSkills,
            attributes: this.attributes,
            claims: this.claims,
            agentMissions: this.agentMissions,
            ships: Array.isArray(this.ships)
                ? this.ships.map((s) => this.serializeFleetShip(s)).filter(Boolean)
                : [],
            shipDesigns: (this.shipDesigner && Array.isArray(this.shipDesigner.designs))
                ? this.shipDesigner.designs.map((d) => this.serializeShipDesign(d)).filter(Boolean)
                : [],
            jumpBridges: this.jumpBridges ? this.jumpBridges.bridges : {},
            marketSystems: (window.economySystem && window.economySystem.systems) ? window.economySystem.systems : {}
        };
        localStorage.setItem('ep_save_v2', JSON.stringify(data));
        if (!options.silent) this.notify("Game Saved (Local)!", "success");
    }

    tryAutoLoadGame() {
        if (this.autoloadEnabled === false) return;
        this.loadGame({ silent: true });
    }

    loadGame(options = {}) {
        let json = null;
        try { json = localStorage.getItem('ep_save_v2'); } catch (e) { json = null; }
        if (!json) {
            if (!options.silent) this.notify("No Local Save Found!", "warning");
            return;
        }
        try {
            const data = JSON.parse(json);
            this.loadGameData(data, { silent: options.silent === true });
            if (!options.silent) this.notify("Local Game Loaded!", "success");
        }
        catch (e) {
            console.error(e);
            this.notify("Save Corrupted!", "danger");
        }
    }

    loadGameData(data, options = {}) {
        this.resources = data.resources;
        this.caps = data.caps || this.caps;
        this.colonists = Array.isArray(data.colonists) ? data.colonists.map(c => this.normalizeColonist(c)) : [];
        this.day = data.day;
        this.currentSystemId = data.currentSystemId || 0;
        this.systemStates = data.systemStates || {};
        this.isOnMoon = !!data.isOnMoon;

        if (this.shipDesigner) {
            this.shipDesigner.designs = this.deserializeShipDesigns(data.shipDesigns);
        }

        this.ships = this.deserializeFleetShips(data.ships);

        if (data.attributes) {
            this.attributes = { ...this.attributes, ...data.attributes };
        }
        if (data.claims) {
            this.claims = { ...this.claims, ...data.claims };
        }

        // Phase 5 Load
        if (data.jumpBridges && this.jumpBridges) {
            this.jumpBridges.bridges = data.jumpBridges;
        }
        if (data.marketSystems && window.economySystem) {
            window.economySystem.systems = data.marketSystems;
        }

        const loadedPilot = data.pilotSkills ? this.normalizePilotSkillsState(data.pilotSkills) : this.createDefaultPilotSkillsState(this.pilotSkillDefs);
        this.pilotSkills = loadedPilot;
        this.advancePilotSkillTraining(null, { silent: options && options.silent === true });

        const loadedMissions = data.agentMissions ? this.normalizeAgentMissionsState(data.agentMissions) : this.createDefaultAgentMissionsState(this.agentMissionDefs);
        this.agentMissions = loadedMissions;
        this.updateAgentMissions({ silent: true });

        if (data.tech) data.tech.forEach(key => { if (this.technologies[key]) { this.technologies[key].unlocked = true; if (this.technologies[key].effect) this.technologies[key].effect(); } });

        // Load the current system
        const baseId = String(this.currentSystemId);
        const stateId = this.isOnMoon ? `${baseId}_moon` : baseId;
        this.loadSystemState(stateId);

        this.createBuildMenu();
        this.updateLocationUI();

        this.updateResourceUI();
    }

    saveCurrentSystemState() {
        // We only save tiles that differ from procedural generation?
        // For now, save all tiles and structures to ensure continuity.
        // Optimization: In V2, only save tiles with buildings or changes.
        const baseId = String(this.currentSystemId);
        const stateId = this.isOnMoon ? `${baseId}_moon` : baseId;

        const existing = (this.systemStates && this.systemStates[stateId]) ? this.systemStates[stateId] : null;
        const baseState = (this.systemStates && this.systemStates[baseId]) ? this.systemStates[baseId] : null;

        const seedFromWorld = (typeof this.currentWorldSeed === 'number' && Number.isFinite(this.currentWorldSeed)) ? this.currentWorldSeed : null;
        const seedFromExisting = (existing && typeof existing.seed === 'number' && Number.isFinite(existing.seed)) ? existing.seed : null;
        const seedFromBase = (baseState && typeof baseState.seed === 'number' && Number.isFinite(baseState.seed)) ? baseState.seed : null;
        const seed = seedFromWorld ?? seedFromExisting ?? seedFromBase ?? 12345;

        const starConfig = (existing && existing.starConfig) ? existing.starConfig : ((baseState && baseState.starConfig) ? baseState.starConfig : null);

        this.systemStates[stateId] = {
            seed,
            starConfig,
            tiles: this.tiles.map(t => ({
                id: t.id,
                type: t.type,
                building: t.building,
                life: t.life ? { scanned: t.life.scanned, flora: t.life.flora, fauna: t.life.fauna } : null
            })),
            structures: this.structures
        };
    }

    loadSystemState(systemId) {
        const isMoon = String(systemId).endsWith('_moon');
        const type = isMoon ? 'moon' : 'planet';
        const baseId = isMoon ? String(systemId).replace(/_moon$/, '') : String(systemId);

        if (this.scene) {
            const toRemove = this.scene.children.filter(o => o && o.userData && o.userData.isBuilding);
            toRemove.forEach(o => this.scene.remove(o));
        }
        this.buildingMeshes = {};

        if (this.systemStates[systemId]) {
            // Restore from state
            const state = this.systemStates[systemId];
            const baseState = this.systemStates[baseId];

            const starConfig = state.starConfig || (baseState ? baseState.starConfig : null);
            if (starConfig) this.setupSuns(starConfig);

            this.structures = [];
            this.createPlanet(state.seed || 12345, type);
            this.applySystemState(state);
        } else {
            // Should not happen if we only load visited.
            // If manual loadGameData call without warp?
            this.structures = [];
            this.createPlanet(12345, type);
        }
    }

    applySystemState(state) {
        // Re-apply buildings and scan data to the generated tiles
        state.tiles.forEach((savedTile, i) => {
            if (this.tiles[i]) {
                this.tiles[i].building = savedTile.building;
                if (savedTile.type) this.tiles[i].type = savedTile.type;
                if (savedTile.life) this.tiles[i].life = savedTile.life;

                if (savedTile.building) {
                    // Re-instantiate building mesh
                    const b = this.buildingTypes[savedTile.building];
                    const pos = this.tiles[i].position;
                    // We need normal. compute from pos (sphere).
                    const normal = pos.clone().normalize();
                    const mesh = this.placeBuildingMesh(pos, normal, savedTile.building);
                    if (mesh) this.buildingMeshes[this.tiles[i].id] = mesh;
                }
            }
        });
        this.structures = state.structures; // Keep sync
    }

    multiplyCaps(factor) { Object.keys(this.caps).forEach(k => this.caps[k] *= factor); this.updateResourceUI(); }
    unlockBuilding(type) { this.notify(`New Building Unlocked: ${type.toUpperCase()} `, "success"); }
    resize() {
        const w = this.container.clientWidth; const h = this.container.clientHeight || 600;
        this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.renderer.setSize(w, h);
    }

    openTechTree() {
        let modal = document.getElementById('ep-tech-modal');
        // Ensure modal has canvas setup
        let canvas = document.getElementById('ep-tech-canvas');
        if (!canvas) {
            // Rebuild modal content for visual tree if needed
            const content = document.getElementById('ep-tech-grid');
            if (content) {
                // Clear grid style to allow absolute positioning on canvas
                content.style.display = 'block';
                content.style.position = 'relative';
                content.style.width = '1000px';
                content.style.height = '600px';
                content.innerHTML = `<canvas id="ep-tech-canvas" width="1000" height="600" style="position:absolute;top:0;left:0;z-index:1;"></canvas>
                                     <div id="ep-tech-nodes" style="position:absolute;top:0;left:0;width:100%;height:100%;z-index:2;"></div>`;

            }
        }
        modal.style.display = 'flex';
        this.renderTechTree();
    }

    renderTechTree() {
        const canvas = document.getElementById('ep-tech-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const nodeContainer = document.getElementById('ep-tech-nodes');

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        nodeContainer.innerHTML = '';

        // Draw Connections
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;

        Object.keys(this.technologies).forEach(key => {
            const tech = this.technologies[key];
            if (tech.req && this.technologies[tech.req]) {
                const parent = this.technologies[tech.req];

                if (!parent.pos || !tech.pos) return;

                // Draw line from Parent to Child
                ctx.beginPath();
                ctx.moveTo(parent.pos.x + 30, parent.pos.y + 30); // Center of 60px node

                // Beizer Curve
                const cp1x = parent.pos.x + 30 + 50;
                const cp1y = parent.pos.y + 30;
                const cp2x = tech.pos.x + 30 - 50;
                const cp2y = tech.pos.y + 30;

                ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, tech.pos.x + 30, tech.pos.y + 30);

                if (tech.unlocked) ctx.strokeStyle = '#38bdf8'; // Blue for unlocked path
                else if (parent.unlocked) ctx.strokeStyle = '#fbbf24'; // Yellow for next available
                else ctx.strokeStyle = '#334155'; // Dark for locked

                ctx.stroke();
            }
        });

        // Draw Nodes
        Object.keys(this.technologies).forEach(key => {
            const tech = this.technologies[key];
            if (!tech.pos) return;
            const el = document.createElement('div');

            // Status Logic
            let statusClass = 'locked';
            let statusIcon = '🔒';
            if (tech.unlocked) { statusClass = 'unlocked'; statusIcon = '✅'; }
            else if (!tech.req || this.technologies[tech.req].unlocked) { statusClass = 'available'; statusIcon = '🔓'; }

            el.className = `ep-tech-node ${statusClass}`;
            el.style.left = tech.pos.x + 'px';
            el.style.top = tech.pos.y + 'px';
            el.innerHTML = `
                <div class="tech-icon">${statusIcon}</div>
                <div class="tech-name">${tech.name}</div>
                <div class="tech-cost">${tech.cost} Data</div>
            `;

            // Tooltip
            el.title = `${tech.desc}`;

            if (statusClass === 'available') {
                el.onclick = () => this.researchTech(key);
            }

            nodeContainer.appendChild(el);
        });
    }

    openRoster() {
        const modal = document.getElementById('ep-roster-modal');
        const list = document.getElementById('ep-roster-list');
        modal.style.display = 'flex';
        list.innerHTML = '';
        this.colonists.forEach((c, index) => {
            const tr = document.createElement('tr');

            this.normalizeColonist(c);

            const needColor = (val) => val < 25 ? '#ef4444' : (val < 50 ? '#f59e0b' : '#22c55e');
            const hunger = Math.floor(c.needs.hunger);
            const oxygen = Math.floor(c.needs.oxygen);
            const rest = Math.floor(c.needs.rest);

            // Trait Badges
            const traitsHtml = c.traits.map(t => {
                const def = TRAIT_DEFINITIONS[t];
                if (!def) return '';
                return `<span style="background:${def.color}44; color:${def.color}; border:1px solid ${def.color}; padding:2px 6px; border-radius:4px; font-size:0.8em; margin-right:4px;">${def.name}</span>`;
            }).join('');

            tr.innerHTML = `
                <td style="padding:0.5rem;">${c.name} <div style="margin-top:2px;">${traitsHtml}</div></td>
                <td>${this.jobTitles[c.job]}</td>
                <td>${Math.floor(c.morale)}%</td>
                <td>
                    <div style="display:flex; gap:8px; font-size:0.85em; color:#cbd5e1; white-space:nowrap;">
                        <span style="color:${needColor(hunger)};" title="Hunger">🍖 ${hunger}%</span>
                        <span style="color:${needColor(oxygen)};" title="Oxygen">💨 ${oxygen}%</span>
                        <span style="color:${needColor(rest)};" title="Rest">😴 ${rest}%</span>
                    </div>
                </td>
                <td>
                    <button class="ep-sys-btn" onclick="window.game.openCRISPRLab(${index})">🧬</button>
                    <button class="ep-sys-btn" onclick="window.game.assignJob('${c.id}', 'next')">🔄</button>
                </td>
            `;
            list.appendChild(tr);
        });
        window.ExoplanetPioneerInstance = this;
    }

    applyColonistEffects() {
        if (!this.colonists) return;
        const isNight = this.timeOfDay < 6 || this.timeOfDay > 20;

        this.colonists.forEach(c => {
            if (!c.traits) return;
            c.traits.forEach(t => {
                // Insomniac: Loses morale at night
                if (t === 'Insomniac' && isNight) {
                    c.morale = Math.max(0, c.morale - 0.05);
                }
                // Workaholic: Loses morale if unemployed
                if (t === 'Workaholic' && c.job === 'unemployed') {
                    c.morale = Math.max(0, c.morale - 0.1);
                }
                // Robust: Recovers morale slowly
                if (t === 'Robust') {
                    c.morale = Math.min(100, c.morale + 0.01);
                }
            });
        });
    }
    assignJob(id, job) {
        const col = this.colonists.find(c => c.id === id);
        if (col) {
            if (job === 'next') {
                const jobs = ['unemployed', 'engineer', 'miner', 'botanist', 'researcher'];
                const nextIdx = (jobs.indexOf(col.job) + 1) % jobs.length;
                col.job = jobs[nextIdx];
            } else { col.job = job; }
            this.notify(`${col.name} is now a ${this.jobTitles[col.job]} `, 'info');
            this.openRoster();
        }
    }

    startTick() {
        setInterval(() => {
            this.advancePilotSkillTraining(null);
            this.updateAgentMissions();
            if (this.isPaused) return;
            if (this.achievements) this.achievements.check();

            // 0. Terraforming Habitability Check
            let hab = null;
            if (this.terraforming && this.terraforming.habitability !== undefined) {
                hab = this.terraforming.habitability;
                // If habitability is lethally low (< 10), colonists die
                if (hab < 10 && this.colonists.length > 0 && Math.random() < 0.1) {
                    this.colonists.pop();
                    this.notify("Colonist died due to harsh environment!", "danger");
                }
                // If habitability is high (> 80), chance for immigration
                if (hab > 80 && this.colonists.length < this.getPopulationCap() && Math.random() < 0.05) {
                    this.addColonist();
                    this.notify("New colonist arrived due to ideal conditions!", "success");
                }
            }

            // 1. Colonist Consumption
            let bonusData = 0;
            this.colonists.forEach(c => { if (c.job === 'researcher') bonusData += 0.2; });

            // Food/Oxygen Consumption Logic
            const pop = this.colonists.length;
            const popCap = this.getPopulationCap();
            const overCap = Math.max(0, pop - popCap);
            const foodNeed = pop * 0.1;
            const oxyNeed = pop * 0.1;

            const foodAvailable = Math.max(0, this.resources.food || 0);
            const foodConsumed = Math.min(foodAvailable, foodNeed);
            this.resources.food = foodAvailable - foodConsumed;
            const foodRatio = foodNeed > 0 ? (foodConsumed / foodNeed) : 1;

            const oxygenAvailable = Math.max(0, this.resources.oxygen || 0);
            const oxygenConsumed = Math.min(oxygenAvailable, oxyNeed);
            this.resources.oxygen = oxygenAvailable - oxygenConsumed;
            const oxygenRatio = oxyNeed > 0 ? (oxygenConsumed / oxyNeed) : 1;

            const isNight = this.timeOfDay < 6 || this.timeOfDay > 20;

            this.colonists.forEach(c => {
                this.normalizeColonist(c);

                if (foodRatio >= 1) c.needs.hunger = Math.min(100, c.needs.hunger + 0.5);
                else c.needs.hunger = Math.max(0, c.needs.hunger - (1 - foodRatio) * 3);

                if (oxygenRatio >= 1) c.needs.oxygen = Math.min(100, c.needs.oxygen + 0.5);
                else c.needs.oxygen = Math.max(0, c.needs.oxygen - (1 - oxygenRatio) * 6);

                if (isNight) c.needs.rest = Math.min(100, c.needs.rest + 1);
                else c.needs.rest = Math.max(0, c.needs.rest - 0.5);

                let moraleDelta = 0;
                const hunger = c.needs.hunger;
                const oxygen = c.needs.oxygen;
                const rest = c.needs.rest;

                if (hunger < 25) moraleDelta -= 0.5;
                else if (hunger < 50) moraleDelta -= 0.2;

                if (oxygen < 25) moraleDelta -= 1;
                else if (oxygen < 50) moraleDelta -= 0.5;

                if (rest < 25) moraleDelta -= 0.3;
                else if (rest < 50) moraleDelta -= 0.1;

                if (hunger > 80 && oxygen > 80 && rest > 80) moraleDelta += 0.05;

                if (hab !== null) {
                    if (hab < 30) moraleDelta -= 0.2;
                    else if (hab > 80) moraleDelta += 0.05;
                }

                if (overCap > 0) moraleDelta -= 0.1 + 0.05 * (overCap - 1);

                c.morale = Math.max(0, Math.min(100, c.morale + moraleDelta));
            });

            this.resources.data += bonusData;

            // 2. Building Production & Power
            let powerAvailable = 0;
            const powerSources = [];

            // Calculate Power Supply (Only Generators)
            this.structures.forEach(s => {
                const def = this.buildingTypes[s.type];
                if (def.output && def.output.energy) {
                    // Check Level Multiplier for Output?
                    const level = s.level || 1;
                    const mult = Math.pow(1.2, level - 1);
                    powerAvailable += def.output.energy * mult;
                    powerSources.push({ pos: this.getTilePos(s.tileId), range: def.icon === '☢️' ? 50 : 20 });
                }
                // Note: Buildings do not consume 'energy' resource per tick yet, only require grid.
            });

            // 3. Apply Production
            this.structures.forEach(s => {
                const def = this.buildingTypes[s.type];
                let powered = true;

                // Check Grid Connectivity if not a generator
                if (!def.output || !def.output.energy) {
                    if (powerSources.length > 0) {
                        const pos = this.getTilePos(s.tileId);
                        // Using squared distance for perf is better but distanceTo is fine for < 1000 buildings
                        const inRange = powerSources.some(src => pos.distanceTo(src.pos) < src.range);
                        if (!inRange) powered = false;
                    } else if (this.structures.some(st => this.buildingTypes[st.type].output && this.buildingTypes[st.type].output.energy)) {
                        // If power exists elsewhere but I'm not in range -> Unpowered
                        powered = false;
                    }
                    // If NO power exists on planet, assume basic battery/survival mode? No, unpowered.
                    if (powerSources.length === 0) powered = false;
                }

                if (powered && def.output) {
                    const level = s.level || 1;
                    const pb = this.getPilotProductionBonuses();

                    // Security Multiplier: Lower security = Higher yield (1.0 sec = 1x, 0.0 sec = 1.5x)
                    const secStatus = this.systemSecurity[this.currentSystemId] || 1.0;
                    const secMult = 1.5 - (secStatus * 0.5);

                    let multiplier = Math.pow(1.2, level - 1) * secMult;

                    for (let res in def.output) {
                        let finalMult = multiplier;
                        if (res === 'minerals') finalMult *= pb.mineralMult;
                        if (res === 'data') finalMult *= pb.dataMult;

                        if (!this.resources[res]) this.resources[res] = 0;
                        this.resources[res] += def.output[res] * finalMult;
                    }
                }
            });

            // Special: Minerals check message
            if (this.resources.minerals < 10 && this.resources.energy > 40 && !this.hasNotifiedMinerals) {
                // Hint user to build miners
                this.notify("Low Minerals! Build Auto-Miners (Cost only Energy) to extract more.", "info");
                this.hasNotifiedMinerals = true;
            }

            this.updateMorale();
            this.updateResourceUI();
        }, 1000); // 1 Second Tick for faster feedback (was 2s)
    }

    updateMorale() {
        if (!Array.isArray(this.colonists) || this.colonists.length === 0) {
            this.morale = 100;
        } else {
            let sum = 0;
            let count = 0;
            this.colonists.forEach(c => {
                this.normalizeColonist(c);
                if (typeof c.morale === 'number' && !Number.isNaN(c.morale)) {
                    sum += c.morale;
                    count++;
                }
            });
            this.morale = count > 0 ? (sum / count) : 100;
        }

        this.morale = Math.max(0, Math.min(100, this.morale));

        const valueEl = document.getElementById('ep-morale-value');
        if (valueEl) {
            valueEl.textContent = `${Math.floor(this.morale)}%`;
            valueEl.style.color = this.morale > 50 ? '#4ade80' : '#f87171';
        }

        const iconEl = document.getElementById('ep-morale-icon');
        if (iconEl) {
            iconEl.textContent = this.morale > 70 ? '😊' : (this.morale > 40 ? '😐' : '😟');
        }
    } // simplified

    animate() {
        requestAnimationFrame(() => this.animate());

        // Frame Counter for slow ticks
        if (!this.frameCount) this.frameCount = 0;
        this.frameCount++;

        if (this.frameCount % 60 === 0) {
            this.applyColonistEffects();
        }

        // Production Tick (Approx 60fps, so delta is ~0.016s)
        if (this.production && !this.isPaused) this.production.update(0.016);
        if (this.advanceIndustryJobs && !this.isPaused) this.advanceIndustryJobs(0.016);
        if (this.drones && !this.isPaused) this.drones.update(0.016);
        if (this.orbit && !this.isPaused) this.orbit.update(this.timeOfDay); // Use timeOfDay as proxy time
        if (this.fleetManager && !this.isPaused) this.fleetManager.update(0.016);

        if (this.isGalaxyViewActive && this.galaxyView) {
            this.galaxyView.update();
            return;
        }

        // Always update controls if they exist and we are not in galaxy view
        if (this.controls) this.controls.update();

        if (this.planetMesh) this.planetMesh.rotation.y += 0.0002;
        if (this.cloudMesh) this.cloudMesh.rotation.y += 0.0003;
        this.timeOfDay += 0.01;
        if (this.timeOfDay >= 24) {
            this.timeOfDay = 0;
            this.day++;
            if (this.market) this.market.updatePrices();
            this.notify("New Day: Market Prices Updated", "info");
        }

        if (this.planetMesh && this.planetMesh.userData.uniforms && this.planetMesh.userData.uniforms.time) {
            this.planetMesh.userData.uniforms.time.value += 0.01;
        }

        // --- DYNAMIC LIGHTING UPDATE ---
        if (this.camera && this.scene) {
            // Assume Sun is at fixed World Position (e.g., top right)
            // If we want the light to rotate WITH the planet's surface rotation, we'd need more math.
            // But usually, we want the light to be a star in the distance.
            // As the user rotates the camera (OrbitControls), the World stays still, Camera moves around.
            // The Shader vNormal is View Space. So we need Sun Direction in View Space.

            const sunWorldPos = new THREE.Vector3(100, 50, 100); // Fixed Sun in "Universe"
            const sunViewPos = sunWorldPos.clone().applyMatrix4(this.camera.matrixWorldInverse);
            const sunDirView = sunViewPos.normalize();

            // Update Planet Uniforms
            if (this.planetMesh && this.planetMesh.userData.uniforms) {
                if (this.planetMesh.userData.uniforms.time) this.planetMesh.userData.uniforms.time.value += 0.01;
                if (this.planetMesh.userData.uniforms.sunDirection) {
                    this.planetMesh.userData.uniforms.sunDirection.value.copy(sunDirView);
                }
            }

            // Update Atmosphere Uniforms
            if (this.atmosphereMesh && this.atmosphereMesh.material.uniforms) {
                if (this.atmosphereMesh.material.uniforms.sunDirection) {
                    this.atmosphereMesh.material.uniforms.sunDirection.value.copy(sunDirView);
                }
                // Pass Camera Position if needed (though ViewDir usually computed in shader)
            }
        }

        // Animate Buildings (Rotation)
        this.scene.traverse((object) => {
            if (object.userData && object.userData.isBuilding) {
                // Gentle rotation
                object.rotateY(0.01);
            }
        });

        // Render via Composer if active (Cinematic/PostProc)
        if (this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }

    toggleOrbitalView() {
        if (!this.isOrbitalViewActive) {
            this.isOrbitalViewActive = true;
            this.orbit.toggleView(true);
            // Move camera back
            this.camera.position.set(0, 150, 200);
            this.controls.enableZoom = false; // Lock zoom?
            this.notify("Entering Orbital View");
        } else {
            this.isOrbitalViewActive = false;
            this.orbit.toggleView(false);
            // Reset camera (rough)
            this.camera.position.set(0, 45, 65);
            this.controls.enableZoom = true;
        }
    }

    toggleGalaxyView() {
        this.isGalaxyViewActive = !this.isGalaxyViewActive;
        const galContainer = document.getElementById('ep-galaxy-container');

        if (this.isGalaxyViewActive) {
            galContainer.style.display = 'block';
            this.renderer.domElement.style.display = 'none';
            this.container.querySelector('#ep-btn-galaxy').innerText = '🪐 SYSTEM';
            this.initGalaxyView();
            document.getElementById('ep-build-menu').style.display = 'none';
        } else {
            galContainer.style.display = 'none';
            this.renderer.domElement.style.display = 'block';
            this.container.querySelector('#ep-btn-galaxy').innerText = '🌌 GALAXY';
            document.getElementById('ep-build-menu').style.display = 'flex';
        }
    }

    /**
     * Warp to a new star system - Phase 2: Multi-Planet Colonization
     */
    warpToSystem(system) {
        if (!system) return;

        // Check energy cost
        const warpCost = 100;
        if (this.resources.energy < warpCost) {
            this.notify(`Warp requires ${warpCost} Energy!`, 'danger');
            return;
        }

        // Confirm dialog
        const confirmed = confirm(`Warp to Star System #${system.id}?\nCost: ${warpCost} Energy\n\nThis will generate a new planet to colonize.`);
        if (!confirmed) return;

        this.resources.energy -= warpCost;
        this.audio.playWarp();

        // Store current system state if not already stored
        if (!this.colonizedSystems) this.colonizedSystems = {};
        if (this.currentSystemId !== undefined) {
            this.colonizedSystems[this.currentSystemId] = {
                resources: { ...this.resources },
                structures: [...this.structures],
                colonists: [...this.colonists],
                terraforming: this.terraforming ? { ...this.terraforming.stats } : null
            };
        }

        // Generate new planet with system seed
        this.currentSystemId = system.id;
        this.notify(`Warping to System #${system.id}...`, 'info');

        // Clear old buildings from scene
        this.scene.children = this.scene.children.filter(c => !c.userData.isBuilding);
        this.structures = [];
        this.buildingMeshes = {};

        // Generate new planet
        setTimeout(() => {
            this.createPlanet(system.seed, this.getPlanetTypeFromSeed(system.seed));
            this.generateTiles(system.seed);

            // Reset terraforming for new planet
            if (this.terraforming) {
                this.terraforming.stats = { temperature: 20, atmosphere: 15, water: 10, biomass: 5 };
                this.terraforming.recalculateRates();
            }

            // Check if we've been here before
            if (this.colonizedSystems[system.id]) {
                const saved = this.colonizedSystems[system.id];
                this.structures = saved.structures;
                this.colonists = saved.colonists;
                if (saved.terraforming && this.terraforming) {
                    this.terraforming.stats = saved.terraforming;
                }
                // Rebuild building meshes
                this.rebuildAllBuildings();
                this.notify(`Returned to Colony #${system.id}`, 'success');
            } else {
                // New planet - start fresh
                this.colonists = [];
                this.addColonist(); // Start with 1 pioneer
                this.notify(`New world discovered! System #${system.id}`, 'success');
            }

            // Close galaxy view
            this.toggleGalaxyView();
        }, 500);
    }

    getPlanetTypeFromSeed(seed) {
        const types = ['planet', 'terran', 'ice', 'lava', 'desert'];
        return types[seed % types.length];
    }

    rebuildAllBuildings() {
        // Rebuild all building meshes from structures array
        this.structures.forEach((s, idx) => {
            const tile = this.tiles[s.tileId];
            if (tile) {
                const pos = tile.position.clone();
                const normal = pos.clone().normalize();
                const mesh = this.placeBuildingMesh(pos, normal, s.type);
                if (mesh) this.buildingMeshes[s.tileId] = mesh;
            }
        });
    }

    openProfile() {
        let modal = document.getElementById('ep-profile-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'ep-profile-modal';
            modal.className = 'ep-modal-overlay';
            modal.style.display = 'none';
            modal.innerHTML = `
                <div class="ep-modal" style="width:800px; max-width:90vw; height:80vh; display:flex; flex-direction:column;">
                    <div class="ep-modal-header">
                        <h2 style="margin:0; color:#38bdf8;">👤 Captain's Profile</h2>
                        <button class="ep-sys-btn" onclick="document.getElementById('ep-profile-modal').style.display='none'">CLOSE</button>
                    </div>
                    <div style="display:flex; border-bottom:1px solid #334155; margin-bottom:10px;">
                        <button class="ep-sys-btn" id="ep-tab-stats" style="flex:1; border-bottom:none; border-radius:5px 5px 0 0;" onclick="window.game.switchProfileTab('stats')">📊 Stats</button>
                        <button class="ep-sys-btn" id="ep-tab-badges" style="flex:1; border-bottom:none; border-radius:5px 5px 0 0;" onclick="window.game.switchProfileTab('badges')">🏆 Badges</button>
                        <button class="ep-sys-btn" id="ep-tab-log" style="flex:1; border-bottom:none; border-radius:5px 5px 0 0;" onclick="window.game.switchProfileTab('log')">📜 Log</button>
                    </div>
                    <div class="ep-modal-body" id="ep-profile-body" style="flex:1; overflow-y:auto; padding:10px;"></div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        modal.style.display = 'flex';
        this.switchProfileTab('stats');
    }

    switchProfileTab(tab) {
        const body = document.getElementById('ep-profile-body');
        if (!body) return;

        // Reset Tab Styles
        ['stats', 'badges', 'log'].forEach(t => {
            const btn = document.getElementById(`ep-tab-${t}`);
            if (btn) {
                btn.style.background = (t === tab) ? '#334155' : 'transparent';
                btn.style.color = (t === tab) ? '#fff' : '#94a3b8';
            }
        });

        if (tab === 'stats') {
            body.innerHTML = `
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
                    <div class="ep-panel" style="padding:15px; background:rgba(15,23,42,0.5); border:1px solid #334155; border-radius:8px;">
                        <h3 style="color:#a78bfa; border-bottom:1px solid #334155; padding-bottom:5px;">📈 Colony Statistics</h3>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:10px; color:#cbd5e1;">
                            <div>Day:</div><div style="color:#fff;">${this.day}</div>
                            <div>Population:</div><div style="color:#fff;">${this.colonists.length} / ${this.getPopulationCap()}</div>
                            <div>Structures:</div><div style="color:#fff;">${this.structures.length}</div>
                            <div>Morale:</div><div style="color:${this.morale > 50 ? '#4ade80' : '#f87171'};">${Math.floor(this.morale)}%</div>
                            <div>Ships:</div><div style="color:#fff;">${this.ships ? this.ships.length : 0}</div>
                        </div>
                    </div>
                    <div class="ep-panel" style="padding:15px; background:rgba(15,23,42,0.5); border:1px solid #334155; border-radius:8px;">
                        <h3 style="color:#38bdf8; border-bottom:1px solid #334155; padding-bottom:5px;">🌌 Exploration</h3>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:10px; color:#cbd5e1;">
                            <div>Current System:</div><div style="color:#fff;">${this.currentSystemId}</div>
                            <div>Discovered Species:</div><div style="color:#fff;">${(this.ecosystem && this.ecosystem.xenodex) ? (this.ecosystem.xenodex.flora.length + this.ecosystem.xenodex.fauna.length) : 0}</div>
                        </div>
                    </div>
                </div>
            `;
        } else if (tab === 'badges') {
            const progress = this.achievements.getProgress();
            const unlocked = this.achievements.getUnlocked();
            body.innerHTML = `
                <div style="text-align:center; margin-bottom:20px;">
                    <h3 style="color:#fbbf24; margin:0 0 10px 0;">Unlocked: ${progress.unlocked} / ${progress.total}</h3>
                    <div style="background:#1e293b;height:10px;border-radius:5px;width:60%;margin:0 auto;">
                        <div style="background:linear-gradient(90deg,#fbbf24,#f59e0b);width:${progress.percent}%;height:100%;border-radius:5px;"></div>
                    </div>
                </div>
                <div style="display:flex; flex-wrap:wrap; gap:15px; justify-content:center;">
                    ${unlocked.length === 0 ? '<div style="color:#64748b; padding:20px;">No badges earned yet. Keep playing!</div>' : ''}
                    ${unlocked.map(a => `
                        <div style="background:#1e293b; border:1px solid #fbbf24; border-radius:8px; padding:15px; width:160px; text-align:center; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
                            <div style="font-size:2.5em; margin-bottom:10px;">${Achievement.ICONS[a.category] || '🏆'}</div>
                            <div style="font-weight:bold; color:#fbbf24; margin-bottom:5px;">${a.name}</div>
                            <div style="font-size:0.8em; color:#cbd5e1; line-height:1.2;">${a.desc}</div>
                             <div style="font-size:0.7em; color:#64748b; margin-top:8px; border-top:1px solid #334155; padding-top:4px;">Day ${a.unlockedAt || '?'}</div>
                        </div>
                    `).join('')}
                     ${this.achievements.getLocked().map(a => `
                        <div style="background:#0f172a; border:1px solid #334155; border-radius:8px; padding:15px; width:160px; text-align:center; opacity:0.6;">
                            <div style="font-size:2.5em; margin-bottom:10px; filter:grayscale(100%);">🔒</div>
                            <div style="font-weight:bold; color:#64748b; margin-bottom:5px;">${a.name}</div>
                             <div style="font-size:0.8em; color:#475569;">???</div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (tab === 'log') {
            const entries = this.log ? this.log.getEntries() : [];
            body.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:8px;">
                    ${entries.length === 0 ? '<div style="color:#64748b; padding:20px;">Log is empty.</div>' : ''}
                    ${entries.map(e => `
                        <div style="background:rgba(30,41,59,0.5); border-left:3px solid ${this.log.getTypeColor(e.type)}; padding:10px; font-size:0.9em; border-radius:0 4px 4px 0;">
                            <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                                <span style="color:#94a3b8; font-size:0.8em; font-family:monospace;">Day ${e.timestamp}</span>
                                <span style="color:#64748b; font-size:0.75em;">${new Date(e.realTime).toLocaleTimeString()}</span>
                            </div>
                             <div style="color:#e2e8f0;">${e.text}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    }

    warpToSystem(systemData) {
        // Open modal
        const modal = document.getElementById('ep-system-modal');
        const content = document.getElementById('ep-system-content');
        modal.style.display = 'flex';

        const threat = this.military.assessThreat(systemData.id);
        const threatColor = threat > 100 ? '#ef4444' : (threat > 50 ? '#facc15' : '#4ade80');

        const energyCost = 100;
        const canWarp = this.resources.energy >= energyCost;
        const warpBtnStyle = canWarp ? 'border-color:#38bdf8;' : 'border-color:#475569; color:#475569; result:not-allowed;';
        const invadeBtnStyle = canWarp ? 'border-color:#ef4444; color:#ef4444;' : 'border-color:#475569; color:#475569; result:not-allowed;';

        content.innerHTML = `
            <div style="text-align:center; color:#fff;">
                <h3 style="margin-bottom:1rem;">Target: Sector ${systemData.id}</h3>
                <div style="margin-bottom:1rem;">Threat Level: <span style="color:${threatColor}; font-weight:bold;">${threat}</span></div>
                <div style="margin-bottom:0.5rem; color:${canWarp ? '#4ade80' : '#ef4444'}">Fuel Required: ${energyCost} Energy (Current: ${Math.floor(this.resources.energy)})</div>
                <div style="margin-bottom:2rem; font-size:0.9rem; color:#aaa;">Choosing to invade risks fleet damage but yields resources.</div>
                
                <div style="display:flex; justify-content:center; gap:1rem;">
                    <button class="ep-sys-btn" id="ep-btn-warp-peace" style="${warpBtnStyle}" ${!canWarp ? 'disabled' : ''}>WARP (Peaceful)</button>
                    <button class="ep-sys-btn" id="ep-btn-warp-invade" style="${invadeBtnStyle}" ${!canWarp ? 'disabled' : ''}>⚔️ INVADE</button>
                    <button class="ep-sys-btn" onclick="document.getElementById('ep-system-modal').style.display='none'">CANCEL</button>
                </div>
            </div>
        `;

        if (canWarp) {
            const onWarp = () => {
                modal.style.display = 'none';
                this.executeWarp(systemData, false);
            };
            const onInvade = () => {
                modal.style.display = 'none';
                this.executeWarp(systemData, true);
            };

            document.getElementById('ep-btn-warp-peace').onclick = onWarp;
            document.getElementById('ep-btn-warp-invade').onclick = onInvade;
        }
    }

    visitMoon() {
        if (this.isOnMoon) {
            this.notify("Already on the Moon!", "info");
            return;
        }

        if (this.resources.energy < 50) {
            this.notify("Need 50 Energy to travel to Moon!", "danger");
            return;
        }
        this.resources.energy -= 50;

        // Save current planet state
        this.saveCurrentSystemState();

        // Clear existing building meshes from the scene
        if (this.scene) {
            const toRemove = this.scene.children.filter(o => o && o.userData && o.userData.isBuilding);
            toRemove.forEach(o => this.scene.remove(o));
        }
        this.buildingMeshes = {};

        this.isOnMoon = true;

        const baseId = String(this.currentSystemId);
        const moonId = `${baseId}_moon`;

        let state = this.systemStates[moonId];
        if (!state) {
            const planetState = this.systemStates[baseId] || {};
            const baseSeed = (typeof planetState.seed === 'number' && Number.isFinite(planetState.seed))
                ? planetState.seed
                : ((typeof this.currentWorldSeed === 'number' && Number.isFinite(this.currentWorldSeed)) ? this.currentWorldSeed : 12345);
            const moonSeed = baseSeed + 999;
            state = { seed: moonSeed, starConfig: planetState.starConfig || null, tiles: [], structures: [] };
            this.systemStates[moonId] = state;
        }

        this.structures = [];
        this.createPlanet(state.seed, 'moon');
        if (state.tiles && state.tiles.length) {
            this.applySystemState(state);
        } else {
            this.structures = Array.isArray(state.structures) ? state.structures : [];
        }

        if (this.isOrbitalViewActive) this.toggleOrbitalView();
        if (document.getElementById('ep-planet-info')) document.getElementById('ep-planet-info').innerHTML = `<h3>${this.planetData.name} (Moon)</h3>`;

        this.notify("🌙 Welcome to the Moon! Low gravity: +25% factory output", "success");
        this.updateResourceUI();
        this.createBuildMenu();
        this.updateLocationUI();
    }

    returnToPlanet() {
        if (!this.isOnMoon) {
            this.notify("Already on the Planet!", "info");
            return;
        }

        if (this.resources.energy < 50) {
            this.notify("Need 50 Energy to travel back!", "danger");
            return;
        }
        this.resources.energy -= 50;

        // Save Moon
        this.saveCurrentSystemState();

        // Clear existing building meshes from the scene
        if (this.scene) {
            const toRemove = this.scene.children.filter(o => o && o.userData && o.userData.isBuilding);
            toRemove.forEach(o => this.scene.remove(o));
        }
        this.buildingMeshes = {};

        this.isOnMoon = false;
        this.notify("🌍 Welcome back to the Planet!", "success");

        // Restore Planet State
        const baseId = String(this.currentSystemId);
        const state = this.systemStates[baseId];
        if (state && state.starConfig) this.setupSuns(state.starConfig);
        this.structures = [];
        this.createPlanet((state && state.seed) ? state.seed : 12345, 'planet');
        if (state) this.applySystemState(state);

        if (this.isOrbitalViewActive) this.toggleOrbitalView();

        this.updateResourceUI();
        this.createBuildMenu();
        this.updateLocationUI();
    }

    executeWarp(systemData, invasion) {
        if (this.isOnMoon) {
            this.notify("Cannot warp from Moon surface! Return to Planet first.", "danger");
            return;
        }

        this.resources.energy -= 100; // Deduct Warp Cost
        this.updateResourceUI();

        if (invasion) {
            const result = this.military.attemptInvasion(systemData.id);
            if (result.success) {
                this.notify(`Invasion Successful! Looted ${result.loot} resources.`, 'success');
                // Give loot?
                this.resources.credits += result.loot;
            } else {
                this.notify(`Invasion Failed! Fleet took ${result.damage} damage.`, 'danger');
                // Still warp? Or forced retreat? Let's say we secure a foothold anyway for gameplay flow.
                this.notify("Secured landing zone despite resistance.", "info");
            }
            this.updateResourceUI();
        } else {
            this.notify("Warping to system (Peaceful entry)...", "info");
        }

        // Standard Warp Logic
        this.saveCurrentSystemState();
        this.currentSystemId = systemData.id;
        this.isOnMoon = false; // Reset moon state on warp
        this.toggleGalaxyView();
        this.notify(`Arrived at Sector ${systemData.id} `);

        if (this.systemStates[systemData.id]) {
            const state = this.systemStates[systemData.id];
            this.createPlanet(state.seed, 'planet');
            this.applySystemState(state);
        } else {
            this.createPlanet(systemData.seed, 'planet');
            this.systemStates[systemData.id] = {
                seed: systemData.seed,
                tiles: [],
                structures: [],
                starConfig: systemData.starConfig // Save this for later revisits
            };
        }

        // Apply Star Configuration to scene
        const starConfig = this.systemStates[systemData.id].starConfig || systemData.starConfig;
        this.setupSuns(starConfig);

        this.day = 1;
        document.getElementById('ep-day-display').innerText = `Day ${this.day} `;
    }

    attemptGeneEdit() { document.getElementById('ep-crispr-modal').style.display = 'none'; }

    // --- MARKET ---
    openMarket() {
        if (!this.market) return;
        let modal = document.getElementById('ep-market-modal');
        if (!modal) {
            // Create it dynamically if missing (or I should have added to HTML, but dynamic is fine for now)
            modal = document.createElement('div');
            modal.id = 'ep-market-modal';
            modal.className = 'ep-modal';
            modal.innerHTML = `
                <div class="ep-modal-content" style="width:700px;">
                    <h2>Galactic Market</h2>
                    <div id="ep-market-list" style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; margin-bottom:20px;"></div>
                    <button class="ep-sys-btn" onclick="document.getElementById('ep-market-modal').style.display='none'">Close</button>
                    <div style="margin-top:10px; font-size:0.9em; color:#94a3b8;">Prices update daily based on galactic events.</div>
                </div>
             `;
            document.body.appendChild(modal);
        }

        modal.style.display = 'flex';
        const list = document.getElementById('ep-market-list');
        list.innerHTML = '';

        Object.keys(this.market.prices).forEach(res => {
            const price = this.market.prices[res];
            const trend = this.market.trends[res];
            const trendIcon = trend === 'up' ? '📈' : (trend === 'down' ? '📉' : '➡️');
            const trendColor = trend === 'up' ? '#ef4444' : (trend === 'down' ? '#22c55e' : '#94a3b8'); // Up is bad for buyer, Down is good? Or Up is green? Market usually Green=Up. Let's stick to Green=Profit (Up).

            const card = document.createElement('div');
            card.className = 'ep-panel';
            card.style.padding = '10px';
            card.innerHTML = `
                <div style="font-weight:bold; color:#38bdf8; text-transform:capitalize;">${res}</div>
                <div style="font-size:1.2em; color:${trendColor};">${trendIcon} ${price.toFixed(1)} Cr</div>
                <div style="font-size:0.8em; color:#cbd5e1;">Owned: ${Math.floor(this.resources[res] || 0)}</div>
                <div style="margin-top:10px; display:flex; gap:5px;">
                    <button class="ep-sys-btn" style="flex:1; font-size:0.8em;" onclick="window.game.market.buy('${res}', 10)">Buy 10</button>
                    <button class="ep-sys-btn" style="flex:1; font-size:0.8em;" onclick="window.game.market.sell('${res}', 10)">Sell 10</button>
                </div>
            `;
            list.appendChild(card);
        });
    }

    // --- CLOUD ---
    async openCloudMenu() { document.getElementById('ep-cloud-modal').style.display = 'flex'; await this.cloud.checkSession(); this.updateCloudUI(); }
    updateCloudUI() {
        const content = document.getElementById('ep-cloud-content');
        if (this.cloud.user) {
            content.innerHTML = `<div>Logged in: ${this.cloud.user.email}</div><button class="ep-sys-btn" onclick="window.game.logoutCloud()">Logout</button><button class="ep-sys-btn" onclick="window.game.saveToCloud()">Save Cloud</button><button class="ep-sys-btn" onclick="window.game.loadFromCloud()">Load Cloud</button>`;
        } else {
            content.innerHTML = `<input id="ep-auth-email" placeholder="Email"><input id="ep-auth-pass" type="password" placeholder="Password"><button class="ep-sys-btn" onclick="window.game.loginCloud()">Login</button><button class="ep-sys-btn" onclick="window.game.registerCloud()">Register</button>`;
        }
    }
    async loginCloud() { const e = document.querySelector('#ep-auth-email').value; const p = document.querySelector('#ep-auth-pass').value; await this.cloud.signIn(e, p); this.updateCloudUI(); }
    async registerCloud() { const e = document.querySelector('#ep-auth-email').value; const p = document.querySelector('#ep-auth-pass').value; await this.cloud.signUp(e, p, e.split('@')[0]); }
    async logoutCloud() { await this.cloud.signOut(); this.updateCloudUI(); }
    async saveToCloud() {
        this.saveCurrentSystemState();
        this.advancePilotSkillTraining(0, { silent: true });
        const data = {
            resources: this.resources,
            structures: this.structures,
            colonists: this.colonists,
            ships: Array.isArray(this.ships)
                ? this.ships.map((s) => this.serializeFleetShip(s)).filter(Boolean)
                : [], // Save fleet
            day: this.day,
            tech: Object.keys(this.technologies).filter(k => this.technologies[k].unlocked),
            caps: this.caps,
            currentSystemId: this.currentSystemId,
            isOnMoon: this.isOnMoon,
            systemStates: this.systemStates,
            tiles: this.tiles.map(t => ({ id: t.id, type: t.type, building: t.building })),
            pilotSkills: this.pilotSkills,
            agentMissions: this.agentMissions,
            shipDesigns: (this.shipDesigner && Array.isArray(this.shipDesigner.designs))
                ? this.shipDesigner.designs.map((d) => this.serializeShipDesign(d)).filter(Boolean)
                : []
        };
        await this.cloud.saveGame('ep', 1, data);
        this.notify('Saved to Cloud', 'success');
    }
    async loadFromCloud() {
        const { data } = await this.cloud.loadGame('ep', 1);
        if (data) {
            this.loadGameData(data);
            if (data.ships) this.ships = this.deserializeFleetShips(data.ships); // Load fleet
            this.notify('Loaded from Cloud', 'success');
        }
    }

    // --- ECOSYSTEM ---
    scanTile(index) {
        document.getElementById('ep-tooltip').style.display = 'none';
        const tile = this.tiles[index];
        if (this.resources.energy < 10) { this.notify("Need 10 Energy", "danger"); return; }
        this.resources.energy -= 10;

        if (!this.ecosystem) { this.ecosystem = new AlienEcosystem(); this.ecosystem.init(); }
        const results = this.ecosystem.scanTile(tile.id);

        if (!results || results.length === 0) {
            this.notify("Scan Complete: Nothing found.", "info");
        } else {
            results.forEach(res => { this.notify(`Discovered: ${res.species.name}`, "success"); });
            this.resources.data += 10 * results.length;
        }
        this.updateResourceUI();
    }

    openXenodex() {
        if (!this.ecosystem) return;
        const flora = this.ecosystem.getDiscoveredFlora();
        const fauna = this.ecosystem.getDiscoveredFauna();
        alert(`🌿 Xenodex - Discovered Species 🌿\n\nFlora: ${flora.length} species\nFauna: ${fauna.length} species\n\n(More detailed UI coming soon!)`);
    }

    updateLocationUI() {
        let locDiv = document.getElementById('ep-location-display');
        if (!locDiv) {
            locDiv = document.createElement('div');
            locDiv.id = 'ep-location-display';
            locDiv.style.cssText = 'position:absolute;top:10px;left:50%;transform:translateX(-50%);color:#38bdf8;font-size:1.2em;font-weight:bold;text-shadow:0 0 10px #0284c7;';
            document.body.appendChild(locDiv);
        }
        locDiv.innerHTML = this.isOnMoon
            ? '🌙 THE MOON <button onclick="window.game.returnToPlanet()" style="margin-left:20px;padding:5px 15px;background:#1e293b;color:#38bdf8;border:1px solid #38bdf8;border-radius:5px;cursor:pointer;">🌍 Return to Planet</button>'
            : '🌍 KEPLER-186f';
    }
    triggerVisuals(type) {
        if (type === 'solar_flare') {
            // Flash screen orange
            const flash = document.createElement('div');
            flash.style.position = 'absolute';
            flash.style.top = '0';
            flash.style.left = '0';
            flash.style.width = '100vw'; // Use vw/vh for full coverage
            flash.style.height = '100vh';
            flash.style.background = 'orange';
            flash.style.opacity = '0.5';
            flash.style.pointerEvents = 'none';
            flash.style.zIndex = '9999';
            flash.style.mixBlendMode = 'overlay';
            flash.style.transition = 'opacity 2s';
            document.body.appendChild(flash);

            setTimeout(() => {
                flash.style.opacity = '0';
                setTimeout(() => flash.remove(), 2000);
            }, 100);

            // Screen Shake
            if (this.controls) {
                const originalTarget = this.controls.target.clone();
                // We can't easily shake camera pos with controls active without fighting it.
                // Shake the scene/root object instead? Or just skip shake for now and stick to flash.
                // Let's try minor camera offset interaction.
                let duration = 20;
                const shake = setInterval(() => {
                    const offset = new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5));
                    this.camera.position.add(offset.multiplyScalar(0.2));
                    duration--;
                    if (duration <= 0) clearInterval(shake);
                }, 50);
            }
        }
    }
    // --- 3D SPACE COMBAT CONTROL ---

    // --- SHIP DEPLOYMENT UI ---
    openCombatDeployment() {
        if (!this.shipDesigner || this.shipDesigner.designs.length === 0) {
            this.notify("No ship designs available! Design a ship first.", "warning");
            this.shipDesigner.openDesigner(); // Redirect to designer
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'ep-deployment-modal';
        modal.className = 'ep-modal-overlay';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="ep-modal" style="width: 800px; max-height: 80vh; overflow-y: auto;">
                <div class="ep-modal-header">
                    <h2 style="margin:0; color:#38bdf8;">🚀 Fleet Deployment</h2>
                    <button class="ep-sys-btn" onclick="document.getElementById('ep-deployment-modal').remove()">✖</button>
                </div>
                <div style="padding: 20px;">
                    <div style="margin-bottom: 20px; color: #cbd5e1;">Select ships to deploy into combat squadron (Max 3).</div>
                    
                    <div id="ep-deploy-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;">
                        <!-- Ships populated here -->
                    </div>

                    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #334155; display: flex; justify-content: space-between; align-items: center;">
                        <div id="ep-squad-count" style="color: #38bdf8; font-weight: bold;">Selected: 0/3</div>
                        <button id="ep-btn-launch-squad" class="ep-sys-btn" style="background: #0ea5e9; font-size: 1.2em; padding: 10px 30px;" disabled>L A U N C H</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const list = modal.querySelector('#ep-deploy-list');
        const countDisplay = modal.querySelector('#ep-squad-count');
        const launchBtn = modal.querySelector('#ep-btn-launch-squad');

        let selectedIndices = [];

        this.shipDesigner.designs.forEach((design, index) => {
            const card = document.createElement('div');
            card.className = 'ep-design-card';
            card.style.cssText = `background: #0f172a; border: 1px solid #334155; padding: 10px; border-radius: 6px; cursor: pointer; transition: all 0.2s;`;
            card.innerHTML = `
                <div style="font-weight: bold; color: #fff; margin-bottom: 5px;">${design.name}</div>
                <div style="font-size: 0.8em; color: #94a3b8;">Hull: ${design.hull}</div>
                <div style="font-size: 0.8em; color: #94a3b8;">Modules: ${design.modules.length}</div>
                <div style="margin-top: 5px; font-size: 0.9em; color: #38bdf8;">Points: ${this.calculateShipPoints(design)}</div>
            `;

            card.onclick = () => {
                if (selectedIndices.includes(index)) {
                    selectedIndices = selectedIndices.filter(i => i !== index);
                    card.style.border = '1px solid #334155';
                    card.style.background = '#0f172a';
                } else {
                    if (selectedIndices.length >= 3) {
                        this.notify("Squadron full! Max 3 ships.", "warning");
                        return;
                    }
                    selectedIndices.push(index);
                    card.style.border = '1px solid #38bdf8';
                    card.style.background = 'rgba(56, 189, 248, 0.2)';
                }
                updateSelection();
            };
            list.appendChild(card);
        });

        const updateSelection = () => {
            countDisplay.innerText = `Selected: ${selectedIndices.length}/3`;
            launchBtn.disabled = selectedIndices.length === 0;
            launchBtn.style.opacity = selectedIndices.length === 0 ? '0.5' : '1';
        };

        launchBtn.onclick = () => {
            const squadron = selectedIndices.map(i => this.shipDesigner.designs[i]);
            document.getElementById('ep-deployment-modal').remove();
            this.launchFighters(squadron);
        };
    }

    calculateShipPoints(design) {
        // Simple heuristic for ship 'value'
        let points = 50; // Base hull value
        if (design.hull === 'Dreadnought') points = 200;
        if (design.hull === 'Interceptor') points = 80;
        if (design.hull === 'Bomber') points = 100;
        return points + (design.modules.length * 10);
    }

    launchFighters(selectedShips = null) {
        if (!this.combatScene) return;

        if (this.isCombatActive) {
            this.retreatFromCombat();
            return;
        }

        // Default to a basic ship if none selected (fallback)
        if (!selectedShips || selectedShips.length === 0) {
            // Check if we have created designs, if so use the first one
            if (this.shipDesigner && this.shipDesigner.designs.length > 0) {
                selectedShips = [this.shipDesigner.designs[0]];
            } else {
                // If no designs, launch default starter ship
                console.warn("No designs found, launching default.");
                // This will be handled by SpaceCombatScene default init if array is empty
                selectedShips = [];
            }
        }

        // 1. Hide Planet View
        const ui = document.getElementById('ep-ui');
        if (ui) ui.style.display = 'none';

        if (this.cursorMesh) this.cursorMesh.visible = false;

        // 2. Start Combat Scene with Squadron
        try {
            this.combatScene.start(selectedShips);
        } catch (e) { console.error("Combat Start Failed:", e); }

        // 3. Enable Combat Mode
        this.isCombatActive = true;
        if (this.controls) this.controls.enabled = false; // Disable OrbitControls

        const retreatBtnId = 'ep-btn-retreat';
        let retreatBtn = document.getElementById(retreatBtnId);
        if (!retreatBtn) {
            retreatBtn = document.createElement('button');
            retreatBtn.id = retreatBtnId;
            retreatBtn.className = 'ep-sys-btn';
            retreatBtn.textContent = '↩ RETREAT';
            retreatBtn.title = 'Retreat from Combat';
            retreatBtn.setAttribute('aria-label', 'Retreat from Combat');
            retreatBtn.style.cssText = 'position:absolute; top:20px; right:20px; z-index:6000; pointer-events:auto;';
            retreatBtn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
            retreatBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.retreatFromCombat();
            });
            document.body.appendChild(retreatBtn);
        } else {
            retreatBtn.style.display = 'inline-flex';
        }
    }

    retreatFromCombat(result = null) {
        if (!this.combatScene) return;

        console.log("Retreating to Surface...");
        this.notify("Fighters Returning to Base.", "info");

        const outcome = (result && result.outcome != null) ? String(result.outcome) : null;
        const reward = (result && result.reward && typeof result.reward === 'object') ? result.reward : null;
        if (outcome === 'victory') {
            if (!this.agentMissionDefs) this.agentMissionDefs = this.getAgentMissionDefinitions();
            if (!this.agentMissions) this.agentMissions = this.createDefaultAgentMissionsState(this.agentMissionDefs);
            this.agentMissions = this.normalizeAgentMissionsState(this.agentMissions);
            if (!this.agentMissions.stats) this.agentMissions.stats = { combatWins: 0 };
            const wins = (typeof this.agentMissions.stats.combatWins === 'number' && Number.isFinite(this.agentMissions.stats.combatWins)) ? this.agentMissions.stats.combatWins : 0;
            this.agentMissions.stats.combatWins = Math.max(0, Math.floor(wins)) + 1;
        }
        if (outcome === 'victory' && reward && this.resources) {
            const gained = [];
            Object.keys(reward).forEach((k) => {
                const amt = reward[k];
                const n = (typeof amt === 'number' && Number.isFinite(amt)) ? amt : Number(amt);
                if (!(typeof n === 'number' && Number.isFinite(n)) || n <= 0) return;
                if (!Object.prototype.hasOwnProperty.call(this.resources, k)) return;
                const cur = (typeof this.resources[k] === 'number' && Number.isFinite(this.resources[k])) ? this.resources[k] : 0;
                this.resources[k] = cur + n;
                gained.push(`+${Math.floor(n)} ${k}`);
            });
            if (gained.length > 0) {
                this.notify(`Combat rewards: ${gained.join(', ')}`, 'success');
                this.updateResourceUI();
            }
        }

        this.updateAgentMissions();

        // 1. Stop Combat Scene
        this.combatScene.stop();
        this.isCombatActive = false;

        // 2. Show Planet UI
        const ui = document.getElementById('ep-ui');
        if (ui) ui.style.display = '';

        const retreatBtn = document.getElementById('ep-btn-retreat');
        if (retreatBtn) retreatBtn.style.display = 'none';

        if (this.controls) this.controls.enabled = true;
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const dt = this.clock.getDelta();

        // COMMBAT MODE RENDER
        if (this.isCombatActive && this.combatScene) {
            if (!this.isPaused) this.combatScene.update(dt);
            this.combatScene.render();
            return;
        }

        // STANDARD PLANET RENDER

        // Update Managers
        if (!this.isPaused) {
            // Frame Counter for slow ticks
            if (!this.frameCount) this.frameCount = 0;
            this.frameCount++;

            if (this.frameCount % 60 === 0) {
                this.applyColonistEffects();
            }

            if (this.production) this.production.update(dt);
            if (this.drones) this.drones.update(dt);
            if (this.orbit) this.orbit.update(this.timeOfDay);
            if (this.fleetManager) this.fleetManager.update(dt);

            if (this.terraforming) this.terraforming.update(dt);
            if (this.controls) this.controls.update();

            if (this.planetMesh) this.planetMesh.rotation.y += 0.0005;
            if (this.atmosphereMesh) this.atmosphereMesh.rotation.y += 0.0007;
            if (this.cloudMesh) this.cloudMesh.rotation.y += 0.0008;

            this.timeOfDay += 0.01;
            if (this.timeOfDay >= 24) {
                this.timeOfDay = 0;
                this.day++;
                if (this.market) this.market.updatePrices();
                this.notify("New Day: Market Prices Updated", "info");
            }
        }

        if (this.isGalaxyViewActive && this.galaxyView) {
            if (!this.isPaused) this.galaxyView.update();
            return;
        }

        // Render Scale/Bloom
        if (this.composer) {
            this.composer.render();
        } else if (this.renderer) { // Ensure renderer exists
            this.renderer.render(this.scene, this.camera);
        }
    }
}

class SoundEngine {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.3;

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 1.0;
        this.musicGain.connect(this.masterGain);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 1.0;
        this.sfxGain.connect(this.masterGain);

        this.masterGain.connect(this.ctx.destination);
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;
        if (this.ctx.state === 'suspended') await this.ctx.resume();
        this.initialized = true;
    }

    playTone(freq, duration, type = 'sine', volume = 0.1) {
        if (!this.initialized) return;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type;
        o.connect(g);
        g.connect(this.sfxGain || this.masterGain);
        o.frequency.setValueAtTime(freq, this.ctx.currentTime);
        g.gain.setValueAtTime(volume, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        o.start();
        o.stop(this.ctx.currentTime + duration);
    }

    playClick() {
        this.playTone(800, 0.08, 'square', 0.05);
    }

    playBuild() {
        // Two-tone construction sound
        this.playTone(200, 0.15, 'sawtooth', 0.08);
        setTimeout(() => this.playTone(300, 0.2, 'sawtooth', 0.06), 100);
    }

    playError() {
        // Low buzz
        this.playTone(150, 0.3, 'sawtooth', 0.1);
    }

    playUnlock() {
        // Triumphant ascending tones
        this.playTone(523, 0.15, 'sine', 0.1); // C5
        setTimeout(() => this.playTone(659, 0.15, 'sine', 0.1), 100); // E5
        setTimeout(() => this.playTone(784, 0.25, 'sine', 0.12), 200); // G5
    }

    playSuccess() {
        // Pleasant ding
        this.playTone(880, 0.2, 'sine', 0.08);
    }

    playScan() {
        // Quick UI/scan chirp
        this.playTone(1200, 0.06, 'sine', 0.04);
        setTimeout(() => this.playTone(1500, 0.06, 'sine', 0.03), 60);
    }

    playWarp() {
        // Sci-fi whoosh
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'sine';
        o.connect(g);
        g.connect(this.sfxGain || this.masterGain);
        o.frequency.setValueAtTime(100, this.ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(2000, this.ctx.currentTime + 0.5);
        g.gain.setValueAtTime(0.1, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.6);
        o.start();
        o.stop(this.ctx.currentTime + 0.6);
    }

    playAmbient() {
        // Low continuous hum (for atmosphere)
        if (!this.initialized) return;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'sine';
        o.connect(g);
        g.connect(this.musicGain || this.masterGain);
        o.frequency.setValueAtTime(55, this.ctx.currentTime);
        g.gain.setValueAtTime(0.02, this.ctx.currentTime);
        o.start();
        this.ambientOsc = o;
        this.ambientGain = g;
    }

    stopAmbient() {
        if (this.ambientOsc) {
            this.ambientGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1);
            setTimeout(() => this.ambientOsc.stop(), 1000);
        }
    }
}

window.SoundEngine = SoundEngine;
window.ExoplanetPioneer = ExoplanetPioneer;
