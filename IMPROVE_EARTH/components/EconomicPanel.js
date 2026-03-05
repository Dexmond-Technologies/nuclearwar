"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EconomicPanel = void 0;
const Panel_1 = require("./Panel");
const i18n_1 = require("@/services/i18n");
const economic_1 = require("@/services/economic");
const usa_spending_1 = require("@/services/usa-spending");
const sanitize_1 = require("@/utils/sanitize");
const runtime_config_1 = require("@/services/runtime-config");
const runtime_1 = require("@/services/runtime");
const utils_1 = require("@/utils");
class EconomicPanel extends Panel_1.Panel {
    constructor() {
        super({ id: 'economic', title: (0, i18n_1.t)('panels.economic') });
        this.fredData = [];
        this.oilData = null;
        this.spendingData = null;
        this.bisData = null;
        this.lastUpdate = null;
        this.activeTab = 'indicators';
        this.content.addEventListener('click', (e) => {
            const tab = e.target.closest('.economic-tab');
            if (tab?.dataset.tab) {
                this.activeTab = tab.dataset.tab;
                this.render();
            }
        });
    }
    update(data) {
        this.fredData = data;
        this.lastUpdate = new Date();
        this.render();
    }
    updateOil(data) {
        this.oilData = data;
        this.render();
    }
    updateSpending(data) {
        this.spendingData = data;
        this.render();
    }
    updateBis(data) {
        this.bisData = data;
        this.render();
    }
    setLoading(loading) {
        if (loading) {
            this.showLoading();
        }
    }
    render() {
        const hasOil = this.oilData && (this.oilData.wtiPrice || this.oilData.brentPrice);
        const hasSpending = this.spendingData && this.spendingData.awards.length > 0;
        const hasBis = this.bisData && this.bisData.policyRates.length > 0;
        // Build tabs HTML
        const tabsHtml = `
      <div class="economic-tabs">
        <button class="economic-tab ${this.activeTab === 'indicators' ? 'active' : ''}" data-tab="indicators">
          📊 ${(0, i18n_1.t)('components.economic.indicators')}
        </button>
        ${hasOil ? `
          <button class="economic-tab ${this.activeTab === 'oil' ? 'active' : ''}" data-tab="oil">
            🛢️ ${(0, i18n_1.t)('components.economic.oil')}
          </button>
        ` : ''}
        ${hasSpending ? `
          <button class="economic-tab ${this.activeTab === 'spending' ? 'active' : ''}" data-tab="spending">
            🏛️ ${(0, i18n_1.t)('components.economic.gov')}
          </button>
        ` : ''}
        ${hasBis ? `
          <button class="economic-tab ${this.activeTab === 'centralBanks' ? 'active' : ''}" data-tab="centralBanks">
            🏦 ${(0, i18n_1.t)('components.economic.centralBanks')}
          </button>
        ` : ''}
      </div>
    `;
        let contentHtml = '';
        switch (this.activeTab) {
            case 'indicators':
                contentHtml = this.renderIndicators();
                break;
            case 'oil':
                contentHtml = this.renderOil();
                break;
            case 'spending':
                contentHtml = this.renderSpending();
                break;
            case 'centralBanks':
                contentHtml = this.renderCentralBanks();
                break;
        }
        const updateTime = this.lastUpdate
            ? this.lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '';
        this.setContent(`
      ${tabsHtml}
      <div class="economic-content">
        ${contentHtml}
      </div>
      <div class="economic-footer">
        <span class="economic-source">${this.getSourceLabel()} • ${updateTime}</span>
      </div>
    `);
    }
    getSourceLabel() {
        switch (this.activeTab) {
            case 'indicators': return 'FRED';
            case 'oil': return 'EIA';
            case 'spending': return 'USASpending.gov';
            case 'centralBanks': return 'BIS';
        }
    }
    renderIndicators() {
        if (this.fredData.length === 0) {
            if ((0, runtime_1.isDesktopRuntime)() && !(0, runtime_config_1.isFeatureAvailable)('economicFred')) {
                return `<div class="economic-empty">${(0, i18n_1.t)('components.economic.fredKeyMissing')}</div>`;
            }
            return `<div class="economic-empty">${(0, i18n_1.t)('components.economic.noIndicatorData')}</div>`;
        }
        return `
      <div class="economic-indicators">
        ${this.fredData.map(series => {
            const changeClass = (0, economic_1.getChangeClass)(series.change);
            const changeStr = (0, economic_1.formatChange)(series.change, series.unit);
            const arrow = series.change !== null
                ? (series.change > 0 ? '▲' : series.change < 0 ? '▼' : '–')
                : '';
            return `
            <div class="economic-indicator" data-series="${(0, sanitize_1.escapeHtml)(series.id)}">
              <div class="indicator-header">
                <span class="indicator-name">${(0, sanitize_1.escapeHtml)(series.name)}</span>
                <span class="indicator-id">${(0, sanitize_1.escapeHtml)(series.id)}</span>
              </div>
              <div class="indicator-value">
                <span class="value">${(0, sanitize_1.escapeHtml)(String(series.value !== null ? series.value : 'N/A'))}${(0, sanitize_1.escapeHtml)(series.unit)}</span>
                <span class="change ${(0, sanitize_1.escapeHtml)(changeClass)}">${(0, sanitize_1.escapeHtml)(arrow)} ${(0, sanitize_1.escapeHtml)(changeStr)}</span>
              </div>
              <div class="indicator-date">${(0, sanitize_1.escapeHtml)(series.date)}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    }
    renderOil() {
        if (!this.oilData) {
            return `<div class="economic-empty">${(0, i18n_1.t)('components.economic.noOilDataRetry')}</div>`;
        }
        const metrics = [
            this.oilData.wtiPrice,
            this.oilData.brentPrice,
            this.oilData.usProduction,
            this.oilData.usInventory,
        ].filter(Boolean);
        if (metrics.length === 0) {
            return `<div class="economic-empty">${(0, i18n_1.t)('components.economic.noOilMetrics')}</div>`;
        }
        return `
      <div class="economic-indicators oil-metrics">
        ${metrics.map(metric => {
            if (!metric)
                return '';
            const trendIcon = (0, economic_1.getTrendIndicator)(metric.trend);
            const trendColor = (0, economic_1.getTrendColor)(metric.trend, metric.name.includes('Production'));
            return `
            <div class="economic-indicator oil-metric">
              <div class="indicator-header">
                <span class="indicator-name">${(0, sanitize_1.escapeHtml)(metric.name)}</span>
              </div>
              <div class="indicator-value">
                <span class="value">${(0, sanitize_1.escapeHtml)((0, economic_1.formatOilValue)(metric.current, metric.unit))} ${(0, sanitize_1.escapeHtml)(metric.unit)}</span>
                <span class="change" style="color: ${(0, sanitize_1.escapeHtml)(trendColor)}">
                  ${(0, sanitize_1.escapeHtml)(trendIcon)} ${(0, sanitize_1.escapeHtml)(String(metric.changePct > 0 ? '+' : ''))}${(0, sanitize_1.escapeHtml)(String(metric.changePct))}%
                </span>
              </div>
              <div class="indicator-date">${(0, i18n_1.t)('components.economic.vsPreviousWeek')}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    }
    renderSpending() {
        if (!this.spendingData || this.spendingData.awards.length === 0) {
            return `<div class="economic-empty">${(0, i18n_1.t)('components.economic.noSpending')}</div>`;
        }
        const { awards, totalAmount, periodStart, periodEnd } = this.spendingData;
        return `
      <div class="spending-summary">
        <div class="spending-total">
          ${(0, sanitize_1.escapeHtml)((0, usa_spending_1.formatAwardAmount)(totalAmount))} ${(0, i18n_1.t)('components.economic.in')} ${(0, sanitize_1.escapeHtml)(String(awards.length))} ${(0, i18n_1.t)('components.economic.awards')}
          <span class="spending-period">${(0, sanitize_1.escapeHtml)(periodStart)} – ${(0, sanitize_1.escapeHtml)(periodEnd)}</span>
        </div>
      </div>
      <div class="spending-list">
        ${awards.slice(0, 8).map(award => `
          <div class="spending-award">
            <div class="award-header">
              <span class="award-icon">${(0, sanitize_1.escapeHtml)((0, usa_spending_1.getAwardTypeIcon)(award.awardType))}</span>
              <span class="award-amount">${(0, sanitize_1.escapeHtml)((0, usa_spending_1.formatAwardAmount)(award.amount))}</span>
            </div>
            <div class="award-recipient">${(0, sanitize_1.escapeHtml)(award.recipientName)}</div>
            <div class="award-agency">${(0, sanitize_1.escapeHtml)(award.agency)}</div>
            ${award.description ? `<div class="award-desc">${(0, sanitize_1.escapeHtml)(award.description.slice(0, 100))}${award.description.length > 100 ? '...' : ''}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `;
    }
    renderCentralBanks() {
        if (!this.bisData || this.bisData.policyRates.length === 0) {
            return `<div class="economic-empty">${(0, i18n_1.t)('components.economic.noBisData')}</div>`;
        }
        const greenColor = (0, utils_1.getCSSColor)('--semantic-normal');
        const redColor = (0, utils_1.getCSSColor)('--semantic-critical');
        const neutralColor = (0, utils_1.getCSSColor)('--text-dim');
        // Policy Rates — sorted by rate descending
        const sortedRates = [...this.bisData.policyRates].sort((a, b) => b.rate - a.rate);
        const policyHtml = `
      <div class="bis-section">
        <div class="bis-section-title">${(0, i18n_1.t)('components.economic.policyRate')}</div>
        <div class="economic-indicators">
          ${sortedRates.map(r => {
            const diff = r.rate - r.previousRate;
            const color = diff < 0 ? greenColor : diff > 0 ? redColor : neutralColor;
            const label = diff < 0 ? (0, i18n_1.t)('components.economic.cut') : diff > 0 ? (0, i18n_1.t)('components.economic.hike') : (0, i18n_1.t)('components.economic.hold');
            const arrow = diff < 0 ? '▼' : diff > 0 ? '▲' : '–';
            return `
              <div class="economic-indicator">
                <div class="indicator-header">
                  <span class="indicator-name">${(0, sanitize_1.escapeHtml)(r.centralBank)}</span>
                  <span class="indicator-id">${(0, sanitize_1.escapeHtml)(r.countryCode)}</span>
                </div>
                <div class="indicator-value">
                  <span class="value">${(0, sanitize_1.escapeHtml)(String(r.rate))}%</span>
                  <span class="change" style="color: ${(0, sanitize_1.escapeHtml)(color)}">${(0, sanitize_1.escapeHtml)(arrow)} ${(0, sanitize_1.escapeHtml)(label)}</span>
                </div>
                <div class="indicator-date">${(0, sanitize_1.escapeHtml)(r.date)}</div>
              </div>`;
        }).join('')}
        </div>
      </div>
    `;
        // Exchange Rates
        let eerHtml = '';
        if (this.bisData.exchangeRates.length > 0) {
            eerHtml = `
        <div class="bis-section">
          <div class="bis-section-title">${(0, i18n_1.t)('components.economic.realEer')}</div>
          <div class="economic-indicators">
            ${this.bisData.exchangeRates.map(r => {
                const color = r.realChange > 0 ? redColor : r.realChange < 0 ? greenColor : neutralColor;
                const arrow = r.realChange > 0 ? '▲' : r.realChange < 0 ? '▼' : '–';
                return `
                <div class="economic-indicator">
                  <div class="indicator-header">
                    <span class="indicator-name">${(0, sanitize_1.escapeHtml)(r.countryName)}</span>
                    <span class="indicator-id">${(0, sanitize_1.escapeHtml)(r.countryCode)}</span>
                  </div>
                  <div class="indicator-value">
                    <span class="value">${(0, sanitize_1.escapeHtml)(String(r.realEer))}</span>
                    <span class="change" style="color: ${(0, sanitize_1.escapeHtml)(color)}">${(0, sanitize_1.escapeHtml)(arrow)} ${(0, sanitize_1.escapeHtml)(String(r.realChange > 0 ? '+' : ''))}${(0, sanitize_1.escapeHtml)(String(r.realChange))}%</span>
                  </div>
                  <div class="indicator-date">${(0, sanitize_1.escapeHtml)(r.date)}</div>
                </div>`;
            }).join('')}
          </div>
        </div>
      `;
        }
        // Credit-to-GDP
        let creditHtml = '';
        if (this.bisData.creditToGdp.length > 0) {
            const sortedCredit = [...this.bisData.creditToGdp].sort((a, b) => b.creditGdpRatio - a.creditGdpRatio);
            creditHtml = `
        <div class="bis-section">
          <div class="bis-section-title">${(0, i18n_1.t)('components.economic.creditToGdp')}</div>
          <div class="economic-indicators">
            ${sortedCredit.map(r => {
                const diff = r.creditGdpRatio - r.previousRatio;
                const color = diff > 0 ? redColor : diff < 0 ? greenColor : neutralColor;
                const arrow = diff > 0 ? '▲' : diff < 0 ? '▼' : '–';
                const changeStr = diff !== 0 ? `${diff > 0 ? '+' : ''}${(Math.round(diff * 10) / 10)}pp` : '–';
                return `
                <div class="economic-indicator">
                  <div class="indicator-header">
                    <span class="indicator-name">${(0, sanitize_1.escapeHtml)(r.countryName)}</span>
                    <span class="indicator-id">${(0, sanitize_1.escapeHtml)(r.countryCode)}</span>
                  </div>
                  <div class="indicator-value">
                    <span class="value">${(0, sanitize_1.escapeHtml)(String(r.creditGdpRatio))}%</span>
                    <span class="change" style="color: ${(0, sanitize_1.escapeHtml)(color)}">${(0, sanitize_1.escapeHtml)(arrow)} ${(0, sanitize_1.escapeHtml)(changeStr)}</span>
                  </div>
                  <div class="indicator-date">${(0, sanitize_1.escapeHtml)(r.date)}</div>
                </div>`;
            }).join('')}
          </div>
        </div>
      `;
        }
        return policyHtml + eerHtml + creditHtml;
    }
}
exports.EconomicPanel = EconomicPanel;
