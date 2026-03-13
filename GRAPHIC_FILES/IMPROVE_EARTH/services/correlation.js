"use strict";
/**
 * Correlation analysis service - main thread wrapper.
 * Core logic is in analysis-core.ts (shared with worker).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeCorrelations = analyzeCorrelations;
exports.getRecentSignals = getRecentSignals;
exports.addToSignalHistory = addToSignalHistory;
const feeds_1 = require("@/config/feeds");
const analysis_core_1 = require("./analysis-core");
// Main-thread state management
let previousSnapshot = null;
const signalHistory = [];
const recentSignalKeys = new Map();
const DEFAULT_DEDUPE_TTL = 30 * 60 * 1000;
const DEDUPE_TTLS = {
    silent_divergence: 6 * 60 * 60 * 1000,
    flow_price_divergence: 6 * 60 * 60 * 1000,
    explained_market_move: 6 * 60 * 60 * 1000,
    prediction_leads_news: 2 * 60 * 60 * 1000,
    keyword_spike: 30 * 60 * 1000,
};
function getDedupeType(key) {
    return key.split(':')[0] || 'default';
}
function isRecentDuplicate(key) {
    const seen = recentSignalKeys.get(key);
    if (!seen)
        return false;
    const type = getDedupeType(key);
    const ttl = DEDUPE_TTLS[type] ?? DEFAULT_DEDUPE_TTL;
    return Date.now() - seen < ttl;
}
function markSignalSeen(key) {
    recentSignalKeys.set(key, Date.now());
    if (recentSignalKeys.size > 500) {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        for (const [k, t] of recentSignalKeys) {
            if (t < cutoff)
                recentSignalKeys.delete(k);
        }
    }
}
function analyzeCorrelations(events, predictions, markets) {
    const getSourceTypeFn = (source) => (0, feeds_1.getSourceType)(source);
    const { signals, snapshot } = (0, analysis_core_1.analyzeCorrelationsCore)(events, predictions, markets, previousSnapshot, getSourceTypeFn, isRecentDuplicate, markSignalSeen);
    previousSnapshot = snapshot;
    return signals;
}
function getRecentSignals() {
    const cutoff = Date.now() - 30 * 60 * 1000;
    return signalHistory.filter(s => s.timestamp.getTime() > cutoff);
}
function addToSignalHistory(signals) {
    signalHistory.push(...signals);
    while (signalHistory.length > 100) {
        signalHistory.shift();
    }
    if (signals.length > 0) {
        document.dispatchEvent(new CustomEvent('wm:intelligence-updated'));
    }
}
