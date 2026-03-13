"use strict";
/**
 * Summarization Service with Fallback Chain
 * Server-side Redis caching handles cross-user deduplication
 * Fallback: Ollama -> Groq -> OpenRouter -> Browser T5
 *
 * Uses NewsServiceClient.summarizeArticle() RPC instead of legacy
 * per-provider fetch endpoints.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSummary = generateSummary;
exports.translateText = translateText;
const ml_worker_1 = require("./ml-worker");
const config_1 = require("@/config");
const beta_1 = require("@/config/beta");
const runtime_config_1 = require("./runtime-config");
const analytics_1 = require("./analytics");
const service_client_1 = require("@/generated/client/worldmonitor/news/v1/service_client");
const utils_1 = require("@/utils");
// ── Sebuf client (replaces direct fetch to /api/{provider}-summarize) ──
const newsClient = new service_client_1.NewsServiceClient('', { fetch: (...args) => globalThis.fetch(...args) });
const summaryBreaker = (0, utils_1.createCircuitBreaker)({ name: 'News Summarization', cacheTtlMs: 0 });
const emptySummaryFallback = { summary: '', provider: '', model: '', cached: false, skipped: false, fallback: true, tokens: 0, reason: '', error: '', errorType: '' };
const API_PROVIDERS = [
    { featureId: 'aiOllama', provider: 'ollama', label: 'Ollama' },
    { featureId: 'aiGroq', provider: 'groq', label: 'Groq AI' },
    { featureId: 'aiOpenRouter', provider: 'openrouter', label: 'OpenRouter' },
];
let lastAttemptedProvider = 'none';
// ── Unified API provider caller (via SummarizeArticle RPC) ──
async function tryApiProvider(providerDef, headlines, geoContext, lang) {
    if (!(0, runtime_config_1.isFeatureAvailable)(providerDef.featureId))
        return null;
    lastAttemptedProvider = providerDef.provider;
    try {
        const resp = await summaryBreaker.execute(async () => {
            return newsClient.summarizeArticle({
                provider: providerDef.provider,
                headlines,
                mode: 'brief',
                geoContext: geoContext || '',
                variant: config_1.SITE_VARIANT,
                lang: lang || 'en',
            });
        }, emptySummaryFallback);
        // Provider skipped (credentials missing) or signaled fallback
        if (resp.skipped || resp.fallback)
            return null;
        const summary = typeof resp.summary === 'string' ? resp.summary.trim() : '';
        if (!summary)
            return null;
        const cached = Boolean(resp.cached);
        const resultProvider = cached ? 'cache' : providerDef.provider;
        return {
            summary,
            provider: resultProvider,
            model: resp.model || providerDef.provider,
            cached,
        };
    }
    catch (error) {
        console.warn(`[Summarization] ${providerDef.label} failed:`, error);
        return null;
    }
}
// ── Browser T5 provider (different interface -- no API call) ──
async function tryBrowserT5(headlines, modelId) {
    try {
        if (!ml_worker_1.mlWorker.isAvailable) {
            return null;
        }
        lastAttemptedProvider = 'browser';
        const combinedText = headlines.slice(0, 5).map(h => h.slice(0, 80)).join('. ');
        const prompt = `Summarize the most important headline in 2 concise sentences (under 60 words): ${combinedText}`;
        const [summary] = await ml_worker_1.mlWorker.summarize([prompt], modelId);
        if (!summary || summary.length < 20 || summary.toLowerCase().includes('summarize')) {
            return null;
        }
        return {
            summary,
            provider: 'browser',
            model: modelId || 't5-small',
            cached: false,
        };
    }
    catch (error) {
        console.warn('[Summarization] Browser T5 failed:', error);
        return null;
    }
}
// ── Fallback chain runner ──
async function runApiChain(providers, headlines, geoContext, lang, onProgress, stepOffset, totalSteps) {
    for (const [i, provider] of providers.entries()) {
        onProgress?.(stepOffset + i, totalSteps, `Connecting to ${provider.label}...`);
        const result = await tryApiProvider(provider, headlines, geoContext, lang);
        if (result)
            return result;
    }
    return null;
}
/**
 * Generate a summary using the fallback chain: Ollama -> Groq -> OpenRouter -> Browser T5
 * Server-side Redis caching is handled by the SummarizeArticle RPC handler
 * @param geoContext Optional geographic signal context to include in the prompt
 */
