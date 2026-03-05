"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisplacementPanel = void 0;
const Panel_1 = require("./Panel");
const sanitize_1 = require("@/utils/sanitize");
const displacement_1 = require("@/services/displacement");
const i18n_1 = require("@/services/i18n");
class DisplacementPanel extends Panel_1.Panel {
    constructor() {
        super({
            id: 'displacement',
            title: (0, i18n_1.t)('panels.displacement'),
            showCount: true,
            trackActivity: true,
            infoTooltip: (0, i18n_1.t)('components.displacement.infoTooltip'),
        });
        this.data = null;
        this.activeTab = 'origins';
        this.showLoading((0, i18n_1.t)('common.loadingDisplacement'));
    }
    setCountryClickHandler(handler) {
        this.onCountryClick = handler;
    }
    setData(data) {
        this.data = data;
        this.setCount(data.countries.length);
        this.renderContent();
    }
    renderContent() {
        if (!this.data)
            return;
        const g = this.data.globalTotals;
        const stats = [
            { label: (0, i18n_1.t)('components.displacement.refugees'), value: (0, displacement_1.formatPopulation)(g.refugees), cls: 'disp-stat-refugees' },
            { label: (0, i18n_1.t)('components.displacement.asylumSeekers'), value: (0, displacement_1.formatPopulation)(g.asylumSeekers), cls: 'disp-stat-asylum' },
            { label: (0, i18n_1.t)('components.displacement.idps'), value: (0, displacement_1.formatPopulation)(g.idps), cls: 'disp-stat-idps' },
            { label: (0, i18n_1.t)('components.displacement.total'), value: (0, displacement_1.formatPopulation)(g.total), cls: 'disp-stat-total' },
        ];
        const statsHtml = stats.map(s => `<div class="disp-stat-box ${s.cls}">
        <span class="disp-stat-value">${s.value}</span>
        <span class="disp-stat-label">${s.label}</span>
      </div>`).join('');
        const tabsHtml = `
      <div class="disp-tabs">
        <button class="disp-tab ${this.activeTab === 'origins' ? 'disp-tab-active' : ''}" data-tab="origins">${(0, i18n_1.t)('components.displacement.origins')}</button>
        <button class="disp-tab ${this.activeTab === 'hosts' ? 'disp-tab-active' : ''}" data-tab="hosts">${(0, i18n_1.t)('components.displacement.hosts')}</button>
      </div>
    `;
        let countries;
        if (this.activeTab === 'origins') {
            countries = [...this.data.countries]
                .filter(c => c.refugees + c.asylumSeekers > 0)
                .sort((a, b) => (b.refugees + b.asylumSeekers) - (a.refugees + a.asylumSeekers));
        }
        else {
            countries = [...this.data.countries]
                .filter(c => (c.hostTotal || 0) > 0)
                .sort((a, b) => (b.hostTotal || 0) - (a.hostTotal || 0));
        }
        const displayed = countries.slice(0, 30);
        let tableHtml;
        if (displayed.length === 0) {
            tableHtml = `<div class="panel-empty">${(0, i18n_1.t)('common.noDataShort')}</div>`;
        }
        else {
            const rows = displayed.map(c => {
                const hostTotal = c.hostTotal || 0;
                const count = this.activeTab === 'origins' ? c.refugees + c.asylumSeekers : hostTotal;
                const total = this.activeTab === 'origins' ? c.totalDisplaced : hostTotal;
                const badgeCls = total >= 1000000 ? 'disp-crisis'
                    : total >= 500000 ? 'disp-high'
                        : total >= 100000 ? 'disp-elevated'
                            : '';
                const badgeLabel = total >= 1000000 ? (0, i18n_1.t)('components.displacement.badges.crisis')
                    : total >= 500000 ? (0, i18n_1.t)('components.displacement.badges.high')
                        : total >= 100000 ? (0, i18n_1.t)('components.displacement.badges.elevated')
                            : '';
                const badgeHtml = badgeLabel
                    ? `<span class="disp-badge ${badgeCls}">${badgeLabel}</span>`
                    : '';
                return `<tr class="disp-row" data-lat="${c.lat || ''}" data-lon="${c.lon || ''}">
          <td class="disp-name">${(0, sanitize_1.escapeHtml)(c.name)}</td>
          <td class="disp-status">${badgeHtml}</td>
          <td class="disp-count">${(0, displacement_1.formatPopulation)(count)}</td>
        </tr>`;
            }).join('');
            tableHtml = `
        <table class="disp-table">
          <thead>
            <tr>
              <th>${(0, i18n_1.t)('components.displacement.country')}</th>
              <th>${(0, i18n_1.t)('components.displacement.status')}</th>
              <th>${(0, i18n_1.t)('components.displacement.count')}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`;
        }
        this.setContent(`
      <div class="disp-panel-content">
        <div class="disp-stats-grid">${statsHtml}</div>
        ${tabsHtml}
        ${tableHtml}
      </div>
    `);
        this.content.querySelectorAll('.disp-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                this.activeTab = btn.dataset.tab;
                this.renderContent();
            });
        });
        this.content.querySelectorAll('.disp-row').forEach(el => {
            el.addEventListener('click', () => {
                const lat = Number(el.dataset.lat);
                const lon = Number(el.dataset.lon);
                if (Number.isFinite(lat) && Number.isFinite(lon))
                    this.onCountryClick?.(lat, lon);
            });
        });
    }
}
exports.DisplacementPanel = DisplacementPanel;
