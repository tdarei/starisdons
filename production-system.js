class CraftingManager {
    constructor(game) {
        this.game = game;
        this.recipes = {
            'refinery': {
                name: 'Refinery Process',
                input: { minerals: 10, energy: 5 },
                output: { alloys: 2 },
                time: 10, // seconds
                buildingObj: 'refinery'
            },
            'chip_fab': {
                name: 'Circuit Assembly',
                input: { alloys: 5, data: 10 },
                output: { circuits: 1 },
                time: 20,
                buildingObj: 'chip_fab'
            }
        };

        // Active crafting jobs: { id: int, recipeKey: str, timeLeft: float }
        this.jobs = [];
        this.autoCrafters = []; // Buildings that auto-craft: { buildingId: int, type: str, progress: float }
    }

    init() {
        console.log("Production System Initialized");
    }

    // Called every game tick (e.g., 1 sec or delta frame)
    update(deltaTime) {
        // Handle Auto-Crafters (Refineries, Fabs)
        this.game.structures.forEach(struct => {
            const type = struct.type; // 'refinery', 'chip_fab'
            const recipeKey = type; // Simple mapping for now

            if (this.recipes[recipeKey]) {
                const recipe = this.recipes[recipeKey];

                // Initialize progress if missing
                if (struct.craftProgress === undefined) struct.craftProgress = 0;

                // Check inputs if starting new cycle
                if (struct.craftProgress <= 0) {
                    if (this.hasResources(recipe.input)) {
                        this.consumeResources(recipe.input);
                        struct.craftProgress = 0.01; // Start
                        struct.isCrafting = true;
                    } else {
                        struct.isCrafting = false;
                        // Notify low resources? Only once per while maybe.
                    }
                }

                // Advance progress
                if (struct.isCrafting) {
                    struct.craftProgress += deltaTime;
                    if (struct.craftProgress >= recipe.time) {
                        // Finish
                        this.produceResources(recipe.output);
                        struct.craftProgress = 0;
                        struct.isCrafting = false;
                        // this.game.notify(`${recipe.name} Complete!`, "success"); // Too spammy for auto
                        this.game.createEffect(this.game.getTilePos(struct.tileId), new THREE.Vector3(0, 1, 0), 0xffffff);
                    }
                }
            }
        });
    }

    hasResources(cost) {
        for (let res in cost) {
            if ((this.game.resources[res] || 0) < cost[res]) return false;
        }
        return true;
    }

    consumeResources(cost) {
        for (let res in cost) {
            this.game.resources[res] -= cost[res];
        }
        this.game.updateResourceUI();
    }

    produceResources(output) {
        for (let res in output) {
            if (!this.game.resources[res]) this.game.resources[res] = 0;
            this.game.resources[res] += output[res];
            // Check Caps?
            // if (this.game.resources[res] > this.game.caps[res]) ...
        }
        this.game.updateResourceUI();
    }
}
window.CraftingManager = CraftingManager;
