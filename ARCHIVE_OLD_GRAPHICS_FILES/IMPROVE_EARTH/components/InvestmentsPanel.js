"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvestmentsPanel = void 0;
const Panel_1 = require("./Panel");
const gulf_fdi_1 = require("@/config/gulf-fdi");
const sanitize_1 = require("@/utils/sanitize");
const i18n_1 = require("@/services/i18n");
function getSectorLabel(sector) {
    const labels = {
        ports: (0, i18n_1.t)('components.investments.sectors.ports'),
        pipelines: (0, i18n_1.t)('components.investments.sectors.pipelines'),
        energy: (0, i18n_1.t)('components.investments.sectors.energy'),
        datacenters: (0, i18n_1.t)('components.investments.sectors.datacenters'),
        airports: (0, i18n_1.t)('components.investments.sectors.airports'),
        railways: (0, i18n_1.t)('components.investments.sectors.railways'),
        telecoms: (0, i18n_1.t)('components.investments.sectors.telecoms'),
        water: (0, i18n_1.t)('components.investments.sectors.water'),
        logistics: (0, i18n_1.t)('components.investments.sectors.logistics'),
        mining: (0, i18n_1.t)('components.investments.sectors.mining'),
        'real-estate': (0, i18n_1.t)('components.investments.sectors.realEstate'),
        manufacturing: (0, i18n_1.t)('components.investments.sectors.manufacturing'),
    };
    return labels[sector] || sector;
}
const STATUS_COLORS = {
    'operational': '#22c55e',
    'under-construction': '#f59e0b',
    'announced': '#60a5fa',
    'rumoured': '#a78bfa',
    'cancelled': '#ef4444',
    'divested': '#6b7280',
};
const FLAG = {
    SA: '🇸🇦',
    UAE: '🇦🇪',
};
function formatUSD(usd) {
    if (usd === undefined)
        return (0, i18n_1.t)('components.investments.undisclosed');
    if (usd >= 100000)
        return `$${(usd / 1000).toFixed(0)}B`;
    if (usd >= 1000)
        return `$${(usd / 1000).toFixed(1)}B`;
    return `$${usd.toLocaleString()}M`;
}
class InvestmentsPanel extends Panel_1.Panel {
    constructor(onInvestmentClick) {
        super({
            id: 'gcc-investments',
            title: (0, i18n_1.t)('panels.gccInvestments'),
            showCount: true,
            infoTooltip: (0, i18n_1.t)('components.investments.infoTooltip'),
        });
        this.filters = {
            investingCountry: 'ALL',
            sector: 'ALL',
            entity: 'ALL',
            status: 'ALL',
            search: '',
        };
        this.sortKey = 'assetName';
        this.sortAsc = true;
        this.onInvestmentClick = onInvestmentClick;
        this.setupEventDelegation();
        this.render();
    }
    getFiltered() {
        const { investingCountry, sector, entity, status, search } = this.filters;
        const q = search.toLowerCase();
        return gulf_fdi_1.GULF_INVESTMENTS
            .filter(inv => {
            if (investingCountry !== 'ALL' && inv.investingCountry !== investingCountry)
                return false;
            if (sector !== 'ALL' && inv.sector !== sector)
                return false;
            if (entity !== 'ALL' && inv.investingEntity !== entity)
                return false;
            if (status !== 'ALL' && inv.status !== status)
                return false;
            if (q && !inv.assetName.toLowerCase().includes(q)
                && !inv.targetCountry.toLowerCase().includes(q)
                && !inv.description.toLowerCase().includes(q)
                && !inv.investingEntity.toLowerCase().includes(q))
                return false;
            return true;
        })
            .sort((a, b) => {
            const key = this.sortKey;
            const av = a[key] ?? '';
            const bv = b[key] ?? '';
            const cmp = av < bv ? -1 : av > bv ? 1 : 0;
            return this.sortAsc ? cmp : -cmp;
        });
    }
    render() {
        const filtered = this.getFiltered();
        // Build unique entity list for dropdown
        const entities = Array.from(new Set(gulf_fdi_1.GULF_INVESTMENTS.map(i => i.investingEntity))).sort();
        const sectors = Array.from(new Set(gulf_fdi_1.GULF_INVESTMENTS.map(i => i.sector))).sort();
        const sortArrow = (key) => this.sortKey === key ? (this.sortAsc ? ' ↑' : ' ↓') : '';
        const rows = filtered.map(inv => {
            const statusColor = STATUS_COLORS[inv.status] || '#6b7280';
            const flag = FLAG[inv.investingCountry] || '';
            const sector = getSectorLabel(inv.sector);
            return `
        <tr class="fdi-row" data-id="${(0, sanitize_1.escapeHtml)(inv.id)}" style="cursor:pointer">
          <td class="fdi-asset">
            <span class="fdi-flag">${flag}</span>
            <strong>${(0, sanitize_1.escapeHtml)(inv.assetName)}</strong>
            <div class="fdi-entity-sub">${(0, sanitize_1.escapeHtml)(inv.investingEntity)}</div>
          </td>
          <td>${(0, sanitize_1.escapeHtml)(inv.targetCountry)}</td>
          <td><span class="fdi-sector-badge">${(0, sanitize_1.escapeHtml)(sector)}</span></td>
          <td><span class="fdi-status-dot" style="background:${statusColor}"></span>${(0, sanitize_1.escapeHtml)(inv.status)}</td>
          <td class="fdi-usd">${(0, sanitize_1.escapeHtml)(formatUSD(inv.investmentUSD))}</td>
          <td>${inv.yearAnnounced ?? inv.yearOperational ?? '—'}</td>
        </tr>`;
        }).join('');
        const html = `
      <div class="fdi-toolbar">
        <input
          class="fdi-search"
          type="text"
          placeholder="${(0, i18n_1.t)('components.investments.searchPlaceholder')}"
          value="${(0, sanitize_1.escapeHtml)(this.filters.search)}"
        />
        <select class="fdi-filter" data-filter="investingCountry">
          <option value="ALL">🌐 ${(0, i18n_1.t)('components.investments.allCountries')}</option>
          <option value="SA" ${this.filters.investingCountry === 'SA' ? 'selected' : ''}>🇸🇦 ${(0, i18n_1.t)('components.investments.saudiArabia')}</option>
          <option value="UAE" ${this.filters.investingCountry === 'UAE' ? 'selected' : ''}>🇦🇪 ${(0, i18n_1.t)('components.investments.uae')}</option>
        </select>
        <select class="fdi-filter" data-filter="sector">
          <option value="ALL">${(0, i18n_1.t)('components.investments.allSectors')}</option>
          ${sectors.map(s => `<option value="${s}" ${this.filters.sector === s ? 'selected' : ''}>${(0, sanitize_1.escapeHtml)(getSectorLabel(s))}</option>`).join('')}
        </select>
        <select class="fdi-filter" data-filter="entity">
          <option value="ALL">${(0, i18n_1.t)('components.investments.allEntities')}</option>
          ${entities.map(e => `<option value="${(0, sanitize_1.escapeHtml)(e)}" ${this.filters.entity === e ? 'selected' : ''}>${(0, sanitize_1.escapeHtml)(e)}</option>`).join('')}
        </select>
        <select class="fdi-filter" data-filter="status">
          <option value="ALL">${(0, i18n_1.t)('components.investments.allStatuses')}</option>
          <option value="operational" ${this.filters.status === 'operational' ? 'selected' : ''}>${(0, i18n_1.t)('components.investments.operational')}</option>
          <option value="under-construction" ${this.filters.status === 'under-construction' ? 'selected' : ''}>${(0, i18n_1.t)('components.investments.underConstruction')}</option>
          <option value="announced" ${this.filters.status === 'announced' ? 'selected' : ''}>${(0, i18n_1.t)('components.investments.announced')}</option>
          <option value="rumoured" ${this.filters.status === 'rumoured' ? 'selected' : ''}>${(0, i18n_1.t)('components.investments.rumoured')}</option>
          <option value="divested" ${this.filters.status === 'divested' ? 'selected' : ''}>${(0, i18n_1.t)('components.investments.divested')}</option>
        </select>
      </div>
      <div class="fdi-table-wrap">
        <table class="fdi-table">
          <thead>
            <tr>
              <th class="fdi-sort" data-sort="assetName">${(0, i18n_1.t)('components.investments.asset')}${sortArrow('assetName')}</th>
              <th class="fdi-sort" data-sort="targetCountry">${(0, i18n_1.t)('components.investments.country')}${sortArrow('targetCountry')}</th>
              <th class="fdi-sort" data-sort="sector">${(0, i18n_1.t)('components.investments.sector')}${sortArrow('sector')}</th>
              <th class="fdi-sort" data-sort="status">${(0, i18n_1.t)('components.investments.status')}${sortArrow('status')}</th>
              <th class="fdi-sort" data-sort="investmentUSD">${(0, i18n_1.t)('components.investments.investment')}${sortArrow('investmentUSD')}</th>
              <th class="fdi-sort" data-sort="yearAnnounced">${(0, i18n_1.t)('components.investments.year')}${sortArrow('yearAnnounced')}</th>
            </tr>
          </thead>
          <tbody>${rows || `<tr><td colspan="6" class="fdi-empty">${(0, i18n_1.t)('components.investments.noMatch')}</td></tr>`}</tbody>
        </table>
      </div>`;
        this.setContent(html);
        if (this.countEl)
            this.countEl.textContent = String(filtered.length);
    }
    setupEventDelegation() {
        this.content.addEventListener('input', (e) => {
            const target = e.target;
            if (target.classList.contains('fdi-search')) {
                this.filters.search = target.value;
                this.render();
            }
        });
        this.content.addEventListener('change', (e) => {
            const sel = e.target.closest('.fdi-filter');
            if (sel) {
                const key = sel.dataset.filter;
                this.filters[key] = sel.value;
                this.render();
            }
        });
        this.content.addEventListener('click', (e) => {
            const target = e.target;
            const th = target.closest('.fdi-sort');
            if (th) {
                const key = th.dataset.sort;
                if (this.sortKey === key) {
                    this.sortAsc = !this.sortAsc;
                }
                else {
                    this.sortKey = key;
                    this.sortAsc = true;
                }
                this.render();
                return;
            }
            const row = target.closest('.fdi-row');
            if (row) {
                const inv = gulf_fdi_1.GULF_INVESTMENTS.find(i => i.id === row.dataset.id);
                if (inv && this.onInvestmentClick) {
                    this.onInvestmentClick(inv);
                }
            }
        });
    }
}
exports.InvestmentsPanel = InvestmentsPanel;
