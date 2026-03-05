"use strict";
/**
 * Conservation Data Service
 *
 * Curated dataset of species conservation success stories compiled from
 * published reports (USFWS, IUCN, NOAA, WWF, etc.). The IUCN Red List API
 * provides category assessments but lacks population count time-series,
 * so a curated static JSON is the correct approach for showing recovery
 * trends with historical population data points.
 *
 * Refresh cadence: update conservation-wins.json when new census reports
 * are published (typically annually per species).
 */
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
exports.fetchConservationWins = fetchConservationWins;
/**
 * Load curated conservation wins from static JSON.
 * Uses dynamic import for code-splitting (JSON only loaded for happy variant).
 */
async function fetchConservationWins() {
    const { default: data } = await Promise.resolve().then(() => __importStar(require('@/data/conservation-wins.json')));
    return data;
}
