"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupplyChainPanel = void 0;
const Panel_1 = require("./Panel");
const i18n_1 = require("@/services/i18n");
const sanitize_1 = require("@/utils/sanitize");
const runtime_config_1 = require("@/services/runtime-config");
const runtime_1 = require("@/services/runtime");
class SupplyChainPanel extends Panel_1.Panel {
    constructor() {
        super({ id: 'supply-chain', title: (0, i18n_1.t)('panels.supplyChain') });
        this.shippingData = null;
        this.chokepointData = null;
        this.mineralsData = null;
        this.activeTab = 'chokepoints';
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
    updateShippingRates(data) {
        this.shippingData = data;
        this.render();
    }
    updateChokepointStatus(data) {
        this.chokepointData = data;
        this.render();
    }
    updateCriticalMinerals(data) {
        this.mineralsData = data;
        this.render();
    }
    render() {
        const tabsHtml = `
      <div class="economic-tabs">
        <button class="economic-tab ${this.activeTab === 'chokepoints' ? 'active' : ''}" data-tab="chokepoints">
          ${(0, i18n_1.t)('components.supplyChain.chokepoints')}
        </button>
        <button class="economic-tab ${this.activeTab === 'shipping' ? 'active' : ''}" data-tab="shipping">
          ${(0, i18n_1.t)('components.supplyChain.shipping')}
        </button>
        <button class="economic-tab ${this.activeTab === 'minerals' ? 'active' : ''}" data-tab="minerals">
          ${(0, i18n_1.t)('components.supplyChain.minerals')}
        </button>
      </div>
    `;
        const activeData = this.activeTab === 'chokepoints' ? this.chokepointData
            : this.activeTab === 'shipping' ? this.shippingData
                : this.mineralsData;
        const unavailableBanner = activeData?.upstreamUnavailable
            ? `<div class="economic-warning">${(0, i18n_1.t)('components.supplyChain.upstreamUnavailable')}</div>`
            : '';
        let contentHtml = '';
        switch (this.activeTab) {
            case 'chokepoints':
                contentHtml = this.renderChokepoints();
                break;
            case 'shipping':
                contentHtml = this.renderShipping();
                break;
            case 'minerals':
                contentHtml = this.renderMinerals();
                break;
        }
        this.setContent(`
      ${tabsHtml}
      ${unavailableBanner}
      <div class="economic-content">${contentHtml}</div>
      <div class="economic-footer">
        <span class="economic-source">${(0, i18n_1.t)('components.supplyChain.sources')}</span>
      </div>
    `);
    }
    renderChokepoints() {
        if (!this.chokepointData || this.chokepointData.chokepoints.length === 0) {
            return `<div class="economic-empty">${(0, i18n_1.t)('components.supplyChain.noChokepoints')}</div>`;
        }
        return `<div class="trade-restrictions-list">
      ${[...this.chokepointData.chokepoints].sort((a, b) => b.disruptionScore - a.disruptionScore).map(cp => {
            const statusClass = cp.status === 'red' ? 'status-active' : cp.status === 'yellow' ? 'status-notified' : 'status-terminated';
            const statusDot = cp.status === 'red' ? 'sc-dot-red' : cp.status === 'yellow' ? 'sc-dot-yellow' : 'sc-dot-green';
            return `<div class="trade-restriction-card">
          <div class="trade-restriction-header">
            <span class="trade-country">${(0, sanitize_1.escapeHtml)(cp.name)}</span>
            <span class="sc-status-dot ${statusDot}"></span>
            <span class="trade-badge">${cp.disruptionScore}/100</span>
            <span class="trade-status ${statusClass}">${(0, sanitize_1.escapeHtml)(cp.status)}</span>
          </div>
          <div class="trade-restriction-body">
            <div class="trade-sector">${cp.activeWarnings} ${(0, i18n_1.t)('components.supplyChain.warnings')}</div>
            <div class="trade-description">${(0, sanitize_1.escapeHtml)(cp.description)}</div>
            <div class="trade-affected">${(0, sanitize_1.escapeHtml)(cp.affectedRoutes.join(', '))}</div>
          </div>
        </div>`;
        }).join('')}
    </div>`;
    }
    renderShipping() {
        if ((0, runtime_1.isDesktopRuntime)() && !(0, runtime_config_1.isFeatureAvailable)('supplyChain')) {
            return `<div class="economic-empty">${(0, i18n_1.t)('components.supplyChain.fredKeyMissing')}</div>`;
        }
        if (!this.shippingData || this.shippingData.indices.length === 0) {
            return `<div class="economic-empty">${(0, i18n_1.t)('components.supplyChain.noShipping')}</div>`;
        }
        return `<div class="trade-restrictions-list">
      ${this.shippingData.indices.map(idx => {
            const changeClass = idx.changePct >= 0 ? 'change-positive' : 'change-negative';
            const changeArrow = idx.changePct >= 0 ? '\u25B2' : '\u25BC';
            const sparkline = this.renderSparkline(idx.history.map(h => h.value));
            const spikeBanner = idx.spikeAlert
                ? `<div class="economic-warning">${(0, i18n_1.t)('components.supplyChain.spikeAlert')}</div>`
                : '';
            return `<div class="trade-restriction-card">
          ${spikeBanner}
          <div class="trade-restriction-header">
            <span class="trade-country">${(0, sanitize_1.escapeHtml)(idx.name)}</span>
            <span class="trade-badge">${idx.currentValue.toFixed(0)} ${(0, sanitize_1.escapeHtml)(idx.unit)}</span>
            <span class="trade-flow-change ${changeClass}">${changeArrow} ${Math.abs(idx.changePct).toFixed(1)}%</span>
          </div>
          <div class="trade-restriction-body">
            ${sparkline}
          </div>
        </div>`;
        }).join('')}
    </div>`;
    }
    renderSparkline(values) {
        if (values.length < 2)
            return '';
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;
        const w = 200;
        const h = 40;
        const points = values.map((v, i) => {
            const x = (i / (values.length - 1)) * w;
            const y = h - ((v - min) / range) * h;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');
        return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;margin:4px 0">
      <polyline points="${points}" fill="none" stroke="var(--accent-primary, #4fc3f7)" stroke-width="1.5" />
    </svg>`;
    }
    renderMinerals() {
        if (!this.mineralsData || this.mineralsData.minerals.length === 0) {
            return `<div class="economic-empty">${(0, i18n_1.t)('components.supplyChain.noMinerals')}</div>`;
        }
        const rows = this.mineralsData.minerals.map(m => {
            const riskClass = m.riskRating === 'critical' ? 'sc-risk-critical'
                : m.riskRating === 'high' ? 'sc-risk-high'
                    : m.riskRating === 'moderate' ? 'sc-risk-moderate'
                        : 'sc-risk-low';
            const top3 = m.topProducers.slice(0, 3).map(p => `${(0, sanitize_1.escapeHtml)(p.country)} ${p.sharePct.toFixed(0)}%`).join(', ');
            return `<tr>
        <td>${(0, sanitize_1.escapeHtml)(m.mineral)}</td>
        <td>${top3}</td>
        <td>${m.hhi.toFixed(0)}</td>
        <td><span class="${riskClass}">${(0, sanitize_1.escapeHtml)(m.riskRating)}</span></td>
      </tr>`;
        }).join('');
        return `<div class="trade-tariffs-table">
      <table>
        <thead>
          <tr>
            <th>${(0, i18n_1.t)('components.supplyChain.mineral')}</th>
            <th>${(0, i18n_1.t)('components.supplyChain.topProducers')}</th>
            <th>HHI</th>
            <th>${(0, i18n_1.t)('components.supplyChain.risk')}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
    }
}
exports.SupplyChainPanel = SupplyChainPanel;
