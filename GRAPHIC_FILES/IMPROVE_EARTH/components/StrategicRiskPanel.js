"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StrategicRiskPanel = void 0;
const Panel_1 = require("./Panel");
const sanitize_1 = require("@/utils/sanitize");
const i18n_1 = require("@/services/i18n");
const utils_1 = require("@/utils");
const cross_module_integration_1 = require("@/services/cross-module-integration");
const geo_convergence_1 = require("@/services/geo-convergence");
const data_freshness_1 = require("@/services/data-freshness");
const country_instability_1 = require("@/services/country-instability");
const cached_risk_scores_1 = require("@/services/cached-risk-scores");
class StrategicRiskPanel extends Panel_1.Panel {
    constructor() {
        super({
            id: 'strategic-risk',
            title: (0, i18n_1.t)('panels.strategicRisk'),
            showCount: false,
            trackActivity: true,
            infoTooltip: (0, i18n_1.t)('components.strategicRisk.infoTooltip'),
        });
        this.overview = null;
        this.alerts = [];
        this.convergenceAlerts = [];
        this.freshnessSummary = null;
        this.unsubscribeFreshness = null;
        this.usedCachedScores = false;
        this.lastRiskFingerprint = '';
        this.init();
    }
    async init() {
        this.showLoading();
        try {
            // Subscribe to data freshness changes - debounce to avoid excessive recalculations
            let refreshTimeout = null;
            this.unsubscribeFreshness = data_freshness_1.dataFreshness.subscribe(() => {
                // Debounce refresh to batch multiple rapid updates
                if (refreshTimeout)
                    clearTimeout(refreshTimeout);
                refreshTimeout = setTimeout(() => {
                    this.refresh();
                }, 500);
            });
            await this.refresh();
        }
        catch (error) {
            console.error('[StrategicRiskPanel] Init error:', error);
            this.showError((0, i18n_1.t)('common.failedRiskOverview'));
        }
    }
    async refresh() {
        this.freshnessSummary = data_freshness_1.dataFreshness.getSummary();
        this.convergenceAlerts = (0, geo_convergence_1.detectConvergence)();
        this.overview = (0, cross_module_integration_1.calculateStrategicRiskOverview)(this.convergenceAlerts);
        this.alerts = (0, cross_module_integration_1.getRecentAlerts)(24);
        // Try to get cached scores during learning mode
        const { inLearning } = (0, country_instability_1.getLearningProgress)();
        this.usedCachedScores = false;
        if (inLearning) {
            const cached = await (0, cached_risk_scores_1.fetchCachedRiskScores)(this.signal);
            if (cached && cached.strategicRisk) {
                this.usedCachedScores = true;
                console.log('[StrategicRiskPanel] Using cached scores from backend');
            }
        }
        if (!this.freshnessSummary || this.freshnessSummary.activeSources === 0) {
            this.setDataBadge('unavailable');
        }
        else if (this.usedCachedScores) {
            this.setDataBadge('cached');
        }
        else {
            this.setDataBadge('live');
        }
        this.render();
        const alertIds = this.alerts.map(a => a.id).sort().join(',');
        const fp = `${this.overview?.compositeScore}|${this.overview?.trend}|${alertIds}`;
        const changed = fp !== this.lastRiskFingerprint;
        this.lastRiskFingerprint = fp;
        return changed;
    }
    getScoreColor(score) {
        if (score >= 70)
            return (0, utils_1.getCSSColor)('--semantic-critical');
        if (score >= 50)
            return (0, utils_1.getCSSColor)('--semantic-high');
        if (score >= 30)
            return (0, utils_1.getCSSColor)('--semantic-elevated');
        return (0, utils_1.getCSSColor)('--semantic-normal');
    }
    getScoreLevel(score) {
        if (score >= 70)
            return (0, i18n_1.t)('components.strategicRisk.levels.critical');
        if (score >= 50)
            return (0, i18n_1.t)('components.strategicRisk.levels.elevated');
        if (score >= 30)
            return (0, i18n_1.t)('components.strategicRisk.levels.moderate');
        return (0, i18n_1.t)('components.strategicRisk.levels.low');
    }
    getTrendEmoji(trend) {
        switch (trend) {
            case 'escalating': return '📈';
            case 'de-escalating': return '📉';
            default: return '➡️';
        }
    }
    getTrendColor(trend) {
        switch (trend) {
            case 'escalating': return (0, utils_1.getCSSColor)('--semantic-critical');
            case 'de-escalating': return (0, utils_1.getCSSColor)('--semantic-normal');
            default: return (0, utils_1.getCSSColor)('--text-dim');
        }
    }
    getPriorityColor(priority) {
        switch (priority) {
            case 'critical': return (0, utils_1.getCSSColor)('--semantic-critical');
            case 'high': return (0, utils_1.getCSSColor)('--semantic-high');
            case 'medium': return (0, utils_1.getCSSColor)('--semantic-elevated');
            case 'low': return (0, utils_1.getCSSColor)('--semantic-normal');
        }
    }
    getPriorityEmoji(priority) {
        switch (priority) {
            case 'critical': return '🔴';
            case 'high': return '🟠';
            case 'medium': return '🟡';
            case 'low': return '🟢';
        }
    }
    getTypeEmoji(type) {
        switch (type) {
            case 'convergence': return '🎯';
            case 'cii_spike': return '📊';
            case 'cascade': return '🔗';
            case 'composite': return '⚠️';
            default: return '📍';
        }
    }
    /**
     * Render when we have insufficient data - can't assess risk
     */
    renderInsufficientData() {
        const sources = data_freshness_1.dataFreshness.getAllSources();
        const riskSources = sources.filter(s => s.requiredForRisk);
        return `
      <div class="strategic-risk-panel">
        <div class="risk-no-data">
          <div class="risk-no-data-icon">⚠️</div>
          <div class="risk-no-data-title">${(0, i18n_1.t)('components.strategicRisk.insufficientData')}</div>
          <div class="risk-no-data-desc">
            ${(0, i18n_1.t)('components.strategicRisk.unableToAssess')}<br>${(0, i18n_1.t)('components.strategicRisk.enableDataSources')}
          </div>
        </div>

        <div class="risk-section">
          <div class="risk-section-title">${(0, i18n_1.t)('components.strategicRisk.requiredDataSources')}</div>
          <div class="risk-sources">
            ${riskSources.map(source => this.renderSourceRow(source)).join('')}
          </div>
        </div>

        <div class="risk-section">
          <div class="risk-section-title">${(0, i18n_1.t)('components.strategicRisk.optionalSources')}</div>
          <div class="risk-sources">
            ${sources.filter(s => !s.requiredForRisk).slice(0, 4).map(source => this.renderSourceRow(source)).join('')}
          </div>
        </div>

        <div class="risk-actions">
          <button class="risk-action-btn risk-action-primary" data-action="enable-core">
            ${(0, i18n_1.t)('components.strategicRisk.enableCoreFeeds')}
          </button>
        </div>

        <div class="risk-footer">
          <span class="risk-updated">${(0, i18n_1.t)('components.strategicRisk.waitingForData')}</span>
          <button class="risk-refresh-btn">${(0, i18n_1.t)('components.strategicRisk.refresh')}</button>
        </div>
      </div>
    `;
    }
    /**
     * Render full data view - normal operation
     */
    renderFullData() {
        if (!this.overview || !this.freshnessSummary)
            return '';
        const score = this.overview.compositeScore;
        const color = this.getScoreColor(score);
        const level = this.getScoreLevel(score);
        const scoreDeg = Math.round((score / 100) * 270);
        // Check for learning mode - skip if using cached scores
        const { inLearning, remainingMinutes, progress } = (0, country_instability_1.getLearningProgress)();
        const showLearning = inLearning && !this.usedCachedScores;
        // Only show status banner when there's something to report (learning mode)
        const statusBanner = showLearning
            ? `<div class="risk-status-banner risk-status-learning">
          <span class="risk-status-icon">📊</span>
          <span class="risk-status-text">${(0, i18n_1.t)('components.strategicRisk.learningMode', { minutes: String(remainingMinutes) })}</span>
          <div class="learning-progress-mini">
            <div class="learning-bar" style="width: ${progress}%"></div>
          </div>
        </div>`
            : '';
        return `
      <div class="strategic-risk-panel">
        ${statusBanner}

        <div class="risk-gauge">
          <div class="risk-score-container">
            <div class="risk-score-ring" style="--score-color: ${color}; --score-deg: ${scoreDeg}deg;">
              <div class="risk-score-inner">
                <div class="risk-score" style="color: ${color}">${score}</div>
                <div class="risk-level" style="color: ${color}">${level}</div>
              </div>
            </div>
          </div>
          <div class="risk-trend-container">
            <span class="risk-trend-label">${(0, i18n_1.t)('components.strategicRisk.trend')}</span>
            <div class="risk-trend" style="color: ${this.getTrendColor(this.overview.trend)}">
              ${this.getTrendEmoji(this.overview.trend)} ${this.overview.trend === 'escalating' ? (0, i18n_1.t)('components.strategicRisk.trends.escalating') : this.overview.trend === 'de-escalating' ? (0, i18n_1.t)('components.strategicRisk.trends.deEscalating') : (0, i18n_1.t)('components.strategicRisk.trends.stable')}
            </div>
          </div>
        </div>

        ${this.renderMetrics()}
        ${this.renderTopRisks()}
        ${this.renderRecentAlerts()}

        <div class="risk-footer">
          <span class="risk-updated">${(0, i18n_1.t)('components.strategicRisk.updated', { time: this.overview.timestamp.toLocaleTimeString() })}</span>
          <button class="risk-refresh-btn">${(0, i18n_1.t)('components.strategicRisk.refresh')}</button>
        </div>
      </div>
    `;
    }
    renderSourceRow(source) {
        const panelId = data_freshness_1.dataFreshness.getPanelIdForSource(source.id);
        const timeSince = data_freshness_1.dataFreshness.getTimeSince(source.id);
        return `
      <div class="risk-source-row">
        <span class="risk-source-status" style="color: ${(0, data_freshness_1.getStatusColor)(source.status)}">
          ${(0, data_freshness_1.getStatusIcon)(source.status)}
        </span>
        <span class="risk-source-name">${(0, sanitize_1.escapeHtml)(source.name)}</span>
        <span class="risk-source-time">${source.status === 'no_data' ? (0, i18n_1.t)('components.strategicRisk.noData') : timeSince}</span>
        ${panelId && (source.status === 'no_data' || source.status === 'disabled') ? `
          <button class="risk-source-enable" data-panel="${panelId}">${(0, i18n_1.t)('components.strategicRisk.enable')}</button>
        ` : ''}
      </div>
    `;
    }
    renderMetrics() {
        if (!this.overview)
            return '';
        const alertCounts = (0, cross_module_integration_1.getAlertCount)();
        return `
      <div class="risk-metrics">
        <div class="risk-metric">
          <span class="risk-metric-value">${this.overview.convergenceAlerts}</span>
          <span class="risk-metric-label">${(0, i18n_1.t)('components.strategicRisk.convergenceMetric')}</span>
        </div>
        <div class="risk-metric">
          <span class="risk-metric-value">${this.overview.avgCIIDeviation.toFixed(1)}</span>
          <span class="risk-metric-label">${(0, i18n_1.t)('components.strategicRisk.ciiDeviation')}</span>
        </div>
        <div class="risk-metric">
          <span class="risk-metric-value">${this.overview.infrastructureIncidents}</span>
          <span class="risk-metric-label">${(0, i18n_1.t)('components.strategicRisk.infraEvents')}</span>
        </div>
        <div class="risk-metric">
          <span class="risk-metric-value">${alertCounts.critical + alertCounts.high}</span>
          <span class="risk-metric-label">${(0, i18n_1.t)('components.strategicRisk.highAlerts')}</span>
        </div>
      </div>
    `;
    }
    renderTopRisks() {
        if (!this.overview || this.overview.topRisks.length === 0) {
            return `<div class="risk-empty">${(0, i18n_1.t)('components.strategicRisk.noRisks')}</div>`;
        }
        // Get convergence zone for first risk if available
        const topZone = this.overview.topConvergenceZones[0];
        return `
      <div class="risk-section">
        <div class="risk-section-title">${(0, i18n_1.t)('components.strategicRisk.topRisks')}</div>
        <div class="risk-list">
          ${this.overview.topRisks.map((risk, i) => {
            // First risk is convergence - make it clickable if we have location
            const isConvergence = i === 0 && risk.startsWith('Convergence:') && topZone;
            if (isConvergence) {
                return `
                <div class="risk-item risk-item-clickable" data-lat="${topZone.lat}" data-lon="${topZone.lon}">
                  <span class="risk-rank">${i + 1}.</span>
                  <span class="risk-text">${(0, sanitize_1.escapeHtml)(risk)}</span>
                  <span class="risk-location-icon">↗</span>
                </div>
              `;
            }
            return `
              <div class="risk-item">
                <span class="risk-rank">${i + 1}.</span>
                <span class="risk-text">${(0, sanitize_1.escapeHtml)(risk)}</span>
              </div>
            `;
        }).join('')}
        </div>
      </div>
    `;
    }
    renderRecentAlerts() {
        if (this.alerts.length === 0) {
            return '';
        }
        const displayAlerts = this.alerts.slice(0, 5);
        return `
      <div class="risk-section">
        <div class="risk-section-title">${(0, i18n_1.t)('components.strategicRisk.recentAlerts', { count: String(this.alerts.length) })}</div>
        <div class="risk-alerts">
          ${displayAlerts.map(alert => {
            const hasLocation = alert.location && alert.location.lat && alert.location.lon;
            const clickableClass = hasLocation ? 'risk-alert-clickable' : '';
            const locationAttrs = hasLocation
                ? `data-lat="${alert.location.lat}" data-lon="${alert.location.lon}"`
                : '';
            return `
              <div class="risk-alert ${clickableClass}" style="border-left: 3px solid ${this.getPriorityColor(alert.priority)}" ${locationAttrs}>
                <div class="risk-alert-header">
                  <span class="risk-alert-type">${this.getTypeEmoji(alert.type)}</span>
                  <span class="risk-alert-priority">${this.getPriorityEmoji(alert.priority)}</span>
                  <span class="risk-alert-title">${(0, sanitize_1.escapeHtml)(alert.title)}</span>
                  ${hasLocation ? '<span class="risk-location-icon">↗</span>' : ''}
                </div>
                <div class="risk-alert-summary">${(0, sanitize_1.escapeHtml)(alert.summary)}</div>
                <div class="risk-alert-time">${this.formatTime(alert.timestamp)}</div>
              </div>
            `;
        }).join('')}
        </div>
      </div>
    `;
    }
    formatTime(date) {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        if (minutes < 1)
            return (0, i18n_1.t)('components.strategicRisk.time.justNow');
        if (minutes < 60)
            return (0, i18n_1.t)('components.strategicRisk.time.minutesAgo', { count: String(minutes) });
        if (hours < 24)
            return (0, i18n_1.t)('components.strategicRisk.time.hoursAgo', { count: String(hours) });
        return date.toLocaleDateString();
    }
    render() {
        this.freshnessSummary = data_freshness_1.dataFreshness.getSummary();
        if (!this.overview) {
            this.showLoading();
            return;
        }
        // Render full data view — partial data is handled gracefully by CII baselines
        // Only show insufficient state if zero sources after 60s (true failure)
        let html;
        const uptime = performance.now();
        if (this.freshnessSummary.overallStatus === 'insufficient' && uptime > 60000) {
            html = this.renderInsufficientData();
        }
        else {
            html = this.renderFullData();
        }
        this.content.innerHTML = html;
        this.attachEventListeners();
    }
    attachEventListeners() {
        // Refresh button
        const refreshBtn = this.content.querySelector('.risk-refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }
        // Enable source buttons
        const enableBtns = this.content.querySelectorAll('.risk-source-enable');
        enableBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const panelId = e.target.dataset.panel;
                if (panelId) {
                    this.emitEnablePanel(panelId);
                }
            });
        });
        // Action buttons
        const actionBtns = this.content.querySelectorAll('.risk-action-btn');
        actionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                if (action === 'enable-core') {
                    this.emitEnablePanels(['protests', 'intel', 'live-news']);
                }
                else if (action === 'enable-all') {
                    this.emitEnablePanels(['protests', 'intel', 'live-news', 'military', 'shipping']);
                }
            });
        });
        // Clickable risk items (convergence zones)
        const clickableRisks = this.content.querySelectorAll('.risk-item-clickable');
        clickableRisks.forEach(item => {
            item.addEventListener('click', () => {
                const lat = parseFloat(item.dataset.lat || '0');
                const lon = parseFloat(item.dataset.lon || '0');
                if (this.onLocationClick && !isNaN(lat) && !isNaN(lon)) {
                    this.onLocationClick(lat, lon);
                }
            });
        });
        // Clickable alerts with location
        const clickableAlerts = this.content.querySelectorAll('.risk-alert-clickable');
        clickableAlerts.forEach(alert => {
            alert.addEventListener('click', () => {
                const lat = parseFloat(alert.dataset.lat || '0');
                const lon = parseFloat(alert.dataset.lon || '0');
                if (this.onLocationClick && !isNaN(lat) && !isNaN(lon)) {
                    this.onLocationClick(lat, lon);
                }
            });
        });
    }
    emitEnablePanel(panelId) {
        window.dispatchEvent(new CustomEvent('enable-panel', { detail: { panelId } }));
    }
    emitEnablePanels(panelIds) {
        panelIds.forEach(id => this.emitEnablePanel(id));
    }
    destroy() {
        if (this.unsubscribeFreshness) {
            this.unsubscribeFreshness();
        }
        super.destroy();
    }
    getOverview() {
        return this.overview;
    }
    getAlerts() {
        return this.alerts;
    }
    setLocationClickHandler(handler) {
        this.onLocationClick = handler;
    }
}
exports.StrategicRiskPanel = StrategicRiskPanel;
