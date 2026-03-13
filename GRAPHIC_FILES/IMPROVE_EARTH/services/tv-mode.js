"use strict";
/**
 * TV Mode Controller — ambient fullscreen panel cycling for the happy variant.
 * Drives visual overrides via `document.documentElement.dataset.tvMode` which
 * triggers CSS rules scoped under `[data-tv-mode]` in happy-theme.css.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TvModeController = void 0;
const TV_INTERVAL_KEY = 'tv-mode-interval';
const MIN_INTERVAL = 30000; // 30 seconds
const MAX_INTERVAL = 120000; // 2 minutes
const DEFAULT_INTERVAL = 60000; // 1 minute
function clampInterval(ms) {
    return Math.max(MIN_INTERVAL, Math.min(MAX_INTERVAL, ms));
}
class TvModeController {
    constructor(opts) {
        this.intervalId = null;
        this.currentIndex = 0;
        this.boundKeyHandler = null;
        this.panelKeys = opts.panelKeys;
        this.onPanelChange = opts.onPanelChange;
        // Read persisted interval or use provided / default
        const stored = localStorage.getItem(TV_INTERVAL_KEY);
        const parsed = stored ? parseInt(stored, 10) : NaN;
        this.intervalMs = clampInterval(Number.isFinite(parsed) ? parsed : (opts.intervalMs ?? DEFAULT_INTERVAL));
    }
    get active() {
        return !!document.documentElement.dataset.tvMode;
    }
    enter() {
        // Set data attribute — triggers all CSS overrides
        document.documentElement.dataset.tvMode = 'true';
        // Request fullscreen
        const el = document.documentElement;
        if (el.requestFullscreen) {
            try {
                void el.requestFullscreen()?.catch(() => { });
            }
            catch { /* noop */ }
        }
        else if (el.webkitRequestFullscreen) {
            try {
                el.webkitRequestFullscreen();
            }
            catch { /* noop */ }
        }
        // Show first panel
        this.currentIndex = 0;
        this.showPanel(this.currentIndex);
        // Start cycling
        this.startCycling();
        // Listen for Escape key
        this.boundKeyHandler = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                this.exit();
            }
        };
        document.addEventListener('keydown', this.boundKeyHandler);
    }
    exit() {
        // Remove data attribute
        delete document.documentElement.dataset.tvMode;
        // Exit fullscreen if active
        if (document.fullscreenElement) {
            try {
                void document.exitFullscreen()?.catch(() => { });
            }
            catch { /* noop */ }
        }
        // Stop cycling
        this.stopCycling();
        // Remove key listener
        if (this.boundKeyHandler) {
            document.removeEventListener('keydown', this.boundKeyHandler);
            this.boundKeyHandler = null;
        }
        // Restore all panels
        this.showAllPanels();
    }
    toggle() {
        if (this.active) {
            this.exit();
        }
        else {
            this.enter();
        }
    }
    setIntervalMs(ms) {
        this.intervalMs = clampInterval(ms);
        localStorage.setItem(TV_INTERVAL_KEY, String(this.intervalMs));
        // Restart cycling if active
        if (this.intervalId !== null) {
            this.stopCycling();
            this.startCycling();
        }
    }
    updatePanelKeys(keys) {
        this.panelKeys = keys;
        if (this.currentIndex >= this.panelKeys.length) {
            this.currentIndex = 0;
        }
    }
    destroy() {
        this.exit();
        this.onPanelChange = undefined;
    }
    // --- Private ---
    startCycling() {
        this.stopCycling();
        this.intervalId = setInterval(() => this.nextPanel(), this.intervalMs);
    }
    stopCycling() {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
    nextPanel() {
        this.currentIndex = (this.currentIndex + 1) % this.panelKeys.length;
        this.showPanel(this.currentIndex);
    }
    showPanel(index) {
        const panelsGrid = document.getElementById('panelsGrid');
        const mapSection = document.getElementById('mapSection');
        if (!panelsGrid)
            return;
        const allPanels = panelsGrid.querySelectorAll('.panel');
        // Index 0 = map
        if (index === 0) {
            // Show map, hide panels grid content
            if (mapSection) {
                mapSection.style.display = '';
            }
            allPanels.forEach(p => {
                p.classList.add('tv-hidden');
                p.classList.remove('tv-active');
            });
        }
        else {
            // Hide map, show specific panel
            if (mapSection) {
                mapSection.style.display = 'none';
            }
            // Panel index is offset by 1 (index 0 = map, index 1 = first panel, etc.)
            const panelIndex = index - 1;
            allPanels.forEach((p, i) => {
                if (i === panelIndex) {
                    p.classList.remove('tv-hidden');
                    p.classList.add('tv-active');
                }
                else {
                    p.classList.add('tv-hidden');
                    p.classList.remove('tv-active');
                }
            });
        }
        const key = this.panelKeys[index];
        if (key)
            this.onPanelChange?.(key);
    }
    showAllPanels() {
        const panelsGrid = document.getElementById('panelsGrid');
        const mapSection = document.getElementById('mapSection');
        if (panelsGrid) {
            panelsGrid.querySelectorAll('.panel').forEach(p => {
                p.classList.remove('tv-hidden', 'tv-active');
            });
        }
        if (mapSection) {
            mapSection.style.display = '';
        }
    }
}
exports.TvModeController = TvModeController;
