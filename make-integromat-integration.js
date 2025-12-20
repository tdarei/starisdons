/**
 * Make (Integromat) Integration
 * Integrates with Make (formerly Integromat) automation platform
 */

class MakeIntegromatIntegration {
    constructor() {
        this.webhookUrl = null;
        this.apiKey = null;
        this.init();
    }

    init() {
        console.log('Make (Integromat) Integration initialized');
    }

    trackEvent(eventName, data = {}) {
        try {
            if (typeof window !== 'undefined' && window.performanceMonitoring) {
                window.performanceMonitoring.recordMetric("m_ak_ei_nt_eg_ro_ma_ti_nt_eg_ra_ti_on_" + eventName, 1, data);
            }
        } catch (e) { /* Silent fail */ }
    }


    configure(apiKey, webhookUrl) {
        this.apiKey = apiKey;
        this.webhookUrl = webhookUrl;
    }

    async triggerScenario(data) {
        if (!this.webhookUrl) {
            throw new Error('Make webhook URL not configured');
        }

        const response = await fetch(this.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        return await response.json();
    }
}

// Auto-initialize
const makeIntegration = new MakeIntegromatIntegration();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MakeIntegromatIntegration;
}

