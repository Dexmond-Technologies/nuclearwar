"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsightsPanel = void 0;
const Panel_1 = require("./Panel");
const ml_worker_1 = require("@/services/ml-worker");
const summarization_1 = require("@/services/summarization");
const parallel_analysis_1 = require("@/services/parallel-analysis");
const signal_aggregator_1 = require("@/services/signal-aggregator");
const focal_point_detector_1 = require("@/services/focal-point-detector");
const country_instability_1 = require("@/services/country-instability");
const military_surge_1 = require("@/services/military-surge");
const utils_1 = require("@/utils");
const sanitize_1 = require("@/utils/sanitize");
const config_1 = require("@/config");
const persistent_cache_1 = require("@/services/persistent-cache");
const i18n_1 = require("@/services/i18n");
const runtime_1 = require("@/services/runtime");
const ai_flow_settings_1 = require("@/services/ai-flow-settings");
class InsightsPanel extends Panel_1.Panel {
    constructor() {
        super({
            id: 'insights',
            title: (0, i18n_1.t)('panels.insights'),
            showCount: false,
            infoTooltip: (0, i18n_1.t)('components.insights.infoTooltip'),
        });
        this.isHidden = false;
        this.lastBriefUpdate = 0;
        this.cachedBrief = null;
        this.lastMissedStories = [];
        this.lastConvergenceZones = [];
        this.lastFocalPoints = [];
        this.lastMilitaryFlights = [];
        this.lastClusters = [];
        this.aiFlowUnsubscribe = null;
        this.updateGeneration = 0;
        if ((0, utils_1.isMobileDevice)()) {
            this.hide();
            this.isHidden = true;
        }
        // Web-only: subscribe to AI flow changes so toggling providers re-runs analysis
        if (!(0, runtime_1.isDesktopRuntime)() && !(0, utils_1.isMobileDevice)()) {
            this.aiFlowUnsubscribe = (0, ai_flow_settings_1.subscribeAiFlowChange)((changedKey) => {
                if (changedKey === 'mapNewsFlash')
                    return;
                void this.onAiFlowChanged();
            });
        }
    }
    setMilitaryFlights(flights) {
        this.lastMilitaryFlights = flights;
    }
    getTheaterPostureContext() {
        if (this.lastMilitaryFlights.length === 0) {
            return '';
        }
        const postures = (0, military_surge_1.getTheaterPostureSummaries)(this.lastMilitaryFlights);
        const significant = postures.filter((p) => p.postureLevel === 'critical' || p.postureLevel === 'elevated' || p.strikeCapable);
        if (significant.length === 0) {
            return '';
        }
        const lines = significant.map((p) => {
            const parts = [];
            parts.push(`${p.theaterName}: ${p.totalAircraft} aircraft`);
            parts.push(`(${p.postureLevel.toUpperCase()})`);
            if (p.strikeCapable)
                parts.push('STRIKE CAPABLE');
            parts.push(`- ${p.summary}`);
            if (p.targetNation)
                parts.push(`Focus: ${p.targetNation}`);
            return parts.join(' ');
        });
        return `\n\nCRITICAL MILITARY POSTURE:\n${lines.join('\n')}`;
    }
    async loadBriefFromCache() {
        if (this.cachedBrief)
            return false;
        const entry = await (0, persistent_cache_1.getPersistentCache)(InsightsPanel.BRIEF_CACHE_KEY);
        if (!entry?.data?.summary)
            return false;
        this.cachedBrief = entry.data.summary;
        this.lastBriefUpdate = entry.updatedAt;
        return true;
    }
    getImportanceScore(cluster) {
        let score = 0;
        const titleLower = cluster.primaryTitle.toLowerCase();
        // Source confirmation (base signal)
        score += cluster.sourceCount * 10;
        // Violence/casualty keywords: highest priority (+100 base, +25 per match)
        // "Pools of blood" type stories should always surface
        const violenceMatches = InsightsPanel.VIOLENCE_KEYWORDS.filter(kw => titleLower.includes(kw));
        if (violenceMatches.length > 0) {
            score += 100 + (violenceMatches.length * 25);
        }
        // Military keywords: highest priority (+80 base, +20 per match)
        const militaryMatches = InsightsPanel.MILITARY_KEYWORDS.filter(kw => titleLower.includes(kw));
        if (militaryMatches.length > 0) {
            score += 80 + (militaryMatches.length * 20);
        }
        // Civil unrest: high priority (+70 base, +18 per match)
        const unrestMatches = InsightsPanel.UNREST_KEYWORDS.filter(kw => titleLower.includes(kw));
        if (unrestMatches.length > 0) {
            score += 70 + (unrestMatches.length * 18);
        }
        // Flashpoint keywords: high priority (+60 base, +15 per match)
        const flashpointMatches = InsightsPanel.FLASHPOINT_KEYWORDS.filter(kw => titleLower.includes(kw));
        if (flashpointMatches.length > 0) {
            score += 60 + (flashpointMatches.length * 15);
        }
        // COMBO BONUS: Violence/unrest + flashpoint location = critical story
        // e.g., "Iran protests" + "blood" = huge boost
        if ((violenceMatches.length > 0 || unrestMatches.length > 0) && flashpointMatches.length > 0) {
            score *= 1.5; // 50% bonus for flashpoint unrest
        }
        // Crisis keywords: moderate priority (+30 base, +10 per match)
        const crisisMatches = InsightsPanel.CRISIS_KEYWORDS.filter(kw => titleLower.includes(kw));
        if (crisisMatches.length > 0) {
            score += 30 + (crisisMatches.length * 10);
        }
        // Demote business/tech news that happens to contain military words
        const demoteMatches = InsightsPanel.DEMOTE_KEYWORDS.filter(kw => titleLower.includes(kw));
        if (demoteMatches.length > 0) {
            score *= 0.3; // Heavy penalty for business context
        }
        // Velocity multiplier
        const velMultiplier = {
            'viral': 3,
            'spike': 2.5,
            'elevated': 1.5,
            'normal': 1
        };
        score *= velMultiplier[cluster.velocity?.level ?? 'normal'] ?? 1;
        // Alert bonus
        if (cluster.isAlert)
            score += 50;
        // Recency bonus (decay over 12 hours)
        const ageMs = Date.now() - cluster.firstSeen.getTime();
        const ageHours = ageMs / 3600000;
        const recencyMultiplier = Math.max(0.5, 1 - (ageHours / 12));
        score *= recencyMultiplier;
        return score;
    }
    selectTopStories(clusters, maxCount) {
        // Score ALL clusters first - high-scoring stories override source requirements
        const allScored = clusters
            .map(c => ({ cluster: c, score: this.getImportanceScore(c) }));
        // Filter: require at least 2 sources OR alert OR elevated velocity OR high score
        // High score (>100) means critical keywords were matched - don't require multi-source
        const candidates = allScored.filter(({ cluster: c, score }) => c.sourceCount >= 2 ||
            c.isAlert ||
            (c.velocity && c.velocity.level !== 'normal') ||
            score > 100 // Critical stories bypass source requirement
        );
        // Sort by score
        const scored = candidates.sort((a, b) => b.score - a.score);
        // Select with source diversity (max 3 from same primary source)
        const selected = [];
        const sourceCount = new Map();
        const MAX_PER_SOURCE = 3;
        for (const { cluster } of scored) {
            const source = cluster.primarySource;
            const count = sourceCount.get(source) || 0;
            if (count < MAX_PER_SOURCE) {
                selected.push(cluster);
                sourceCount.set(source, count + 1);
            }
            if (selected.length >= maxCount)
                break;
        }
        return selected;
    }
    setProgress(step, total, message) {
        const percent = Math.round((step / total) * 100);
        this.setContent(`
      <div class="insights-progress">
        <div class="insights-progress-bar">
          <div class="insights-progress-fill" style="width: ${percent}%"></div>
        </div>
        <div class="insights-progress-info">
          <span class="insights-progress-step">${(0, i18n_1.t)('components.insights.step', { step: String(step), total: String(total) })}</span>
          <span class="insights-progress-message">${message}</span>
        </div>
      </div>
    `);
    }
    async updateInsights(clusters) {
        if (this.isHidden)
            return;
        this.lastClusters = clusters;
        this.updateGeneration++;
        const thisGeneration = this.updateGeneration;
        if (clusters.length === 0) {
            this.setDataBadge('unavailable');
            this.setContent(`<div class="insights-empty">${(0, i18n_1.t)('components.insights.waitingForData')}</div>`);
            return;
        }
        // Web-only: if no AI providers enabled, show disabled state
        if (!(0, runtime_1.isDesktopRuntime)() && !(0, ai_flow_settings_1.isAnyAiProviderEnabled)()) {
            this.setDataBadge('unavailable');
            this.renderDisabledState();
            return;
        }
        // Build summarize options from AI flow settings (web) or defaults (desktop)
        const aiFlow = (0, runtime_1.isDesktopRuntime)() ? { cloudLlm: true, browserModel: true } : (0, ai_flow_settings_1.getAiFlowSettings)();
        const summarizeOpts = {
            skipCloudProviders: !aiFlow.cloudLlm,
            skipBrowserFallback: !aiFlow.browserModel,
        };
        const totalSteps = 4;
        try {
            // Step 1: Filter and rank stories by composite importance score
            this.setProgress(1, totalSteps, (0, i18n_1.t)('components.insights.rankingStories'));
            const importantClusters = this.selectTopStories(clusters, 8);
            // Run parallel multi-perspective analysis in background
            // This analyzes ALL clusters, not just the keyword-filtered ones
            const parallelPromise = parallel_analysis_1.parallelAnalysis.analyzeHeadlines(clusters).then(report => {
                this.lastMissedStories = report.missedByKeywords;
            }).catch(err => {
                console.warn('[ParallelAnalysis] Error:', err);
            });
            // Get geographic signal correlations (geopolitical variant only)
            // Tech variant focuses on tech news, not military/protest signals
            let signalSummary;
            let focalSummary;
            if (config_1.SITE_VARIANT === 'full') {
                // Feed theater-level posture into signal aggregator so target nations
                // (Iran, Taiwan, etc.) get credited for military activity in their theater,
                // even when aircraft/vessels are physically over neighboring airspace/waters.
                if (this.lastMilitaryFlights.length > 0) {
                    const postures = (0, military_surge_1.getTheaterPostureSummaries)(this.lastMilitaryFlights);
                    signal_aggregator_1.signalAggregator.ingestTheaterPostures(postures);
                }
                signalSummary = signal_aggregator_1.signalAggregator.getSummary();
                this.lastConvergenceZones = signalSummary.convergenceZones;
                // Run focal point detection (correlates news entities with map signals)
                focalSummary = focal_point_detector_1.focalPointDetector.analyze(clusters, signalSummary);
                this.lastFocalPoints = focalSummary.focalPoints;
                if (focalSummary.focalPoints.length > 0) {
                    // Ingest news for CII BEFORE signaling (so CII has data when it calculates)
                    (0, country_instability_1.ingestNewsForCII)(clusters);
                    // Signal CII to refresh now that focal points AND news data are available
                    window.dispatchEvent(new CustomEvent('focal-points-ready'));
                }
            }
            else {
                // Tech variant: no geopolitical signals, just summarize tech news
                signalSummary = {
                    timestamp: new Date(),
                    totalSignals: 0,
                    byType: {},
                    convergenceZones: [],
                    topCountries: [],
                    aiContext: '',
                };
                focalSummary = {
                    focalPoints: [],
                    aiContext: '',
                    timestamp: new Date(),
                    topCountries: [],
                    topCompanies: [],
                };
                this.lastConvergenceZones = [];
                this.lastFocalPoints = [];
            }
            if (importantClusters.length === 0) {
                this.setContent(`<div class="insights-empty">${(0, i18n_1.t)('components.insights.noStories')}</div>`);
                return;
            }
            // Cap titles sent to AI at 5 to reduce entity conflation in small models
            const titles = importantClusters.slice(0, 5).map(c => c.primaryTitle);
            // Step 2: Analyze sentiment (browser-based, fast)
            this.setProgress(2, totalSteps, (0, i18n_1.t)('components.insights.analyzingSentiment'));
            let sentiments = null;
            if (ml_worker_1.mlWorker.isAvailable) {
                sentiments = await ml_worker_1.mlWorker.classifySentiment(titles).catch(() => null);
            }
            if (this.updateGeneration !== thisGeneration)
                return;
            // Step 3: Generate World Brief (with cooldown)
            const loadedFromPersistentCache = await this.loadBriefFromCache();
            if (this.updateGeneration !== thisGeneration)
                return;
            let worldBrief = this.cachedBrief;
            const now = Date.now();
            let usedCachedBrief = loadedFromPersistentCache;
            if (!worldBrief || now - this.lastBriefUpdate > InsightsPanel.BRIEF_COOLDOWN_MS) {
                this.setProgress(3, totalSteps, (0, i18n_1.t)('components.insights.generatingBrief'));
                // Pass focal point context + theater posture to AI for correlation-aware summarization
                // Tech variant: no geopolitical context, just tech news summarization
                const theaterContext = config_1.SITE_VARIANT === 'full' ? this.getTheaterPostureContext() : '';
                const geoContext = config_1.SITE_VARIANT === 'full'
                    ? (focalSummary.aiContext || signalSummary.aiContext) + theaterContext
                    : '';
                const result = await (0, summarization_1.generateSummary)(titles, (_step, _total, msg) => {
                    // Show sub-progress for summarization
                    this.setProgress(3, totalSteps, `Generating brief: ${msg}`);
                }, geoContext, undefined, summarizeOpts);
                if (this.updateGeneration !== thisGeneration)
                    return;
                if (result) {
                    worldBrief = result.summary;
                    this.cachedBrief = worldBrief;
                    this.lastBriefUpdate = now;
                    usedCachedBrief = false;
                    void (0, persistent_cache_1.setPersistentCache)(InsightsPanel.BRIEF_CACHE_KEY, { summary: worldBrief });
                }
            }
            else {
                usedCachedBrief = true;
                this.setProgress(3, totalSteps, 'Using cached brief...');
            }
            this.setDataBadge(worldBrief ? (usedCachedBrief ? 'cached' : 'live') : 'unavailable');
            // Step 4: Wait for parallel analysis to complete
            this.setProgress(4, totalSteps, 'Multi-perspective analysis...');
            await parallelPromise;
            if (this.updateGeneration !== thisGeneration)
                return;
            this.renderInsights(importantClusters, sentiments, worldBrief);
        }
        catch (error) {
            console.error('[InsightsPanel] Error:', error);
            this.setContent('<div class="insights-error">Analysis failed - retrying...</div>');
        }
    }
    renderInsights(clusters, sentiments, worldBrief) {
        const briefHtml = worldBrief ? this.renderWorldBrief(worldBrief) : '';
        const focalPointsHtml = this.renderFocalPoints();
        const convergenceHtml = this.renderConvergenceZones();
        const sentimentOverview = this.renderSentimentOverview(sentiments);
        const breakingHtml = this.renderBreakingStories(clusters, sentiments);
        const statsHtml = this.renderStats(clusters);
        const missedHtml = this.renderMissedStories();
        this.setContent(`
      ${briefHtml}
      ${focalPointsHtml}
      ${convergenceHtml}
      ${sentimentOverview}
      ${statsHtml}
      <div class="insights-section">
        <div class="insights-section-title">BREAKING & CONFIRMED</div>
        ${breakingHtml}
      </div>
      ${missedHtml}
    `);
    }
    renderWorldBrief(brief) {
        return `
      <div class="insights-brief">
        <div class="insights-section-title">${config_1.SITE_VARIANT === 'tech' ? '🚀 TECH BRIEF' : '🌍 WORLD BRIEF'}</div>
        <div class="insights-brief-text">${(0, sanitize_1.escapeHtml)(brief)}</div>
      </div>
    `;
    }
    renderBreakingStories(clusters, sentiments) {
        return clusters.map((cluster, i) => {
            const sentiment = sentiments?.[i];
            const sentimentClass = sentiment?.label === 'negative' ? 'negative' :
                sentiment?.label === 'positive' ? 'positive' : 'neutral';
            const badges = [];
            if (cluster.sourceCount >= 3) {
                badges.push(`<span class="insight-badge confirmed">✓ ${cluster.sourceCount} sources</span>`);
            }
            else if (cluster.sourceCount >= 2) {
                badges.push(`<span class="insight-badge multi">${cluster.sourceCount} sources</span>`);
            }
            if (cluster.velocity && cluster.velocity.level !== 'normal') {
                const velIcon = cluster.velocity.trend === 'rising' ? '↑' : '';
                badges.push(`<span class="insight-badge velocity ${cluster.velocity.level}">${velIcon}+${cluster.velocity.sourcesPerHour}/hr</span>`);
            }
            if (cluster.isAlert) {
                badges.push('<span class="insight-badge alert">⚠ ALERT</span>');
            }
            return `
        <div class="insight-story">
          <div class="insight-story-header">
            <span class="insight-sentiment-dot ${sentimentClass}"></span>
            <span class="insight-story-title">${(0, sanitize_1.escapeHtml)(cluster.primaryTitle.slice(0, 100))}${cluster.primaryTitle.length > 100 ? '...' : ''}</span>
          </div>
          ${badges.length > 0 ? `<div class="insight-badges">${badges.join('')}</div>` : ''}
        </div>
      `;
        }).join('');
    }
    renderSentimentOverview(sentiments) {
        if (!sentiments || sentiments.length === 0) {
            return '';
        }
        const negative = sentiments.filter(s => s.label === 'negative').length;
        const positive = sentiments.filter(s => s.label === 'positive').length;
        const neutral = sentiments.length - negative - positive;
        const total = sentiments.length;
        const negPct = Math.round((negative / total) * 100);
        const neuPct = Math.round((neutral / total) * 100);
        const posPct = 100 - negPct - neuPct;
        let toneLabel = 'Mixed';
        let toneClass = 'neutral';
        if (negative > positive + neutral) {
            toneLabel = 'Negative';
            toneClass = 'negative';
        }
        else if (positive > negative + neutral) {
            toneLabel = 'Positive';
            toneClass = 'positive';
        }
        return `
      <div class="insights-sentiment-bar">
        <div class="sentiment-bar-track">
          <div class="sentiment-bar-negative" style="width: ${negPct}%"></div>
          <div class="sentiment-bar-neutral" style="width: ${neuPct}%"></div>
          <div class="sentiment-bar-positive" style="width: ${posPct}%"></div>
        </div>
        <div class="sentiment-bar-labels">
          <span class="sentiment-label negative">${negative}</span>
          <span class="sentiment-label neutral">${neutral}</span>
          <span class="sentiment-label positive">${positive}</span>
        </div>
        <div class="sentiment-tone ${toneClass}">Overall: ${toneLabel}</div>
      </div>
    `;
    }
    renderStats(clusters) {
        const multiSource = clusters.filter(c => c.sourceCount >= 2).length;
        const fastMoving = clusters.filter(c => c.velocity && c.velocity.level !== 'normal').length;
        const alerts = clusters.filter(c => c.isAlert).length;
        return `
      <div class="insights-stats">
        <div class="insight-stat">
          <span class="insight-stat-value">${multiSource}</span>
          <span class="insight-stat-label">Multi-source</span>
        </div>
        <div class="insight-stat">
          <span class="insight-stat-value">${fastMoving}</span>
          <span class="insight-stat-label">Fast-moving</span>
        </div>
        ${alerts > 0 ? `
        <div class="insight-stat alert">
          <span class="insight-stat-value">${alerts}</span>
          <span class="insight-stat-label">Alerts</span>
        </div>
        ` : ''}
      </div>
    `;
    }
    renderMissedStories() {
        if (this.lastMissedStories.length === 0) {
            return '';
        }
        const storiesHtml = this.lastMissedStories.slice(0, 3).map(story => {
            const topPerspective = story.perspectives
                .filter(p => p.name !== 'keywords')
                .sort((a, b) => b.score - a.score)[0];
            const perspectiveName = topPerspective?.name ?? 'ml';
            const perspectiveScore = topPerspective?.score ?? 0;
            return `
        <div class="insight-story missed">
          <div class="insight-story-header">
            <span class="insight-sentiment-dot ml-flagged"></span>
            <span class="insight-story-title">${(0, sanitize_1.escapeHtml)(story.title.slice(0, 80))}${story.title.length > 80 ? '...' : ''}</span>
          </div>
          <div class="insight-badges">
            <span class="insight-badge ml-detected">🔬 ${perspectiveName}: ${(perspectiveScore * 100).toFixed(0)}%</span>
          </div>
        </div>
      `;
        }).join('');
        return `
      <div class="insights-section insights-missed">
        <div class="insights-section-title">🎯 ML DETECTED</div>
        ${storiesHtml}
      </div>
    `;
    }
    renderConvergenceZones() {
        if (this.lastConvergenceZones.length === 0) {
            return '';
        }
        const zonesHtml = this.lastConvergenceZones.slice(0, 3).map(zone => {
            const signalIcons = {
                internet_outage: '🌐',
                military_flight: '✈️',
                military_vessel: '🚢',
                protest: '🪧',
                ais_disruption: '⚓',
            };
            const icons = zone.signalTypes.map(t => signalIcons[t] || '📍').join('');
            return `
        <div class="convergence-zone">
          <div class="convergence-region">${icons} ${(0, sanitize_1.escapeHtml)(zone.region)}</div>
          <div class="convergence-description">${(0, sanitize_1.escapeHtml)(zone.description)}</div>
          <div class="convergence-stats">${zone.signalTypes.length} signal types • ${zone.totalSignals} events</div>
        </div>
      `;
        }).join('');
        return `
      <div class="insights-section insights-convergence">
        <div class="insights-section-title">📍 GEOGRAPHIC CONVERGENCE</div>
        ${zonesHtml}
      </div>
    `;
    }
    renderFocalPoints() {
        // Show focal points with news+signals correlations, or those with active strikes
        const correlatedFPs = this.lastFocalPoints.filter(fp => (fp.newsMentions > 0 && fp.signalCount > 0) ||
            fp.signalTypes.includes('active_strike')).slice(0, 5);
        if (correlatedFPs.length === 0) {
            return '';
        }
        const signalIcons = {
            internet_outage: '🌐',
            military_flight: '✈️',
            military_vessel: '⚓',
            protest: '📢',
            ais_disruption: '🚢',
            active_strike: '💥',
        };
        const focalPointsHtml = correlatedFPs.map(fp => {
            const urgencyClass = fp.urgency;
            const icons = fp.signalTypes.map(t => signalIcons[t] || '').join(' ');
            const topHeadline = fp.topHeadlines[0];
            const headlineText = topHeadline?.title?.slice(0, 60) || '';
            const headlineUrl = (0, sanitize_1.sanitizeUrl)(topHeadline?.url || '');
            return `
        <div class="focal-point ${urgencyClass}">
          <div class="focal-point-header">
            <span class="focal-point-name">${(0, sanitize_1.escapeHtml)(fp.displayName)}</span>
            <span class="focal-point-urgency ${urgencyClass}">${fp.urgency.toUpperCase()}</span>
          </div>
          <div class="focal-point-signals">${icons}</div>
          <div class="focal-point-stats">
            ${fp.newsMentions} news • ${fp.signalCount} signals
          </div>
          ${headlineText && headlineUrl ? `<a href="${headlineUrl}" target="_blank" rel="noopener" class="focal-point-headline">"${(0, sanitize_1.escapeHtml)(headlineText)}..."</a>` : ''}
        </div>
      `;
        }).join('');
        return `
      <div class="insights-section insights-focal">
        <div class="insights-section-title">🎯 FOCAL POINTS</div>
        ${focalPointsHtml}
      </div>
    `;
    }
    renderDisabledState() {
        this.setContent(`
      <div class="insights-disabled">
        <div class="insights-disabled-icon">⚡</div>
        <div class="insights-disabled-title">${(0, i18n_1.t)('components.insights.insightsDisabledTitle')}</div>
        <div class="insights-disabled-hint">${(0, i18n_1.t)('components.insights.insightsDisabledHint')}</div>
      </div>
    `);
    }
    async onAiFlowChanged() {
        this.updateGeneration++;
        // Reset brief cache so new provider settings take effect immediately
        this.cachedBrief = null;
        this.lastBriefUpdate = 0;
        try {
            await (0, persistent_cache_1.deletePersistentCache)(InsightsPanel.BRIEF_CACHE_KEY);
        }
        catch {
            // Best effort; fallback regeneration still works from memory reset.
        }
        if (!(0, ai_flow_settings_1.isAnyAiProviderEnabled)()) {
            this.setDataBadge('unavailable');
            this.renderDisabledState();
            return;
        }
        if (this.lastClusters.length > 0) {
            void this.updateInsights(this.lastClusters);
            return;
        }
        this.setDataBadge('unavailable');
        this.setContent(`<div class="insights-empty">${(0, i18n_1.t)('components.insights.waitingForData')}</div>`);
    }
    destroy() {
        this.aiFlowUnsubscribe?.();
        super.destroy();
    }
}
exports.InsightsPanel = InsightsPanel;
InsightsPanel.BRIEF_COOLDOWN_MS = 120000; // 2 min cooldown (API has limits)
InsightsPanel.BRIEF_CACHE_KEY = 'summary:world-brief';
// High-priority military/conflict keywords (huge boost)
InsightsPanel.MILITARY_KEYWORDS = [
    'war', 'armada', 'invasion', 'airstrike', 'strike', 'missile', 'troops',
    'deployed', 'offensive', 'artillery', 'bomb', 'combat', 'fleet', 'warship',
    'carrier', 'navy', 'airforce', 'deployment', 'mobilization', 'attack',
];
// Violence/casualty keywords (huge boost - human cost stories)
InsightsPanel.VIOLENCE_KEYWORDS = [
    'killed', 'dead', 'death', 'shot', 'blood', 'massacre', 'slaughter',
    'fatalities', 'casualties', 'wounded', 'injured', 'murdered', 'execution',
    'crackdown', 'violent', 'clashes', 'gunfire', 'shooting',
];
// Civil unrest keywords (high boost)
InsightsPanel.UNREST_KEYWORDS = [
    'protest', 'protests', 'uprising', 'revolt', 'revolution', 'riot', 'riots',
    'demonstration', 'unrest', 'dissent', 'rebellion', 'insurgent', 'overthrow',
    'coup', 'martial law', 'curfew', 'shutdown', 'blackout',
];
// Geopolitical flashpoints (major boost)
InsightsPanel.FLASHPOINT_KEYWORDS = [
    'iran', 'tehran', 'russia', 'moscow', 'china', 'beijing', 'taiwan', 'ukraine', 'kyiv',
    'north korea', 'pyongyang', 'israel', 'gaza', 'west bank', 'syria', 'damascus',
    'yemen', 'hezbollah', 'hamas', 'kremlin', 'pentagon', 'nato', 'wagner',
];
// Crisis keywords (moderate boost)
InsightsPanel.CRISIS_KEYWORDS = [
    'crisis', 'emergency', 'catastrophe', 'disaster', 'collapse', 'humanitarian',
    'sanctions', 'ultimatum', 'threat', 'retaliation', 'escalation', 'tensions',
    'breaking', 'urgent', 'developing', 'exclusive',
];
// Business/tech context that should REDUCE score (demote business news with military words)
InsightsPanel.DEMOTE_KEYWORDS = [
    'ceo', 'earnings', 'stock', 'startup', 'data center', 'datacenter', 'revenue',
    'quarterly', 'profit', 'investor', 'ipo', 'funding', 'valuation',
];
