"use strict";
/**
 * ML Worker Manager
 * Provides typed async interface to the ML Web Worker for ONNX inference
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mlWorker = void 0;
const ml_capabilities_1 = require("./ml-capabilities");
const ml_config_1 = require("@/config/ml-config");
// Import worker using Vite's worker syntax
const ml_worker_worker_1 = __importDefault(require("@/workers/ml.worker?worker"));
class MLWorkerManager {
    constructor() {
        this.worker = null;
        this.pendingRequests = new Map();
        this.requestIdCounter = 0;
        this.isReady = false;
        this.capabilities = null;
        this.loadedModels = new Set();
        this.readyResolve = null;
        this.modelProgressCallbacks = new Map();
    }
    /**
     * Initialize the ML worker. Returns false if ML is not supported.
     */
    async init() {
        if (this.isReady)
            return true;
        // Detect capabilities
        this.capabilities = await (0, ml_capabilities_1.detectMLCapabilities)();
        if (!this.capabilities.isSupported) {
            return false;
        }
        return this.initWorker();
    }
    initWorker() {
        if (this.worker)
            return Promise.resolve(this.isReady);
        return new Promise((resolve) => {
            const readyTimeout = setTimeout(() => {
                if (!this.isReady) {
                    console.error('[MLWorker] Worker failed to become ready');
                    this.cleanup();
                    resolve(false);
                }
            }, MLWorkerManager.READY_TIMEOUT_MS);
            try {
                this.worker = new ml_worker_worker_1.default();
            }
            catch (error) {
                console.error('[MLWorker] Failed to create worker:', error);
                this.cleanup();
                resolve(false);
                return;
            }
            this.worker.onmessage = (event) => {
                const data = event.data;
                if (data.type === 'worker-ready') {
                    this.isReady = true;
                    clearTimeout(readyTimeout);
                    this.readyResolve?.();
                    resolve(true);
                    return;
                }
                if (data.type === 'model-progress') {
                    const callback = this.modelProgressCallbacks.get(data.modelId);
                    callback?.(data.progress);
                    return;
                }
                // Unsolicited model-loaded notification (implicit load inside summarize/sentiment/etc.)
                if (data.type === 'model-loaded' && !('id' in data && data.id)) {
                    this.loadedModels.add(data.modelId);
                    return;
                }
                if (data.type === 'error') {
                    const pending = data.id ? this.pendingRequests.get(data.id) : null;
                    if (pending) {
                        clearTimeout(pending.timeout);
                        this.pendingRequests.delete(data.id);
                        pending.reject(new Error(data.error));
                    }
                    else {
                        console.error('[MLWorker] Error:', data.error);
                    }
                    return;
                }
                if ('id' in data && data.id) {
                    const pending = this.pendingRequests.get(data.id);
                    if (pending) {
                        clearTimeout(pending.timeout);
                        this.pendingRequests.delete(data.id);
                        if (data.type === 'model-loaded') {
                            this.loadedModels.add(data.modelId);
                            pending.resolve(true);
                        }
                        else if (data.type === 'model-unloaded') {
                            this.loadedModels.delete(data.modelId);
                            pending.resolve(true);
                        }
                        else if (data.type === 'embed-result') {
                            pending.resolve(data.embeddings);
                        }
                        else if (data.type === 'summarize-result') {
                            pending.resolve(data.summaries);
                        }
                        else if (data.type === 'sentiment-result') {
                            pending.resolve(data.results);
                        }
                        else if (data.type === 'entities-result') {
                            pending.resolve(data.entities);
                        }
                        else if (data.type === 'cluster-semantic-result') {
                            pending.resolve(data.clusters);
                        }
                        else if (data.type === 'status-result') {
                            pending.resolve(data.loadedModels);
                        }
                    }
                }
            };
            this.worker.onerror = (error) => {
                console.error('[MLWorker] Error:', error);
                if (!this.isReady) {
                    clearTimeout(readyTimeout);
                    this.cleanup();
                    resolve(false);
                    return;
                }
                for (const [id, pending] of this.pendingRequests) {
                    clearTimeout(pending.timeout);
                    pending.reject(new Error(`Worker error: ${error.message}`));
                    this.pendingRequests.delete(id);
                }
            };
        });
    }
    cleanup() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.isReady = false;
        this.pendingRequests.clear();
        this.loadedModels.clear();
    }
    generateRequestId() {
        return `ml-${++this.requestIdCounter}-${Date.now()}`;
    }
    request(type, data, timeoutMs = ml_config_1.ML_THRESHOLDS.inferenceTimeoutMs) {
        return new Promise((resolve, reject) => {
            if (!this.worker || !this.isReady) {
                reject(new Error('ML Worker not initialized'));
                return;
            }
            const id = this.generateRequestId();
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(id);
                reject(new Error(`ML request ${type} timed out after ${timeoutMs}ms`));
            }, timeoutMs);
            this.pendingRequests.set(id, {
                resolve: resolve,
                reject,
                timeout,
            });
            this.worker.postMessage({ type, id, ...data });
        });
    }
    /**
     * Load a model by ID
     */
    async loadModel(modelId, onProgress) {
        if (!this.isReady)
            return false;
        if (this.loadedModels.has(modelId))
            return true;
        if (onProgress) {
            this.modelProgressCallbacks.set(modelId, onProgress);
        }
        try {
            return await this.request('load-model', { modelId }, ml_config_1.ML_THRESHOLDS.modelLoadTimeoutMs);
        }
        finally {
            this.modelProgressCallbacks.delete(modelId);
        }
    }
    /**
     * Unload a model to free memory
     */
    async unloadModel(modelId) {
        if (!this.isReady || !this.loadedModels.has(modelId))
            return false;
        try {
            return await this.request('unload-model', { modelId });
        }
        catch {
            this.loadedModels.delete(modelId);
            return false;
        }
    }
    /**
     * Unload all optional models (non-required)
     */
    async unloadOptionalModels() {
        const optionalModels = ml_config_1.MODEL_CONFIGS.filter(m => !m.required);
        for (const model of optionalModels) {
            if (this.loadedModels.has(model.id)) {
                await this.unloadModel(model.id);
            }
        }
    }
    /**
     * Generate embeddings for texts
     */
    async embedTexts(texts) {
        if (!this.isReady)
            throw new Error('ML Worker not ready');
        return this.request('embed', { texts });
    }
    /**
     * Generate summaries for texts
     */
    async summarize(texts, modelId) {
        if (!this.isReady)
            throw new Error('ML Worker not ready');
        return this.request('summarize', { texts, ...(modelId && { modelId }) });
    }
    /**
     * Classify sentiment for texts
     */
    async classifySentiment(texts) {
        if (!this.isReady)
            throw new Error('ML Worker not ready');
        return this.request('classify-sentiment', { texts });
    }
    /**
     * Extract named entities from texts
     */
    async extractEntities(texts) {
        if (!this.isReady)
            throw new Error('ML Worker not ready');
        return this.request('extract-entities', { texts });
    }
    /**
     * Perform semantic clustering on embeddings
     */
    async semanticCluster(embeddings, threshold = ml_config_1.ML_THRESHOLDS.semanticClusterThreshold) {
        if (!this.isReady)
            throw new Error('ML Worker not ready');
        return this.request('cluster-semantic', { embeddings, threshold });
    }
    /**
     * High-level: Cluster items by semantic similarity
     */
    async clusterBySemanticSimilarity(items, threshold = ml_config_1.ML_THRESHOLDS.semanticClusterThreshold) {
        const embeddings = await this.embedTexts(items.map(i => i.text));
        const clusterIndices = await this.semanticCluster(embeddings, threshold);
        return clusterIndices.map(cluster => cluster.map(idx => items[idx]?.id).filter((id) => id !== undefined));
    }
    /**
     * Get status of loaded models
     */
    async getStatus() {
        if (!this.isReady)
            return [];
        return this.request('status', {});
    }
    /**
     * Reset the worker (unload all models)
     */
    reset() {
        if (this.worker) {
            this.worker.postMessage({ type: 'reset' });
            this.loadedModels.clear();
        }
    }
    /**
     * Terminate the worker completely
     */
    terminate() {
        this.cleanup();
    }
    /**
     * Check if ML features are available
     */
    get isAvailable() {
        return this.isReady && (this.capabilities?.isSupported ?? false);
    }
    /**
     * Get detected capabilities
     */
    get mlCapabilities() {
        return this.capabilities;
    }
    /**
     * Get list of currently loaded models
     */
    get loadedModelIds() {
        return Array.from(this.loadedModels);
    }
    /**
     * Check if a specific model is already loaded (no waiting)
     */
    isModelLoaded(modelId) {
        return this.loadedModels.has(modelId);
    }
}
MLWorkerManager.READY_TIMEOUT_MS = 10000;
// Export singleton instance
exports.mlWorker = new MLWorkerManager();
