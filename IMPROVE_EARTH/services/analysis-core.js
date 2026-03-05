"use strict";
/**
 * Core analysis functions shared between main thread and worker.
 * All functions here are PURE (no side effects, no external state).
 *
 * This module is the single source of truth for:
 * - News clustering algorithm
 * - Correlation signal detection algorithms
 *
 * Both the main-thread services and the Web Worker import from here.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDedupeKey = exports.generateSignalId = exports.jaccardSimilarity = exports.tokenize = exports.SIMILARITY_THRESHOLD = void 0;
exports.clusterNewsCore = clusterNewsCore;
exports.detectPipelineFlowDrops = detectPipelineFlowDrops;
exports.detectConvergence = detectConvergence;
exports.detectTriangulation = detectTriangulation;
exports.analyzeCorrelationsCore = analyzeCorrelationsCore;
const analysis_constants_1 = require("@/utils/analysis-constants");
Object.defineProperty(exports, "SIMILARITY_THRESHOLD", { enumerable: true, get: function () { return analysis_constants_1.SIMILARITY_THRESHOLD; } });
Object.defineProperty(exports, "tokenize", { enumerable: true, get: function () { return analysis_constants_1.tokenize; } });
Object.defineProperty(exports, "jaccardSimilarity", { enumerable: true, get: function () { return analysis_constants_1.jaccardSimilarity; } });
Object.defineProperty(exports, "generateSignalId", { enumerable: true, get: function () { return analysis_constants_1.generateSignalId; } });
Object.defineProperty(exports, "generateDedupeKey", { enumerable: true, get: function () { return analysis_constants_1.generateDedupeKey; } });
const entity_extraction_1 = require("./entity-extraction");
const entity_index_1 = require("./entity-index");
const threat_classifier_1 = require("./threat-classifier");
const TOPIC_BASELINE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const TOPIC_BASELINE_SPIKE_MULTIPLIER = 3;
const TOPIC_HISTORY_MAX_POINTS = 1000;
// ============================================================================
// CLUSTERING FUNCTIONS
// ============================================================================
function generateClusterId(items) {
    const sorted = [...items].sort((a, b) => a.pubDate.getTime() - b.pubDate.getTime());
    const first = sorted[0];
    return `${first.pubDate.getTime()}-${first.title.slice(0, 20).replace(/\W/g, '')}`;
}
/**
 * Cluster news items by title similarity using Jaccard index.
 * Pure function - no side effects.
 */
