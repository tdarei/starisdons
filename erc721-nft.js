/**
 * ERC-721 NFT
 * ERC-721 non-fungible token standard implementation
 */

class ERC721NFT {
    constructor() {
        this.collections = new Map();
        this.tokens = new Map();
        this.transfers = new Map();
        this.init();
    }

    init() {
        this.trackEvent('e_rc721n_ft_initialized');
    }

    trackEvent(eventName, data = {}) {
        try {
            if (typeof window !== 'undefined' && window.performanceMonitoring) {
                window.performanceMonitoring.recordMetric("e_rc721n_ft_" + eventName, 1, data);
            }
        } catch (e) { /* Silent fail */ }
    }


    deployCollection(collectionId, collectionData) {
        const collection = {
            id: collectionId,
            ...collectionData,
            name: collectionData.name || collectionId,
            symbol: collectionData.symbol || 'NFT',
            address: collectionData.address || this.generateAddress(),
            tokens: [],
            createdAt: new Date()
        };
        
        this.collections.set(collectionId, collection);
        console.log(`ERC-721 collection deployed: ${collectionId}`);
        return collection;
    }

    async mint(collectionId, tokenId, to, metadata) {
        const collection = this.collections.get(collectionId);
        if (!collection) {
            throw new Error('Collection not found');
        }
        
        const token = {
            id: `token_${Date.now()}`,
            collectionId,
            tokenId,
            owner: to,
            metadata: metadata || {},
            uri: metadata.uri || '',
            mintedAt: new Date(),
            createdAt: new Date()
        };
        
        this.tokens.set(token.id, token);
        collection.tokens.push(token.id);
        
        return token;
    }

    async transferFrom(collectionId, from, to, tokenId) {
        const collection = this.collections.get(collectionId);
        if (!collection) {
            throw new Error('Collection not found');
        }
        
        const token = Array.from(this.tokens.values())
            .find(t => t.collectionId === collectionId && t.tokenId === tokenId);
        
        if (!token) {
            throw new Error('Token not found');
        }
        
        if (token.owner !== from) {
            throw new Error('Not the owner');
        }
        
        const transfer = {
            id: `transfer_${Date.now()}`,
            collectionId,
            tokenId,
            from,
            to,
            timestamp: new Date(),
            createdAt: new Date()
        };
        
        this.transfers.set(transfer.id, transfer);
        token.owner = to;
        token.transferredAt = new Date();
        
        return { transfer, token };
    }

    ownerOf(collectionId, tokenId) {
        const token = Array.from(this.tokens.values())
            .find(t => t.collectionId === collectionId && t.tokenId === tokenId);
        
        return token ? token.owner : null;
    }

    generateAddress() {
        return '0x' + Array.from({ length: 40 }, () => 
            Math.floor(Math.random() * 16).toString(16)
        ).join('');
    }

    getCollection(collectionId) {
        return this.collections.get(collectionId);
    }
}

// Auto-initialize and export
if (typeof window !== 'undefined') {
    window.erc721Nft = new ERC721NFT();
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ERC721NFT;
}


