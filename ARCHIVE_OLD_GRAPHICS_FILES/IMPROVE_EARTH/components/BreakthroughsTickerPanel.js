"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BreakthroughsTickerPanel = void 0;
const Panel_1 = require("./Panel");
const sanitize_1 = require("@/utils/sanitize");
/**
 * BreakthroughsTickerPanel -- Horizontally scrolling ticker of science breakthroughs.
 *
 * Displays a continuously scrolling strip of science news items. The animation
 * is driven entirely by CSS (added in plan 06-03). The JS builds the DOM with
 * doubled content for seamless infinite scroll. Hover-pause and tab-hidden
 * pause are handled by CSS (:hover rule and .animations-paused body class).
 */
class BreakthroughsTickerPanel extends Panel_1.Panel {
    constructor() {
        super({ id: 'breakthroughs', title: 'Breakthroughs', trackActivity: false });
        this.tickerTrack = null;
        this.createTickerDOM();
    }
    /**
     * Create the ticker wrapper and track elements.
     */
    createTickerDOM() {
        const wrapper = document.createElement('div');
        wrapper.className = 'breakthroughs-ticker-wrapper';
        const track = document.createElement('div');
        track.className = 'breakthroughs-ticker-track';
        wrapper.appendChild(track);
        this.tickerTrack = track;
        // Clear loading state and append the ticker
        this.content.innerHTML = '';
        this.content.appendChild(wrapper);
    }
    /**
     * Receive science news items and populate the ticker track.
     * Content is doubled for seamless infinite CSS scroll animation.
     */
    setItems(items) {
        if (!this.tickerTrack)
            return;
        if (items.length === 0) {
            this.tickerTrack.innerHTML =
                '<span class="ticker-item ticker-placeholder">No science breakthroughs yet</span>';
            return;
        }
        // Build HTML for one set of items
        const itemsHtml = items
            .map((item) => `<a class="ticker-item" href="${(0, sanitize_1.sanitizeUrl)(item.link)}" target="_blank" rel="noopener">` +
            `<span class="ticker-item-source">${(0, sanitize_1.escapeHtml)(item.source)}</span>` +
            `<span class="ticker-item-title">${(0, sanitize_1.escapeHtml)(item.title)}</span>` +
            `</a>`)
            .join('');
        // Double the content for seamless infinite scroll
        this.tickerTrack.innerHTML = itemsHtml + itemsHtml;
    }
    /**
     * Clean up animation and call parent destroy.
     */
    destroy() {
        if (this.tickerTrack) {
            this.tickerTrack.style.animationPlayState = 'paused';
            this.tickerTrack = null;
        }
        super.destroy();
    }
}
exports.BreakthroughsTickerPanel = BreakthroughsTickerPanel;
