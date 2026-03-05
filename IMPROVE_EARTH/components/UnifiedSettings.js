"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnifiedSettings = void 0;
const feeds_1 = require("@/config/feeds");
const panels_1 = require("@/config/panels");
const variant_1 = require("@/config/variant");
const i18n_1 = require("@/services/i18n");
const ai_flow_settings_1 = require("@/services/ai-flow-settings");
const sanitize_1 = require("@/utils/sanitize");
const analytics_1 = require("@/services/analytics");
const GEAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
const DESKTOP_RELEASES_URL = 'https://github.com/Dexmond-Technologies/WORLD_MONITOR/releases';
class UnifiedSettings {
    constructor(config) {
        this.activeTab = 'general';
        this.activeSourceRegion = 'all';
        this.sourceFilter = '';
        this.activePanelCategory = 'all';
        this.panelFilter = '';
        this.config = config;
        this.overlay = document.createElement('div');
        this.overlay.className = 'modal-overlay';
        this.overlay.id = 'unifiedSettingsModal';
        this.overlay.setAttribute('role', 'dialog');
        this.overlay.setAttribute('aria-label', (0, i18n_1.t)('header.settings'));
        this.escapeHandler = (e) => {
            if (e.key === 'Escape')
                this.close();
        };
        // Event delegation on stable overlay element
        this.overlay.addEventListener('click', (e) => {
            const target = e.target;
            // Close on overlay background click
            if (target === this.overlay) {
                this.close();
                return;
            }
            // Close button
            if (target.closest('.unified-settings-close')) {
                this.close();
                return;
            }
            // Tab switching
            const tab = target.closest('.unified-settings-tab');
            if (tab?.dataset.tab) {
                this.switchTab(tab.dataset.tab);
                return;
            }
            // Panel category pill
            const panelCatPill = target.closest('[data-panel-cat]');
            if (panelCatPill?.dataset.panelCat) {
                this.activePanelCategory = panelCatPill.dataset.panelCat;
                this.panelFilter = '';
                const searchInput = this.overlay.querySelector('.panels-search input');
                if (searchInput)
                    searchInput.value = '';
                this.renderPanelCategoryPills();
                this.renderPanelsTab();
                return;
            }
            // Panel toggle
            const panelItem = target.closest('.panel-toggle-item');
            if (panelItem?.dataset.panel) {
                this.config.togglePanel(panelItem.dataset.panel);
                this.renderPanelsTab();
                return;
            }
            // Source toggle
            const sourceItem = target.closest('.source-toggle-item');
            if (sourceItem?.dataset.source) {
                this.config.toggleSource(sourceItem.dataset.source);
                this.renderSourcesGrid();
                this.updateSourcesCounter();
                return;
            }
            // Region pill
            const pill = target.closest('.unified-settings-region-pill');
            if (pill?.dataset.region) {
                this.activeSourceRegion = pill.dataset.region;
                this.sourceFilter = '';
                const searchInput = this.overlay.querySelector('.sources-search input');
                if (searchInput)
                    searchInput.value = '';
                this.renderRegionPills();
                this.renderSourcesGrid();
                this.updateSourcesCounter();
                return;
            }
            // Select All
            if (target.closest('.sources-select-all')) {
                const visible = this.getVisibleSourceNames();
                this.config.setSourcesEnabled(visible, true);
                this.renderSourcesGrid();
                this.updateSourcesCounter();
                return;
            }
            // Select None
            if (target.closest('.sources-select-none')) {
                const visible = this.getVisibleSourceNames();
                this.config.setSourcesEnabled(visible, false);
                this.renderSourcesGrid();
                this.updateSourcesCounter();
                return;
            }
        });
        // Handle input events for search
        this.overlay.addEventListener('input', (e) => {
            const target = e.target;
            if (target.closest('.panels-search')) {
                this.panelFilter = target.value;
                this.renderPanelsTab();
            }
            else if (target.closest('.sources-search')) {
                this.sourceFilter = target.value;
                this.renderSourcesGrid();
                this.updateSourcesCounter();
            }
        });
        // Handle change events for toggles and language select
        this.overlay.addEventListener('change', (e) => {
            const target = e.target;
            // Stream quality select
            if (target.id === 'us-stream-quality') {
                (0, ai_flow_settings_1.setStreamQuality)(target.value);
                return;
            }
            // Language select
            if (target.closest('.unified-settings-lang-select')) {
                (0, analytics_1.trackLanguageChange)(target.value);
                void (0, i18n_1.changeLanguage)(target.value);
                return;
            }
            if (target.id === 'us-cloud') {
                (0, ai_flow_settings_1.setAiFlowSetting)('cloudLlm', target.checked);
                this.updateAiStatus();
            }
            else if (target.id === 'us-browser') {
                (0, ai_flow_settings_1.setAiFlowSetting)('browserModel', target.checked);
                const warn = this.overlay.querySelector('.ai-flow-toggle-warn');
                if (warn)
                    warn.style.display = target.checked ? 'block' : 'none';
                this.updateAiStatus();
            }
            else if (target.id === 'us-map-flash') {
                (0, ai_flow_settings_1.setAiFlowSetting)('mapNewsFlash', target.checked);
            }
        });
        this.render();
        document.body.appendChild(this.overlay);
    }
    open(tab) {
        if (tab)
            this.activeTab = tab;
        this.render();
        this.overlay.classList.add('active');
        localStorage.setItem('wm-settings-open', '1');
        document.addEventListener('keydown', this.escapeHandler);
    }
    close() {
        this.overlay.classList.remove('active');
        localStorage.removeItem('wm-settings-open');
        document.removeEventListener('keydown', this.escapeHandler);
    }
    refreshPanelToggles() {
        if (this.activeTab === 'panels')
            this.renderPanelsTab();
    }
    getButton() {
        const btn = document.createElement('button');
        btn.className = 'unified-settings-btn';
        btn.id = 'unifiedSettingsBtn';
        btn.setAttribute('aria-label', (0, i18n_1.t)('header.settings'));
        btn.innerHTML = GEAR_SVG;
        btn.addEventListener('click', () => this.open());
        return btn;
    }
    destroy() {
        document.removeEventListener('keydown', this.escapeHandler);
        this.overlay.remove();
    }
    render() {
        const tabClass = (id) => `unified-settings-tab${this.activeTab === id ? ' active' : ''}`;
        this.overlay.innerHTML = `
      <div class="modal unified-settings-modal">
        <div class="modal-header">
          <span class="modal-title">${(0, i18n_1.t)('header.settings')}</span>
          <button class="modal-close unified-settings-close">×</button>
        </div>
        <div class="unified-settings-tabs">
          <button class="${tabClass('general')}" data-tab="general">${(0, i18n_1.t)('header.tabGeneral')}</button>
          <button class="${tabClass('panels')}" data-tab="panels">${(0, i18n_1.t)('header.tabPanels')}</button>
          <button class="${tabClass('sources')}" data-tab="sources">${(0, i18n_1.t)('header.tabSources')}</button>
        </div>
        <div class="unified-settings-tab-panel${this.activeTab === 'general' ? ' active' : ''}" data-panel-id="general">
          ${this.renderGeneralContent()}
        </div>
        <div class="unified-settings-tab-panel${this.activeTab === 'panels' ? ' active' : ''}" data-panel-id="panels">
          <div class="unified-settings-region-wrapper">
            <div class="unified-settings-region-bar" id="usPanelCatBar"></div>
          </div>
          <div class="panels-search">
            <input type="text" placeholder="${(0, i18n_1.t)('header.filterPanels')}" value="${(0, sanitize_1.escapeHtml)(this.panelFilter)}" />
          </div>
          <div class="panel-toggle-grid" id="usPanelToggles"></div>
        </div>
        <div class="unified-settings-tab-panel${this.activeTab === 'sources' ? ' active' : ''}" data-panel-id="sources">
          <div class="unified-settings-region-wrapper">
            <div class="unified-settings-region-bar" id="usRegionBar"></div>
          </div>
          <div class="sources-search">
            <input type="text" placeholder="${(0, i18n_1.t)('header.filterSources')}" value="${(0, sanitize_1.escapeHtml)(this.sourceFilter)}" />
          </div>
          <div class="sources-toggle-grid" id="usSourceToggles"></div>
          <div class="sources-footer">
            <span class="sources-counter" id="usSourcesCounter"></span>
            <button class="sources-select-all">${(0, i18n_1.t)('common.selectAll')}</button>
            <button class="sources-select-none">${(0, i18n_1.t)('common.selectNone')}</button>
          </div>
        </div>
      </div>
    `;
        // Populate dynamic sections after innerHTML is set
        this.renderPanelCategoryPills();
        this.renderPanelsTab();
        this.renderRegionPills();
        this.renderSourcesGrid();
        this.updateSourcesCounter();
        if (!this.config.isDesktopApp)
            this.updateAiStatus();
    }
    switchTab(tab) {
        this.activeTab = tab;
        // Update tab buttons
        this.overlay.querySelectorAll('.unified-settings-tab').forEach(el => {
            el.classList.toggle('active', el.dataset.tab === tab);
        });
        // Update tab panels
        this.overlay.querySelectorAll('.unified-settings-tab-panel').forEach(el => {
            el.classList.toggle('active', el.dataset.panelId === tab);
        });
    }
    renderGeneralContent() {
        const settings = (0, ai_flow_settings_1.getAiFlowSettings)();
        const currentLang = (0, i18n_1.getCurrentLanguage)();
        let html = '';
        // Map section
        html += `<div class="ai-flow-section-label">${(0, i18n_1.t)('components.insights.sectionMap')}</div>`;
        html += this.toggleRowHtml('us-map-flash', (0, i18n_1.t)('components.insights.mapFlashLabel'), (0, i18n_1.t)('components.insights.mapFlashDesc'), settings.mapNewsFlash);
        // AI Analysis section (web-only)
        if (!this.config.isDesktopApp) {
            html += `<div class="ai-flow-section-label">${(0, i18n_1.t)('components.insights.sectionAi')}</div>`;
            html += this.toggleRowHtml('us-cloud', (0, i18n_1.t)('components.insights.aiFlowCloudLabel'), (0, i18n_1.t)('components.insights.aiFlowCloudDesc'), settings.cloudLlm);
            html += this.toggleRowHtml('us-browser', (0, i18n_1.t)('components.insights.aiFlowBrowserLabel'), (0, i18n_1.t)('components.insights.aiFlowBrowserDesc'), settings.browserModel);
            html += `<div class="ai-flow-toggle-warn" style="display:${settings.browserModel ? 'block' : 'none'}">${(0, i18n_1.t)('components.insights.aiFlowBrowserWarn')}</div>`;
            // Ollama CTA
            html += `
        <div class="ai-flow-cta">
          <div class="ai-flow-cta-title">${(0, i18n_1.t)('components.insights.aiFlowOllamaCta')}</div>
          <div class="ai-flow-cta-desc">${(0, i18n_1.t)('components.insights.aiFlowOllamaCtaDesc')}</div>
          <a href="${DESKTOP_RELEASES_URL}" target="_blank" rel="noopener noreferrer" class="ai-flow-cta-link">${(0, i18n_1.t)('components.insights.aiFlowDownloadDesktop')}</a>
        </div>
      `;
        }
        // Streaming quality section
        const currentQuality = (0, ai_flow_settings_1.getStreamQuality)();
        html += `<div class="ai-flow-section-label">${(0, i18n_1.t)('components.insights.sectionStreaming')}</div>`;
        html += `<div class="ai-flow-toggle-row">
      <div class="ai-flow-toggle-label-wrap">
        <div class="ai-flow-toggle-label">${(0, i18n_1.t)('components.insights.streamQualityLabel')}</div>
        <div class="ai-flow-toggle-desc">${(0, i18n_1.t)('components.insights.streamQualityDesc')}</div>
      </div>
    </div>`;
        html += `<select class="unified-settings-lang-select" id="us-stream-quality">`;
        for (const opt of ai_flow_settings_1.STREAM_QUALITY_OPTIONS) {
            const selected = opt.value === currentQuality ? ' selected' : '';
            html += `<option value="${opt.value}"${selected}>${opt.label}</option>`;
        }
        html += `</select>`;
        // Language section
        html += `<div class="ai-flow-section-label">${(0, i18n_1.t)('header.languageLabel')}</div>`;
        html += `<select class="unified-settings-lang-select">`;
        for (const lang of i18n_1.LANGUAGES) {
            const selected = lang.code === currentLang ? ' selected' : '';
            html += `<option value="${lang.code}"${selected}>${lang.flag} ${lang.label}</option>`;
        }
        html += `</select>`;
        // AI status footer (web-only)
        if (!this.config.isDesktopApp) {
            html += `<div class="ai-flow-popup-footer"><span class="ai-flow-status-dot" id="usStatusDot"></span><span class="ai-flow-status-text" id="usStatusText"></span></div>`;
        }
        return html;
    }
    toggleRowHtml(id, label, desc, checked) {
        return `
      <div class="ai-flow-toggle-row">
        <div class="ai-flow-toggle-label-wrap">
          <div class="ai-flow-toggle-label">${label}</div>
          <div class="ai-flow-toggle-desc">${desc}</div>
        </div>
        <label class="ai-flow-switch">
          <input type="checkbox" id="${id}"${checked ? ' checked' : ''}>
          <span class="ai-flow-slider"></span>
        </label>
      </div>
    `;
    }
    updateAiStatus() {
        const settings = (0, ai_flow_settings_1.getAiFlowSettings)();
        const dot = this.overlay.querySelector('#usStatusDot');
        const text = this.overlay.querySelector('#usStatusText');
        if (!dot || !text)
            return;
        dot.className = 'ai-flow-status-dot';
        if (settings.cloudLlm && settings.browserModel) {
            dot.classList.add('active');
            text.textContent = (0, i18n_1.t)('components.insights.aiFlowStatusCloudAndBrowser');
        }
        else if (settings.cloudLlm) {
            dot.classList.add('active');
            text.textContent = (0, i18n_1.t)('components.insights.aiFlowStatusActive');
        }
        else if (settings.browserModel) {
            dot.classList.add('browser-only');
            text.textContent = (0, i18n_1.t)('components.insights.aiFlowStatusBrowserOnly');
        }
        else {
            dot.classList.add('disabled');
            text.textContent = (0, i18n_1.t)('components.insights.aiFlowStatusDisabled');
        }
    }
    getAvailablePanelCategories() {
        const panelKeys = new Set(Object.keys(this.config.getPanelSettings()));
        const variant = variant_1.SITE_VARIANT || 'full';
        const categories = [
            { key: 'all', label: (0, i18n_1.t)('header.sourceRegionAll') }
        ];
        for (const [catKey, catDef] of Object.entries(panels_1.PANEL_CATEGORY_MAP)) {
            if (catDef.variants && !catDef.variants.includes(variant))
                continue;
            const hasPanel = catDef.panelKeys.some(pk => panelKeys.has(pk));
            if (hasPanel) {
                categories.push({ key: catKey, label: (0, i18n_1.t)(catDef.labelKey) });
            }
        }
        return categories;
    }
    getVisiblePanelEntries() {
        const panelSettings = this.config.getPanelSettings();
        const variant = variant_1.SITE_VARIANT || 'full';
        let entries = Object.entries(panelSettings)
            .filter(([key]) => key !== 'runtime-config' || this.config.isDesktopApp);
        if (this.activePanelCategory !== 'all') {
            const catDef = panels_1.PANEL_CATEGORY_MAP[this.activePanelCategory];
            if (catDef && (!catDef.variants || catDef.variants.includes(variant))) {
                const allowed = new Set(catDef.panelKeys);
                entries = entries.filter(([key]) => allowed.has(key));
            }
        }
        if (this.panelFilter) {
            const lower = this.panelFilter.toLowerCase();
            entries = entries.filter(([key, panel]) => key.toLowerCase().includes(lower) ||
                panel.name.toLowerCase().includes(lower) ||
                this.config.getLocalizedPanelName(key, panel.name).toLowerCase().includes(lower));
        }
        return entries;
    }
    renderPanelCategoryPills() {
        const bar = this.overlay.querySelector('#usPanelCatBar');
        if (!bar)
            return;
        const categories = this.getAvailablePanelCategories();
        bar.innerHTML = categories.map(c => `<button class="unified-settings-region-pill${this.activePanelCategory === c.key ? ' active' : ''}" data-panel-cat="${c.key}">${(0, sanitize_1.escapeHtml)(c.label)}</button>`).join('');
    }
    renderPanelsTab() {
        const container = this.overlay.querySelector('#usPanelToggles');
        if (!container)
            return;
        const entries = this.getVisiblePanelEntries();
        container.innerHTML = entries.map(([key, panel]) => `
      <div class="panel-toggle-item ${panel.enabled ? 'active' : ''}" data-panel="${(0, sanitize_1.escapeHtml)(key)}">
        <div class="panel-toggle-checkbox">${panel.enabled ? '✓' : ''}</div>
        <span class="panel-toggle-label">${(0, sanitize_1.escapeHtml)(this.config.getLocalizedPanelName(key, panel.name))}</span>
      </div>
    `).join('');
    }
    getAvailableRegions() {
        const feedKeys = new Set(Object.keys(feeds_1.FEEDS));
        const regions = [
            { key: 'all', label: (0, i18n_1.t)('header.sourceRegionAll') }
        ];
        for (const [regionKey, regionDef] of Object.entries(feeds_1.SOURCE_REGION_MAP)) {
            if (regionKey === 'intel') {
                if (feeds_1.INTEL_SOURCES.length > 0) {
                    regions.push({ key: regionKey, label: (0, i18n_1.t)(regionDef.labelKey) });
                }
                continue;
            }
            const hasFeeds = regionDef.feedKeys.some(fk => feedKeys.has(fk));
            if (hasFeeds) {
                regions.push({ key: regionKey, label: (0, i18n_1.t)(regionDef.labelKey) });
            }
        }
        return regions;
    }
    getSourcesByRegion() {
        const map = new Map();
        const feedKeys = new Set(Object.keys(feeds_1.FEEDS));
        for (const [regionKey, regionDef] of Object.entries(feeds_1.SOURCE_REGION_MAP)) {
            const sources = [];
            if (regionKey === 'intel') {
                feeds_1.INTEL_SOURCES.forEach(f => sources.push(f.name));
            }
            else {
                for (const fk of regionDef.feedKeys) {
                    if (feedKeys.has(fk)) {
                        feeds_1.FEEDS[fk].forEach(f => sources.push(f.name));
                    }
                }
            }
            if (sources.length > 0) {
                map.set(regionKey, sources.sort((a, b) => a.localeCompare(b)));
            }
        }
        return map;
    }
    getVisibleSourceNames() {
        let sources;
        if (this.activeSourceRegion === 'all') {
            sources = this.config.getAllSourceNames();
        }
        else {
            const byRegion = this.getSourcesByRegion();
            sources = byRegion.get(this.activeSourceRegion) || [];
        }
        if (this.sourceFilter) {
            const lower = this.sourceFilter.toLowerCase();
            sources = sources.filter(s => s.toLowerCase().includes(lower));
        }
        return sources;
    }
    renderRegionPills() {
        const bar = this.overlay.querySelector('#usRegionBar');
        if (!bar)
            return;
        const regions = this.getAvailableRegions();
        bar.innerHTML = regions.map(r => `<button class="unified-settings-region-pill${this.activeSourceRegion === r.key ? ' active' : ''}" data-region="${r.key}">${(0, sanitize_1.escapeHtml)(r.label)}</button>`).join('');
    }
    renderSourcesGrid() {
        const container = this.overlay.querySelector('#usSourceToggles');
        if (!container)
            return;
        const sources = this.getVisibleSourceNames();
        const disabled = this.config.getDisabledSources();
        container.innerHTML = sources.map(source => {
            const isEnabled = !disabled.has(source);
            const escaped = (0, sanitize_1.escapeHtml)(source);
            return `
        <div class="source-toggle-item ${isEnabled ? 'active' : ''}" data-source="${escaped}">
          <div class="source-toggle-checkbox">${isEnabled ? '✓' : ''}</div>
          <span class="source-toggle-label">${escaped}</span>
        </div>
      `;
        }).join('');
    }
    updateSourcesCounter() {
        const counter = this.overlay.querySelector('#usSourcesCounter');
        if (!counter)
            return;
        const disabled = this.config.getDisabledSources();
        const allSources = this.config.getAllSourceNames();
        const enabledTotal = allSources.length - disabled.size;
        counter.textContent = (0, i18n_1.t)('header.sourcesEnabled', { enabled: String(enabledTotal), total: String(allSources.length) });
    }
}
exports.UnifiedSettings = UnifiedSettings;
