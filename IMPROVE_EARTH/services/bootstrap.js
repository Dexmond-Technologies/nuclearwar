"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHydratedData = getHydratedData;
exports.fetchBootstrapData = fetchBootstrapData;
const hydrationCache = new Map();
function getHydratedData(key) {
    const val = hydrationCache.get(key);
    if (val !== undefined)
        hydrationCache.delete(key);
    return val;
}
async function fetchBootstrapData() {
    try {
        const resp = await fetch('/api/bootstrap', {
            signal: AbortSignal.timeout(800),
        });
        if (!resp.ok)
            return;
        const { data } = (await resp.json());
        for (const [k, v] of Object.entries(data)) {
            if (v !== null && v !== undefined) {
                hydrationCache.set(k, v);
            }
        }
    }
    catch {
        // silent — panels fall through to individual calls
    }
}
