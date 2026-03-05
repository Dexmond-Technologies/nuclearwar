"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SITE_VARIANT = void 0;
exports.SITE_VARIANT = (() => {
    const env = import.meta.env.VITE_VARIANT || 'full';
    // Build-time variant (non-full) takes priority — each deployment is variant-specific.
    // Only fall back to localStorage when env is 'full' (allows desktop app variant switching).
    if (env !== 'full')
        return env;
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('worldmonitor-variant');
        if (stored === 'tech' || stored === 'full' || stored === 'finance' || stored === 'happy')
            return stored;
    }
    return env;
})();
