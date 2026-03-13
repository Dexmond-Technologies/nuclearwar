"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClimateAnomalyPanel = void 0;
const Panel_1 = require("./Panel");
const sanitize_1 = require("@/utils/sanitize");
const climate_1 = require("@/services/climate");
const i18n_1 = require("@/services/i18n");
class ClimateAnomalyPanel extends Panel_1.Panel {
    constructor() {
        super({
            id: 'climate',
            title: (0, i18n_1.t)('panels.climate'),
            showCount: true,
            trackActivity: true,
            infoTooltip: (0, i18n_1.t)('components.climate.infoTooltip'),
        });
        this.anomalies = [];
        this.showLoading((0, i18n_1.t)('common.loadingClimateData'));
    }
    setZoneClickHandler(handler) {
        this.onZoneClick = handler;
    }
    setAnomalies(anomalies) {
        this.anomalies = anomalies;
        this.setCount(anomalies.length);
        this.renderContent();
    }
    renderContent() {
        if (this.anomalies.length === 0) {
            this.setContent(`<div class="panel-empty">${(0, i18n_1.t)('components.climate.noAnomalies')}</div>`);
            return;
        }
        const sorted = [...this.anomalies].sort((a, b) => {
            const severityOrder = { extreme: 0, moderate: 1, normal: 2 };
            return (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2);
        });
        const rows = sorted.map(a => {
            const icon = (0, climate_1.getSeverityIcon)(a);
            const tempClass = a.tempDelta > 0 ? 'climate-warm' : 'climate-cold';
            const precipClass = a.precipDelta > 0 ? 'climate-wet' : 'climate-dry';
            const sevClass = `severity-${a.severity}`;
            const rowClass = a.severity === 'extreme' ? ' climate-extreme-row' : '';
            return `<tr class="climate-row${rowClass}" data-lat="${a.lat}" data-lon="${a.lon}">
        <td class="climate-zone"><span class="climate-icon">${icon}</span>${(0, sanitize_1.escapeHtml)(a.zone)}</td>
        <td class="climate-num ${tempClass}">${(0, climate_1.formatDelta)(a.tempDelta, '°C')}</td>
        <td class="climate-num ${precipClass}">${(0, climate_1.formatDelta)(a.precipDelta, 'mm')}</td>
        <td><span class="climate-badge ${sevClass}">${(0, i18n_1.t)(`components.climate.severity.${a.severity}`)}</span></td>
      </tr>`;
        }).join('');
        this.setContent(`
      <div class="climate-panel-content">
        <table class="climate-table">
          <thead>
            <tr>
              <th>${(0, i18n_1.t)('components.climate.zone')}</th>
              <th>${(0, i18n_1.t)('components.climate.temp')}</th>
              <th>${(0, i18n_1.t)('components.climate.precip')}</th>
              <th>${(0, i18n_1.t)('components.climate.severityLabel')}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `);
        this.content.querySelectorAll('.climate-row').forEach(el => {
            el.addEventListener('click', () => {
                const lat = Number(el.dataset.lat);
                const lon = Number(el.dataset.lon);
                if (Number.isFinite(lat) && Number.isFinite(lon))
                    this.onZoneClick?.(lat, lon);
            });
        });
    }
}
exports.ClimateAnomalyPanel = ClimateAnomalyPanel;
