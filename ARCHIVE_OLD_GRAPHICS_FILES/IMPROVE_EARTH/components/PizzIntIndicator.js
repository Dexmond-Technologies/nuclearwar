"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PizzIntIndicator = void 0;
const i18n_1 = require("@/services/i18n");
const dom_utils_1 = require("@/utils/dom-utils");
const DEFCON_COLORS = {
    1: '#ff0040',
    2: '#ff4400',
    3: '#ffaa00',
    4: '#00aaff',
    5: '#2d8a6e',
};
class PizzIntIndicator {
    constructor() {
        this.isExpanded = false;
        this.status = null;
        this.tensions = [];
        const panel = (0, dom_utils_1.h)('div', { className: 'pizzint-panel hidden' }, (0, dom_utils_1.h)('div', { className: 'pizzint-header' }, (0, dom_utils_1.h)('span', { className: 'pizzint-title' }, (0, i18n_1.t)('components.pizzint.title')), (0, dom_utils_1.h)('button', {
            className: 'pizzint-close',
            onClick: () => { this.isExpanded = false; panel.classList.add('hidden'); },
        }, '×')), (0, dom_utils_1.h)('div', { className: 'pizzint-status-bar' }, (0, dom_utils_1.h)('div', { className: 'pizzint-defcon-label' })), (0, dom_utils_1.h)('div', { className: 'pizzint-locations' }), (0, dom_utils_1.h)('div', { className: 'pizzint-tensions' }, (0, dom_utils_1.h)('div', { className: 'pizzint-tensions-title' }, (0, i18n_1.t)('components.pizzint.tensionsTitle')), (0, dom_utils_1.h)('div', { className: 'pizzint-tensions-list' })), (0, dom_utils_1.h)('div', { className: 'pizzint-footer' }, (0, dom_utils_1.h)('span', { className: 'pizzint-source' }, (0, i18n_1.t)('components.pizzint.source'), ' ', (0, dom_utils_1.h)('a', { href: 'https://pizzint.watch', target: '_blank', rel: 'noopener' }, 'PizzINT')), (0, dom_utils_1.h)('span', { className: 'pizzint-updated' })));
        this.element = (0, dom_utils_1.h)('div', { className: 'pizzint-indicator' }, (0, dom_utils_1.h)('button', {
            className: 'pizzint-toggle',
            title: (0, i18n_1.t)('components.pizzint.title'),
            onClick: () => { this.isExpanded = !this.isExpanded; panel.classList.toggle('hidden', !this.isExpanded); },
        }, (0, dom_utils_1.h)('span', { className: 'pizzint-icon' }, '🍕'), (0, dom_utils_1.h)('span', { className: 'pizzint-defcon' }, '--'), (0, dom_utils_1.h)('span', { className: 'pizzint-score' }, '--%')), panel);
    }
    updateStatus(status) {
        this.status = status;
        this.render();
    }
    updateTensions(tensions) {
        this.tensions = tensions;
        this.renderTensions();
    }
    render() {
        if (!this.status)
            return;
        const defconEl = this.element.querySelector('.pizzint-defcon');
        const scoreEl = this.element.querySelector('.pizzint-score');
        const labelEl = this.element.querySelector('.pizzint-defcon-label');
        const locationsEl = this.element.querySelector('.pizzint-locations');
        const updatedEl = this.element.querySelector('.pizzint-updated');
        const color = DEFCON_COLORS[this.status.defconLevel] || '#888';
        defconEl.textContent = (0, i18n_1.t)('components.pizzint.defcon', { level: String(this.status.defconLevel) });
        defconEl.style.background = color;
        defconEl.style.color = this.status.defconLevel <= 3 ? '#000' : '#fff';
        scoreEl.textContent = `${this.status.aggregateActivity}%`;
        labelEl.textContent = this.getDefconLabel(this.status.defconLevel);
        labelEl.style.color = color;
        (0, dom_utils_1.replaceChildren)(locationsEl, ...this.status.locations.map(loc => (0, dom_utils_1.h)('div', { className: 'pizzint-location' }, (0, dom_utils_1.h)('span', { className: 'pizzint-location-name' }, loc.name), (0, dom_utils_1.h)('span', { className: `pizzint-location-status ${this.getStatusClass(loc)}` }, this.getStatusLabel(loc)))));
        const timeAgo = this.formatTimeAgo(this.status.lastUpdate);
        updatedEl.textContent = (0, i18n_1.t)('components.pizzint.updated', { timeAgo });
    }
    renderTensions() {
        const listEl = this.element.querySelector('.pizzint-tensions-list');
        if (!listEl)
            return;
        (0, dom_utils_1.replaceChildren)(listEl, ...this.tensions.map(tp => {
            const trendIcon = tp.trend === 'rising' ? '↑' : tp.trend === 'falling' ? '↓' : '→';
            const changeText = tp.changePercent > 0 ? `+${tp.changePercent}%` : `${tp.changePercent}%`;
            return (0, dom_utils_1.h)('div', { className: 'pizzint-tension-row' }, (0, dom_utils_1.h)('span', { className: 'pizzint-tension-label' }, tp.label), (0, dom_utils_1.h)('span', { className: 'pizzint-tension-score' }, (0, dom_utils_1.h)('span', { className: 'pizzint-tension-value' }, tp.score.toFixed(1)), (0, dom_utils_1.h)('span', { className: `pizzint-tension-trend ${tp.trend}` }, `${trendIcon} ${changeText}`)));
        }));
    }
    getStatusClass(loc) {
        if (loc.is_closed_now)
            return 'closed';
        if (loc.is_spike)
            return 'spike';
        if (loc.current_popularity >= 70)
            return 'high';
        if (loc.current_popularity >= 40)
            return 'elevated';
        if (loc.current_popularity >= 15)
            return 'nominal';
        return 'quiet';
    }
    getStatusLabel(loc) {
        if (loc.is_closed_now)
            return (0, i18n_1.t)('components.pizzint.statusClosed');
        if (loc.is_spike)
            return `${(0, i18n_1.t)('components.pizzint.statusSpike')} ${loc.current_popularity}%`;
        if (loc.current_popularity >= 70)
            return `${(0, i18n_1.t)('components.pizzint.statusHigh')} ${loc.current_popularity}%`;
        if (loc.current_popularity >= 40)
            return `${(0, i18n_1.t)('components.pizzint.statusElevated')} ${loc.current_popularity}%`;
        if (loc.current_popularity >= 15)
            return `${(0, i18n_1.t)('components.pizzint.statusNominal')} ${loc.current_popularity}%`;
        return `${(0, i18n_1.t)('components.pizzint.statusQuiet')} ${loc.current_popularity}%`;
    }
    formatTimeAgo(date) {
        const diff = Date.now() - date.getTime();
        if (diff < 60000)
            return (0, i18n_1.t)('components.pizzint.justNow');
        if (diff < 3600000)
            return (0, i18n_1.t)('components.pizzint.minutesAgo', { m: String(Math.floor(diff / 60000)) });
        return (0, i18n_1.t)('components.pizzint.hoursAgo', { h: String(Math.floor(diff / 3600000)) });
    }
    getDefconLabel(level) {
        const key = `components.pizzint.defconLabels.${level}`;
        const localized = (0, i18n_1.t)(key);
        return localized === key ? this.status?.defconLabel || '' : localized;
    }
    getElement() {
        return this.element;
    }
    hide() {
        this.element.style.display = 'none';
    }
    show() {
        this.element.style.display = '';
    }
}
exports.PizzIntIndicator = PizzIntIndicator;
