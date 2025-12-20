/**
 * Planet Trading Marketplace
 * Marketplace for buying, selling, and trading planet claims
 * 
 * Features:
 * - Listing creation
 * - Search and filters
 * - Bidding system
 * - Transaction history
 * - Escrow system
 */

class PlanetTradingMarketplace {
    constructor() {
        if (typeof window !== 'undefined') {
            if (window.planetMarketplace) {
                window.planetTradingMarketplace = window.planetMarketplace;
                return window.planetMarketplace;
            }
            window.planetMarketplace = this;
            window.planetTradingMarketplace = this;
        }

        this.listings = [];
        this.bids = [];
        this.transactions = [];
        this._initPromise = null;
        this.init();
    }

    async init() {
        if (this._initPromise) return this._initPromise;

        this._initPromise = (async () => {
            await this.loadListings();
            this.createUI();
            console.log('🛒 Planet Trading Marketplace initialized');
        })();

        return this._initPromise;
    }

    trackEvent(eventName, data = {}) {
        try {
            if (typeof window !== 'undefined' && window.performanceMonitoring) {
                window.performanceMonitoring.recordMetric("p_la_ne_tt_ra_di_ng_ma_rk_et_pl_ac_e_" + eventName, 1, data);
            }
        } catch (e) { /* Silent fail */ }
    }

    escapeHtml(value) {
        try {
            const div = document.createElement('div');
            div.textContent = value == null ? '' : String(value);
            return div.innerHTML;
        } catch (_e) {
            return value == null ? '' : String(value);
        }
    }

    async loadListings() {
        try {
            if (window.supabase) {
                const { data, error } = await window.supabase
                    .from('marketplace_listings')
                    .select('*')
                    .eq('status', 'active')
                    .order('created_at', { ascending: false });

                if (data && !error) {
                    this.listings = data;
                }
            }
        } catch (e) {
            console.warn('Failed to load listings:', e);
        }
    }

    createUI() {
        const existingButtons = document.querySelectorAll('#marketplace-toggle');
        let button = existingButtons[0] || document.getElementById('marketplace-toggle');

        if (!button) {
            button = document.createElement('button');
            button.id = 'marketplace-toggle';
            document.body.appendChild(button);
        }

        if (existingButtons && existingButtons.length > 1) {
            existingButtons.forEach((btn, index) => {
                if (index > 0) btn.remove();
            });
        }

        button.textContent = '🛒 Marketplace';
        button.style.cssText = `
            position: fixed;
            bottom: 380px;
            right: 20px;
            padding: 12px 20px;
            background: rgba(186, 148, 79, 0.9);
            border: 2px solid rgba(186, 148, 79, 1);
            color: white;
            border-radius: 8px;
            cursor: pointer;
            z-index: 9995;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        `;

        button.onclick = () => this.showMarketplace();
    }

