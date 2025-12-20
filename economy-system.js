/**
 * Economy System 2.0
 * Q2 2025 Feature: Civilization & Society
 * 
 * Manages resources, industrial chains, and market trade.
 */
constructor(game) {
    this.game = game;
    this.systems = {}; // systemId -> { market: Map, orders: [] }
    this.playerResources = {
        credits: 5000,
        ore: 100,
        refined_metal: 20,
        fuel: 50,
        electronics: 10
    };
    this.resources = {
        'ore': { name: 'Raw Ore', basePrice: 10, type: 'raw' },
        'refined_metal': { name: 'Refined Metal', basePrice: 25, type: 'refined' },
        'fuel': { name: 'Liquid Fuel', basePrice: 50, type: 'fuel' },
        'electronics': { name: 'Advanced Electronics', basePrice: 150, type: 'component' }
    };
    this.init();
}

init() {
    // Initialize systems from game definitions if available
    const systemIds = this.game ? Object.keys(this.game.systemSecurity) : ['kepler_186f', 'wolf_1061c', 'trappist_1e', 'proxima_b'];

    systemIds.forEach(sid => {
        this.systems[sid] = {
            market: new Map(),
            orders: []
        };
        this.initializeSystemMarket(sid);
    });

    if (typeof window !== 'undefined') {
        console.log('🏭 Regional Economy System 3.0 Initialized');
    }
}

initializeSystemMarket(systemId) {
    const sys = this.systems[systemId];
    const secLevel = (this.game && this.game.systemSecurity[systemId]) || 0.5;

    Object.keys(this.resources).forEach(res => {
        // Highsec has stable prices, Nullsec has high volatility
        const volatility = (1 - secLevel) * 0.2;
        const priceMod = 0.8 + (Math.random() * 0.4); // Random start offset

        sys.market.set(res, {
            price: this.resources[res].basePrice * priceMod,
            demand: 1.0,
            volatility: volatility,
            trend: (Math.random() - 0.5) * 0.1
        });
    });
}

update(deltaTime) {
    // Market fluctuations for each system
    Object.keys(this.systems).forEach(systemId => {
        if (Math.random() < 0.05) {
            this.updateSystemPrices(systemId);
        }
        this.processSystemOrders(systemId);
    });
}

updateSystemPrices(systemId) {
    const sys = this.systems[systemId];
    sys.market.forEach((data, res) => {
        // Random walk influenced by volatility
        data.trend += (Math.random() - 0.5) * data.volatility;
        data.trend = Math.max(-0.3, Math.min(0.3, data.trend)); // Cap trend

        let newPrice = data.price * (1 + data.trend);
        // Clamp to reasonable limits
        const base = this.resources[res].basePrice;
        newPrice = Math.max(base * 0.4, Math.min(base * 4.0, newPrice));

        data.price = newPrice;
    });
}

processSystemOrders(systemId) {
    // Logic for filling player limit orders against market price fluctuations
    const sys = this.systems[systemId];
    sys.orders = sys.orders.filter(order => {
        const marketPrice = sys.market.get(order.resourceId).price;

        if (order.type === 'buy' && marketPrice <= order.price) {
            this.executeOrder(order, marketPrice);
            return false;
        } else if (order.type === 'sell' && marketPrice >= order.price) {
            this.executeOrder(order, marketPrice);
            return false;
        }
        return true;
    });
}

executeOrder(order, actualPrice) {
    const totalCost = actualPrice * order.amount;
    if (order.type === 'buy') {
        this.playerResources[order.resourceId] = (this.playerResources[order.resourceId] || 0) + order.amount;
        this.game.notify(`Order Filled: Bought ${order.amount} ${order.resourceId} at ${actualPrice.toFixed(1)} cr`, "success");
    } else {
        this.playerResources.credits += totalCost;
        this.game.notify(`Order Filled: Sold ${order.amount} ${order.resourceId} at ${actualPrice.toFixed(1)} cr`, "success");
    }
}

