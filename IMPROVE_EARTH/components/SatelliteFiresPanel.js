"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SatelliteFiresPanel = void 0;
const Panel_1 = require("./Panel");
const i18n_1 = require("@/services/i18n");
class SatelliteFiresPanel extends Panel_1.Panel {
    constructor() {
        super({
            id: 'satellite-fires',
            title: (0, i18n_1.t)('panels.satelliteFires'),
            showCount: true,
            trackActivity: true,
            infoTooltip: (0, i18n_1.t)('components.satelliteFires.infoTooltip'),
        });
        this.stats = [];
        this.totalCount = 0;
        this.lastUpdated = null;
        this.showLoading((0, i18n_1.t)('common.scanningThermalData'));
    }
    update(stats, totalCount) {
        const prevCount = this.totalCount;
        this.stats = stats;
        this.totalCount = totalCount;
        this.lastUpdated = new Date();
        this.setCount(totalCount);
        if (prevCount > 0 && totalCount > prevCount) {
            this.setNewBadge(totalCount - prevCount);
        }
        this.render();
    }
    render() {
        if (this.stats.length === 0) {
            this.setContent(`<div class="panel-empty">${(0, i18n_1.t)('common.noDataAvailable')}</div>`);
            return;
        }
        const rows = this.stats.map(s => {
            const frpStr = s.totalFrp >= 1000
                ? `${(s.totalFrp / 1000).toFixed(1)}k`
                : Math.round(s.totalFrp).toLocaleString();
            const highClass = s.highIntensityCount > 0 ? ' fires-high' : '';
            return `<tr class="fire-row${highClass}">
        <td class="fire-region">${escapeHtml(s.region)}</td>
        <td class="fire-count">${s.fireCount}</td>
        <td class="fire-hi">${s.highIntensityCount}</td>
        <td class="fire-frp">${frpStr}</td>
      </tr>`;
        }).join('');
        const totalFrp = this.stats.reduce((sum, s) => sum + s.totalFrp, 0);
        const totalHigh = this.stats.reduce((sum, s) => sum + s.highIntensityCount, 0);
        const ago = this.lastUpdated ? timeSince(this.lastUpdated) : (0, i18n_1.t)('components.satelliteFires.never');
        this.setContent(`
      <div class="fires-panel-content">
        <table class="fires-table">
          <thead>
            <tr>
              <th>${(0, i18n_1.t)('components.satelliteFires.region')}</th>
              <th>${(0, i18n_1.t)('components.satelliteFires.fires')}</th>
              <th>${(0, i18n_1.t)('components.satelliteFires.high')}</th>
              <th>FRP</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr class="fire-totals">
              <td>${(0, i18n_1.t)('components.satelliteFires.total')}</td>
              <td>${this.totalCount}</td>
              <td>${totalHigh}</td>
              <td>${totalFrp >= 1000 ? `${(totalFrp / 1000).toFixed(1)}k` : Math.round(totalFrp).toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
        <div class="fires-footer">
          <span class="fires-source">NASA FIRMS (VIIRS SNPP)</span>
          <span class="fires-updated">${ago}</span>
        </div>
      </div>
    `);
    }
}
exports.SatelliteFiresPanel = SatelliteFiresPanel;
function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function timeSince(date) {
    const secs = Math.floor((Date.now() - date.getTime()) / 1000);
    if (secs < 60)
        return (0, i18n_1.t)('components.satelliteFires.time.justNow');
    const mins = Math.floor(secs / 60);
    if (mins < 60)
        return (0, i18n_1.t)('components.satelliteFires.time.minutesAgo', { count: String(mins) });
    const hrs = Math.floor(mins / 60);
    return (0, i18n_1.t)('components.satelliteFires.time.hoursAgo', { count: String(hrs) });
}
