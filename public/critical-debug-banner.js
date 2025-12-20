(function () {
    var errorBox = document.createElement('div');
    errorBox.style.cssText = 'position:fixed;top:0;left:0;width:100%;background:rgba(200,0,0,0.9);color:white;z-index:999999;padding:20px;font-family:monospace;max-height:50vh;overflow:auto;display:none;font-size:14px;';
    errorBox.id = 'critical-debug-banner';
    document.documentElement.appendChild(errorBox);

    function logError(msg) {
        // Force banner to show
        errorBox.style.display = 'block';

        var p = document.createElement('div');
        p.innerText = "❌ " + msg;
        p.style.borderBottom = "1px solid rgba(255,255,255,0.2)";
        p.style.padding = "5px";
        errorBox.appendChild(p);
        console.error(msg);
    }

    window.addEventListener('error', function (e) {
        logError(e.message + ' at ' + e.filename + ':' + e.lineno);
    });

    window.addEventListener('unhandledrejection', function (e) {
        try {
            window.__criticalDebugLastRejection = e.reason;
        } catch (err) {
            window.__criticalDebugLastRejection = err;
        }

        var reason = e && e.reason;
        var message = reason ? (reason.message || reason) : reason;
        var details = 'Unhandled Rejection: ' + message;
        if (reason && reason.stack) {
            details += '\n' + reason.stack;
        }
        logError(details);
    });

    // Also log if body is hidden too long
    setTimeout(function () {
        if (document.body) {
            var style = window.getComputedStyle(document.body);
            if (style.opacity == '0' || style.visibility == 'hidden' || style.display == 'none') {
                logError('BODY IS HIDDEN! Loader clear failed. Force showing...');
                document.body.style.cssText = 'opacity:1 !important; visibility:visible !important; pointer-events:auto !important;';
                // Also force hide loader
                var loader = document.getElementById('space-loader');
                if (loader) loader.style.display = 'none';
            }
        }
    }, 4000);

    console.log('🐞 Critical Debug Banner Initialized');
})();
