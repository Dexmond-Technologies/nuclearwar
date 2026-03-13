"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TradePolicyPanel = void 0;
const Panel_1 = require("./Panel");
const i18n_1 = require("@/services/i18n");
const sanitize_1 = require("@/utils/sanitize");
const runtime_config_1 = require("@/services/runtime-config");
const runtime_1 = require("@/services/runtime");
class TradePolicyPanel extends Panel_1.Panel {
    constructor() {
        super({ id: 'trade-policy', title: (0, i18n_1.t)('panels.tradePolicy') });
        this.restrictionsData = null;
        this.tariffsData = null;
        this.flowsData = null;
        this.barriersData = null;
        this.activeTab = 'restrictions';
        this.content.addEventListener('click', (e) => {
            const target = e.target.closest('.economic-tab');
            if (!target)
                return;
            const tabId = target.dataset.tab;
            if (tabId && tabId !== this.activeTab) {
                this.activeTab = tabId;
                this.render();
            }
        });
    }
    updateRestrictions(data) {
        this.restrictionsData = data;
        this.render();
    }
    updateTariffs(data) {
        this.tariffsData = data;
        this.render();
    }
    updateFlows(data) {
        this.flowsData = data;
        this.render();
    }
    updateBarriers(data) {
        this.barriersData = data;
        this.render();
    }
    render() {
        // Check for API key
        if ((0, runtime_1.isDesktopRuntime)() && !(0, runtime_config_1.isFeatureAvailable)('wtoTrade')) {
            this.setContent(`<div class="economic-empty">${(0, i18n_1.t)('components.tradePolicy.apiKeyMissing')}</div>`);
            return;
        }
        const hasTariffs = this.tariffsData && this.tariffsData.datapoints.length > 0;
        const hasFlows = this.flowsData && this.flowsData.flows.length > 0;
        const hasBarriers = this.barriersData && this.barriersData.barriers.length > 0;
        const tabsHtml = `
      <div class="economic-tabs">
        <button class="economic-tab ${this.activeTab === 'restrictions' ? 'active' : ''}" data-tab="restrictions">
          ${(0, i18n_1.t)('components.tradePolicy.restrictions')}
        </button>
        ${hasTariffs ? `<button class="economic-tab ${this.activeTab === 'tariffs' ? 'active' : ''}" data-tab="tariffs">
          ${(0, i18n_1.t)('components.tradePolicy.tariffs')}
        </button>` : ''}
        ${hasFlows ? `<button class="economic-tab ${this.activeTab === 'flows' ? 'active' : ''}" data-tab="flows">
          ${(0, i18n_1.t)('components.tradePolicy.flows')}
        </button>` : ''}
        ${hasBarriers ? `<button class="economic-tab ${this.activeTab === 'barriers' ? 'active' : ''}" data-tab="barriers">
          ${(0, i18n_1.t)('components.tradePolicy.barriers')}
        </button>` : ''}
      </div>
    `;
        // Only show unavailable banner when active tab has NO data and upstream is down
        const activeHasData = this.activeTab === 'restrictions'
            ? (this.restrictionsData?.restrictions.length ?? 0) > 0
            : this.activeTab === 'tariffs'
                ? (this.tariffsData?.datapoints.length ?? 0) > 0
                : this.activeTab === 'flows'
                    ? (this.flowsData?.flows.length ?? 0) > 0
                    : (this.barriersData?.barriers.length ?? 0) > 0;
        const activeData = this.activeTab === 'restrictions' ? this.restrictionsData
            : this.activeTab === 'tariffs' ? this.tariffsData
                : this.activeTab === 'flows' ? this.flowsData
                    : this.barriersData;
        const unavailableBanner = !activeHasData && activeData?.upstreamUnavailable
            ? `<div class="economic-warning">${(0, i18n_1.t)('components.tradePolicy.upstreamUnavailable')}</div>`
            : '';
        let contentHtml = '';
        switch (this.activeTab) {
            case 'restrictions':
                contentHtml = this.renderRestrictions();
                break;
            case 'tariffs':
                contentHtml = this.renderTariffs();
                break;
            case 'flows':
                contentHtml = this.renderFlows();
                break;
            case 'barriers':
                contentHtml = this.renderBarriers();
                break;
        }
        this.setContent(`
      ${tabsHtml}
      ${unavailableBanner}
      <div class="economic-content">${contentHtml}</div>
      <div class="economic-footer">
        <span class="economic-source">WTO</span>
      </div>
    `);
    }
    renderRestrictions() {
        if (!this.restrictionsData || this.restrictionsData.restrictions.length === 0) {
            return `<div class="economic-empty">${(0, i18n_1.t)('components.tradePolicy.noRestrictions')}</div>`;
        }
        return `<div class="trade-restrictions-list">
      ${this.restrictionsData.restrictions.map(r => {
            const statusClass = r.status === 'high' ? 'status-active' : r.status === 'moderate' ? 'status-notified' : 'status-terminated';
            const statusLabel = r.status === 'high' ? (0, i18n_1.t)('components.tradePolicy.highTariff') : r.status === 'moderate' ? (0, i18n_1.t)('components.tradePolicy.moderateTariff') : (0, i18n_1.t)('components.tradePolicy.lowTariff');
            const sourceLink = this.renderSourceUrl(r.sourceUrl);
            return `<div class="trade-restriction-card">
          <div class="trade-restriction-header">
            <span class="trade-country">${(0, sanitize_1.escapeHtml)(r.reportingCountry)}</span>
            <span class="trade-badge">${(0, sanitize_1.escapeHtml)(r.measureType)}</span>
            <span class="trade-status ${statusClass}">${statusLabel}</span>
          </div>
          <div class="trade-restriction-body">
            <div class="trade-sector">${(0, sanitize_1.escapeHtml)(r.productSector)}</div>
            ${r.description ? `<div class="trade-description">${(0, sanitize_1.escapeHtml)(r.description)}</div>` : ''}
            ${r.affectedCountry ? `<div class="trade-affected">Affects: ${(0, sanitize_1.escapeHtml)(r.affectedCountry)}</div>` : ''}
          </div>
          <div class="trade-restriction-footer">
            ${r.notifiedAt ? `<span class="trade-date">${(0, sanitize_1.escapeHtml)(r.notifiedAt)}</span>` : ''}
            ${sourceLink}
          </div>
        </div>`;
        }).join('')}
    </div>`;
    }
    renderTariffs() {
        if (!this.tariffsData || this.tariffsData.datapoints.length === 0) {
            return `<div class="economic-empty">${(0, i18n_1.t)('components.tradePolicy.noTariffData')}</div>`;
        }
        const rows = [...this.tariffsData.datapoints].sort((a, b) => b.year - a.year).map(d => `<tr>
        <td>${d.year}</td>
        <td>${d.tariffRate.toFixed(1)}%</td>
        <td>${(0, sanitize_1.escapeHtml)(d.productSector || '—')}</td>
      </tr>`).join('');
        return `<div class="trade-tariffs-table">
      <table>
        <thead>
          <tr>
            <th>Year</th>
            <th>${(0, i18n_1.t)('components.tradePolicy.appliedRate')}</th>
            <th>Sector</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
    }
    renderFlows() {
        if (!this.flowsData || this.flowsData.flows.length === 0) {
            return `<div class="economic-empty">${(0, i18n_1.t)('components.tradePolicy.noFlowData')}</div>`;
        }
        return `<div class="trade-flows-list">
      ${this.flowsData.flows.map(f => {
            const exportArrow = f.yoyExportChange >= 0 ? '▲' : '▼';
            const importArrow = f.yoyImportChange >= 0 ? '▲' : '▼';
            const exportClass = f.yoyExportChange >= 0 ? 'change-positive' : 'change-negative';
            const importClass = f.yoyImportChange >= 0 ? 'change-positive' : 'change-negative';
            return `<div class="trade-flow-card">
          <div class="trade-flow-year">${f.year}</div>
          <div class="trade-flow-metrics">
            <div class="trade-flow-metric">
              <span class="trade-flow-label">${(0, i18n_1.t)('components.tradePolicy.exports')}</span>
              <span class="trade-flow-value">$${f.exportValueUsd.toFixed(0)}M</span>
              <span class="trade-flow-change ${exportClass}">${exportArrow} ${Math.abs(f.yoyExportChange).toFixed(1)}%</span>
            </div>
            <div class="trade-flow-metric">
              <span class="trade-flow-label">${(0, i18n_1.t)('components.tradePolicy.imports')}</span>
              <span class="trade-flow-value">$${f.importValueUsd.toFixed(0)}M</span>
              <span class="trade-flow-change ${importClass}">${importArrow} ${Math.abs(f.yoyImportChange).toFixed(1)}%</span>
            </div>
          </div>
        </div>`;
        }).join('')}
    </div>`;
    }
    renderBarriers() {
        if (!this.barriersData || this.barriersData.barriers.length === 0) {
            return `<div class="economic-empty">${(0, i18n_1.t)('components.tradePolicy.noBarriers')}</div>`;
        }
        return `<div class="trade-barriers-list">
      ${this.barriersData.barriers.map(b => {
            const sourceLink = this.renderSourceUrl(b.sourceUrl);
            return `<div class="trade-barrier-card">
          <div class="trade-barrier-header">
            <span class="trade-country">${(0, sanitize_1.escapeHtml)(b.notifyingCountry)}</span>
            <span class="trade-badge">${(0, sanitize_1.escapeHtml)(b.measureType)}</span>
          </div>
          <div class="trade-barrier-body">
            <div class="trade-barrier-title">${(0, sanitize_1.escapeHtml)(b.title)}</div>
            ${b.productDescription ? `<div class="trade-sector">${(0, sanitize_1.escapeHtml)(b.productDescription)}</div>` : ''}
            ${b.objective ? `<div class="trade-description">${(0, sanitize_1.escapeHtml)(b.objective)}</div>` : ''}
          </div>
          <div class="trade-barrier-footer">
            ${b.dateDistributed ? `<span class="trade-date">${(0, sanitize_1.escapeHtml)(b.dateDistributed)}</span>` : ''}
            ${sourceLink}
          </div>
        </div>`;
        }).join('')}
    </div>`;
    }
    renderSourceUrl(url) {
        if (!url)
            return '';
        try {
            const parsed = new URL(url);
            if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
                return `<a href="${(0, sanitize_1.escapeHtml)(url)}" target="_blank" rel="noopener" class="trade-source-link">Source</a>`;
            }
        }
        catch { /* invalid URL */ }
        return '';
    }
}
exports.TradePolicyPanel = TradePolicyPanel;