trade(action, resourceId, amount, systemId = null) {
    const sid = systemId || (this.game ? this.game.currentSystemId : 'kepler_186f');
    const sys = this.systems[sid];
    if (!sys) return { success: false, msg: 'Invalid system' };

    const marketData = sys.market.get(resourceId);
    if (!marketData) return { success: false, msg: 'Invalid resource' };

    const cost = Math.floor(marketData.price * amount);

    if (action === 'buy') {
        if (this.playerResources.credits >= cost) {
            this.playerResources.credits -= cost;
            this.playerResources[resourceId] = (this.playerResources[resourceId] || 0) + amount;
            marketData.trend += 0.02; // Buying drives price up
            return { success: true, msg: `Bought ${amount} ${this.resources[resourceId].name} for ${cost}cr in ${sid}` };
        } else {
            return { success: false, msg: 'Insufficient credits' };
        }
    } else if (action === 'sell') {
        if ((this.playerResources[resourceId] || 0) >= amount) {
            this.playerResources[resourceId] -= amount;
            this.playerResources.credits += cost;
            marketData.trend -= 0.02; // Selling drives price down
            return { success: true, msg: `Sold ${amount} ${this.resources[resourceId].name} for ${cost}cr in ${sid}` };
        } else {
            return { success: false, msg: 'Insufficient resources' };
        }
    }
}

