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

        this.isPaused = false;
        this.isCombatActive = false;
        this.autosaveIntervalMs = 120000;
        this.lastAutosaveNotifyAt = 0;
        this.autosaveEnabled = true;

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
        this.systemStates = {};
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
            'solar': { name: 'Solar Array', cost: { minerals: 20 }, icon: '⚡', output: { energy: 8 }, job: 'engineer', desc: 'Generates Energy', color: 0xfacc15, maxLevel: 3, upgradeMult: 1.5 },
            'hab': { name: 'Habitat Dome', cost: { minerals: 50, energy: 20 }, icon: '🏠', capacity: 5, desc: 'Houses 5 Colonists', color: 0x60a5fa, maxLevel: 3, upgradeMult: 1.5 },
            'mine': { name: 'Auto-Miner', cost: { energy: 40 }, icon: '⛏️', output: { minerals: 3 }, job: 'miner', desc: 'Extracts Minerals', color: 0x94a3b8, maxLevel: 3, upgradeMult: 1.5 },
            'farm': { name: 'Hydroponics', cost: { minerals: 30, energy: 10 }, icon: '🌱', output: { food: 5 }, job: 'botanist', desc: 'Grows Food', color: 0x4ade80 },
            'lab': { name: 'Research Lab', cost: { minerals: 100, energy: 50 }, icon: '🔬', output: { data: 2 }, job: 'researcher', desc: 'Generates Data', color: 0xa855f7 },
            'oxy': { name: 'O2 Generator', cost: { minerals: 40, energy: 30 }, icon: '💨', output: { oxygen: 6 }, job: 'engineer', desc: 'Produces Oxygen', color: 0xa5f3fc },
            'store': { name: 'Silo', cost: { minerals: 80, energy: 10 }, icon: '📦', capBoost: 100, desc: 'Increases Storage', color: 0xf472b6, maxLevel: 3, upgradeMult: 1.5 },
            'refinery': { name: 'Refinery', cost: { minerals: 100, energy: 50 }, icon: '🏭', desc: 'Refines Minerals into Alloys', color: 0xff8c00, maxLevel: 3, upgradeMult: 1.5 },
            'chip_fab': { name: 'Chip Fab', cost: { alloys: 20, energy: 100 }, icon: '📟', desc: 'Assembles Circuits', color: 0x00ced1, maxLevel: 3, upgradeMult: 1.5 },
            'drone_hub': { name: 'Drone Hub', cost: { alloys: 50, circuits: 10 }, icon: '🚁', desc: 'Center for automation', color: 0xffffff },
            'fusion': { name: 'Fusion Reactor', cost: { alloys: 200, circuits: 50 }, icon: '☢️', output: { energy: 100 }, job: 'engineer', desc: 'Massive Power', color: 0xef4444 },
            'launch_site': { name: 'Launch Site', cost: { alloys: 100, circuits: 50 }, icon: '🚀', desc: 'Unlocks Orbital View', color: 0xcbd5e1 },
            // Moon-specific buildings
            'helium_mine': { name: 'Helium-3 Extractor', cost: { minerals: 80, alloys: 40 }, icon: '⚛️', output: { helium3: 5 }, job: 'miner', desc: 'Extracts Helium-3 (Moon Only)', color: 0x7dd3fc, moonOnly: true },
            'lunar_hab': { name: 'Lunar Habitat', cost: { minerals: 40, alloys: 20 }, icon: '🌙', capacity: 3, desc: 'Houses 3 Colonists (Low-G)', color: 0x94a3b8, moonOnly: true },
            'low_g_factory': { name: 'Low-G Factory', cost: { alloys: 60, circuits: 20 }, icon: '🏭', output: { circuits: 3 }, job: 'engineer', desc: '+50% production in low gravity', color: 0xe879f9, moonOnly: true }
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
                        <button class="ep-sys-btn" id="ep-btn-xeno" title="Xenodex" aria-label="Xenodex">👽</button>
                        <button class="ep-sys-btn" id="ep-btn-roster" title="Colony Roster" aria-label="Colony Roster">📋</button>
                        <button class="ep-sys-btn" id="ep-btn-fleet" title="Fleet" aria-label="Fleet">🚀</button>
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
        this.container.querySelector('#ep-btn-xeno').onclick = () => { this.audio.playClick(); this.openXenodex(); };
        this.container.querySelector('#ep-btn-roster').onclick = () => { this.audio.playClick(); this.openRoster(); };
        this.container.querySelector('#ep-btn-fleet').onclick = () => { this.audio.playClick(); this.fleetManager.openFleetUI(); };
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
        this.container.querySelector('#ep-btn-claim').onclick = () => { this.audio.playClick(); this.multiplayer.claimCurrentSystem(); };
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
        } catch (e) {}
    }

    saveSettings() {
        try {
            localStorage.setItem('ep_settings_v1', JSON.stringify({
                autosaveEnabled: this.autosaveEnabled,
                autosaveIntervalMs: this.autosaveIntervalMs,
                audioMaster: this.audioMaster,
                audioMusic: this.audioMusic,
                audioSfx: this.audioSfx,
                audioMuted: this.audioMuted
            }));
        } catch (e) {}
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
            try { localStorage.removeItem('ep_settings_v1'); } catch (e) {}

            this.autosaveEnabled = true;
            this.autosaveIntervalMs = 120000;

            this.audioMaster = 0.3;
            this.audioMusic = 1.0;
            this.audioSfx = 1.0;
            this.audioMuted = false;

            if (autosaveToggle) autosaveToggle.checked = true;
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
        const autosaveInterval = document.getElementById('ep-setting-autosave-interval');
        if (autosaveToggle) autosaveToggle.checked = this.autosaveEnabled !== false;
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

        let cap = base + (this.getPilotColonyBonuses ? (this.getPilotColonyBonuses().popCapBonus || 0) : 0);
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

    sanitizeColonist(c) {
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
        panel.innerHTML = `
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
        if (dayEl) dayEl.innerText = `Day ${this.day} | ${Math.floor(this.timeOfDay).toString().padStart(2, '0')}:00 | ${Math.round(this.temperature)}°C`;
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
        Object.keys(this.buildingTypes).forEach(key => {
            const b = this.buildingTypes[key];
            // Filter: moon-only buildings only show on moon, regular buildings only on planet
            if (b.moonOnly && !this.isOnMoon) return;
            if (!b.moonOnly && this.isOnMoon && !['solar', 'store'].includes(key)) return; // Only allow basic buildings on moon
            const btn = document.createElement('div');
            btn.className = 'ep-build-btn';
            btn.innerHTML = `
                <div class="ep-build-icon" style="color:${new THREE.Color(b.color).getStyle()}">${b.icon}</div>
                <div style="font-weight:bold;">${b.name}</div>
                <div class="ep-build-cost">${this.formatCost(b.cost)}</div>
            `;
            btn.onclick = () => { this.audio.playClick(); this.selectBuilding(key, btn); };
            btn.onmouseenter = (e) => this.showTooltip(e, b.desc);
            btn.onmouseleave = () => this.hideTooltip();
            menu.appendChild(btn);
        });
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

        if (this.selectedBuilding) {
            const building = this.buildingTypes[this.selectedBuilding];
            for (let res in building.cost) {
                if (this.resources[res] < building.cost[res]) {
                    this.notify(`Insufficient ${res}! Need ${building.cost[res]}`, "danger");
                    return;
                }
            }
            for (let res in building.cost) this.resources[res] -= building.cost[res];

            const mesh = this.placeBuildingMesh(point, normal, this.selectedBuilding);
            if (mesh) this.buildingMeshes[tileIdx] = mesh;
            this.createEffect(point, normal, 0x4ade80);

            // Set Tile Data
            tile.building = this.selectedBuilding;
            tile.level = 1; // Start at Level 1

            // Add to structures list
            this.structures.push({
                id: 'str_' + Date.now(),
                type: this.selectedBuilding,
                level: 1, // Start at Level 1
                tileId: tileIdx,
                health: 100
            });
            this.updateResourceUI();
            this.audio.playBuild();
            this.notify(`${building.name} Constructed!`, "success");

            // Deselect? No, keep selected for multi-build?
            // For now, keep selected.
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

    retreatFromCombat() {
        if (!this.combatScene) return;

        console.log("Retreating to Surface...");
        this.notify("Fighters Returning to Base.", "info");

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
                stats: { hp: Math.min(hp, maxHp), maxHp }
            });
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
            ships: Array.isArray(this.ships)
                ? this.ships.map((s) => this.serializeFleetShip(s)).filter(Boolean)
                : [],
            shipDesigns: (this.shipDesigner && Array.isArray(this.shipDesigner.designs))
                ? this.shipDesigner.designs.map((d) => this.serializeShipDesign(d)).filter(Boolean)
                : []
        };
        localStorage.setItem('ep_save_v2', JSON.stringify(data));
        if (!options.silent) this.notify("Game Saved (Local)!", "success");
    }

    loadGame() {
        const json = localStorage.getItem('ep_save_v2');
        if (!json) { this.notify("No Local Save Found!", "warning"); return; }
        try { const data = JSON.parse(json); this.loadGameData(data); this.notify("Local Game Loaded!", "success"); }
        catch (e) { console.error(e); this.notify("Save Corrupted!", "danger"); }
    }

    loadGameData(data) {
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
                    const multiplier = Math.pow(1.2, level - 1);

                    for (let res in def.output) {
                        if (!this.resources[res]) this.resources[res] = 0;
                        this.resources[res] += def.output[res] * multiplier;
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
            tiles: this.tiles.map(t => ({ id: t.id, type: t.type, building: t.building })), // Save current tiles too
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

    retreatFromCombat() {
        if (!this.combatScene) return;

        console.log("Retreating to Surface...");
        this.notify("Fighters Returning to Base.", "info");

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
