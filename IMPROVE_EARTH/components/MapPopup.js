"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapPopup = void 0;
const config_1 = require("@/config");
const sanitize_1 = require("@/utils/sanitize");
const utils_1 = require("@/utils");
const i18n_1 = require("@/services/i18n");
const gdelt_intel_1 = require("@/services/gdelt-intel");
const eonet_1 = require("@/services/eonet");
const hotspot_escalation_1 = require("@/services/hotspot-escalation");
const cable_health_1 = require("@/services/cable-health");
class MapPopup {
    constructor(container) {
        this.popup = null;
        this.cableAdvisories = [];
        this.repairShips = [];
        this.isMobileSheet = false;
        this.sheetTouchStartY = null;
        this.sheetCurrentOffset = 0;
        this.mobileDismissThreshold = 96;
        this.outsideListenerTimeoutId = null;
        this.handleOutsideClick = (e) => {
            if (this.popup && !this.popup.contains(e.target)) {
                this.hide();
            }
        };
        this.handleEscapeKey = (e) => {
            if (e.key === 'Escape') {
                this.hide();
            }
        };
        this.handleSheetTouchStart = (e) => {
            if (!this.popup || !this.isMobileSheet || e.touches.length !== 1)
                return;
            const target = e.target;
            const popupBody = this.popup.querySelector('.popup-body');
            if (target?.closest('.popup-body') && popupBody && popupBody.scrollTop > 0) {
                this.sheetTouchStartY = null;
                return;
            }
            this.sheetTouchStartY = e.touches[0]?.clientY ?? null;
            this.sheetCurrentOffset = 0;
            this.popup.classList.add('dragging');
        };
        this.handleSheetTouchMove = (e) => {
            if (!this.popup || !this.isMobileSheet || this.sheetTouchStartY === null)
                return;
            const currentY = e.touches[0]?.clientY;
            if (currentY == null)
                return;
            const delta = Math.max(0, currentY - this.sheetTouchStartY);
            if (delta <= 0)
                return;
            this.sheetCurrentOffset = delta;
            this.popup.style.transform = `translate3d(0, ${delta}px, 0)`;
            e.preventDefault();
        };
        this.handleSheetTouchEnd = () => {
            if (!this.popup || !this.isMobileSheet || this.sheetTouchStartY === null)
                return;
            const shouldDismiss = this.sheetCurrentOffset >= this.mobileDismissThreshold;
            this.popup.classList.remove('dragging');
            this.sheetTouchStartY = null;
            if (shouldDismiss) {
                this.hide();
                return;
            }
            this.sheetCurrentOffset = 0;
            this.popup.style.transform = '';
            this.popup.classList.add('open');
        };
        this.container = container;
    }
    show(data) {
        this.hide();
        this.isMobileSheet = (0, utils_1.isMobileDevice)();
        this.popup = document.createElement('div');
        this.popup.className = this.isMobileSheet ? 'map-popup map-popup-sheet' : 'map-popup';
        const content = this.renderContent(data);
        this.popup.innerHTML = this.isMobileSheet
            ? `<button class="map-popup-sheet-handle" aria-label="${(0, i18n_1.t)('common.close')}"></button>${content}`
            : content;
        // Get container's viewport position for absolute positioning
        const containerRect = this.container.getBoundingClientRect();
        if (this.isMobileSheet) {
            this.popup.style.left = '';
            this.popup.style.top = '';
            this.popup.style.transform = '';
        }
        else {
            this.positionDesktopPopup(data, containerRect);
        }
        // Append to body to avoid container overflow clipping
        document.body.appendChild(this.popup);
        // Close button handler
        this.popup.querySelector('.popup-close')?.addEventListener('click', () => this.hide());
        this.popup.querySelector('.map-popup-sheet-handle')?.addEventListener('click', () => this.hide());
        if (this.isMobileSheet) {
            this.popup.addEventListener('touchstart', this.handleSheetTouchStart, { passive: true });
            this.popup.addEventListener('touchmove', this.handleSheetTouchMove, { passive: false });
            this.popup.addEventListener('touchend', this.handleSheetTouchEnd);
            this.popup.addEventListener('touchcancel', this.handleSheetTouchEnd);
            requestAnimationFrame(() => {
                if (!this.popup)
                    return;
                this.popup.classList.add('open');
                // Remove will-change after slide-in transition to free GPU memory
                this.popup.addEventListener('transitionend', () => {
                    if (this.popup)
                        this.popup.style.willChange = 'auto';
                }, { once: true });
            });
        }
        // Click outside to close
        if (this.outsideListenerTimeoutId !== null) {
            window.clearTimeout(this.outsideListenerTimeoutId);
        }
        this.outsideListenerTimeoutId = window.setTimeout(() => {
            document.addEventListener('click', this.handleOutsideClick);
            document.addEventListener('touchstart', this.handleOutsideClick);
            document.addEventListener('keydown', this.handleEscapeKey);
            this.outsideListenerTimeoutId = null;
        }, 0);
    }
    positionDesktopPopup(data, containerRect) {
        if (!this.popup)
            return;
        const popupWidth = 380;
        const bottomBuffer = 50; // Buffer from viewport bottom
        const topBuffer = 60; // Header height
        // Temporarily append popup off-screen to measure actual height
        this.popup.style.visibility = 'hidden';
        this.popup.style.top = '0';
        this.popup.style.left = '-9999px';
        document.body.appendChild(this.popup);
        const popupHeight = this.popup.offsetHeight;
        document.body.removeChild(this.popup);
        this.popup.style.visibility = '';
        // Convert container-relative coords to viewport coords
        const viewportX = containerRect.left + data.x;
        const viewportY = containerRect.top + data.y;
        // Horizontal positioning (viewport-relative)
        const maxX = window.innerWidth - popupWidth - 20;
        let left = viewportX + 20;
        if (left > maxX) {
            // Position to the left of click if it would overflow right
            left = Math.max(10, viewportX - popupWidth - 20);
        }
        // Vertical positioning - prefer below click, but flip above if needed
        const availableBelow = window.innerHeight - viewportY - bottomBuffer;
        const availableAbove = viewportY - topBuffer;
        let top;
        if (availableBelow >= popupHeight) {
            // Enough space below - position below click
            top = viewportY + 10;
        }
        else if (availableAbove >= popupHeight) {
            // Not enough below, but enough above - position above click
            top = viewportY - popupHeight - 10;
        }
        else {
            // Limited space both ways - position at top buffer
            top = topBuffer;
        }
        // CRITICAL: Ensure popup stays within viewport vertically
        top = Math.max(topBuffer, top);
        const maxTop = window.innerHeight - popupHeight - bottomBuffer;
        if (maxTop > topBuffer) {
            top = Math.min(top, maxTop);
        }
        this.popup.style.left = `${left}px`;
        this.popup.style.top = `${top}px`;
    }
    hide() {
        if (this.outsideListenerTimeoutId !== null) {
            window.clearTimeout(this.outsideListenerTimeoutId);
            this.outsideListenerTimeoutId = null;
        }
        if (this.popup) {
            this.popup.removeEventListener('touchstart', this.handleSheetTouchStart);
            this.popup.removeEventListener('touchmove', this.handleSheetTouchMove);
            this.popup.removeEventListener('touchend', this.handleSheetTouchEnd);
            this.popup.removeEventListener('touchcancel', this.handleSheetTouchEnd);
            this.popup.remove();
            this.popup = null;
            this.isMobileSheet = false;
            this.sheetTouchStartY = null;
            this.sheetCurrentOffset = 0;
            document.removeEventListener('click', this.handleOutsideClick);
            document.removeEventListener('touchstart', this.handleOutsideClick);
            document.removeEventListener('keydown', this.handleEscapeKey);
            this.onClose?.();
        }
    }
    setOnClose(callback) {
        this.onClose = callback;
    }
    setCableActivity(advisories, repairShips) {
        this.cableAdvisories = advisories;
        this.repairShips = repairShips;
    }
    renderContent(data) {
        switch (data.type) {
            case 'conflict':
                return this.renderConflictPopup(data.data);
            case 'hotspot':
                return this.renderHotspotPopup(data.data, data.relatedNews);
            case 'earthquake':
                return this.renderEarthquakePopup(data.data);
            case 'weather':
                return this.renderWeatherPopup(data.data);
            case 'base':
                return this.renderBasePopup(data.data);
            case 'waterway':
                return this.renderWaterwayPopup(data.data);
            case 'apt':
                return this.renderAPTPopup(data.data);
            case 'cyberThreat':
                return this.renderCyberThreatPopup(data.data);
            case 'nuclear':
                return this.renderNuclearPopup(data.data);
            case 'economic':
                return this.renderEconomicPopup(data.data);
            case 'irradiator':
                return this.renderIrradiatorPopup(data.data);
            case 'pipeline':
                return this.renderPipelinePopup(data.data);
            case 'cable':
                return this.renderCablePopup(data.data);
            case 'cable-advisory':
                return this.renderCableAdvisoryPopup(data.data);
            case 'repair-ship':
                return this.renderRepairShipPopup(data.data);
            case 'outage':
                return this.renderOutagePopup(data.data);
            case 'datacenter':
                return this.renderDatacenterPopup(data.data);
            case 'datacenterCluster':
                return this.renderDatacenterClusterPopup(data.data);
            case 'ais':
                return this.renderAisPopup(data.data);
            case 'protest':
                return this.renderProtestPopup(data.data);
            case 'protestCluster':
                return this.renderProtestClusterPopup(data.data);
            case 'flight':
                return this.renderFlightPopup(data.data);
            case 'militaryFlight':
                return this.renderMilitaryFlightPopup(data.data);
            case 'militaryVessel':
                return this.renderMilitaryVesselPopup(data.data);
            case 'militaryFlightCluster':
                return this.renderMilitaryFlightClusterPopup(data.data);
            case 'militaryVesselCluster':
                return this.renderMilitaryVesselClusterPopup(data.data);
            case 'natEvent':
                return this.renderNaturalEventPopup(data.data);
            case 'port':
                return this.renderPortPopup(data.data);
            case 'spaceport':
                return this.renderSpaceportPopup(data.data);
            case 'mineral':
                return this.renderMineralPopup(data.data);
            case 'startupHub':
                return this.renderStartupHubPopup(data.data);
            case 'cloudRegion':
                return this.renderCloudRegionPopup(data.data);
            case 'techHQ':
                return this.renderTechHQPopup(data.data);
            case 'accelerator':
                return this.renderAcceleratorPopup(data.data);
            case 'techEvent':
                return this.renderTechEventPopup(data.data);
            case 'techHQCluster':
                return this.renderTechHQClusterPopup(data.data);
            case 'techEventCluster':
                return this.renderTechEventClusterPopup(data.data);
            case 'stockExchange':
                return this.renderStockExchangePopup(data.data);
            case 'financialCenter':
                return this.renderFinancialCenterPopup(data.data);
            case 'centralBank':
                return this.renderCentralBankPopup(data.data);
            case 'commodityHub':
                return this.renderCommodityHubPopup(data.data);
            case 'iranEvent':
                return this.renderIranEventPopup(data.data);
            default:
                return '';
        }
    }
    renderConflictPopup(conflict) {
        const severityClass = conflict.intensity === 'high' ? 'high' : conflict.intensity === 'medium' ? 'medium' : 'low';
        const severityLabel = (0, sanitize_1.escapeHtml)(conflict.intensity?.toUpperCase() || (0, i18n_1.t)('popups.unknown').toUpperCase());
        return `
      <div class="popup-header conflict">
        <span class="popup-title">${(0, sanitize_1.escapeHtml)(conflict.name.toUpperCase())}</span>
        <span class="popup-badge ${severityClass}">${severityLabel}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.startDate')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(conflict.startDate || (0, i18n_1.t)('popups.unknown'))}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.casualties')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(conflict.casualties || (0, i18n_1.t)('popups.unknown'))}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.displaced')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(conflict.displaced || (0, i18n_1.t)('popups.unknown'))}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.location')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(conflict.location || `${conflict.center[1]}°N, ${conflict.center[0]}°E`)}</span>
          </div>
        </div>
        ${conflict.description ? `<p class="popup-description">${(0, sanitize_1.escapeHtml)(conflict.description)}</p>` : ''}
        ${conflict.parties && conflict.parties.length > 0 ? `
          <div class="popup-section">
            <span class="section-label">${(0, i18n_1.t)('popups.belligerents')}</span>
            <div class="popup-tags">
              ${conflict.parties.map(p => `<span class="popup-tag">${(0, sanitize_1.escapeHtml)(p)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        ${conflict.keyDevelopments && conflict.keyDevelopments.length > 0 ? `
          <div class="popup-section">
            <span class="section-label">${(0, i18n_1.t)('popups.keyDevelopments')}</span>
            <ul class="popup-list">
              ${conflict.keyDevelopments.map(d => `<li>${(0, sanitize_1.escapeHtml)(d)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
    }
    getLocalizedHotspotSubtext(subtext) {
        const slug = subtext
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
        const key = `popups.hotspotSubtexts.${slug}`;
        const localized = (0, i18n_1.t)(key);
        return localized === key ? subtext : localized;
    }
    renderHotspotPopup(hotspot, relatedNews) {
        const severityClass = hotspot.level || 'low';
        const severityLabel = (0, sanitize_1.escapeHtml)((hotspot.level || 'low').toUpperCase());
        const localizedSubtext = hotspot.subtext ? this.getLocalizedHotspotSubtext(hotspot.subtext) : '';
        // Get dynamic escalation score
        const dynamicScore = (0, hotspot_escalation_1.getHotspotEscalation)(hotspot.id);
        const change24h = (0, hotspot_escalation_1.getEscalationChange24h)(hotspot.id);
        // Escalation score display
        const escalationColors = {
            1: (0, utils_1.getCSSColor)('--semantic-normal'),
            2: (0, utils_1.getCSSColor)('--semantic-normal'),
            3: (0, utils_1.getCSSColor)('--semantic-elevated'),
            4: (0, utils_1.getCSSColor)('--semantic-high'),
            5: (0, utils_1.getCSSColor)('--semantic-critical'),
        };
        const escalationLabels = {
            1: (0, i18n_1.t)('popups.hotspot.levels.stable'),
            2: (0, i18n_1.t)('popups.hotspot.levels.watch'),
            3: (0, i18n_1.t)('popups.hotspot.levels.elevated'),
            4: (0, i18n_1.t)('popups.hotspot.levels.high'),
            5: (0, i18n_1.t)('popups.hotspot.levels.critical')
        };
        const trendIcons = { 'escalating': '↑', 'stable': '→', 'de-escalating': '↓' };
        const trendColors = { 'escalating': (0, utils_1.getCSSColor)('--semantic-critical'), 'stable': (0, utils_1.getCSSColor)('--semantic-elevated'), 'de-escalating': (0, utils_1.getCSSColor)('--semantic-normal') };
        const displayScore = dynamicScore?.combinedScore ?? hotspot.escalationScore ?? 3;
        const displayScoreInt = Math.round(displayScore);
        const displayTrend = dynamicScore?.trend ?? hotspot.escalationTrend ?? 'stable';
        const escalationSection = `
      <div class="popup-section escalation-section">
        <span class="section-label">${(0, i18n_1.t)('popups.hotspot.escalation')}</span>
        <div class="escalation-display">
          <div class="escalation-score" style="background: ${escalationColors[displayScoreInt] || (0, utils_1.getCSSColor)('--text-dim')}">
            <span class="score-value">${displayScore.toFixed(1)}/5</span>
            <span class="score-label">${escalationLabels[displayScoreInt] || (0, i18n_1.t)('popups.unknown')}</span>
          </div>
          <div class="escalation-trend" style="color: ${trendColors[displayTrend] || (0, utils_1.getCSSColor)('--text-dim')}">
            <span class="trend-icon">${trendIcons[displayTrend] || ''}</span>
            <span class="trend-label">${(0, sanitize_1.escapeHtml)(displayTrend.toUpperCase())}</span>
          </div>
        </div>
        ${dynamicScore ? `
          <div class="escalation-breakdown">
            <div class="breakdown-header">
              <span class="baseline-label">${(0, i18n_1.t)('popups.hotspot.baseline')}: ${dynamicScore.staticBaseline}/5</span>
              ${change24h ? `
                <span class="change-label ${change24h.change >= 0 ? 'rising' : 'falling'}">
                  24h: ${change24h.change >= 0 ? '+' : ''}${change24h.change}
                </span>
              ` : ''}
            </div>
            <div class="breakdown-components">
              <div class="breakdown-row">
                <span class="component-label">${(0, i18n_1.t)('popups.hotspot.components.news')}</span>
                <div class="component-bar-bg">
                  <div class="component-bar news" style="width: ${dynamicScore.components.newsActivity}%"></div>
                </div>
                <span class="component-value">${Math.round(dynamicScore.components.newsActivity)}</span>
              </div>
              <div class="breakdown-row">
                <span class="component-label">${(0, i18n_1.t)('popups.hotspot.components.cii')}</span>
                <div class="component-bar-bg">
                  <div class="component-bar cii" style="width: ${dynamicScore.components.ciiContribution}%"></div>
                </div>
                <span class="component-value">${Math.round(dynamicScore.components.ciiContribution)}</span>
              </div>
              <div class="breakdown-row">
                <span class="component-label">${(0, i18n_1.t)('popups.hotspot.components.geo')}</span>
                <div class="component-bar-bg">
                  <div class="component-bar geo" style="width: ${dynamicScore.components.geoConvergence}%"></div>
                </div>
                <span class="component-value">${Math.round(dynamicScore.components.geoConvergence)}</span>
              </div>
              <div class="breakdown-row">
                <span class="component-label">${(0, i18n_1.t)('popups.hotspot.components.military')}</span>
                <div class="component-bar-bg">
                  <div class="component-bar military" style="width: ${dynamicScore.components.militaryActivity}%"></div>
                </div>
                <span class="component-value">${Math.round(dynamicScore.components.militaryActivity)}</span>
              </div>
            </div>
          </div>
        ` : ''}
        ${hotspot.escalationIndicators && hotspot.escalationIndicators.length > 0 ? `
          <div class="escalation-indicators">
            ${hotspot.escalationIndicators.map(i => `<span class="indicator-tag">• ${(0, sanitize_1.escapeHtml)(i)}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    `;
        // Historical context section
        const historySection = hotspot.history ? `
      <div class="popup-section history-section">
        <span class="section-label">${(0, i18n_1.t)('popups.historicalContext')}</span>
        <div class="history-content">
          ${hotspot.history.lastMajorEvent ? `
            <div class="history-event">
              <span class="history-label">${(0, i18n_1.t)('popups.lastMajorEvent')}:</span>
              <span class="history-value">${(0, sanitize_1.escapeHtml)(hotspot.history.lastMajorEvent)} ${hotspot.history.lastMajorEventDate ? `(${(0, sanitize_1.escapeHtml)(hotspot.history.lastMajorEventDate)})` : ''}</span>
            </div>
          ` : ''}
          ${hotspot.history.precedentDescription ? `
            <div class="history-event">
              <span class="history-label">${(0, i18n_1.t)('popups.precedents')}:</span>
              <span class="history-value">${(0, sanitize_1.escapeHtml)(hotspot.history.precedentDescription)}</span>
            </div>
          ` : ''}
          ${hotspot.history.cyclicalRisk ? `
            <div class="history-event cyclical">
              <span class="history-label">${(0, i18n_1.t)('popups.cyclicalPattern')}:</span>
              <span class="history-value">${(0, sanitize_1.escapeHtml)(hotspot.history.cyclicalRisk)}</span>
            </div>
          ` : ''}
        </div>
      </div>
    ` : '';
        // "Why it matters" section
        const whyItMattersSection = hotspot.whyItMatters ? `
      <div class="popup-section why-matters-section">
        <span class="section-label">${(0, i18n_1.t)('popups.whyItMatters')}</span>
        <p class="why-matters-text">${(0, sanitize_1.escapeHtml)(hotspot.whyItMatters)}</p>
      </div>
    ` : '';
        return `
      <div class="popup-header hotspot">
        <span class="popup-title">${(0, sanitize_1.escapeHtml)(hotspot.name.toUpperCase())}</span>
        <span class="popup-badge ${severityClass}">${severityLabel}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        ${localizedSubtext ? `<div class="popup-subtitle">${(0, sanitize_1.escapeHtml)(localizedSubtext)}</div>` : ''}
        ${hotspot.description ? `<p class="popup-description">${(0, sanitize_1.escapeHtml)(hotspot.description)}</p>` : ''}
        ${escalationSection}
        <div class="popup-stats">
          ${hotspot.location ? `
            <div class="popup-stat">
              <span class="stat-label">${(0, i18n_1.t)('popups.location')}</span>
              <span class="stat-value">${(0, sanitize_1.escapeHtml)(hotspot.location)}</span>
            </div>
          ` : ''}
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.coordinates')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(`${hotspot.lat.toFixed(2)}°N, ${hotspot.lon.toFixed(2)}°E`)}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.status')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(hotspot.status || (0, i18n_1.t)('popups.monitoring'))}</span>
          </div>
        </div>
        ${whyItMattersSection}
        ${historySection}
        ${hotspot.agencies && hotspot.agencies.length > 0 ? `
          <div class="popup-section">
            <span class="section-label">${(0, i18n_1.t)('popups.keyEntities')}</span>
            <div class="popup-tags">
              ${hotspot.agencies.map(a => `<span class="popup-tag">${(0, sanitize_1.escapeHtml)(a)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        ${relatedNews && relatedNews.length > 0 ? `
          <div class="popup-section">
          <div class="popup-section">
            <span class="section-label">${(0, i18n_1.t)('popups.relatedHeadlines')}</span>
            <div class="popup-news">
              ${relatedNews.slice(0, 5).map(n => `
                <div class="popup-news-item">
                  <span class="news-source">${(0, sanitize_1.escapeHtml)(n.source)}</span>
                  <a href="${(0, sanitize_1.sanitizeUrl)(n.link)}" target="_blank" class="news-title">${(0, sanitize_1.escapeHtml)(n.title)}</a>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        <div class="hotspot-gdelt-context" data-hotspot-id="${(0, sanitize_1.escapeHtml)(hotspot.id)}">
          <div class="hotspot-gdelt-header">${(0, i18n_1.t)('popups.liveIntel')}</div>
          <div class="hotspot-gdelt-loading">${(0, i18n_1.t)('popups.loadingNews')}</div>
        </div>
      </div>
    `;
    }
    async loadHotspotGdeltContext(hotspot) {
        if (!this.popup)
            return;
        const container = this.popup.querySelector('.hotspot-gdelt-context');
        if (!container)
            return;
        try {
            const articles = await (0, gdelt_intel_1.fetchHotspotContext)(hotspot);
            if (!this.popup || !container.isConnected)
                return;
            if (articles.length === 0) {
                container.innerHTML = `
          <div class="hotspot-gdelt-header">${(0, i18n_1.t)('popups.liveIntel')}</div>
          <div class="hotspot-gdelt-loading">${(0, i18n_1.t)('popups.noCoverage')}</div>
        `;
                return;
            }
            container.innerHTML = `
        <div class="hotspot-gdelt-header">${(0, i18n_1.t)('popups.liveIntel')}</div>
        <div class="hotspot-gdelt-articles">
          ${articles.slice(0, 5).map(article => this.renderGdeltArticle(article)).join('')}
        </div>
      `;
        }
        catch (error) {
            if (container.isConnected) {
                container.innerHTML = `
          <div class="hotspot-gdelt-header">${(0, i18n_1.t)('popups.liveIntel')}</div>
          <div class="hotspot-gdelt-loading">${(0, i18n_1.t)('common.error')}</div>
        `;
            }
        }
    }
    renderGdeltArticle(article) {
        const domain = article.source || (0, gdelt_intel_1.extractDomain)(article.url);
        const timeAgo = (0, gdelt_intel_1.formatArticleDate)(article.date);
        return `
      <a href="${(0, sanitize_1.sanitizeUrl)(article.url)}" target="_blank" rel="noopener" class="hotspot-gdelt-article">
        <div class="article-meta">
          <span>${(0, sanitize_1.escapeHtml)(domain)}</span>
          <span>${(0, sanitize_1.escapeHtml)(timeAgo)}</span>
        </div>
        <div class="article-title">${(0, sanitize_1.escapeHtml)(article.title)}</div>
      </a>
    `;
    }
    renderEarthquakePopup(earthquake) {
        const severity = earthquake.magnitude >= 6 ? 'high' : earthquake.magnitude >= 5 ? 'medium' : 'low';
        const severityLabel = earthquake.magnitude >= 6 ? (0, i18n_1.t)('popups.earthquake.levels.major') : earthquake.magnitude >= 5 ? (0, i18n_1.t)('popups.earthquake.levels.moderate') : (0, i18n_1.t)('popups.earthquake.levels.minor');
        const timeAgo = this.getTimeAgo(new Date(earthquake.occurredAt));
        return `
      <div class="popup-header earthquake">
        <span class="popup-title magnitude">M${earthquake.magnitude.toFixed(1)}</span>
        <span class="popup-badge ${severity}">${severityLabel}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <p class="popup-location">${(0, sanitize_1.escapeHtml)(earthquake.place)}</p>
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.depth')}</span>
            <span class="stat-value">${earthquake.depthKm.toFixed(1)} km</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.coordinates')}</span>
            <span class="stat-value">${(earthquake.location?.latitude ?? 0).toFixed(2)}°, ${(earthquake.location?.longitude ?? 0).toFixed(2)}°</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.time')}</span>
            <span class="stat-value">${timeAgo}</span>
          </div>
        </div>
        <a href="${(0, sanitize_1.sanitizeUrl)(earthquake.sourceUrl)}" target="_blank" class="popup-link">${(0, i18n_1.t)('popups.viewUSGS')} →</a>
      </div>
    `;
    }
    getTimeAgo(date) {
        const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
        if (seconds < 60)
            return (0, i18n_1.t)('popups.timeAgo.s', { count: seconds });
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60)
            return (0, i18n_1.t)('popups.timeAgo.m', { count: minutes });
        const hours = Math.floor(minutes / 60);
        if (hours < 24)
            return (0, i18n_1.t)('popups.timeAgo.h', { count: hours });
        const days = Math.floor(hours / 24);
        return (0, i18n_1.t)('popups.timeAgo.d', { count: days });
    }
    renderWeatherPopup(alert) {
        const severityClass = (0, sanitize_1.escapeHtml)(alert.severity.toLowerCase());
        const expiresIn = this.getTimeUntil(alert.expires);
        return `
      <div class="popup-header weather ${severityClass}">
        <span class="popup-title">${(0, sanitize_1.escapeHtml)(alert.event.toUpperCase())}</span>
        <span class="popup-badge ${severityClass}">${(0, sanitize_1.escapeHtml)(alert.severity.toUpperCase())}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <p class="popup-headline">${(0, sanitize_1.escapeHtml)(alert.headline)}</p>
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.area')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(alert.areaDesc)}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.expires')}</span>
            <span class="stat-value">${expiresIn}</span>
          </div>
        </div>
        <p class="popup-description">${(0, sanitize_1.escapeHtml)(alert.description.slice(0, 300))}${alert.description.length > 300 ? '...' : ''}</p>
      </div>
    `;
    }
    getTimeUntil(date) {
        const ms = date.getTime() - Date.now();
        if (ms <= 0)
            return (0, i18n_1.t)('popups.expired');
        const hours = Math.floor(ms / (1000 * 60 * 60));
        if (hours < 1)
            return `${Math.floor(ms / (1000 * 60))}${(0, i18n_1.t)('popups.timeUnits.m')}`;
        if (hours < 24)
            return `${hours}${(0, i18n_1.t)('popups.timeUnits.h')}`;
        return `${Math.floor(hours / 24)}${(0, i18n_1.t)('popups.timeUnits.d')}`;
    }
    renderBasePopup(base) {
        const typeLabels = {
            'us-nato': (0, i18n_1.t)('popups.base.types.us-nato'),
            'china': (0, i18n_1.t)('popups.base.types.china'),
            'russia': (0, i18n_1.t)('popups.base.types.russia'),
        };
        const typeColors = {
            'us-nato': 'elevated',
            'china': 'high',
            'russia': 'high',
        };
        const enriched = base;
        const categories = [];
        if (enriched.catAirforce)
            categories.push('Air Force');
        if (enriched.catNaval)
            categories.push('Naval');
        if (enriched.catNuclear)
            categories.push('Nuclear');
        if (enriched.catSpace)
            categories.push('Space');
        if (enriched.catTraining)
            categories.push('Training');
        return `
      <div class="popup-header base">
        <span class="popup-title">${(0, sanitize_1.escapeHtml)(base.name.toUpperCase())}</span>
        <span class="popup-badge ${typeColors[base.type] || 'low'}">${(0, sanitize_1.escapeHtml)(typeLabels[base.type] || base.type.toUpperCase())}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        ${base.description ? `<p class="popup-description">${(0, sanitize_1.escapeHtml)(base.description)}</p>` : ''}
        ${enriched.kind ? `<p class="popup-description" style="opacity:0.7;margin-top:2px">${(0, sanitize_1.escapeHtml)(enriched.kind.replace(/_/g, ' '))}</p>` : ''}
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.type')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(typeLabels[base.type] || base.type)}</span>
          </div>
          ${base.arm ? `<div class="popup-stat"><span class="stat-label">Branch</span><span class="stat-value">${(0, sanitize_1.escapeHtml)(base.arm)}</span></div>` : ''}
          ${base.country ? `<div class="popup-stat"><span class="stat-label">Country</span><span class="stat-value">${(0, sanitize_1.escapeHtml)(base.country)}</span></div>` : ''}
          ${categories.length > 0 ? `<div class="popup-stat"><span class="stat-label">Categories</span><span class="stat-value">${(0, sanitize_1.escapeHtml)(categories.join(', '))}</span></div>` : ''}
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.coordinates')}</span>
            <span class="stat-value">${base.lat.toFixed(2)}°, ${base.lon.toFixed(2)}°</span>
          </div>
        </div>
      </div>
    `;
    }
    renderWaterwayPopup(waterway) {
        return `
      <div class="popup-header waterway">
        <span class="popup-title">${(0, sanitize_1.escapeHtml)(waterway.name)}</span>
        <span class="popup-badge elevated">${(0, i18n_1.t)('popups.strategic')}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        ${waterway.description ? `<p class="popup-description">${(0, sanitize_1.escapeHtml)(waterway.description)}</p>` : ''}
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.coordinates')}</span>
            <span class="stat-value">${waterway.lat.toFixed(2)}°, ${waterway.lon.toFixed(2)}°</span>
          </div>
        </div>
      </div>
    `;
    }
    renderAisPopup(event) {
        const severityClass = (0, sanitize_1.escapeHtml)(event.severity);
        const severityLabel = (0, sanitize_1.escapeHtml)(event.severity.toUpperCase());
        const typeLabel = event.type === 'gap_spike' ? (0, i18n_1.t)('popups.aisGapSpike') : (0, i18n_1.t)('popups.chokepointCongestion');
        const changeLabel = event.type === 'gap_spike' ? (0, i18n_1.t)('popups.darkening') : (0, i18n_1.t)('popups.density');
        const countLabel = event.type === 'gap_spike' ? (0, i18n_1.t)('popups.darkShips') : (0, i18n_1.t)('popups.vesselCount');
        const countValue = event.type === 'gap_spike'
            ? event.darkShips?.toString() || '—'
            : event.vesselCount?.toString() || '—';
        return `
      <div class="popup-header ais">
        <span class="popup-title">${(0, sanitize_1.escapeHtml)(event.name.toUpperCase())}</span>
        <span class="popup-badge ${severityClass}">${severityLabel}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-subtitle">${typeLabel}</div>
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${changeLabel}</span>
            <span class="stat-value">${event.changePct}% ↑</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${countLabel}</span>
            <span class="stat-value">${countValue}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.window')}</span>
            <span class="stat-value">${event.windowHours}H</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.region')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(event.region || `${event.lat.toFixed(2)}°, ${event.lon.toFixed(2)}°`)}</span>
          </div>
        </div>
        <p class="popup-description">${(0, sanitize_1.escapeHtml)(event.description)}</p>
      </div>
    `;
    }
    renderProtestPopup(event) {
        const severityClass = (0, sanitize_1.escapeHtml)(event.severity);
        const severityLabel = (0, sanitize_1.escapeHtml)(event.severity.toUpperCase());
        const eventTypeLabel = (0, sanitize_1.escapeHtml)(event.eventType.replace('_', ' ').toUpperCase());
        const icon = event.eventType === 'riot' ? '🔥' : event.eventType === 'strike' ? '✊' : '📢';
        const sourceLabel = event.sourceType === 'acled' ? (0, i18n_1.t)('popups.protest.acledVerified') : (0, i18n_1.t)('popups.protest.gdelt');
        const validatedBadge = event.validated ? `<span class="popup-badge verified">${(0, i18n_1.t)('popups.verified')}</span>` : '';
        const fatalitiesSection = event.fatalities
            ? `<div class="popup-stat"><span class="stat-label">${(0, i18n_1.t)('popups.fatalities')}</span><span class="stat-value alert">${event.fatalities}</span></div>`
            : '';
        const actorsSection = event.actors?.length
            ? `<div class="popup-stat"><span class="stat-label">${(0, i18n_1.t)('popups.actors')}</span><span class="stat-value">${event.actors.map(a => (0, sanitize_1.escapeHtml)(a)).join(', ')}</span></div>`
            : '';
        const tagsSection = event.tags?.length
            ? `<div class="popup-tags">${event.tags.map(t => `<span class="popup-tag">${(0, sanitize_1.escapeHtml)(t)}</span>`).join('')}</div>`
            : '';
        const relatedHotspots = event.relatedHotspots?.length
            ? `<div class="popup-related">${(0, i18n_1.t)('popups.near')}: ${event.relatedHotspots.map(h => (0, sanitize_1.escapeHtml)(h)).join(', ')}</div>`
            : '';
        return `
      <div class="popup-header protest ${severityClass}">
        <span class="popup-icon">${icon}</span>
        <span class="popup-title">${eventTypeLabel}</span>
        <span class="popup-badge ${severityClass}">${severityLabel}</span>
        ${validatedBadge}
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-subtitle">${event.city ? `${(0, sanitize_1.escapeHtml)(event.city)}, ` : ''}${(0, sanitize_1.escapeHtml)(event.country)}</div>
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.time')}</span>
            <span class="stat-value">${event.time.toLocaleDateString()}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.source')}</span>
            <span class="stat-value">${sourceLabel}</span>
          </div>
          ${fatalitiesSection}
          ${actorsSection}
        </div>
        ${event.title ? `<p class="popup-description">${(0, sanitize_1.escapeHtml)(event.title)}</p>` : ''}
        ${tagsSection}
        ${relatedHotspots}
      </div>
    `;
    }
    renderProtestClusterPopup(data) {
        const totalCount = data.count ?? data.items.length;
        const riots = data.riotCount ?? data.items.filter(e => e.eventType === 'riot').length;
        const highSeverity = data.highSeverityCount ?? data.items.filter(e => e.severity === 'high').length;
        const verified = data.verifiedCount ?? data.items.filter(e => e.validated).length;
        const totalFatalities = data.totalFatalities ?? data.items.reduce((sum, e) => sum + (e.fatalities || 0), 0);
        const sortedItems = [...data.items].sort((a, b) => {
            const severityOrder = { high: 0, medium: 1, low: 2 };
            const typeOrder = { riot: 0, civil_unrest: 1, strike: 2, demonstration: 3, protest: 4 };
            const sevDiff = (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3);
            if (sevDiff !== 0)
                return sevDiff;
            return (typeOrder[a.eventType] ?? 5) - (typeOrder[b.eventType] ?? 5);
        });
        const listItems = sortedItems.slice(0, 10).map(event => {
            const icon = event.eventType === 'riot' ? '🔥' : event.eventType === 'strike' ? '✊' : '📢';
            const sevClass = event.severity;
            const dateStr = event.time.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            const city = event.city ? (0, sanitize_1.escapeHtml)(event.city) : '';
            const title = event.title ? `: ${(0, sanitize_1.escapeHtml)(event.title.slice(0, 40))}${event.title.length > 40 ? '...' : ''}` : '';
            return `<li class="cluster-item ${sevClass}">${icon} ${dateStr}${city ? ` • ${city}` : ''}${title}</li>`;
        }).join('');
        const renderedCount = Math.min(10, data.items.length);
        const remainingCount = Math.max(0, totalCount - renderedCount);
        const moreCount = remainingCount > 0 ? `<li class="cluster-more">+${remainingCount} ${(0, i18n_1.t)('popups.moreEvents')}</li>` : '';
        const headerClass = highSeverity > 0 ? 'high' : riots > 0 ? 'medium' : 'low';
        return `
      <div class="popup-header protest ${headerClass} cluster">
        <span class="popup-title">📢 ${(0, sanitize_1.escapeHtml)(data.country)}</span>
        <span class="popup-badge">${totalCount} ${(0, i18n_1.t)('popups.events').toUpperCase()}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body cluster-popup">
        <div class="cluster-summary">
          ${riots ? `<span class="summary-item riot">🔥 ${riots} ${(0, i18n_1.t)('popups.protest.riots')}</span>` : ''}
          ${highSeverity ? `<span class="summary-item high">⚠️ ${highSeverity} ${(0, i18n_1.t)('popups.protest.highSeverity')}</span>` : ''}
          ${verified ? `<span class="summary-item verified">✓ ${verified} ${(0, i18n_1.t)('popups.verified')}</span>` : ''}
          ${totalFatalities > 0 ? `<span class="summary-item fatalities">💀 ${totalFatalities} ${(0, i18n_1.t)('popups.fatalities')}</span>` : ''}
        </div>
        <ul class="cluster-list">${listItems}${moreCount}</ul>
        ${data.sampled ? `<p class="popup-more">${(0, i18n_1.t)('popups.sampledList', { count: data.items.length })}</p>` : ''}
      </div>
    `;
    }
    renderFlightPopup(delay) {
        const severityClass = (0, sanitize_1.escapeHtml)(delay.severity);
        const severityLabel = (0, sanitize_1.escapeHtml)(delay.severity.toUpperCase());
        const delayTypeLabels = {
            'ground_stop': (0, i18n_1.t)('popups.flight.groundStop'),
            'ground_delay': (0, i18n_1.t)('popups.flight.groundDelay'),
            'departure_delay': (0, i18n_1.t)('popups.flight.departureDelay'),
            'arrival_delay': (0, i18n_1.t)('popups.flight.arrivalDelay'),
            'general': (0, i18n_1.t)('popups.flight.delaysReported'),
            'closure': (0, i18n_1.t)('popups.flight.closure'),
        };
        const delayTypeLabel = delayTypeLabels[delay.delayType] || (0, i18n_1.t)('popups.flight.delays');
        const icon = delay.delayType === 'closure' ? '🚫' : delay.delayType === 'ground_stop' ? '🛑' : delay.severity === 'severe' ? '✈️' : '🛫';
        const sourceLabels = {
            'faa': (0, i18n_1.t)('popups.flight.sources.faa'),
            'eurocontrol': (0, i18n_1.t)('popups.flight.sources.eurocontrol'),
            'computed': (0, i18n_1.t)('popups.flight.sources.computed'),
        };
        const sourceLabel = sourceLabels[delay.source] || (0, sanitize_1.escapeHtml)(delay.source);
        const regionLabels = {
            'americas': (0, i18n_1.t)('popups.flight.regions.americas'),
            'europe': (0, i18n_1.t)('popups.flight.regions.europe'),
            'apac': (0, i18n_1.t)('popups.flight.regions.apac'),
            'mena': (0, i18n_1.t)('popups.flight.regions.mena'),
            'africa': (0, i18n_1.t)('popups.flight.regions.africa'),
        };
        const regionLabel = regionLabels[delay.region] || (0, sanitize_1.escapeHtml)(delay.region);
        const avgDelaySection = delay.avgDelayMinutes > 0
            ? `<div class="popup-stat"><span class="stat-label">${(0, i18n_1.t)('popups.flight.avgDelay')}</span><span class="stat-value alert">+${delay.avgDelayMinutes} ${(0, i18n_1.t)('popups.timeUnits.m')}</span></div>`
            : '';
        const reasonSection = delay.reason
            ? `<div class="popup-stat"><span class="stat-label">${(0, i18n_1.t)('popups.reason')}</span><span class="stat-value">${(0, sanitize_1.escapeHtml)(delay.reason)}</span></div>`
            : '';
        const cancelledSection = delay.cancelledFlights
            ? `<div class="popup-stat"><span class="stat-label">${(0, i18n_1.t)('popups.flight.cancelled')}</span><span class="stat-value alert">${delay.cancelledFlights} ${(0, i18n_1.t)('popups.events')}</span></div>`
            : '';
        return `
      <div class="popup-header flight ${severityClass}">
        <span class="popup-icon">${icon}</span>
        <span class="popup-title">${(0, sanitize_1.escapeHtml)(delay.iata)} - ${delayTypeLabel}</span>
        <span class="popup-badge ${severityClass}">${severityLabel}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-subtitle">${(0, sanitize_1.escapeHtml)(delay.name)}</div>
        <div class="popup-location">${(0, sanitize_1.escapeHtml)(delay.city)}, ${(0, sanitize_1.escapeHtml)(delay.country)}</div>
        <div class="popup-stats">
          ${avgDelaySection}
          ${reasonSection}
          ${cancelledSection}
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.region')}</span>
            <span class="stat-value">${regionLabel}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.source')}</span>
            <span class="stat-value">${sourceLabel}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.updated')}</span>
            <span class="stat-value">${delay.updatedAt.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    `;
    }
    renderAPTPopup(apt) {
        return `
      <div class="popup-header apt">
        <span class="popup-title">${(0, sanitize_1.escapeHtml)(apt.name)}</span>
        <span class="popup-badge high">${(0, i18n_1.t)('popups.threat')}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-subtitle">${(0, i18n_1.t)('popups.aka')}: ${(0, sanitize_1.escapeHtml)(apt.aka)}</div>
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.sponsor')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(apt.sponsor)}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.origin')}</span>
            <span class="stat-value">${apt.lat.toFixed(1)}°, ${apt.lon.toFixed(1)}°</span>
          </div>
        </div>
        <p class="popup-description">${(0, i18n_1.t)('popups.apt.description')}</p>
      </div>
    `;
    }
    renderCyberThreatPopup(threat) {
        const severityClass = (0, sanitize_1.escapeHtml)(threat.severity);
        const sourceLabels = {
            feodo: 'Feodo Tracker',
            urlhaus: 'URLhaus',
            c2intel: 'C2 Intel Feeds',
            otx: 'AlienVault OTX',
            abuseipdb: 'AbuseIPDB',
        };
        const sourceLabel = sourceLabels[threat.source] || threat.source;
        const typeLabel = threat.type.replace(/_/g, ' ').toUpperCase();
        const tags = (threat.tags || []).slice(0, 6);
        return `
      <div class="popup-header apt ${severityClass}">
        <span class="popup-title">${(0, i18n_1.t)('popups.cyberThreat.title')}</span>
        <span class="popup-badge ${severityClass}">${(0, sanitize_1.escapeHtml)(threat.severity.toUpperCase())}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-subtitle">${(0, sanitize_1.escapeHtml)(typeLabel)}</div>
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${(0, sanitize_1.escapeHtml)(threat.indicatorType.toUpperCase())}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(threat.indicator)}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.country')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(threat.country || (0, i18n_1.t)('popups.unknown'))}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.source')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(sourceLabel)}</span>
          </div>
          ${threat.malwareFamily ? `<div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.malware')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(threat.malwareFamily)}</span>
          </div>` : ''}
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.lastSeen')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(threat.lastSeen ? new Date(threat.lastSeen).toLocaleString() : (0, i18n_1.t)('popups.unknown'))}</span>
          </div>
        </div>
        ${tags.length > 0 ? `
        <div class="popup-tags">
          ${tags.map((tag) => `<span class="popup-tag">${(0, sanitize_1.escapeHtml)(tag)}</span>`).join('')}
        </div>` : ''}
      </div>
    `;
    }
    renderNuclearPopup(facility) {
        const typeLabels = {
            'plant': (0, i18n_1.t)('popups.nuclear.types.plant'),
            'enrichment': (0, i18n_1.t)('popups.nuclear.types.enrichment'),
            'weapons': (0, i18n_1.t)('popups.nuclear.types.weapons'),
            'research': (0, i18n_1.t)('popups.nuclear.types.research'),
        };
        const statusColors = {
            'active': 'elevated',
            'contested': 'high',
            'decommissioned': 'low',
        };
        return `
      <div class="popup-header nuclear">
        <span class="popup-title">${(0, sanitize_1.escapeHtml)(facility.name.toUpperCase())}</span>
        <span class="popup-badge ${statusColors[facility.status] || 'low'}">${(0, sanitize_1.escapeHtml)(facility.status.toUpperCase())}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.type')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(typeLabels[facility.type] || facility.type.toUpperCase())}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.status')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(facility.status.toUpperCase())}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.coordinates')}</span>
            <span class="stat-value">${facility.lat.toFixed(2)}°, ${facility.lon.toFixed(2)}°</span>
          </div>
        </div>
        <p class="popup-description">${(0, i18n_1.t)('popups.nuclear.description')}</p>
      </div>
    `;
    }
    renderEconomicPopup(center) {
        const typeLabels = {
            'exchange': (0, i18n_1.t)('popups.economic.types.exchange'),
            'central-bank': (0, i18n_1.t)('popups.economic.types.centralBank'),
            'financial-hub': (0, i18n_1.t)('popups.economic.types.financialHub'),
        };
        const typeIcons = {
            'exchange': '📈',
            'central-bank': '🏛',
            'financial-hub': '💰',
        };
        const marketStatus = center.marketHours ? this.getMarketStatus(center.marketHours) : null;
        const marketStatusLabel = marketStatus
            ? marketStatus === 'open'
                ? (0, i18n_1.t)('popups.open')
                : marketStatus === 'closed'
                    ? (0, i18n_1.t)('popups.economic.closed')
                    : (0, i18n_1.t)('popups.unknown')
            : '';
        return `
      <div class="popup-header economic ${center.type}">
        <span class="popup-title">${typeIcons[center.type] || ''} ${(0, sanitize_1.escapeHtml)(center.name.toUpperCase())}</span>
        <span class="popup-badge ${marketStatus === 'open' ? 'elevated' : 'low'}">${(0, sanitize_1.escapeHtml)(marketStatusLabel || typeLabels[center.type] || '')}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        ${center.description ? `<p class="popup-description">${(0, sanitize_1.escapeHtml)(center.description)}</p>` : ''}
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.type')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(typeLabels[center.type] || center.type.toUpperCase())}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.country')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(center.country)}</span>
          </div>
          ${center.marketHours ? `
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.tradingHours')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(center.marketHours.open)} - ${(0, sanitize_1.escapeHtml)(center.marketHours.close)}</span>
          </div>
          ` : ''}
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.coordinates')}</span>
            <span class="stat-value">${center.lat.toFixed(2)}°, ${center.lon.toFixed(2)}°</span>
          </div>
        </div>
      </div>
    `;
    }
    renderIrradiatorPopup(irradiator) {
        return `
      <div class="popup-header irradiator">
        <span class="popup-title">☢ ${(0, sanitize_1.escapeHtml)(irradiator.city.toUpperCase())}</span>
        <span class="popup-badge elevated">${(0, i18n_1.t)('popups.gamma')}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-subtitle">${(0, i18n_1.t)('popups.irradiator.subtitle')}</div>
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.country')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(irradiator.country)}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.city')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(irradiator.city)}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.coordinates')}</span>
            <span class="stat-value">${irradiator.lat.toFixed(2)}°, ${irradiator.lon.toFixed(2)}°</span>
          </div>
        </div>
        <p class="popup-description">${(0, i18n_1.t)('popups.irradiator.description')}</p>
      </div>
    `;
    }
    renderPipelinePopup(pipeline) {
        const typeLabels = {
            'oil': (0, i18n_1.t)('popups.pipeline.types.oil'),
            'gas': (0, i18n_1.t)('popups.pipeline.types.gas'),
            'products': (0, i18n_1.t)('popups.pipeline.types.products'),
        };
        const typeColors = {
            'oil': 'high',
            'gas': 'elevated',
            'products': 'low',
        };
        const statusLabels = {
            'operating': (0, i18n_1.t)('popups.pipeline.status.operating'),
            'construction': (0, i18n_1.t)('popups.pipeline.status.construction'),
        };
        const typeIcon = pipeline.type === 'oil' ? '🛢' : pipeline.type === 'gas' ? '🔥' : '⛽';
        return `
      <div class="popup-header pipeline ${pipeline.type}">
        <span class="popup-title">${typeIcon} ${(0, sanitize_1.escapeHtml)(pipeline.name.toUpperCase())}</span>
        <span class="popup-badge ${typeColors[pipeline.type] || 'low'}">${(0, sanitize_1.escapeHtml)(pipeline.type.toUpperCase())}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-subtitle">${typeLabels[pipeline.type] || (0, i18n_1.t)('popups.pipeline.title')}</div>
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.status')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(statusLabels[pipeline.status] || pipeline.status.toUpperCase())}</span>
          </div>
          ${pipeline.capacity ? `
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.capacity')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(pipeline.capacity)}</span>
          </div>
          ` : ''}
          ${pipeline.length ? `
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.length')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(pipeline.length)}</span>
          </div>
          ` : ''}
          ${pipeline.operator ? `
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.operator')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(pipeline.operator)}</span>
          </div>
          ` : ''}
        </div>
        ${pipeline.countries && pipeline.countries.length > 0 ? `
          <div class="popup-section">
            <span class="section-label">${(0, i18n_1.t)('popups.countries')}</span>
            <div class="popup-tags">
              ${pipeline.countries.map(c => `<span class="popup-tag">${(0, sanitize_1.escapeHtml)(c)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        <p class="popup-description">${(0, i18n_1.t)('popups.pipeline.description', { type: pipeline.type, status: pipeline.status === 'operating' ? (0, i18n_1.t)('popups.pipelineStatusDesc.operating') : (0, i18n_1.t)('popups.pipelineStatusDesc.construction') })}</p>
      </div>
    `;
    }
    renderCablePopup(cable) {
        const advisory = this.getLatestCableAdvisory(cable.id);
        const repairShip = this.getPriorityRepairShip(cable.id);
        const healthRecord = (0, cable_health_1.getCableHealthRecord)(cable.id);
        // Health data takes priority over advisory for status display
        let statusLabel;
        let statusBadge;
        if (healthRecord?.status === 'fault') {
            statusLabel = (0, i18n_1.t)('popups.cable.fault');
            statusBadge = 'high';
        }
        else if (healthRecord?.status === 'degraded') {
            statusLabel = (0, i18n_1.t)('popups.cable.degraded');
            statusBadge = 'elevated';
        }
        else if (advisory) {
            statusLabel = advisory.severity === 'fault' ? (0, i18n_1.t)('popups.cable.fault') : (0, i18n_1.t)('popups.cable.degraded');
            statusBadge = advisory.severity === 'fault' ? 'high' : 'elevated';
        }
        else {
            statusLabel = (0, i18n_1.t)('popups.cable.active');
            statusBadge = 'low';
        }
        const repairEta = repairShip?.eta || advisory?.repairEta;
        const cableName = (0, sanitize_1.escapeHtml)(cable.name.toUpperCase());
        const safeStatusLabel = (0, sanitize_1.escapeHtml)(statusLabel);
        const safeRepairEta = repairEta ? (0, sanitize_1.escapeHtml)(repairEta) : '';
        const advisoryTitle = advisory ? (0, sanitize_1.escapeHtml)(advisory.title) : '';
        const advisoryImpact = advisory ? (0, sanitize_1.escapeHtml)(advisory.impact) : '';
        const advisoryDescription = advisory ? (0, sanitize_1.escapeHtml)(advisory.description) : '';
        const repairShipName = repairShip ? (0, sanitize_1.escapeHtml)(repairShip.name) : '';
        const repairShipNote = repairShip ? (0, sanitize_1.escapeHtml)(repairShip.note || (0, i18n_1.t)('popups.repairShip.note')) : '';
        return `
      <div class="popup-header cable">
        <span class="popup-title">🌐 ${cableName}</span>
        <span class="popup-badge ${statusBadge}">${cable.major ? (0, i18n_1.t)('popups.cable.major') : (0, i18n_1.t)('popups.cable.cable')}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-subtitle">${(0, i18n_1.t)('popups.cable.subtitle')}</div>
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.type')}</span>
            <span class="stat-value">${(0, i18n_1.t)('popups.cable.type')}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.waypoints')}</span>
            <span class="stat-value">${cable.points.length}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.status')}</span>
            <span class="stat-value">${safeStatusLabel}</span>
          </div>
          ${repairEta ? `
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.repairEta')}</span>
            <span class="stat-value">${safeRepairEta}</span>
          </div>
          ` : ''}
        </div>
        ${advisory ? `
          <div class="popup-section">
            <span class="section-label">${(0, i18n_1.t)('popups.cable.advisory')}</span>
            <div class="popup-tags">
              <span class="popup-tag">${advisoryTitle}</span>
              <span class="popup-tag">${advisoryImpact}</span>
            </div>
            <p class="popup-description">${advisoryDescription}</p>
          </div>
        ` : ''}
        ${repairShip ? `
          <div class="popup-section">
            <span class="section-label">${(0, i18n_1.t)('popups.cable.repairDeployment')}</span>
            <div class="popup-tags">
              <span class="popup-tag">${repairShipName}</span>
              <span class="popup-tag">${repairShip.status === 'on-station' ? (0, i18n_1.t)('popups.cable.repairStatus.onStation') : (0, i18n_1.t)('popups.cable.repairStatus.enRoute')}</span>
            </div>
            <p class="popup-description">${repairShipNote}</p>
          </div>
        ` : ''}
        ${healthRecord?.evidence?.length ? `
          <div class="popup-section">
            <span class="section-label">${(0, i18n_1.t)('popups.cable.health.evidence')}</span>
            <ul class="evidence-list">
              ${healthRecord.evidence.map((e) => `<li class="evidence-item"><strong>${(0, sanitize_1.escapeHtml)(e.source)}</strong>: ${(0, sanitize_1.escapeHtml)(e.summary)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        <p class="popup-description">${(0, i18n_1.t)('popups.cable.description')}</p>
      </div>
    `;
    }
    renderCableAdvisoryPopup(advisory) {
        const cable = config_1.UNDERSEA_CABLES.find((item) => item.id === advisory.cableId);
        const timeAgo = this.getTimeAgo(advisory.reported);
        const statusLabel = advisory.severity === 'fault' ? (0, i18n_1.t)('popups.cable.fault') : (0, i18n_1.t)('popups.cable.degraded');
        const cableName = (0, sanitize_1.escapeHtml)(cable?.name.toUpperCase() || advisory.cableId.toUpperCase());
        const advisoryTitle = (0, sanitize_1.escapeHtml)(advisory.title);
        const advisoryImpact = (0, sanitize_1.escapeHtml)(advisory.impact);
        const advisoryEta = advisory.repairEta ? (0, sanitize_1.escapeHtml)(advisory.repairEta) : '';
        const advisoryDescription = (0, sanitize_1.escapeHtml)(advisory.description);
        return `
      <div class="popup-header cable">
        <span class="popup-title">🚨 ${cableName}</span>
        <span class="popup-badge ${advisory.severity === 'fault' ? 'high' : 'elevated'}">${statusLabel}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-subtitle">${advisoryTitle}</div>
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.cableAdvisory.reported')}</span>
            <span class="stat-value">${timeAgo}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.cableAdvisory.impact')}</span>
            <span class="stat-value">${advisoryImpact}</span>
          </div>
          ${advisory.repairEta ? `
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.cableAdvisory.eta')}</span>
            <span class="stat-value">${advisoryEta}</span>
          </div>
          ` : ''}
        </div>
        <p class="popup-description">${advisoryDescription}</p>
      </div>
    `;
    }
    renderRepairShipPopup(ship) {
        const cable = config_1.UNDERSEA_CABLES.find((item) => item.id === ship.cableId);
        const shipName = (0, sanitize_1.escapeHtml)(ship.name.toUpperCase());
        const cableLabel = (0, sanitize_1.escapeHtml)(cable?.name || ship.cableId);
        const shipEta = (0, sanitize_1.escapeHtml)(ship.eta);
        const shipOperator = ship.operator ? (0, sanitize_1.escapeHtml)(ship.operator) : '';
        const shipNote = (0, sanitize_1.escapeHtml)(ship.note || (0, i18n_1.t)('popups.repairShip.description'));
        return `
      <div class="popup-header cable">
        <span class="popup-title">🚢 ${shipName}</span>
        <span class="popup-badge elevated">${(0, i18n_1.t)('popups.repairShip.badge')}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-subtitle">${cableLabel}</div>
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.status')}</span>
            <span class="stat-value">${ship.status === 'on-station' ? (0, i18n_1.t)('popups.repairShip.status.onStation') : (0, i18n_1.t)('popups.repairShip.status.enRoute')}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.cableAdvisory.eta')}</span>
            <span class="stat-value">${shipEta}</span>
          </div>
          ${ship.operator ? `
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.operator')}</span>
            <span class="stat-value">${shipOperator}</span>
          </div>
          ` : ''}
        </div>
        <p class="popup-description">${shipNote}</p>
      </div>
    `;
    }
    getLatestCableAdvisory(cableId) {
        const advisories = this.cableAdvisories.filter((item) => item.cableId === cableId);
        return advisories.reduce((latest, advisory) => {
            if (!latest)
                return advisory;
            return advisory.reported.getTime() > latest.reported.getTime() ? advisory : latest;
        }, undefined);
    }
    getPriorityRepairShip(cableId) {
        const ships = this.repairShips.filter((item) => item.cableId === cableId);
        if (ships.length === 0)
            return undefined;
        const onStation = ships.find((ship) => ship.status === 'on-station');
        return onStation || ships[0];
    }
    renderOutagePopup(outage) {
        const severityColors = {
            'total': 'high',
            'major': 'elevated',
            'partial': 'low',
        };
        const severityLabels = {
            'total': (0, i18n_1.t)('popups.outage.levels.total'),
            'major': (0, i18n_1.t)('popups.outage.levels.major'),
            'partial': (0, i18n_1.t)('popups.outage.levels.partial'),
        };
        const timeAgo = this.getTimeAgo(outage.pubDate);
        const severityClass = (0, sanitize_1.escapeHtml)(outage.severity);
        return `
      <div class="popup-header outage ${severityClass}">
        <span class="popup-title">📡 ${(0, sanitize_1.escapeHtml)(outage.country.toUpperCase())}</span>
        <span class="popup-badge ${severityColors[outage.severity] || 'low'}">${severityLabels[outage.severity] || (0, i18n_1.t)('popups.outage.levels.disruption')}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-subtitle">${(0, sanitize_1.escapeHtml)(outage.title)}</div>
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.severity')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(outage.severity.toUpperCase())}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.outage.reported')}</span>
            <span class="stat-value">${timeAgo}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.coordinates')}</span>
            <span class="stat-value">${outage.lat.toFixed(2)}°, ${outage.lon.toFixed(2)}°</span>
          </div>
        </div>
        ${outage.categories && outage.categories.length > 0 ? `
          <div class="popup-section">
            <span class="section-label">${(0, i18n_1.t)('popups.outage.categories')}</span>
            <div class="popup-tags">
              ${outage.categories.slice(0, 5).map(c => `<span class="popup-tag">${(0, sanitize_1.escapeHtml)(c)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        <p class="popup-description">${(0, sanitize_1.escapeHtml)(outage.description.slice(0, 250))}${outage.description.length > 250 ? '...' : ''}</p>
        <a href="${(0, sanitize_1.sanitizeUrl)(outage.link)}" target="_blank" class="popup-link">${(0, i18n_1.t)('popups.outage.readReport')} →</a>
      </div>
    `;
    }
    renderDatacenterPopup(dc) {
        const statusColors = {
            'existing': 'normal',
            'planned': 'elevated',
            'decommissioned': 'low',
        };
        const statusLabels = {
            'existing': (0, i18n_1.t)('popups.datacenter.status.existing'),
            'planned': (0, i18n_1.t)('popups.datacenter.status.planned'),
            'decommissioned': (0, i18n_1.t)('popups.datacenter.status.decommissioned'),
        };
        const formatNumber = (n) => {
            if (n >= 1000000)
                return `${(n / 1000000).toFixed(1)}M`;
            if (n >= 1000)
                return `${(n / 1000).toFixed(0)}K`;
            return n.toString();
        };
        return `
      <div class="popup-header datacenter ${dc.status}">
        <span class="popup-title">🖥️ ${(0, sanitize_1.escapeHtml)(dc.name)}</span>
        <span class="popup-badge ${statusColors[dc.status] || 'normal'}">${statusLabels[dc.status] || (0, i18n_1.t)('popups.datacenter.status.unknown')}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-subtitle">${(0, sanitize_1.escapeHtml)(dc.owner)} • ${(0, sanitize_1.escapeHtml)(dc.country)}</div>
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.datacenter.gpuChipCount')}</span>
            <span class="stat-value">${formatNumber(dc.chipCount)}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.datacenter.chipType')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(dc.chipType || (0, i18n_1.t)('popups.unknown'))}</span>
          </div>
          ${dc.powerMW ? `
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.datacenter.power')}</span>
            <span class="stat-value">${dc.powerMW.toFixed(0)} MW</span>
          </div>
          ` : ''}
          ${dc.sector ? `
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.datacenter.sector')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(dc.sector)}</span>
          </div>
          ` : ''}
        </div>
        ${dc.note ? `<p class="popup-description">${(0, sanitize_1.escapeHtml)(dc.note)}</p>` : ''}
        <div class="popup-attribution">${(0, i18n_1.t)('popups.datacenter.attribution')}</div>
      </div>
    `;
    }
    renderDatacenterClusterPopup(data) {
        const totalCount = data.count ?? data.items.length;
        const totalChips = data.totalChips ?? data.items.reduce((sum, dc) => sum + dc.chipCount, 0);
        const totalPower = data.totalPowerMW ?? data.items.reduce((sum, dc) => sum + (dc.powerMW || 0), 0);
        const existingCount = data.existingCount ?? data.items.filter(dc => dc.status === 'existing').length;
        const plannedCount = data.plannedCount ?? data.items.filter(dc => dc.status === 'planned').length;
        const formatNumber = (n) => {
            if (n >= 1000000)
                return `${(n / 1000000).toFixed(1)}M`;
            if (n >= 1000)
                return `${(n / 1000).toFixed(0)}K`;
            return n.toString();
        };
        const dcListHtml = data.items.slice(0, 8).map(dc => `
      <div class="cluster-item">
        <span class="cluster-item-icon">${dc.status === 'planned' ? '🔨' : '🖥️'}</span>
        <div class="cluster-item-info">
          <span class="cluster-item-name">${(0, sanitize_1.escapeHtml)(dc.name.slice(0, 40))}${dc.name.length > 40 ? '...' : ''}</span>
          <span class="cluster-item-detail">${(0, sanitize_1.escapeHtml)(dc.owner)} • ${formatNumber(dc.chipCount)} ${(0, i18n_1.t)('popups.datacenter.chips')}</span>
        </div>
      </div>
    `).join('');
        return `
      <div class="popup-header datacenter cluster">
        <span class="popup-title">🖥️ ${(0, i18n_1.t)('popups.datacenter.cluster.title', { count: String(totalCount) })}</span>
        <span class="popup-badge elevated">${(0, sanitize_1.escapeHtml)(data.region)}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-subtitle">${(0, sanitize_1.escapeHtml)(data.country)}</div>
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.datacenter.cluster.totalChips')}</span>
            <span class="stat-value">${formatNumber(totalChips)}</span>
          </div>
          ${totalPower > 0 ? `
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.datacenter.cluster.totalPower')}</span>
            <span class="stat-value">${totalPower.toFixed(0)} MW</span>
          </div>
          ` : ''}
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.datacenter.cluster.operational')}</span>
            <span class="stat-value">${existingCount}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.datacenter.cluster.planned')}</span>
            <span class="stat-value">${plannedCount}</span>
          </div>
        </div>
        <div class="cluster-list">
          ${dcListHtml}
        </div>
        ${totalCount > 8 ? `<p class="popup-more">${(0, i18n_1.t)('popups.datacenter.cluster.moreDataCenters', { count: String(Math.max(0, totalCount - 8)) })}</p>` : ''}
        ${data.sampled ? `<p class="popup-more">${(0, i18n_1.t)('popups.datacenter.cluster.sampledSites', { count: String(data.items.length) })}</p>` : ''}
        <div class="popup-attribution">${(0, i18n_1.t)('popups.datacenter.attribution')}</div>
      </div>
    `;
    }
    renderStartupHubPopup(hub) {
        const tierLabels = {
            'mega': (0, i18n_1.t)('popups.startupHub.tiers.mega'),
            'major': (0, i18n_1.t)('popups.startupHub.tiers.major'),
            'emerging': (0, i18n_1.t)('popups.startupHub.tiers.emerging'),
        };
        const tierIcons = { 'mega': '🦄', 'major': '🚀', 'emerging': '💡' };
        return `
      <div class="popup-header startup-hub ${hub.tier}">
        <span class="popup-title">${tierIcons[hub.tier] || '🚀'} ${(0, sanitize_1.escapeHtml)(hub.name)}</span>
        <span class="popup-badge ${hub.tier}">${tierLabels[hub.tier] || (0, i18n_1.t)('popups.startupHub.tiers.hub')}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-subtitle">${(0, sanitize_1.escapeHtml)(hub.city)}, ${(0, sanitize_1.escapeHtml)(hub.country)}</div>
        ${hub.unicorns ? `
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.startupHub.unicorns')}</span>
            <span class="stat-value">${hub.unicorns}+</span>
          </div>
        </div>
        ` : ''}
        ${hub.description ? `<p class="popup-description">${(0, sanitize_1.escapeHtml)(hub.description)}</p>` : ''}
      </div>
    `;
    }
    renderCloudRegionPopup(region) {
        const providerNames = { 'aws': 'Amazon Web Services', 'gcp': 'Google Cloud Platform', 'azure': 'Microsoft Azure', 'cloudflare': 'Cloudflare' };
        const providerIcons = { 'aws': '🟠', 'gcp': '🔵', 'azure': '🟣', 'cloudflare': '🟡' };
        return `
      <div class="popup-header cloud-region ${region.provider}">
        <span class="popup-title">${providerIcons[region.provider] || '☁️'} ${(0, sanitize_1.escapeHtml)(region.name)}</span>
        <span class="popup-badge ${region.provider}">${(0, sanitize_1.escapeHtml)(region.provider.toUpperCase())}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-subtitle">${(0, sanitize_1.escapeHtml)(region.city)}, ${(0, sanitize_1.escapeHtml)(region.country)}</div>
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.cloudRegion.provider')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(providerNames[region.provider] || region.provider)}</span>
          </div>
          ${region.zones ? `
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.cloudRegion.availabilityZones')}</span>
            <span class="stat-value">${region.zones}</span>
          </div>
          ` : ''}
        </div>
      </div>
    `;
    }
    renderTechHQPopup(hq) {
        const typeLabels = {
            'faang': (0, i18n_1.t)('popups.techHQ.types.faang'),
            'unicorn': (0, i18n_1.t)('popups.techHQ.types.unicorn'),
            'public': (0, i18n_1.t)('popups.techHQ.types.public'),
        };
        const typeIcons = { 'faang': '🏛️', 'unicorn': '🦄', 'public': '🏢' };
        return `
      <div class="popup-header tech-hq ${hq.type}">
        <span class="popup-title">${typeIcons[hq.type] || '🏢'} ${(0, sanitize_1.escapeHtml)(hq.company)}</span>
        <span class="popup-badge ${hq.type}">${typeLabels[hq.type] || (0, i18n_1.t)('popups.techHQ.types.tech')}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-subtitle">${(0, sanitize_1.escapeHtml)(hq.city)}, ${(0, sanitize_1.escapeHtml)(hq.country)}</div>
        <div class="popup-stats">
          ${hq.marketCap ? `
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.techHQ.marketCap')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(hq.marketCap)}</span>
          </div>
          ` : ''}
          ${hq.employees ? `
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.techHQ.employees')}</span>
            <span class="stat-value">${hq.employees.toLocaleString()}</span>
          </div>
          ` : ''}
        </div>
      </div>
    `;
    }
    renderAcceleratorPopup(acc) {
        const typeLabels = {
            'accelerator': (0, i18n_1.t)('popups.accelerator.types.accelerator'),
            'incubator': (0, i18n_1.t)('popups.accelerator.types.incubator'),
            'studio': (0, i18n_1.t)('popups.accelerator.types.studio'),
        };
        const typeIcons = { 'accelerator': '🎯', 'incubator': '🔬', 'studio': '🎨' };
        return `
      <div class="popup-header accelerator ${acc.type}">
        <span class="popup-title">${typeIcons[acc.type] || '🎯'} ${(0, sanitize_1.escapeHtml)(acc.name)}</span>
        <span class="popup-badge ${acc.type}">${typeLabels[acc.type] || (0, i18n_1.t)('popups.accelerator.types.accelerator')}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-subtitle">${(0, sanitize_1.escapeHtml)(acc.city)}, ${(0, sanitize_1.escapeHtml)(acc.country)}</div>
        <div class="popup-stats">
          ${acc.founded ? `
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.accelerator.founded')}</span>
            <span class="stat-value">${acc.founded}</span>
          </div>
          ` : ''}
        </div>
        ${acc.notable && acc.notable.length > 0 ? `
        <div class="popup-notable">
          <span class="notable-label">${(0, i18n_1.t)('popups.accelerator.notableAlumni')}</span>
          <span class="notable-list">${acc.notable.map(n => (0, sanitize_1.escapeHtml)(n)).join(', ')}</span>
        </div>
        ` : ''}
      </div>
    `;
    }
    renderTechEventPopup(event) {
        const startDate = new Date(event.startDate);
        const endDate = new Date(event.endDate);
        const dateStr = startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        const endDateStr = endDate > startDate && endDate.toDateString() !== startDate.toDateString()
            ? ` - ${endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
            : '';
        const urgencyClass = event.daysUntil <= 7 ? 'urgent' : event.daysUntil <= 30 ? 'soon' : '';
        const daysLabel = event.daysUntil === 0
            ? (0, i18n_1.t)('popups.techEvent.days.today')
            : event.daysUntil === 1
                ? (0, i18n_1.t)('popups.techEvent.days.tomorrow')
                : (0, i18n_1.t)('popups.techEvent.days.inDays', { count: String(event.daysUntil) });
        return `
      <div class="popup-header tech-event ${urgencyClass}">
        <span class="popup-title">📅 ${(0, sanitize_1.escapeHtml)(event.title)}</span>
        <span class="popup-badge ${urgencyClass}">${daysLabel}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-subtitle">📍 ${(0, sanitize_1.escapeHtml)(event.location)}, ${(0, sanitize_1.escapeHtml)(event.country)}</div>
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.techEvent.date')}</span>
            <span class="stat-value">${dateStr}${endDateStr}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.location')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(event.location)}</span>
          </div>
        </div>
        ${event.url ? `
        <a href="${(0, sanitize_1.sanitizeUrl)(event.url)}" target="_blank" rel="noopener noreferrer" class="popup-link">
          ${(0, i18n_1.t)('popups.techEvent.moreInformation')} →
        </a>
        ` : ''}
      </div>
    `;
    }
    renderTechHQClusterPopup(data) {
        const totalCount = data.count ?? data.items.length;
        const unicornCount = data.unicornCount ?? data.items.filter(h => h.type === 'unicorn').length;
        const faangCount = data.faangCount ?? data.items.filter(h => h.type === 'faang').length;
        const publicCount = data.publicCount ?? data.items.filter(h => h.type === 'public').length;
        const sortedItems = [...data.items].sort((a, b) => {
            const typeOrder = { faang: 0, unicorn: 1, public: 2 };
            return (typeOrder[a.type] ?? 3) - (typeOrder[b.type] ?? 3);
        });
        const listItems = sortedItems.map(hq => {
            const icon = hq.type === 'faang' ? '🏛️' : hq.type === 'unicorn' ? '🦄' : '🏢';
            const marketCap = hq.marketCap ? ` (${(0, sanitize_1.escapeHtml)(hq.marketCap)})` : '';
            return `<li class="cluster-item ${hq.type}">${icon} ${(0, sanitize_1.escapeHtml)(hq.company)}${marketCap}</li>`;
        }).join('');
        return `
      <div class="popup-header tech-hq cluster">
        <span class="popup-title">🏙️ ${(0, sanitize_1.escapeHtml)(data.city)}</span>
        <span class="popup-badge">${(0, i18n_1.t)('popups.techHQCluster.companiesCount', { count: String(totalCount) })}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body cluster-popup">
        <div class="popup-subtitle">📍 ${(0, sanitize_1.escapeHtml)(data.city)}, ${(0, sanitize_1.escapeHtml)(data.country)}</div>
        <div class="cluster-summary">
          ${faangCount ? `<span class="summary-item faang">🏛️ ${(0, i18n_1.t)('popups.techHQCluster.bigTechCount', { count: String(faangCount) })}</span>` : ''}
          ${unicornCount ? `<span class="summary-item unicorn">🦄 ${(0, i18n_1.t)('popups.techHQCluster.unicornsCount', { count: String(unicornCount) })}</span>` : ''}
          ${publicCount ? `<span class="summary-item public">🏢 ${(0, i18n_1.t)('popups.techHQCluster.publicCount', { count: String(publicCount) })}</span>` : ''}
        </div>
        <ul class="cluster-list">${listItems}</ul>
        ${data.sampled ? `<p class="popup-more">${(0, i18n_1.t)('popups.techHQCluster.sampled', { count: String(data.items.length) })}</p>` : ''}
      </div>
    `;
    }
    renderTechEventClusterPopup(data) {
        const totalCount = data.count ?? data.items.length;
        const upcomingSoon = data.soonCount ?? data.items.filter(e => e.daysUntil <= 14).length;
        const sortedItems = [...data.items].sort((a, b) => a.daysUntil - b.daysUntil);
        const listItems = sortedItems.map(event => {
            const startDate = new Date(event.startDate);
            const dateStr = startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            const urgencyClass = event.daysUntil <= 7 ? 'urgent' : event.daysUntil <= 30 ? 'soon' : '';
            return `<li class="cluster-item ${urgencyClass}">📅 ${dateStr}: ${(0, sanitize_1.escapeHtml)(event.title)}</li>`;
        }).join('');
        return `
      <div class="popup-header tech-event cluster">
        <span class="popup-title">📅 ${(0, sanitize_1.escapeHtml)(data.location)}</span>
        <span class="popup-badge">${(0, i18n_1.t)('popups.techEventCluster.eventsCount', { count: String(totalCount) })}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body cluster-popup">
        <div class="popup-subtitle">📍 ${(0, sanitize_1.escapeHtml)(data.location)}, ${(0, sanitize_1.escapeHtml)(data.country)}</div>
        ${upcomingSoon ? `<div class="cluster-summary"><span class="summary-item soon">⚡ ${(0, i18n_1.t)('popups.techEventCluster.upcomingWithin2Weeks', { count: String(upcomingSoon) })}</span></div>` : ''}
        <ul class="cluster-list">${listItems}</ul>
        ${data.sampled ? `<p class="popup-more">${(0, i18n_1.t)('popups.techEventCluster.sampled', { count: String(data.items.length) })}</p>` : ''}
      </div>
    `;
    }
    getMarketStatus(hours) {
        try {
            const now = new Date();
            const formatter = new Intl.DateTimeFormat(undefined, {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: hours.timezone,
            });
            const currentTime = formatter.format(now);
            const [openH = 0, openM = 0] = hours.open.split(':').map(Number);
            const [closeH = 0, closeM = 0] = hours.close.split(':').map(Number);
            const [currH = 0, currM = 0] = currentTime.split(':').map(Number);
            const openMins = openH * 60 + openM;
            const closeMins = closeH * 60 + closeM;
            const currMins = currH * 60 + currM;
            if (currMins >= openMins && currMins < closeMins) {
                return 'open';
            }
            return 'closed';
        }
        catch {
            return 'unknown';
        }
    }
    renderMilitaryFlightPopup(flight) {
        const operatorLabels = {
            usaf: 'US Air Force',
            usn: 'US Navy',
            usmc: 'US Marines',
            usa: 'US Army',
            raf: 'Royal Air Force',
            rn: 'Royal Navy',
            faf: 'French Air Force',
            gaf: 'German Air Force',
            plaaf: 'PLA Air Force',
            plan: 'PLA Navy',
            vks: 'Russian Aerospace',
            iaf: 'Israeli Air Force',
            nato: 'NATO',
            other: (0, i18n_1.t)('popups.unknown'),
        };
        const typeLabels = {
            fighter: (0, i18n_1.t)('popups.militaryFlight.types.fighter'),
            bomber: (0, i18n_1.t)('popups.militaryFlight.types.bomber'),
            transport: (0, i18n_1.t)('popups.militaryFlight.types.transport'),
            tanker: (0, i18n_1.t)('popups.militaryFlight.types.tanker'),
            awacs: (0, i18n_1.t)('popups.militaryFlight.types.awacs'),
            reconnaissance: (0, i18n_1.t)('popups.militaryFlight.types.reconnaissance'),
            helicopter: (0, i18n_1.t)('popups.militaryFlight.types.helicopter'),
            drone: (0, i18n_1.t)('popups.militaryFlight.types.drone'),
            patrol: (0, i18n_1.t)('popups.militaryFlight.types.patrol'),
            special_ops: (0, i18n_1.t)('popups.militaryFlight.types.specialOps'),
            vip: (0, i18n_1.t)('popups.militaryFlight.types.vip'),
            unknown: (0, i18n_1.t)('popups.unknown'),
        };
        const confidenceColors = {
            high: 'elevated',
            medium: 'low',
            low: 'low',
        };
        const callsign = (0, sanitize_1.escapeHtml)(flight.callsign || (0, i18n_1.t)('popups.unknown'));
        const aircraftTypeBadge = (0, sanitize_1.escapeHtml)(flight.aircraftType.toUpperCase());
        const operatorLabel = (0, sanitize_1.escapeHtml)(operatorLabels[flight.operator] || flight.operatorCountry || (0, i18n_1.t)('popups.unknown'));
        const hexCode = (0, sanitize_1.escapeHtml)(flight.hexCode || '');
        const aircraftType = (0, sanitize_1.escapeHtml)(typeLabels[flight.aircraftType] || flight.aircraftType);
        const squawk = flight.squawk ? (0, sanitize_1.escapeHtml)(flight.squawk) : '';
        const note = flight.note ? (0, sanitize_1.escapeHtml)(flight.note) : '';
        return `
      <div class="popup-header military-flight ${flight.operator}">
        <span class="popup-title">${callsign}</span>
        <span class="popup-badge ${confidenceColors[flight.confidence] || 'low'}">${aircraftTypeBadge}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-subtitle">${operatorLabel}</div>
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.militaryFlight.altitude')}</span>
            <span class="stat-value">${flight.altitude > 0 ? `FL${Math.round(flight.altitude / 100)}` : (0, i18n_1.t)('popups.militaryFlight.ground')}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.militaryFlight.speed')}</span>
            <span class="stat-value">${flight.speed} kts</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.militaryFlight.heading')}</span>
            <span class="stat-value">${Math.round(flight.heading)}°</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.militaryFlight.hexCode')}</span>
            <span class="stat-value">${hexCode}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.type')}</span>
            <span class="stat-value">${aircraftType}</span>
          </div>
          ${flight.squawk ? `
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.militaryFlight.squawk')}</span>
            <span class="stat-value">${squawk}</span>
          </div>
          ` : ''}
        </div>
        ${flight.note ? `<p class="popup-description">${note}</p>` : ''}
        <div class="popup-attribution">${(0, i18n_1.t)('popups.militaryFlight.attribution')}</div>
      </div>
    `;
    }
    renderMilitaryVesselPopup(vessel) {
        const operatorLabels = {
            usn: 'US Navy',
            uscg: 'US Coast Guard',
            rn: 'Royal Navy',
            fn: 'French Navy',
            plan: 'PLA Navy',
            ruf: 'Russian Navy',
            jmsdf: 'Japan Maritime SDF',
            rokn: 'ROK Navy',
            other: (0, i18n_1.t)('popups.unknown'),
        };
        const typeLabels = {
            carrier: 'Aircraft Carrier',
            destroyer: 'Destroyer',
            frigate: 'Frigate',
            submarine: 'Submarine',
            amphibious: 'Amphibious',
            patrol: 'Patrol',
            auxiliary: 'Auxiliary',
            research: 'Research',
            icebreaker: 'Icebreaker',
            special: 'Special',
            unknown: (0, i18n_1.t)('popups.unknown'),
        };
        const darkWarning = vessel.isDark
            ? `<span class="popup-badge high">${(0, i18n_1.t)('popups.militaryVessel.aisDark')}</span>`
            : '';
        // USNI deployment status badge
        const deploymentBadge = vessel.usniDeploymentStatus && vessel.usniDeploymentStatus !== 'unknown'
            ? `<span class="popup-badge ${vessel.usniDeploymentStatus === 'deployed' ? 'high' : vessel.usniDeploymentStatus === 'underway' ? 'elevated' : 'low'}">${vessel.usniDeploymentStatus.toUpperCase().replace('-', ' ')}</span>`
            : '';
        // Show AIS ship type when military type is unknown
        const displayType = vessel.vesselType === 'unknown' && vessel.aisShipType
            ? vessel.aisShipType
            : (typeLabels[vessel.vesselType] || vessel.vesselType);
        const badgeType = vessel.vesselType === 'unknown' && vessel.aisShipType
            ? vessel.aisShipType.toUpperCase()
            : vessel.vesselType.toUpperCase();
        const vesselName = (0, sanitize_1.escapeHtml)(vessel.name || `${(0, i18n_1.t)('popups.militaryVessel.vessel')} ${vessel.mmsi}`);
        const vesselOperator = (0, sanitize_1.escapeHtml)(operatorLabels[vessel.operator] || vessel.operatorCountry || (0, i18n_1.t)('popups.unknown'));
        const vesselTypeLabel = (0, sanitize_1.escapeHtml)(displayType);
        const vesselBadgeType = (0, sanitize_1.escapeHtml)(badgeType);
        const vesselMmsi = (0, sanitize_1.escapeHtml)(vessel.mmsi || '—');
        const vesselHull = vessel.hullNumber ? (0, sanitize_1.escapeHtml)(vessel.hullNumber) : '';
        const vesselNote = vessel.note ? (0, sanitize_1.escapeHtml)(vessel.note) : '';
        return `
      <div class="popup-header military-vessel ${vessel.operator}">
        <span class="popup-title">${vesselName}</span>
        ${darkWarning}
        ${deploymentBadge}
        <span class="popup-badge elevated">${vesselBadgeType}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-subtitle">${vesselOperator}</div>
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.type')}</span>
            <span class="stat-value">${vesselTypeLabel}</span>
          </div>
          ${vessel.usniRegion ? `
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.militaryVessel.region')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(vessel.usniRegion)}</span>
          </div>
          ` : ''}
          ${vessel.usniStrikeGroup ? `
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.militaryVessel.strikeGroup')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(vessel.usniStrikeGroup)}</span>
          </div>
          ` : ''}
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.militaryVessel.speed')}</span>
            <span class="stat-value">${vessel.speed} kts</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.militaryVessel.heading')}</span>
            <span class="stat-value">${Math.round(vessel.heading)}°</span>
          </div>
          ${vessel.mmsi ? `
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.militaryVessel.mmsi')}</span>
            <span class="stat-value">${vesselMmsi}</span>
          </div>
          ` : ''}
          ${vessel.hullNumber ? `
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.militaryVessel.hull')}</span>
            <span class="stat-value">${vesselHull}</span>
          </div>
          ` : ''}
        </div>
        ${vessel.usniActivityDescription ? `<p class="popup-description"><strong>${(0, i18n_1.t)('popups.militaryVessel.usniIntel')}:</strong> ${(0, sanitize_1.escapeHtml)(vessel.usniActivityDescription)}</p>` : ''}
        ${vessel.note ? `<p class="popup-description">${vesselNote}</p>` : ''}
        ${vessel.isDark ? `<p class="popup-description alert">${(0, i18n_1.t)('popups.militaryVessel.darkDescription')}</p>` : ''}
        ${vessel.usniSource ? `<p class="popup-description" style="opacity:0.7;font-size:0.85em">${(0, i18n_1.t)('popups.militaryVessel.approximatePosition')}</p>` : ''}
        ${vessel.usniArticleUrl ? `<div class="popup-attribution"><a href="${(0, sanitize_1.escapeHtml)(vessel.usniArticleUrl)}" target="_blank" rel="noopener">${(0, i18n_1.t)('popups.militaryVessel.usniSource')}${vessel.usniArticleDate ? ` (${new Date(vessel.usniArticleDate).toLocaleDateString()})` : ''}</a></div>` : ''}
      </div>
    `;
    }
    renderMilitaryFlightClusterPopup(cluster) {
        const activityLabels = {
            exercise: (0, i18n_1.t)('popups.militaryCluster.flightActivity.exercise'),
            patrol: (0, i18n_1.t)('popups.militaryCluster.flightActivity.patrol'),
            transport: (0, i18n_1.t)('popups.militaryCluster.flightActivity.transport'),
            unknown: (0, i18n_1.t)('popups.militaryCluster.flightActivity.unknown'),
        };
        const activityColors = {
            exercise: 'high',
            patrol: 'elevated',
            transport: 'low',
            unknown: 'low',
        };
        const activityType = cluster.activityType || 'unknown';
        const clusterName = (0, sanitize_1.escapeHtml)(cluster.name);
        const activityTypeLabel = (0, sanitize_1.escapeHtml)(activityType.toUpperCase());
        const dominantOperator = cluster.dominantOperator ? (0, sanitize_1.escapeHtml)(cluster.dominantOperator.toUpperCase()) : '';
        const flightSummary = cluster.flights
            .slice(0, 5)
            .map(f => `<div class="cluster-flight-item">${(0, sanitize_1.escapeHtml)(f.callsign)} - ${(0, sanitize_1.escapeHtml)(f.aircraftType)}</div>`)
            .join('');
        const moreFlights = cluster.flightCount > 5
            ? `<div class="cluster-more">${(0, i18n_1.t)('popups.militaryCluster.moreAircraft', { count: String(cluster.flightCount - 5) })}</div>`
            : '';
        return `
      <div class="popup-header military-cluster">
        <span class="popup-title">${clusterName}</span>
        <span class="popup-badge ${activityColors[activityType] || 'low'}">${(0, i18n_1.t)('popups.militaryCluster.aircraftCount', { count: String(cluster.flightCount) })}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-subtitle">${activityLabels[activityType] || (0, i18n_1.t)('popups.militaryCluster.flightActivity.unknown')}</div>
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.militaryCluster.aircraft')}</span>
            <span class="stat-value">${cluster.flightCount}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.militaryCluster.activity')}</span>
            <span class="stat-value">${activityTypeLabel}</span>
          </div>
          ${cluster.dominantOperator ? `
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.militaryCluster.primary')}</span>
            <span class="stat-value">${dominantOperator}</span>
          </div>
          ` : ''}
        </div>
        <div class="popup-section">
          <span class="section-label">${(0, i18n_1.t)('popups.militaryCluster.trackedAircraft')}</span>
          <div class="cluster-flights">
            ${flightSummary}
            ${moreFlights}
          </div>
        </div>
      </div>
    `;
    }
    renderMilitaryVesselClusterPopup(cluster) {
        const activityLabels = {
            exercise: (0, i18n_1.t)('popups.militaryCluster.vesselActivity.exercise'),
            deployment: (0, i18n_1.t)('popups.militaryCluster.vesselActivity.deployment'),
            patrol: (0, i18n_1.t)('popups.militaryCluster.vesselActivity.patrol'),
            transit: (0, i18n_1.t)('popups.militaryCluster.vesselActivity.transit'),
            unknown: (0, i18n_1.t)('popups.militaryCluster.vesselActivity.unknown'),
        };
        const activityColors = {
            exercise: 'high',
            deployment: 'high',
            patrol: 'elevated',
            transit: 'low',
            unknown: 'low',
        };
        const activityType = cluster.activityType || 'unknown';
        const clusterName = (0, sanitize_1.escapeHtml)(cluster.name);
        const activityTypeLabel = (0, sanitize_1.escapeHtml)(activityType.toUpperCase());
        const region = cluster.region ? (0, sanitize_1.escapeHtml)(cluster.region) : '';
        const vesselSummary = cluster.vessels
            .slice(0, 5)
            .map(v => `<div class="cluster-vessel-item">${(0, sanitize_1.escapeHtml)(v.name)} - ${(0, sanitize_1.escapeHtml)(v.vesselType)}</div>`)
            .join('');
        const moreVessels = cluster.vesselCount > 5
            ? `<div class="cluster-more">${(0, i18n_1.t)('popups.militaryCluster.moreVessels', { count: String(cluster.vesselCount - 5) })}</div>`
            : '';
        return `
      <div class="popup-header military-cluster">
        <span class="popup-title">${clusterName}</span>
        <span class="popup-badge ${activityColors[activityType] || 'low'}">${(0, i18n_1.t)('popups.militaryCluster.vesselsCount', { count: String(cluster.vesselCount) })}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-subtitle">${activityLabels[activityType] || (0, i18n_1.t)('popups.militaryCluster.vesselActivity.unknown')}</div>
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.militaryCluster.vessels')}</span>
            <span class="stat-value">${cluster.vesselCount}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.militaryCluster.activity')}</span>
            <span class="stat-value">${activityTypeLabel}</span>
          </div>
          ${cluster.region ? `
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.region')}</span>
            <span class="stat-value">${region}</span>
          </div>
          ` : ''}
        </div>
        <div class="popup-section">
          <span class="section-label">${(0, i18n_1.t)('popups.militaryCluster.trackedVessels')}</span>
          <div class="cluster-vessels">
            ${vesselSummary}
            ${moreVessels}
          </div>
        </div>
      </div>
    `;
    }
    renderNaturalEventPopup(event) {
        const categoryColors = {
            severeStorms: 'high',
            wildfires: 'high',
            volcanoes: 'high',
            earthquakes: 'elevated',
            floods: 'elevated',
            landslides: 'elevated',
            drought: 'medium',
            dustHaze: 'low',
            snow: 'low',
            tempExtremes: 'elevated',
            seaLakeIce: 'low',
            waterColor: 'low',
            manmade: 'elevated',
        };
        const icon = (0, eonet_1.getNaturalEventIcon)(event.category);
        const severityClass = categoryColors[event.category] || 'low';
        const timeAgo = this.getTimeAgo(event.date);
        return `
      <div class="popup-header nat-event ${event.category}">
        <span class="popup-icon">${icon}</span>
        <span class="popup-title">${(0, sanitize_1.escapeHtml)(event.categoryTitle.toUpperCase())}</span>
        <span class="popup-badge ${severityClass}">${event.closed ? (0, i18n_1.t)('popups.naturalEvent.closed') : (0, i18n_1.t)('popups.naturalEvent.active')}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-subtitle">${(0, sanitize_1.escapeHtml)(event.title)}</div>
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.naturalEvent.reported')}</span>
            <span class="stat-value">${timeAgo}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.coordinates')}</span>
            <span class="stat-value">${event.lat.toFixed(2)}°, ${event.lon.toFixed(2)}°</span>
          </div>
          ${event.magnitude ? `
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.magnitude')}</span>
            <span class="stat-value">${event.magnitude}${event.magnitudeUnit ? ` ${(0, sanitize_1.escapeHtml)(event.magnitudeUnit)}` : ''}</span>
          </div>
          ` : ''}
          ${event.sourceName ? `
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.source')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(event.sourceName)}</span>
          </div>
          ` : ''}
        </div>
        ${event.description ? `<p class="popup-description">${(0, sanitize_1.escapeHtml)(event.description)}</p>` : ''}
        ${event.sourceUrl ? `<a href="${(0, sanitize_1.sanitizeUrl)(event.sourceUrl)}" target="_blank" class="popup-link">${(0, i18n_1.t)('popups.naturalEvent.viewOnSource', { source: (0, sanitize_1.escapeHtml)(event.sourceName || (0, i18n_1.t)('popups.source')) })} →</a>` : ''}
        <div class="popup-attribution">${(0, i18n_1.t)('popups.naturalEvent.attribution')}</div>
      </div>
    `;
    }
    renderPortPopup(port) {
        const typeLabels = {
            container: (0, i18n_1.t)('popups.port.types.container'),
            oil: (0, i18n_1.t)('popups.port.types.oil'),
            lng: (0, i18n_1.t)('popups.port.types.lng'),
            naval: (0, i18n_1.t)('popups.port.types.naval'),
            mixed: (0, i18n_1.t)('popups.port.types.mixed'),
            bulk: (0, i18n_1.t)('popups.port.types.bulk'),
        };
        const typeColors = {
            container: 'elevated',
            oil: 'high',
            lng: 'high',
            naval: 'elevated',
            mixed: 'normal',
            bulk: 'low',
        };
        const typeIcons = {
            container: '🏭',
            oil: '🛢️',
            lng: '🔥',
            naval: '⚓',
            mixed: '🚢',
            bulk: '📦',
        };
        const rankSection = port.rank
            ? `<div class="popup-stat"><span class="stat-label">${(0, i18n_1.t)('popups.port.worldRank')}</span><span class="stat-value">#${port.rank}</span></div>`
            : '';
        return `
      <div class="popup-header port ${(0, sanitize_1.escapeHtml)(port.type)}">
        <span class="popup-icon">${typeIcons[port.type] || '🚢'}</span>
        <span class="popup-title">${(0, sanitize_1.escapeHtml)(port.name.toUpperCase())}</span>
        <span class="popup-badge ${typeColors[port.type] || 'normal'}">${typeLabels[port.type] || port.type.toUpperCase()}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-subtitle">${(0, sanitize_1.escapeHtml)(port.country)}</div>
        <div class="popup-stats">
          ${rankSection}
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.type')}</span>
            <span class="stat-value">${typeLabels[port.type] || port.type.toUpperCase()}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.coordinates')}</span>
            <span class="stat-value">${port.lat.toFixed(2)}°, ${port.lon.toFixed(2)}°</span>
          </div>
        </div>
        <p class="popup-description">${(0, sanitize_1.escapeHtml)(port.note)}</p>
      </div>
    `;
    }
    renderSpaceportPopup(port) {
        const statusColors = {
            'active': 'elevated',
            'construction': 'high',
            'inactive': 'low',
        };
        const statusLabels = {
            'active': (0, i18n_1.t)('popups.spaceport.status.active'),
            'construction': (0, i18n_1.t)('popups.spaceport.status.construction'),
            'inactive': (0, i18n_1.t)('popups.spaceport.status.inactive'),
        };
        return `
      <div class="popup-header spaceport ${port.status}">
        <span class="popup-icon">🚀</span>
        <span class="popup-title">${(0, sanitize_1.escapeHtml)(port.name.toUpperCase())}</span>
        <span class="popup-badge ${statusColors[port.status] || 'normal'}">${statusLabels[port.status] || port.status.toUpperCase()}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-subtitle">${(0, sanitize_1.escapeHtml)(port.operator)} • ${(0, sanitize_1.escapeHtml)(port.country)}</div>
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.spaceport.launchActivity')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(port.launches.toUpperCase())}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.coordinates')}</span>
            <span class="stat-value">${port.lat.toFixed(2)}°, ${port.lon.toFixed(2)}°</span>
          </div>
        </div>
        <p class="popup-description">${(0, i18n_1.t)('popups.spaceport.description')}</p>
      </div>
    `;
    }
    renderMineralPopup(mine) {
        const statusColors = {
            'producing': 'elevated',
            'development': 'high',
            'exploration': 'low',
        };
        const statusLabels = {
            'producing': (0, i18n_1.t)('popups.mineral.status.producing'),
            'development': (0, i18n_1.t)('popups.mineral.status.development'),
            'exploration': (0, i18n_1.t)('popups.mineral.status.exploration'),
        };
        // Icon based on mineral type
        const icon = mine.mineral === 'Lithium' ? '🔋' : mine.mineral === 'Rare Earths' ? '🧲' : '💎';
        return `
      <div class="popup-header mineral ${mine.status}">
        <span class="popup-icon">${icon}</span>
        <span class="popup-title">${(0, sanitize_1.escapeHtml)(mine.name.toUpperCase())}</span>
        <span class="popup-badge ${statusColors[mine.status] || 'normal'}">${statusLabels[mine.status] || mine.status.toUpperCase()}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-subtitle">${(0, i18n_1.t)('popups.mineral.projectSubtitle', { mineral: (0, sanitize_1.escapeHtml)(mine.mineral.toUpperCase()) })}</div>
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.operator')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(mine.operator)}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.country')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(mine.country)}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.coordinates')}</span>
            <span class="stat-value">${mine.lat.toFixed(2)}°, ${mine.lon.toFixed(2)}°</span>
          </div>
        </div>
        <p class="popup-description">${(0, sanitize_1.escapeHtml)(mine.significance)}</p>
      </div>
    `;
    }
    renderStockExchangePopup(exchange) {
        const tierLabel = exchange.tier.toUpperCase();
        const tierClass = exchange.tier === 'mega' ? 'high' : exchange.tier === 'major' ? 'medium' : 'low';
        return `
      <div class="popup-header exchange">
        <span class="popup-title">${(0, sanitize_1.escapeHtml)(exchange.shortName)}</span>
        <span class="popup-badge ${tierClass}">${tierLabel}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-subtitle">${(0, sanitize_1.escapeHtml)(exchange.name)}</div>
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.location')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(exchange.city)}, ${(0, sanitize_1.escapeHtml)(exchange.country)}</span>
          </div>
          ${exchange.marketCap ? `<div class="popup-stat"><span class="stat-label">${(0, i18n_1.t)('popups.stockExchange.marketCap')}</span><span class="stat-value">$${exchange.marketCap}T</span></div>` : ''}
          ${exchange.tradingHours ? `<div class="popup-stat"><span class="stat-label">${(0, i18n_1.t)('popups.tradingHours')}</span><span class="stat-value">${(0, sanitize_1.escapeHtml)(exchange.tradingHours)}</span></div>` : ''}
        </div>
        ${exchange.description ? `<p class="popup-description">${(0, sanitize_1.escapeHtml)(exchange.description)}</p>` : ''}
      </div>
    `;
    }
    renderFinancialCenterPopup(center) {
        const typeLabel = center.type.toUpperCase();
        return `
      <div class="popup-header financial-center">
        <span class="popup-title">${(0, sanitize_1.escapeHtml)(center.name)}</span>
        <span class="popup-badge">${typeLabel}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.location')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(center.city)}, ${(0, sanitize_1.escapeHtml)(center.country)}</span>
          </div>
          ${center.gfciRank ? `<div class="popup-stat"><span class="stat-label">${(0, i18n_1.t)('popups.financialCenter.gfciRank')}</span><span class="stat-value">#${center.gfciRank}</span></div>` : ''}
        </div>
        ${center.specialties && center.specialties.length > 0 ? `
          <div class="popup-section">
            <span class="section-label">${(0, i18n_1.t)('popups.financialCenter.specialties')}</span>
            <div class="popup-tags">
              ${center.specialties.map(s => `<span class="popup-tag">${(0, sanitize_1.escapeHtml)(s)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        ${center.description ? `<p class="popup-description">${(0, sanitize_1.escapeHtml)(center.description)}</p>` : ''}
      </div>
    `;
    }
    renderCentralBankPopup(bank) {
        const typeLabel = bank.type.toUpperCase();
        return `
      <div class="popup-header central-bank">
        <span class="popup-title">${(0, sanitize_1.escapeHtml)(bank.shortName)}</span>
        <span class="popup-badge">${typeLabel}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-subtitle">${(0, sanitize_1.escapeHtml)(bank.name)}</div>
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.location')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(bank.city)}, ${(0, sanitize_1.escapeHtml)(bank.country)}</span>
          </div>
          ${bank.currency ? `<div class="popup-stat"><span class="stat-label">${(0, i18n_1.t)('popups.centralBank.currency')}</span><span class="stat-value">${(0, sanitize_1.escapeHtml)(bank.currency)}</span></div>` : ''}
        </div>
        ${bank.description ? `<p class="popup-description">${(0, sanitize_1.escapeHtml)(bank.description)}</p>` : ''}
      </div>
    `;
    }
    renderCommodityHubPopup(hub) {
        const typeLabel = hub.type.toUpperCase();
        return `
      <div class="popup-header commodity-hub">
        <span class="popup-title">${(0, sanitize_1.escapeHtml)(hub.name)}</span>
        <span class="popup-badge">${typeLabel}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.location')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(hub.city)}, ${(0, sanitize_1.escapeHtml)(hub.country)}</span>
          </div>
        </div>
        ${hub.commodities && hub.commodities.length > 0 ? `
          <div class="popup-section">
            <span class="section-label">${(0, i18n_1.t)('popups.commodityHub.commodities')}</span>
            <div class="popup-tags">
              ${hub.commodities.map(c => `<span class="popup-tag">${(0, sanitize_1.escapeHtml)(c)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        ${hub.description ? `<p class="popup-description">${(0, sanitize_1.escapeHtml)(hub.description)}</p>` : ''}
      </div>
    `;
    }
    normalizeSeverity(s) {
        const v = (s || '').trim().toLowerCase();
        if (v === 'high')
            return 'high';
        if (v === 'medium')
            return 'medium';
        return 'low';
    }
    renderIranEventPopup(event) {
        const severity = this.normalizeSeverity(event.severity);
        const timeAgo = event.timestamp ? this.getTimeAgo(new Date(event.timestamp)) : '';
        const safeUrl = (0, sanitize_1.sanitizeUrl)(event.sourceUrl);
        const relatedHtml = event.relatedEvents && event.relatedEvents.length > 0 ? `
        <div class="popup-section">
          <span class="section-label">${(0, i18n_1.t)('popups.iranEvent.relatedEvents')}</span>
          <ul class="cluster-list">
            ${event.relatedEvents.map(r => {
            const rSev = this.normalizeSeverity(r.severity);
            const rTime = r.timestamp ? this.getTimeAgo(new Date(r.timestamp)) : '';
            const rTitle = r.title.length > 60 ? r.title.slice(0, 60) + '…' : r.title;
            return `<li class="cluster-item"><span class="popup-badge ${rSev}" style="font-size:9px;padding:1px 4px;">${(0, sanitize_1.escapeHtml)(rSev.toUpperCase())}</span> ${(0, sanitize_1.escapeHtml)(rTitle)}${rTime ? ` <span style="color:var(--text-muted);font-size:10px;">${(0, sanitize_1.escapeHtml)(rTime)}</span>` : ''}</li>`;
        }).join('')}
          </ul>
        </div>` : '';
        return `
      <div class="popup-header iranEvent ${severity}">
        <span class="popup-title">${(0, sanitize_1.escapeHtml)(event.title)}</span>
        <span class="popup-badge ${severity}">${(0, sanitize_1.escapeHtml)(severity.toUpperCase())}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.type')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(event.category)}</span>
          </div>
          ${event.locationName ? `<div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.location')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(event.locationName)}</span>
          </div>` : ''}
          ${timeAgo ? `<div class="popup-stat">
            <span class="stat-label">${(0, i18n_1.t)('popups.time')}</span>
            <span class="stat-value">${(0, sanitize_1.escapeHtml)(timeAgo)}</span>
          </div>` : ''}
        </div>
        ${relatedHtml}
        ${safeUrl ? `<a href="${(0, sanitize_1.escapeHtml)(safeUrl)}" target="_blank" rel="noopener noreferrer nofollow" class="popup-link">${(0, i18n_1.t)('popups.source')} →</a>` : ''}
      </div>
    `;
    }
}
exports.MapPopup = MapPopup;
