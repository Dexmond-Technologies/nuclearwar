"use strict";
/**
 * Unified news service module.
 *
 * RSS feed parsing stays client-side (requires DOMParser).
 * Summarization stays via existing edge functions (Groq/OpenRouter).
 * This module re-exports from the legacy files and will migrate
 * to sebuf RPCs as those handlers get implemented.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.translateText = exports.generateSummary = exports.getFeedFailures = exports.fetchCategoryFeeds = exports.fetchFeed = void 0;
// RSS feed fetching (client-side with DOMParser)
var rss_1 = require("../rss");
Object.defineProperty(exports, "fetchFeed", { enumerable: true, get: function () { return rss_1.fetchFeed; } });
Object.defineProperty(exports, "fetchCategoryFeeds", { enumerable: true, get: function () { return rss_1.fetchCategoryFeeds; } });
Object.defineProperty(exports, "getFeedFailures", { enumerable: true, get: function () { return rss_1.getFeedFailures; } });
// Summarization (client-side with Groq/OpenRouter/Browser T5 fallback)
var summarization_1 = require("../summarization");
Object.defineProperty(exports, "generateSummary", { enumerable: true, get: function () { return summarization_1.generateSummary; } });
Object.defineProperty(exports, "translateText", { enumerable: true, get: function () { return summarization_1.translateText; } });
