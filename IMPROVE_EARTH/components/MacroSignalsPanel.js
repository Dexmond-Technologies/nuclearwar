"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MacroSignalsPanel = void 0;
const Panel_1 = require("./Panel");
const sanitize_1 = require("@/utils/sanitize");
const i18n_1 = require("@/services/i18n");
const service_client_1 = require("@/generated/client/worldmonitor/economic/v1/service_client");
const bootstrap_1 = require("@/services/bootstrap");
const economicClient = new service_client_1.EconomicServiceClient('', { fetch: (...args) => globalThis.fetch(...args) });
/** Map proto response (optional fields = undefined) to MacroSignalData (null for absent values). */
function mapProtoToData(r) {
    const s = r.signals;
    return {
        timestamp: r.timestamp,
        verdict: r.verdict,
        bullishCount: r.bullishCount,
        totalCount: r.totalCount,
        signals: {
            liquidity: {
                status: s?.liquidity?.status ?? 'UNKNOWN',
                value: s?.liquidity?.value ?? null,
                sparkline: s?.liquidity?.sparkline ?? [],
            },
            flowStructure: {
                status: s?.flowStructure?.status ?? 'UNKNOWN',
                btcReturn5: s?.flowStructure?.btcReturn5 ?? null,
                qqqReturn5: s?.flowStructure?.qqqReturn5 ?? null,
            },
            macroRegime: {
                status: s?.macroRegime?.status ?? 'UNKNOWN',
                qqqRoc20: s?.macroRegime?.qqqRoc20 ?? null,
                xlpRoc20: s?.macroRegime?.xlpRoc20 ?? null,
            },
            technicalTrend: {
                status: s?.technicalTrend?.status ?? 'UNKNOWN',
                btcPrice: s?.technicalTrend?.btcPrice ?? null,
                sma50: s?.technicalTrend?.sma50 ?? null,
                sma200: s?.technicalTrend?.sma200 ?? null,
                vwap30d: s?.technicalTrend?.vwap30d ?? null,
                mayerMultiple: s?.technicalTrend?.mayerMultiple ?? null,
                sparkline: s?.technicalTrend?.sparkline ?? [],
            },
            hashRate: {
                status: s?.hashRate?.status ?? 'UNKNOWN',
                change30d: s?.hashRate?.change30d ?? null,
            },
            miningCost: {
                status: s?.miningCost?.status ?? 'UNKNOWN',
            },
            fearGreed: {
                status: s?.fearGreed?.status ?? 'UNKNOWN',
                value: s?.fearGreed?.value ?? null,
                history: s?.fearGreed?.history ?? [],
            },
        },
        meta: { qqqSparkline: r.meta?.qqqSparkline ?? [] },
        unavailable: r.unavailable,
    };
}
function sparklineSvg(data, width = 80, height = 24, color = '#4fc3f7') {
    if (!data || data.length < 2)
        return '';
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const points = data.map((v, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((v - min) / range) * (height - 2) - 1;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="signal-sparkline"><polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function donutGaugeSvg(value, size = 48) {
    if (value === null)
        return '<span class="signal-value unknown">N/A</span>';
    const v = Math.max(0, Math.min(100, value));
    const r = (size - 6) / 2;
    const circumference = 2 * Math.PI * r;
    const offset = circumference - (v / 100) * circumference;
    let color = '#f44336';
    if (v >= 75)
        color = '#4caf50';
    else if (v >= 50)
        color = '#ff9800';
    else if (v >= 25)
        color = '#ff5722';
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="fg-donut">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="5"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="5" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round" transform="rotate(-90 ${size / 2} ${size / 2})"/>
    <text x="${size / 2}" y="${size / 2 + 4}" text-anchor="middle" fill="${color}" font-size="12" font-weight="bold">${v}</text>
  </svg>`;
}
function statusBadgeClass(status) {
    const s = status.toUpperCase();
    if (['BULLISH', 'RISK-ON', 'GROWING', 'PROFITABLE', 'ALIGNED', 'NORMAL', 'EXTREME GREED', 'GREED'].includes(s))
        return 'badge-bullish';
    if (['BEARISH', 'DEFENSIVE', 'DECLINING', 'SQUEEZE', 'PASSIVE GAP', 'EXTREME FEAR', 'FEAR'].includes(s))
        return 'badge-bearish';
    return 'badge-neutral';
}
function formatNum(v, suffix = '%') {
    if (v === null)
        return 'N/A';
    const sign = v > 0 ? '+' : '';
    return `${sign}${v.toFixed(1)}${suffix}`;
}
class MacroSignalsPanel extends Panel_1.Panel {
    constructor() {
        super({ id: 'macro-signals', title: (0, i18n_1.t)('panels.macroSignals'), showCount: false });
        this.data = null;
        this.loading = true;
        this.error = null;
        this.lastTimestamp = '';
        void this.fetchData();
    }
    async fetchData() {
        const hydrated = (0, bootstrap_1.getHydratedData)('macroSignals');
        if (hydrated) {
            this.data = mapProtoToData(hydrated);
            this.lastTimestamp = this.data.timestamp;
            this.error = null;
            this.loading = false;
            this.renderPanel();
            return true;
        }
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const res = await economicClient.getMacroSignals({});
                this.data = mapProtoToData(res);
                this.error = null;
                if (this.data && this.data.unavailable && attempt < 2) {
                    this.showRetrying();
                    await new Promise(r => setTimeout(r, 20000));
                    continue;
                }
                break;
            }
            catch (err) {
                if (this.isAbortError(err))
                    return false;
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
        const ts = this.data?.timestamp ?? '';
        const changed = ts !== this.lastTimestamp;
        this.lastTimestamp = ts;
        return changed;
    }
    renderPanel() {
        if (this.loading) {
            this.showLoading((0, i18n_1.t)('common.computingSignals'));
            return;
        }
        if (this.error || !this.data) {
            this.showError(this.error || (0, i18n_1.t)('common.noDataShort'));
            return;
        }
        if (this.data.unavailable) {
            this.showError((0, i18n_1.t)('common.upstreamUnavailable'));
            return;
        }
        const d = this.data;
        const s = d.signals;
        const verdictClass = d.verdict === 'BUY' ? 'verdict-buy' : d.verdict === 'CASH' ? 'verdict-cash' : 'verdict-unknown';
        const html = `
      <div class="macro-signals-container">
        <div class="macro-verdict ${verdictClass}">
          <span class="verdict-label">${(0, i18n_1.t)('components.macroSignals.overall')}</span>
          <span class="verdict-value">${d.verdict === 'BUY' ? (0, i18n_1.t)('components.macroSignals.verdict.buy') : d.verdict === 'CASH' ? (0, i18n_1.t)('components.macroSignals.verdict.cash') : (0, sanitize_1.escapeHtml)(d.verdict)}</span>
          <span class="verdict-detail">${(0, i18n_1.t)('components.macroSignals.bullish', { count: String(d.bullishCount), total: String(d.totalCount) })}</span>
        </div>
        <div class="signals-grid">
          ${this.renderSignalCard((0, i18n_1.t)('components.macroSignals.signals.liquidity'), s.liquidity.status, formatNum(s.liquidity.value), sparklineSvg(s.liquidity.sparkline, 60, 20, '#4fc3f7'), 'JPY 30d ROC', 'https://www.tradingview.com/symbols/JPYUSD/')}
          ${this.renderSignalCard((0, i18n_1.t)('components.macroSignals.signals.flow'), s.flowStructure.status, `BTC ${formatNum(s.flowStructure.btcReturn5)} / QQQ ${formatNum(s.flowStructure.qqqReturn5)}`, '', '5d returns', null)}
          ${this.renderSignalCard((0, i18n_1.t)('components.macroSignals.signals.regime'), s.macroRegime.status, `QQQ ${formatNum(s.macroRegime.qqqRoc20)} / XLP ${formatNum(s.macroRegime.xlpRoc20)}`, sparklineSvg(d.meta.qqqSparkline, 60, 20, '#ab47bc'), '20d ROC', 'https://www.tradingview.com/symbols/QQQ/')}
          ${this.renderSignalCard((0, i18n_1.t)('components.macroSignals.signals.btcTrend'), s.technicalTrend.status, `$${s.technicalTrend.btcPrice?.toLocaleString() ?? 'N/A'}`, sparklineSvg(s.technicalTrend.sparkline, 60, 20, '#ff9800'), `SMA50: $${s.technicalTrend.sma50?.toLocaleString() ?? '-'} | VWAP: $${s.technicalTrend.vwap30d?.toLocaleString() ?? '-'} | Mayer: ${s.technicalTrend.mayerMultiple ?? '-'}`, 'https://www.tradingview.com/symbols/BTCUSD/')}
          ${this.renderSignalCard((0, i18n_1.t)('components.macroSignals.signals.hashRate'), s.hashRate.status, formatNum(s.hashRate.change30d), '', '30d change', 'https://mempool.space/mining')}
          ${this.renderSignalCard((0, i18n_1.t)('components.macroSignals.signals.mining'), s.miningCost.status, '', '', 'Hashprice model', null)}
          ${this.renderFearGreedCard(s.fearGreed)}
        </div>
      </div>
    `;
        this.setContent(html);
    }
    renderSignalCard(name, status, value, sparkline, detail, link) {
        const badgeClass = statusBadgeClass(status);
        return `
      <div class="signal-card${link ? ' signal-card-linked' : ''}">
        <div class="signal-header">
          ${link ? `<a href="${(0, sanitize_1.escapeHtml)(link)}" target="_blank" rel="noopener" class="signal-name signal-card-link">${(0, sanitize_1.escapeHtml)(name)}</a>` : `<span class="signal-name">${(0, sanitize_1.escapeHtml)(name)}</span>`}
          <span class="signal-badge ${badgeClass}">${(0, sanitize_1.escapeHtml)(status)}</span>
        </div>
        <div class="signal-body">
          ${sparkline ? `<div class="signal-sparkline-wrap">${sparkline}</div>` : ''}
          ${value ? `<span class="signal-value">${value}</span>` : ''}
        </div>
        ${detail ? `<div class="signal-detail">${(0, sanitize_1.escapeHtml)(detail)}</div>` : ''}
      </div>
    `;
    }
    renderFearGreedCard(fg) {
        const badgeClass = statusBadgeClass(fg.status);
        return `
      <div class="signal-card signal-card-fg">
        <div class="signal-header">
          <span class="signal-name">${(0, i18n_1.t)('components.macroSignals.signals.fearGreed')}</span>
          <span class="signal-badge ${badgeClass}">${(0, sanitize_1.escapeHtml)(fg.status)}</span>
        </div>
        <div class="signal-body signal-body-fg">
          ${donutGaugeSvg(fg.value)}
        </div>
        <div class="signal-detail">
          <a href="https://alternative.me/crypto/fear-and-greed-index/" target="_blank" rel="noopener">alternative.me</a>
        </div>
      </div>
    `;
    }
}
exports.MacroSignalsPanel = MacroSignalsPanel;
