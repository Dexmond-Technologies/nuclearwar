"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeoHubsPanel = void 0;
const Panel_1 = require("./Panel");
const sanitize_1 = require("@/utils/sanitize");
const i18n_1 = require("@/services/i18n");
const utils_1 = require("@/utils");
const COUNTRY_FLAGS = {
    'USA': '🇺🇸', 'Russia': '🇷🇺', 'China': '🇨🇳', 'UK': '🇬🇧', 'Belgium': '🇧🇪',
    'Israel': '🇮🇱', 'Iran': '🇮🇷', 'Ukraine': '🇺🇦', 'Taiwan': '🇹🇼', 'Japan': '🇯🇵',
    'South Korea': '🇰🇷', 'North Korea': '🇰🇵', 'India': '🇮🇳', 'Saudi Arabia': '🇸🇦',
    'Turkey': '🇹🇷', 'France': '🇫🇷', 'Germany': '🇩🇪', 'Egypt': '🇪🇬', 'Pakistan': '🇵🇰',
    'Palestine': '🇵🇸', 'Yemen': '🇾🇪', 'Syria': '🇸🇾', 'Lebanon': '🇱🇧',
    'Sudan': '🇸🇩', 'Ethiopia': '🇪🇹', 'Myanmar': '🇲🇲', 'Austria': '🇦🇹',
    'International': '🌐',
};
const TYPE_ICONS = {
    capital: '🏛️',
    conflict: '⚔️',
    strategic: '⚓',
    organization: '🏢',
};
const TYPE_LABELS = {
    capital: 'Capital',
    conflict: 'Conflict Zone',
    strategic: 'Strategic',
    organization: 'Organization',
};
class GeoHubsPanel extends Panel_1.Panel {
    constructor() {
        super({
            id: 'geo-hubs',
            title: (0, i18n_1.t)('panels.geoHubs'),
            showCount: true,
            infoTooltip: (0, i18n_1.t)('components.geoHubs.infoTooltip', {
                highColor: (0, utils_1.getCSSColor)('--semantic-critical'),
                elevatedColor: (0, utils_1.getCSSColor)('--semantic-high'),
                lowColor: (0, utils_1.getCSSColor)('--text-dim'),
            }),
        });
        this.activities = [];
    }
    setOnHubClick(handler) {
        this.onHubClick = handler;
    }
    setActivities(activities) {
        this.activities = activities.slice(0, 10);
        this.setCount(this.activities.length);
        this.render();
    }
    getFlag(country) {
        return COUNTRY_FLAGS[country] || '🌐';
    }
    getTypeIcon(type) {
        return TYPE_ICONS[type] || '📍';
    }
    getTypeLabel(type) {
        return TYPE_LABELS[type] || type;
    }
    render() {
        if (this.activities.length === 0) {
            this.showError((0, i18n_1.t)('common.noActiveGeoHubs'));
            return;
        }
        const html = this.activities.map((hub, index) => {
            const trendIcon = hub.trend === 'rising' ? '↑' : hub.trend === 'falling' ? '↓' : '';
            const breakingTag = hub.hasBreaking ? '<span class="hub-breaking geo">ALERT</span>' : '';
            const topStory = hub.topStories[0];
            return `
        <div class="geo-hub-item ${hub.activityLevel}" data-hub-id="${(0, sanitize_1.escapeHtml)(hub.hubId)}" data-index="${index}">
          <div class="hub-rank">${index + 1}</div>
          <span class="geo-hub-indicator ${hub.activityLevel}"></span>
          <div class="hub-info">
            <div class="hub-header">
              <span class="hub-name">${(0, sanitize_1.escapeHtml)(hub.name)}</span>
              <span class="hub-flag">${this.getFlag(hub.country)}</span>
              ${breakingTag}
            </div>
            <div class="hub-meta">
              <span class="hub-news-count">${hub.newsCount} ${hub.newsCount === 1 ? (0, i18n_1.t)('components.geoHubs.story') : (0, i18n_1.t)('components.geoHubs.stories')}</span>
              ${trendIcon ? `<span class="hub-trend ${hub.trend}">${trendIcon}</span>` : ''}
              <span class="geo-hub-type">${this.getTypeIcon(hub.type)} ${this.getTypeLabel(hub.type)}</span>
            </div>
          </div>
          <div class="hub-score geo">${Math.round(hub.score)}</div>
        </div>
        ${topStory ? `
          <a class="hub-top-story geo" href="${(0, sanitize_1.sanitizeUrl)(topStory.link)}" target="_blank" rel="noopener" data-hub-id="${(0, sanitize_1.escapeHtml)(hub.hubId)}">
            ${(0, sanitize_1.escapeHtml)(topStory.title.length > 80 ? topStory.title.slice(0, 77) + '...' : topStory.title)}
          </a>
        ` : ''}
      `;
        }).join('');
        this.setContent(html);
        this.bindEvents();
    }
    bindEvents() {
        const items = this.content.querySelectorAll('.geo-hub-item');
        items.forEach((item) => {
            item.addEventListener('click', () => {
                const hubId = item.dataset.hubId;
                const hub = this.activities.find(a => a.hubId === hubId);
                if (hub && this.onHubClick) {
                    this.onHubClick(hub);
                }
            });
        });
    }
}
exports.GeoHubsPanel = GeoHubsPanel;
