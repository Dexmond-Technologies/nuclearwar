"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CascadePanel = void 0;
const Panel_1 = require("./Panel");
const sanitize_1 = require("@/utils/sanitize");
const i18n_1 = require("@/services/i18n");
const utils_1 = require("@/utils");
const infrastructure_cascade_1 = require("@/services/infrastructure-cascade");
class CascadePanel extends Panel_1.Panel {
    constructor() {
        super({
            id: 'cascade',
            title: (0, i18n_1.t)('panels.cascade'),
            showCount: true,
            trackActivity: true,
            infoTooltip: (0, i18n_1.t)('components.cascade.infoTooltip'),
        });
        this.graph = null;
        this.selectedNode = null;
        this.cascadeResult = null;
        this.filter = 'cable';
        this.onSelectCallback = null;
        this.init();
    }
    async init() {
        this.showLoading();
        try {
            this.graph = (0, infrastructure_cascade_1.buildDependencyGraph)();
            const stats = (0, infrastructure_cascade_1.getGraphStats)();
            this.setCount(stats.nodes);
            this.render();
        }
        catch (error) {
            console.error('[CascadePanel] Init error:', error);
            this.showError((0, i18n_1.t)('common.failedDependencyGraph'));
        }
    }
    getImpactColor(level) {
        switch (level) {
            case 'critical': return (0, utils_1.getCSSColor)('--semantic-critical');
            case 'high': return (0, utils_1.getCSSColor)('--semantic-high');
            case 'medium': return (0, utils_1.getCSSColor)('--semantic-elevated');
            case 'low': return (0, utils_1.getCSSColor)('--semantic-normal');
        }
    }
    getImpactEmoji(level) {
        switch (level) {
            case 'critical': return '🔴';
            case 'high': return '🟠';
            case 'medium': return '🟡';
            case 'low': return '🟢';
        }
    }
    getNodeTypeEmoji(type) {
        switch (type) {
            case 'cable': return '🔌';
            case 'pipeline': return '🛢️';
            case 'port': return '⚓';
            case 'chokepoint': return '🚢';
            case 'country': return '🏳️';
            default: return '📍';
        }
    }
    getFilterLabel(filter) {
        const labels = {
            cable: (0, i18n_1.t)('components.cascade.filters.cables'),
            pipeline: (0, i18n_1.t)('components.cascade.filters.pipelines'),
            port: (0, i18n_1.t)('components.cascade.filters.ports'),
            chokepoint: (0, i18n_1.t)('components.cascade.filters.chokepoints'),
        };
        return labels[filter];
    }
    getFilteredNodes() {
        if (!this.graph)
            return [];
        const nodes = [];
        for (const node of this.graph.nodes.values()) {
            if (this.filter === 'all' || node.type === this.filter) {
                if (node.type !== 'country') {
                    nodes.push(node);
                }
            }
        }
        return nodes.sort((a, b) => a.name.localeCompare(b.name));
    }
    renderSelector() {
        const nodes = this.getFilteredNodes();
        const filterButtons = ['cable', 'pipeline', 'port', 'chokepoint'].map((f) => `<button class="cascade-filter-btn ${this.filter === f ? 'active' : ''}" data-filter="${f}">
        ${this.getNodeTypeEmoji(f)} ${this.getFilterLabel(f)}
      </button>`).join('');
        const nodeOptions = nodes.map(n => `<option value="${(0, sanitize_1.escapeHtml)(n.id)}" ${this.selectedNode === n.id ? 'selected' : ''}>
        ${(0, sanitize_1.escapeHtml)(n.name)}
      </option>`).join('');
        const selectedType = (0, i18n_1.t)(`components.cascade.filterType.${this.filter}`);
        return `
      <div class="cascade-selector">
        <div class="cascade-filters">${filterButtons}</div>
        <select class="cascade-select" ${nodes.length === 0 ? 'disabled' : ''}>
          <option value="">${(0, i18n_1.t)('components.cascade.selectPrompt', { type: selectedType })}</option>
          ${nodeOptions}
        </select>
        <button class="cascade-analyze-btn" ${!this.selectedNode ? 'disabled' : ''}>
          ${(0, i18n_1.t)('components.cascade.analyzeImpact')}
        </button>
      </div>
    `;
    }
    renderCascadeResult() {
        if (!this.cascadeResult)
            return '';
        const { source, countriesAffected, redundancies } = this.cascadeResult;
        const countriesHtml = countriesAffected.length > 0
            ? countriesAffected.map(c => `
          <div class="cascade-country" style="border-left: 3px solid ${this.getImpactColor(c.impactLevel)}">
            <span class="cascade-emoji">${this.getImpactEmoji(c.impactLevel)}</span>
            <span class="cascade-country-name">${(0, sanitize_1.escapeHtml)(c.countryName)}</span>
            <span class="cascade-impact">${(0, i18n_1.t)(`components.cascade.impactLevels.${c.impactLevel}`)}</span>
            ${c.affectedCapacity > 0 ? `<span class="cascade-capacity">${(0, i18n_1.t)('components.cascade.capacityPercent', { percent: String(Math.round(c.affectedCapacity * 100)) })}</span>` : ''}
          </div>
        `).join('')
            : `<div class="empty-state">${(0, i18n_1.t)('components.cascade.noCountryImpacts')}</div>`;
        const redundanciesHtml = redundancies && redundancies.length > 0
            ? `
        <div class="cascade-section">
          <div class="cascade-section-title">${(0, i18n_1.t)('components.cascade.alternativeRoutes')}</div>
          ${redundancies.map(r => `
            <div class="cascade-redundancy">
              <span class="cascade-redundancy-name">${(0, sanitize_1.escapeHtml)(r.name)}</span>
              <span class="cascade-redundancy-capacity">${Math.round(r.capacityShare * 100)}%</span>
            </div>
          `).join('')}
        </div>
      `
            : '';
        return `
      <div class="cascade-result">
        <div class="cascade-source">
          <span class="cascade-emoji">${this.getNodeTypeEmoji(source.type)}</span>
          <span class="cascade-source-name">${(0, sanitize_1.escapeHtml)(source.name)}</span>
          <span class="cascade-source-type">${(0, i18n_1.t)(`components.cascade.filterType.${source.type}`)}</span>
        </div>
        <div class="cascade-section">
          <div class="cascade-section-title">${(0, i18n_1.t)('components.cascade.countriesAffected', { count: String(countriesAffected.length) })}</div>
          <div class="cascade-countries">${countriesHtml}</div>
        </div>
        ${redundanciesHtml}
      </div>
    `;
    }
    render() {
        if (!this.graph) {
            this.showLoading();
            return;
        }
        const stats = (0, infrastructure_cascade_1.getGraphStats)();
        const statsHtml = `
      <div class="cascade-stats">
        <span>🔌 ${stats.cables}</span>
        <span>🛢️ ${stats.pipelines}</span>
        <span>⚓ ${stats.ports}</span>
        <span>🌊 ${stats.chokepoints}</span>
        <span>🏳️ ${stats.countries}</span>
        <span>📊 ${stats.edges} ${(0, i18n_1.t)('components.cascade.links')}</span>
      </div>
    `;
        this.content.innerHTML = `
      <div class="cascade-panel">
        ${statsHtml}
        ${this.renderSelector()}
        ${this.cascadeResult ? this.renderCascadeResult() : `<div class="cascade-hint">${(0, i18n_1.t)('components.cascade.selectInfrastructureHint')}</div>`}
      </div>
    `;
        this.attachEventListeners();
    }
    attachEventListeners() {
        const filterBtns = this.content.querySelectorAll('.cascade-filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.filter = btn.getAttribute('data-filter');
                this.selectedNode = null;
                this.cascadeResult = null;
                this.render();
            });
        });
        const select = this.content.querySelector('.cascade-select');
        if (select) {
            select.addEventListener('change', () => {
                this.selectedNode = select.value || null;
                this.cascadeResult = null;
                if (this.onSelectCallback) {
                    this.onSelectCallback(this.selectedNode);
                }
                this.render();
            });
        }
        const analyzeBtn = this.content.querySelector('.cascade-analyze-btn');
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => this.runAnalysis());
        }
    }
    runAnalysis() {
        if (!this.selectedNode)
            return;
        this.cascadeResult = (0, infrastructure_cascade_1.calculateCascade)(this.selectedNode);
        this.render();
        if (this.onSelectCallback) {
            this.onSelectCallback(this.selectedNode);
        }
    }
    selectNode(nodeId) {
        this.selectedNode = nodeId;
        const nodeType = nodeId.split(':')[0];
        if (['cable', 'pipeline', 'port', 'chokepoint'].includes(nodeType)) {
            this.filter = nodeType;
        }
        this.runAnalysis();
    }
    onSelect(callback) {
        this.onSelectCallback = callback;
    }
    getSelectedNode() {
        return this.selectedNode;
    }
    getCascadeResult() {
        return this.cascadeResult;
    }
    refresh() {
        (0, infrastructure_cascade_1.clearGraphCache)();
        this.graph = null;
        this.cascadeResult = null;
        this.init();
    }
}
exports.CascadePanel = CascadePanel;
