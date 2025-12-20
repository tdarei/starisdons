class ArchaeologyManager {
    constructor(game) {
        this.game = game;
        this.artifacts = [];
        this.excavationSites = [];
        this.isDigging = false;
    }

    init() {
        console.log("Archaeology: Scanning for ancient ruins...");
        // Delay generation until tiles exist
        setTimeout(() => this.generateRuins(), 3000);
    }

    generateRuins() {
        if (!this.game.tiles || this.game.tiles.length === 0) return;

        // chance to spawn ruins on 'mountain' or dry 'plains'
        let count = 0;
        this.game.tiles.forEach(tile => {
            if (tile.type === 'mountain' && !tile.building && Math.random() < 0.05) {
                // Mark as Ruin
                this.createRuinMarker(tile);
                this.excavationSites.push({ tileId: tile.id, progress: 0, depth: 100 });
                count++;
            }
        });
        console.log(`Archaeology: Found ${count} potential dig sites.`);
        // Notify player
        if (count > 0) {
            this.game.notify(`Sensors detected ${count} Alien Ruins!`, "info");
        }
    }

    createRuinMarker(tile) {
        // Visual Marker (Purple Obelisk?)
        if (!this.game.planetMesh) return;

        // Use BuildingArchitect style logic but simplified
        const pos = this.game.getTilePos(tile.id);
        const normal = pos.clone().normalize();

        const geo = new THREE.ConeGeometry(0.3, 1.5, 4);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x9333ea,
            emissive: 0x581c87,
            roughness: 0.2
        });
        const mesh = new THREE.Mesh(geo, mat);

        // Position
        const placePos = pos.clone().add(normal.multiplyScalar(0.5));
        mesh.position.copy(this.game.planetMesh.worldToLocal(placePos));
        mesh.lookAt(mesh.position.clone().add(normal));
        mesh.rotateX(Math.PI / 2);

        mesh.userData = { isRuin: true, tileId: tile.id };

        this.game.planetMesh.add(mesh);

        // Add to game structures or separate list?
        // Separate for now to avoid building conflicts
        // But we want it clickable.
        // Game click handler checks `structures` or `tiles`.
        // I need to hook into `handleTileClick`.

        tile.hasRuin = true;
    }

    handleTileClick(tile) {
        if (tile.hasRuin) {
            this.openExcavationUI(tile);
            return true; // value handled
        }
        return false;
    }

    openExcavationUI(tile) {
        const site = this.excavationSites.find(s => s.tileId === tile.id);
        if (!site) return;

        // Create Modal
        const modalId = 'ep-arch-modal';
        let modal = document.getElementById(modalId);
        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'ep-modal';
            modal.style.display = 'block';
            document.body.appendChild(modal);
        }
        modal.style.display = 'block';

        this.renderDigSite(modal, site);
    }

    renderDigSite(modal, site) {
        modal.innerHTML = `
            <div class="ep-modal-content" style="width:500px; text-align:center;">
                <h2 style="color:#d8b4fe">Alien Ruins Excavation</h2>
                <div style="font-size:0.9rem; color:#a855f7; margin-bottom:15px;">Site #${site.tileId}</div>
                
                <div id="ep-dig-grid" style="
                    display:grid; 
                    grid-template-columns: repeat(5, 1fr); 
                    gap:5px; 
                    width:300px; 
                    height:300px; 
                    margin:0 auto;
                    background:#1e1b4b;
                    padding:10px;
                    border:2px solid #581c87;
                "></div>

                <div style="margin-top:15px;">
                    <button class="ep-btn" onclick="document.getElementById('${modal.id}').style.display='none'">Close</button>
                    ${site.progress >= 100 ? `<button class="ep-btn-primary" onclick="window.game.archaeology.claimRelic(${site.tileId})">Claim Relic</button>` : ''}
                </div>
            </div>
        `;

        if (site.progress < 100) {
            this.initDigMinigame(site);
        } else {
            document.getElementById('ep-dig-grid').innerHTML = `<div style="grid-column:1/-1; display:flex; align-items:center; justify-content:center; height:100%; color:#d8b4fe">Excavation Complete!</div>`;
        }
    }

    initDigMinigame(site) {
        const grid = document.getElementById('ep-dig-grid');
        grid.innerHTML = '';

        // 5x5 Grid of "Dirt"
        // Some contain "Artifacts" (Green), some "Rocks" (Red), some "Empty"
        // This state needs to be persistent? For now, generate deterministic based on tileId

        // Simple Game: Click to reveal.
        // Costs Energy per click.

        // Create 25 cells
        for (let i = 0; i < 25; i++) {
            const cell = document.createElement('div');
            cell.style.cssText = `background:#78716c; border-radius:4px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:1.2rem;`;
            cell.dataset.index = i;
            cell.onclick = () => this.digCell(site, i, cell);
            grid.appendChild(cell);
        }
    }

    digCell(site, index, element) {
        if (element.classList.contains('dug')) return;

        if (this.game.resources.energy < 5) {
            this.game.notify("Not enough Energy to dig! (Need 5)", "danger");
            return;
        }
        this.game.resources.energy -= 5;
        this.game.updateResourceUI();

        element.classList.add('dug');

        // Deterministic RNG
        const rand = Math.sin(site.tileId * 999 + index) * 10000;
        const val = rand - Math.floor(rand);

        if (val > 0.8) {
            // Found Artifact Fragment
            element.style.background = '#d8b4fe';
            element.innerText = '🏺';
            site.progress += 20; // Need 5 fragments
            this.game.notify("Found an Artifact Fragment!", "success");
        } else if (val < 0.2) {
            // Rock (Block)
            element.style.background = '#44403c';
            element.innerText = '🪨';
            // Nothing
        } else {
            // Dirt
            element.style.background = '#292524';
        }

        if (site.progress >= 100) {
            this.game.notify("Excavation Complete! Relic exposed.", "success");
            this.openExcavationUI(site); // Refresh to show claim button
        }
    }

    claimRelic(tileId) {
        const site = this.excavationSites.find(s => s.tileId === tileId);
        if (!site) return;

        // Reward
        this.game.resources.data += 500;
        this.game.resources.minerals += 200;
        this.game.notify("Relic Analyzed: +500 Data, +200 Minerals", "success");

        // Unlock Ancient Tech?
        // this.game.unlockTech('ancient_knowledge');

        // Remove Site
        const index = this.excavationSites.indexOf(site);
        this.excavationSites.splice(index, 1);

        // Remove visuals
        // Need reference to mesh.
        // Simplified: Just set tile.hasRuin = false
        const tile = this.game.tiles.find(t => t.id === tileId);
        if (tile) tile.hasRuin = false;

        document.getElementById('ep-arch-modal').style.display = 'none';

        // Remove mesh from scene (tricky without reference, but we can scan planetMesh children)
        this.game.planetMesh.children.forEach(c => {
            if (c.userData.isRuin && c.userData.tileId === tileId) {
                c.visible = false; // Hide it
            }
        });
    }
}
