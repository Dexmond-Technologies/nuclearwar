"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TechReadinessPanel = void 0;
const Panel_1 = require("./Panel");
const i18n_1 = require("@/services/i18n");
const economic_1 = require("@/services/economic");
const sanitize_1 = require("@/utils/sanitize");
const COUNTRY_FLAGS = {
    'USA': '🇺🇸', 'CHN': '🇨🇳', 'JPN': '🇯🇵', 'DEU': '🇩🇪', 'KOR': '🇰🇷',
    'GBR': '🇬🇧', 'IND': '🇮🇳', 'ISR': '🇮🇱', 'SGP': '🇸🇬', 'TWN': '🇹🇼',
    'FRA': '🇫🇷', 'CAN': '🇨🇦', 'SWE': '🇸🇪', 'NLD': '🇳🇱', 'CHE': '🇨🇭',
    'FIN': '🇫🇮', 'IRL': '🇮🇪', 'AUS': '🇦🇺', 'BRA': '🇧🇷', 'IDN': '🇮🇩',
    'ESP': '🇪🇸', 'ITA': '🇮🇹', 'MEX': '🇲🇽', 'RUS': '🇷🇺', 'TUR': '🇹🇷',
    'SAU': '🇸🇦', 'ARE': '🇦🇪', 'POL': '🇵🇱', 'THA': '🇹🇭', 'MYS': '🇲🇾',
    'VNM': '🇻🇳', 'PHL': '🇵🇭', 'NZL': '🇳🇿', 'AUT': '🇦🇹', 'BEL': '🇧🇪',
    'DNK': '🇩🇰', 'NOR': '🇳🇴', 'PRT': '🇵🇹', 'CZE': '🇨🇿', 'ZAF': '🇿🇦',
    'NGA': '🇳🇬', 'KEN': '🇰🇪', 'EGY': '🇪🇬', 'ARG': '🇦🇷', 'CHL': '🇨🇱',
    'COL': '🇨🇴', 'PAK': '🇵🇰', 'BGD': '🇧🇩', 'UKR': '🇺🇦', 'ROU': '🇷🇴',
    'EST': '🇪🇪', 'LVA': '🇱🇻', 'LTU': '🇱🇹', 'HUN': '🇭🇺', 'GRC': '🇬🇷',
    'QAT': '🇶🇦', 'BHR': '🇧🇭', 'KWT': '🇰🇼', 'OMN': '🇴🇲', 'JOR': '🇯🇴',
};
class TechReadinessPanel extends Panel_1.Panel {
    constructor() {
        super({
            id: 'tech-readiness',
            title: (0, i18n_1.t)('panels.techReadiness'),
            showCount: true,
            infoTooltip: (0, i18n_1.t)('components.techReadiness.infoTooltip'),
        });
        this.rankings = [];
        this.loading = false;
        this.lastFetch = 0;
        this.REFRESH_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours
    }
    async refresh() {
        if (this.loading)
            return;
        if (Date.now() - this.lastFetch < this.REFRESH_INTERVAL && this.rankings.length > 0) {
            return;
        }
        this.loading = true;
        this.showFetchingState();
        try {
            this.rankings = await (0, economic_1.getTechReadinessRankings)();
            this.lastFetch = Date.now();
            this.setCount(this.rankings.length);
            this.render();
        }
        catch (error) {
            console.error('[TechReadinessPanel] Error fetching data:', error);
            this.showError((0, i18n_1.t)('common.failedTechReadiness'));
        }
        finally {
            this.loading = false;
        }
    }
    showFetchingState() {
        this.setContent(`
      <div class="tech-fetch-progress">
        <div class="tech-fetch-icon">
          <div class="tech-globe-ring"></div>
          <span class="tech-globe">🌐</span>
        </div>
        <div class="tech-fetch-title">${(0, i18n_1.t)('components.techReadiness.fetchingData')}</div>
        <div class="tech-fetch-indicators">
          <div class="tech-indicator-item" style="animation-delay: 0s">
            <span class="tech-indicator-icon">🌐</span>
            <span class="tech-indicator-name">${(0, i18n_1.t)('components.techReadiness.internetUsersIndicator')}</span>
            <span class="tech-indicator-status"></span>
          </div>
          <div class="tech-indicator-item" style="animation-delay: 0.2s">
            <span class="tech-indicator-icon">📱</span>
            <span class="tech-indicator-name">${(0, i18n_1.t)('components.techReadiness.mobileSubscriptionsIndicator')}</span>
            <span class="tech-indicator-status"></span>
          </div>
          <div class="tech-indicator-item" style="animation-delay: 0.4s">
            <span class="tech-indicator-icon">📡</span>
            <span class="tech-indicator-name">${(0, i18n_1.t)('components.techReadiness.broadbandAccess')}</span>
            <span class="tech-indicator-status"></span>
          </div>
          <div class="tech-indicator-item" style="animation-delay: 0.6s">
            <span class="tech-indicator-icon">🔬</span>
            <span class="tech-indicator-name">${(0, i18n_1.t)('components.techReadiness.rdExpenditure')}</span>
            <span class="tech-indicator-status"></span>
          </div>
        </div>
        <div class="tech-fetch-note">${(0, i18n_1.t)('components.techReadiness.analyzingCountries')}</div>
      </div>
    `);
    }
    getFlag(countryCode) {
        return COUNTRY_FLAGS[countryCode] || '🌐';
    }
    getScoreClass(score) {
        if (score >= 70)
            return 'high';
        if (score >= 40)
            return 'medium';
        return 'low';
    }
    formatComponent(value) {
        if (value === null)
            return '—';
        return Math.round(value).toString();
    }
    render() {
        if (this.rankings.length === 0) {
            this.showError((0, i18n_1.t)('common.noDataAvailable'));
            return;
        }
        // Show top 25 countries
        const top = this.rankings.slice(0, 25);
        const html = `
      <div class="tech-readiness-list">
        ${top.map(country => {
            const scoreClass = this.getScoreClass(country.score);
            return `
            <div class="readiness-item ${scoreClass}" data-country="${(0, sanitize_1.escapeHtml)(country.country)}">
              <div class="readiness-rank">#${country.rank}</div>
              <div class="readiness-flag">${this.getFlag(country.country)}</div>
              <div class="readiness-info">
                <div class="readiness-name">${(0, sanitize_1.escapeHtml)(country.countryName)}</div>
                <div class="readiness-components">
                  <span title="${(0, i18n_1.t)('components.techReadiness.internetUsers')}">🌐${this.formatComponent(country.components.internet)}</span>
                  <span title="${(0, i18n_1.t)('components.techReadiness.mobileSubscriptions')}">📱${this.formatComponent(country.components.mobile)}</span>
                  <span title="${(0, i18n_1.t)('components.techReadiness.rdSpending')}">🔬${this.formatComponent(country.components.rdSpend)}</span>
                </div>
              </div>
              <div class="readiness-score ${scoreClass}">${country.score}</div>
            </div>
          `;
        }).join('')}
      </div>
      <div class="readiness-footer">
        <span class="readiness-source">${(0, i18n_1.t)('components.techReadiness.source')}</span>
        <span class="readiness-updated">${(0, i18n_1.t)('components.techReadiness.updated', { date: new Date(this.lastFetch).toLocaleDateString() })}</span>
      </div>
    `;
        this.setContent(html);
    }
}
exports.TechReadinessPanel = TechReadinessPanel;
