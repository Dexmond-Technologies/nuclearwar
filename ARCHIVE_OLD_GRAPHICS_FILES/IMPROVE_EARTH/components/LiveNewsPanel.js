"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveNewsPanel = exports.BUILTIN_IDS = exports.OPTIONAL_CHANNEL_REGIONS = exports.OPTIONAL_LIVE_CHANNELS = void 0;
exports.getDefaultLiveChannels = getDefaultLiveChannels;
exports.loadChannelsFromStorage = loadChannelsFromStorage;
exports.saveChannelsToStorage = saveChannelsToStorage;
const Panel_1 = require("./Panel");
const live_news_1 = require("@/services/live-news");
const runtime_1 = require("@/services/runtime");
const i18n_1 = require("../services/i18n");
const utils_1 = require("@/utils");
const config_1 = require("@/config");
const ai_flow_settings_1 = require("@/services/ai-flow-settings");
// Full variant: World news channels (24/7 live streams)
const FULL_LIVE_CHANNELS = [
    { id: 'bloomberg', name: 'Bloomberg', handle: '@markets', fallbackVideoId: 'iEpJwprxDdk' },
    { id: 'sky', name: 'SkyNews', handle: '@SkyNews', fallbackVideoId: 'uvviIF4725I' },
    { id: 'euronews', name: 'Euronews', handle: '@euronews', fallbackVideoId: 'pykpO5kQJ98' },
    { id: 'dw', name: 'DW', handle: '@DWNews', fallbackVideoId: 'LuKwFajn37U' },
    { id: 'cnbc', name: 'CNBC', handle: '@CNBC', fallbackVideoId: '9NyxcX3rhQs' },
    { id: 'france24', name: 'France24', handle: '@France24_en', fallbackVideoId: 'Ap-UM1O9RBU' },
    { id: 'alarabiya', name: 'AlArabiya', handle: '@AlArabiya', fallbackVideoId: 'n7eQejkXbnM', useFallbackOnly: true },
    { id: 'aljazeera', name: 'AlJazeera', handle: '@AlJazeeraEnglish', fallbackVideoId: 'gCNeDWCI0vo', useFallbackOnly: true },
];
// Tech variant: Tech & business channels
const TECH_LIVE_CHANNELS = [
    { id: 'bloomberg', name: 'Bloomberg', handle: '@markets', fallbackVideoId: 'iEpJwprxDdk' },
    { id: 'yahoo', name: 'Yahoo Finance', handle: '@YahooFinance', fallbackVideoId: 'KQp-e_XQnDE' },
    { id: 'cnbc', name: 'CNBC', handle: '@CNBC', fallbackVideoId: '9NyxcX3rhQs' },
    { id: 'nasa', name: 'Sen Space Live', handle: '@NASA', fallbackVideoId: 'aB1yRz0HhdY', useFallbackOnly: true },
];
// Optional channels users can add from the "Available Channels" tab UI
exports.OPTIONAL_LIVE_CHANNELS = [
    // North America
    { id: 'livenow-fox', name: 'LiveNOW from FOX', handle: '@LiveNOWfromFOX' },
    { id: 'fox-news', name: 'Fox News', handle: '@FoxNews', fallbackVideoId: 'QaftgYkG-ek', useFallbackOnly: true },
    { id: 'newsmax', name: 'Newsmax', handle: '@NEWSMAX', fallbackVideoId: 'S-lFBzloL2Y', useFallbackOnly: true },
    { id: 'abc-news', name: 'ABC News', handle: '@ABCNews' },
    { id: 'cbs-news', name: 'CBS News', handle: '@CBSNews', fallbackVideoId: 'R9L8sDK8iEc' },
    { id: 'nbc-news', name: 'NBC News', handle: '@NBCNews', fallbackVideoId: 'yMr0neQhu6c' },
    { id: 'cbc-news', name: 'CBC News', handle: '@CBCNews', fallbackVideoId: 'jxP_h3V-Dv8' },
    // Europe
    { id: 'bbc-news', name: 'BBC News', handle: '@BBCNews', fallbackVideoId: 'bjgQzJzCZKs' },
    { id: 'france24-en', name: 'France 24 English', handle: '@France24_en', fallbackVideoId: 'Ap-UM1O9RBU' },
    { id: 'welt', name: 'WELT', handle: '@WELTVideoTV', fallbackVideoId: 'L-TNmYmaAKQ' },
    { id: 'rtve', name: 'RTVE 24H', handle: '@RTVENoticias', fallbackVideoId: '7_srED6k0bE' },
    { id: 'trt-haber', name: 'TRT Haber', handle: '@trthaber', fallbackVideoId: '3XHebGJG0bc' },
    { id: 'ntv-turkey', name: 'NTV', handle: '@NTV', fallbackVideoId: 'pqq5c6k70kk' },
    { id: 'cnn-turk', name: 'CNN TURK', handle: '@cnnturk', fallbackVideoId: 'lsY4GFoj_xY' },
    { id: 'tv-rain', name: 'TV Rain', handle: '@tvrain' },
    { id: 'tvp-info', name: 'TVP Info', handle: '@tvpinfo', fallbackVideoId: '3jKb-uThfrg' },
    { id: 'telewizja-republika', name: 'Telewizja Republika', handle: '@Telewizja_Republika', fallbackVideoId: 'dzntyCTgJMQ' },
    // Latin America & Portuguese
    { id: 'cnn-brasil', name: 'CNN Brasil', handle: '@CNNbrasil', fallbackVideoId: 'qcTn899skkc' },
    { id: 'jovem-pan', name: 'Jovem Pan News', handle: '@jovempannews' },
    { id: 'record-news', name: 'Record News', handle: '@RecordNews' },
    { id: 'band-jornalismo', name: 'Band Jornalismo', handle: '@BandJornalismo' },
    { id: 'tn-argentina', name: 'TN (Todo Noticias)', handle: '@todonoticias', fallbackVideoId: 'cb12KmMMDJA' },
    { id: 'c5n', name: 'C5N', handle: '@c5n', fallbackVideoId: 'SF06Qy1Ct6Y' },
    { id: 'milenio', name: 'MILENIO', handle: '@MILENIO' },
    { id: 'noticias-caracol', name: 'Noticias Caracol', handle: '@NoticiasCaracol' },
    { id: 'ntn24', name: 'NTN24', handle: '@NTN24' },
    { id: 't13', name: 'T13', handle: '@Teletrece' },
    // Asia
    { id: 'tbs-news', name: 'TBS NEWS DIG', handle: '@tbsnewsdig', fallbackVideoId: 'aUDm173E8k8' },
    { id: 'ann-news', name: 'ANN News', handle: '@ANNnewsCH' },
    { id: 'ntv-news', name: 'NTV News (Japan)', handle: '@ntv_news' },
    { id: 'cti-news', name: 'CTI News (Taiwan)', handle: '@中天新聞CtiNews', fallbackVideoId: 'wUPPkSANpyo', useFallbackOnly: true },
    { id: 'wion', name: 'WION', handle: '@WION' },
    { id: 'vtc-now', name: 'VTC NOW', handle: '@VTCNowOfficial' },
    { id: 'cna-asia', name: 'CNA (NewsAsia)', handle: '@channelnewsasia', fallbackVideoId: 'XWq5kBlakcQ' },
    { id: 'nhk-world', name: 'NHK World Japan', handle: '@NHKWORLDJAPAN' },
    // Middle East
    { id: 'al-hadath', name: 'Al Hadath', handle: '@AlHadath', fallbackVideoId: 'xWXpl7azI8k', useFallbackOnly: true },
    { id: 'sky-news-arabia', name: 'Sky News Arabia', handle: '@skynewsarabia', fallbackVideoId: 'U--OjmpjF5o' },
    { id: 'trt-world', name: 'TRT World', handle: '@TRTWorld', fallbackVideoId: 'ABfFhWzWs0s' },
    { id: 'iran-intl', name: 'Iran International', handle: '@IranIntl' },
    { id: 'cgtn-arabic', name: 'CGTN Arabic', handle: '@CGTNArabic' },
    // Africa
    { id: 'africanews', name: 'Africanews', handle: '@africanews' },
    { id: 'channels-tv', name: 'Channels TV', handle: '@ChannelsTelevision' },
    { id: 'ktn-news', name: 'KTN News', handle: '@ktnnews_kenya', fallbackVideoId: 'RmHtsdVb3mo' },
    { id: 'enca', name: 'eNCA', handle: '@eNCA' },
    { id: 'sabc-news', name: 'SABC News', handle: '@SABCDigitalNews' },
];
exports.OPTIONAL_CHANNEL_REGIONS = [
    { key: 'na', labelKey: 'components.liveNews.regionNorthAmerica', channelIds: ['livenow-fox', 'fox-news', 'newsmax', 'abc-news', 'cbs-news', 'nbc-news', 'cbc-news'] },
    { key: 'eu', labelKey: 'components.liveNews.regionEurope', channelIds: ['bbc-news', 'france24-en', 'welt', 'rtve', 'trt-haber', 'ntv-turkey', 'cnn-turk', 'tv-rain', 'tvp-info', 'telewizja-republika'] },
    { key: 'latam', labelKey: 'components.liveNews.regionLatinAmerica', channelIds: ['cnn-brasil', 'jovem-pan', 'record-news', 'band-jornalismo', 'tn-argentina', 'c5n', 'milenio', 'noticias-caracol', 'ntn24', 't13'] },
    { key: 'asia', labelKey: 'components.liveNews.regionAsia', channelIds: ['tbs-news', 'ann-news', 'ntv-news', 'cti-news', 'wion', 'vtc-now', 'cna-asia', 'nhk-world'] },
    { key: 'me', labelKey: 'components.liveNews.regionMiddleEast', channelIds: ['al-hadath', 'sky-news-arabia', 'trt-world', 'iran-intl', 'cgtn-arabic'] },
    { key: 'africa', labelKey: 'components.liveNews.regionAfrica', channelIds: ['africanews', 'channels-tv', 'ktn-news', 'enca', 'sabc-news'] },
];
const DEFAULT_LIVE_CHANNELS = config_1.SITE_VARIANT === 'tech' ? TECH_LIVE_CHANNELS : config_1.SITE_VARIANT === 'happy' ? [] : FULL_LIVE_CHANNELS;
/** Default channel list for the current variant (for restore in channel management). */
function getDefaultLiveChannels() {
    return [...DEFAULT_LIVE_CHANNELS];
}
const DEFAULT_STORED = {
    order: DEFAULT_LIVE_CHANNELS.map((c) => c.id),
};
const DIRECT_HLS_MAP = {
    'sky': 'https://linear901-oo-hls0-prd-gtm.delivery.skycdp.com/17501/sde-fast-skynews/master.m3u8',
    'euronews': 'https://dash4.antik.sk/live/test_euronews/playlist.m3u8',
    'dw': 'https://dwamdstream103.akamaized.net/hls/live/2015526/dwstream103/master.m3u8',
    'france24': 'https://amg00106-france24-france24-samsunguk-qvpp8.amagi.tv/playlist/amg00106-france24-france24-samsunguk/playlist.m3u8',
    'alarabiya': 'https://live.alarabiya.net/alarabiapublish/alarabiya.smil/playlist.m3u8',
    // aljazeera: geo-blocked in many regions, use YouTube fallback
    'cbs-news': 'https://cbsn-us.cbsnstream.cbsnews.com/out/v1/55a8648e8f134e82a470f83d562deeca/master.m3u8',
    'trt-world': 'https://tv-trtworld.medya.trt.com.tr/master.m3u8',
    'sky-news-arabia': 'https://live-stream.skynewsarabia.com/c-horizontal-channel/horizontal-stream/index.m3u8',
    'al-hadath': 'https://av.alarabiya.net/alarabiapublish/alhadath.smil/playlist.m3u8',
};
if (import.meta.env.DEV) {
    const allChannels = [...FULL_LIVE_CHANNELS, ...TECH_LIVE_CHANNELS, ...exports.OPTIONAL_LIVE_CHANNELS];
    for (const id of Object.keys(DIRECT_HLS_MAP)) {
        const ch = allChannels.find(c => c.id === id);
        if (!ch)
            console.error(`[LiveNews] DIRECT_HLS_MAP key '${id}' has no matching channel`);
        else if (!ch.fallbackVideoId)
            console.error(`[LiveNews] Channel '${id}' in DIRECT_HLS_MAP lacks fallbackVideoId`);
    }
}
exports.BUILTIN_IDS = new Set([
    ...FULL_LIVE_CHANNELS.map((c) => c.id),
    ...TECH_LIVE_CHANNELS.map((c) => c.id),
    ...exports.OPTIONAL_LIVE_CHANNELS.map((c) => c.id),
]);
function loadChannelsFromStorage() {
    const stored = (0, utils_1.loadFromStorage)(config_1.STORAGE_KEYS.liveChannels, DEFAULT_STORED);
    const order = stored.order?.length ? stored.order : DEFAULT_STORED.order;
    const channelMap = new Map();
    for (const c of FULL_LIVE_CHANNELS)
        channelMap.set(c.id, { ...c });
    for (const c of TECH_LIVE_CHANNELS)
        channelMap.set(c.id, { ...c });
    for (const c of exports.OPTIONAL_LIVE_CHANNELS)
        channelMap.set(c.id, { ...c });
    for (const c of stored.custom ?? []) {
        if (c.id && c.handle)
            channelMap.set(c.id, { ...c });
    }
    const overrides = stored.displayNameOverrides ?? {};
    for (const [id, name] of Object.entries(overrides)) {
        const ch = channelMap.get(id);
        if (ch)
            ch.name = name;
    }
    const result = [];
    for (const id of order) {
        const ch = channelMap.get(id);
        if (ch)
            result.push(ch);
    }
    return result;
}
function saveChannelsToStorage(channels) {
    const order = channels.map((c) => c.id);
    const custom = channels.filter((c) => !exports.BUILTIN_IDS.has(c.id));
    const builtinNames = new Map();
    for (const c of [...FULL_LIVE_CHANNELS, ...TECH_LIVE_CHANNELS, ...exports.OPTIONAL_LIVE_CHANNELS])
        builtinNames.set(c.id, c.name);
    const displayNameOverrides = {};
    for (const c of channels) {
        if (builtinNames.has(c.id) && c.name !== builtinNames.get(c.id)) {
            displayNameOverrides[c.id] = c.name;
        }
    }
    (0, utils_1.saveToStorage)(config_1.STORAGE_KEYS.liveChannels, { order, custom, displayNameOverrides });
}
class LiveNewsPanel extends Panel_1.Panel {
    constructor() {
        super({ id: 'live-news', title: (0, i18n_1.t)('panels.liveNews'), className: 'panel-wide' });
        this.channels = [];
        this.channelSwitcher = null;
        this.isMuted = true;
        this.isPlaying = true;
        this.wasPlayingBeforeIdle = true;
        this.muteBtn = null;
        this.liveBtn = null;
        this.idleTimeout = null;
        this.IDLE_PAUSE_MS = 5 * 60 * 1000; // 5 minutes
        // YouTube Player API state
        this.player = null;
        this.playerContainer = null;
        this.playerElement = null;
        this.isPlayerReady = false;
        this.currentVideoId = null;
        this.forceFallbackVideoForNextInit = false;
        // Desktop: always use sidecar embed for YouTube (tauri:// origin gets 153).
        // DIRECT_HLS_MAP channels use native <video> instead.
        this.useDesktopEmbedProxy = (0, runtime_1.isDesktopRuntime)();
        this.desktopEmbedIframe = null;
        this.desktopEmbedRenderToken = 0;
        this.suppressChannelClick = false;
        this.muteSyncInterval = null;
        // Bot-check detection: if player doesn't become ready within this timeout,
        // YouTube is likely showing "Sign in to confirm you're not a bot".
        this.botCheckTimeout = null;
        // Native HLS <video> element for desktop playback (bypasses iframe/cookie issues)
        this.nativeVideoElement = null;
        this.hlsFailureCooldown = new Map();
        this.HLS_COOLDOWN_MS = 5 * 60 * 1000;
        this.deferredInit = false;
        this.lazyObserver = null;
        this.idleCallbackId = null;
        this.youtubeOrigin = LiveNewsPanel.resolveYouTubeOrigin();
        this.playerElementId = `live-news-player-${Date.now()}`;
        this.channels = loadChannelsFromStorage();
        if (this.channels.length === 0)
            this.channels = getDefaultLiveChannels();
        this.activeChannel = this.channels[0];
        this.createLiveButton();
        this.createMuteButton();
        this.createChannelSwitcher();
        this.setupBridgeMessageListener();
        this.renderPlaceholder();
        this.setupLazyInit();
        this.setupIdleDetection();
    }
    renderPlaceholder() {
        this.content.innerHTML = '';
        const container = document.createElement('div');
        container.className = 'live-news-placeholder';
        container.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:12px;cursor:pointer;';
        const label = document.createElement('div');
        label.style.cssText = 'color:var(--text-secondary);font-size:13px;';
        label.textContent = this.activeChannel.name;
        const playBtn = document.createElement('button');
        playBtn.className = 'offline-retry';
        playBtn.textContent = 'Load Player';
        playBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.triggerInit();
        });
        container.appendChild(label);
        container.appendChild(playBtn);
        container.addEventListener('click', () => this.triggerInit());
        this.content.appendChild(container);
    }
    setupLazyInit() {
        this.lazyObserver = new IntersectionObserver((entries) => {
            if (entries.some(e => e.isIntersecting)) {
                this.lazyObserver?.disconnect();
                this.lazyObserver = null;
                if ('requestIdleCallback' in window) {
                    this.idleCallbackId = window.requestIdleCallback(() => { this.idleCallbackId = null; this.triggerInit(); }, { timeout: 1000 });
                }
                else {
                    this.idleCallbackId = setTimeout(() => { this.idleCallbackId = null; this.triggerInit(); }, 1000);
                }
            }
        }, { threshold: 0.1 });
        this.lazyObserver.observe(this.element);
    }
    triggerInit() {
        if (this.deferredInit)
            return;
        this.deferredInit = true;
        if (this.lazyObserver) {
            this.lazyObserver.disconnect();
            this.lazyObserver = null;
        }
        if (this.idleCallbackId !== null) {
            if ('cancelIdleCallback' in window)
                window.cancelIdleCallback(this.idleCallbackId);
            else
                clearTimeout(this.idleCallbackId);
            this.idleCallbackId = null;
        }
        this.renderPlayer();
    }
    saveChannels() {
        saveChannelsToStorage(this.channels);
    }
    getDirectHlsUrl(channelId) {
        const url = DIRECT_HLS_MAP[channelId];
        if (!url)
            return undefined;
        const failedAt = this.hlsFailureCooldown.get(channelId);
        if (failedAt && Date.now() - failedAt < this.HLS_COOLDOWN_MS)
            return undefined;
        return url;
    }
    get embedOrigin() {
        if ((0, runtime_1.isDesktopRuntime)())
            return `http://localhost:${(0, runtime_1.getLocalApiPort)()}`;
        try {
            return new URL((0, runtime_1.getRemoteApiBaseUrl)()).origin;
        }
        catch {
            return 'https://worldmonitor.app';
        }
    }
    setupBridgeMessageListener() {
        this.boundMessageHandler = (e) => {
            if (e.source !== this.desktopEmbedIframe?.contentWindow)
                return;
            const expected = this.embedOrigin;
            const localOrigin = (0, runtime_1.getApiBaseUrl)();
            if (e.origin !== expected && (!localOrigin || e.origin !== localOrigin))
                return;
            const msg = e.data;
            if (!msg || typeof msg !== 'object' || !msg.type)
                return;
            if (msg.type === 'yt-ready') {
                this.clearBotCheckTimeout();
                this.isPlayerReady = true;
                this.syncDesktopEmbedState();
            }
            else if (msg.type === 'yt-error') {
                this.clearBotCheckTimeout();
                const code = Number(msg.code ?? 0);
                if (code === 153 && this.activeChannel.fallbackVideoId &&
                    this.activeChannel.videoId !== this.activeChannel.fallbackVideoId) {
                    this.activeChannel.videoId = this.activeChannel.fallbackVideoId;
                    this.renderDesktopEmbed(true);
                }
                else {
                    this.showEmbedError(this.activeChannel, code);
                }
            }
            else if (msg.type === 'yt-mute-state') {
                const muted = msg.muted === true;
                if (this.isMuted !== muted) {
                    this.isMuted = muted;
                    this.updateMuteIcon();
                }
            }
        };
        window.addEventListener('message', this.boundMessageHandler);
    }
    static resolveYouTubeOrigin() {
        const fallbackOrigin = config_1.SITE_VARIANT === 'tech'
            ? 'https://worldmonitor.app'
            : 'https://worldmonitor.app';
        try {
            const { protocol, origin, host } = window.location;
            if (protocol === 'http:' || protocol === 'https:') {
                // Desktop webviews commonly run from tauri.localhost which can trigger
                // YouTube embed restrictions. Use canonical public origin instead.
                if (host === 'tauri.localhost' || host.endsWith('.tauri.localhost')) {
                    return fallbackOrigin;
                }
                return origin;
            }
            if (protocol === 'tauri:' || protocol === 'asset:') {
                return fallbackOrigin;
            }
        }
        catch {
            // Ignore invalid location values.
        }
        return fallbackOrigin;
    }
    setupIdleDetection() {
        // Suspend idle timer when hidden, resume when visible
        this.boundVisibilityHandler = () => {
            if (document.hidden) {
                // Suspend idle timer so background playback isn't killed
                if (this.idleTimeout)
                    clearTimeout(this.idleTimeout);
            }
            else {
                this.resumeFromIdle();
                this.boundIdleResetHandler();
            }
        };
        document.addEventListener('visibilitychange', this.boundVisibilityHandler);
        // Track user activity to detect idle (pauses after 5 min inactivity)
        this.boundIdleResetHandler = () => {
            if (this.idleTimeout)
                clearTimeout(this.idleTimeout);
            this.resumeFromIdle();
            this.idleTimeout = setTimeout(() => this.pauseForIdle(), this.IDLE_PAUSE_MS);
        };
        ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'].forEach(event => {
            document.addEventListener(event, this.boundIdleResetHandler, { passive: true });
        });
        // Start the idle timer
        this.boundIdleResetHandler();
    }
    pauseForIdle() {
        if (this.isPlaying) {
            this.wasPlayingBeforeIdle = true;
            this.isPlaying = false;
            this.updateLiveIndicator();
        }
        this.destroyPlayer();
    }
    stopMuteSyncPolling() {
        if (this.muteSyncInterval !== null) {
            clearInterval(this.muteSyncInterval);
            this.muteSyncInterval = null;
        }
    }
    startMuteSyncPolling() {
        this.stopMuteSyncPolling();
        this.muteSyncInterval = setInterval(() => this.syncMuteStateFromPlayer(), LiveNewsPanel.MUTE_SYNC_POLL_MS);
    }
    syncMuteStateFromPlayer() {
        if (this.useDesktopEmbedProxy || !this.player || !this.isPlayerReady)
            return;
        const p = this.player;
        const muted = typeof p.isMuted === 'function'
            ? p.isMuted()
            : (p.getVolume?.() === 0);
        if (typeof muted === 'boolean' && muted !== this.isMuted) {
            this.isMuted = muted;
            this.updateMuteIcon();
        }
    }
    destroyPlayer() {
        this.clearBotCheckTimeout();
        this.stopMuteSyncPolling();
        if (this.player) {
            if (typeof this.player.destroy === 'function')
                this.player.destroy();
            this.player = null;
        }
        if (this.nativeVideoElement) {
            this.nativeVideoElement.pause();
            this.nativeVideoElement.removeAttribute('src');
            this.nativeVideoElement.load();
            this.nativeVideoElement = null;
        }
        this.desktopEmbedIframe = null;
        this.desktopEmbedRenderToken += 1;
        this.isPlayerReady = false;
        this.currentVideoId = null;
        // Clear the container to remove player/iframe
        if (this.playerContainer) {
            this.playerContainer.innerHTML = '';
            if (!this.useDesktopEmbedProxy) {
                // Recreate player element for JS API mode
                this.playerElement = document.createElement('div');
                this.playerElement.id = this.playerElementId;
                this.playerContainer.appendChild(this.playerElement);
            }
            else {
                this.playerElement = null;
            }
        }
    }
    resumeFromIdle() {
        if (this.wasPlayingBeforeIdle && !this.isPlaying) {
            this.isPlaying = true;
            this.updateLiveIndicator();
            void this.initializePlayer();
        }
    }
    createLiveButton() {
        this.liveBtn = document.createElement('button');
        this.liveBtn.className = 'live-indicator-btn';
        this.liveBtn.title = 'Toggle playback';
        this.updateLiveIndicator();
        this.liveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePlayback();
        });
        const header = this.element.querySelector('.panel-header');
        header?.appendChild(this.liveBtn);
    }
    updateLiveIndicator() {
        if (!this.liveBtn)
            return;
        this.liveBtn.innerHTML = this.isPlaying
            ? '<span class="live-dot"></span>Live'
            : '<span class="live-dot paused"></span>Paused';
        this.liveBtn.classList.toggle('paused', !this.isPlaying);
    }
    togglePlayback() {
        this.isPlaying = !this.isPlaying;
        this.wasPlayingBeforeIdle = this.isPlaying;
        this.updateLiveIndicator();
        if (this.isPlaying && !this.player && !this.desktopEmbedIframe && !this.nativeVideoElement) {
            this.ensurePlayerContainer();
            void this.initializePlayer();
        }
        else {
            this.syncPlayerState();
        }
    }
    createMuteButton() {
        this.muteBtn = document.createElement('button');
        this.muteBtn.className = 'live-mute-btn';
        this.muteBtn.title = 'Toggle sound';
        this.updateMuteIcon();
        this.muteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMute();
        });
        const header = this.element.querySelector('.panel-header');
        header?.appendChild(this.muteBtn);
    }
    updateMuteIcon() {
        if (!this.muteBtn)
            return;
        this.muteBtn.innerHTML = this.isMuted
            ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>'
            : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';
        this.muteBtn.classList.toggle('unmuted', !this.isMuted);
    }
    toggleMute() {
        this.isMuted = !this.isMuted;
        this.updateMuteIcon();
        this.syncPlayerState();
    }
    /** Creates a single channel tab button with click and drag handlers. */
    createChannelButton(channel) {
        const btn = document.createElement('button');
        btn.className = `live-channel-btn ${channel.id === this.activeChannel.id ? 'active' : ''}`;
        btn.dataset.channelId = channel.id;
        btn.textContent = channel.name;
        btn.style.cursor = 'grab';
        btn.addEventListener('click', (e) => {
            if (this.suppressChannelClick) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            e.preventDefault();
            this.switchChannel(channel);
        });
        return btn;
    }
    createChannelSwitcher() {
        this.channelSwitcher = document.createElement('div');
        this.channelSwitcher.className = 'live-news-switcher';
        for (const channel of this.channels) {
            this.channelSwitcher.appendChild(this.createChannelButton(channel));
        }
        // Mouse-based drag reorder (works in WKWebView/Tauri)
        let dragging = null;
        let dragStarted = false;
        let startX = 0;
        const THRESHOLD = 6;
        this.channelSwitcher.addEventListener('mousedown', (e) => {
            if (e.button !== 0)
                return;
            const btn = e.target.closest('.live-channel-btn');
            if (!btn)
                return;
            this.suppressChannelClick = false;
            dragging = btn;
            dragStarted = false;
            startX = e.clientX;
            e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (!dragging || !this.channelSwitcher)
                return;
            if (!dragStarted) {
                if (Math.abs(e.clientX - startX) < THRESHOLD)
                    return;
                dragStarted = true;
                dragging.classList.add('live-channel-dragging');
            }
            const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('.live-channel-btn');
            if (!target || target === dragging)
                return;
            const all = Array.from(this.channelSwitcher.querySelectorAll('.live-channel-btn'));
            const idx = all.indexOf(dragging);
            const targetIdx = all.indexOf(target);
            if (idx === -1 || targetIdx === -1)
                return;
            if (idx < targetIdx) {
                target.parentElement?.insertBefore(dragging, target.nextSibling);
            }
            else {
                target.parentElement?.insertBefore(dragging, target);
            }
        });
        document.addEventListener('mouseup', () => {
            if (!dragging)
                return;
            if (dragStarted) {
                dragging.classList.remove('live-channel-dragging');
                this.applyChannelOrderFromDom();
                this.suppressChannelClick = true;
                setTimeout(() => {
                    this.suppressChannelClick = false;
                }, 0);
            }
            dragging = null;
            dragStarted = false;
        });
        const toolbar = document.createElement('div');
        toolbar.className = 'live-news-toolbar';
        toolbar.appendChild(this.channelSwitcher);
        this.createManageButton(toolbar);
        this.element.insertBefore(toolbar, this.content);
    }
    createManageButton(toolbar) {
        const openBtn = document.createElement('button');
        openBtn.type = 'button';
        openBtn.className = 'live-news-settings-btn';
        openBtn.title = (0, i18n_1.t)('components.liveNews.channelSettings') ?? 'Channel Settings';
        openBtn.innerHTML =
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
        openBtn.addEventListener('click', () => {
            this.openChannelManagementModal();
        });
        toolbar.appendChild(openBtn);
    }
    openChannelManagementModal() {
        const existing = document.querySelector('.live-channels-modal-overlay');
        if (existing)
            return;
        const overlay = document.createElement('div');
        overlay.className = 'live-channels-modal-overlay';
        overlay.setAttribute('aria-modal', 'true');
        const modal = document.createElement('div');
        modal.className = 'live-channels-modal';
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'live-channels-modal-close';
        closeBtn.setAttribute('aria-label', (0, i18n_1.t)('common.close') ?? 'Close');
        closeBtn.innerHTML = '&times;';
        const container = document.createElement('div');
        modal.appendChild(closeBtn);
        modal.appendChild(container);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('active'));
        Promise.resolve().then(() => __importStar(require('@/live-channels-window'))).then(({ initLiveChannelsWindow }) => {
            initLiveChannelsWindow(container);
        });
        const close = () => {
            overlay.remove();
            this.refreshChannelsFromStorage();
        };
        closeBtn.addEventListener('click', close);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay)
                close();
        });
    }
    refreshChannelSwitcher() {
        if (!this.channelSwitcher)
            return;
        this.channelSwitcher.innerHTML = '';
        for (const channel of this.channels) {
            this.channelSwitcher.appendChild(this.createChannelButton(channel));
        }
    }
    applyChannelOrderFromDom() {
        if (!this.channelSwitcher)
            return;
        const ids = Array.from(this.channelSwitcher.querySelectorAll('.live-channel-btn'))
            .map((el) => el.dataset.channelId)
            .filter((id) => !!id);
        const orderMap = new Map(this.channels.map((c) => [c.id, c]));
        this.channels = ids.map((id) => orderMap.get(id)).filter((c) => !!c);
        this.saveChannels();
    }
    async resolveChannelVideo(channel, forceFallback = false) {
        const useFallbackVideo = channel.useFallbackOnly || forceFallback;
        if ((0, runtime_1.isDesktopRuntime)() && this.getDirectHlsUrl(channel.id)) {
            channel.videoId = channel.fallbackVideoId;
            channel.isLive = true;
            return;
        }
        if (useFallbackVideo) {
            channel.videoId = channel.fallbackVideoId;
            channel.isLive = false;
            channel.hlsUrl = undefined;
            return;
        }
        const info = await (0, live_news_1.fetchLiveVideoInfo)(channel.handle);
        channel.videoId = info.videoId || channel.fallbackVideoId;
        channel.isLive = !!info.videoId;
        channel.hlsUrl = info.hlsUrl || undefined;
    }
    async switchChannel(channel) {
        if (channel.id === this.activeChannel.id)
            return;
        this.activeChannel = channel;
        this.channelSwitcher?.querySelectorAll('.live-channel-btn').forEach(btn => {
            const btnEl = btn;
            btnEl.classList.toggle('active', btnEl.dataset.channelId === channel.id);
            if (btnEl.dataset.channelId === channel.id) {
                btnEl.classList.add('loading');
            }
        });
        await this.resolveChannelVideo(channel);
        this.channelSwitcher?.querySelectorAll('.live-channel-btn').forEach(btn => {
            const btnEl = btn;
            btnEl.classList.remove('loading');
            if (btnEl.dataset.channelId === channel.id && !channel.videoId) {
                btnEl.classList.add('offline');
            }
        });
        if ((0, runtime_1.isDesktopRuntime)() && this.getDirectHlsUrl(channel.id)) {
            this.renderNativeHlsPlayer();
            return;
        }
        if (!channel.videoId || !/^[\w-]{10,12}$/.test(channel.videoId)) {
            this.showOfflineMessage(channel);
            return;
        }
        if (this.useDesktopEmbedProxy) {
            this.renderDesktopEmbed(true);
            return;
        }
        if (!this.player) {
            this.ensurePlayerContainer();
            void this.initializePlayer();
            return;
        }
        this.syncPlayerState();
    }
    showOfflineMessage(channel) {
        this.destroyPlayer();
        this.content.innerHTML = `
      <div class="live-offline">
        <div class="offline-icon">📺</div>
        <div class="offline-text">${(0, i18n_1.t)('components.liveNews.notLive', { name: channel.name })}</div>
        <button class="offline-retry" onclick="this.closest('.panel').querySelector('.live-channel-btn.active')?.click()">${(0, i18n_1.t)('common.retry')}</button>
      </div>
    `;
    }
    showEmbedError(channel, errorCode) {
        this.destroyPlayer();
        const watchUrl = channel.videoId
            ? `https://www.youtube.com/watch?v=${encodeURIComponent(channel.videoId)}`
            : `https://www.youtube.com/${channel.handle}`;
        this.content.innerHTML = `
      <div class="live-offline">
        <div class="offline-icon">!</div>
        <div class="offline-text">${(0, i18n_1.t)('components.liveNews.cannotEmbed', { name: channel.name, code: String(errorCode) })}</div>
        <a class="offline-retry" href="${watchUrl}" target="_blank" rel="noopener noreferrer">${(0, i18n_1.t)('components.liveNews.openOnYouTube')}</a>
      </div>
    `;
    }
    renderPlayer() {
        this.ensurePlayerContainer();
        void this.initializePlayer();
    }
    ensurePlayerContainer() {
        this.deferredInit = true;
        this.content.innerHTML = '';
        this.playerContainer = document.createElement('div');
        this.playerContainer.className = 'live-news-player';
        if (!this.useDesktopEmbedProxy) {
            this.playerElement = document.createElement('div');
            this.playerElement.id = this.playerElementId;
            this.playerContainer.appendChild(this.playerElement);
        }
        else {
            this.playerElement = null;
        }
        this.content.appendChild(this.playerContainer);
    }
    postToEmbed(msg) {
        if (!this.desktopEmbedIframe?.contentWindow)
            return;
        this.desktopEmbedIframe.contentWindow.postMessage(msg, this.embedOrigin);
    }
    syncDesktopEmbedState() {
        this.postToEmbed({ type: this.isPlaying ? 'play' : 'pause' });
        this.postToEmbed({ type: this.isMuted ? 'mute' : 'unmute' });
    }
    renderDesktopEmbed(force = false) {
        if (!this.useDesktopEmbedProxy)
            return;
        void this.renderDesktopEmbedAsync(force);
    }
    async renderDesktopEmbedAsync(force = false) {
        const videoId = this.activeChannel.videoId;
        if (!videoId) {
            this.showOfflineMessage(this.activeChannel);
            return;
        }
        // Only recreate iframe when video ID changes (not for play/mute toggling).
        if (!force && this.currentVideoId === videoId && this.desktopEmbedIframe) {
            this.syncDesktopEmbedState();
            return;
        }
        const renderToken = ++this.desktopEmbedRenderToken;
        this.currentVideoId = videoId;
        this.isPlayerReady = true;
        // Always recreate if container was removed from DOM (e.g. showEmbedError replaced content).
        if (!this.playerContainer || !this.playerContainer.parentElement) {
            this.ensurePlayerContainer();
        }
        if (!this.playerContainer) {
            return;
        }
        this.playerContainer.innerHTML = '';
        // Use local sidecar embed — YouTube rejects tauri:// parent origin with error 153,
        // and Vercel WAF blocks cloud bridge iframe loads. The sidecar serves the embed from
        // http://127.0.0.1:PORT which YouTube accepts and has no WAF.
        const quality = (0, ai_flow_settings_1.getStreamQuality)();
        const params = new URLSearchParams({
            videoId,
            autoplay: this.isPlaying ? '1' : '0',
            mute: this.isMuted ? '1' : '0',
        });
        if (quality !== 'auto')
            params.set('vq', quality);
        const embedUrl = `http://localhost:${(0, runtime_1.getLocalApiPort)()}/api/youtube-embed?${params.toString()}`;
        if (renderToken !== this.desktopEmbedRenderToken) {
            return;
        }
        const iframe = document.createElement('iframe');
        iframe.className = 'live-news-embed-frame';
        iframe.src = embedUrl;
        iframe.title = `${this.activeChannel.name} live feed`;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = '0';
        iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
        iframe.allowFullscreen = true;
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        iframe.setAttribute('loading', 'eager');
        this.playerContainer.appendChild(iframe);
        this.desktopEmbedIframe = iframe;
        this.startBotCheckTimeout();
    }
    renderNativeHlsPlayer() {
        const hlsUrl = this.getDirectHlsUrl(this.activeChannel.id);
        if (!hlsUrl || !hlsUrl.startsWith('https://'))
            return;
        this.destroyPlayer();
        this.ensurePlayerContainer();
        if (!this.playerContainer)
            return;
        this.playerContainer.innerHTML = '';
        const video = document.createElement('video');
        video.className = 'live-news-native-video';
        video.src = hlsUrl;
        video.autoplay = this.isPlaying;
        video.muted = this.isMuted;
        video.playsInline = true;
        video.controls = true;
        video.setAttribute('referrerpolicy', 'no-referrer');
        video.style.cssText = 'width:100%;height:100%;object-fit:contain;background:#000';
        const failedChannel = this.activeChannel;
        video.addEventListener('error', () => {
            console.warn('[LiveNews] HLS error:', video.error?.code, video.error?.message, failedChannel.id, hlsUrl);
            video.pause();
            video.removeAttribute('src');
            this.nativeVideoElement = null;
            this.hlsFailureCooldown.set(failedChannel.id, Date.now());
            failedChannel.hlsUrl = undefined;
            if (this.activeChannel.id === failedChannel.id) {
                this.ensurePlayerContainer();
                void this.initializePlayer();
            }
        });
        video.addEventListener('volumechange', () => {
            if (!this.nativeVideoElement)
                return;
            const muted = this.nativeVideoElement.muted || this.nativeVideoElement.volume === 0;
            if (muted !== this.isMuted) {
                this.isMuted = muted;
                this.updateMuteIcon();
            }
        });
        video.addEventListener('pause', () => {
            if (!this.nativeVideoElement)
                return;
            if (this.isPlaying) {
                this.isPlaying = false;
                this.updateLiveIndicator();
            }
        });
        video.addEventListener('play', () => {
            if (!this.nativeVideoElement)
                return;
            if (!this.isPlaying) {
                this.isPlaying = true;
                this.updateLiveIndicator();
            }
        });
        this.nativeVideoElement = video;
        this.playerContainer.appendChild(video);
        this.isPlayerReady = true;
        this.currentVideoId = this.activeChannel.videoId || null;
        // WKWebView blocks autoplay without user gesture. Force muted play, then restore.
        if (this.isPlaying) {
            const wantUnmute = !this.isMuted;
            video.muted = true;
            video.play().then(() => {
                if (wantUnmute && this.nativeVideoElement === video) {
                    video.muted = false;
                }
            }).catch(() => { });
        }
    }
    syncNativeVideoState() {
        if (!this.nativeVideoElement)
            return;
        this.nativeVideoElement.muted = this.isMuted;
        if (this.isPlaying) {
            this.nativeVideoElement.play().catch(() => { });
        }
        else {
            this.nativeVideoElement.pause();
        }
    }
    static loadYouTubeApi() {
        if (LiveNewsPanel.apiPromise)
            return LiveNewsPanel.apiPromise;
        LiveNewsPanel.apiPromise = new Promise((resolve) => {
            if (window.YT?.Player) {
                resolve();
                return;
            }
            const existingScript = document.querySelector('script[data-youtube-iframe-api="true"]');
            if (existingScript) {
                if (window.YT?.Player) {
                    resolve();
                    return;
                }
                const previousReady = window.onYouTubeIframeAPIReady;
                window.onYouTubeIframeAPIReady = () => {
                    previousReady?.();
                    resolve();
                };
                return;
            }
            const previousReady = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = () => {
                previousReady?.();
                resolve();
            };
            const script = document.createElement('script');
            script.src = 'https://www.youtube.com/iframe_api';
            script.async = true;
            script.dataset.youtubeIframeApi = 'true';
            script.onerror = () => {
                console.warn('[LiveNews] YouTube IFrame API failed to load (ad blocker or network issue)');
                LiveNewsPanel.apiPromise = null;
                script.remove();
                resolve();
            };
            document.head.appendChild(script);
        });
        return LiveNewsPanel.apiPromise;
    }
    async initializePlayer() {
        if (!this.useDesktopEmbedProxy && !this.nativeVideoElement && this.player)
            return;
        const useFallbackVideo = this.activeChannel.useFallbackOnly || this.forceFallbackVideoForNextInit;
        this.forceFallbackVideoForNextInit = false;
        await this.resolveChannelVideo(this.activeChannel, useFallbackVideo);
        if ((0, runtime_1.isDesktopRuntime)() && this.getDirectHlsUrl(this.activeChannel.id)) {
            this.renderNativeHlsPlayer();
            return;
        }
        if (!this.activeChannel.videoId || !/^[\w-]{10,12}$/.test(this.activeChannel.videoId)) {
            this.showOfflineMessage(this.activeChannel);
            return;
        }
        if (this.useDesktopEmbedProxy) {
            this.renderDesktopEmbed(true);
            return;
        }
        await LiveNewsPanel.loadYouTubeApi();
        if (this.player || !this.playerElement || !window.YT?.Player)
            return;
        this.player = new window.YT.Player(this.playerElement, {
            host: 'https://www.youtube.com',
            videoId: this.activeChannel.videoId,
            playerVars: {
                autoplay: this.isPlaying ? 1 : 0,
                mute: this.isMuted ? 1 : 0,
                rel: 0,
                playsinline: 1,
                enablejsapi: 1,
                ...(this.youtubeOrigin
                    ? {
                        origin: this.youtubeOrigin,
                        widget_referrer: this.youtubeOrigin,
                    }
                    : {}),
            },
            events: {
                onReady: () => {
                    this.clearBotCheckTimeout();
                    this.isPlayerReady = true;
                    this.currentVideoId = this.activeChannel.videoId || null;
                    const iframe = this.player?.getIframe?.();
                    if (iframe)
                        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
                    const quality = (0, ai_flow_settings_1.getStreamQuality)();
                    if (quality !== 'auto')
                        this.player?.setPlaybackQuality?.(quality);
                    this.syncPlayerState();
                    this.startMuteSyncPolling();
                },
                onError: (event) => {
                    this.clearBotCheckTimeout();
                    const errorCode = Number(event?.data ?? 0);
                    // Retry once with known fallback stream.
                    if (errorCode === 153 &&
                        this.activeChannel.fallbackVideoId &&
                        this.activeChannel.videoId !== this.activeChannel.fallbackVideoId) {
                        this.destroyPlayer();
                        this.forceFallbackVideoForNextInit = true;
                        this.ensurePlayerContainer();
                        void this.initializePlayer();
                        return;
                    }
                    // Desktop-specific last resort: switch to cloud bridge embed.
                    if (errorCode === 153 && (0, runtime_1.isDesktopRuntime)()) {
                        this.useDesktopEmbedProxy = true;
                        this.destroyPlayer();
                        this.ensurePlayerContainer();
                        this.renderDesktopEmbed(true);
                        return;
                    }
                    this.destroyPlayer();
                    this.showEmbedError(this.activeChannel, errorCode);
                },
            },
        });
        this.startBotCheckTimeout();
    }
    startBotCheckTimeout() {
        this.clearBotCheckTimeout();
        this.botCheckTimeout = setTimeout(() => {
            this.botCheckTimeout = null;
            if (!this.isPlayerReady) {
                this.showBotCheckPrompt();
            }
        }, LiveNewsPanel.BOT_CHECK_TIMEOUT_MS);
    }
    clearBotCheckTimeout() {
        if (this.botCheckTimeout) {
            clearTimeout(this.botCheckTimeout);
            this.botCheckTimeout = null;
        }
    }
    showBotCheckPrompt() {
        const channel = this.activeChannel;
        const watchUrl = channel.videoId
            ? `https://www.youtube.com/watch?v=${encodeURIComponent(channel.videoId)}`
            : `https://www.youtube.com/${encodeURIComponent(channel.handle)}`;
        this.destroyPlayer();
        this.content.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'live-offline';
        const icon = document.createElement('div');
        icon.className = 'offline-icon';
        icon.textContent = '\u26A0\uFE0F';
        const text = document.createElement('div');
        text.className = 'offline-text';
        text.textContent = (0, i18n_1.t)('components.liveNews.botCheck', { name: channel.name }) || 'YouTube is requesting sign-in verification';
        const actions = document.createElement('div');
        actions.className = 'bot-check-actions';
        const signinBtn = document.createElement('button');
        signinBtn.className = 'offline-retry bot-check-signin';
        signinBtn.textContent = (0, i18n_1.t)('components.liveNews.signInToYouTube') || 'Sign in to YouTube';
        signinBtn.addEventListener('click', () => this.openYouTubeSignIn());
        const retryBtn = document.createElement('button');
        retryBtn.className = 'offline-retry bot-check-retry';
        retryBtn.textContent = (0, i18n_1.t)('common.retry') || 'Retry';
        retryBtn.addEventListener('click', () => {
            this.ensurePlayerContainer();
            if (this.useDesktopEmbedProxy) {
                this.renderDesktopEmbed(true);
            }
            else {
                void this.initializePlayer();
            }
        });
        const ytLink = document.createElement('a');
        ytLink.className = 'offline-retry';
        ytLink.href = watchUrl;
        ytLink.target = '_blank';
        ytLink.rel = 'noopener noreferrer';
        ytLink.textContent = (0, i18n_1.t)('components.liveNews.openOnYouTube') || 'Open on YouTube';
        actions.append(signinBtn, retryBtn, ytLink);
        wrapper.append(icon, text, actions);
        this.content.appendChild(wrapper);
    }
    async openYouTubeSignIn() {
        const youtubeLoginUrl = 'https://accounts.google.com/ServiceLogin?service=youtube&continue=https://www.youtube.com/';
        if ((0, runtime_1.isDesktopRuntime)()) {
            try {
                const { tryInvokeTauri } = await Promise.resolve().then(() => __importStar(require('@/services/tauri-bridge')));
                await tryInvokeTauri('open_youtube_login');
            }
            catch {
                window.open(youtubeLoginUrl, '_blank');
            }
        }
        else {
            window.open(youtubeLoginUrl, '_blank');
        }
    }
    syncPlayerState() {
        // Native HLS <video> on desktop
        if (this.nativeVideoElement) {
            const videoId = this.activeChannel.videoId;
            if (videoId && this.currentVideoId !== videoId) {
                // Channel changed — reinitialize
                void this.initializePlayer();
            }
            else {
                this.syncNativeVideoState();
            }
            return;
        }
        if (this.useDesktopEmbedProxy) {
            const videoId = this.activeChannel.videoId;
            if (videoId && this.currentVideoId !== videoId) {
                this.renderDesktopEmbed(true);
            }
            else {
                this.syncDesktopEmbedState();
            }
            return;
        }
        if (!this.player || !this.isPlayerReady)
            return;
        const videoId = this.activeChannel.videoId;
        if (!videoId)
            return;
        // Handle channel switch
        const isNewVideo = this.currentVideoId !== videoId;
        if (isNewVideo) {
            this.currentVideoId = videoId;
            if (!this.playerElement || !document.getElementById(this.playerElementId)) {
                this.ensurePlayerContainer();
                void this.initializePlayer();
                return;
            }
            if (this.isPlaying) {
                this.player.loadVideoById(videoId);
            }
            else {
                this.player.cueVideoById(videoId);
            }
        }
        if (this.isMuted) {
            this.player.mute?.();
        }
        else {
            this.player.unMute?.();
        }
        if (this.isPlaying) {
            if (isNewVideo) {
                // WKWebView loses user gesture context after await.
                // Pause then play after a delay — mimics the manual workaround.
                this.player.pauseVideo();
                setTimeout(() => {
                    if (this.player && this.isPlaying) {
                        this.player.mute?.();
                        this.player.playVideo?.();
                        // Restore mute state after play starts
                        if (!this.isMuted) {
                            setTimeout(() => { this.player?.unMute?.(); }, 500);
                        }
                    }
                }, 800);
            }
            else {
                this.player.playVideo?.();
            }
        }
        else {
            this.player.pauseVideo?.();
        }
    }
    refresh() {
        this.syncPlayerState();
    }
    /** Reload channel list from storage (e.g. after edit in separate channel management window). */
    refreshChannelsFromStorage() {
        this.channels = loadChannelsFromStorage();
        if (this.channels.length === 0)
            this.channels = getDefaultLiveChannels();
        if (!this.channels.some((c) => c.id === this.activeChannel.id)) {
            this.activeChannel = this.channels[0];
            void this.switchChannel(this.activeChannel);
        }
        this.refreshChannelSwitcher();
    }
    destroy() {
        this.destroyPlayer();
        if (this.lazyObserver) {
            this.lazyObserver.disconnect();
            this.lazyObserver = null;
        }
        if (this.idleCallbackId !== null) {
            if ('cancelIdleCallback' in window)
                window.cancelIdleCallback(this.idleCallbackId);
            else
                clearTimeout(this.idleCallbackId);
            this.idleCallbackId = null;
        }
        if (this.idleTimeout) {
            clearTimeout(this.idleTimeout);
            this.idleTimeout = null;
        }
        document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
        window.removeEventListener('message', this.boundMessageHandler);
        ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'].forEach(event => {
            document.removeEventListener(event, this.boundIdleResetHandler);
        });
        this.playerContainer = null;
        super.destroy();
    }
}
exports.LiveNewsPanel = LiveNewsPanel;
LiveNewsPanel.apiPromise = null;
LiveNewsPanel.MUTE_SYNC_POLL_MS = 500;
LiveNewsPanel.BOT_CHECK_TIMEOUT_MS = 15000;
