"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramIntelPanel = void 0;
const Panel_1 = require("./Panel");
const sanitize_1 = require("@/utils/sanitize");
const i18n_1 = require("@/services/i18n");
const dom_utils_1 = require("@/utils/dom-utils");
const telegram_intel_1 = require("@/services/telegram-intel");
class TelegramIntelPanel extends Panel_1.Panel {
    constructor() {
        super({
            id: 'telegram-intel',
            title: (0, i18n_1.t)('panels.telegramIntel'),
            showCount: true,
            trackActivity: true,
            infoTooltip: (0, i18n_1.t)('components.telegramIntel.infoTooltip'),
        });
        this.items = [];
        this.activeTopic = 'all';
        this.tabsEl = null;
        this.relayEnabled = true;
        this.createTabs();
        this.showLoading((0, i18n_1.t)('components.telegramIntel.loading'));
    }
    createTabs() {
        this.tabsEl = (0, dom_utils_1.h)('div', { className: 'telegram-intel-tabs' }, ...telegram_intel_1.TELEGRAM_TOPICS.map(topic => (0, dom_utils_1.h)('button', {
            className: `telegram-intel-tab ${topic.id === this.activeTopic ? 'active' : ''}`,
            dataset: { topicId: topic.id },
            onClick: () => this.selectTopic(topic.id),
        }, (0, i18n_1.t)(topic.labelKey))));
        this.element.insertBefore(this.tabsEl, this.content);
    }
    selectTopic(topicId) {
        if (topicId === this.activeTopic)
            return;
        this.activeTopic = topicId;
        this.tabsEl?.querySelectorAll('.telegram-intel-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.topicId === topicId);
        });
        this.renderItems();
    }
    setData(response) {
        this.relayEnabled = response.enabled;
        this.items = response.items || [];
        if (!this.relayEnabled) {
            this.setCount(0);
            (0, dom_utils_1.replaceChildren)(this.content, (0, dom_utils_1.h)('div', { className: 'empty-state' }, (0, i18n_1.t)('components.telegramIntel.disabled')));
            return;
        }
        this.renderItems();
    }
    renderItems() {
        const filtered = this.activeTopic === 'all'
            ? this.items
            : this.items.filter(item => item.topic === this.activeTopic);
        this.setCount(filtered.length);
        if (filtered.length === 0) {
            (0, dom_utils_1.replaceChildren)(this.content, (0, dom_utils_1.h)('div', { className: 'empty-state' }, (0, i18n_1.t)('components.telegramIntel.empty')));
            return;
        }
        (0, dom_utils_1.replaceChildren)(this.content, (0, dom_utils_1.h)('div', { className: 'telegram-intel-items' }, ...filtered.map(item => this.buildItem(item))));
    }
    buildItem(item) {
        const timeAgo = (0, telegram_intel_1.formatTelegramTime)(item.ts);
        return (0, dom_utils_1.h)('a', {
            href: (0, sanitize_1.sanitizeUrl)(item.url),
            target: '_blank',
            rel: 'noopener noreferrer',
            className: 'telegram-intel-item',
        }, (0, dom_utils_1.h)('div', { className: 'telegram-intel-item-header' }, (0, dom_utils_1.h)('span', { className: 'telegram-intel-channel' }, item.channelTitle || item.channel), (0, dom_utils_1.h)('span', { className: 'telegram-intel-topic' }, item.topic), (0, dom_utils_1.h)('span', { className: 'telegram-intel-time' }, timeAgo)), (0, dom_utils_1.h)('div', { className: 'telegram-intel-text' }, item.text));
    }
    async refresh() {
        // Handled by DataLoader + RefreshScheduler
    }
    destroy() {
        if (this.tabsEl) {
            this.tabsEl.remove();
            this.tabsEl = null;
        }
        super.destroy();
    }
}
exports.TelegramIntelPanel = TelegramIntelPanel;
