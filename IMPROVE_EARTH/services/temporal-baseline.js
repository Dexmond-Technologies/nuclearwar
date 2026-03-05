"use strict";
// Temporal Anomaly Detection Service
// Detects when current activity levels deviate from historical baselines
// Backed by InfrastructureService RPCs (GetTemporalBaseline, RecordBaselineSnapshot)
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportMetrics = reportMetrics;
exports.checkAnomaly = checkAnomaly;
exports.updateAndCheck = updateAndCheck;
const service_client_1 = require("@/generated/client/worldmonitor/infrastructure/v1/service_client");
const client = new service_client_1.InfrastructureServiceClient('', { fetch: (...args) => globalThis.fetch(...args) });
const TYPE_LABELS = {
    military_flights: 'Military flights',
    vessels: 'Naval vessels',
    protests: 'Protests',
    news: 'News velocity',
    ais_gaps: 'Dark ship activity',
    satellite_fires: 'Satellite fire detections',
};
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
function formatAnomalyMessage(type, _region, count, mean, multiplier) {
    const now = new Date();
    const weekday = WEEKDAY_NAMES[now.getUTCDay()];
    const month = MONTH_NAMES[now.getUTCMonth() + 1];
    const mult = multiplier < 10 ? `${multiplier.toFixed(1)}x` : `${Math.round(multiplier)}x`;
    return `${TYPE_LABELS[type]} ${mult} normal for ${weekday} (${month}) — ${count} vs baseline ${Math.round(mean)}`;
}
function getSeverity(zScore) {
    if (zScore >= 3.0)
        return 'critical';
    if (zScore >= 2.0)
        return 'high';
    return 'medium';
}
// Fire-and-forget baseline update
async function reportMetrics(updates) {
    try {
        await client.recordBaselineSnapshot({ updates });
    }
    catch (e) {
        console.warn('[TemporalBaseline] Update failed:', e);
    }
}
// Check for anomaly (returns null if learning or normal)
async function checkAnomaly(type, region, count) {
    try {
        const data = await client.getTemporalBaseline({ type, region, count });
        if (!data.anomaly)
            return null;
        return {
            type,
            region,
            currentCount: count,
            expectedCount: Math.round(data.baseline?.mean ?? 0),
            zScore: data.anomaly.zScore,
            severity: getSeverity(data.anomaly.zScore),
            message: formatAnomalyMessage(type, region, count, data.baseline?.mean ?? 0, data.anomaly.multiplier),
        };
    }
    catch (e) {
        console.warn('[TemporalBaseline] Check failed:', e);
        return null;
    }
}
// Batch: report metrics AND check for anomalies in one flow
async function updateAndCheck(metrics) {
    // Fire-and-forget the update
    reportMetrics(metrics).catch(() => { });
    // Check anomalies in parallel
    const results = await Promise.allSettled(metrics.map(m => checkAnomaly(m.type, m.region, m.count)));
    return results
        .filter((r) => r.status === 'fulfilled')
        .map(r => r.value)
        .filter((a) => a !== null)
        .sort((a, b) => b.zScore - a.zScore);
}
