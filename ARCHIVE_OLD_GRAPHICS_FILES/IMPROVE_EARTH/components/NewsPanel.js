"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewsPanel = void 0;
const Panel_1 = require("./Panel");
const VirtualList_1 = require("./VirtualList");
const threat_classifier_1 = require("@/services/threat-classifier");
const utils_1 = require("@/utils");
const sanitize_1 = require("@/utils/sanitize");
const services_1 = require("@/services");
const feeds_1 = require("@/config/feeds");
const config_1 = require("@/config");
const i18n_1 = require("@/services/i18n");
/** Threshold for enabling virtual scrolling */
const VIRTUAL_SCROLL_THRESHOLD = 15;
/** Summary cache TTL in milliseconds (10 minutes) */
const SUMMARY_CACHE_TTL = 10 * 60 * 1000;
class NewsPanel extends Panel_1.Panel {
    constructor(id, title) {
        super({ id, title, showCount: true, trackActivity: true });
        this.clusteredMode = true;
        this.deviationEl = null;
        this.relatedAssetContext = new Map();
        this.isFirstRender = true;
        this.windowedList = null;
        this.useVirtualScroll = true;
        this.renderRequestId = 0;
        this.boundScrollHandler = null;
        this.boundClickHandler = null;
        // Panel summary feature
        this.summaryBtn = null;
        this.summaryContainer = null;
        this.currentHeadlines = [];
        this.lastHeadlineSignature = '';
        this.isSummarizing = false;
        this.createDeviationIndicator();
        this.createSummarizeButton();
        this.setupActivityTracking();
        this.initWindowedList();
    }
    initWindowedList() {
        this.windowedList = new VirtualList_1.WindowedList({
            container: this.content,
            chunkSize: 8, // Render 8 items per chunk
            bufferChunks: 1, // 1 chunk buffer above/below
        }, (prepared) => this.renderClusterHtmlSafely(prepared.cluster, prepared.isNew, prepared.shouldHighlight, prepared.showNewTag), () => this.bindRelatedAssetEvents());
    }
    setupActivityTracking() {
        // Register with activity tracker
        services_1.activityTracker.register(this.panelId);
        // Listen for new count changes
        services_1.activityTracker.onChange(this.panelId, (newCount) => {
            // Pulse if there are new items
            this.setNewBadge(newCount, newCount > 0);
        });
        // Mark as seen when panel content is scrolled
        this.boundScrollHandler = () => {
            services_1.activityTracker.markAsSeen(this.panelId);
        };
        this.content.addEventListener('scroll', this.boundScrollHandler);
        // Mark as seen on click anywhere in panel
        this.boundClickHandler = () => {
            services_1.activityTracker.markAsSeen(this.panelId);
        };
        this.element.addEventListener('click', this.boundClickHandler);
    }
    setRelatedAssetHandlers(options) {
        this.onRelatedAssetClick = options.onRelatedAssetClick;
        this.onRelatedAssetsFocus = options.onRelatedAssetsFocus;
        this.onRelatedAssetsClear = options.onRelatedAssetsClear;
    }
    createDeviationIndicator() {
        const header = this.getElement().querySelector('.panel-header-left');
        if (header) {
            this.deviationEl = document.createElement('span');
            this.deviationEl.className = 'deviation-indicator';
            header.appendChild(this.deviationEl);
        }
    }
    createSummarizeButton() {
        // Create summary container (inserted between header and content)
        this.summaryContainer = document.createElement('div');
        this.summaryContainer.className = 'panel-summary';
        this.summaryContainer.style.display = 'none';
        this.element.insertBefore(this.summaryContainer, this.content);
        // Create summarize button
        this.summaryBtn = document.createElement('button');
        this.summaryBtn.className = 'panel-summarize-btn';
        this.summaryBtn.innerHTML = '✨';
        this.summaryBtn.title = (0, i18n_1.t)('components.newsPanel.summarize');
        this.summaryBtn.addEventListener('click', () => this.handleSummarize());
        // Insert before count element (use inherited this.header directly)
        const countEl = this.header.querySelector('.panel-count');
        if (countEl) {
            this.header.insertBefore(this.summaryBtn, countEl);
        }
        else {
            this.header.appendChild(this.summaryBtn);
        }
    }
    async handleSummarize() {
        if (this.isSummarizing || !this.summaryContainer || !this.summaryBtn)
            return;
        if (this.currentHeadlines.length === 0)
            return;
        // Check cache first (include variant, version, and language)
        const currentLang = (0, i18n_1.getCurrentLanguage)();
        const cacheKey = `panel_summary_v3_${config_1.SITE_VARIANT}_${this.panelId}_${currentLang}`;
        const cached = this.getCachedSummary(cacheKey);
        if (cached) {
            this.showSummary(cached);
            return;
        }
        // Show loading state
        this.isSummarizing = true;
        this.summaryBtn.innerHTML = '<span class="panel-summarize-spinner"></span>';
        this.summaryBtn.disabled = true;
        this.summaryContainer.style.display = 'block';
        this.summaryContainer.innerHTML = `<div class="panel-summary-loading">${(0, i18n_1.t)('components.newsPanel.generatingSummary')}</div>`;
        const sigAtStart = this.lastHeadlineSignature;
        try {
            const result = await (0, services_1.generateSummary)(this.currentHeadlines.slice(0, 8), undefined, this.panelId, currentLang);
            if (this.lastHeadlineSignature !== sigAtStart) {
                this.hideSummary();
                return;
            }
            if (result?.summary) {
                this.setCachedSummary(cacheKey, result.summary);
                this.showSummary(result.summary);
            }
            else {
                this.summaryContainer.innerHTML = '<div class="panel-summary-error">Could not generate summary</div>';
                setTimeout(() => this.hideSummary(), 3000);
            }
        }
        catch {
            this.summaryContainer.innerHTML = '<div class="panel-summary-error">Summary failed</div>';
            setTimeout(() => this.hideSummary(), 3000);
        }
        finally {
            this.isSummarizing = false;
            this.summaryBtn.innerHTML = '✨';
            this.summaryBtn.disabled = false;
        }
    }
    async handleTranslate(element, text) {
        const currentLang = (0, i18n_1.getCurrentLanguage)();
        if (currentLang === 'en')
            return; // Assume news is mostly English, no need to translate if UI is English (or add detection later)
        const titleEl = element.closest('.item')?.querySelector('.item-title');
        if (!titleEl)
            return;
        const originalText = titleEl.textContent || '';
        // Visual feedback
        element.innerHTML = '...';
        element.style.pointerEvents = 'none';
        try {
            const translated = await (0, services_1.translateText)(text, currentLang);
            if (translated) {
                titleEl.textContent = translated;
                titleEl.dataset.original = originalText;
                element.innerHTML = '✓';
                element.title = 'Original: ' + originalText;
                element.classList.add('translated');
            }
            else {
                element.innerHTML = '文';
                // Shake animation or error state could be added here
            }
        }
        catch (e) {
            console.error('Translation failed', e);
            element.innerHTML = '文';
        }
        finally {
            element.style.pointerEvents = 'auto';
        }
    }
    showSummary(summary) {
        if (!this.summaryContainer)
            return;
        this.summaryContainer.style.display = 'block';
        this.summaryContainer.innerHTML = `
      <div class="panel-summary-content">
        <span class="panel-summary-text">${(0, sanitize_1.escapeHtml)(summary)}</span>
        <button class="panel-summary-close" title="${(0, i18n_1.t)('components.newsPanel.close')}">×</button>
      </div>
    `;
        this.summaryContainer.querySelector('.panel-summary-close')?.addEventListener('click', () => this.hideSummary());
    }
    hideSummary() {
        if (!this.summaryContainer)
            return;
        this.summaryContainer.style.display = 'none';
        this.summaryContainer.innerHTML = '';
    }
    getHeadlineSignature() {
        return JSON.stringify(this.currentHeadlines.slice(0, 5).sort());
    }
    updateHeadlineSignature() {
        const newSig = this.getHeadlineSignature();
        if (newSig !== this.lastHeadlineSignature) {
            this.lastHeadlineSignature = newSig;
            if (this.summaryContainer?.style.display === 'block') {
                this.hideSummary();
            }
        }
    }
    getCachedSummary(key) {
        try {
            const cached = localStorage.getItem(key);
            if (!cached)
                return null;
            const parsed = JSON.parse(cached);
            if (!parsed.headlineSignature) {
                localStorage.removeItem(key);
                return null;
            }
            if (parsed.headlineSignature !== this.lastHeadlineSignature)
                return null;
            if (Date.now() - parsed.timestamp > SUMMARY_CACHE_TTL) {
                localStorage.removeItem(key);
                return null;
            }
            return parsed.summary;
        }
        catch {
            return null;
        }
    }
    setCachedSummary(key, summary) {
        try {
            localStorage.setItem(key, JSON.stringify({
                headlineSignature: this.lastHeadlineSignature,
                summary,
                timestamp: Date.now(),
            }));
        }
        catch { /* storage full */ }
    }
    setDeviation(zScore, percentChange, level) {
        if (!this.deviationEl)
            return;
        if (level === 'normal') {
            this.deviationEl.textContent = '';
            this.deviationEl.className = 'deviation-indicator';
            return;
        }
        const arrow = zScore > 0 ? '↑' : '↓';
        const sign = percentChange > 0 ? '+' : '';
        this.deviationEl.textContent = `${arrow}${sign}${percentChange}%`;
        this.deviationEl.className = `deviation-indicator ${level}`;
        this.deviationEl.title = `z-score: ${zScore} (vs 7-day avg)`;
    }
    renderNews(items) {
        if (items.length === 0) {
            this.renderRequestId += 1; // Cancel in-flight clustering from previous renders.
            this.setDataBadge('unavailable');
            this.showError((0, i18n_1.t)('common.noNewsAvailable'));
            return;
        }
        this.setDataBadge('live');
        // Always show flat items immediately for instant visual feedback,
        // then upgrade to clustered view in the background when ready.
        this.renderFlat(items);
        if (this.clusteredMode) {
            void this.renderClustersAsync(items);
        }
    }
    renderFilteredEmpty(message) {
        this.renderRequestId += 1; // Cancel in-flight clustering from previous renders.
        this.setDataBadge('live');
        this.setCount(0);
        this.relatedAssetContext.clear();
        this.currentHeadlines = [];
        this.updateHeadlineSignature();
        this.setContent(`<div class="panel-empty">${(0, sanitize_1.escapeHtml)(message)}</div>`);
    }
    async renderClustersAsync(items) {
        const requestId = ++this.renderRequestId;
        try {
            const clusters = await services_1.analysisWorker.clusterNews(items);
            if (requestId !== this.renderRequestId)
                return;
            const enriched = await (0, services_1.enrichWithVelocityML)(clusters);
            this.renderClusters(enriched);
        }
        catch (error) {
            if (requestId !== this.renderRequestId)
                return;
            // Keep already-rendered flat list visible when clustering fails.
            console.warn('[NewsPanel] Failed to cluster news, keeping flat list:', error);
        }
    }
    renderFlat(items) {
        this.setCount(items.length);
        this.currentHeadlines = items
            .slice(0, 5)
            .map(item => item.title)
            .filter((title) => typeof title === 'string' && title.trim().length > 0);
        this.updateHeadlineSignature();
        const html = items
            .map((item) => `
      <div class="item ${item.isAlert ? 'alert' : ''}" ${item.monitorColor ? `style="border-inline-start-color: ${(0, sanitize_1.escapeHtml)(item.monitorColor)}"` : ''}>
        <div class="item-source">
          ${(0, sanitize_1.escapeHtml)(item.source)}
          ${item.lang && item.lang !== (0, i18n_1.getCurrentLanguage)() ? `<span class="lang-badge">${item.lang.toUpperCase()}</span>` : ''}
          ${item.isAlert ? '<span class="alert-tag">ALERT</span>' : ''}
        </div>
        <a class="item-title" href="${(0, sanitize_1.sanitizeUrl)(item.link)}" target="_blank" rel="noopener">${(0, sanitize_1.escapeHtml)(item.title)}</a>
        <div class="item-time">
          ${(0, utils_1.formatTime)(item.pubDate)}
          ${(0, i18n_1.getCurrentLanguage)() !== 'en' ? `<button class="item-translate-btn" title="Translate" data-text="${(0, sanitize_1.escapeHtml)(item.title)}">文</button>` : ''}
        </div>
      </div>
    `)
            .join('');
        this.setContent(html);
    }
    renderClusters(clusters) {
        // Sort by threat priority, then by time within same level
        const sorted = [...clusters].sort((a, b) => {
            const pa = threat_classifier_1.THREAT_PRIORITY[a.threat?.level ?? 'info'];
            const pb = threat_classifier_1.THREAT_PRIORITY[b.threat?.level ?? 'info'];
            if (pb !== pa)
                return pb - pa;
            return b.lastUpdated.getTime() - a.lastUpdated.getTime();
        });
        const totalItems = sorted.reduce((sum, c) => sum + c.sourceCount, 0);
        this.setCount(totalItems);
        this.relatedAssetContext.clear();
        // Store headlines for summarization (cap at 5 to reduce entity conflation in small models)
        this.currentHeadlines = sorted.slice(0, 5).map(c => c.primaryTitle);
        this.updateHeadlineSignature();
        const clusterIds = sorted.map(c => c.id);
        let newItemIds;
        if (this.isFirstRender) {
            // First render: mark all items as seen
            services_1.activityTracker.updateItems(this.panelId, clusterIds);
            services_1.activityTracker.markAsSeen(this.panelId);
            newItemIds = new Set();
            this.isFirstRender = false;
        }
        else {
            // Subsequent renders: track new items
            const newIds = services_1.activityTracker.updateItems(this.panelId, clusterIds);
            newItemIds = new Set(newIds);
        }
        // Prepare all clusters with their rendering data (defer HTML creation)
        const prepared = sorted.map(cluster => {
            const isNew = newItemIds.has(cluster.id);
            const shouldHighlight = services_1.activityTracker.shouldHighlight(this.panelId, cluster.id);
            const showNewTag = services_1.activityTracker.isNewItem(this.panelId, cluster.id) && isNew;
            return {
                cluster,
                isNew,
                shouldHighlight,
                showNewTag,
            };
        });
        // Use windowed rendering for large lists, direct render for small
        if (this.useVirtualScroll && sorted.length > VIRTUAL_SCROLL_THRESHOLD && this.windowedList) {
            this.windowedList.setItems(prepared);
        }
        else {
            // Direct render for small lists
            const html = prepared
                .map(p => this.renderClusterHtmlSafely(p.cluster, p.isNew, p.shouldHighlight, p.showNewTag))
                .join('');
            this.setContent(html);
            this.bindRelatedAssetEvents();
        }
    }
    renderClusterHtmlSafely(cluster, isNew, shouldHighlight, showNewTag) {
        try {
            return this.renderClusterHtml(cluster, isNew, shouldHighlight, showNewTag);
        }
        catch (error) {
            console.error('[NewsPanel] Failed to render cluster card:', error, cluster);
            const clusterId = typeof cluster?.id === 'string' ? cluster.id : 'unknown-cluster';
            return `
        <div class="item clustered item-render-error" data-cluster-id="${(0, sanitize_1.escapeHtml)(clusterId)}">
          <div class="item-source">${(0, i18n_1.t)('common.error')}</div>
          <div class="item-title">Failed to display this cluster.</div>
        </div>
      `;
        }
    }
    /**
     * Render a single cluster to HTML string
     */
    renderClusterHtml(cluster, isNew, shouldHighlight, showNewTag) {
        const sourceBadge = cluster.sourceCount > 1
            ? `<span class="source-count">${(0, i18n_1.t)('components.newsPanel.sources', { count: String(cluster.sourceCount) })}</span>`
            : '';
        const velocity = cluster.velocity;
        const velocityBadge = velocity && velocity.level !== 'normal' && cluster.sourceCount > 1
            ? `<span class="velocity-badge ${velocity.level}">${velocity.trend === 'rising' ? '↑' : ''}+${velocity.sourcesPerHour}/hr</span>`
            : '';
        const sentimentIcon = velocity?.sentiment === 'negative' ? '⚠' : velocity?.sentiment === 'positive' ? '✓' : '';
        const sentimentBadge = sentimentIcon && Math.abs(velocity?.sentimentScore || 0) > 2
            ? `<span class="sentiment-badge ${velocity?.sentiment}">${sentimentIcon}</span>`
            : '';
        const newTag = showNewTag ? `<span class="new-tag">${(0, i18n_1.t)('common.new')}</span>` : '';
        const langBadge = cluster.lang && cluster.lang !== (0, i18n_1.getCurrentLanguage)()
            ? `<span class="lang-badge">${cluster.lang.toUpperCase()}</span>`
            : '';
        // Propaganda risk indicator for primary source
        const primaryPropRisk = (0, feeds_1.getSourcePropagandaRisk)(cluster.primarySource);
        const primaryPropBadge = primaryPropRisk.risk !== 'low'
            ? `<span class="propaganda-badge ${primaryPropRisk.risk}" title="${(0, sanitize_1.escapeHtml)(primaryPropRisk.note || `State-affiliated: ${primaryPropRisk.stateAffiliated || 'Unknown'}`)}">${primaryPropRisk.risk === 'high' ? '⚠ State Media' : '! Caution'}</span>`
            : '';
        // Source credibility badge for primary source (T1=Wire, T2=Verified outlet)
        const primaryTier = (0, feeds_1.getSourceTier)(cluster.primarySource);
        const primaryType = (0, feeds_1.getSourceType)(cluster.primarySource);
        const tierLabel = primaryTier === 1 ? 'Wire' : ''; // Don't show "Major" - confusing with story importance
        const tierBadge = primaryTier <= 2
            ? `<span class="tier-badge tier-${primaryTier}" title="${primaryType === 'wire' ? 'Wire Service - Highest reliability' : primaryType === 'gov' ? 'Official Government Source' : 'Verified News Outlet'}">${primaryTier === 1 ? '★' : '●'}${tierLabel ? ` ${tierLabel}` : ''}</span>`
            : '';
        // Build "Also reported by" section for multi-source confirmation
        const otherSources = cluster.topSources.filter(s => s.name !== cluster.primarySource);
        const topSourcesHtml = otherSources.length > 0
            ? `<span class="also-reported">Also:</span>` + otherSources
                .map(s => {
                const propRisk = (0, feeds_1.getSourcePropagandaRisk)(s.name);
                const propBadge = propRisk.risk !== 'low'
                    ? `<span class="propaganda-badge ${propRisk.risk}" title="${(0, sanitize_1.escapeHtml)(propRisk.note || `State-affiliated: ${propRisk.stateAffiliated || 'Unknown'}`)}">${propRisk.risk === 'high' ? '⚠' : '!'}</span>`
                    : '';
                return `<span class="top-source tier-${s.tier}">${(0, sanitize_1.escapeHtml)(s.name)}${propBadge}</span>`;
            })
                .join('')
            : '';
        const assetContext = (0, services_1.getClusterAssetContext)(cluster);
        if (assetContext && assetContext.assets.length > 0) {
            this.relatedAssetContext.set(cluster.id, assetContext);
        }
        const relatedAssetsHtml = assetContext && assetContext.assets.length > 0
            ? `
        <div class="related-assets" data-cluster-id="${(0, sanitize_1.escapeHtml)(cluster.id)}">
          <div class="related-assets-header">
            ${(0, i18n_1.t)('components.newsPanel.relatedAssetsNear', { location: (0, sanitize_1.escapeHtml)(assetContext.origin.label) })}
            <span class="related-assets-range">(${services_1.MAX_DISTANCE_KM}km)</span>
          </div>
          <div class="related-assets-list">
            ${assetContext.assets.map(asset => `
              <button class="related-asset" data-cluster-id="${(0, sanitize_1.escapeHtml)(cluster.id)}" data-asset-id="${(0, sanitize_1.escapeHtml)(asset.id)}" data-asset-type="${(0, sanitize_1.escapeHtml)(asset.type)}">
                <span class="related-asset-type">${(0, sanitize_1.escapeHtml)(this.getLocalizedAssetLabel(asset.type))}</span>
                <span class="related-asset-name">${(0, sanitize_1.escapeHtml)(asset.name)}</span>
                <span class="related-asset-distance">${Math.round(asset.distanceKm)}km</span>
              </button>
            `).join('')}
          </div>
        </div>
      `
            : '';
        // Category tag from threat classification
        const cat = cluster.threat?.category;
        const catLabel = cat && cat !== 'general' ? cat.charAt(0).toUpperCase() + cat.slice(1) : '';
        const threatVarMap = { critical: '--threat-critical', high: '--threat-high', medium: '--threat-medium', low: '--threat-low', info: '--threat-info' };
        const catColor = cluster.threat ? (0, utils_1.getCSSColor)(threatVarMap[cluster.threat.level] || '--text-dim') : '';
        const categoryBadge = catLabel
            ? `<span class="category-tag" style="color:${catColor};border-color:${catColor}40;background:${catColor}20">${catLabel}</span>`
            : '';
        // Build class list for item
        const itemClasses = [
            'item',
            'clustered',
            cluster.isAlert ? 'alert' : '',
            shouldHighlight ? 'item-new-highlight' : '',
            isNew ? 'item-new' : '',
        ].filter(Boolean).join(' ');
        return `
      <div class="${itemClasses}" ${cluster.monitorColor ? `style="border-inline-start-color: ${(0, sanitize_1.escapeHtml)(cluster.monitorColor)}"` : ''} data-cluster-id="${(0, sanitize_1.escapeHtml)(cluster.id)}" data-news-id="${(0, sanitize_1.escapeHtml)(cluster.primaryLink)}">
        <div class="item-source">
          ${tierBadge}
          ${(0, sanitize_1.escapeHtml)(cluster.primarySource)}
          ${primaryPropBadge}
          ${langBadge}
          ${newTag}
          ${sourceBadge}
          ${velocityBadge}
          ${sentimentBadge}
          ${cluster.isAlert ? '<span class="alert-tag">ALERT</span>' : ''}
          ${categoryBadge}
        </div>
        <a class="item-title" href="${(0, sanitize_1.sanitizeUrl)(cluster.primaryLink)}" target="_blank" rel="noopener">${(0, sanitize_1.escapeHtml)(cluster.primaryTitle)}</a>
        <div class="cluster-meta">
          <span class="top-sources">${topSourcesHtml}</span>
          <span class="item-time">${(0, utils_1.formatTime)(cluster.lastUpdated)}</span>
          ${(0, i18n_1.getCurrentLanguage)() !== 'en' ? `<button class="item-translate-btn" title="Translate" data-text="${(0, sanitize_1.escapeHtml)(cluster.primaryTitle)}">文</button>` : ''}
        </div>
        ${relatedAssetsHtml}
      </div>
    `;
    }
    bindRelatedAssetEvents() {
        const containers = this.content.querySelectorAll('.related-assets');
        containers.forEach((container) => {
            const clusterId = container.dataset.clusterId;
            if (!clusterId)
                return;
            const context = this.relatedAssetContext.get(clusterId);
            if (!context)
                return;
            container.addEventListener('mouseenter', () => {
                this.onRelatedAssetsFocus?.(context.assets, context.origin.label);
            });
            container.addEventListener('mouseleave', () => {
                this.onRelatedAssetsClear?.();
            });
        });
        const assetButtons = this.content.querySelectorAll('.related-asset');
        assetButtons.forEach((button) => {
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                const clusterId = button.dataset.clusterId;
                const assetId = button.dataset.assetId;
                const assetType = button.dataset.assetType;
                if (!clusterId || !assetId || !assetType)
                    return;
                const context = this.relatedAssetContext.get(clusterId);
                const asset = context?.assets.find(item => item.id === assetId && item.type === assetType);
                if (asset) {
                    this.onRelatedAssetClick?.(asset);
                }
            });
        });
        // Translation buttons
        const translateBtns = this.content.querySelectorAll('.item-translate-btn');
        translateBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const text = btn.dataset.text;
                if (text)
                    this.handleTranslate(btn, text);
            });
        });
    }
    getLocalizedAssetLabel(type) {
        const keyMap = {
            pipeline: 'modals.countryBrief.infra.pipeline',
            cable: 'modals.countryBrief.infra.cable',
            datacenter: 'modals.countryBrief.infra.datacenter',
            base: 'modals.countryBrief.infra.base',
            nuclear: 'modals.countryBrief.infra.nuclear',
        };
        return (0, i18n_1.t)(keyMap[type]);
    }
    /**
     * Clean up resources
     */
    destroy() {
        // Clean up windowed list
        this.windowedList?.destroy();
        this.windowedList = null;
        // Remove activity tracking listeners
        if (this.boundScrollHandler) {
            this.content.removeEventListener('scroll', this.boundScrollHandler);
            this.boundScrollHandler = null;
        }
        if (this.boundClickHandler) {
            this.element.removeEventListener('click', this.boundClickHandler);
            this.boundClickHandler = null;
        }
        // Unregister from activity tracker
        services_1.activityTracker.unregister(this.panelId);
        // Call parent destroy
        super.destroy();
    }
}
exports.NewsPanel = NewsPanel;