getMarketSnapshot(systemId) {
    const sid = systemId || (this.game ? this.game.currentSystemId : 'kepler_186f');
    const sys = this.systems[sid];
    const snapshot = {};
    sys.market.forEach((data, id) => {
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
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(2, 6, 23, 0.9); z-index: 10001; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(8px);';
        document.body.appendChild(modal);
    }

    const currentSid = this.game ? this.game.currentSystemId : 'kepler_186f';
    const snapshot = this.getMarketSnapshot(currentSid);

    modal.innerHTML = `
            <div style="background: linear-gradient(135deg, #0f172a, #1e293b); border: 1px solid #334155; padding: 2.5rem; border-radius: 16px; width: 900px; max-width: 95%; color: #f8fafc; font-family: 'Orbitron', sans-serif; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); border-top: 1px solid #475569;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                    <div>
                        <h2 style="color: #60a5fa; margin: 0; font-size: 1.8rem; text-transform: uppercase; letter-spacing: 2px;">🌌 Interstellar Market</h2>
                        <div style="color: #94a3b8; font-size: 0.9rem; margin-top: 4px;">Regulated Cluster Exchange</div>
                    </div>
                    <button onclick="document.getElementById('${modalId}').remove()" style="background: rgba(255,255,255,0.05); border: 1px solid #334155; color: #94a3b8; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='#ef4444'; this.style.color='#fff'" onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.color='#94a3b8'">×</button>
                </div>
                
                <div style="display: grid; grid-template-columns: 300px 1fr; gap: 2rem;">
                    <!-- Left Sidebar -->
                    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                        <div style="padding: 1.5rem; background: rgba(30, 41, 59, 0.5); border: 1px solid #334155; border-radius: 12px;">
                            <h3 style="color: #f59e0b; margin: 0 0 1rem 0; font-size: 0.9rem; text-transform: uppercase;">Wallet & Cargo</h3>
                            <div style="font-size: 1.4rem; color: #facc15; margin-bottom: 1rem;">${Math.floor(this.playerResources.credits).toLocaleString()} <span style="font-size: 0.8rem; color: #94a3b8;">CR</span></div>
                            <div style="display: grid; gap: 0.5rem; font-size: 0.85rem;">
                                ${Object.keys(this.resources).map(res => `
                                    <div style="display: flex; justify-content: space-between;">
                                        <span style="color: #94a3b8;">${this.resources[res].name}</span>
                                        <span style="color: #e2e8f0; font-weight: bold;">${this.playerResources[res] || 0}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div style="padding: 1.5rem; background: rgba(30, 41, 59, 0.5); border: 1px solid #334155; border-radius: 12px;">
                            <h3 style="color: #3b82f6; margin: 0 0 1rem 0; font-size: 0.9rem; text-transform: uppercase;">Regional Hubs</h3>
                            <div style="display: grid; gap: 0.5rem;">
                                ${Object.keys(this.systems).map(sid => `
                                    <button onclick="window.game.currentSystemId='${sid}'; window.economySystem.showMarketUI()" 
                                            style="text-align: left; padding: 0.75rem; background: ${sid === currentSid ? 'rgba(59, 130, 246, 0.2)' : 'transparent'}; 
                                            border: 1px solid ${sid === currentSid ? '#3b82f6' : '#334155'}; color: ${sid === currentSid ? '#fff' : '#94a3b8'}; 
                                            border-radius: 6px; cursor: pointer; font-size: 0.8rem; transition: 0.2s;">
                                        ${sid.replace('_', ' ').toUpperCase()}
                                        ${sid === currentSid ? ' <span style="color:#60a5fa; float:right;">📍</span>' : ''}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Marketplace Main -->
                    <div style="background: rgba(15, 23, 42, 0.5); border: 1px solid #334155; border-radius: 12px; display: flex; flex-direction: column;">
                        <div style="padding: 1rem 1.5rem; border-bottom: 1px solid #334155; background: rgba(30, 41, 59, 0.3); font-size: 0.8rem; color: #94a3b8; display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; align-items: center;">
                            <div>COMMODITY</div>
                            <div style="text-align: right;">PRICE (CR)</div>
                            <div style="text-align: right;">TREND</div>
                            <div style="text-align: center;">ACTIONS</div>
                        </div>
                        <div style="flex: 1; max-height: 400px; overflow-y: auto; padding: 0.5rem;">
                            ${this.renderMarketRows(snapshot)}
                        </div>
                    </div>
                </div>
            </div>
        `;
}

renderMarketRows(snapshot) {
    return Object.entries(snapshot).map(([id, data]) => `
            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; align-items: center; padding: 1rem 1rem; border-bottom: 1px solid #1e293b; transition: 0.2s; border-radius: 8px;" onmouseover="this.style.background='rgba(51, 65, 85, 0.3)'" onmouseout="this.style.background='transparent'">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 8px; height: 8px; border-radius: 50%; background: ${data.type === 'raw' ? '#94a3b8' : data.type === 'fuel' ? '#f59e0b' : '#3b82f6'}; box-shadow: 0 0 10px currentColor;"></div>
                    <div>
                        <div style="font-weight: bold; color: #f1f5f9; font-size: 0.95rem;">${data.name}</div>
                        <div style="font-size: 0.7rem; color: #64748b; text-transform: uppercase;">${data.type}</div>
                    </div>
                </div>
                <div style="text-align: right; color: #facc15; font-weight: bold;">${data.price.toFixed(1)}</div>
                <div style="text-align: right; color: ${data.trend > 0 ? '#4ade80' : '#ef4444'}; font-size: 0.85rem;">
                    ${data.trend > 0 ? '▲' : '▼'} ${Math.abs(data.trend * 100).toFixed(1)}%
                </div>
                <div style="display: flex; gap: 0.5rem; justify-content: center;">
                    <button onclick="window.economySystem.performTrade('buy', '${id}', 10); window.economySystem.showMarketUI()" 
                            style="background: #065f46; border: 1px solid #10b981; color: #34d399; padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer; font-family: 'Orbitron'; font-size: 0.75rem; transition: 0.2s;"
                            onmouseover="this.style.background='#064e3b';">BUY</button>
                    <button onclick="window.economySystem.performTrade('sell', '${id}', 10); window.economySystem.showMarketUI()" 
                            style="background: #7f1d1d; border: 1px solid #ef4444; color: #f87171; padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer; font-family: 'Orbitron'; font-size: 0.75rem; transition: 0.2s;"
                            onmouseover="this.style.background='#991b1b';">SELL</button>
                </div>
            </div>
        `).join('');
}

performTrade(action, id, amount) {
    const result = this.trade(action, id, amount);
    if (result.msg) {
        this.game.notify(result.msg, result.success ? 'success' : 'error');
    }
}

}

// Export
if (typeof window !== 'undefined') {
    window.EconomySystem = EconomySystem;
    // Auto-instantiate if game exists, otherwise wait
    if (window.game) {
        window.economySystem = new EconomySystem(window.game);
        window.game.economy = window.economySystem;
    }
}
