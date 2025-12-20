/**
 * Economy System 2.0
 * Q2 2025 Feature: Civilization & Society
 * 
 * Manages resources, industrial chains, and market trade.
 */
class EconomySystem {
    constructor() {
        this.market = new Map(); // key: resourceId, value: { price, demand }
        this.playerResources = {
            credits: 5000,
            ore: 0,
            refined_metal: 0,
            fuel: 0,
            electronics: 0
        };
        this.resources = {
            'ore': { name: 'Raw Ore', basePrice: 10, type: 'raw' },
            'refined_metal': { name: 'Refined Metal', basePrice: 25, type: 'refined' },
            'fuel': { name: 'Liquid Fuel', basePrice: 50, type: 'fuel' },
            'electronics': { name: 'Advanced Electronics', basePrice: 150, type: 'component' }
        };
        this.industrialChains = {
            'refining': { input: { 'ore': 2 }, output: { 'refined_metal': 1 }, duration: 5000 },
            'manufacturing': { input: { 'refined_metal': 2, 'fuel': 1 }, output: { 'electronics': 1 }, duration: 10000 }
        };
        this.init();
    }

    init() {
        this.initializeMarket();
        if (typeof window !== 'undefined') {
            console.log('🏭 Economy System 2.0 Initialized');
        }
    }

    initializeMarket() {
        Object.keys(this.resources).forEach(res => {
            this.market.set(res, {
                price: this.resources[res].basePrice,
                demand: 1.0,
                trend: (Math.random() - 0.5) * 0.1
            });
        });
    }

    update(deltaTime) {
        // Market fluctuations
        if (Math.random() < 0.05) {
            this.updatePrices();
        }
    }

    updatePrices() {
        this.market.forEach((data, res) => {
            // Random walk
            data.trend += (Math.random() - 0.5) * 0.05;
            data.trend = Math.max(-0.2, Math.min(0.2, data.trend)); // Cap trend

            let newPrice = data.price * (1 + data.trend);
            // Clamp to reasonable limits
            const base = this.resources[res].basePrice;
            newPrice = Math.max(base * 0.5, Math.min(base * 3.0, newPrice));

            data.price = newPrice;
        });
    }

    trade(action, resourceId, amount) {
        const marketData = this.market.get(resourceId);
        if (!marketData) return { success: false, msg: 'Invalid resource' };

        const cost = Math.floor(marketData.price * amount);

        if (action === 'buy') {
            if (this.playerResources.credits >= cost) {
                this.playerResources.credits -= cost;
                this.playerResources[resourceId] = (this.playerResources[resourceId] || 0) + amount;

                // Buying increases demand/price
                marketData.trend += 0.01;
                return { success: true, msg: `Bought ${amount} ${this.resources[resourceId].name} for ${cost}cr` };
            } else {
                return { success: false, msg: 'Insufficient credits' };
            }
        } else if (action === 'sell') {
            if ((this.playerResources[resourceId] || 0) >= amount) {
                this.playerResources[resourceId] -= amount;
                this.playerResources.credits += cost;

                // Selling decreases demand/price
                marketData.trend -= 0.01;
                return { success: true, msg: `Sold ${amount} ${this.resources[resourceId].name} for ${cost}cr` };
            } else {
                return { success: false, msg: 'Insufficient resources' };
            }
        }
    }

    getMarketSnapshot() {
        const snapshot = {};
        this.market.forEach((data, id) => {
            snapshot[id] = { ...this.resources[id], ...data };
        });
        return snapshot;
    }

    // UI Helpers
    showMarketUI() {
        const modalId = 'economy-modal';
        let modal = document.getElementById(modalId);

        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 10001; display: flex; justify-content: center; align-items: center;';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div style="background: rgba(10, 25, 30, 0.95); border: 2px solid #10b981; padding: 2rem; border-radius: 12px; width: 800px; max-width: 90%; color: #eee; font-family: 'Raleway', sans-serif;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                    <h2 style="color: #10b981; margin: 0;">🏭 Galactic Market & Industry</h2>
                    <button onclick="document.getElementById('${modalId}').remove()" style="background: transparent; border: none; color: #888; font-size: 1.5rem; cursor: pointer;">×</button>
                </div>
                
                <div style="display: flex; gap: 2rem; margin-bottom: 2rem;">
                    <div style="flex: 1; padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 8px;">
                        <h3 style="color: #ba944f; border-bottom: 1px solid #444; padding-bottom: 0.5rem;">Player Assets</h3>
                        <div>Credits: <strong style="color: #ba944f;">${Math.floor(this.playerResources.credits).toLocaleString()}</strong> cr</div>
                        ${Object.keys(this.resources).map(res => `<div>${this.resources[res].name}: <strong>${this.playerResources[res] || 0}</strong></div>`).join('')}
                    </div>
                    
                    <div style="flex: 2;">
                        <h3 style="color: #10b981; border-bottom: 1px solid #444; padding-bottom: 0.5rem;">Marketplace</h3>
                        <div style="max-height: 300px; overflow-y: auto;">
                            ${this.renderMarketRows()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderMarketRows() {
        const snapshot = this.getMarketSnapshot();
        return Object.entries(snapshot).map(([id, data]) => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: rgba(0,0,0,0.3); margin-bottom: 0.5rem; border-radius: 4px;">
                <div style="flex: 1;">
                    <div style="font-weight: bold;">${data.name}</div>
                    <div style="font-size: 0.8rem; opacity: 0.7;">${data.type.toUpperCase()}</div>
                </div>
                <div style="flex: 1; text-align: right; margin-right: 1rem;">
                    <div style="color: ${data.trend > 0 ? '#10b981' : '#ef4444'};">${data.price.toFixed(1)} cr</div>
                    <div style="font-size: 0.8rem; opacity: 0.7;">Trend: ${(data.trend * 100).toFixed(1)}%</div>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button onclick="window.economySystem.performTrade('buy', '${id}', 10); window.economySystem.showMarketUI()" style="background: #10b981; border: none; color: black; padding: 0.25rem 0.75rem; border-radius: 4px; cursor: pointer; font-weight: bold;">Buy 10</button>
                    <button onclick="window.economySystem.performTrade('sell', '${id}', 10); window.economySystem.showMarketUI()" style="background: #ef4444; border: none; color: white; padding: 0.25rem 0.75rem; border-radius: 4px; cursor: pointer; font-weight: bold;">Sell 10</button>
                </div>
            </div>
        `).join('');
    }

    performTrade(action, id, amount) {
        const result = this.trade(action, id, amount);
        if (result.msg) {
            // Use governance notify if available for consistency
            if (window.colonyGovernanceSystem) {
                window.colonyGovernanceSystem.notify(result.msg, result.success ? 'success' : 'error');
            } else {
                alert(result.msg);
            }
        }
    }
}

// Export
if (typeof window !== 'undefined') {
    window.EconomySystem = EconomySystem;
}
