"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CIIPanel = void 0;
const Panel_1 = require("./Panel");
const utils_1 = require("@/utils");
const country_instability_1 = require("@/services/country-instability");
const i18n_1 = require("../services/i18n");
const dom_utils_1 = require("@/utils/dom-utils");
class CIIPanel extends Panel_1.Panel {
    constructor() {
        super({
            id: 'cii',
            title: (0, i18n_1.t)('panels.cii'),
            infoTooltip: (0, i18n_1.t)('components.cii.infoTooltip'),
        });
        this.scores = [];
        this.focalPointsReady = false;
        this.showLoading((0, i18n_1.t)('common.loading'));
    }
    setShareStoryHandler(handler) {
        this.onShareStory = handler;
    }
    getLevelColor(level) {
        switch (level) {
            case 'critical': return (0, utils_1.getCSSColor)('--semantic-critical');
            case 'high': return (0, utils_1.getCSSColor)('--semantic-high');
            case 'elevated': return (0, utils_1.getCSSColor)('--semantic-elevated');
            case 'normal': return (0, utils_1.getCSSColor)('--semantic-normal');
            case 'low': return (0, utils_1.getCSSColor)('--semantic-low');
        }
    }
    getLevelEmoji(level) {
        switch (level) {
            case 'critical': return '🔴';
            case 'high': return '🟠';
            case 'elevated': return '🟡';
            case 'normal': return '🟢';
            case 'low': return '⚪';
        }
    }
    buildTrendArrow(trend, change) {
        if (trend === 'rising')
            return (0, dom_utils_1.h)('span', { className: 'trend-up' }, `↑${change > 0 ? change : ''}`);
        if (trend === 'falling')
            return (0, dom_utils_1.h)('span', { className: 'trend-down' }, `↓${Math.abs(change)}`);
        return (0, dom_utils_1.h)('span', { className: 'trend-stable' }, '→');
    }
    buildCountry(country) {
        const color = this.getLevelColor(country.level);
        const emoji = this.getLevelEmoji(country.level);
        const shareBtn = (0, dom_utils_1.h)('button', {
            className: 'cii-share-btn',
            dataset: { code: country.code, name: country.name },
            title: (0, i18n_1.t)('common.shareStory'),
        });
        shareBtn.appendChild((0, dom_utils_1.rawHtml)(CIIPanel.SHARE_SVG));
        return (0, dom_utils_1.h)('div', { className: 'cii-country', dataset: { code: country.code } }, (0, dom_utils_1.h)('div', { className: 'cii-header' }, (0, dom_utils_1.h)('span', { className: 'cii-emoji' }, emoji), (0, dom_utils_1.h)('span', { className: 'cii-name' }, country.name), (0, dom_utils_1.h)('span', { className: 'cii-score' }, String(country.score)), this.buildTrendArrow(country.trend, country.change24h), shareBtn), (0, dom_utils_1.h)('div', { className: 'cii-bar-container' }, (0, dom_utils_1.h)('div', { className: 'cii-bar', style: `width: ${country.score}%; background: ${color};` })), (0, dom_utils_1.h)('div', { className: 'cii-components' }, (0, dom_utils_1.h)('span', { title: (0, i18n_1.t)('common.unrest') }, `U:${country.components.unrest}`), (0, dom_utils_1.h)('span', { title: (0, i18n_1.t)('common.conflict') }, `C:${country.components.conflict}`), (0, dom_utils_1.h)('span', { title: (0, i18n_1.t)('common.security') }, `S:${country.components.security}`), (0, dom_utils_1.h)('span', { title: (0, i18n_1.t)('common.information') }, `I:${country.components.information}`)));
    }
    bindShareButtons() {
        if (!this.onShareStory)
            return;
        this.content.querySelectorAll('.cii-share-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const el = e.currentTarget;
                const code = el.dataset.code || '';
                const name = el.dataset.name || '';
                if (code && name)
                    this.onShareStory(code, name);
            });
        });
    }
    async refresh(forceLocal = false) {
        if (!this.focalPointsReady && !forceLocal) {
            return;
        }
        if (forceLocal) {
            this.focalPointsReady = true;
            console.log('[CIIPanel] Focal points ready, calculating scores...');
        }
        this.showLoading();
        try {
            const localScores = (0, country_instability_1.calculateCII)();
            const localWithData = localScores.filter(s => s.score > 0).length;
            this.scores = localScores;
            console.log(`[CIIPanel] Calculated ${localWithData} countries with focal point intelligence`);
            const withData = this.scores.filter(s => s.score > 0);
            this.setCount(withData.length);
            if (withData.length === 0) {
                (0, dom_utils_1.replaceChildren)(this.content, (0, dom_utils_1.h)('div', { className: 'empty-state' }, (0, i18n_1.t)('components.cii.noSignals')));
                return;
            }
            const listEl = (0, dom_utils_1.h)('div', { className: 'cii-list' }, ...withData.map(s => this.buildCountry(s)));
            (0, dom_utils_1.replaceChildren)(this.content, listEl);
            this.bindShareButtons();
        }
        catch (error) {
            console.error('[CIIPanel] Refresh error:', error);
            this.showError((0, i18n_1.t)('common.failedCII'));
        }
    }
    getScores() {
        return this.scores;
    }
}
exports.CIIPanel = CIIPanel;
CIIPanel.SHARE_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>';