function clusterNewsCore(items, getSourceTier) {
    if (items.length === 0)
        return [];
    const itemsWithTier = items.map(item => ({
        ...item,
        tier: item.tier ?? getSourceTier(item.source),
    }));
    const tokenCache = new Map();
    const tokenList = [];
    const invertedIndex = new Map();
    for (const item of itemsWithTier) {
        const tokens = (0, analysis_constants_1.tokenize)(item.title);
        tokenCache.set(item.title, tokens);
        tokenList.push(tokens);
    }
    for (let index = 0; index < tokenList.length; index++) {
        const tokens = tokenList[index];
        for (const token of tokens) {
            const bucket = invertedIndex.get(token);
            if (bucket) {
                bucket.push(index);
            }
            else {
                invertedIndex.set(token, [index]);
            }
        }
    }
    const clusters = [];
    const assigned = new Set();
    for (let i = 0; i < itemsWithTier.length; i++) {
        if (assigned.has(i))
            continue;
        const currentItem = itemsWithTier[i];
        const cluster = [currentItem];
        assigned.add(i);
        const tokensI = tokenList[i];
        const candidateIndices = new Set();
        for (const token of tokensI) {
            const bucket = invertedIndex.get(token);
            if (!bucket)
                continue;
            for (const idx of bucket) {
                if (idx > i) {
                    candidateIndices.add(idx);
                }
            }
        }
        const sortedCandidates = Array.from(candidateIndices).sort((a, b) => a - b);
        for (const j of sortedCandidates) {
            if (assigned.has(j)) {
                continue;
            }
            const otherItem = itemsWithTier[j];
            const tokensJ = tokenList[j];
            const similarity = (0, analysis_constants_1.jaccardSimilarity)(tokensI, tokensJ);
            if (similarity >= analysis_constants_1.SIMILARITY_THRESHOLD) {
                cluster.push(otherItem);
                assigned.add(j);
            }
        }
        clusters.push(cluster);
    }
    return clusters.map(cluster => {
        const sorted = [...cluster].sort((a, b) => {
            const tierDiff = a.tier - b.tier;
            if (tierDiff !== 0)
                return tierDiff;
            return b.pubDate.getTime() - a.pubDate.getTime();
        });
        const primary = sorted[0];
        const dates = cluster.map(i => i.pubDate.getTime());
        const topSources = sorted
            .slice(0, 3)
            .map(item => ({
            name: item.source,
            tier: item.tier,
            url: item.link,
        }));
        const threat = (0, threat_classifier_1.aggregateThreats)(cluster);
        // Pick most common geo location across items
        const locItems = cluster.filter((i) => i.lat != null && i.lon != null);
        let clusterLat;
        let clusterLon;
        if (locItems.length > 0) {
            const locCounts = new Map();
            for (const li of locItems) {
                const key = `${li.lat},${li.lon}`;
                const entry = locCounts.get(key) || { lat: li.lat, lon: li.lon, count: 0 };
                entry.count++;
                locCounts.set(key, entry);
            }
            const best = Array.from(locCounts.values()).sort((a, b) => b.count - a.count)[0];
            clusterLat = best.lat;
            clusterLon = best.lon;
        }
        return {
            id: generateClusterId(cluster),
            primaryTitle: primary.title,
            primarySource: primary.source,
            primaryLink: primary.link,
            sourceCount: cluster.length,
            topSources,
            allItems: cluster,
            firstSeen: new Date(Math.min(...dates)),
            lastUpdated: new Date(Math.max(...dates)),
            isAlert: cluster.some(i => i.isAlert),
            monitorColor: cluster.find(i => i.monitorColor)?.monitorColor,
            threat,
            ...(clusterLat != null && { lat: clusterLat, lon: clusterLon }),
            lang: primary.lang,
        };
    }).sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());
}
// ============================================================================
// CORRELATION FUNCTIONS
// ============================================================================
function extractTopics(events) {
    const topics = new Map();
    for (const event of events) {
        const title = event.primaryTitle.toLowerCase();
        for (const kw of analysis_constants_1.TOPIC_KEYWORDS) {
            if (analysis_constants_1.SUPPRESSED_TRENDING_TERMS.has(kw))
                continue;
            if (!(0, analysis_constants_1.containsTopicKeyword)(title, kw))
                continue;
            const velocity = event.velocity?.sourcesPerHour ?? 0;
            topics.set(kw, (topics.get(kw) ?? 0) + velocity + event.sourceCount);
        }
    }
    return topics;
}
function pruneVelocityHistory(history, now) {
    return history.filter(point => now - point.timestamp <= TOPIC_BASELINE_WINDOW_MS);
}
function averageVelocity(history) {
    if (history.length === 0)
        return 0;
    const total = history.reduce((sum, point) => sum + point.velocity, 0);
    return total / history.length;
}
function detectPipelineFlowDrops(events, isRecentDuplicate, markSignalSeen) {
    const signals = [];
    for (const event of events) {
        const titles = [
            event.primaryTitle,
            ...(event.allItems?.map(item => item.title) ?? []),
        ]
            .map(title => title.toLowerCase())
            .filter(Boolean);
        const hasPipeline = titles.some(title => (0, analysis_constants_1.includesKeyword)(title, analysis_constants_1.PIPELINE_KEYWORDS));
        const hasFlowDrop = titles.some(title => (0, analysis_constants_1.includesKeyword)(title, analysis_constants_1.FLOW_DROP_KEYWORDS));
        if (hasPipeline && hasFlowDrop) {
            const dedupeKey = (0, analysis_constants_1.generateDedupeKey)('flow_drop', event.id, event.sourceCount);
            if (!isRecentDuplicate(dedupeKey)) {
                markSignalSeen(dedupeKey);
                signals.push({
                    id: (0, analysis_constants_1.generateSignalId)(),
                    type: 'flow_drop',
                    title: 'Pipeline Flow Drop',
                    description: `"${event.primaryTitle.slice(0, 70)}..." indicates reduced flow or disruption`,
                    confidence: Math.min(0.9, 0.4 + event.sourceCount / 10),
                    timestamp: new Date(),
                    data: {
                        newsVelocity: event.sourceCount,
                        relatedTopics: ['pipeline', 'flow'],
                    },
                });
            }
        }
    }
    return signals;
}
function detectConvergence(events, getSourceType, isRecentDuplicate, markSignalSeen) {
    const signals = [];
    const WINDOW_MS = 60 * 60 * 1000;
    const now = Date.now();
    for (const event of events) {
        if (!event.allItems || event.allItems.length < 3)
            continue;
        const recentItems = event.allItems.filter(item => now - item.pubDate.getTime() < WINDOW_MS);
        if (recentItems.length < 3)
            continue;
        const sourceTypes = new Set();
        for (const item of recentItems) {
            const type = getSourceType(item.source);
            sourceTypes.add(type);
        }
        if (sourceTypes.size >= 3) {
            const types = Array.from(sourceTypes).filter(t => t !== 'other');
            const dedupeKey = (0, analysis_constants_1.generateDedupeKey)('convergence', event.id, sourceTypes.size);
            if (!isRecentDuplicate(dedupeKey) && types.length >= 3) {
                markSignalSeen(dedupeKey);
                signals.push({
                    id: (0, analysis_constants_1.generateSignalId)(),
                    type: 'convergence',
                    title: 'Source Convergence',
                    description: `"${event.primaryTitle.slice(0, 50)}..." reported by ${types.join(', ')} (${recentItems.length} sources in 30m)`,
                    confidence: Math.min(0.95, 0.6 + sourceTypes.size * 0.1),
                    timestamp: new Date(),
                    data: {
                        newsVelocity: recentItems.length,
                        relatedTopics: types,
                    },
                });
            }
        }
    }
    return signals;
}
function detectTriangulation(events, getSourceType, isRecentDuplicate, markSignalSeen) {
    const signals = [];
    const CRITICAL_TYPES = ['wire', 'gov', 'intel'];
    for (const event of events) {
        if (!event.allItems || event.allItems.length < 3)
            continue;
        const typePresent = new Set();
        for (const item of event.allItems) {
            const t = getSourceType(item.source);
            if (CRITICAL_TYPES.includes(t)) {
                typePresent.add(t);
            }
        }
        if (typePresent.size === 3) {
            const dedupeKey = (0, analysis_constants_1.generateDedupeKey)('triangulation', event.id, 3);
            if (!isRecentDuplicate(dedupeKey)) {
                markSignalSeen(dedupeKey);
                signals.push({
                    id: (0, analysis_constants_1.generateSignalId)(),
                    type: 'triangulation',
                    title: 'Intel Triangulation',
                    description: `Wire + Gov + Intel aligned: "${event.primaryTitle.slice(0, 45)}..."`,
                    confidence: 0.9,
                    timestamp: new Date(),
                    data: {
                        newsVelocity: event.sourceCount,
                        relatedTopics: Array.from(typePresent),
                    },
                });
            }
        }
    }
    return signals;
}
/**
 * Analyze correlations between news, predictions, and markets.
 * Pure function - state management (snapshots, deduplication) handled by caller.
 */
