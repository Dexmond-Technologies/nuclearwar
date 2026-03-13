"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UcdpEventsPanel = void 0;
const Panel_1 = require("./Panel");
const sanitize_1 = require("@/utils/sanitize");
const i18n_1 = require("@/services/i18n");
class UcdpEventsPanel extends Panel_1.Panel {
    constructor() {
        super({
            id: 'ucdp-events',
            title: (0, i18n_1.t)('panels.ucdpEvents'),
            showCount: true,
            trackActivity: true,
            infoTooltip: (0, i18n_1.t)('components.ucdpEvents.infoTooltip'),
        });
        this.events = [];
        this.activeTab = 'state-based';
        this.showLoading((0, i18n_1.t)('common.loadingUcdpEvents'));
    }
    setEventClickHandler(handler) {
        this.onEventClick = handler;
    }
    setEvents(events) {
        this.events = events;
        this.setCount(events.length);
        this.renderContent();
    }
    getEvents() {
        return this.events;
    }
    renderContent() {
        const filtered = this.events.filter(e => e.type_of_violence === this.activeTab);
        const tabs = [
            { key: 'state-based', label: (0, i18n_1.t)('components.ucdpEvents.stateBased') },
            { key: 'non-state', label: (0, i18n_1.t)('components.ucdpEvents.nonState') },
            { key: 'one-sided', label: (0, i18n_1.t)('components.ucdpEvents.oneSided') },
        ];
        const tabCounts = {
            'state-based': 0,
            'non-state': 0,
            'one-sided': 0,
        };
        for (const event of this.events) {
            tabCounts[event.type_of_violence] += 1;
        }
        const totalDeaths = filtered.reduce((sum, e) => sum + e.deaths_best, 0);
        const tabsHtml = tabs.map(t => `<button class="ucdp-tab ${t.key === this.activeTab ? 'ucdp-tab-active' : ''}" data-tab="${t.key}">${t.label} <span class="ucdp-tab-count">${tabCounts[t.key]}</span></button>`).join('');
        const displayed = filtered.slice(0, 50);
        let bodyHtml;
        if (displayed.length === 0) {
            bodyHtml = `<div class="panel-empty">${(0, i18n_1.t)('common.noEventsInCategory')}</div>`;
        }
        else {
            const rows = displayed.map(e => {
                const deathsClass = e.type_of_violence === 'state-based' ? 'ucdp-deaths-state'
                    : e.type_of_violence === 'non-state' ? 'ucdp-deaths-nonstate'
                        : 'ucdp-deaths-onesided';
                const deathsHtml = e.deaths_best > 0
                    ? `<span class="${deathsClass}">${e.deaths_best}</span> <small class="ucdp-range">(${e.deaths_low}-${e.deaths_high})</small>`
                    : '<span class="ucdp-deaths-zero">0</span>';
                const actors = `${(0, sanitize_1.escapeHtml)(e.side_a)} vs ${(0, sanitize_1.escapeHtml)(e.side_b)}`;
                return `<tr class="ucdp-row" data-lat="${e.latitude}" data-lon="${e.longitude}">
          <td class="ucdp-country">${(0, sanitize_1.escapeHtml)(e.country)}</td>
          <td class="ucdp-deaths">${deathsHtml}</td>
          <td class="ucdp-date">${e.date_start}</td>
          <td class="ucdp-actors">${actors}</td>
        </tr>`;
            }).join('');
            bodyHtml = `
        <table class="ucdp-table">
          <thead>
            <tr>
              <th>${(0, i18n_1.t)('components.ucdpEvents.country')}</th>
              <th>${(0, i18n_1.t)('components.ucdpEvents.deaths')}</th>
              <th>${(0, i18n_1.t)('components.ucdpEvents.date')}</th>
              <th>${(0, i18n_1.t)('components.ucdpEvents.actors')}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`;
        }
        const moreHtml = filtered.length > 50
            ? `<div class="panel-more">${(0, i18n_1.t)('components.ucdpEvents.moreNotShown', { count: filtered.length - 50 })}</div>`
            : '';
        this.setContent(`
      <div class="ucdp-panel-content">
        <div class="ucdp-header">
          <div class="ucdp-tabs">${tabsHtml}</div>
          ${totalDeaths > 0 ? `<span class="ucdp-total-deaths">${(0, i18n_1.t)('components.ucdpEvents.deathsCount', { count: totalDeaths.toLocaleString() })}</span>` : ''}
        </div>
        ${bodyHtml}
        ${moreHtml}
      </div>
    `);
        this.content.querySelectorAll('.ucdp-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                this.activeTab = btn.dataset.tab;
                this.renderContent();
            });
        });
        this.content.querySelectorAll('.ucdp-row').forEach(el => {
            el.addEventListener('click', () => {
                const lat = Number(el.dataset.lat);
                const lon = Number(el.dataset.lon);
                if (Number.isFinite(lat) && Number.isFinite(lon))
                    this.onEventClick?.(lat, lon);
            });
        });
    }
}
exports.UcdpEventsPanel = UcdpEventsPanel;
