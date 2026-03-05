"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CountryBriefPage = void 0;
const sanitize_1 = require("@/utils/sanitize");
const i18n_1 = require("@/services/i18n");
const utils_1 = require("@/utils");
const related_assets_1 = require("@/services/related-assets");
const ports_1 = require("@/config/ports");
const export_1 = require("@/utils/export");
const country_geometry_1 = require("@/services/country-geometry");
class CountryBriefPage {
    constructor() {
        this.currentCode = null;
        this.currentName = null;
        this.currentHeadlineCount = 0;
        this.currentScore = null;
        this.currentSignals = null;
        this.currentBrief = null;
        this.currentHeadlines = [];
        this.boundExportMenuClose = null;
        this.boundCitationClick = null;
        this.abortController = new AbortController();
        this.overlay = document.createElement('div');
        this.overlay.className = 'country-brief-overlay';
        document.body.appendChild(this.overlay);
        this.overlay.addEventListener('click', (e) => {
            if (e.target.classList.contains('country-brief-overlay'))
                this.hide();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.overlay.classList.contains('active'))
                this.hide();
        });
    }
    countryFlag(code) {
        try {
            return code
                .toUpperCase()
                .split('')
                .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
                .join('');
        }
        catch {
            return '🌍';
        }
    }
    levelColor(level) {
        const varMap = {
            critical: '--semantic-critical',
            high: '--semantic-high',
            elevated: '--semantic-elevated',
            normal: '--semantic-normal',
            low: '--semantic-low',
        };
        return (0, utils_1.getCSSColor)(varMap[level] || '--text-dim');
    }
    levelBadge(level) {
        const color = this.levelColor(level);
        const levelKey = level;
        const label = (0, i18n_1.t)(`countryBrief.levels.${levelKey}`);
        return `<span class="cb-badge" style="background:${color}20;color:${color};border:1px solid ${color}40">${label.toUpperCase()}</span>`;
    }
    trendIndicator(trend) {
        const arrow = trend === 'rising' ? '↗' : trend === 'falling' ? '↘' : '→';
        const cls = trend === 'rising' ? 'trend-up' : trend === 'falling' ? 'trend-down' : 'trend-stable';
        const trendKey = trend;
        const trendLabel = (0, i18n_1.t)(`countryBrief.trends.${trendKey}`);
        return `<span class="cb-trend ${cls}">${arrow} ${trendLabel}</span>`;
    }
    scoreRing(score, level) {
        const color = this.levelColor(level);
        const pct = Math.min(100, Math.max(0, score));
        const circumference = 2 * Math.PI * 42;
        const dashOffset = circumference * (1 - pct / 100);
        return `
      <div class="cb-score-ring">
        <svg viewBox="0 0 100 100" width="120" height="120">
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="6"/>
          <circle cx="50" cy="50" r="42" fill="none" stroke="${color}" stroke-width="6"
            stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}"
            stroke-linecap="round" transform="rotate(-90 50 50)"
            style="transition: stroke-dashoffset 0.8s ease"/>
        </svg>
        <div class="cb-score-value" style="color:${color}">${score}</div>
        <div class="cb-score-label">/ 100</div>
      </div>`;
    }
    componentBars(components) {
        const items = [
            { label: (0, i18n_1.t)('modals.countryBrief.components.unrest'), value: components.unrest, icon: '📢' },
            { label: (0, i18n_1.t)('modals.countryBrief.components.conflict'), value: components.conflict, icon: '⚔' },
            { label: (0, i18n_1.t)('modals.countryBrief.components.security'), value: components.security, icon: '🛡️' },
            { label: (0, i18n_1.t)('modals.countryBrief.components.information'), value: components.information, icon: '📡' },
        ];
        return items.map(({ label, value, icon }) => {
            const pct = Math.min(100, Math.max(0, value));
            const color = pct >= 70 ? (0, utils_1.getCSSColor)('--semantic-critical') : pct >= 50 ? (0, utils_1.getCSSColor)('--semantic-high') : pct >= 30 ? (0, utils_1.getCSSColor)('--semantic-elevated') : (0, utils_1.getCSSColor)('--semantic-normal');
            return `
        <div class="cb-comp-row">
          <span class="cb-comp-icon">${icon}</span>
          <span class="cb-comp-label">${label}</span>
          <div class="cb-comp-bar"><div class="cb-comp-fill" style="width:${pct}%;background:${color}"></div></div>
          <span class="cb-comp-val">${Math.round(value)}</span>
        </div>`;
        }).join('');
    }
    signalChips(signals) {
        const chips = [];
        if (signals.protests > 0)
            chips.push(`<span class="signal-chip protest">📢 ${signals.protests} ${(0, i18n_1.t)('modals.countryBrief.signals.protests')}</span>`);
        if (signals.militaryFlights > 0)
            chips.push(`<span class="signal-chip military">✈️ ${signals.militaryFlights} ${(0, i18n_1.t)('modals.countryBrief.signals.militaryAir')}</span>`);
        if (signals.militaryVessels > 0)
            chips.push(`<span class="signal-chip military">⚓ ${signals.militaryVessels} ${(0, i18n_1.t)('modals.countryBrief.signals.militarySea')}</span>`);
        if (signals.outages > 0)
            chips.push(`<span class="signal-chip outage">🌐 ${signals.outages} ${(0, i18n_1.t)('modals.countryBrief.signals.outages')}</span>`);
        if (signals.earthquakes > 0)
            chips.push(`<span class="signal-chip quake">🌍 ${signals.earthquakes} ${(0, i18n_1.t)('modals.countryBrief.signals.earthquakes')}</span>`);
        if (signals.displacementOutflow > 0) {
            const fmt = signals.displacementOutflow >= 1000000
                ? `${(signals.displacementOutflow / 1000000).toFixed(1)}M`
                : `${(signals.displacementOutflow / 1000).toFixed(0)}K`;
            chips.push(`<span class="signal-chip displacement">🌊 ${fmt} ${(0, i18n_1.t)('modals.countryBrief.signals.displaced')}</span>`);
        }
        if (signals.climateStress > 0)
            chips.push(`<span class="signal-chip climate">🌡️ ${(0, i18n_1.t)('modals.countryBrief.signals.climate')}</span>`);
        if (signals.conflictEvents > 0)
            chips.push(`<span class="signal-chip conflict">⚔️ ${signals.conflictEvents} ${(0, i18n_1.t)('modals.countryBrief.signals.conflictEvents')}</span>`);
        if (signals.activeStrikes > 0)
            chips.push(`<span class="signal-chip conflict">\u{1F4A5} ${signals.activeStrikes} ${(0, i18n_1.t)('modals.countryBrief.signals.activeStrikes')}</span>`);
        if (signals.orefSirens > 0)
            chips.push(`<span class="signal-chip conflict">\u{1F6A8} ${signals.orefSirens} Active Sirens</span>`);
        if (signals.aviationDisruptions > 0)
            chips.push(`<span class="signal-chip outage">\u{1F6AB} ${signals.aviationDisruptions} ${(0, i18n_1.t)('modals.countryBrief.signals.aviationDisruptions')}</span>`);
        chips.push(`<span class="signal-chip stock-loading">📈 ${(0, i18n_1.t)('modals.countryBrief.loadingIndex')}</span>`);
        return chips.join('');
    }
    setShareStoryHandler(handler) {
        this.onShareStory = handler;
    }
    setExportImageHandler(handler) {
        this.onExportImage = handler;
    }
    showLoading() {
        this.currentCode = '__loading__';
        this.overlay.innerHTML = `
      <div class="country-brief-page">
        <div class="cb-header">
          <div class="cb-header-left">
            <span class="cb-flag">🌍</span>
            <span class="cb-country-name">${(0, i18n_1.t)('modals.countryBrief.identifying')}</span>
          </div>
          <div class="cb-header-right">
            <button class="cb-close" aria-label="${(0, i18n_1.t)('components.newsPanel.close')}">×</button>
          </div>
        </div>
        <div class="cb-body">
          <div class="cb-loading-state">
            <div class="intel-skeleton"></div>
            <div class="intel-skeleton short"></div>
            <span class="intel-loading-text">${(0, i18n_1.t)('modals.countryBrief.locating')}</span>
          </div>
        </div>
      </div>`;
        this.overlay.querySelector('.cb-close')?.addEventListener('click', () => this.hide());
        this.overlay.classList.add('active');
    }
    get signal() {
        return this.abortController.signal;
    }
    show(country, code, score, signals) {
        this.abortController.abort();
        this.abortController = new AbortController();
        this.currentCode = code;
        this.currentName = country;
        this.currentScore = score;
        this.currentSignals = signals;
        this.currentBrief = null;
        this.currentHeadlines = [];
        this.currentHeadlineCount = 0;
        const flag = this.countryFlag(code);
        const tierBadge = !signals.isTier1
            ? `<span class="cb-tier-badge">${(0, i18n_1.t)('modals.countryBrief.limitedCoverage')}</span>`
            : '';
        this.overlay.innerHTML = `
      <div class="country-brief-page">
        <div class="cb-header">
          <div class="cb-header-left">
            <span class="cb-flag">${flag}</span>
            <span class="cb-country-name">${(0, sanitize_1.escapeHtml)(country)}</span>
            ${score ? this.levelBadge(score.level) : ''}
            ${score ? this.trendIndicator(score.trend) : ''}
            ${tierBadge}
          </div>
          <div class="cb-header-right">
            <button class="cb-share-btn" title="${(0, i18n_1.t)('components.countryBrief.shareStory')}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            </button>
            <button class="cb-print-btn" title="${(0, i18n_1.t)('components.countryBrief.printPdf')}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            </button>
            <div style="position:relative;display:inline-block">
              <button class="cb-export-btn" title="${(0, i18n_1.t)('components.countryBrief.exportData')}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </button>
              <div class="cb-export-menu hidden">
                <button class="cb-export-option" data-format="image">${(0, i18n_1.t)('common.exportImage')}</button>
                <button class="cb-export-option" data-format="pdf">${(0, i18n_1.t)('common.exportPdf')}</button>
                <button class="cb-export-option" data-format="json">${(0, i18n_1.t)('common.exportJson')}</button>
                <button class="cb-export-option" data-format="csv">${(0, i18n_1.t)('common.exportCsv')}</button>
              </div>
            </div>
            <button class="cb-close" aria-label="${(0, i18n_1.t)('components.newsPanel.close')}">×</button>
          </div>
        </div>
        <div class="cb-body">
          <div class="cb-grid">
            <div class="cb-col-left">
              ${score ? `
                <section class="cb-section cb-risk-section">
                  <h3 class="cb-section-title">${(0, i18n_1.t)('modals.countryBrief.instabilityIndex')}</h3>
                  <div class="cb-risk-content">
                    ${this.scoreRing(score.score, score.level)}
                    <div class="cb-components">
                      ${this.componentBars(score.components)}
                    </div>
                  </div>
                </section>` : signals.isTier1 ? '' : `
                <section class="cb-section cb-risk-section">
                  <h3 class="cb-section-title">${(0, i18n_1.t)('modals.countryBrief.instabilityIndex')}</h3>
                  <div class="cb-not-tracked">
                    <span class="cb-not-tracked-icon">📊</span>
                    <span>${(0, i18n_1.t)('modals.countryBrief.notTracked', { country: (0, sanitize_1.escapeHtml)(country) })}</span>
                  </div>
                </section>`}

              <section class="cb-section cb-brief-section">
                <h3 class="cb-section-title">${(0, i18n_1.t)('modals.countryBrief.intelBrief')}</h3>
                <div class="cb-brief-content">
                  <div class="intel-brief-loading">
                    <div class="intel-skeleton"></div>
                    <div class="intel-skeleton short"></div>
                    <div class="intel-skeleton"></div>
                    <div class="intel-skeleton short"></div>
                    <span class="intel-loading-text">${(0, i18n_1.t)('modals.countryBrief.generatingBrief')}</span>
                  </div>
                </div>
              </section>

              <section class="cb-section cb-news-section" style="display:none">
                <h3 class="cb-section-title">${(0, i18n_1.t)('modals.countryBrief.topNews')}</h3>
                <div class="cb-news-content"></div>
              </section>
            </div>

            <div class="cb-col-right">
              <section class="cb-section cb-signals-section">
                <h3 class="cb-section-title">${(0, i18n_1.t)('modals.countryBrief.activeSignals')}</h3>
                <div class="cb-signals-grid">
                  ${this.signalChips(signals)}
                </div>
              </section>

              <section class="cb-section cb-timeline-section">
                <h3 class="cb-section-title">${(0, i18n_1.t)('modals.countryBrief.timeline')}</h3>
                <div class="cb-timeline-mount"></div>
              </section>

              <section class="cb-section cb-markets-section">
                <h3 class="cb-section-title">${(0, i18n_1.t)('modals.countryBrief.predictionMarkets')}</h3>
                <div class="cb-markets-content">
                  <span class="intel-loading-text">${(0, i18n_1.t)('modals.countryBrief.loadingMarkets')}</span>
                </div>
              </section>

              <section class="cb-section cb-infra-section" style="display:none">
                <h3 class="cb-section-title">${(0, i18n_1.t)('modals.countryBrief.infrastructure')}</h3>
                <div class="cb-infra-content"></div>
              </section>

            </div>
          </div>
        </div>
      </div>`;
        this.overlay.querySelector('.cb-close')?.addEventListener('click', () => this.hide());
        this.overlay.querySelector('.cb-share-btn')?.addEventListener('click', () => {
            if (this.onShareStory && this.currentCode && this.currentName) {
                this.onShareStory(this.currentCode, this.currentName);
            }
        });
        this.overlay.querySelector('.cb-print-btn')?.addEventListener('click', () => {
            window.print();
        });
        const exportBtn = this.overlay.querySelector('.cb-export-btn');
        const exportMenu = this.overlay.querySelector('.cb-export-menu');
        exportBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            exportMenu?.classList.toggle('hidden');
        });
        this.overlay.querySelectorAll('.cb-export-option').forEach(opt => {
            opt.addEventListener('click', () => {
                const format = opt.dataset.format;
                if (format === 'image') {
                    if (this.onExportImage && this.currentCode && this.currentName) {
                        this.onExportImage(this.currentCode, this.currentName);
                    }
                }
                else if (format === 'pdf') {
                    this.exportPdf();
                }
                else {
                    this.exportBrief(format);
                }
                exportMenu?.classList.add('hidden');
            });
        });
        // Remove previous overlay-level listeners to prevent accumulation
        if (this.boundExportMenuClose)
            this.overlay.removeEventListener('click', this.boundExportMenuClose);
        if (this.boundCitationClick)
            this.overlay.removeEventListener('click', this.boundCitationClick);
        this.boundExportMenuClose = () => exportMenu?.classList.add('hidden');
        this.overlay.addEventListener('click', this.boundExportMenuClose);
        this.boundCitationClick = (e) => {
            const target = e.target;
            if (target.classList.contains('cb-citation')) {
                e.preventDefault();
                const href = target.getAttribute('href');
                if (href) {
                    const el = this.overlay.querySelector(href);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el?.classList.add('cb-news-highlight');
                    setTimeout(() => el?.classList.remove('cb-news-highlight'), 2000);
                }
            }
        };
        this.overlay.addEventListener('click', this.boundCitationClick);
        this.overlay.classList.add('active');
    }
    updateBrief(data) {
        if (data.code !== this.currentCode)
            return;
        const section = this.overlay.querySelector('.cb-brief-content');
        if (!section)
            return;
        if (data.error || data.skipped || !data.brief) {
            const msg = data.error || data.reason || (0, i18n_1.t)('modals.countryBrief.briefUnavailable');
            section.innerHTML = `<div class="intel-error">${(0, sanitize_1.escapeHtml)(msg)}</div>`;
            return;
        }
        this.currentBrief = data.brief;
        const formatted = this.formatBrief(data.brief, this.currentHeadlineCount);
        section.innerHTML = `
      <div class="cb-brief-text">${formatted}</div>
      <div class="cb-brief-footer">
        ${data.cached ? `<span class="intel-cached">📋 ${(0, i18n_1.t)('modals.countryBrief.cached')}</span>` : `<span class="intel-fresh">✨ ${(0, i18n_1.t)('modals.countryBrief.fresh')}</span>`}
        <span class="intel-timestamp">${data.generatedAt ? new Date(data.generatedAt).toLocaleTimeString() : ''}</span>
      </div>`;
    }
    updateMarkets(markets) {
        const section = this.overlay.querySelector('.cb-markets-content');
        if (!section)
            return;
        if (markets.length === 0) {
            section.innerHTML = `<span class="cb-empty">${(0, i18n_1.t)('modals.countryBrief.noMarkets')}</span>`;
            return;
        }
        section.innerHTML = markets.slice(0, 3).map(m => {
            const pct = Math.round(m.yesPrice);
            const noPct = 100 - pct;
            const vol = m.volume ? `$${(m.volume / 1000).toFixed(0)}k vol` : '';
            const safeUrl = (0, sanitize_1.sanitizeUrl)(m.url || '');
            const link = safeUrl ? ` <a href="${safeUrl}" target="_blank" rel="noopener" class="cb-market-link">↗</a>` : '';
            return `
        <div class="cb-market-item">
          <div class="cb-market-title">${(0, sanitize_1.escapeHtml)(m.title.slice(0, 100))}${link}</div>
          <div class="market-bar">
            <div class="market-yes" style="width:${pct}%">${pct}%</div>
            <div class="market-no" style="width:${noPct}%">${noPct > 15 ? noPct + '%' : ''}</div>
          </div>
          ${vol ? `<div class="market-vol">${vol}</div>` : ''}
        </div>`;
        }).join('');
    }
    updateStock(data) {
        const el = this.overlay.querySelector('.stock-loading');
        if (!el)
            return;
        if (!data.available) {
            el.remove();
            return;
        }
        const pct = parseFloat(data.weekChangePercent);
        const sign = pct >= 0 ? '+' : '';
        const cls = pct >= 0 ? 'stock-up' : 'stock-down';
        const arrow = pct >= 0 ? '📈' : '📉';
        el.className = `signal-chip stock ${cls}`;
        el.innerHTML = `${arrow} ${(0, sanitize_1.escapeHtml)(data.indexName)}: ${sign}${data.weekChangePercent}% (1W)`;
    }
    updateNews(headlines) {
        const section = this.overlay.querySelector('.cb-news-section');
        const content = this.overlay.querySelector('.cb-news-content');
        if (!section || !content || headlines.length === 0)
            return;
        const items = headlines.slice(0, 8);
        this.currentHeadlineCount = items.length;
        this.currentHeadlines = items;
        section.style.display = '';
        content.innerHTML = items.map((item, i) => {
            const safeUrl = (0, sanitize_1.sanitizeUrl)(item.link);
            const threatColor = item.threat?.level === 'critical' ? (0, utils_1.getCSSColor)('--threat-critical')
                : item.threat?.level === 'high' ? (0, utils_1.getCSSColor)('--threat-high')
                    : item.threat?.level === 'medium' ? (0, utils_1.getCSSColor)('--threat-medium')
                        : (0, utils_1.getCSSColor)('--threat-info');
            const timeAgo = this.timeAgo(item.pubDate);
            const cardBody = `
        <span class="cb-news-threat" style="background:${threatColor}"></span>
        <div class="cb-news-body">
          <div class="cb-news-title">${(0, sanitize_1.escapeHtml)(item.title)}</div>
          <div class="cb-news-meta">${(0, sanitize_1.escapeHtml)(item.source)} · ${timeAgo}</div>
        </div>`;
            if (safeUrl) {
                return `<a href="${safeUrl}" target="_blank" rel="noopener" class="cb-news-card" id="cb-news-${i + 1}">${cardBody}</a>`;
            }
            return `<div class="cb-news-card" id="cb-news-${i + 1}">${cardBody}</div>`;
        }).join('');
    }
    updateInfrastructure(countryCode) {
        const bounds = CountryBriefPage.BRIEF_BOUNDS[countryCode];
        if (!bounds)
            return;
        const centroidLat = (bounds.n + bounds.s) / 2;
        const centroidLon = (bounds.e + bounds.w) / 2;
        const assets = (0, related_assets_1.getNearbyInfrastructure)(centroidLat, centroidLon, ['pipeline', 'cable', 'datacenter', 'base', 'nuclear']);
        const nearbyPorts = ports_1.PORTS
            .map((p) => ({ port: p, dist: (0, related_assets_1.haversineDistanceKm)(centroidLat, centroidLon, p.lat, p.lon) }))
            .filter(({ dist }) => dist <= 600)
            .sort((a, b) => a.dist - b.dist)
            .slice(0, 5);
        const grouped = new Map();
        for (const a of assets) {
            const list = grouped.get(a.type) || [];
            list.push({ name: a.name, distanceKm: a.distanceKm });
            grouped.set(a.type, list);
        }
        if (nearbyPorts.length > 0) {
            grouped.set('port', nearbyPorts.map(({ port, dist }) => ({ name: port.name, distanceKm: dist })));
        }
        if (grouped.size === 0)
            return;
        const section = this.overlay.querySelector('.cb-infra-section');
        const content = this.overlay.querySelector('.cb-infra-content');
        if (!section || !content)
            return;
        const order = ['pipeline', 'cable', 'datacenter', 'base', 'nuclear', 'port'];
        let html = '';
        for (const type of order) {
            const items = grouped.get(type);
            if (!items || items.length === 0)
                continue;
            const icon = CountryBriefPage.INFRA_ICONS[type];
            const key = CountryBriefPage.INFRA_LABELS[type];
            const label = (0, i18n_1.t)(`modals.countryBrief.infra.${key}`);
            html += `<div class="cb-infra-group">`;
            html += `<div class="cb-infra-type">${icon} ${label}</div>`;
            for (const item of items) {
                html += `<div class="cb-infra-item"><span>${(0, sanitize_1.escapeHtml)(item.name)}</span><span class="cb-infra-dist">${Math.round(item.distanceKm)} km</span></div>`;
            }
            html += `</div>`;
        }
        content.innerHTML = html;
        section.style.display = '';
    }
    getTimelineMount() {
        return this.overlay.querySelector('.cb-timeline-mount');
    }
    getCode() {
        return this.currentCode;
    }
    getName() {
        return this.currentName;
    }
    timeAgo(date) {
        const ms = Date.now() - new Date(date).getTime();
        const hours = Math.floor(ms / 3600000);
        if (hours < 1)
            return (0, i18n_1.t)('modals.countryBrief.timeAgo.m', { count: Math.floor(ms / 60000) });
        if (hours < 24)
            return (0, i18n_1.t)('modals.countryBrief.timeAgo.h', { count: hours });
        return (0, i18n_1.t)('modals.countryBrief.timeAgo.d', { count: Math.floor(hours / 24) });
    }
    formatBrief(text, headlineCount = 0) {
        let html = (0, sanitize_1.escapeHtml)(text)
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/^/, '<p>')
            .replace(/$/, '</p>');
        if (headlineCount > 0) {
            html = html.replace(/\[(\d{1,2})\]/g, (_match, numStr) => {
                const n = parseInt(numStr, 10);
                if (n >= 1 && n <= headlineCount) {
                    return `<a href="#cb-news-${n}" class="cb-citation" title="${(0, i18n_1.t)('components.countryBrief.sourceRef', { n: String(n) })}">[${n}]</a>`;
                }
                return `[${numStr}]`;
            });
        }
        return html;
    }
    exportBrief(format) {
        if (!this.currentCode || !this.currentName)
            return;
        const data = {
            country: this.currentName,
            code: this.currentCode,
            generatedAt: new Date().toISOString(),
        };
        if (this.currentScore) {
            data.score = this.currentScore.score;
            data.level = this.currentScore.level;
            data.trend = this.currentScore.trend;
            data.components = this.currentScore.components;
        }
        if (this.currentSignals) {
            data.signals = {
                protests: this.currentSignals.protests,
                militaryFlights: this.currentSignals.militaryFlights,
                militaryVessels: this.currentSignals.militaryVessels,
                outages: this.currentSignals.outages,
                earthquakes: this.currentSignals.earthquakes,
                displacementOutflow: this.currentSignals.displacementOutflow,
                climateStress: this.currentSignals.climateStress,
                conflictEvents: this.currentSignals.conflictEvents,
                activeStrikes: this.currentSignals.activeStrikes,
                orefSirens: this.currentSignals.orefSirens,
                orefHistory24h: this.currentSignals.orefHistory24h,
                aviationDisruptions: this.currentSignals.aviationDisruptions,
            };
        }
        if (this.currentBrief)
            data.brief = this.currentBrief;
        if (this.currentHeadlines.length > 0) {
            data.headlines = this.currentHeadlines.map(h => ({
                title: h.title,
                source: h.source,
                link: h.link,
                pubDate: h.pubDate ? new Date(h.pubDate).toISOString() : undefined,
            }));
        }
        if (format === 'json')
            (0, export_1.exportCountryBriefJSON)(data);
        else
            (0, export_1.exportCountryBriefCSV)(data);
    }
    exportPdf() {
        const content = this.overlay.querySelector('.cb-body');
        const header = this.overlay.querySelector('.cb-header');
        if (!content)
            return;
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed;left:-9999px;width:0;height:0;border:none';
        document.body.appendChild(iframe);
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) {
            document.body.removeChild(iframe);
            return;
        }
        const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
            .map(el => el.outerHTML).join('\n');
        doc.open();
        doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8">${styles}
      <style>
        @media print { body { margin: 0; padding: 16px; background: #fff; color: #111; }
          .cb-grid { display: block !important; }
          .cb-grid > * { break-inside: avoid; margin-bottom: 16px; }
          .cb-badge, .cb-trend { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          canvas { max-width: 100% !important; }
        }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .country-brief-overlay { position: static !important; background: none !important; }
      </style>
    </head><body>${header ? header.outerHTML : ''}${content.outerHTML}</body></html>`);
        doc.close();
        iframe.contentWindow.onafterprint = () => document.body.removeChild(iframe);
        setTimeout(() => {
            iframe.contentWindow.print();
            setTimeout(() => { if (iframe.parentNode)
                document.body.removeChild(iframe); }, 5000);
        }, 300);
    }
    hide() {
        this.abortController.abort();
        this.overlay.classList.remove('active');
        this.currentCode = null;
        this.currentName = null;
        this.onCloseCallback?.();
    }
    onClose(cb) {
        this.onCloseCallback = cb;
    }
    isVisible() {
        return this.overlay.classList.contains('active');
    }
}
exports.CountryBriefPage = CountryBriefPage;
CountryBriefPage.BRIEF_BOUNDS = {
    ...country_geometry_1.ME_STRIKE_BOUNDS,
    CN: { n: 53.6, s: 18.2, e: 134.8, w: 73.5 }, TW: { n: 25.3, s: 21.9, e: 122, w: 120 },
    JP: { n: 45.5, s: 24.2, e: 153.9, w: 122.9 }, KR: { n: 38.6, s: 33.1, e: 131.9, w: 124.6 },
    KP: { n: 43.0, s: 37.7, e: 130.7, w: 124.2 }, IN: { n: 35.5, s: 6.7, e: 97.4, w: 68.2 },
    PK: { n: 37, s: 24, e: 77, w: 61 }, AF: { n: 38.5, s: 29.4, e: 74.9, w: 60.5 },
    UA: { n: 52.4, s: 44.4, e: 40.2, w: 22.1 }, RU: { n: 82, s: 41.2, e: 180, w: 19.6 },
    BY: { n: 56.2, s: 51.3, e: 32.8, w: 23.2 }, PL: { n: 54.8, s: 49, e: 24.1, w: 14.1 },
    EG: { n: 31.7, s: 22, e: 36.9, w: 25 }, LY: { n: 33, s: 19.5, e: 25, w: 9.4 },
    SD: { n: 22, s: 8.7, e: 38.6, w: 21.8 }, US: { n: 49, s: 24.5, e: -66.9, w: -125 },
    GB: { n: 58.7, s: 49.9, e: 1.8, w: -8.2 }, DE: { n: 55.1, s: 47.3, e: 15.0, w: 5.9 },
    FR: { n: 51.1, s: 41.3, e: 9.6, w: -5.1 }, TR: { n: 42.1, s: 36, e: 44.8, w: 26 },
};
CountryBriefPage.INFRA_ICONS = {
    pipeline: '\u{1F50C}',
    cable: '\u{1F310}',
    datacenter: '\u{1F5A5}\uFE0F',
    base: '\u{1F3DB}\uFE0F',
    nuclear: '\u2622\uFE0F',
    port: '\u2693',
};
CountryBriefPage.INFRA_LABELS = {
    pipeline: 'pipeline',
    cable: 'cable',
    datacenter: 'datacenter',
    base: 'base',
    nuclear: 'nuclear',
    port: 'port',
};
