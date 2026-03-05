"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrefSirensPanel = void 0;
const Panel_1 = require("./Panel");
const sanitize_1 = require("@/utils/sanitize");
const i18n_1 = require("@/services/i18n");
class OrefSirensPanel extends Panel_1.Panel {
    constructor() {
        super({
            id: 'oref-sirens',
            title: (0, i18n_1.t)('panels.orefSirens'),
            showCount: true,
            trackActivity: true,
            infoTooltip: (0, i18n_1.t)('components.orefSirens.infoTooltip'),
        });
        this.alerts = [];
        this.historyCount24h = 0;
        this.showLoading((0, i18n_1.t)('components.orefSirens.checking'));
    }
    setData(data) {
        if (!data.configured) {
            this.setContent(`<div class="panel-empty">${(0, i18n_1.t)('components.orefSirens.notConfigured')}</div>`);
            this.setCount(0);
            return;
        }
        const prevCount = this.alerts.length;
        this.alerts = data.alerts || [];
        this.historyCount24h = data.historyCount24h || 0;
        this.setCount(this.alerts.length);
        if (prevCount === 0 && this.alerts.length > 0) {
            this.setNewBadge(this.alerts.length);
        }
        this.render();
    }
    formatAlertTime(dateStr) {
        try {
            const diff = Date.now() - new Date(dateStr).getTime();
            if (diff < 60000)
                return (0, i18n_1.t)('components.orefSirens.justNow');
            const mins = Math.floor(diff / 60000);
            if (mins < 60)
                return `${mins}m`;
            const hours = Math.floor(mins / 60);
            if (hours < 24)
                return `${hours}h`;
            return `${Math.floor(hours / 24)}d`;
        }
        catch {
            return '';
        }
    }
    render() {
        if (this.alerts.length === 0) {
            this.setContent(`
        <div class="oref-panel-content">
          <div class="oref-status oref-ok">
            <span class="oref-status-icon">&#x2705;</span>
            <span>${(0, i18n_1.t)('components.orefSirens.noAlerts')}</span>
          </div>
          <div class="oref-footer">
            <span class="oref-history">${(0, i18n_1.t)('components.orefSirens.historyCount', { count: String(this.historyCount24h) })}</span>
          </div>
        </div>
      `);
            return;
        }
        const alertRows = this.alerts.slice(0, 20).map(alert => {
            const areas = (alert.data || []).map(a => (0, sanitize_1.escapeHtml)(a)).join(', ');
            const time = this.formatAlertTime(alert.alertDate);
            return `<div class="oref-alert-row">
        <div class="oref-alert-header">
          <span class="oref-alert-title">${(0, sanitize_1.escapeHtml)(alert.title || alert.cat)}</span>
          <span class="oref-alert-time">${time}</span>
        </div>
        <div class="oref-alert-areas">${areas}</div>
      </div>`;
        }).join('');
        this.setContent(`
      <div class="oref-panel-content">
        <div class="oref-status oref-danger">
          <span class="oref-pulse"></span>
          <span>${(0, i18n_1.t)('components.orefSirens.activeSirens', { count: String(this.alerts.length) })}</span>
        </div>
        <div class="oref-list">${alertRows}</div>
        <div class="oref-footer">
          <span class="oref-history">${(0, i18n_1.t)('components.orefSirens.historyCount', { count: String(this.historyCount24h) })}</span>
        </div>
      </div>
    `);
    }
}
exports.OrefSirensPanel = OrefSirensPanel;
