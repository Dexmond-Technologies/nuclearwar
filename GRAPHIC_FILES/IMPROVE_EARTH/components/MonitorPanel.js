"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitorPanel = void 0;
const Panel_1 = require("./Panel");
const i18n_1 = require("@/services/i18n");
const config_1 = require("@/config");
const utils_1 = require("@/utils");
const sanitize_1 = require("@/utils/sanitize");
const dom_utils_1 = require("@/utils/dom-utils");
class MonitorPanel extends Panel_1.Panel {
    constructor(initialMonitors = []) {
        super({ id: 'monitors', title: (0, i18n_1.t)('panels.monitors') });
        this.monitors = [];
        this.monitors = initialMonitors;
        this.renderInput();
    }
    renderInput() {
        (0, dom_utils_1.clearChildren)(this.content);
        const input = (0, dom_utils_1.h)('input', {
            type: 'text',
            className: 'monitor-input',
            id: 'monitorKeywords',
            placeholder: (0, i18n_1.t)('components.monitor.placeholder'),
            onKeypress: (e) => { if (e.key === 'Enter')
                this.addMonitor(); },
        });
        const inputContainer = (0, dom_utils_1.h)('div', { className: 'monitor-input-container' }, input, (0, dom_utils_1.h)('button', { className: 'monitor-add-btn', id: 'addMonitorBtn', onClick: () => this.addMonitor() }, (0, i18n_1.t)('components.monitor.add')));
        const monitorsList = (0, dom_utils_1.h)('div', { id: 'monitorsList' });
        const monitorsResults = (0, dom_utils_1.h)('div', { id: 'monitorsResults' });
        this.content.appendChild(inputContainer);
        this.content.appendChild(monitorsList);
        this.content.appendChild(monitorsResults);
        this.renderMonitorsList();
    }
    addMonitor() {
        const input = document.getElementById('monitorKeywords');
        const keywords = input.value.trim();
        if (!keywords)
            return;
        const monitor = {
            id: (0, utils_1.generateId)(),
            keywords: keywords.split(',').map((k) => k.trim().toLowerCase()),
            color: config_1.MONITOR_COLORS[this.monitors.length % config_1.MONITOR_COLORS.length] ?? (0, utils_1.getCSSColor)('--status-live'),
        };
        this.monitors.push(monitor);
        input.value = '';
        this.renderMonitorsList();
        this.onMonitorsChange?.(this.monitors);
    }
    removeMonitor(id) {
        this.monitors = this.monitors.filter((m) => m.id !== id);
        this.renderMonitorsList();
        this.onMonitorsChange?.(this.monitors);
    }
    renderMonitorsList() {
        const list = document.getElementById('monitorsList');
        if (!list)
            return;
        (0, dom_utils_1.replaceChildren)(list, ...this.monitors.map((m) => (0, dom_utils_1.h)('span', { className: 'monitor-tag' }, (0, dom_utils_1.h)('span', { className: 'monitor-tag-color', style: { background: m.color } }), m.keywords.join(', '), (0, dom_utils_1.h)('span', {
            className: 'monitor-tag-remove',
            onClick: () => this.removeMonitor(m.id),
        }, '×'))));
    }
    renderResults(news) {
        const results = document.getElementById('monitorsResults');
        if (!results)
            return;
        if (this.monitors.length === 0) {
            (0, dom_utils_1.replaceChildren)(results, (0, dom_utils_1.h)('div', { style: 'color: var(--text-dim); font-size: 10px; margin-top: 12px;' }, (0, i18n_1.t)('components.monitor.addKeywords')));
            return;
        }
        const matchedItems = [];
        news.forEach((item) => {
            this.monitors.forEach((monitor) => {
                // Search both title and description for better coverage
                const searchText = `${item.title} ${item.description || ''}`.toLowerCase();
                const matched = monitor.keywords.some((kw) => {
                    // Use word boundary matching to avoid false positives like "ai" in "train"
                    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
                    return regex.test(searchText);
                });
                if (matched) {
                    matchedItems.push({ ...item, monitorColor: monitor.color });
                }
            });
        });
        // Dedupe by link
        const seen = new Set();
        const unique = matchedItems.filter(item => {
            if (seen.has(item.link))
                return false;
            seen.add(item.link);
            return true;
        });
        if (unique.length === 0) {
            (0, dom_utils_1.replaceChildren)(results, (0, dom_utils_1.h)('div', { style: 'color: var(--text-dim); font-size: 10px; margin-top: 12px;' }, (0, i18n_1.t)('components.monitor.noMatches', { count: String(news.length) })));
            return;
        }
        const countText = unique.length > 10
            ? (0, i18n_1.t)('components.monitor.showingMatches', { count: '10', total: String(unique.length) })
            : `${unique.length} ${unique.length === 1 ? (0, i18n_1.t)('components.monitor.match') : (0, i18n_1.t)('components.monitor.matches')}`;
        (0, dom_utils_1.replaceChildren)(results, (0, dom_utils_1.h)('div', { style: 'color: var(--text-dim); font-size: 10px; margin: 12px 0 8px;' }, countText), ...unique.slice(0, 10).map((item) => (0, dom_utils_1.h)('div', {
            className: 'item',
            style: `border-left: 2px solid ${item.monitorColor || ''}; padding-left: 8px; margin-left: -8px;`,
        }, (0, dom_utils_1.h)('div', { className: 'item-source' }, item.source), (0, dom_utils_1.h)('a', {
            className: 'item-title',
            href: (0, sanitize_1.sanitizeUrl)(item.link),
            target: '_blank',
            rel: 'noopener',
        }, item.title), (0, dom_utils_1.h)('div', { className: 'item-time' }, (0, utils_1.formatTime)(item.pubDate)))));
    }
    onChanged(callback) {
        this.onMonitorsChange = callback;
    }
    getMonitors() {
        return [...this.monitors];
    }
    setMonitors(monitors) {
        this.monitors = monitors;
        this.renderMonitorsList();
    }
}
exports.MonitorPanel = MonitorPanel;
