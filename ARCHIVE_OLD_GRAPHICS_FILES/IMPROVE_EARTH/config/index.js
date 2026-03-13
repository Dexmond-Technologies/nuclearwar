"use strict";
// Configuration exports
// For variant-specific builds, set VITE_VARIANT environment variable
// VITE_VARIANT=tech → tech.worldmonitor.app (tech-focused)
// VITE_VARIANT=full → worldmonitor.app (geopolitical)
// VITE_VARIANT=finance → finance.worldmonitor.app (markets/trading)
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentActions = exports.getUpcomingDeadlines = exports.COUNTRY_REGULATION_PROFILES = exports.REGULATORY_ACTIONS = exports.AI_REGULATIONS = exports.STARTUP_ECOSYSTEMS = exports.AI_RESEARCH_LABS = exports.TECH_COMPANIES = exports.getEntityById = exports.ENTITY_REGISTRY = exports.FAA_AIRPORTS = exports.MONITORED_AIRPORTS = exports.PORTS = exports.PIPELINE_COLORS = exports.PIPELINES = exports.GAMMA_IRRADIATORS = exports.CRITICAL_MINERALS = exports.SPACEPORTS = exports.SANCTIONED_COUNTRIES = exports.ECONOMIC_CENTERS = exports.STRATEGIC_WATERWAYS = exports.APT_GROUPS = exports.NUCLEAR_FACILITIES = exports.MILITARY_BASES = exports.CONFLICT_ZONES = exports.INTEL_HOTSPOTS = exports.INTEL_SOURCES = exports.FEEDS = exports.LAYER_TO_SOURCE = exports.MOBILE_DEFAULT_MAP_LAYERS = exports.DEFAULT_MAP_LAYERS = exports.DEFAULT_PANELS = exports.ALERT_EXCLUSIONS = exports.ALERT_KEYWORDS = exports.getSourcePropagandaRisk = exports.getSourceType = exports.SOURCE_TYPES = exports.getSourceTier = exports.SOURCE_TIERS = exports.AI_DATA_CENTERS = exports.MAP_URLS = exports.UNDERSEA_CABLES = exports.CRYPTO_MAP = exports.MARKET_SYMBOLS = exports.COMMODITIES = exports.SECTORS = exports.STORAGE_KEYS = exports.MONITOR_COLORS = exports.REFRESH_INTERVALS = exports.SITE_VARIANT = void 0;
exports.GULF_INVESTMENTS = exports.COMMODITY_HUBS = exports.CENTRAL_BANKS = exports.FINANCIAL_CENTERS = exports.STOCK_EXCHANGES = exports.CLOUD_REGIONS = exports.TECH_HQS = exports.ACCELERATORS = exports.STARTUP_HUBS = void 0;
var variant_1 = require("./variant");
Object.defineProperty(exports, "SITE_VARIANT", { enumerable: true, get: function () { return variant_1.SITE_VARIANT; } });
// Shared base configuration (always included)
var base_1 = require("./variants/base");
Object.defineProperty(exports, "REFRESH_INTERVALS", { enumerable: true, get: function () { return base_1.REFRESH_INTERVALS; } });
Object.defineProperty(exports, "MONITOR_COLORS", { enumerable: true, get: function () { return base_1.MONITOR_COLORS; } });
Object.defineProperty(exports, "STORAGE_KEYS", { enumerable: true, get: function () { return base_1.STORAGE_KEYS; } });
// Market data (shared)
var markets_1 = require("./markets");
Object.defineProperty(exports, "SECTORS", { enumerable: true, get: function () { return markets_1.SECTORS; } });
Object.defineProperty(exports, "COMMODITIES", { enumerable: true, get: function () { return markets_1.COMMODITIES; } });
Object.defineProperty(exports, "MARKET_SYMBOLS", { enumerable: true, get: function () { return markets_1.MARKET_SYMBOLS; } });
Object.defineProperty(exports, "CRYPTO_MAP", { enumerable: true, get: function () { return markets_1.CRYPTO_MAP; } });
// Geo data (shared base)
var geo_1 = require("./geo");
Object.defineProperty(exports, "UNDERSEA_CABLES", { enumerable: true, get: function () { return geo_1.UNDERSEA_CABLES; } });
Object.defineProperty(exports, "MAP_URLS", { enumerable: true, get: function () { return geo_1.MAP_URLS; } });
// AI Datacenters (shared)
var ai_datacenters_1 = require("./ai-datacenters");
Object.defineProperty(exports, "AI_DATA_CENTERS", { enumerable: true, get: function () { return ai_datacenters_1.AI_DATA_CENTERS; } });
// Feeds configuration (shared functions, variant-specific data)
var feeds_1 = require("./feeds");
Object.defineProperty(exports, "SOURCE_TIERS", { enumerable: true, get: function () { return feeds_1.SOURCE_TIERS; } });
Object.defineProperty(exports, "getSourceTier", { enumerable: true, get: function () { return feeds_1.getSourceTier; } });
Object.defineProperty(exports, "SOURCE_TYPES", { enumerable: true, get: function () { return feeds_1.SOURCE_TYPES; } });
Object.defineProperty(exports, "getSourceType", { enumerable: true, get: function () { return feeds_1.getSourceType; } });
Object.defineProperty(exports, "getSourcePropagandaRisk", { enumerable: true, get: function () { return feeds_1.getSourcePropagandaRisk; } });
Object.defineProperty(exports, "ALERT_KEYWORDS", { enumerable: true, get: function () { return feeds_1.ALERT_KEYWORDS; } });
Object.defineProperty(exports, "ALERT_EXCLUSIONS", { enumerable: true, get: function () { return feeds_1.ALERT_EXCLUSIONS; } });
// Panel configuration - imported from panels.ts
var panels_1 = require("./panels");
Object.defineProperty(exports, "DEFAULT_PANELS", { enumerable: true, get: function () { return panels_1.DEFAULT_PANELS; } });
Object.defineProperty(exports, "DEFAULT_MAP_LAYERS", { enumerable: true, get: function () { return panels_1.DEFAULT_MAP_LAYERS; } });
Object.defineProperty(exports, "MOBILE_DEFAULT_MAP_LAYERS", { enumerable: true, get: function () { return panels_1.MOBILE_DEFAULT_MAP_LAYERS; } });
Object.defineProperty(exports, "LAYER_TO_SOURCE", { enumerable: true, get: function () { return panels_1.LAYER_TO_SOURCE; } });
// ============================================
// VARIANT-SPECIFIC EXPORTS
// Only import what's needed for each variant
// ============================================
// Full variant (geopolitical) - only included in full builds
// These are large data files that should be tree-shaken in tech builds
var feeds_2 = require("./feeds");
Object.defineProperty(exports, "FEEDS", { enumerable: true, get: function () { return feeds_2.FEEDS; } });
Object.defineProperty(exports, "INTEL_SOURCES", { enumerable: true, get: function () { return feeds_2.INTEL_SOURCES; } });
var geo_2 = require("./geo");
Object.defineProperty(exports, "INTEL_HOTSPOTS", { enumerable: true, get: function () { return geo_2.INTEL_HOTSPOTS; } });
Object.defineProperty(exports, "CONFLICT_ZONES", { enumerable: true, get: function () { return geo_2.CONFLICT_ZONES; } });
Object.defineProperty(exports, "MILITARY_BASES", { enumerable: true, get: function () { return geo_2.MILITARY_BASES; } });
Object.defineProperty(exports, "NUCLEAR_FACILITIES", { enumerable: true, get: function () { return geo_2.NUCLEAR_FACILITIES; } });
Object.defineProperty(exports, "APT_GROUPS", { enumerable: true, get: function () { return geo_2.APT_GROUPS; } });
Object.defineProperty(exports, "STRATEGIC_WATERWAYS", { enumerable: true, get: function () { return geo_2.STRATEGIC_WATERWAYS; } });
Object.defineProperty(exports, "ECONOMIC_CENTERS", { enumerable: true, get: function () { return geo_2.ECONOMIC_CENTERS; } });
Object.defineProperty(exports, "SANCTIONED_COUNTRIES", { enumerable: true, get: function () { return geo_2.SANCTIONED_COUNTRIES; } });
Object.defineProperty(exports, "SPACEPORTS", { enumerable: true, get: function () { return geo_2.SPACEPORTS; } });
Object.defineProperty(exports, "CRITICAL_MINERALS", { enumerable: true, get: function () { return geo_2.CRITICAL_MINERALS; } });
var irradiators_1 = require("./irradiators");
Object.defineProperty(exports, "GAMMA_IRRADIATORS", { enumerable: true, get: function () { return irradiators_1.GAMMA_IRRADIATORS; } });
var pipelines_1 = require("./pipelines");
Object.defineProperty(exports, "PIPELINES", { enumerable: true, get: function () { return pipelines_1.PIPELINES; } });
Object.defineProperty(exports, "PIPELINE_COLORS", { enumerable: true, get: function () { return pipelines_1.PIPELINE_COLORS; } });
var ports_1 = require("./ports");
Object.defineProperty(exports, "PORTS", { enumerable: true, get: function () { return ports_1.PORTS; } });
var airports_1 = require("./airports");
Object.defineProperty(exports, "MONITORED_AIRPORTS", { enumerable: true, get: function () { return airports_1.MONITORED_AIRPORTS; } });
Object.defineProperty(exports, "FAA_AIRPORTS", { enumerable: true, get: function () { return airports_1.FAA_AIRPORTS; } });
var entities_1 = require("./entities");
Object.defineProperty(exports, "ENTITY_REGISTRY", { enumerable: true, get: function () { return entities_1.ENTITY_REGISTRY; } });
Object.defineProperty(exports, "getEntityById", { enumerable: true, get: function () { return entities_1.getEntityById; } });
// Tech variant - these are included in tech builds
var tech_companies_1 = require("./tech-companies");
Object.defineProperty(exports, "TECH_COMPANIES", { enumerable: true, get: function () { return tech_companies_1.TECH_COMPANIES; } });
var ai_research_labs_1 = require("./ai-research-labs");
Object.defineProperty(exports, "AI_RESEARCH_LABS", { enumerable: true, get: function () { return ai_research_labs_1.AI_RESEARCH_LABS; } });
var startup_ecosystems_1 = require("./startup-ecosystems");
Object.defineProperty(exports, "STARTUP_ECOSYSTEMS", { enumerable: true, get: function () { return startup_ecosystems_1.STARTUP_ECOSYSTEMS; } });
var ai_regulations_1 = require("./ai-regulations");
Object.defineProperty(exports, "AI_REGULATIONS", { enumerable: true, get: function () { return ai_regulations_1.AI_REGULATIONS; } });
Object.defineProperty(exports, "REGULATORY_ACTIONS", { enumerable: true, get: function () { return ai_regulations_1.REGULATORY_ACTIONS; } });
Object.defineProperty(exports, "COUNTRY_REGULATION_PROFILES", { enumerable: true, get: function () { return ai_regulations_1.COUNTRY_REGULATION_PROFILES; } });
Object.defineProperty(exports, "getUpcomingDeadlines", { enumerable: true, get: function () { return ai_regulations_1.getUpcomingDeadlines; } });
Object.defineProperty(exports, "getRecentActions", { enumerable: true, get: function () { return ai_regulations_1.getRecentActions; } });
var tech_geo_1 = require("./tech-geo");
Object.defineProperty(exports, "STARTUP_HUBS", { enumerable: true, get: function () { return tech_geo_1.STARTUP_HUBS; } });
Object.defineProperty(exports, "ACCELERATORS", { enumerable: true, get: function () { return tech_geo_1.ACCELERATORS; } });
Object.defineProperty(exports, "TECH_HQS", { enumerable: true, get: function () { return tech_geo_1.TECH_HQS; } });
Object.defineProperty(exports, "CLOUD_REGIONS", { enumerable: true, get: function () { return tech_geo_1.CLOUD_REGIONS; } });
// Finance variant - these are included in finance builds
var finance_geo_1 = require("./finance-geo");
Object.defineProperty(exports, "STOCK_EXCHANGES", { enumerable: true, get: function () { return finance_geo_1.STOCK_EXCHANGES; } });
Object.defineProperty(exports, "FINANCIAL_CENTERS", { enumerable: true, get: function () { return finance_geo_1.FINANCIAL_CENTERS; } });
Object.defineProperty(exports, "CENTRAL_BANKS", { enumerable: true, get: function () { return finance_geo_1.CENTRAL_BANKS; } });
Object.defineProperty(exports, "COMMODITY_HUBS", { enumerable: true, get: function () { return finance_geo_1.COMMODITY_HUBS; } });
// Gulf FDI investment database
var gulf_fdi_1 = require("./gulf-fdi");
Object.defineProperty(exports, "GULF_INVESTMENTS", { enumerable: true, get: function () { return gulf_fdi_1.GULF_INVESTMENTS; } });
