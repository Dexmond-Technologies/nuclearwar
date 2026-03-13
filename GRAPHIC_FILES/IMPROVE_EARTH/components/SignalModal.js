"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignalModal = void 0;
const trending_keywords_1 = require("@/services/trending-keywords");
const sanitize_1 = require("@/utils/sanitize");
const utils_1 = require("@/utils");
const analysis_constants_1 = require("@/utils/analysis-constants");
const i18n_1 = require("@/services/i18n");
class SignalModal {
    constructor() {
        this.currentSignals = [];
        this.audioEnabled = true;
        this.audio = null;
        this.element = document.createElement('div');
        this.element.className = 'signal-modal-overlay';
        this.element.innerHTML = `
      <div class="signal-modal">
        <div class="signal-modal-header">
          <span class="signal-modal-title">🎯 ${(0, i18n_1.t)('modals.signal.title')}</span>
          <button class="signal-modal-close">×</button>
        </div>
        <div class="signal-modal-content"></div>
        <div class="signal-modal-footer">
          <label class="signal-audio-toggle">
            <input type="checkbox" checked>
            <span>${(0, i18n_1.t)('modals.signal.soundAlerts')}</span>
          </label>
          <button class="signal-dismiss-btn">${(0, i18n_1.t)('modals.signal.dismiss')}</button>
        </div>
      </div>
    `;
        document.body.appendChild(this.element);
        this.setupEventListeners();
        this.initAudio();
        // Remove will-change after entrance animation to free GPU memory
        const modal = this.element.querySelector('.signal-modal');
        modal?.addEventListener('animationend', () => {
            modal.style.willChange = 'auto';
        }, { once: true });
    }
    initAudio() {
        this.audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQYjfKapmWswEjCJvuPQfSoXZZ+3qqBJESSP0unGaxMJVYiytrFeLhR6p8znrFUXRW+bs7V3Qx1hn8Xjp1cYPnegprhkMCFmoLi1k0sZTYGlqqlUIA==');
        this.audio.volume = 0.3;
    }
    setupEventListeners() {
        this.element.querySelector('.signal-modal-close')?.addEventListener('click', () => {
            this.hide();
        });
        this.element.querySelector('.signal-dismiss-btn')?.addEventListener('click', () => {
            this.hide();
        });
        this.element.addEventListener('click', (e) => {
            if (e.target.classList.contains('signal-modal-overlay')) {
                this.hide();
            }
        });
        const checkbox = this.element.querySelector('input[type="checkbox"]');
        checkbox?.addEventListener('change', () => {
            this.audioEnabled = checkbox.checked;
        });
        // Delegate click handler for location links
        this.element.addEventListener('click', (e) => {
            const target = e.target;
            if (target.classList.contains('location-link')) {
                const lat = parseFloat(target.dataset.lat || '0');
                const lon = parseFloat(target.dataset.lon || '0');
                if (this.onLocationClick && !isNaN(lat) && !isNaN(lon)) {
                    this.onLocationClick(lat, lon);
                    this.hide();
                }
                return;
            }
            if (target.classList.contains('suppress-keyword-btn')) {
                const term = (target.dataset.term || '').trim();
                if (!term)
                    return;
                (0, trending_keywords_1.suppressTrendingTerm)(term);
                this.currentSignals = this.currentSignals.filter(signal => {
                    const signalTerm = signal.data.term;
                    return typeof signalTerm !== 'string' || signalTerm.toLowerCase() !== term.toLowerCase();
                });
                this.renderSignals();
            }
        });
    }
    setLocationClickHandler(handler) {
        this.onLocationClick = handler;
    }
    show(signals) {
        if (signals.length === 0)
            return;
        if (document.fullscreenElement)
            return;
        this.currentSignals = [...signals, ...this.currentSignals].slice(0, 50);
        this.renderSignals();
        this.element.classList.add('active');
        this.playSound();
    }
    showSignal(signal) {
        this.currentSignals = [signal];
        this.renderSignals();
        this.element.classList.add('active');
    }
    showAlert(alert) {
        if (document.fullscreenElement)
            return;
        const content = this.element.querySelector('.signal-modal-content');
        const priorityColors = {
            critical: (0, utils_1.getCSSColor)('--semantic-critical'),
            high: (0, utils_1.getCSSColor)('--semantic-high'),
            medium: (0, utils_1.getCSSColor)('--semantic-low'),
            low: (0, utils_1.getCSSColor)('--text-dim'),
        };
        const typeIcons = {
            cii_spike: '📊',
            convergence: '🌍',
            cascade: '⚡',
            composite: '🔗',
        };
        const icon = typeIcons[alert.type] || '⚠️';
        const color = priorityColors[alert.priority] || '#ff9944';
        let detailsHtml = '';
        // CII Change details
        if (alert.components.ciiChange) {
            const cii = alert.components.ciiChange;
            const changeSign = cii.change > 0 ? '+' : '';
            detailsHtml += `
        <div class="signal-context-item">
          <span class="context-label">${(0, i18n_1.t)('modals.signal.country')}</span>
          <span class="context-value">${(0, sanitize_1.escapeHtml)(cii.countryName)}</span>
        </div>
        <div class="signal-context-item">
          <span class="context-label">${(0, i18n_1.t)('modals.signal.scoreChange')}</span>
          <span class="context-value">${cii.previousScore} → ${cii.currentScore} (${changeSign}${cii.change})</span>
        </div>
        <div class="signal-context-item">
          <span class="context-label">${(0, i18n_1.t)('modals.signal.instabilityLevel')}</span>
          <span class="context-value" style="text-transform: uppercase; color: ${color}">${cii.level}</span>
        </div>
        <div class="signal-context-item">
          <span class="context-label">${(0, i18n_1.t)('modals.signal.primaryDriver')}</span>
          <span class="context-value">${(0, sanitize_1.escapeHtml)(cii.driver)}</span>
        </div>
      `;
        }
        // Convergence details
        if (alert.components.convergence) {
            const conv = alert.components.convergence;
            detailsHtml += `
        <div class="signal-context-item">
          <span class="context-label">${(0, i18n_1.t)('modals.signal.location')}</span>
          <button class="location-link" data-lat="${conv.lat}" data-lon="${conv.lon}">${conv.lat.toFixed(2)}°, ${conv.lon.toFixed(2)}° ↗</button>
        </div>
        <div class="signal-context-item">
          <span class="context-label">${(0, i18n_1.t)('modals.signal.eventTypes')}</span>
          <span class="context-value">${conv.types.join(', ')}</span>
        </div>
        <div class="signal-context-item">
          <span class="context-label">${(0, i18n_1.t)('modals.signal.eventCount')}</span>
          <span class="context-value">${(0, i18n_1.t)('modals.signal.eventCountValue', { count: conv.totalEvents })}</span>
        </div>
      `;
        }
        // Cascade details
        if (alert.components.cascade) {
            const cascade = alert.components.cascade;
            detailsHtml += `
        <div class="signal-context-item">
          <span class="context-label">${(0, i18n_1.t)('modals.signal.source')}</span>
          <span class="context-value">${(0, sanitize_1.escapeHtml)(cascade.sourceName)} (${cascade.sourceType})</span>
        </div>
        <div class="signal-context-item">
          <span class="context-label">${(0, i18n_1.t)('modals.signal.countriesAffected')}</span>
          <span class="context-value">${cascade.countriesAffected}</span>
        </div>
        <div class="signal-context-item">
          <span class="context-label">${(0, i18n_1.t)('modals.signal.impactLevel')}</span>
          <span class="context-value">${(0, sanitize_1.escapeHtml)(cascade.highestImpact)}</span>
        </div>
      `;
        }
        content.innerHTML = `
      <div class="signal-item" style="border-left-color: ${color}">
        <div class="signal-type">${icon} ${alert.type.toUpperCase().replace('_', ' ')}</div>
        <div class="signal-title">${(0, sanitize_1.escapeHtml)(alert.title)}</div>
        <div class="signal-description">${(0, sanitize_1.escapeHtml)(alert.summary)}</div>
        <div class="signal-meta">
          <span class="signal-confidence" style="background: ${color}22; color: ${color}">${alert.priority.toUpperCase()}</span>
          <span class="signal-time">${this.formatTime(alert.timestamp)}</span>
        </div>
        <div class="signal-context">
          ${detailsHtml}
        </div>
        ${alert.countries.length > 0 ? `
          <div class="signal-topics">
            ${alert.countries.map(c => `<span class="signal-topic">${(0, sanitize_1.escapeHtml)(c)}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    `;
        this.element.classList.add('active');
    }
    playSound() {
        if (this.audioEnabled && this.audio) {
            this.audio.currentTime = 0;
            this.audio.play().catch(() => { });
        }
    }
    hide() {
        this.element.classList.remove('active');
    }
    renderSignals() {
        const content = this.element.querySelector('.signal-modal-content');
        const signalTypeLabels = {
            prediction_leads_news: `🔮 ${(0, i18n_1.t)('modals.signal.predictionLeading')}`,
            news_leads_markets: `📰 ${(0, i18n_1.t)('modals.signal.newsLeading')}`,
            silent_divergence: `🔇 ${(0, i18n_1.t)('modals.signal.silentDivergence')}`,
            velocity_spike: `🔥 ${(0, i18n_1.t)('modals.signal.velocitySpike')}`,
            keyword_spike: `📊 ${(0, i18n_1.t)('modals.signal.keywordSpike')}`,
            convergence: `◉ ${(0, i18n_1.t)('modals.signal.convergence')}`,
            triangulation: `△ ${(0, i18n_1.t)('modals.signal.triangulation')}`,
            flow_drop: `🛢️ ${(0, i18n_1.t)('modals.signal.flowDrop')}`,
            flow_price_divergence: `📈 ${(0, i18n_1.t)('modals.signal.flowPriceDivergence')}`,
            geo_convergence: `🌐 ${(0, i18n_1.t)('modals.signal.geoConvergence')}`,
            explained_market_move: `✓ ${(0, i18n_1.t)('modals.signal.marketMove')}`,
            sector_cascade: `📊 ${(0, i18n_1.t)('modals.signal.sectorCascade')}`,
            military_surge: `🛩️ ${(0, i18n_1.t)('modals.signal.militarySurge')}`,
        };
        const html = this.currentSignals.map(signal => {
            const context = (0, analysis_constants_1.getSignalContext)(signal.type);
            // Military surge signals have additional properties in data
            const data = signal.data;
            const newsCorrelation = data?.newsCorrelation;
            const focalPoints = data?.focalPointContext;
            const locationData = { lat: data?.lat, lon: data?.lon, regionName: data?.regionName };
            return `
        <div class="signal-item ${(0, sanitize_1.escapeHtml)(signal.type)}">
          <div class="signal-type">${signalTypeLabels[signal.type] || (0, sanitize_1.escapeHtml)(signal.type)}</div>
          <div class="signal-title">${(0, sanitize_1.escapeHtml)(signal.title)}</div>
          <div class="signal-description">${(0, sanitize_1.escapeHtml)(signal.description)}</div>
          <div class="signal-meta">
            <span class="signal-confidence">${(0, i18n_1.t)('modals.signal.confidence')}: ${Math.round(signal.confidence * 100)}%</span>
            <span class="signal-time">${this.formatTime(signal.timestamp)}</span>
          </div>
          ${signal.data.explanation ? `
            <div class="signal-explanation">${(0, sanitize_1.escapeHtml)(signal.data.explanation)}</div>
          ` : ''}
          ${focalPoints && focalPoints.length > 0 ? `
            <div class="signal-focal-points">
              <div class="focal-points-header">📡 ${(0, i18n_1.t)('modals.signal.focalPoints')}</div>
              ${focalPoints.map(fp => `<div class="focal-point-item">${(0, sanitize_1.escapeHtml)(fp)}</div>`).join('')}
            </div>
          ` : ''}
          ${newsCorrelation ? `
            <div class="signal-news-correlation">
              <div class="news-correlation-header">📰 ${(0, i18n_1.t)('modals.signal.newsCorrelation')}</div>
              <pre class="news-correlation-text">${(0, sanitize_1.escapeHtml)(newsCorrelation)}</pre>
            </div>
          ` : ''}
          ${locationData.lat && locationData.lon ? `
            <div class="signal-location">
              <button class="location-link" data-lat="${locationData.lat}" data-lon="${locationData.lon}">
                📍 ${(0, i18n_1.t)('modals.signal.viewOnMap')}: ${locationData.regionName || `${locationData.lat.toFixed(2)}°, ${locationData.lon.toFixed(2)}°`}
              </button>
            </div>
          ` : ''}
          <div class="signal-context">
            <div class="signal-context-item why-matters">
              <span class="context-label">${(0, i18n_1.t)('modals.signal.whyItMatters')}</span>
              <span class="context-value">${(0, sanitize_1.escapeHtml)(context.whyItMatters)}</span>
            </div>
            <div class="signal-context-item actionable">
              <span class="context-label">${(0, i18n_1.t)('modals.signal.action')}</span>
              <span class="context-value">${(0, sanitize_1.escapeHtml)(context.actionableInsight)}</span>
            </div>
            <div class="signal-context-item confidence-note">
              <span class="context-label">${(0, i18n_1.t)('modals.signal.note')}</span>
              <span class="context-value">${(0, sanitize_1.escapeHtml)(context.confidenceNote)}</span>
            </div>
          </div>
          ${signal.data.relatedTopics?.length ? `
            <div class="signal-topics">
              ${signal.data.relatedTopics.map(t => `<span class="signal-topic">${(0, sanitize_1.escapeHtml)(t)}</span>`).join('')}
            </div>
          ` : ''}
          ${signal.type === 'keyword_spike' && typeof data?.term === 'string' ? `
            <div class="signal-actions">
              <button class="suppress-keyword-btn" data-term="${(0, sanitize_1.escapeHtml)(data.term)}">${(0, i18n_1.t)('modals.signal.suppress')}</button>
            </div>
          ` : ''}
        </div>
      `;
        }).join('');
        content.innerHTML = html;
    }
    formatTime(date) {
        return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    }
    getElement() {
        return this.element;
    }
}
exports.SignalModal = SignalModal;
