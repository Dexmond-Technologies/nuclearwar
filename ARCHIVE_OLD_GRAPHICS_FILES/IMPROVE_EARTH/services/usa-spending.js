"use strict";
/**
 * USASpending.gov API Service
 * Tracks federal government contracts and awards
 * Free API - no key required
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchRecentAwards = fetchRecentAwards;
exports.formatAwardAmount = formatAwardAmount;
exports.getAwardTypeIcon = getAwardTypeIcon;
const data_freshness_1 = require("./data-freshness");
const API_BASE = 'https://api.usaspending.gov/api/v2';
// Award type code mapping
const AWARD_TYPE_MAP = {
    'A': 'contract', 'B': 'contract', 'C': 'contract', 'D': 'contract',
    '02': 'grant', '03': 'grant', '04': 'grant', '05': 'grant',
    '06': 'grant', '10': 'grant',
    '07': 'loan', '08': 'loan',
};
function getDateDaysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
}
function getToday() {
    return new Date().toISOString().split('T')[0];
}
// Input validation bounds
const MAX_DAYS_BACK = 90;
const MIN_DAYS_BACK = 1;
const MAX_LIMIT = 50;
const MIN_LIMIT = 1;
function validateDaysBack(val) {
    return Math.max(MIN_DAYS_BACK, Math.min(MAX_DAYS_BACK, Math.floor(val)));
}
function validateLimit(val) {
    return Math.max(MIN_LIMIT, Math.min(MAX_LIMIT, Math.floor(val)));
}
/**
 * Fetch recent government awards/contracts
 */
async function fetchRecentAwards(options = {}) {
    const daysBack = validateDaysBack(options.daysBack ?? 7);
    const limit = validateLimit(options.limit ?? 15);
    const awardTypes = options.awardTypes ?? ['contract'];
    const periodStart = getDateDaysAgo(daysBack);
    const periodEnd = getToday();
    // Map award types to codes
    const awardTypeCodes = [];
    if (awardTypes.includes('contract'))
        awardTypeCodes.push('A', 'B', 'C', 'D');
    if (awardTypes.includes('grant'))
        awardTypeCodes.push('02', '03', '04', '05', '06', '10');
    if (awardTypes.includes('loan'))
        awardTypeCodes.push('07', '08');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
        const response = await fetch(`${API_BASE}/search/spending_by_award/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
                filters: {
                    time_period: [{ start_date: periodStart, end_date: periodEnd }],
                    award_type_codes: awardTypeCodes,
                },
                fields: [
                    'Award ID',
                    'Recipient Name',
                    'Award Amount',
                    'Awarding Agency',
                    'Description',
                    'Start Date',
                    'Award Type',
                ],
                limit,
                order: 'desc',
                sort: 'Award Amount',
            }),
        });
        if (!response.ok) {
            throw new Error(`USASpending API error: ${response.status}`);
        }
        const data = await response.json();
        const results = data.results || [];
        const awards = results.map((r) => ({
            id: String(r['Award ID'] || ''),
            recipientName: String(r['Recipient Name'] || 'Unknown'),
            amount: Number(r['Award Amount']) || 0,
            agency: String(r['Awarding Agency'] || 'Unknown'),
            description: String(r['Description'] || '').slice(0, 200),
            startDate: String(r['Start Date'] || ''),
            awardType: AWARD_TYPE_MAP[String(r['Award Type'] || '')] || 'other',
        }));
        const totalAmount = awards.reduce((sum, a) => sum + a.amount, 0);
        // Record data freshness
        if (awards.length > 0) {
            data_freshness_1.dataFreshness.recordUpdate('spending', awards.length);
        }
        return {
            awards,
            totalAmount,
            periodStart,
            periodEnd,
            fetchedAt: new Date(),
        };
    }
    catch (error) {
        console.error('[USASpending] Fetch failed:', error);
        data_freshness_1.dataFreshness.recordError('spending', error instanceof Error ? error.message : 'Unknown error');
        return {
            awards: [],
            totalAmount: 0,
            periodStart,
            periodEnd,
            fetchedAt: new Date(),
        };
    }
    finally {
        clearTimeout(timeout);
    }
}
/**
 * Format currency for display
 */
function formatAwardAmount(amount) {
    if (amount >= 1000000000) {
        return `$${(amount / 1000000000).toFixed(1)}B`;
    }
    if (amount >= 1000000) {
        return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
        return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount.toFixed(0)}`;
}
/**
 * Get award type emoji
 */
function getAwardTypeIcon(type) {
    switch (type) {
        case 'contract': return '📄';
        case 'grant': return '🎁';
        case 'loan': return '💰';
        default: return '📋';
    }
}