async function generateSummary(headlines, onProgress, geoContext, lang = 'en', options) {
    if (!headlines || headlines.length < 2) {
        return null;
    }
    lastAttemptedProvider = 'none';
    const result = await generateSummaryInternal(headlines, onProgress, geoContext, lang, options);
    // Track at generateSummary return only (not inside tryApiProvider) to avoid
    // double-counting beta comparison traffic. Only the winning provider is recorded.
    if (result) {
        (0, analytics_1.trackLLMUsage)(result.provider, result.model, result.cached);
    }
    else {
        (0, analytics_1.trackLLMFailure)(lastAttemptedProvider);
    }
    return result;
}
async function generateSummaryInternal(headlines, onProgress, geoContext, lang, options) {
    if (beta_1.BETA_MODE) {
        const modelReady = ml_worker_1.mlWorker.isAvailable && ml_worker_1.mlWorker.isModelLoaded('summarization-beta');
        if (modelReady) {
            const totalSteps = 1 + API_PROVIDERS.length;
            // Model already loaded -- use browser T5-small first
            if (!options?.skipBrowserFallback) {
                onProgress?.(1, totalSteps, 'Running local AI model (beta)...');
                const browserResult = await tryBrowserT5(headlines, 'summarization-beta');
                if (browserResult) {
                    const groqProvider = API_PROVIDERS.find(p => p.provider === 'groq');
                    if (groqProvider && !options?.skipCloudProviders)
                        tryApiProvider(groqProvider, headlines, geoContext).catch(() => { });
                    return browserResult;
                }
            }
            // Warm model failed inference -- fallback through API providers
            if (!options?.skipCloudProviders) {
                const chainResult = await runApiChain(API_PROVIDERS, headlines, geoContext, undefined, onProgress, 2, totalSteps);
                if (chainResult)
                    return chainResult;
            }
        }
        else {
            const totalSteps = API_PROVIDERS.length + 2;
            if (ml_worker_1.mlWorker.isAvailable && !options?.skipBrowserFallback) {
                ml_worker_1.mlWorker.loadModel('summarization-beta').catch(() => { });
            }
            // API providers while model loads
            if (!options?.skipCloudProviders) {
                const chainResult = await runApiChain(API_PROVIDERS, headlines, geoContext, undefined, onProgress, 1, totalSteps);
                if (chainResult) {
                    return chainResult;
                }
            }
            // Last resort: try browser T5 (may have finished loading by now)
            if (ml_worker_1.mlWorker.isAvailable && !options?.skipBrowserFallback) {
                onProgress?.(API_PROVIDERS.length + 1, totalSteps, 'Waiting for local AI model...');
                const browserResult = await tryBrowserT5(headlines, 'summarization-beta');
                if (browserResult)
                    return browserResult;
            }
            onProgress?.(totalSteps, totalSteps, 'No providers available');
        }
        console.warn('[BETA] All providers failed');
        return null;
    }
    // Normal mode: API chain -> Browser T5
    const totalSteps = API_PROVIDERS.length + 1;
    let chainResult = null;
    if (!options?.skipCloudProviders) {
        chainResult = await runApiChain(API_PROVIDERS, headlines, geoContext, lang, onProgress, 1, totalSteps);
    }
    if (chainResult)
        return chainResult;
    if (!options?.skipBrowserFallback) {
        onProgress?.(totalSteps, totalSteps, 'Loading local AI model...');
        const browserResult = await tryBrowserT5(headlines);
        if (browserResult)
            return browserResult;
    }
    console.warn('[Summarization] All providers failed');
    return null;
}
/**
 * Translate text using the fallback chain (via SummarizeArticle RPC with mode='translate')
 * @param text Text to translate
 * @param targetLang Target language code (e.g., 'fr', 'es')
 */
async function translateText(text, targetLang, onProgress) {
    if (!text)
        return null;
    const totalSteps = API_PROVIDERS.length;
    for (const [i, providerDef] of API_PROVIDERS.entries()) {
        if (!(0, runtime_config_1.isFeatureAvailable)(providerDef.featureId))
            continue;
        onProgress?.(i + 1, totalSteps, `Translating with ${providerDef.label}...`);
        try {
            const resp = await summaryBreaker.execute(async () => {
                return newsClient.summarizeArticle({
                    provider: providerDef.provider,
                    headlines: [text],
                    mode: 'translate',
                    geoContext: '',
                    variant: targetLang,
                    lang: '',
                });
            }, emptySummaryFallback);
            if (resp.fallback || resp.skipped)
                continue;
            const summary = typeof resp.summary === 'string' ? resp.summary.trim() : '';
            if (summary)
                return summary;
        }
        catch (e) {
            console.warn(`${providerDef.label} translation failed`, e);
        }
    }
    return null;
}