function analyzeCorrelationsCore(events, predictions, markets, previousSnapshot, getSourceType, isRecentDuplicate, markSignalSeen) {
    const signals = [];
    const now = Date.now();
    const newsTopics = extractTopics(events);
    const pipelineFlowSignals = detectPipelineFlowDrops(events, isRecentDuplicate, markSignalSeen);
    const pipelineFlowMentions = pipelineFlowSignals.length;
    const entityIndex = (0, entity_index_1.getEntityIndex)();
    const newsEntityContexts = (0, entity_extraction_1.extractEntitiesFromClusters)(events);
    const previousHistory = previousSnapshot?.topicVelocityHistory ?? new Map();
    const currentHistory = new Map();
    const topicUniverse = new Set([
        ...previousHistory.keys(),
        ...newsTopics.keys(),
    ]);
    for (const topic of topicUniverse) {
        const prior = pruneVelocityHistory(previousHistory.get(topic) ?? [], now);
        const updated = [...prior, { timestamp: now, velocity: newsTopics.get(topic) ?? 0 }];
        if (updated.length > TOPIC_HISTORY_MAX_POINTS) {
            updated.splice(0, updated.length - TOPIC_HISTORY_MAX_POINTS);
        }
        currentHistory.set(topic, updated);
    }
    const currentSnapshot = {
        newsVelocity: newsTopics,
        marketChanges: new Map(markets.map(m => [m.symbol, m.change ?? 0])),
        predictionChanges: new Map(predictions.map(p => [p.title.slice(0, 50), p.yesPrice])),
        topicVelocityHistory: currentHistory,
        timestamp: now,
    };
    if (!previousSnapshot) {
        return { signals: [], snapshot: currentSnapshot };
    }
    // Detect prediction shifts
    for (const pred of predictions) {
        const key = pred.title.slice(0, 50);
        const prev = previousSnapshot.predictionChanges.get(key);
        if (prev !== undefined) {
            const shift = Math.abs(pred.yesPrice - prev);
            if (shift >= analysis_constants_1.PREDICTION_SHIFT_THRESHOLD) {
                const related = (0, analysis_constants_1.findRelatedTopics)(pred.title);
                const newsActivity = related.reduce((sum, t) => sum + (newsTopics.get(t) ?? 0), 0);
                const dedupeKey = (0, analysis_constants_1.generateDedupeKey)('prediction_leads_news', key, shift);
                if (newsActivity < analysis_constants_1.NEWS_VELOCITY_THRESHOLD && !isRecentDuplicate(dedupeKey)) {
                    markSignalSeen(dedupeKey);
                    signals.push({
                        id: (0, analysis_constants_1.generateSignalId)(),
                        type: 'prediction_leads_news',
                        title: 'Prediction Market Shift',
                        description: `"${pred.title.slice(0, 60)}..." moved ${shift > 0 ? '+' : ''}${shift.toFixed(1)}% with low news coverage`,
                        confidence: Math.min(0.9, 0.5 + shift / 20),
                        timestamp: new Date(),
                        data: {
                            predictionShift: shift,
                            newsVelocity: newsActivity,
                            relatedTopics: related,
                        },
                    });
                }
            }
        }
    }
    // Detect news velocity spikes
    for (const [topic, velocity] of newsTopics) {
        if (analysis_constants_1.SUPPRESSED_TRENDING_TERMS.has(topic))
            continue;
        const baselineHistory = pruneVelocityHistory(previousHistory.get(topic) ?? [], now);
        const baseline = averageVelocity(baselineHistory);
        const exceedsAbsoluteThreshold = velocity > analysis_constants_1.NEWS_VELOCITY_THRESHOLD * 2;
        const exceedsBaseline = baseline > 0
            ? velocity > baseline * TOPIC_BASELINE_SPIKE_MULTIPLIER
            : exceedsAbsoluteThreshold;
        if (!exceedsAbsoluteThreshold || !exceedsBaseline)
            continue;
        const multiplier = baseline > 0 ? velocity / baseline : 0;
        const dedupeKey = (0, analysis_constants_1.generateDedupeKey)('velocity_spike', topic, velocity);
        if (!isRecentDuplicate(dedupeKey)) {
            markSignalSeen(dedupeKey);
            const baselineText = baseline > 0
                ? `${baseline.toFixed(1)} baseline (${multiplier.toFixed(1)}x)`
                : 'cold-start baseline';
            signals.push({
                id: (0, analysis_constants_1.generateSignalId)(),
                type: 'velocity_spike',
                title: 'News Velocity Spike',
                description: `"${topic}" coverage surging: ${velocity.toFixed(1)} activity score vs ${baselineText}`,
                confidence: Math.min(0.9, 0.45 + (multiplier > 0 ? multiplier / 8 : velocity / 18)),
                timestamp: new Date(),
                data: {
                    newsVelocity: velocity,
                    relatedTopics: [topic],
                    baseline,
                    multiplier: baseline > 0 ? multiplier : undefined,
                    explanation: baseline > 0
                        ? `Velocity ${velocity.toFixed(1)} is ${multiplier.toFixed(1)}x above baseline ${baseline.toFixed(1)}`
                        : `Velocity ${velocity.toFixed(1)} exceeded cold-start threshold`,
                },
            });
        }
    }
    // Detect market moves with entity-aware news correlation
    for (const market of markets) {
        const change = Math.abs(market.change ?? 0);
        if (change < analysis_constants_1.MARKET_MOVE_THRESHOLD)
            continue;
        const entity = entityIndex.byId.get(market.symbol);
        const relatedNews = (0, entity_extraction_1.findNewsForMarketSymbol)(market.symbol, newsEntityContexts);
        if (relatedNews.length > 0) {
            const topNews = relatedNews[0];
            const dedupeKey = (0, analysis_constants_1.generateDedupeKey)('explained_market_move', market.symbol, change);
            if (!isRecentDuplicate(dedupeKey)) {
                markSignalSeen(dedupeKey);
                const direction = market.change > 0 ? '+' : '';
                signals.push({
                    id: (0, analysis_constants_1.generateSignalId)(),
                    type: 'explained_market_move',
                    title: 'Market Move Explained',
                    description: `${market.name} ${direction}${market.change.toFixed(2)}% correlates with: "${topNews.title.slice(0, 60)}..."`,
                    confidence: Math.min(0.9, 0.5 + (relatedNews.length * 0.1) + (change / 20)),
                    timestamp: new Date(),
                    data: {
                        marketChange: market.change,
                        newsVelocity: relatedNews.length,
                        correlatedEntities: [market.symbol],
                        correlatedNews: relatedNews.map(n => n.clusterId),
                        explanation: `${relatedNews.length} related news item${relatedNews.length > 1 ? 's' : ''} found`,
                    },
                });
            }
        }
        else {
            const oldRelatedNews = Array.from(newsTopics.entries())
                .filter(([k]) => market.name.toLowerCase().includes(k) || k.includes(market.symbol.toLowerCase()))
                .reduce((sum, [, v]) => sum + v, 0);
            const dedupeKey = (0, analysis_constants_1.generateDedupeKey)('silent_divergence', market.symbol, change);
            if (oldRelatedNews < 2 && !isRecentDuplicate(dedupeKey)) {
                markSignalSeen(dedupeKey);
                const searchedTerms = entity
                    ? [market.symbol, market.name, ...(entity.keywords?.slice(0, 2) ?? [])].join(', ')
                    : market.symbol;
                signals.push({
                    id: (0, analysis_constants_1.generateSignalId)(),
                    type: 'silent_divergence',
                    title: 'Silent Divergence',
                    description: `${market.name} moved ${market.change > 0 ? '+' : ''}${market.change.toFixed(2)}% - no news found for: ${searchedTerms}`,
                    confidence: Math.min(0.8, 0.4 + change / 10),
                    timestamp: new Date(),
                    data: {
                        marketChange: market.change,
                        newsVelocity: oldRelatedNews,
                        explanation: `Searched: ${searchedTerms}`,
                    },
                });
            }
        }
    }
    // Detect flow/price divergence for energy commodities
    for (const market of markets) {
        if (!analysis_constants_1.ENERGY_COMMODITY_SYMBOLS.has(market.symbol))
            continue;
        const change = market.change ?? 0;
        if (change >= analysis_constants_1.FLOW_PRICE_THRESHOLD) {
            const relatedNews = Array.from(newsTopics.entries())
                .filter(([k]) => market.name.toLowerCase().includes(k) || k.includes(market.symbol.toLowerCase()))
                .reduce((sum, [, v]) => sum + v, 0);
            const dedupeKey = (0, analysis_constants_1.generateDedupeKey)('flow_price_divergence', market.symbol, change);
            if (relatedNews < 2 && pipelineFlowMentions === 0 && !isRecentDuplicate(dedupeKey)) {
                markSignalSeen(dedupeKey);
                signals.push({
                    id: (0, analysis_constants_1.generateSignalId)(),
                    type: 'flow_price_divergence',
                    title: 'Flow/Price Divergence',
                    description: `${market.name} up ${change.toFixed(2)}% without pipeline flow news`,
                    confidence: Math.min(0.85, 0.4 + change / 8),
                    timestamp: new Date(),
                    data: {
                        marketChange: change,
                        newsVelocity: relatedNews,
                        relatedTopics: ['pipeline', market.display],
                    },
                });
            }
        }
    }
    // Add convergence and triangulation signals
    signals.push(...detectConvergence(events, getSourceType, isRecentDuplicate, markSignalSeen));
    signals.push(...detectTriangulation(events, getSourceType, isRecentDuplicate, markSignalSeen));
    signals.push(...pipelineFlowSignals);
    // Dedupe by type to avoid spam
    const uniqueSignals = signals.filter((sig, idx) => signals.findIndex(s => s.type === sig.type) === idx);
    // Only return high-confidence signals
    return {
        signals: uniqueSignals.filter(s => s.confidence >= 0.6),
        snapshot: currentSnapshot,
    };
}
