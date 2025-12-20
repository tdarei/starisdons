
console.log("SPACE COMBAT JS LOADED - VERSION 18");

// --- Asset Management ---
class AssetManager {
    constructor() {
        this.assets = {};
        this.loading = {};
        this.loader = new THREE.GLTFLoader();
    }

    load(name, url, callback) {
        if (this.assets[name]) {
            if (callback) callback(this.assets[name].clone());
            return;
        }

        if (this.loading[name]) {
            if (callback) this.loading[name].push(callback);
            return;
        }

        this.loading[name] = callback ? [callback] : [];

        this.loader.load(url, (gltf) => {
            console.log(`Asset Loaded: ${name}`);
            this.assets[name] = gltf.scene;
            const callbacks = this.loading[name] || [];
            delete this.loading[name];
            callbacks.forEach(cb => cb(gltf.scene.clone()));
        }, undefined, (error) => {
            console.error(`Error loading asset ${name}:`, error);
            const callbacks = this.loading[name] || [];
            delete this.loading[name];
            callbacks.forEach(cb => cb(null));
        });
    }

    get(name) {
        return this.assets[name] ? this.assets[name].clone() : null;
    }
}

// Global Asset Manager Instance
const assetManager = new AssetManager();

class SpaceCombatScene {
    constructor(game) {
        this.game = game;
        this.active = false;

        // Preload Assets
        assetManager.load('xwing', 'assets/models/xwing.glb');
        assetManager.load('missile', 'assets/models/missile.glb');

        // Scene Setup
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.renderer = game.renderer; // Reuse main renderer

        // Lighting
        // Lighting
        const ambientLight = new THREE.AmbientLight(0x222222, 0.8); // Higher ambient for visibility
        this.scene.add(ambientLight);

        // Key Light (Sun)
        const sunLight = new THREE.DirectionalLight(0xffffee, 1.2);
        sunLight.position.set(100, 50, 50);
        this.scene.add(sunLight);

        // Rim Light (Blue-ish back light)
        const rimLight = new THREE.DirectionalLight(0x4455ff, 0.8);
        rimLight.position.set(-50, 20, -50);
        this.scene.add(rimLight);

        // Starfield & Nebula
        this.createStarfield();
        this.createNebula();

        // Game Objects
        this.player = null;
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        this.cameraOffset = new THREE.Vector3(0, 8, 25); // Chase position
        this.cameraLookOffset = new THREE.Vector3(0, 5, -20); // Look ahead point

        this.zoom = 25;
        this.onScroll = (e) => {
            if (!this.active) return;
            e.preventDefault();
            e.stopPropagation();
            if (this.game && this.game.isPaused) return;
            this.zoom += e.deltaY * 0.05;
            this.zoom = Math.max(10, Math.min(this.zoom, 50));
            this.cameraOffset.z = this.zoom;
        };

        // Systems
        this.projectileSystem = new ProjectileSystem(this);

        // Input
        this.keys = {};
        window.addEventListener('keydown', (e) => this.keys[e.code] = true);
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);

