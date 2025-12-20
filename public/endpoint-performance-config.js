(function() {
    window.endpointPerformanceConfig = window.endpointPerformanceConfig || {
        '/api/dashboard': { maxDuration: 1500 },
        '/api/planets': { maxDuration: 1200 },
        '/api/ai': { maxDuration: 2000 },
        '/api/auth': { maxDuration: 1000 },
        default: { maxDuration: 1800 }
    };
})();
