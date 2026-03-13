"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CryptoPanel = exports.CommoditiesPanel = exports.HeatmapPanel = exports.MarketPanel = void 0;
const Panel_1 = require("./Panel");
const i18n_1 = require("@/services/i18n");
const utils_1 = require("@/utils");
const sanitize_1 = require("@/utils/sanitize");
function miniSparkline(data, change, w = 50, h = 16) {
    if (!data || data.length < 2)
        return '';
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const color = change != null && change >= 0 ? 'var(--green)' : 'var(--red)';
    const points = data.map((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((v - min) / range) * (h - 2) - 1;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" class="mini-sparkline"><polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
class MarketPanel extends Panel_1.Panel {
    constructor() {
        super({ id: 'markets', title: (0, i18n_1.t)('panels.markets') });
    }
    renderMarkets(data, rateLimited) {
        if (data.length === 0) {
            this.showError(rateLimited ? (0, i18n_1.t)('common.rateLimitedMarket') : (0, i18n_1.t)('common.failedMarketData'));
            return;
        }
        const html = data
            .map((stock) => `
      <div class="market-item">
        <div class="market-info">
          <span class="market-name">${(0, sanitize_1.escapeHtml)(stock.name)}</span>
          <span class="market-symbol">${(0, sanitize_1.escapeHtml)(stock.display)}</span>
        </div>
        <div class="market-data">
          ${miniSparkline(stock.sparkline, stock.change)}
          <span class="market-price">${(0, utils_1.formatPrice)(stock.price)}</span>
          <span class="market-change ${(0, utils_1.getChangeClass)(stock.change)}">${(0, utils_1.formatChange)(stock.change)}</span>
        </div>
      </div>
    `)
            .join('');
        this.setContent(html);
    }
}
exports.MarketPanel = MarketPanel;
class HeatmapPanel extends Panel_1.Panel {
    constructor() {
        super({ id: 'heatmap', title: (0, i18n_1.t)('panels.heatmap') });
    }
    renderHeatmap(data) {
        const validData = data.filter((d) => d.change !== null);
        if (validData.length === 0) {
            this.showError((0, i18n_1.t)('common.failedSectorData'));
            return;
        }
        const html = '<div class="heatmap">' +
            validData
                .map((sector) => `
        <div class="heatmap-cell ${(0, utils_1.getHeatmapClass)(sector.change)}">
          <div class="sector-name">${(0, sanitize_1.escapeHtml)(sector.name)}</div>
          <div class="sector-change ${(0, utils_1.getChangeClass)(sector.change)}">${(0, utils_1.formatChange)(sector.change)}</div>
        </div>
      `)
                .join('') +
            '</div>';
        this.setContent(html);
    }
}
exports.HeatmapPanel = HeatmapPanel;
class CommoditiesPanel extends Panel_1.Panel {
    constructor() {
        super({ id: 'commodities', title: (0, i18n_1.t)('panels.commodities') });
    }
    renderCommodities(data) {
        const validData = data.filter((d) => d.price !== null);
        if (validData.length === 0) {
            this.showError((0, i18n_1.t)('common.failedCommodities'));
            return;
        }
        const html = '<div class="commodities-grid">' +
            validData
                .map((c) => `
        <div class="commodity-item">
          <div class="commodity-name">${(0, sanitize_1.escapeHtml)(c.display)}</div>
          ${miniSparkline(c.sparkline, c.change, 60, 18)}
          <div class="commodity-price">${(0, utils_1.formatPrice)(c.price)}</div>
          <div class="commodity-change ${(0, utils_1.getChangeClass)(c.change)}">${(0, utils_1.formatChange)(c.change)}</div>
        </div>
      `)
                .join('') +
            '</div>';
        this.setContent(html);
    }
}
exports.CommoditiesPanel = CommoditiesPanel;
class CryptoPanel extends Panel_1.Panel {
    constructor() {
        super({ id: 'crypto', title: (0, i18n_1.t)('panels.crypto') });
    }
    renderCrypto(data) {
        if (data.length === 0) {
            this.showError((0, i18n_1.t)('common.failedCryptoData'));
            return;
        }
        const html = data
            .map((coin) => `
      <div class="market-item">
        <div class="market-info">
          <span class="market-name">${(0, sanitize_1.escapeHtml)(coin.name)}</span>
          <span class="market-symbol">${(0, sanitize_1.escapeHtml)(coin.symbol)}</span>
        </div>
        <div class="market-data">
          ${miniSparkline(coin.sparkline, coin.change)}
          <span class="market-price">$${coin.price.toLocaleString()}</span>
          <span class="market-change ${(0, utils_1.getChangeClass)(coin.change)}">${(0, utils_1.formatChange)(coin.change)}</span>
        </div>
      </div>
    `)
            .join('');
        this.setContent(html);
    }
}
exports.CryptoPanel = CryptoPanel;
