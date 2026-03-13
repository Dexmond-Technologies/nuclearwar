"use strict";
/**
 * Worker Manager for heavy computational tasks.
 * Provides typed async interface to the analysis Web Worker.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analysisWorker = void 0;
const feeds_1 = require("@/config/feeds");
// Import worker using Vite's worker syntax
const analysis_worker_worker_1 = __importDefault(require("@/workers/analysis.worker?worker"));
class AnalysisWorkerManager {
    constructor() {
        this.worker = null;
        this.pendingRequests = new Map();
        this.requestIdCounter = 0;
        this.isReady = false;
        this.readyPromise = null;
        this.readyResolve = null;
        this.readyReject = null;
        this.readyTimeout = null;
    }
    /**
     * Initialize the worker. Called lazily on first use.
     */
    initWorker() {
        if (this.worker)
            return;
        this.readyPromise = new Promise((resolve, reject) => {
            this.readyResolve = resolve;
            this.readyReject = reject;
        });
        // Set ready timeout - reject if worker doesn't become ready in time
        this.readyTimeout = setTimeout(() => {
            if (!this.isReady) {
                const error = new Error('Worker failed to become ready within timeout');
                console.error('[AnalysisWorker]', error.message);
                this.readyReject?.(error);
                this.cleanup();
            }
        }, AnalysisWorkerManager.READY_TIMEOUT_MS);
        try {
            this.worker = new analysis_worker_worker_1.default();
        }
        catch (error) {
            console.error('[AnalysisWorker] Failed to create worker:', error);
            this.readyReject?.(error instanceof Error ? error : new Error(String(error)));
            this.cleanup();
            return;
        }
        this.worker.onmessage = (event) => {
            const data = event.data;
            if (data.type === 'ready') {
                this.isReady = true;
                if (this.readyTimeout) {
                    clearTimeout(this.readyTimeout);
                    this.readyTimeout = null;
                }
                this.readyResolve?.();
                return;
            }
            if ('id' in data) {
                const pending = this.pendingRequests.get(data.id);
                if (pending) {
                    clearTimeout(pending.timeout);
                    this.pendingRequests.delete(data.id);
                    if (data.type === 'cluster-result') {
                        // Deserialize dates
                        const clusters = data.clusters.map(cluster => ({
                            ...cluster,
                            firstSeen: new Date(cluster.firstSeen),
                            lastUpdated: new Date(cluster.lastUpdated),
                            allItems: cluster.allItems.map(item => ({
                                ...item,
                                pubDate: new Date(item.pubDate),
                            })),
                        }));
                        pending.resolve(clusters);
                    }
                    else if (data.type === 'correlation-result') {
                        // Deserialize dates
                        const signals = data.signals.map(signal => ({
                            ...signal,
                            timestamp: new Date(signal.timestamp),
                        }));
                        pending.resolve(signals);
                    }
                }
            }
        };
        this.worker.onerror = (error) => {
            console.error('[AnalysisWorker] Error:', error);
            // If not ready yet, reject the ready promise
            if (!this.isReady) {
                this.readyReject?.(new Error(`Worker failed to initialize: ${error.message}`));
                this.cleanup();
                return;
            }
            // Reject all pending requests
            for (const [id, pending] of this.pendingRequests) {
                clearTimeout(pending.timeout);
                pending.reject(new Error(`Worker error: ${error.message}`));
                this.pendingRequests.delete(id);
            }
        };
    }
    /**
     * Cleanup worker state (for re-initialization)
     */
    cleanup() {
        if (this.readyTimeout) {
            clearTimeout(this.readyTimeout);
            this.readyTimeout = null;
        }
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.isReady = false;
        this.readyPromise = null;
        this.readyResolve = null;
        this.readyReject = null;
    }
    /**
     * Wait for worker to be ready
     */
    async waitForReady() {
        this.initWorker();
        if (this.isReady)
            return;
        await this.readyPromise;
    }
    /**
     * Generate unique request ID
     */
    generateId() {
        return `req-${++this.requestIdCounter}-${Date.now()}`;
    }
    /**
     * Cluster news articles using Web Worker.
     * Runs O(n²) Jaccard similarity off the main thread.
     */
    async clusterNews(items) {
        await this.waitForReady();
        return new Promise((resolve, reject) => {
            const id = this.generateId();
            // Set timeout (30 seconds - clustering can take a while for large datasets)
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(id);
                reject(new Error('Clustering request timed out'));
            }, 30000);
            this.pendingRequests.set(id, {
                resolve: resolve,
                reject,
                timeout,
            });
            this.worker.postMessage({
                type: 'cluster',
                id,
                items,
                sourceTiers: feeds_1.SOURCE_TIERS,
            });
        });
    }
    /**
     * Run correlation analysis using Web Worker.
     * Detects signal patterns across news, markets, and predictions.
     */
    async analyzeCorrelations(clusters, predictions, markets) {
        await this.waitForReady();
        return new Promise((resolve, reject) => {
            const id = this.generateId();
            // Set timeout (10 seconds should be plenty for correlation)
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(id);
                reject(new Error('Correlation analysis request timed out'));
            }, 10000);
            this.pendingRequests.set(id, {
                resolve: resolve,
                reject,
                timeout,
            });
            this.worker.postMessage({
                type: 'correlation',
                id,
                clusters,
                predictions,
                markets,
                sourceTypes: feeds_1.SOURCE_TYPES,
            });
        });
    }
    /**
     * Reset worker state (useful for testing)
     */
    reset() {
        // Reject all pending requests - reset worker won't answer old queries
        for (const pending of this.pendingRequests.values()) {
            clearTimeout(pending.timeout);
            pending.reject(new Error('Worker reset'));
        }
        this.pendingRequests.clear();
        if (this.worker) {
            this.worker.postMessage({ type: 'reset' });
        }
    }
    /**
     * Terminate worker (cleanup)
     */
    terminate() {
        // Reject all pending requests
        for (const [id, pending] of this.pendingRequests) {
            clearTimeout(pending.timeout);
            pending.reject(new Error('Worker terminated'));
            this.pendingRequests.delete(id);
        }
        this.cleanup();
    }
    /**
     * Check if worker is available and ready
     */
    get ready() {
        return this.isReady;
    }
}
AnalysisWorkerManager.READY_TIMEOUT_MS = 10000; // 10 seconds to become ready
// Singleton instance
exports.analysisWorker = new AnalysisWorkerManager();
