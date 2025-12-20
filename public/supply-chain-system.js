/**
 * Supply Chain Logistics System
 * Manages autonomous cargo fleets Transporting resources between planets.
 * "The Spice must flow."
 */

class SupplyChainSystem {
    constructor() {
        this.routes = []; // { id, source, target, resource, status }
        this.ships = []; // { id, routeId, progress }

        this.init();
    }

    init() {
        console.log("🚛 Supply Chain Logistics Initialized");

        // Mock some initial routes
        this.createRoute("Mining Outpost Alpha", "Terra Prime", "Helium-3");
        this.createRoute("Terra Prime", "Shipyard Beta", "Nanocarbon");

        this.simulationLoop();
    }

    createRoute(source, target, resource) {
        const route = {
            id: `route-${Math.random().toString(36).substr(2, 5)}`,
            source,
            target,
            resource,
            volume: 0
        };
        this.routes.push(route);
        console.log(`🛣️ New Trade Route established: ${source} -> ${target} (${resource})`);

        // Spawn initial ships
        this.spawnShip(route.id);
        this.spawnShip(route.id);
    }

    spawnShip(routeId) {
        this.ships.push({
            id: `transport-${Math.random().toString(36).substr(2, 5)}`,
            routeId: routeId,
            progress: 0, // 0 to 100%
            payload: Math.floor(Math.random() * 500) + 100
        });
    }

    update() {
        this.ships.forEach(ship => {
            ship.progress += 2; // Move ship
            if (ship.progress >= 100) {
                // Delivery complete
                ship.progress = 0;
                const route = this.routes.find(r => r.id === ship.routeId);
                route.volume += ship.payload;
                // console.log(`📦 Delivery: ${ship.id} delivered ${ship.payload} units of ${route.resource} to ${route.target}`);
            }
        });
    }

    getManifest() {
        return this.routes.map(r => ({
            route: `${r.source} -> ${r.target}`,
            cargo: r.resource,
            totalDelivered: r.volume,
            activeShips: this.ships.filter(s => s.routeId === r.id).length
        }));
    }

    simulationLoop() {
        setInterval(() => this.update(), 1000);
    }
}

if (typeof window !== 'undefined') {
    window.SupplyChainSystem = SupplyChainSystem;
    window.supplyChainSystem = new SupplyChainSystem();
}
