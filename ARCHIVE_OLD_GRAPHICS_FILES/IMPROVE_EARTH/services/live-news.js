"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchLiveVideoInfo = fetchLiveVideoInfo;
exports.fetchLiveVideoId = fetchLiveVideoId;
const runtime_1 = require("@/services/runtime");
const liveVideoCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
async function fetchLiveVideoInfo(channelHandle) {
    const cached = liveVideoCache.get(channelHandle);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return { videoId: cached.videoId, hlsUrl: cached.hlsUrl };
    }
    try {
        const baseUrl = (0, runtime_1.isDesktopRuntime)() ? (0, runtime_1.getRemoteApiBaseUrl)() : '';
        const res = await fetch(`${baseUrl}/api/youtube/live?channel=${encodeURIComponent(channelHandle)}`);
        if (!res.ok)
            throw new Error('API error');
        const data = await res.json();
        const videoId = data.videoId || null;
        const hlsUrl = data.hlsUrl || null;
        liveVideoCache.set(channelHandle, { videoId, hlsUrl, timestamp: Date.now() });
        return { videoId, hlsUrl };
    }
    catch (error) {
        console.warn(`[LiveNews] Failed to fetch live info for ${channelHandle}:`, error);
        return { videoId: null, hlsUrl: null };
    }
}
/** @deprecated Use fetchLiveVideoInfo instead */
async function fetchLiveVideoId(channelHandle) {
    const info = await fetchLiveVideoInfo(channelHandle);
    return info.videoId;
}