    showMarketplace() {
        const existingModal = document.querySelector('.marketplace-modal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.className = 'marketplace-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            overflow-y: auto;
        `;

        modal.innerHTML = `
            <div style="
                background: rgba(0, 0, 0, 0.98);
                border: 2px solid #ba944f;
                border-radius: 12px;
                padding: 30px;
                max-width: 1200px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                color: white;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="color: #ba944f; margin: 0;">Planet Trading Marketplace</h2>
                    <button id="close-marketplace" style="
                        background: rgba(255, 255, 255, 0.1);
                        border: 1px solid rgba(255, 255, 255, 0.3);
                        color: white;
                        padding: 8px 15px;
                        border-radius: 6px;
                        cursor: pointer;
                    ">Close</button>
                </div>
                <div style="margin-bottom: 20px;">
                    <input type="text" id="marketplace-search" placeholder="Search planets..." style="
                        width: 100%;
                        padding: 10px;
                        background: rgba(255, 255, 255, 0.1);
                        border: 1px solid rgba(255, 255, 255, 0.3);
                        border-radius: 6px;
                        color: white;
                    ">
                </div>
                <div id="marketplace-listings" style="display: grid; gap: 20px; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));">
                    ${this.renderListings()}
                </div>
            </div>
        `;

        modal.querySelector('#close-marketplace').addEventListener('click', () => {
            modal.remove();
        });

        document.body.appendChild(modal);
    }

    renderListings() {
        if (this.listings.length === 0) {
            return '<p>No listings available</p>';
        }

        return this.listings.map((listing) => {
            const planetData = listing.planet_data || listing.planetData || {};
            const name = planetData.pl_name || planetData.kepoi_name || planetData.kepler_name || (listing.kepid ? `KEPID ${listing.kepid}` : 'Unknown');
            const safeName = this.escapeHtml(name);
            const listingType = (listing.listing_type || listing.listingType || '').toString().toLowerCase();
            const safeType = this.escapeHtml(listingType || 'sell');
            const currency = listing.currency || 'USD';
            const safeCurrency = this.escapeHtml(currency);
            const parsedPrice = listing.price == null ? null : Number(listing.price);
            const safePrice = parsedPrice == null || Number.isNaN(parsedPrice) ? '' : this.escapeHtml(parsedPrice.toFixed(2));
            const safeDescription = this.escapeHtml(listing.trade_description || listing.description || '');

            return `
                <div style="
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(186, 148, 79, 0.3);
                    border-radius: 8px;
                    padding: 15px;
                ">
                    <h3 style="color: #ba944f; margin: 0 0 10px 0;">${safeName}</h3>
                    <p style="margin: 5px 0;">Type: ${safeType}</p>
                    ${listingType === 'trade' ? `
                        <p style="margin: 5px 0; font-size: 0.9rem; color: #ccc;">${safeDescription}</p>
                    ` : `
                        <p style="margin: 5px 0;">Price: $${safePrice} ${safeCurrency}</p>
                    `}
                    <button onclick="window.planetTradingMarketplace.viewListing('${listing.id}')" style="
                        width: 100%;
                        margin-top: 10px;
                        padding: 8px;
                        background: rgba(186, 148, 79, 0.3);
                        border: 1px solid #ba944f;
                        color: white;
                        border-radius: 6px;
                        cursor: pointer;
                    ">View Details</button>
                </div>
            `;
        }).join('');
    }

    viewListing(listingId) {
        const listing = this.listings.find(l => l.id === listingId);
        if (!listing) {
            alert('Listing not found');
            return;
        }

        const existing = document.querySelector('.marketplace-listing-modal');
        if (existing) existing.remove();

        const planetData = listing.planet_data || listing.planetData || {};
        const name = planetData.pl_name || planetData.kepoi_name || planetData.kepler_name || (listing.kepid ? `KEPID ${listing.kepid}` : 'Unknown');
        const listingType = (listing.listing_type || listing.listingType || '').toString().toLowerCase();
        const currency = listing.currency || 'USD';
        const parsedPrice = listing.price == null ? null : Number(listing.price);

        const modal = document.createElement('div');
        modal.className = 'marketplace-listing-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
            padding: 20px;
        `;

        modal.innerHTML = `
            <div style="
                background: rgba(0, 0, 0, 0.98);
                border: 2px solid #ba944f;
                border-radius: 12px;
                padding: 20px;
                max-width: 720px;
                width: 100%;
                color: white;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
                    <h3 style="margin: 0; color: #ba944f;">${this.escapeHtml(name)}</h3>
                    <button id="close-listing-details" style="
                        background: rgba(255, 255, 255, 0.1);
                        border: 1px solid rgba(255, 255, 255, 0.3);
                        color: white;
                        padding: 8px 12px;
                        border-radius: 6px;
                        cursor: pointer;
                    ">Close</button>
                </div>
                <div style="margin-top: 12px;">
                    <p style="margin: 6px 0;"><strong>Type:</strong> ${this.escapeHtml(listingType || 'sell')}</p>
                    ${listingType === 'trade' ? `
                        <p style="margin: 6px 0;"><strong>Trade:</strong> ${this.escapeHtml(listing.trade_description || '')}</p>
                    ` : `
                        <p style="margin: 6px 0;"><strong>Price:</strong> $${parsedPrice == null || Number.isNaN(parsedPrice) ? '' : parsedPrice.toFixed(2)} ${this.escapeHtml(currency)}</p>
                    `}
                    <p style="margin: 6px 0;"><strong>Seller:</strong> ${this.escapeHtml(listing.seller_username || '')}</p>
                    <p style="margin: 6px 0;"><strong>KEPID:</strong> ${this.escapeHtml(listing.kepid || '')}</p>
                </div>
            </div>
        `;

        modal.querySelector('#close-listing-details')?.addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        document.body.appendChild(modal);
    }

    /**
     * Render the full marketplace UI into a container
     * @param {HTMLElement} container - Container element to render into
     */
    async renderMarketplace(container) {
        if (!container) return;

        // Add search bar
        const searchContainer = document.createElement('div');
        searchContainer.style.marginBottom = '20px';
        searchContainer.innerHTML = `
            <input type="text" id="marketplace-page-search" placeholder="Search planets..." style="
                width: 100%;
                padding: 12px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(186, 148, 79, 0.3);
                border-radius: 8px;
                color: white;
                font-family: inherit;
            ">
        `;
        container.innerHTML = ''; // Clear container
        container.appendChild(searchContainer);

        // Render listings grid
        const grid = document.createElement('div');
        grid.id = 'marketplace-page-listings';
        grid.style.cssText = 'display: grid; gap: 20px; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));';
        grid.innerHTML = this.renderListings();
        container.appendChild(grid);

        // Add event listeners
        const searchInput = document.getElementById('marketplace-page-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                // Filter listings (simple client-side filter for now)
                const items = grid.children;
                Array.from(items).forEach(item => {
                    const text = item.textContent.toLowerCase();
                    item.style.display = text.includes(term) ? 'block' : 'none';
                });
            });
        }
    }

    async createListing(planetId, price, description) {
        try {
            if (!window.supabase) return false;

            const { data: { user }, error: userError } = await window.supabase.auth.getUser();
            if (userError) throw userError;
            if (!user) {
                alert('Please login to create a listing');
                return false;
            }

            const isUuid = typeof planetId === 'string' &&
                /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(planetId);

            let claim = null;
            if (isUuid) {
                const { data: claimData, error: claimError } = await window.supabase
                    .from('planet_claims')
                    .select('id, kepid, planet_data, user_id, status')
                    .eq('id', planetId)
                    .single();
                if (claimError) throw claimError;
                claim = claimData;
            } else {
                const kepid = Number(planetId);
                if (!Number.isNaN(kepid)) {
                    const { data: claimData, error: claimError } = await window.supabase
                        .from('planet_claims')
                        .select('id, kepid, planet_data, user_id, status')
                        .eq('kepid', kepid)
                        .eq('user_id', user.id)
                        .eq('status', 'active')
                        .single();
                    if (claimError) throw claimError;
                    claim = claimData;
                }
            }

            if (!claim) {
                alert('Planet claim not found');
                return false;
            }

            if (claim.user_id && claim.user_id !== user.id) {
                alert('You can only list your own claimed planets');
                return false;
            }

            const parsedPrice = price == null ? null : Number(price);
            const { error } = await window.supabase
                .from('marketplace_listings')
                .insert({
                    seller_id: user.id,
                    seller_username: user.user_metadata?.username || user.email,
                    claim_id: claim.id,
                    kepid: claim.kepid,
                    planet_data: claim.planet_data,
                    listing_type: 'sell',
                    price: parsedPrice,
                    currency: 'USD',
                    trade_description: description || null,
                    status: 'active'
                });

            if (error) throw error;

            await this.loadListings();
            return true;
        } catch (e) {
            console.error('Failed to create listing:', e);
            alert('Failed to create listing: ' + (e?.message || e));
        }
        return false;
    }
}

if (typeof window !== 'undefined') {
    window.PlanetTradingMarketplace = PlanetTradingMarketplace;
}

