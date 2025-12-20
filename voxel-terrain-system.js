/**
 * Voxel/Deformable Terrain System
 * Allows real-time modification of planet surface geometry.
 * Simulates "Digging" and "Raising" terrain.
 */

class VoxelTerrainSystem {
    constructor() {
        this.activePlanet = null;
        this.brushSize = 5;
        this.toolbar = null;
    }

    init(planetObject) {
        this.activePlanet = planetObject; // Expects a THREE.Mesh
        console.log("🏔️ Voxel Terrain System Initialized");
        this.createToolbar();
    }

    createToolbar() {
        if (document.getElementById('terraform-toolbar')) return;

        const div = document.createElement('div');
        div.id = 'terraform-toolbar';
        div.style.cssText = `
            position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8); border: 1px solid #00fff2;
            padding: 10px; border-radius: 20px; display: flex; gap: 10px;
            z-index: 1000; pointer-events: auto;
        `;

        div.innerHTML = `
            <button onclick="window.voxelTerrainSystem.setMode('raise')">⬆️ Raise</button>
            <button onclick="window.voxelTerrainSystem.setMode('lower')">⬇️ Dig</button>
            <button onclick="window.voxelTerrainSystem.setMode('flatten')">⏹️ Flatten</button>
            <input type="range" min="1" max="20" value="5" onchange="window.voxelTerrainSystem.brushSize=this.value">
        `;

        // Only show when in planet view
        div.style.display = 'none';
        document.body.appendChild(div);
        this.toolbar = div;
    }

    showToolbar(visible) {
        if (this.toolbar) this.toolbar.style.display = visible ? 'flex' : 'none';
    }

    setMode(mode) {
        console.log(`Terraform Mode: ${mode}`);
        this.mode = mode;
    }

    modifyTerrain(point, amount) {
        // In a real implementation, this would manipulate the BufferGeometry position attribute.
        // For simulation, we'll log the modification and visually show a marker.

        console.log(`Terraforming at ${point.x.toFixed(2)}, ${point.y.toFixed(2)}: ${amount > 0 ? 'Raising' : 'Lowering'}`);

        if (window.planet3DViewer && window.planet3DViewer.scene) {
            // Visual feedback: Add a temporary particle
            const THREE = window.THREE;
            const geo = new THREE.SphereGeometry(amount * 2, 8, 8);
            const mat = new THREE.MeshBasicMaterial({ color: amount > 0 ? 0x00ff00 : 0xff0000, wireframe: true });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(point);
            window.planet3DViewer.scene.add(mesh);

            // Remove after 1 second
            setTimeout(() => {
                window.planet3DViewer.scene.remove(mesh);
            }, 1000);
        }

        // Trigger fluid update if water exists
        if (window.fluidDynamicsSystem) {
            window.fluidDynamicsSystem.updateFluids();
        }
    }
}

if (typeof window !== 'undefined') {
    window.VoxelTerrainSystem = VoxelTerrainSystem;
    window.voxelTerrainSystem = new VoxelTerrainSystem();
}
