class AppAnalytics {
  constructor() {}
  async init() {
    this.trackEvent('app_analytics_initialized');
  }
  trackEvent(eventName, data = {}) {
    try {
      if (window.performanceMonitoring) {
        window.performanceMonitoring.recordMetric(`app_analytics_${eventName}`, 1, data);
      }
    } catch (e) { /* Silent fail */ }
  }
}
window.AppAnalytics = AppAnalytics;
