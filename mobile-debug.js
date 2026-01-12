// Simple on-screen console for mobile debugging
// Add this script to index.html temporarily to see console logs on mobile

(function() {
    const debugDiv = document.createElement('div');
    debugDiv.id = 'mobile-debug';
    debugDiv.style.cssText = `
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        max-height: 200px;
        overflow-y: auto;
        background: rgba(0, 0, 0, 0.9);
        color: #0f0;
        font-family: monospace;
        font-size: 11px;
        padding: 10px;
        z-index: 99999;
        border-top: 2px solid #0f0;
    `;
    document.body.appendChild(debugDiv);

    function log(type, ...args) {
        const line = document.createElement('div');
        line.style.cssText = `
            margin: 2px 0;
            padding: 2px 4px;
            border-left: 3px solid ${type === 'error' ? '#f00' : type === 'warn' ? '#ff0' : '#0f0'};
        `;
        line.textContent = `[${type}] ${args.map(a =>
            typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)
        ).join(' ')}`;
        debugDiv.appendChild(line);
        debugDiv.scrollTop = debugDiv.scrollHeight;
    }

    // Override console methods
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = function(...args) {
        log('log', ...args);
        originalLog.apply(console, args);
    };

    console.error = function(...args) {
        log('error', ...args);
        originalError.apply(console, args);
    };

    console.warn = function(...args) {
        log('warn', ...args);
        originalWarn.apply(console, args);
    };

    // Capture uncaught errors
    window.addEventListener('error', (event) => {
        log('error', 'Uncaught:', event.message, 'at', event.filename, event.lineno);
    });

    window.addEventListener('unhandledrejection', (event) => {
        log('error', 'Unhandled promise rejection:', event.reason);
    });

    log('log', 'Mobile debug console ready');
})();
