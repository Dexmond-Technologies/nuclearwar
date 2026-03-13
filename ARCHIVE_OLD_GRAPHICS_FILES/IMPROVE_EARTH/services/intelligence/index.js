"use strict";
/**
 * Unified intelligence service module.
 *
 * Re-exports from legacy service files that have complex client-side logic
 * (DEFCON calculation, circuit breakers, batch classification, GDELT DOC API).
 * Server-side edge functions are consolidated in the handler.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractDomain = exports.formatArticleDate = exports.fetchHotspotContext = exports.fetchAllTopicIntelligence = exports.fetchTopicIntelligence = exports.fetchGdeltArticles = exports.THREAT_PRIORITY = exports.aggregateThreats = exports.classifyWithAI = exports.classifyByKeyword = exports.toCountryScore = exports.hasCachedScores = exports.getCachedScores = exports.fetchCachedRiskScores = exports.getGdeltStatus = exports.getPizzIntStatus = exports.fetchGdeltTensions = exports.fetchPizzIntStatus = void 0;
// PizzINT dashboard + GDELT tensions
var pizzint_1 = require("../pizzint");
Object.defineProperty(exports, "fetchPizzIntStatus", { enumerable: true, get: function () { return pizzint_1.fetchPizzIntStatus; } });
Object.defineProperty(exports, "fetchGdeltTensions", { enumerable: true, get: function () { return pizzint_1.fetchGdeltTensions; } });
Object.defineProperty(exports, "getPizzIntStatus", { enumerable: true, get: function () { return pizzint_1.getPizzIntStatus; } });
Object.defineProperty(exports, "getGdeltStatus", { enumerable: true, get: function () { return pizzint_1.getGdeltStatus; } });
// Risk scores (CII + strategic risk)
var cached_risk_scores_1 = require("../cached-risk-scores");
Object.defineProperty(exports, "fetchCachedRiskScores", { enumerable: true, get: function () { return cached_risk_scores_1.fetchCachedRiskScores; } });
Object.defineProperty(exports, "getCachedScores", { enumerable: true, get: function () { return cached_risk_scores_1.getCachedScores; } });
Object.defineProperty(exports, "hasCachedScores", { enumerable: true, get: function () { return cached_risk_scores_1.hasCachedScores; } });
Object.defineProperty(exports, "toCountryScore", { enumerable: true, get: function () { return cached_risk_scores_1.toCountryScore; } });
// Threat classification (keyword + AI)
var threat_classifier_1 = require("../threat-classifier");
Object.defineProperty(exports, "classifyByKeyword", { enumerable: true, get: function () { return threat_classifier_1.classifyByKeyword; } });
Object.defineProperty(exports, "classifyWithAI", { enumerable: true, get: function () { return threat_classifier_1.classifyWithAI; } });
Object.defineProperty(exports, "aggregateThreats", { enumerable: true, get: function () { return threat_classifier_1.aggregateThreats; } });
Object.defineProperty(exports, "THREAT_PRIORITY", { enumerable: true, get: function () { return threat_classifier_1.THREAT_PRIORITY; } });
// GDELT intelligence
var gdelt_intel_1 = require("../gdelt-intel");
Object.defineProperty(exports, "fetchGdeltArticles", { enumerable: true, get: function () { return gdelt_intel_1.fetchGdeltArticles; } });
Object.defineProperty(exports, "fetchTopicIntelligence", { enumerable: true, get: function () { return gdelt_intel_1.fetchTopicIntelligence; } });
Object.defineProperty(exports, "fetchAllTopicIntelligence", { enumerable: true, get: function () { return gdelt_intel_1.fetchAllTopicIntelligence; } });
Object.defineProperty(exports, "fetchHotspotContext", { enumerable: true, get: function () { return gdelt_intel_1.fetchHotspotContext; } });
Object.defineProperty(exports, "formatArticleDate", { enumerable: true, get: function () { return gdelt_intel_1.formatArticleDate; } });
Object.defineProperty(exports, "extractDomain", { enumerable: true, get: function () { return gdelt_intel_1.extractDomain; } });
