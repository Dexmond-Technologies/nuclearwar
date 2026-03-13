"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TechHubsPanel = void 0;
const Panel_1 = require("./Panel");
const i18n_1 = require("@/services/i18n");
const sanitize_1 = require("@/utils/sanitize");
const utils_1 = require("@/utils");
const COUNTRY_FLAGS = {
    'USA': '🇺🇸', 'United States': '🇺🇸',
    'UK': '🇬🇧', 'United Kingdom': '🇬🇧',
    'China': '🇨🇳',
    'India': '🇮🇳',
    'Israel': '🇮🇱',
    'Germany': '🇩🇪',
    'France': '🇫🇷',
    'Canada': '🇨🇦',
    'Japan': '🇯🇵',
    'South Korea': '🇰🇷',
    'Singapore': '🇸🇬',
    'Australia': '🇦🇺',
    'Netherlands': '🇳🇱',
    'Sweden': '🇸🇪',
    'Switzerland': '🇨🇭',
    'Brazil': '🇧🇷',
    'Indonesia': '🇮🇩',
    'UAE': '🇦🇪',
    'Estonia': '🇪🇪',
    'Ireland': '🇮🇪',
    'Finland': '🇫🇮',
    'Spain': '🇪🇸',
    'Italy': '🇮🇹',
    'Poland': '🇵🇱',
    'Mexico': '🇲🇽',
    'Argentina': '🇦🇷',
    'Chile': '🇨🇱',
    'Colombia': '🇨🇴',
    'Nigeria': '🇳🇬',
    'Kenya': '🇰🇪',
    'South Africa': '🇿🇦',
    'Egypt': '🇪🇬',
    'Taiwan': '🇹🇼',
    'Vietnam': '🇻🇳',
    'Thailand': '🇹🇭',
    'Malaysia': '🇲🇾',
    'Philippines': '🇵🇭',
    'New Zealand': '🇳🇿',
    'Austria': '🇦🇹',
    'Belgium': '🇧🇪',
    'Denmark': '🇩🇰',
    'Norway': '🇳🇴',
    'Portugal': '🇵🇹',
    'Czech Republic': '🇨🇿',
    'Romania': '🇷🇴',
    'Ukraine': '🇺🇦',
    'Russia': '🇷🇺',
    'Turkey': '🇹🇷',
    'Saudi Arabia': '🇸🇦',
    'Qatar': '🇶🇦',
    'Pakistan': '🇵🇰',
    'Bangladesh': '🇧🇩',
};
class TechHubsPanel extends Panel_1.Panel {
    constructor() {
        super({
            id: 'tech-hubs',
            title: (0, i18n_1.t)('panels.techHubs'),
            showCount: true,
            infoTooltip: (0, i18n_1.t)('components.techHubs.infoTooltip', {
                highColor: (0, utils_1.getCSSColor)('--semantic-normal'),
                elevatedColor: (0, utils_1.getCSSColor)('--semantic-elevated'),
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
    render() {
        if (this.activities.length === 0) {
            this.showError((0, i18n_1.t)('common.noActiveTechHubs'));
            return;
        }
        const html = this.activities.map((hub, index) => {
            const trendIcon = hub.trend === 'rising' ? '↑' : hub.trend === 'falling' ? '↓' : '';
            const breakingTag = hub.hasBreaking ? '<span class="hub-breaking">ALERT</span>' : '';
            const topStory = hub.topStories[0];
            return `
        <div class="tech-hub-item ${hub.activityLevel}" data-hub-id="${(0, sanitize_1.escapeHtml)(hub.hubId)}" data-index="${index}">
          <div class="hub-rank">${index + 1}</div>
          <span class="hub-indicator ${hub.activityLevel}"></span>
          <div class="hub-info">
            <div class="hub-header">
              <span class="hub-name">${(0, sanitize_1.escapeHtml)(hub.city)}</span>
              <span class="hub-flag">${this.getFlag(hub.country)}</span>
              ${breakingTag}
            </div>
            <div class="hub-meta">
              <span class="hub-news-count">${hub.newsCount} ${hub.newsCount === 1 ? 'story' : 'stories'}</span>
              ${trendIcon ? `<span class="hub-trend ${hub.trend}">${trendIcon}</span>` : ''}
              <span class="hub-tier">${hub.tier}</span>
            </div>
          </div>
          <div class="hub-score">${Math.round(hub.score)}</div>
        </div>
        ${topStory ? `
          <a class="hub-top-story" href="${(0, sanitize_1.sanitizeUrl)(topStory.link)}" target="_blank" rel="noopener" data-hub-id="${(0, sanitize_1.escapeHtml)(hub.hubId)}">
            ${(0, sanitize_1.escapeHtml)(topStory.title.length > 80 ? topStory.title.slice(0, 77) + '...' : topStory.title)}
          </a>
        ` : ''}
      `;
        }).join('');
        this.setContent(html);
        this.bindEvents();
    }
    bindEvents() {
        const items = this.content.querySelectorAll('.tech-hub-item');
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
exports.TechHubsPanel = TechHubsPanel;
