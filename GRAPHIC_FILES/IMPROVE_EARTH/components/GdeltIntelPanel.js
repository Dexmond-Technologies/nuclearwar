"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GdeltIntelPanel = void 0;
const Panel_1 = require("./Panel");
const sanitize_1 = require("@/utils/sanitize");
const i18n_1 = require("@/services/i18n");
const dom_utils_1 = require("@/utils/dom-utils");
const gdelt_intel_1 = require("@/services/gdelt-intel");
class GdeltIntelPanel extends Panel_1.Panel {
    constructor() {
        super({
            id: 'gdelt-intel',
            title: (0, i18n_1.t)('panels.gdeltIntel'),
            showCount: true,
            trackActivity: true,
            infoTooltip: (0, i18n_1.t)('components.gdeltIntel.infoTooltip'),
        });
        this.activeTopic = (0, gdelt_intel_1.getIntelTopics)()[0];
        this.topicData = new Map();
        this.tabsEl = null;
        this.createTabs();
        this.loadActiveTopic();
    }
    createTabs() {
        this.tabsEl = (0, dom_utils_1.h)('div', { className: 'gdelt-intel-tabs' }, ...(0, gdelt_intel_1.getIntelTopics)().map(topic => (0, dom_utils_1.h)('button', {
            className: `gdelt-intel-tab ${topic.id === this.activeTopic.id ? 'active' : ''}`,
            dataset: { topicId: topic.id },
            title: topic.description,
            onClick: () => this.selectTopic(topic),
        }, (0, dom_utils_1.h)('span', { className: 'tab-icon' }, topic.icon), (0, dom_utils_1.h)('span', { className: 'tab-label' }, topic.name))));
        this.element.insertBefore(this.tabsEl, this.content);
    }
    selectTopic(topic) {
        if (topic.id === this.activeTopic.id)
            return;
        this.activeTopic = topic;
        this.tabsEl?.querySelectorAll('.gdelt-intel-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.topicId === topic.id);
        });
        const cached = this.topicData.get(topic.id);
        if (cached && Date.now() - cached.fetchedAt.getTime() < 5 * 60 * 1000) {
            this.renderArticles(cached.articles);
        }
        else {
            this.loadActiveTopic();
        }
    }
    async loadActiveTopic() {
        this.showLoading();
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const data = await (0, gdelt_intel_1.fetchTopicIntelligence)(this.activeTopic);
                this.topicData.set(this.activeTopic.id, data);
                if (data.articles.length === 0 && attempt < 2) {
                    this.showRetrying();
                    await new Promise(r => setTimeout(r, 15000));
                    continue;
                }
                this.renderArticles(data.articles);
                this.setCount(data.articles.length);
                return;
            }
            catch (error) {
                if (this.isAbortError(error))
                    return;
                console.error(`[GdeltIntelPanel] Load error (attempt ${attempt + 1}):`, error);
                if (attempt < 2) {
                    this.showRetrying();
                    await new Promise(r => setTimeout(r, 15000));
                    continue;
                }
                this.showError((0, i18n_1.t)('common.failedIntelFeed'));
            }
        }
    }
    renderArticles(articles) {
        if (articles.length === 0) {
            (0, dom_utils_1.replaceChildren)(this.content, (0, dom_utils_1.h)('div', { className: 'empty-state' }, (0, i18n_1.t)('components.gdelt.empty')));
            return;
        }
        (0, dom_utils_1.replaceChildren)(this.content, (0, dom_utils_1.h)('div', { className: 'gdelt-intel-articles' }, ...articles.map(article => this.buildArticle(article))));
    }
    buildArticle(article) {
        const domain = article.source || (0, gdelt_intel_1.extractDomain)(article.url);
        const timeAgo = (0, gdelt_intel_1.formatArticleDate)(article.date);
        const toneClass = article.tone ? (article.tone < -2 ? 'tone-negative' : article.tone > 2 ? 'tone-positive' : '') : '';
        return (0, dom_utils_1.h)('a', {
            href: (0, sanitize_1.sanitizeUrl)(article.url),
            target: '_blank',
            rel: 'noopener',
            className: `gdelt-intel-article ${toneClass}`.trim(),
        }, (0, dom_utils_1.h)('div', { className: 'article-header' }, (0, dom_utils_1.h)('span', { className: 'article-source' }, domain), (0, dom_utils_1.h)('span', { className: 'article-time' }, timeAgo)), (0, dom_utils_1.h)('div', { className: 'article-title' }, article.title));
    }
    async refresh() {
        await this.loadActiveTopic();
    }
    async refreshAll() {
        this.topicData.clear();
        await this.loadActiveTopic();
    }
}
exports.GdeltIntelPanel = GdeltIntelPanel;
