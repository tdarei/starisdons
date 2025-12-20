/**
 * Megastructure System
 * Phase 6: The Kardashev Ascension
 * Manages the construction of Dyson Swarms and Stellar Engines.
 */

class MegastructureSystem {
    constructor() {
        this.swarms = []; // { starId, density, type }
    }

    init() {
        console.log("🏗️ Megastructure Engineering: ONLINE");
    }

    constructSwarm(starName, stage = 0) {
        const stages = [
            { name: "Satellite Array", density: 500, harvest: 5000 },
            { name: "Particle Ring", density: 2000, harvest: 25000 },
            { name: "Dyson Swarm", density: 10000, harvest: 150000 }
        ];

        const config = stages[stage] || stages[0];
        console.log(`🏗️ Construction phase: ${config.name} around ${starName}...`);

        const swarm = {
            id: `swarm-${Date.now()}`,
            starName,
            stage,
            stageName: config.name,
            density: config.density,
            harvestRate: config.harvest
        };

        this.swarms.push(swarm);

        // Visual Simulation (if 3D viewer is active)
        if (window.planet3DViewer && window.planet3DViewer.scene) {
            this.renderSwarm(swarm);
        }

        // Narrative event
        if (window.aiVoiceSystem) {
            window.aiVoiceSystem.speak(`${config.name} initiated around ${starName}. Energy capture efficiency projected at ${((stage + 1) * 0.05).toFixed(2)}%.`, 'Construct');
        }

        return swarm;
    }

    hasDysonSwarm() {
        return this.swarms.some(s => s.stage >= 2);
    }

    renderSwarm(swarm) {
        const THREE = window.THREE;
        if (!THREE) return;

        // Use InstancedMesh for performance with thousands of sats
        const geometry = new THREE.PlaneGeometry(0.5, 0.5);
        const material = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide });
        const mesh = new THREE.InstancedMesh(geometry, material, swarm.density);

        const dummy = new THREE.Object3D();
        const starRadius = 50; // Distance from center

        for (let i = 0; i < swarm.density; i++) {
            let phi, theta;

            if (swarm.stage === 1) { // Particle Ring
                phi = Math.PI / 2 + (Math.random() - 0.5) * 0.1; // Narrow band
                theta = (i / swarm.density) * Math.PI * 2;
            } else { // Sphere distribution
                phi = Math.acos(-1 + (2 * i) / swarm.density);
                theta = Math.sqrt(swarm.density * Math.PI) * phi;
            }

            dummy.position.setFromSphericalCoords(starRadius, phi, theta);
            dummy.lookAt(0, 0, 0);
            dummy.updateMatrix();

            mesh.setMatrixAt(i, dummy.matrix);
        }

        // Add animation logic to rotation
        mesh.userData = { isSwarm: true, rotationSpeed: 0.001 };

        window.planet3DViewer.scene.add(mesh);
        console.log(`✨ Deployed ${swarm.density} solar collectors for ${swarm.stageName}.`);
    }

    getStatus() {
        const totalHarvest = this.swarms.reduce((sum, s) => sum + s.harvestRate, 0);
        return `Active Megastructures: ${this.swarms.length}. Total Output: ${totalHarvest.toLocaleString()} Yottawatts.`;
    }
}

if (typeof window !== 'undefined') {
    window.MegastructureSystem = MegastructureSystem;
    window.megastructureSystem = new MegastructureSystem();
}
