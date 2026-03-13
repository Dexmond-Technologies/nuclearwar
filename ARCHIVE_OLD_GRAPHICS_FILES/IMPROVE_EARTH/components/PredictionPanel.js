"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PredictionPanel = void 0;
const Panel_1 = require("./Panel");
const sanitize_1 = require("@/utils/sanitize");
const i18n_1 = require("@/services/i18n");
class PredictionPanel extends Panel_1.Panel {
    constructor() {
        super({
            id: 'polymarket',
            title: (0, i18n_1.t)('panels.polymarket'),
            infoTooltip: (0, i18n_1.t)('components.prediction.infoTooltip'),
        });
    }
    formatVolume(volume) {
        if (!volume)
            return '';
        if (volume >= 1000000)
            return `$${(volume / 1000000).toFixed(1)}M`;
        if (volume >= 1000)
            return `$${(volume / 1000).toFixed(0)}K`;
        return `$${volume.toFixed(0)}`;
    }
    renderPredictions(data) {
        if (data.length === 0) {
            this.showError((0, i18n_1.t)('common.failedPredictions'));
            return;
        }
        const html = data
            .map((p) => {
            const yesPercent = Math.round(p.yesPrice);
            const noPercent = 100 - yesPercent;
            const volumeStr = this.formatVolume(p.volume);
            const safeUrl = (0, sanitize_1.sanitizeUrl)(p.url || '');
            const titleHtml = safeUrl
                ? `<a href="${safeUrl}" target="_blank" rel="noopener" class="prediction-question prediction-link">${(0, sanitize_1.escapeHtml)(p.title)}</a>`
                : `<div class="prediction-question">${(0, sanitize_1.escapeHtml)(p.title)}</div>`;
            let expiryHtml = '';
            if (p.endDate) {
                const d = new Date(p.endDate);
                if (Number.isFinite(d.getTime())) {
                    const formatted = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                    expiryHtml = `<span class="prediction-expiry">${(0, i18n_1.t)('components.predictions.closes')}: ${formatted}</span>`;
                }
            }
            const metaHtml = (volumeStr || expiryHtml)
                ? `<div class="prediction-meta">${volumeStr ? `<span class="prediction-volume">${(0, i18n_1.t)('components.predictions.vol')}: ${volumeStr}</span>` : ''}${expiryHtml}</div>`
                : '';
            return `
      <div class="prediction-item">
        ${titleHtml}
        ${metaHtml}
        <div class="prediction-bar">
          <div class="prediction-yes" style="width: ${yesPercent}%">
            <span class="prediction-label">${(0, i18n_1.t)('components.predictions.yes')} ${yesPercent}%</span>
          </div>
          <div class="prediction-no" style="width: ${noPercent}%">
            <span class="prediction-label">${(0, i18n_1.t)('components.predictions.no')} ${noPercent}%</span>
          </div>
        </div>
      </div>
    `;
        })
            .join('');
        this.setContent(html);
    }
}
exports.PredictionPanel = PredictionPanel;
