/**
 * IFTTT Integration
 * Integrates with IFTTT (If This Then That) automation platform
 */

class IFTTTIntegration {
    constructor() {
        this.webhookKey = null;
        this.baseUrl = 'https://maker.ifttt.com/trigger';
        this.init();
    }

    init() {
        this.trackEvent('i_ft_tt_in_te_gr_at_io_n_initialized');
    }

    trackEvent(eventName, data = {}) {
        try {
            if (typeof window !== 'undefined' && window.performanceMonitoring) {
                window.performanceMonitoring.recordMetric("i_ft_tt_in_te_gr_at_io_n_" + eventName, 1, data);
            }
        } catch (e) { /* Silent fail */ }
    }


    configure(webhookKey) {
        this.webhookKey = webhookKey;
    }

    async triggerEvent(eventName, value1, value2, value3) {
        if (!this.webhookKey) {
            throw new Error('IFTTT webhook key not configured');
        }

        const url = `${this.baseUrl}/${eventName}/with/key/${this.webhookKey}`;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    value1,
                    value2,
                    value3
                })
            });

            if (!response.ok) {
                throw new Error(`IFTTT trigger failed: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('IFTTT trigger error:', error);
            throw error;
        }
    }
}

// Auto-initialize
const iftttIntegration = new IFTTTIntegration();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IFTTTIntegration;
}

