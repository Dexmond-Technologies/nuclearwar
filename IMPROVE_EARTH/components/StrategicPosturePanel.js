"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StrategicPosturePanel = void 0;
const Panel_1 = require("./Panel");
const sanitize_1 = require("@/utils/sanitize");
const cached_theater_posture_1 = require("@/services/cached-theater-posture");
const military_vessels_1 = require("@/services/military-vessels");
const military_surge_1 = require("@/services/military-surge");
const i18n_1 = require("../services/i18n");
class StrategicPosturePanel extends Panel_1.Panel {
    constructor() {
        super({
            id: 'strategic-posture',
            title: (0, i18n_1.t)('panels.strategicPosture'),
            showCount: false,
            trackActivity: true,
            infoTooltip: (0, i18n_1.t)('components.strategicPosture.infoTooltip'),
        });
        this.postures = [];
        this.vesselTimeouts = [];
        this.loadingElapsedInterval = null;
        this.loadingStartTime = 0;
        this.lastTimestamp = '';
        this.isStale = false;
        this.init();
    }
    init() {
        this.showLoading();
        void this.fetchAndRender();
        // Re-augment with vessels after stream has had time to populate
        // AIS data accumulates gradually - check at 30s, 60s, 90s, 120s
        this.vesselTimeouts.push(setTimeout(() => this.reaugmentVessels(), 30 * 1000));
        this.vesselTimeouts.push(setTimeout(() => this.reaugmentVessels(), 60 * 1000));
        this.vesselTimeouts.push(setTimeout(() => this.reaugmentVessels(), 90 * 1000));
        this.vesselTimeouts.push(setTimeout(() => this.reaugmentVessels(), 120 * 1000));
    }
    isPanelVisible() {
        return !this.element.classList.contains('hidden');
    }
    async reaugmentVessels() {
        if (!this.isPanelVisible() || this.postures.length === 0)
            return;
        console.log('[StrategicPosturePanel] Re-augmenting with vessels...');
        await this.augmentWithVessels();
        this.render();
    }
    showLoading() {
        this.loadingStartTime = Date.now();
        this.setContent(`
      <div class="posture-panel">
        <div class="posture-loading">
          <div class="posture-loading-radar">
            <div class="posture-radar-sweep"></div>
            <div class="posture-radar-dot"></div>
          </div>
          <div class="posture-loading-title">${(0, i18n_1.t)('components.strategicPosture.scanningTheaters')}</div>
          <div class="posture-loading-stages">
            <div class="posture-stage active">
              <span class="posture-stage-dot"></span>
              <span>${(0, i18n_1.t)('components.strategicPosture.positions')}</span>
            </div>
            <div class="posture-stage pending">
              <span class="posture-stage-dot"></span>
              <span>${(0, i18n_1.t)('components.strategicPosture.navalVesselsLoading')}</span>
            </div>
            <div class="posture-stage pending">
              <span class="posture-stage-dot"></span>
              <span>${(0, i18n_1.t)('components.strategicPosture.theaterAnalysis')}</span>
            </div>
          </div>
          <div class="posture-loading-tip">${(0, i18n_1.t)('components.strategicPosture.connectingStreams')}</div>
          <div class="posture-loading-elapsed">${(0, i18n_1.t)('components.strategicPosture.elapsed', { elapsed: '0' })}</div>
          <div class="posture-loading-note">${(0, i18n_1.t)('components.strategicPosture.initialLoadNote')}</div>
        </div>
      </div>
    `);
        this.startLoadingTimer();
    }
    startLoadingTimer() {
        if (this.loadingElapsedInterval)
            clearInterval(this.loadingElapsedInterval);
        this.loadingElapsedInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.loadingStartTime) / 1000);
            const elapsedEl = this.content.querySelector('.posture-loading-elapsed');
            if (elapsedEl) {
                elapsedEl.textContent = (0, i18n_1.t)('components.strategicPosture.elapsed', { elapsed: String(elapsed) });
            }
        }, 1000);
    }
    stopLoadingTimer() {
        if (this.loadingElapsedInterval) {
            clearInterval(this.loadingElapsedInterval);
            this.loadingElapsedInterval = null;
        }
    }
    showLoadingStage(stage) {
        const stages = this.content.querySelectorAll('.posture-stage');
        if (stages.length === 0)
            return;
        stages.forEach((el, i) => {
            el.classList.remove('active', 'complete');
            if (stage === 'aircraft' && i === 0)
                el.classList.add('active');
            else if (stage === 'vessels') {
                if (i === 0)
                    el.classList.add('complete');
                else if (i === 1)
                    el.classList.add('active');
            }
            else if (stage === 'analysis') {
                if (i <= 1)
                    el.classList.add('complete');
                else if (i === 2)
                    el.classList.add('active');
            }
        });
    }
    async fetchAndRender() {
        if (!this.isPanelVisible())
            return;
        try {
            // Fetch aircraft data from server
            this.showLoadingStage('aircraft');
            const data = await (0, cached_theater_posture_1.fetchCachedTheaterPosture)(this.signal);
            if (!data || data.postures.length === 0) {
                this.showNoData();
                return;
            }
            // Deep clone to avoid mutating cached data
            this.postures = data.postures.map((p) => ({
                ...p,
                byOperator: { ...p.byOperator },
            }));
            this.lastTimestamp = data.timestamp;
            this.isStale = data.stale || false;
            // Try to augment with vessel data (client-side)
            this.showLoadingStage('vessels');
            await this.augmentWithVessels();
            this.showLoadingStage('analysis');
            this.updateBadges();
            this.render();
            // If we rendered stale localStorage data, re-fetch fresh after a short delay
            if (this.isStale) {
                setTimeout(() => {
                    void this.fetchAndRender();
                }, 3000);
            }
        }
        catch (error) {
            if (this.isAbortError(error))
                return;
            console.error('[StrategicPosturePanel] Fetch error:', error);
            this.showFetchError();
        }
    }
    async augmentWithVessels() {
        try {
            const { vessels } = await (0, military_vessels_1.fetchMilitaryVessels)();
            console.log(`[StrategicPosturePanel] Got ${vessels.length} total military vessels`);
            if (vessels.length === 0) {
                // AIS stream hasn't accumulated data yet — restore from cache
                this.restoreVesselCounts();
                (0, military_surge_1.recalcPostureWithVessels)(this.postures);
                return;
            }
            // Merge vessel counts into each theater
            for (const posture of this.postures) {
                if (!posture.bounds)
                    continue;
                // Filter vessels within theater bounds
                const theaterVessels = vessels.filter((v) => v.lat >= posture.bounds.south &&
                    v.lat <= posture.bounds.north &&
                    v.lon >= posture.bounds.west &&
                    v.lon <= posture.bounds.east);
                // Count by type
                posture.destroyers = theaterVessels.filter((v) => v.vesselType === 'destroyer').length;
                posture.frigates = theaterVessels.filter((v) => v.vesselType === 'frigate').length;
                posture.carriers = theaterVessels.filter((v) => v.vesselType === 'carrier').length;
                posture.submarines = theaterVessels.filter((v) => v.vesselType === 'submarine').length;
                posture.patrol = theaterVessels.filter((v) => v.vesselType === 'patrol').length;
                posture.auxiliaryVessels = theaterVessels.filter((v) => v.vesselType === 'auxiliary' || v.vesselType === 'special' || v.vesselType === 'amphibious' || v.vesselType === 'icebreaker' || v.vesselType === 'research' || v.vesselType === 'unknown').length;
                posture.totalVessels = theaterVessels.length;
                if (theaterVessels.length > 0) {
                    console.log(`[StrategicPosturePanel] ${posture.shortName}: ${theaterVessels.length} vessels`, theaterVessels.map(v => v.vesselType));
                }
                // Add vessel operators to byOperator
                for (const v of theaterVessels) {
                    const op = v.operator || 'unknown';
                    posture.byOperator[op] = (posture.byOperator[op] || 0) + 1;
                }
            }
            // Cache vessel counts per theater in localStorage for instant restore on refresh
            this.cacheVesselCounts();
            // Recalculate posture levels now that vessels are included
            (0, military_surge_1.recalcPostureWithVessels)(this.postures);
            console.log('[StrategicPosturePanel] Augmented with', vessels.length, 'vessels, posture levels recalculated');
        }
        catch (error) {
            console.warn('[StrategicPosturePanel] Failed to fetch vessels:', error);
            // Restore cached vessel counts if live fetch failed
            this.restoreVesselCounts();
            (0, military_surge_1.recalcPostureWithVessels)(this.postures);
        }
    }
    cacheVesselCounts() {
        try {
            const counts = {};
            for (const p of this.postures) {
                if (p.totalVessels > 0) {
                    counts[p.theaterId] = {
                        destroyers: p.destroyers || 0,
                        frigates: p.frigates || 0,
                        carriers: p.carriers || 0,
                        submarines: p.submarines || 0,
                        patrol: p.patrol || 0,
                        auxiliaryVessels: p.auxiliaryVessels || 0,
                        totalVessels: p.totalVessels || 0,
                    };
                }
            }
            localStorage.setItem('wm:vesselPosture', JSON.stringify({ counts, ts: Date.now() }));
        }
        catch { /* quota exceeded or private mode */ }
    }
    restoreVesselCounts() {
        try {
            const raw = localStorage.getItem('wm:vesselPosture');
            if (!raw)
                return;
            const { counts, ts } = JSON.parse(raw);
            // Only use cache if < 30 minutes old
            if (Date.now() - ts > 30 * 60 * 1000)
                return;
            for (const p of this.postures) {
                const cached = counts[p.theaterId];
                if (cached) {
                    p.destroyers = cached.destroyers;
                    p.frigates = cached.frigates;
                    p.carriers = cached.carriers;
                    p.submarines = cached.submarines;
                    p.patrol = cached.patrol;
                    p.auxiliaryVessels = cached.auxiliaryVessels;
                    p.totalVessels = cached.totalVessels;
                }
            }
            console.log('[StrategicPosturePanel] Restored cached vessel counts');
        }
        catch { /* parse error */ }
    }
    updatePostures(data) {
        if (!data || data.postures.length === 0) {
            this.showNoData();
            return;
        }
        // Deep clone to avoid mutating cached data
        this.postures = data.postures.map((p) => ({
            ...p,
            byOperator: { ...p.byOperator },
        }));
        this.lastTimestamp = data.timestamp;
        this.isStale = data.stale || false;
        this.augmentWithVessels().then(() => {
            this.updateBadges();
            this.render();
        });
    }
    updateBadges() {
        const hasCritical = this.postures.some((p) => p.postureLevel === 'critical');
        const hasElevated = this.postures.some((p) => p.postureLevel === 'elevated');
        if (hasCritical) {
            this.setNewBadge(1, true);
        }
        else if (hasElevated) {
            this.setNewBadge(1, false);
        }
        else {
            this.clearNewBadge();
        }
    }
    async refresh() {
        return this.fetchAndRender();
    }
    showNoData() {
        this.stopLoadingTimer();
        this.setContent(`
      <div class="posture-panel">
        <div class="posture-no-data">
          <div class="posture-no-data-icon pulse">📡</div>
          <div class="posture-no-data-title">${(0, i18n_1.t)('components.strategicPosture.acquiringData')}</div>
          <div class="posture-no-data-desc">
            ${(0, i18n_1.t)('components.strategicPosture.acquiringDesc')}
          </div>
          <div class="posture-data-sources">
            <div class="posture-source">
              <span class="posture-source-icon connecting">✈️</span>
              <span>${(0, i18n_1.t)('components.strategicPosture.openSkyAdsb')}</span>
            </div>
            <div class="posture-source">
              <span class="posture-source-icon waiting">🚢</span>
              <span>${(0, i18n_1.t)('components.strategicPosture.aisVesselStream')}</span>
            </div>
          </div>
          <button class="posture-retry-btn">↻ ${(0, i18n_1.t)('components.strategicPosture.retryNow')}</button>
        </div>
      </div>
    `);
        this.content.querySelector('.posture-retry-btn')?.addEventListener('click', () => this.refresh());
    }
    showFetchError() {
        this.stopLoadingTimer();
        this.setContent(`
      <div class="posture-panel">
        <div class="posture-no-data">
          <div class="posture-no-data-icon">⚠️</div>
          <div class="posture-no-data-title">${(0, i18n_1.t)('components.strategicPosture.feedRateLimited')}</div>
          <div class="posture-no-data-desc">
            ${(0, i18n_1.t)('components.strategicPosture.rateLimitedDesc')}
          </div>
          <div class="posture-error-hint">
            <strong>${(0, i18n_1.t)('components.strategicPosture.rateLimitedTip')}</strong>
          </div>
          <button class="posture-retry-btn">↻ ${(0, i18n_1.t)('components.strategicPosture.tryAgain')}</button>
        </div>
      </div>
    `);
        this.content.querySelector('.posture-retry-btn')?.addEventListener('click', () => this.refresh());
    }
    getPostureBadge(level) {
        switch (level) {
            case 'critical':
                return `<span class="posture-badge posture-critical">${(0, i18n_1.t)('components.strategicPosture.badges.critical')}</span>`;
            case 'elevated':
                return `<span class="posture-badge posture-elevated">${(0, i18n_1.t)('components.strategicPosture.badges.elevated')}</span>`;
            default:
                return `<span class="posture-badge posture-normal">${(0, i18n_1.t)('components.strategicPosture.badges.normal')}</span>`;
        }
    }
    getTrendIcon(trend, change) {
        switch (trend) {
            case 'increasing':
                return `<span class="posture-trend trend-up">↗ +${change}%</span>`;
            case 'decreasing':
                return `<span class="posture-trend trend-down">↘ ${change}%</span>`;
            default:
                return `<span class="posture-trend trend-stable">→ ${(0, i18n_1.t)('components.strategicPosture.trendStable')}</span>`;
        }
    }
    theaterDisplayName(p) {
        const key = `components.strategicPosture.theaters.${p.theaterId}`;
        const translated = (0, i18n_1.t)(key);
        return translated !== key ? translated : p.theaterName;
    }
    renderTheater(p) {
        const isExpanded = p.postureLevel !== 'normal';
        const displayName = this.theaterDisplayName(p);
        if (!isExpanded) {
            // Compact single-line view for normal theaters
            const chips = [];
            if (p.totalAircraft > 0)
                chips.push(`<span class="posture-chip air">✈️ ${p.totalAircraft}</span>`);
            if (p.totalVessels > 0)
                chips.push(`<span class="posture-chip naval">⚓ ${p.totalVessels}</span>`);
            return `
        <div class="posture-theater posture-compact" data-lat="${p.centerLat}" data-lon="${p.centerLon}" title="${(0, i18n_1.t)('components.strategicPosture.clickToView', { name: (0, sanitize_1.escapeHtml)(displayName) })}">
          <span class="posture-name">${(0, sanitize_1.escapeHtml)(p.shortName)}</span>
          <div class="posture-chips">${chips.join('')}</div>
          ${this.getPostureBadge(p.postureLevel)}
        </div>
      `;
        }
        // Build compact stat chips for expanded view
        const airChips = [];
        if (p.fighters > 0)
            airChips.push(`<span class="posture-stat" title="${(0, i18n_1.t)('components.strategicPosture.units.fighters')}">✈️ ${p.fighters}</span>`);
        if (p.tankers > 0)
            airChips.push(`<span class="posture-stat" title="${(0, i18n_1.t)('components.strategicPosture.units.tankers')}">⛽ ${p.tankers}</span>`);
        if (p.awacs > 0)
            airChips.push(`<span class="posture-stat" title="${(0, i18n_1.t)('components.strategicPosture.units.awacs')}">📡 ${p.awacs}</span>`);
        if (p.reconnaissance > 0)
            airChips.push(`<span class="posture-stat" title="${(0, i18n_1.t)('components.strategicPosture.units.recon')}">🔍 ${p.reconnaissance}</span>`);
        if (p.transport > 0)
            airChips.push(`<span class="posture-stat" title="${(0, i18n_1.t)('components.strategicPosture.units.transport')}">📦 ${p.transport}</span>`);
        if (p.bombers > 0)
            airChips.push(`<span class="posture-stat" title="${(0, i18n_1.t)('components.strategicPosture.units.bombers')}">💣 ${p.bombers}</span>`);
        if (p.drones > 0)
            airChips.push(`<span class="posture-stat" title="${(0, i18n_1.t)('components.strategicPosture.units.drones')}">🛸 ${p.drones}</span>`);
        // Fallback: show total aircraft if no typed breakdown available
        if (airChips.length === 0 && p.totalAircraft > 0) {
            airChips.push(`<span class="posture-stat" title="${(0, i18n_1.t)('components.strategicPosture.units.aircraft')}">✈️ ${p.totalAircraft}</span>`);
        }
        const navalChips = [];
        if (p.carriers > 0)
            navalChips.push(`<span class="posture-stat carrier" title="${(0, i18n_1.t)('components.strategicPosture.units.carriers')}">🚢 ${p.carriers}</span>`);
        if (p.destroyers > 0)
            navalChips.push(`<span class="posture-stat" title="${(0, i18n_1.t)('components.strategicPosture.units.destroyers')}">⚓ ${p.destroyers}</span>`);
        if (p.frigates > 0)
            navalChips.push(`<span class="posture-stat" title="${(0, i18n_1.t)('components.strategicPosture.units.frigates')}">🛥️ ${p.frigates}</span>`);
        if (p.submarines > 0)
            navalChips.push(`<span class="posture-stat" title="${(0, i18n_1.t)('components.strategicPosture.units.submarines')}">🦈 ${p.submarines}</span>`);
        if (p.patrol > 0)
            navalChips.push(`<span class="posture-stat" title="${(0, i18n_1.t)('components.strategicPosture.units.patrol')}">🚤 ${p.patrol}</span>`);
        if (p.auxiliaryVessels > 0)
            navalChips.push(`<span class="posture-stat" title="${(0, i18n_1.t)('components.strategicPosture.units.auxiliary')}">⚓ ${p.auxiliaryVessels}</span>`);
        // Fallback: show total vessels if no typed breakdown available
        if (navalChips.length === 0 && p.totalVessels > 0) {
            navalChips.push(`<span class="posture-stat" title="${(0, i18n_1.t)('components.strategicPosture.units.navalVessels')}">⚓ ${p.totalVessels}</span>`);
        }
        const hasAir = airChips.length > 0;
        const hasNaval = navalChips.length > 0;
        return `
      <div class="posture-theater posture-expanded ${p.postureLevel}" data-lat="${p.centerLat}" data-lon="${p.centerLon}" title="${(0, i18n_1.t)('components.strategicPosture.clickToViewMap')}">
        <div class="posture-theater-header">
          <span class="posture-name">${(0, sanitize_1.escapeHtml)(displayName)}</span>
          ${this.getPostureBadge(p.postureLevel)}
        </div>

        <div class="posture-forces">
          ${hasAir ? `<div class="posture-force-row"><span class="posture-domain">${(0, i18n_1.t)('components.strategicPosture.domains.air')}</span><div class="posture-stats">${airChips.join('')}</div></div>` : ''}
          ${hasNaval ? `<div class="posture-force-row"><span class="posture-domain">${(0, i18n_1.t)('components.strategicPosture.domains.sea')}</span><div class="posture-stats">${navalChips.join('')}</div></div>` : ''}
        </div>

        <div class="posture-footer">
          ${p.strikeCapable ? `<span class="posture-strike">⚡ ${(0, i18n_1.t)('components.strategicPosture.strike')}</span>` : ''}
          ${this.getTrendIcon(p.trend, p.changePercent)}
          ${p.targetNation ? `<span class="posture-focus">→ ${(0, sanitize_1.escapeHtml)(p.targetNation)}</span>` : ''}
        </div>
      </div>
    `;
    }
    render() {
        this.stopLoadingTimer();
        const sorted = [...this.postures].sort((a, b) => {
            const order = { critical: 0, elevated: 1, normal: 2 };
            return (order[a.postureLevel] ?? 2) - (order[b.postureLevel] ?? 2);
        });
        const updatedTime = this.lastTimestamp
            ? new Date(this.lastTimestamp).toLocaleTimeString()
            : new Date().toLocaleTimeString();
        const staleWarning = this.isStale
            ? `<div class="posture-stale-warning">⚠️ ${(0, i18n_1.t)('components.strategicPosture.staleWarning')}</div>`
            : '';
        const html = `
      <div class="posture-panel">
        ${staleWarning}
        ${sorted.map((p) => this.renderTheater(p)).join('')}

        <div class="posture-footer">
          <span class="posture-updated">${this.isStale ? '⚠️ ' : ''}${(0, i18n_1.t)('components.strategicPosture.updated')} ${updatedTime}</span>
          <button class="posture-refresh-btn" title="${(0, i18n_1.t)('components.strategicPosture.refresh')}">↻</button>
        </div>
      </div>
    `;
        this.setContent(html);
        this.attachEventListeners();
    }
    attachEventListeners() {
        this.content.querySelector('.posture-refresh-btn')?.addEventListener('click', () => {
            this.refresh();
        });
        const theaters = this.content.querySelectorAll('.posture-theater');
        theaters.forEach((el) => {
            el.addEventListener('click', () => {
                const lat = parseFloat(el.dataset.lat || '0');
                const lon = parseFloat(el.dataset.lon || '0');
                console.log('[StrategicPosturePanel] Theater clicked:', {
                    lat,
                    lon,
                    dataLat: el.dataset.lat,
                    dataLon: el.dataset.lon,
                    element: el.textContent?.slice(0, 30),
                    hasHandler: !!this.onLocationClick,
                });
                if (this.onLocationClick && !isNaN(lat) && !isNaN(lon)) {
                    console.log('[StrategicPosturePanel] Calling onLocationClick with:', lat, lon);
                    this.onLocationClick(lat, lon);
                }
                else {
                    console.warn('[StrategicPosturePanel] No handler or invalid coords!', {
                        hasHandler: !!this.onLocationClick,
                        lat,
                        lon,
                    });
                }
            });
        });
    }
    setLocationClickHandler(handler) {
        console.log('[StrategicPosturePanel] setLocationClickHandler called, handler:', typeof handler);
        this.onLocationClick = handler;
        // Verify it's stored
        console.log('[StrategicPosturePanel] Handler stored, onLocationClick now:', typeof this.onLocationClick);
    }
    getPostures() {
        return this.postures;
    }
    show() {
        const wasHidden = this.element.classList.contains('hidden');
        super.show();
        if (wasHidden) {
            void this.fetchAndRender();
        }
    }
    destroy() {
        this.stopLoadingTimer();
        this.vesselTimeouts.forEach(t => clearTimeout(t));
        this.vesselTimeouts = [];
        super.destroy();
    }
}
exports.StrategicPosturePanel = StrategicPosturePanel;
