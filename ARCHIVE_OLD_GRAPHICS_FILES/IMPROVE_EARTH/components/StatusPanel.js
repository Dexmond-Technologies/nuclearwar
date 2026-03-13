"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusPanel = void 0;
const config_1 = require("@/config");
const dom_utils_1 = require("@/utils/dom-utils");
// Allowlists for each variant
const TECH_FEEDS = new Set([
    'Tech', 'Ai', 'Startups', 'Vcblogs', 'RegionalStartups',
    'Unicorns', 'Accelerators', 'Security', 'Policy', 'Layoffs',
    'Finance', 'Hardware', 'Cloud', 'Dev', 'Tech Events', 'Crypto',
    'Markets', 'Events', 'Producthunt', 'Funding', 'Polymarket',
    'Cyber Threats'
]);
const TECH_APIS = new Set([
    'RSS Proxy', 'Finnhub', 'CoinGecko', 'Tech Events API', 'Service Status', 'Polymarket',
    'Cyber Threats API'
]);
const WORLD_FEEDS = new Set([
    'Politics', 'Middleeast', 'Tech', 'Ai', 'Finance',
    'Gov', 'Intel', 'Layoffs', 'Thinktanks', 'Energy',
    'Polymarket', 'Weather', 'NetBlocks', 'Shipping', 'Military',
    'Cyber Threats'
]);
const WORLD_APIS = new Set([
    'RSS2JSON', 'Finnhub', 'CoinGecko', 'Polymarket', 'USGS', 'FRED',
    'AISStream', 'GDELT Doc', 'EIA', 'USASpending', 'PizzINT', 'FIRMS',
    'Cyber Threats API', 'BIS', 'WTO', 'SupplyChain'
]);
const i18n_1 = require("../services/i18n");
const Panel_1 = require("./Panel");
class StatusPanel extends Panel_1.Panel {
    constructor() {
        super({ id: 'status', title: (0, i18n_1.t)('panels.status') });
        this.isOpen = false;
        this.feeds = new Map();
        this.apis = new Map();
        // Title is hidden in CSS, we use custom header
        this.init();
    }
    init() {
        this.allowedFeeds = config_1.SITE_VARIANT === 'tech' ? TECH_FEEDS : WORLD_FEEDS;
        this.allowedApis = config_1.SITE_VARIANT === 'tech' ? TECH_APIS : WORLD_APIS;
        const panel = (0, dom_utils_1.h)('div', { className: 'status-panel hidden' }, (0, dom_utils_1.h)('div', { className: 'status-panel-header' }, (0, dom_utils_1.h)('span', null, (0, i18n_1.t)('panels.status')), (0, dom_utils_1.h)('button', {
            className: 'status-panel-close',
            onClick: () => { this.isOpen = false; panel.classList.add('hidden'); },
        }, '×')), (0, dom_utils_1.h)('div', { className: 'status-panel-content' }, (0, dom_utils_1.h)('div', { className: 'status-section' }, (0, dom_utils_1.h)('div', { className: 'status-section-title' }, (0, i18n_1.t)('components.status.dataFeeds')), (0, dom_utils_1.h)('div', { className: 'feeds-list' })), (0, dom_utils_1.h)('div', { className: 'status-section' }, (0, dom_utils_1.h)('div', { className: 'status-section-title' }, (0, i18n_1.t)('components.status.apiStatus')), (0, dom_utils_1.h)('div', { className: 'apis-list' })), (0, dom_utils_1.h)('div', { className: 'status-section' }, (0, dom_utils_1.h)('div', { className: 'status-section-title' }, (0, i18n_1.t)('components.status.storage')), (0, dom_utils_1.h)('div', { className: 'storage-info' }))), (0, dom_utils_1.h)('div', { className: 'status-panel-footer' }, (0, dom_utils_1.h)('span', { className: 'last-check' }, (0, i18n_1.t)('components.status.updatedJustNow'))));
        this.element = (0, dom_utils_1.h)('div', { className: 'status-panel-container' }, (0, dom_utils_1.h)('button', {
            className: 'status-panel-toggle',
            title: (0, i18n_1.t)('components.status.systemStatus'),
            onClick: () => {
                this.isOpen = !this.isOpen;
                panel.classList.toggle('hidden', !this.isOpen);
                if (this.isOpen)
                    this.updateDisplay();
            },
        }, (0, dom_utils_1.h)('span', { className: 'status-icon' }, '◉')), panel);
        this.initDefaultStatuses();
    }
    initDefaultStatuses() {
        // Initialize all allowed feeds/APIs as disabled
        // They get enabled when App.ts reports data
        this.allowedFeeds.forEach(name => {
            this.feeds.set(name, { name, lastUpdate: null, status: 'disabled', itemCount: 0 });
        });
        this.allowedApis.forEach(name => {
            this.apis.set(name, { name, status: 'disabled' });
        });
    }
    updateFeed(name, status) {
        // Only track feeds relevant to current variant
        if (!this.allowedFeeds.has(name))
            return;
        const existing = this.feeds.get(name) || { name, lastUpdate: null, status: 'ok', itemCount: 0 };
        this.feeds.set(name, { ...existing, ...status, lastUpdate: new Date() });
        this.updateStatusIcon();
        if (this.isOpen)
            this.updateDisplay();
    }
    updateApi(name, status) {
        // Only track APIs relevant to current variant
        if (!this.allowedApis.has(name))
            return;
        const existing = this.apis.get(name) || { name, status: 'ok' };
        this.apis.set(name, { ...existing, ...status });
        this.updateStatusIcon();
        if (this.isOpen)
            this.updateDisplay();
    }
    setFeedDisabled(name) {
        const existing = this.feeds.get(name);
        if (existing) {
            this.feeds.set(name, { ...existing, status: 'disabled', itemCount: 0, lastUpdate: null });
            this.updateStatusIcon();
            if (this.isOpen)
                this.updateDisplay();
        }
    }
    setApiDisabled(name) {
        const existing = this.apis.get(name);
        if (existing) {
            this.apis.set(name, { ...existing, status: 'disabled' });
            this.updateStatusIcon();
            if (this.isOpen)
                this.updateDisplay();
        }
    }
    updateStatusIcon() {
        const icon = this.element.querySelector('.status-icon');
        // Only count enabled feeds/APIs (not 'disabled') for status indicator
        const enabledFeeds = [...this.feeds.values()].filter(f => f.status !== 'disabled');
        const enabledApis = [...this.apis.values()].filter(a => a.status !== 'disabled');
        const hasError = enabledFeeds.some(f => f.status === 'error') ||
            enabledApis.some(a => a.status === 'error');
        const hasWarning = enabledFeeds.some(f => f.status === 'warning') ||
            enabledApis.some(a => a.status === 'warning');
        icon.className = 'status-icon';
        if (hasError) {
            icon.classList.add('error');
            icon.textContent = '◉';
        }
        else if (hasWarning) {
            icon.classList.add('warning');
            icon.textContent = '◉';
        }
        else {
            icon.classList.add('ok');
            icon.textContent = '◉';
        }
    }
    updateDisplay() {
        const feedsList = this.element.querySelector('.feeds-list');
        const apisList = this.element.querySelector('.apis-list');
        const storageInfo = this.element.querySelector('.storage-info');
        const lastCheck = this.element.querySelector('.last-check');
        (0, dom_utils_1.replaceChildren)(feedsList, ...[...this.feeds.values()].map(feed => (0, dom_utils_1.h)('div', { className: 'status-row' }, (0, dom_utils_1.h)('span', { className: `status-dot ${feed.status}` }), (0, dom_utils_1.h)('span', { className: 'status-name' }, feed.name), (0, dom_utils_1.h)('span', { className: 'status-detail' }, `${feed.itemCount} items`), (0, dom_utils_1.h)('span', { className: 'status-time' }, feed.lastUpdate ? this.formatTime(feed.lastUpdate) : 'Never'))));
        (0, dom_utils_1.replaceChildren)(apisList, ...[...this.apis.values()].map(api => (0, dom_utils_1.h)('div', { className: 'status-row' }, (0, dom_utils_1.h)('span', { className: `status-dot ${api.status}` }), (0, dom_utils_1.h)('span', { className: 'status-name' }, api.name), api.latency ? (0, dom_utils_1.h)('span', { className: 'status-detail' }, `${api.latency}ms`) : false)));
        this.updateStorageInfo(storageInfo);
        lastCheck.textContent = (0, i18n_1.t)('components.status.updatedAt', { time: this.formatTime(new Date()) });
    }
    async updateStorageInfo(container) {
        try {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                const used = estimate.usage ? (estimate.usage / 1024 / 1024).toFixed(2) : '0';
                const quota = estimate.quota ? (estimate.quota / 1024 / 1024).toFixed(0) : 'N/A';
                (0, dom_utils_1.replaceChildren)(container, (0, dom_utils_1.h)('div', { className: 'status-row' }, (0, dom_utils_1.h)('span', { className: 'status-name' }, 'IndexedDB'), (0, dom_utils_1.h)('span', { className: 'status-detail' }, `${used} MB / ${quota} MB`)));
            }
            else {
                (0, dom_utils_1.replaceChildren)(container, (0, dom_utils_1.h)('div', { className: 'status-row' }, (0, i18n_1.t)('components.status.storageUnavailable')));
            }
        }
        catch {
            (0, dom_utils_1.replaceChildren)(container, (0, dom_utils_1.h)('div', { className: 'status-row' }, (0, i18n_1.t)('components.status.storageUnavailable')));
        }
    }
    formatTime(date) {
        const now = Date.now();
        const diff = now - date.getTime();
        if (diff < 60000)
            return 'just now';
        if (diff < 3600000)
            return `${Math.floor(diff / 60000)}m ago`;
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    getElement() {
        return this.element;
    }
}
exports.StatusPanel = StatusPanel;
