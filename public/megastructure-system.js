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

    constructSwarm(starName, density = 1000) {
        console.log(`☀️ Beginning construction of Dyson Swarm around ${starName}...`);

        const swarm = {
            id: `swarm-${Date.now()}`,
            starName,
            density,
            harvestRate: 0
        };

        this.swarms.push(swarm);

        // Visual Simulation (if 3D viewer is active)
        if (window.planet3DViewer && window.planet3DViewer.scene) {
            this.renderSwarm(swarm);
        }

        // Narrative event
        if (window.aiVoiceSystem) {
            window.aiVoiceSystem.speak(`Construction initiated for Dyson Swarm Class-Alpha around ${starName}. Energy capture efficiency projected at 0.004%.`, 'Construct');
        }

        return swarm;
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
            // Random sphere distribution
            const phi = Math.acos(-1 + (2 * i) / swarm.density);
            const theta = Math.sqrt(swarm.density * Math.PI) * phi;

            dummy.position.setFromSphericalCoords(starRadius, phi, theta);
            dummy.lookAt(0, 0, 0);
            dummy.updateMatrix();

            mesh.setMatrixAt(i, dummy.matrix);
        }

        // Add animation logic to rotation
        mesh.userData = { isSwarm: true, rotationSpeed: 0.001 };

        window.planet3DViewer.scene.add(mesh);
        console.log(`✨ Deployed ${swarm.density} solar collectors.`);
    }

    getStatus() {
        return `Active Megastructures: ${this.swarms.length}. Total Output: ${this.swarms.length * 1.2} Yottawatts.`;
    }
}

if (typeof window !== 'undefined') {
    window.MegastructureSystem = MegastructureSystem;
    window.megastructureSystem = new MegastructureSystem();
}
