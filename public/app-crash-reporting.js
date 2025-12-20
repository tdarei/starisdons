class AppCrashReporting {
  constructor() {}
  async init() {
    this.trackEvent('crash_reporting_initialized');
  }
  trackEvent(eventName, data = {}) {
    try {
      if (window.performanceMonitoring) {
        window.performanceMonitoring.recordMetric(`crash_reporting_${eventName}`, 1, data);
      }
    } catch (e) { /* Silent fail */ }
  }
}
window.AppCrashReporting = AppCrashReporting;
