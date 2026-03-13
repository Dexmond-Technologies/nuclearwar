"use strict";
/**
 * Unified market service module -- replaces legacy service:
 *   - src/services/markets.ts (Finnhub + Yahoo + CoinGecko)
 *
 * All data now flows through the MarketServiceClient RPCs.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchMultipleStocks = fetchMultipleStocks;
exports.fetchStockQuote = fetchStockQuote;
exports.fetchCrypto = fetchCrypto;
const service_client_1 = require("@/generated/client/worldmonitor/market/v1/service_client");
const utils_1 = require("@/utils");
// ---- Client + Circuit Breakers ----
const client = new service_client_1.MarketServiceClient('', { fetch: (...args) => globalThis.fetch(...args) });
const stockBreaker = (0, utils_1.createCircuitBreaker)({ name: 'Market Quotes', cacheTtlMs: 0 });
const cryptoBreaker = (0, utils_1.createCircuitBreaker)({ name: 'Crypto Quotes' });
const emptyStockFallback = { quotes: [], finnhubSkipped: false, skipReason: '', rateLimited: false };
const emptyCryptoFallback = { quotes: [] };
// ---- Proto -> legacy adapters ----
function toMarketData(proto, meta) {
    return {
        symbol: proto.symbol,
        name: meta?.name || proto.name,
        display: meta?.display || proto.display || proto.symbol,
        price: proto.price != null ? proto.price : null,
        change: proto.change ?? null,
        sparkline: proto.sparkline.length > 0 ? proto.sparkline : undefined,
    };
}
function toCryptoData(proto) {
    return {
        name: proto.name,
        symbol: proto.symbol,
        price: proto.price,
        change: proto.change,
        sparkline: proto.sparkline.length > 0 ? proto.sparkline : undefined,
    };
}
// ========================================================================
// Stocks -- replaces fetchMultipleStocks + fetchStockQuote
// ========================================================================
const lastSuccessfulByKey = new Map();
function symbolSetKey(symbols) {
    return [...symbols].sort().join(',');
}
async function fetchMultipleStocks(symbols, options = {}) {
    // All symbols go through listMarketQuotes (handler handles Yahoo vs Finnhub routing internally)
    const allSymbolStrings = symbols.map((s) => s.symbol);
    const setKey = symbolSetKey(allSymbolStrings);
    const symbolMetaMap = new Map(symbols.map((s) => [s.symbol, s]));
    const resp = await stockBreaker.execute(async () => {
        return client.listMarketQuotes({ symbols: allSymbolStrings });
    }, emptyStockFallback);
    const results = resp.quotes.map((q) => {
        const meta = symbolMetaMap.get(q.symbol);
        return toMarketData(q, meta);
    });
    // Fire onBatch with whatever we got
    if (results.length > 0) {
        options.onBatch?.(results);
    }
    if (results.length > 0) {
        lastSuccessfulByKey.set(setKey, results);
    }
    const data = results.length > 0 ? results : (lastSuccessfulByKey.get(setKey) || []);
    return {
        data,
        skipped: resp.finnhubSkipped || undefined,
        reason: resp.skipReason || undefined,
        rateLimited: resp.rateLimited || undefined,
    };
}
async function fetchStockQuote(symbol, name, display) {
    const result = await fetchMultipleStocks([{ symbol, name, display }]);
    return result.data[0] || { symbol, name, display, price: null, change: null };
}
// ========================================================================
// Crypto -- replaces fetchCrypto
// ========================================================================
let lastSuccessfulCrypto = [];
async function fetchCrypto() {
    const resp = await cryptoBreaker.execute(async () => {
        return client.listCryptoQuotes({ ids: [] }); // empty = all defaults
    }, emptyCryptoFallback);
    const results = resp.quotes
        .map(toCryptoData)
        .filter(c => c.price > 0);
    if (results.length > 0) {
        lastSuccessfulCrypto = results;
        return results;
    }
    return lastSuccessfulCrypto;
}
