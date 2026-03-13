"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeroSpotlightPanel = void 0;
const Panel_1 = require("./Panel");
const sanitize_1 = require("@/utils/sanitize");
/**
 * HeroSpotlightPanel -- Daily hero spotlight card with photo, excerpt, and map location.
 *
 * Displays a single featured story about an extraordinary person or act of kindness.
 * The hero story is set via setHeroStory() (wired by App.ts in plan 06-03).
 * If the story has lat/lon coordinates, a "Show on map" button is rendered and
 * wired to the onLocationRequest callback for map integration.
 */
class HeroSpotlightPanel extends Panel_1.Panel {
    constructor() {
        super({ id: 'spotlight', title: "Today's Hero", trackActivity: false });
        this.content.innerHTML =
            '<div class="hero-card-loading">Loading today\'s hero...</div>';
    }
    /**
     * Set the hero story to display. If undefined, shows a fallback message.
     */
    setHeroStory(item) {
        if (!item) {
            this.content.innerHTML =
                '<div class="hero-card-empty">No hero story available today</div>';
            return;
        }
        // Image section (optional)
        const imageHtml = item.imageUrl
            ? `<div class="hero-card-image"><img src="${(0, sanitize_1.sanitizeUrl)(item.imageUrl)}" alt="" loading="lazy" onerror="this.parentElement.style.display='none'"></div>`
            : '';
        // Time formatting
        const timeStr = item.pubDate.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
        // Location button -- only when BOTH lat and lon are defined
        const hasLocation = item.lat !== undefined && item.lon !== undefined;
        const locationHtml = hasLocation
            ? `<button class="hero-card-location-btn" data-lat="${item.lat}" data-lon="${item.lon}" type="button">Show on map</button>`
            : '';
        this.content.innerHTML = `<div class="hero-card">
  ${imageHtml}
  <div class="hero-card-body">
    <span class="hero-card-source">${(0, sanitize_1.escapeHtml)(item.source)}</span>
    <h3 class="hero-card-title">
      <a href="${(0, sanitize_1.sanitizeUrl)(item.link)}" target="_blank" rel="noopener">${(0, sanitize_1.escapeHtml)(item.title)}</a>
    </h3>
    <span class="hero-card-time">${(0, sanitize_1.escapeHtml)(timeStr)}</span>
    ${locationHtml}
  </div>
</div>`;
        // Wire location button click handler
        if (hasLocation) {
            const btn = this.content.querySelector('.hero-card-location-btn');
            if (btn) {
                btn.addEventListener('click', () => {
                    const lat = Number(btn.getAttribute('data-lat'));
                    const lon = Number(btn.getAttribute('data-lon'));
                    if (!isNaN(lat) && !isNaN(lon)) {
                        this.onLocationRequest?.(lat, lon);
                    }
                });
            }
        }
    }
    /**
     * Clean up callback reference and call parent destroy.
     */
    destroy() {
        this.onLocationRequest = undefined;
        super.destroy();
    }
}
exports.HeroSpotlightPanel = HeroSpotlightPanel;
