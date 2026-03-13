"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StablecoinPanel = void 0;
const Panel_1 = require("./Panel");
const i18n_1 = require("@/services/i18n");
const sanitize_1 = require("@/utils/sanitize");
const service_client_1 = require("@/generated/client/worldmonitor/market/v1/service_client");
function formatLargeNum(v) {
    if (v >= 1e12)
        return `$${(v / 1e12).toFixed(1)}T`;
    if (v >= 1e9)
        return `$${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6)
        return `$${(v / 1e6).toFixed(0)}M`;
    return `$${v.toLocaleString()}`;
}
function pegClass(status) {
    if (status === 'ON PEG')
        return 'peg-on';
    if (status === 'SLIGHT DEPEG')
        return 'peg-slight';
    return 'peg-off';
}
function healthClass(status) {
    if (status === 'HEALTHY')
        return 'health-good';
    if (status === 'CAUTION')
        return 'health-caution';
    return 'health-warning';
}
class StablecoinPanel extends Panel_1.Panel {
    constructor() {
        super({ id: 'stablecoins', title: (0, i18n_1.t)('panels.stablecoins'), showCount: false });
        this.data = null;
        this.loading = true;
        this.error = null;
        void this.fetchData();
    }
    async fetchData() {
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const client = new service_client_1.MarketServiceClient('', { fetch: (...args) => globalThis.fetch(...args) });
                this.data = await client.listStablecoinMarkets({ coins: [] });
                this.error = null;
                if (this.data && this.data.stablecoins.length === 0 && attempt < 2) {
                    this.showRetrying();
                    await new Promise(r => setTimeout(r, 20000));
                    continue;
                }
                break;
            }
            catch (err) {
                if (this.isAbortError(err))
                    return;
                if (attempt < 2) {
                    this.showRetrying();
                    await new Promise(r => setTimeout(r, 20000));
                    continue;
                }
                this.error = err instanceof Error ? err.message : 'Failed to fetch';
            }
        }
        this.loading = false;
        this.renderPanel();
    }
    renderPanel() {
        if (this.loading) {
            this.showLoading((0, i18n_1.t)('common.loadingStablecoins'));
            return;
        }
        if (this.error || !this.data) {
            this.showError(this.error || (0, i18n_1.t)('common.noDataShort'));
            return;
        }
        const d = this.data;
        if (!d.stablecoins.length) {
            this.setContent(`<div class="panel-loading-text">${(0, i18n_1.t)('components.stablecoins.unavailable')}</div>`);
            return;
        }
        const s = d.summary || { totalMarketCap: 0, totalVolume24h: 0, coinCount: 0, depeggedCount: 0, healthStatus: 'UNAVAILABLE' };
        const pegRows = d.stablecoins.map(c => `
      <div class="stable-row">
        <div class="stable-info">
          <span class="stable-symbol">${(0, sanitize_1.escapeHtml)(c.symbol)}</span>
          <span class="stable-name">${(0, sanitize_1.escapeHtml)(c.name)}</span>
        </div>
        <div class="stable-price">$${c.price.toFixed(4)}</div>
        <div class="stable-peg ${pegClass(c.pegStatus)}">
          <span class="peg-badge">${(0, sanitize_1.escapeHtml)(c.pegStatus)}</span>
          <span class="peg-dev">${c.deviation.toFixed(2)}%</span>
        </div>
      </div>
    `).join('');
        const supplyRows = d.stablecoins.map(c => `
      <div class="stable-supply-row">
        <span class="stable-symbol">${(0, sanitize_1.escapeHtml)(c.symbol)}</span>
        <span class="stable-mcap">${formatLargeNum(c.marketCap)}</span>
        <span class="stable-vol">${formatLargeNum(c.volume24h)}</span>
        <span class="stable-change ${c.change24h >= 0 ? 'change-positive' : 'change-negative'}">${c.change24h >= 0 ? '+' : ''}${c.change24h.toFixed(2)}%</span>
      </div>
    `).join('');
        const html = `
      <div class="stablecoin-container">
        <div class="stable-health ${healthClass(s.healthStatus)}">
          <span class="health-label">${(0, sanitize_1.escapeHtml)(s.healthStatus)}</span>
          <span class="health-detail">MCap: ${formatLargeNum(s.totalMarketCap)} | Vol: ${formatLargeNum(s.totalVolume24h)}</span>
        </div>
        <div class="stable-section">
          <div class="stable-section-title">${(0, i18n_1.t)('components.stablecoins.pegHealth')}</div>
          <div class="stable-peg-list">${pegRows}</div>
        </div>
        <div class="stable-section">
          <div class="stable-section-title">${(0, i18n_1.t)('components.stablecoins.supplyVolume')}</div>
          <div class="stable-supply-header">
            <span>${(0, i18n_1.t)('components.stablecoins.token')}</span><span>${(0, i18n_1.t)('components.stablecoins.mcap')}</span><span>${(0, i18n_1.t)('components.stablecoins.vol24h')}</span><span>${(0, i18n_1.t)('components.stablecoins.chg24h')}</span>
          </div>
          <div class="stable-supply-list">${supplyRows}</div>
        </div>
      </div>
    `;
        this.setContent(html);
    }
}
exports.StablecoinPanel = StablecoinPanel;