        this.init();
    }

    createStarfield() {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const colors = [];
        const color = new THREE.Color();

        for (let i = 0; i < 6000; i++) {
            vertices.push(
                THREE.MathUtils.randFloatSpread(2000),
                THREE.MathUtils.randFloatSpread(2000),
                THREE.MathUtils.randFloatSpread(2000)
            );

            // Star colors (Blue-white to yellow-white)
            const starType = Math.random();
            if (starType > 0.9) color.setHex(0xaaaaff); // Blue giant
            else if (starType > 0.6) color.setHex(0xffffee); // White/Yellow
            else color.setHex(0xaaaaaa); // Dim

            colors.push(color.r, color.g, color.b);
        }
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({ size: 1.2, vertexColors: true, transparent: true, opacity: 0.8 });
        this.starfield = new THREE.Points(geometry, material);
        this.scene.add(this.starfield);
    }

    createNebula() {
        // Simple Gradient Background Sphere
        const geo = new THREE.SphereGeometry(1500, 32, 32);
        // Flip normals to view from inside
        geo.scale(-1, 1, 1);

        const mat = new THREE.ShaderMaterial({
            uniforms: {
                color1: { value: new THREE.Color(0x000022) }, // Deep Blue
                color2: { value: new THREE.Color(0x050011) }  // Space Black
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 color1;
                uniform vec3 color2;
                varying vec2 vUv;
                void main() {
                    // Simple vertical gradient
                    gl_FragColor = vec4(mix(color1, color2, vUv.y), 1.0);
                }
            `,
            side: THREE.BackSide
        });

        const nebula = new THREE.Mesh(geo, mat);
        this.scene.add(nebula);
    }

    init() {
        // Player is now created in start() based on squadron selection
        // this.player = new ShipController(this); // REMOVED
        // this.scene.add(this.player.mesh);

        // Spawn some enemies test
        this.spawnEnemy({ x: 0, y: 0, z: -100 });
        this.spawnEnemy({ x: 50, y: 20, z: -150 });
        this.spawnEnemy({ x: -50, y: -20, z: -120 });
    }

    spawnEnemy(pos) {
        const enemy = new EnemyAI(this, pos);
        this.enemies.push(enemy);
        this.scene.add(enemy.mesh);
    }

    start(squadronData = []) {
        this.active = true;
        const hud = document.getElementById('combat-hud');
        if (hud) hud.style.display = 'block';

        // 1. Cleanup Old Squadron
        if (this.squadron) {
            this.squadron.forEach(ship => this.scene.remove(ship.mesh));
        }
        this.squadron = [];

        // 2. Create New Squadron
        console.log("Starting Combat with Squadron:", squadronData);
        // Fallback if empty (should check outside too)
        if (!squadronData || squadronData.length === 0) {
            // Default "Rookie" ship if nothing passed
            squadronData = [{ name: 'Rookie One', hull: 'Interceptor', modules: [] }];
        }

        squadronData.forEach((design, index) => {
            const ship = new ShipController(this, design);

            // Formation Position
            let xOff = 0, zOff = 0;
            // Leader is 0,0,0
            if (index === 1) { xOff = -20; zOff = 20; }  // Left Wing
            if (index === 2) { xOff = 20; zOff = 20; }   // Right Wing

            ship.formationOffset = new THREE.Vector3(xOff, 0, zOff);
            ship.mesh.position.set(xOff, 0, zOff); // Initial pos

            this.scene.add(ship.mesh);
            this.squadron.push(ship);
        });

        // 3. Set Player Control to Leader
        this.playerIndex = 0;
        this.player = this.squadron[0];

        // Notify
        if (this.game && this.game.notify) {
            this.game.notify(`Squadron launched! Leader: ${this.player.design.name}`, "success");
        }

        // Scroll listener with capture: true to ensure it works
        window.addEventListener('wheel', this.onScroll, { capture: true, passive: false });

        // Mouse Fire Listener
        this.onMouseDown = (e) => {
            if (this.player && this.active) this.player.shoot();
        };
        window.addEventListener('mousedown', this.onMouseDown);

        // Tab Listener for switching ships
        this.onKeyDown = (e) => {
            if (e.code === 'Tab') {
                e.preventDefault(); // Prevent focus switch
                this.cycleShip();
            }
        }
        window.addEventListener('keydown', this.onKeyDown);
    }

    cycleShip() {
        if (!this.squadron || this.squadron.length <= 1) return;

        this.playerIndex = (this.playerIndex + 1) % this.squadron.length;
        this.player = this.squadron[this.playerIndex];

        // Visual feedback?
        if (this.game && this.game.notify) {
            this.game.notify(`Switched control to: ${this.player.design.name}`, "info");
        }
    }

    stop() {
        this.active = false;
        document.getElementById('combat-hud').style.display = 'none';
        window.removeEventListener('wheel', this.onScroll, true);
        window.removeEventListener('mousedown', this.onMouseDown);
        window.removeEventListener('keydown', this.onKeyDown);
        // Cleanup?
    }

    update(dt) {
        if (!this.active) return;

        // Update Squadron
        if (this.squadron) {
            this.squadron.forEach((ship, index) => {
                if (ship === this.player) {
                    // Controlled by User
                    ship.update(dt, this.keys);
                } else {
                    // Wingman Logic (AI)
                    // Now passes the player as leader
                    ship.update(dt, null, this.player);
                }
            });
        }

        this.enemies.forEach(e => e.update(dt, this.player));
        this.projectileSystem.update(dt);
        this.updateParticles(dt);

        // Collision Detection
        this.checkCollisions();

        // Update Camera
        this.updateCamera(dt);
    }

    updateCamera(dt) {
        if (!this.player || !this.player.mesh) return;

        // Target Position (Behind ship) - More lag (lower lerp)
        const relativeOffset = this.cameraOffset.clone();
        const cameraTargetPos = relativeOffset.applyMatrix4(this.player.mesh.matrixWorld);

        // Smoothly move camera (2.0 factor for heavier feel)
        this.camera.position.lerp(cameraTargetPos, 2.0 * dt);

        // Look at a point in front of the ship to lead the action
        const lookOffset = this.cameraLookOffset.clone();
        const lookTarget = lookOffset.applyMatrix4(this.player.mesh.matrixWorld);

        // Rolling/Banking Camera effect
        // We get the ship's up vector to align camera up slightly
        const shipUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.player.mesh.quaternion);

        // Smooth rotation (3.0 factor for smoother turns)
        const targetQuaternion = new THREE.Quaternion().setFromRotationMatrix(
            new THREE.Matrix4().lookAt(this.camera.position, lookTarget, shipUp)
        );
        this.camera.quaternion.slerp(targetQuaternion, 3.0 * dt);
    }

    checkCollisions() {
        // Projectiles vs Enemies
        this.projectileSystem.projectiles.forEach(p => {
            if (!p.active) return;

            if (p.owner === 'player') {
                for (let i = this.enemies.length - 1; i >= 0; i--) {
                    const e = this.enemies[i];
                    if (p.mesh.position.distanceTo(e.mesh.position) < 5) { // Increased hit radius slightly
                        const dmg = (typeof p.damage === 'number' && Number.isFinite(p.damage)) ? p.damage : (p.type === 'missile' ? 25 : 10);
                        e.takeDamage(dmg);
                        p.active = false; // Destroy bullet
                        p.mesh.visible = false;
                        this.createExplosion(p.mesh.position);
                        if (e.health <= 0) {
                            this.destroyEnemy(i);
                        }
                        break;
                    }
                }
            }
        });
    }

    destroyEnemy(index) {
        const deadEnemy = this.enemies[index];
        this.createExplosion(deadEnemy.mesh.position, 2.0); // Big boom
        this.scene.remove(deadEnemy.mesh);
        this.enemies.splice(index, 1);
        // Score / Loot?
    }

    createExplosion(pos, scale = 1.0) {
        // PARTICLE EXPLOSION
        const particleCount = 20;
        const color = new THREE.Color(0xffaa00);

        for (let i = 0; i < particleCount; i++) {
            // Debris Chunk
            const size = Math.random() * 0.5 * scale;
            const geo = new THREE.BoxGeometry(size, size, size);
            const mat = new THREE.MeshBasicMaterial({ color: color });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(pos);

            // Random velocity
            const vel = new THREE.Vector3(
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20
            );

            this.scene.add(mesh);
            this.particles.push({ mesh, vel, life: 1.5 + Math.random() });

            // Spark (Additive)
            const sparkGeo = new THREE.PlaneGeometry(0.5, 0.5);
            const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending });
            const spark = new THREE.Mesh(sparkGeo, sparkMat);
            spark.position.copy(pos);
            this.scene.add(spark);
            this.particles.push({ mesh: spark, vel: vel.clone().multiplyScalar(1.5), life: 0.5 });
        }
    }
    updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                this.particles.splice(i, 1);
            } else {
                p.mesh.position.addScaledVector(p.vel, dt);
                p.mesh.rotation.x += p.vel.z * dt;
                p.mesh.rotation.y += p.vel.x * dt;
                if (p.mesh.material.opacity) {
                    p.mesh.material.opacity = p.life; // Fade out
                }
            }
        }
    }

    render() {
        if (!this.active) return;
        this.renderer.render(this.scene, this.camera);
    }
}

class ShipController {
    constructor(scene, design = null) {
        this.scene = scene;
        this.design = design || { name: 'Prototype', hull: 'Interceptor', modules: [] }; // Default

        // Apply Design Stats
        this.speed = 0;
        this.maxSpeed = 40;
        this.turnSpeed = 2.0;

        this.maxHealth = 100;

        // Custom Stats from Hull
        if (this.design.hull === 'Dreadnought') { this.maxSpeed = 20; this.turnSpeed = 0.8; this.maxHealth = 500; }
        else if (this.design.hull === 'Bomber') { this.maxSpeed = 30; this.turnSpeed = 1.5; this.maxHealth = 200; }

        if (this.design && this.design.stats) {
            const stats = this.design.stats;
            if (typeof stats.hp === 'number' && Number.isFinite(stats.hp)) this.maxHealth = stats.hp;
            if (typeof stats.speed === 'number' && Number.isFinite(stats.speed)) {
                this.maxSpeed = 20 + stats.speed * 0.5;
                this.turnSpeed = 1.2 + stats.speed / 50;
            }
            if (typeof stats.damage === 'number' && Number.isFinite(stats.damage)) this.damage = stats.damage;
            if (typeof stats.range === 'number' && Number.isFinite(stats.range)) this.range = stats.range;
        }

        this.weaponDamage = { laser: 10, missile: 25 };
        if (this.design && Array.isArray(this.design.weapons) && this.design.weapons.length > 0) {
            const dmg = { laser: 0, missile: 0 };
            this.design.weapons.forEach(w => {
                if (!w || !w.stats) return;
                const wDmg = w.stats.damage;
                if (!(typeof wDmg === 'number' && Number.isFinite(wDmg))) return;
                const id = String(w.id || '').toLowerCase();
                if (id.includes('missile') || id.includes('torpedo')) dmg.missile += wDmg;
                else dmg.laser += wDmg;
            });
            if (dmg.laser > 0) this.weaponDamage.laser = dmg.laser;
            if (dmg.missile > 0) this.weaponDamage.missile = dmg.missile;
            if (dmg.laser > 0 && dmg.missile === 0) this.weaponDamage.missile = dmg.laser;
            if (dmg.missile > 0 && dmg.laser === 0) this.weaponDamage.laser = dmg.missile;
        } else if (typeof this.damage === 'number' && Number.isFinite(this.damage)) {
            this.weaponDamage.laser = this.damage;
            this.weaponDamage.missile = this.damage;
        }

        // Apply Modules (Simple bonus)
        // design.modules ...

        // Mesh Placeholder
        this.mesh = new THREE.Group();

        this._shouldHideProceduralMesh = false;

        // 1. Try to load High-Fidelity Asset
        // Load different model based on hull? For now keeping X-Wing default
        assetManager.load('xwing', 'assets/models/xwing.glb', (model) => {
            if (!model) return;
            model.scale.set(0.5, 0.5, 0.5);
            model.rotation.y = Math.PI;

            // Hide procedural if it exists
            if (this.proceduralMesh) this.proceduralMesh.visible = false;
            else this._shouldHideProceduralMesh = true;

            this.mesh.add(model);
        });

        // 2. Create Procedural Mesh (Fallback) immediately
        this.createProceduralMesh();

        if (this._shouldHideProceduralMesh && this.proceduralMesh) {
            this.proceduralMesh.visible = false;
        }

        this.velocity = new THREE.Vector3();
        this.health = this.maxHealth;
        this.energy = 100;

        this.currentWeapon = 'laser'; // Default
        this.lastShotTime = 0;

        // Wingman AI State
        this.formationOffset = new THREE.Vector3();
    }

    // ... createProceduralMesh ... (omitted from replace for brevity unless needed)

    update(dt, inputState, leaderShip = null) {
        if (!this.mesh) return;

        // 1. AI / Wingman Mode
        if (!inputState && leaderShip) {
            this.updateAI(dt, leaderShip);
        }
        // 2. Player Control Mode
        else if (inputState) {
            this.handlePlayerInput(dt, inputState);
        }

        // 3. Physics & Boundaries
        this.mesh.position.addScaledVector(this.velocity, dt);

        // Boundary (Simple box)
        if (this.mesh.position.z < -1000) this.mesh.position.z = -1000;
        if (this.mesh.position.z > 1000) this.mesh.position.z = 1000;
        if (this.mesh.position.x < -1000) this.mesh.position.x = -1000;
        if (this.mesh.position.x > 1000) this.mesh.position.x = 1000;
        if (this.mesh.position.y < -500) this.mesh.position.y = -500;
        if (this.mesh.position.y > 500) this.mesh.position.y = 500;

        // Energy Regen
        this.energy = Math.min(100, this.energy + 10 * dt);

        if (inputState) {
            this.updateHUD();
        }
    }

    handlePlayerInput(dt, keys) {
        // Pitch/Yaw/Roll
        if (keys['KeyW']) this.mesh.rotateX(this.turnSpeed * dt);
        if (keys['KeyS']) this.mesh.rotateX(-this.turnSpeed * dt);
        if (keys['KeyA']) this.mesh.rotateY(this.turnSpeed * dt); // Yaw
        if (keys['KeyD']) this.mesh.rotateY(-this.turnSpeed * dt);

        // Roll (Q/E)
        if (keys['KeyQ']) this.mesh.rotateZ(this.turnSpeed * 1.5 * dt);
        if (keys['KeyE']) this.mesh.rotateZ(-this.turnSpeed * 1.5 * dt);

        if (keys['Digit1']) this.currentWeapon = 'laser';
        if (keys['Digit2']) this.currentWeapon = 'missile';

        if (keys['Space']) {
            this.shoot();
        }

        const boosting = !!keys['ShiftLeft'];
        const accelerating = !!keys['ArrowUp'] || boosting;
        const decelerating = !!keys['ArrowDown'] || !!keys['ControlLeft'];

        // Speed Control
        if (accelerating) this.speed += 50 * dt;
        if (decelerating) this.speed -= 50 * dt;

        if (!accelerating && !decelerating) {
            const cruiseSpeed = Math.min(20, this.maxSpeed);
            this.speed = THREE.MathUtils.lerp(this.speed, cruiseSpeed, dt);
        }

        const speedCap = boosting ? this.maxSpeed * 1.5 : this.maxSpeed;
        this.speed = Math.max(0, Math.min(this.speed, speedCap));

        // Apply Velocity (Forward direction)
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion);
        this.velocity.copy(forward).multiplyScalar(this.speed);
    }

    updateAI(dt, leader) {
        // --- 1. FORMATION FLYING ---
        // Calculate Target Position: Leader World Pos + (FormationOffset rotated by Leader Quat)
        const offset = this.formationOffset || new THREE.Vector3(0, 0, 20); // Default behind
        const targetPos = offset.clone().applyQuaternion(leader.mesh.quaternion).add(leader.mesh.position);

        // Vector to Target
        const toTarget = targetPos.clone().sub(this.mesh.position);
        const distToTarget = toTarget.length();

        // Desired Rotation: Look at a point slightly ahead of the target position to smooth out turns
        // If far behind, look at leader directly? No, look at formation slot.
        // Actually, for "V" formation, we should look generally parallel to leader, but turn towards slot if deviant.

        // Simple Steering: Look at target slot
        if (distToTarget > 1) {
            const desiredRot = new THREE.Quaternion().setFromRotationMatrix(
                new THREE.Matrix4().lookAt(this.mesh.position, targetPos, new THREE.Vector3(0, 1, 0))
            );
            this.mesh.quaternion.slerp(desiredRot, 2.0 * dt);
        } else {
            // If very close to slot, match leader rotation
            this.mesh.quaternion.slerp(leader.mesh.quaternion, 2.0 * dt);
        }

        // Speed Control (PID-like)
        // If behind, speed up. If ahead, slow down.
        const leaderSpeed = leader.speed;
        let desiredSpeed = leaderSpeed;

        // Catchup / Slowdown factor
        if (distToTarget > 5) desiredSpeed += (distToTarget * 0.5);
        // Cap speed
        desiredSpeed = Math.min(desiredSpeed, this.maxSpeed * 1.5); // Allow burst to catch up

        this.speed = THREE.MathUtils.lerp(this.speed, desiredSpeed, 1.0 * dt);

        // --- 2. COMBAT ENGAGEMENT ---
        // Identify nearest enemy
        let nearest = null;
        let minDist = 300; // Radar range

        // Access enemies from scene reference (ShipController -> SpaceCombatScene -> enemies)
        if (this.scene && this.scene.enemies) {
            this.scene.enemies.forEach(e => {
                const d = this.mesh.position.distanceTo(e.mesh.position);
                if (d < minDist) {
                    minDist = d;
                    nearest = e;
                }
            });
        }

        if (nearest) {
            // Check firing angle (Dot Product)
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion).normalize();
            const toEnemy = nearest.mesh.position.clone().sub(this.mesh.position).normalize();
            const dot = forward.dot(toEnemy);

            if (dot > 0.95) { // Roughly 18 degrees cone
                // Fire!
                this.shoot();
            }

            // Optional: If very close to enemy, break formation to evade/pursue? 
            // For now, staying in formation provides cover fire.
        }

        // Velocity Application
        const forwardVec = new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion);
        this.velocity.copy(forwardVec).multiplyScalar(this.speed);
    }

    createProceduralMesh() {
        this.proceduralMesh = new THREE.Group();
        const pMesh = this.proceduralMesh; // Alias for brevity

        // HIGH FIDELITY PROCEDURAL (Moved from Constructor)
        const fuselageGeo = new THREE.BoxGeometry(1.5, 1.5, 10);
        const fuselageMat = new THREE.MeshPhysicalMaterial({
            color: 0xeeeeee, roughness: 0.3, metalness: 0.6, clearcoat: 1.0, clearcoatRoughness: 0.1
        });
        const fuselage = new THREE.Mesh(fuselageGeo, fuselageMat);
        pMesh.add(fuselage);

        // Greeble: Top Vents
        const ventGeo = new THREE.BoxGeometry(1, 0.2, 2);
        const ventMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
        const vent = new THREE.Mesh(ventGeo, ventMat);
        vent.position.set(0, 0.8, 1);
        pMesh.add(vent);

        // Nose
        const noseGeo = new THREE.ConeGeometry(1, 6, 32);
        noseGeo.rotateX(-Math.PI / 2);
        const nose = new THREE.Mesh(noseGeo, fuselageMat);
        nose.position.z = -8;
        pMesh.add(nose);

        // Cockpit
        const cockpitGeo = new THREE.BoxGeometry(1.4, 0.8, 3);
        const cockpitMat = new THREE.MeshPhysicalMaterial({
            color: 0x222222, roughness: 0.1, metalness: 0.1, clearcoat: 1.0
        });
        const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
        cockpit.position.set(0, 1, -2);
        pMesh.add(cockpit);

        // Wings (S-Foils)
        const wingGeo = new THREE.BoxGeometry(8, 0.1, 3);
        const wingMat = new THREE.MeshPhysicalMaterial({
            color: 0xcccccc, metalness: 0.5, roughness: 0.4, clearcoat: 0.5
        });

        const createWing = (x, y, rotZ) => {
            const w = new THREE.Mesh(wingGeo, wingMat);
            w.position.set(x, y, 2);
            w.rotation.z = rotZ;
            pMesh.add(w);
            // Wing Pipe Detail
            const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 7), ventMat);
            pipe.rotation.z = Math.PI / 2;
            pipe.position.set(0, 0, 0.5);
            w.add(pipe);
        };

        createWing(4, 1, -0.2); // TL
        createWing(-4, 1, 0.2); // TR
        createWing(4, -1, 0.2); // BL
        createWing(-4, -1, -0.2); // BR

        // Engines
        const engineGeo = new THREE.CylinderGeometry(0.5, 0.4, 2, 8);
        engineGeo.rotateX(Math.PI / 2);
        const engineMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.6, roughness: 0.4 });
        const engineGlow = new THREE.MeshBasicMaterial({ color: 0xff5500 });
        const laserMat = new THREE.MeshStandardMaterial({ color: 0xaa0000, metalness: 0.8 });

        [
            { x: 2, y: 1.5 }, { x: -2, y: 1.5 },
            { x: 2, y: -1.5 }, { x: -2, y: -1.5 }
        ].forEach(pos => {
            const eng = new THREE.Mesh(engineGeo, engineMat);
            eng.position.set(pos.x, pos.y, 4);
            pMesh.add(eng);

            // Complex Intake (Torus)
            const intakeGeo = new THREE.TorusGeometry(0.3, 0.1, 8, 16);
            const intake = new THREE.Mesh(intakeGeo, new THREE.MeshPhysicalMaterial({ color: 0x555555, metalness: 0.8 }));
            intake.position.z = -1.1;
            eng.add(intake);

            // Glow
            const glow = new THREE.Mesh(new THREE.CircleGeometry(0.35, 8), engineGlow);
            glow.position.set(0, 0, 1.05);
            eng.add(glow);

            // Laser Cannons
            const laser = new THREE.Group();
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 6), laserMat);
            barrel.rotation.x = Math.PI / 2;
            laser.add(barrel);

            const tip = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0x111111 }));
            tip.rotation.x = Math.PI / 2;
            tip.position.z = -3;
            laser.add(tip);

            laser.position.set(pos.x > 0 ? 5.8 : -5.8, pos.y, -2);
            pMesh.add(laser);
        });

        // R2 UNIT
        const dBody = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.6, 16), new THREE.MeshPhysicalMaterial({ color: 0xffffff, clearcoat: 1.0 }));
        const dHead = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0xcccccc, metalness: 0.8 }));
        dBody.rotateX(Math.PI / 2);
        dHead.rotateX(-Math.PI / 2);
        dHead.position.y = 0.3;
        dBody.add(dHead);

        const dPanel = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.05), new THREE.MeshBasicMaterial({ color: 0x0000ff }));
        dPanel.position.set(0, 0, 0.3);
        dBody.add(dPanel);
        dBody.position.set(0, 1.4, 1.5);
        pMesh.add(dBody);

        // MARKINGS
        const stripeGeo = new THREE.PlaneGeometry(8, 0.2);
        const stripeMat = new THREE.MeshBasicMaterial({ color: 0xaa0000, side: THREE.DoubleSide });
        const stripeL = new THREE.Mesh(stripeGeo, stripeMat);
        stripeL.position.set(-2, 1.51, 0);
        stripeL.rotation.x = -Math.PI / 2;
        stripeL.rotation.z = -0.2;
        pMesh.add(stripeL);

        const stripeR = new THREE.Mesh(stripeGeo, stripeMat);
        stripeR.position.set(2, 1.51, 0);
        stripeR.rotation.x = -Math.PI / 2;
        stripeR.rotation.z = 0.2;
        pMesh.add(stripeR);

        this.mesh.add(pMesh);
    }

    shoot() {
        const now = Date.now();
        const fireRate = this.currentWeapon === 'missile' ? 800 : 150; // Slower fire for missiles

        if (now - this.lastShotTime > fireRate) {
            this.lastShotTime = now;

            // Spawn Projectile
            const pos = this.mesh.position.clone();
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion);
            pos.add(forward.multiplyScalar(2)); // Offset muzzle

            const dmg = this.weaponDamage ? this.weaponDamage[this.currentWeapon] : undefined;
            this.scene.projectileSystem.fire(pos, forward, 'player', this.currentWeapon, dmg);
        }
    }

    updateHUD() {
        // Assuming HTML elements exist
        const hpEl = document.getElementById('hud-hp-bar');
        if (hpEl) hpEl.style.width = `${(this.health / this.maxHealth) * 100}%`;

        const speedEl = document.getElementById('hud-speed');
        if (speedEl) speedEl.innerText = `SPD: ${Math.floor(this.speed * 10)} | WPN: ${this.currentWeapon.toUpperCase()}`;
    }
}

class EnemyAI {
    constructor(scene, pos) {
        this.scene = scene;
        this.health = 50;

        // Mesh (Enemy Style)
        this.mesh = new THREE.Group();
        // TIE Fighter Style
        // TIE Fighter Style (High Fidelity)
        const cockpitGeo = new THREE.SphereGeometry(1.5, 32, 32); // High poly
        const cockpitMat = new THREE.MeshPhysicalMaterial({
            color: 0x888888, // TIE Grey
            metalness: 0.6,
            roughness: 0.3,
            clearcoat: 0.8
        });
        const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
        this.mesh.add(cockpit);

        // Window Frame (Detail)
        const windowFrameGeo = new THREE.TorusGeometry(0.8, 0.1, 16, 32);
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        const frame = new THREE.Mesh(windowFrameGeo, frameMat);
        frame.position.z = 1.4;
        this.mesh.add(frame);

        // Window Glass
        const windowGeo = new THREE.CircleGeometry(0.8, 32);
        const windowMat = new THREE.MeshPhysicalMaterial({
            color: 0x111111,
            metalness: 0.9,
            roughness: 0.0,
            clearcoat: 1.0,
            emissive: 0xaa0000,
            emissiveIntensity: 0.2
        });
        const win = new THREE.Mesh(windowGeo, windowMat);
        win.position.z = 1.35; // Front of sphere
        this.mesh.add(win);

        // Solar Panels (Hexagonal)
        const panelGeo = new THREE.CylinderGeometry(4, 4, 0.1, 6);
        panelGeo.rotateX(Math.PI / 2);
        panelGeo.rotateZ(Math.PI / 2); // Vertical

        const panelMat = new THREE.MeshPhysicalMaterial({
            color: 0x111111,
            roughness: 0.8,
            metalness: 0.2,
            side: THREE.DoubleSide
        });
        const panelFrameMat = new THREE.MeshPhysicalMaterial({ color: 0x666666, metalness: 0.7, clearcoat: 0.5 });

        const createPanel = (x) => {
            const p = new THREE.Mesh(panelGeo, panelMat);
            p.position.x = x;
            this.mesh.add(p);
            // Center Detail
            const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.3, 8), panelFrameMat);
            hub.rotation.z = Math.PI / 2;
            p.add(hub);
            // Bracing (The Star pattern)
            for (let i = 0; i < 3; i++) {
                const strut = new THREE.Mesh(new THREE.BoxGeometry(7, 0.1, 0.1), panelFrameMat);
                strut.rotation.z = Math.PI / 2;
                strut.rotation.x = (Math.PI / 3) * i;
                p.add(strut);
            }
        };

        createPanel(-3.5);
        createPanel(3.5);

        // Struts connecting wings to body
        const strutGeo = new THREE.CylinderGeometry(0.4, 0.4, 7, 16);
        strutGeo.rotateZ(Math.PI / 2);
        const strut = new THREE.Mesh(strutGeo, panelFrameMat);
        this.mesh.add(strut);

        this.mesh.position.set(pos.x, pos.y, pos.z);

        this.state = 'chase';
        this.speed = 15;
    }

    update(dt, player) {
        if (!player) return;

        // STATE MACHINE AI
        // 0: Idle, 1: Chase, 2: Attack Run, 3: Evade
        if (!this.stateTimer) this.stateTimer = 0;
        this.stateTimer -= dt;

        const dist = this.mesh.position.distanceTo(player.mesh.position);

        // State Transitions
        if (this.state === 'chase') {
            if (dist < 40) { this.state = 'attack'; this.stateTimer = 3.0; } // Attack for 3s
        } else if (this.state === 'attack') {
            if (this.stateTimer <= 0 || dist < 10) { this.state = 'evade'; this.stateTimer = 2.0; } // Break off
        } else if (this.state === 'evade') {
            if (this.stateTimer <= 0) this.state = 'chase'; // Re-engage
        }

        // Logic
        if (this.state === 'chase') {
            // Smooth turn towards player
            const targetPos = player.mesh.position.clone();
            const lookMatrix = new THREE.Matrix4().lookAt(this.mesh.position, targetPos, new THREE.Vector3(0, 1, 0));
            const targetQuat = new THREE.Quaternion().setFromRotationMatrix(lookMatrix);
            this.mesh.quaternion.slerp(targetQuat, 2.0 * dt);

            this.mesh.translateZ(this.speed * dt); // Forward
        }
        else if (this.state === 'attack') {
            // Lock on and accelerate
            this.mesh.lookAt(player.mesh.position); // Hard lock (scary)
            this.mesh.translateZ(this.speed * 1.5 * dt); // Boost

            // Fire!
            if (Math.random() > 0.95) {
                // Fire logic would be here, visual only for AI right now? 
                // We should add AI shooting:
                const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
                this.scene.projectileSystem.fire(this.mesh.position.clone().add(fwd), fwd, 'enemy');
            }
        }
        else if (this.state === 'evade') {
            // Bank hard and random
            this.mesh.rotateZ(2.0 * dt);
            this.mesh.translateZ(this.speed * 1.2 * dt);
            this.mesh.translateY(10 * dt); // Strafe up
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        // Flash red?
    }
}



class ProjectileSystem {
    constructor(scene) {
        this.scene = scene;
        this.projectiles = []; // Single Pool
    }

    fire(position, direction, owner, type = 'laser', damage = null) {
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction.clone().negate());
        const speed = type === 'missile' ? 60 : 150;
        const velocity = direction.clone().multiplyScalar(speed);
        this.createBullet(owner, position, quat, velocity, type, damage);
    }

    createBullet(owner, position, quaternion, velocity, type, damage) {
        // Recycle or create new
        let bullet = this.projectiles.find(p => !p.active);

        // Check for Type Mismatch in recycled bullet (Simple fix: just create new if mismatch to avoid geometry swapping logic complexity for now)
        if (bullet && bullet.type !== type) {
            this.scene.scene.remove(bullet.mesh);
            const idx = this.projectiles.indexOf(bullet);
            this.projectiles.splice(idx, 1);
            bullet = null; // Force new
        }

        if (!bullet) {
            let mesh;
            // High Fidelity Missile (Asset)
            const missileAsset = assetManager.get('missile');

            if (type === 'missile' && missileAsset) {
                mesh = missileAsset;
                mesh.scale.set(0.2, 0.2, 0.2);
                mesh.rotation.y = Math.PI;
            } else {
                // Fallback Laser Bolt
                const geo = new THREE.CylinderGeometry(0.1, 0.1, 2);
                geo.rotateX(Math.PI / 2);
                const color = owner === 'player' ? 0x00ff00 : 0xff0000;
                const mat = new THREE.MeshBasicMaterial({ color: color });
                mesh = new THREE.Mesh(geo, mat);
            }

            this.scene.scene.add(mesh);
            bullet = { mesh: mesh, active: false };
            this.projectiles.push(bullet);
        }

        if (bullet && type === 'missile') {
            const missileAsset = assetManager.get('missile');
            if (missileAsset && bullet.mesh && bullet.mesh.isMesh) {
                this.scene.scene.remove(bullet.mesh);
                bullet.mesh = missileAsset;
                bullet.mesh.scale.set(0.2, 0.2, 0.2);
                bullet.mesh.rotation.y = Math.PI;
                this.scene.scene.add(bullet.mesh);
            }
        }

        // Reset State
        bullet.active = true;
        bullet.owner = owner;
        bullet.type = type;
        if (typeof damage === 'number' && Number.isFinite(damage)) bullet.damage = damage;
        else bullet.damage = type === 'missile' ? 25 : 10;
        bullet.life = 2.0;
        bullet.mesh.position.copy(position);
        bullet.mesh.quaternion.copy(quaternion);
        bullet.velocity = velocity.clone();
        bullet.mesh.visible = true;

        if (type === 'missile' && bullet.mesh && !bullet.mesh.isMesh) {
            bullet.mesh.rotateY(Math.PI);
        }
    }

    update(dt) {
        for (const p of this.projectiles) {
            if (!p.active) continue;

            p.mesh.position.addScaledVector(p.velocity, dt); // Use stored velocity
            p.life -= dt;

            if (p.life <= 0) {
                p.active = false;
                p.mesh.visible = false;
            }
        }
    }
}

class CapitalShip {
    constructor(scene, pos) {
        this.scene = scene;
        this.health = 5000;
        this.mesh = new THREE.Group();
        this.mesh.position.copy(pos);

        // Procedural Mothership (Star Destroyer-ish)
        const hullGeo = new THREE.ConeGeometry(20, 100, 4, 1, false, Math.PI * 0.25);
        hullGeo.rotateX(Math.PI / 2);
        hullGeo.rotateY(Math.PI / 4); // Flatten
        hullGeo.scale(1, 0.3, 1);

        const hullMat = new THREE.MeshPhysicalMaterial({
            color: 0x555555, metalness: 0.7, roughness: 0.6, clearcoat: 0.2
        });
        const hull = new THREE.Mesh(hullGeo, hullMat);
        this.mesh.add(hull);

        // Bridge Tower
        const bridgeGeo = new THREE.BoxGeometry(10, 5, 8);
        const bridge = new THREE.Mesh(bridgeGeo, hullMat);
        bridge.position.set(0, 8, 20);
        this.mesh.add(bridge);

        // Engines
        const engineGeo = new THREE.CylinderGeometry(2, 2, 4, 16);
        engineGeo.rotateX(Math.PI / 2);
        const engineMat = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0x0044ff, emissiveIntensity: 2 });

        [-5, 0, 5].forEach(x => {
            const eng = new THREE.Mesh(engineGeo, engineMat);
            eng.position.set(x, 0, 45); // Rear
            this.mesh.add(eng);
        });

        scene.scene.add(this.mesh);

        this.spawnTimer = 0;
    }

    update(dt) {
        // Slow rotation
        this.mesh.rotation.y += 0.05 * dt;

        // Spawn Enemies
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnTimer = 10.0; // Every 10s
            // Spawn Fighters
            if (this.scene.enemies.length < 10) {
                const spawnPos = this.mesh.position.clone();
                spawnPos.y -= 10; // Hangar bay
                this.scene.spawnEnemy({ x: spawnPos.x, y: spawnPos.y, z: spawnPos.z + 20 });
            }
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            // Massive Explosion
            this.scene.createExplosion(this.mesh.position, 20.0);
            this.mesh.visible = false;
            // Should remove from scene properly but this works for visual
        }
    }
}
