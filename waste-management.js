/**
 * Waste Management
 * Waste monitoring and management system
 */

class WasteManagement {
    constructor() {
        this.facilities = new Map();
        this.bins = new Map();
        this.readings = new Map();
        this.init();
    }

    init() {
        this.trackEvent('w_as_te_ma_na_ge_me_nt_initialized');
    }

    trackEvent(eventName, data = {}) {
        try {
            if (typeof window !== 'undefined' && window.performanceMonitoring) {
                window.performanceMonitoring.recordMetric("w_as_te_ma_na_ge_me_nt_" + eventName, 1, data);
            }
        } catch (e) { /* Silent fail */ }
    }


    createFacility(facilityId, facilityData) {
        const facility = {
            id: facilityId,
            ...facilityData,
            name: facilityData.name || facilityId,
            location: facilityData.location || '',
            bins: [],
            createdAt: new Date()
        };
        
        this.facilities.set(facilityId, facility);
        console.log(`Waste facility created: ${facilityId}`);
        return facility;
    }

    registerBin(facilityId, binId, binData) {
        const facility = this.facilities.get(facilityId);
        if (!facility) {
            throw new Error('Facility not found');
        }
        
        const bin = {
            id: binId,
            facilityId,
            ...binData,
            name: binData.name || binId,
            type: binData.type || 'general',
            capacity: binData.capacity || 100,
            currentLevel: 0,
            location: binData.location || '',
            createdAt: new Date()
        };
        
        this.bins.set(binId, bin);
        facility.bins.push(binId);
        
        return bin;
    }

    async recordLevel(binId, level, timestamp = null) {
        const bin = this.bins.get(binId);
        if (!bin) {
            throw new Error('Bin not found');
        }
        
        const reading = {
            id: `reading_${Date.now()}`,
            binId,
            facilityId: bin.facilityId,
            level,
            percentage: (level / bin.capacity) * 100,
            timestamp: timestamp || new Date(),
            createdAt: new Date()
        };
        
        this.readings.set(reading.id, reading);
        bin.currentLevel = level;
        
        if (reading.percentage > 80) {
            bin.status = 'full';
        } else if (reading.percentage > 50) {
            bin.status = 'medium';
        } else {
            bin.status = 'empty';
        }
        
        return reading;
    }

    getBinsNeedingCollection(facilityId) {
        const facility = this.facilities.get(facilityId);
        if (!facility) {
            throw new Error('Facility not found');
        }
        
        return facility.bins
            .map(binId => this.bins.get(binId))
            .filter(bin => bin && bin.status === 'full');
    }

    getFacility(facilityId) {
        return this.facilities.get(facilityId);
    }

    getBin(binId) {
        return this.bins.get(binId);
    }
}

// Auto-initialize and export
if (typeof window !== 'undefined') {
    window.wasteManagement = new WasteManagement();
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WasteManagement;
}

