class DroneEntity {
    constructor(id, controller) {
        this.id = id;
        this.controller = controller;
        this.state = 'IDLE'; // IDLE, WORK, MOVE, TRANSPORT, REPAIR
        this.position = new THREE.Vector3(0, 52, 0);
        this.targetPos = null;
        this.targetObj = null;
        this.cargo = null; // { resource, amount }
        this.repairProgress = 0;

        // Visuals
        const geo = new THREE.ConeGeometry(0.5, 1, 8);
        geo.rotateX(Math.PI / 2);
        const mat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        this.mesh = new THREE.Mesh(geo, mat);
        this.controller.game.scene.add(this.mesh);
    }

    update(dt) {
        if (this.state === 'IDLE') {
            const task = this.controller.getTask();
            if (task) {
                this.currentTask = task;
                this.state = 'MOVE';
                this.targetPos = this.controller.game.getTilePos(task.targetId).clone().multiplyScalar(1.05);
            }
        } else if (this.state === 'MOVE') {
            if (!this.targetPos) { this.state = 'IDLE'; return; }

            const dir = this.targetPos.clone().sub(this.position).normalize();
            const speed = 15;
            this.position.add(dir.multiplyScalar(speed * dt));
            this.mesh.lookAt(this.targetPos);

            if (this.position.distanceTo(this.targetPos) < 1.0) {
                if (this.currentTask.type === 'transport') {
                    this.state = 'TRANSPORT';
                    this.workTimer = 1.5;
                } else if (this.currentTask.type === 'repair') {
                    this.state = 'REPAIR';
                    this.repairProgress = 0;
                } else {
                    this.state = 'WORK';
                    this.workTimer = 2.0;
                }
            }
        } else if (this.state === 'WORK' || this.state === 'TRANSPORT') {
            this.workTimer -= dt;
            this.mesh.rotation.z += dt * 5;

            if (this.workTimer <= 0) {
                if (this.state === 'TRANSPORT' && this.cargo) {
                    // Deliver cargo
                    this.controller.game.resources[this.cargo.resource] =
                        (this.controller.game.resources[this.cargo.resource] || 0) + this.cargo.amount;
                    this.controller.game.notify(`📦 Drone delivered ${this.cargo.amount} ${this.cargo.resource}`, 'success');
                    this.cargo = null;
                }
                this.state = 'IDLE';
                this.currentTask = null;
            }
        } else if (this.state === 'REPAIR') {
            this.repairProgress += dt;
            this.mesh.rotation.z += dt * 8;
            // Spark effect
            this.mesh.material.color.setHex(Math.random() > 0.5 ? 0x00ffff : 0xffff00);

            if (this.repairProgress >= 3.0) {
                // Complete repair
                this.controller.completeRepair(this.currentTask.targetId);
                this.mesh.material.color.setHex(0x00ffff);
                this.state = 'IDLE';
                this.currentTask = null;
            }
        }

        this.mesh.position.copy(this.position);
    }
}

class DroneController {
    constructor(game) {
        this.game = game;
        this.drones = [];
        this.taskQueue = [];
        this.damagedBuildings = [];
    }

    init() {
        // Drones spawn when drone hub is built
    }

    spawnDrone() {
        const id = this.drones.length;
        const d = new DroneEntity(id, this);
        this.drones.push(d);
        this.game.notify("🤖 Drone Deployed", "success");
    }

    addTask(targetId, type, data = {}) {
        this.taskQueue.push({ targetId, type, ...data });
    }

    // Mark building as damaged
    markDamaged(tileId) {
        if (!this.damagedBuildings.includes(tileId)) {
            this.damagedBuildings.push(tileId);
        }
    }

    // Complete repair
    completeRepair(tileId) {
        const idx = this.damagedBuildings.indexOf(tileId);
        if (idx > -1) this.damagedBuildings.splice(idx, 1);
        this.game.notify("🔧 Building repaired!", "success");
    }

    getTask() {
        // Priority 1: Queued tasks
        if (this.taskQueue.length > 0) return this.taskQueue.shift();

        // Priority 2: Auto-repair damaged buildings
        if (this.damagedBuildings.length > 0) {
            const tileId = this.damagedBuildings[0];
            return { targetId: tileId, type: 'repair' };
        }

        // Priority 3: Transport resources from storage
        const transportTask = this.findTransportTask();
        if (transportTask) return transportTask;

        // Priority 4: Random patrol
        if (Math.random() < 0.005) {
            const randTile = Math.floor(Math.random() * this.game.tiles.length);
            return { targetId: randTile, type: 'patrol' };
        }

        return null;
    }

    findTransportTask() {
        // Check if silos have excess resources to transport
        const silos = this.game.structures.filter(s => s.type === 'store');
        if (silos.length === 0) return null;

        // Check for resource surplus to transport
        for (const res of ['minerals', 'alloys', 'circuits']) {
            if (this.game.resources[res] > this.game.caps[res] * 0.9) {
                // Find a silo to transport to
                const randSilo = silos[Math.floor(Math.random() * silos.length)];
                if (randSilo) {
                    return {
                        targetId: randSilo.tileId,
                        type: 'transport',
                        cargo: { resource: res, amount: 10 }
                    };
                }
            }
        }
        return null;
    }

    update(dt) {
        this.drones.forEach(d => d.update(dt));

        // Auto-spawn drones based on drone hubs (1 drone per hub)
        const hubs = this.game.structures.filter(s => s.type === 'drone_hub').length;
        while (this.drones.length < hubs && this.drones.length < 10) {
            this.spawnDrone();
        }
    }
}
window.DroneController = DroneController;
