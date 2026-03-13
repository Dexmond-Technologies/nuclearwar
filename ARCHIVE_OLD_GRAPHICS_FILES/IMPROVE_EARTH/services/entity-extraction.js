"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractEntitiesFromTitle = extractEntitiesFromTitle;
exports.extractEntitiesFromCluster = extractEntitiesFromCluster;
exports.extractEntitiesFromClusters = extractEntitiesFromClusters;
exports.findNewsForEntity = findNewsForEntity;
exports.findNewsForMarketSymbol = findNewsForMarketSymbol;
exports.getTopEntitiesFromNews = getTopEntitiesFromNews;
const entity_index_1 = require("./entity-index");
function extractEntitiesFromTitle(title) {
    const matches = (0, entity_index_1.findEntitiesInText)(title);
    return matches.map(match => ({
        entityId: match.entityId,
        name: (0, entity_index_1.getEntityDisplayName)(match.entityId),
        matchedText: match.matchedText,
        matchType: match.matchType,
        confidence: match.confidence,
    }));
}
function extractEntitiesFromCluster(cluster) {
    const primaryEntities = extractEntitiesFromTitle(cluster.primaryTitle);
    const entityMap = new Map();
    for (const entity of primaryEntities) {
        if (!entityMap.has(entity.entityId)) {
            entityMap.set(entity.entityId, entity);
        }
    }
    if (cluster.allItems && cluster.allItems.length > 1) {
        for (const item of cluster.allItems.slice(0, 5)) {
            const itemEntities = extractEntitiesFromTitle(item.title);
            for (const entity of itemEntities) {
                if (!entityMap.has(entity.entityId)) {
                    entity.confidence *= 0.9;
                    entityMap.set(entity.entityId, entity);
                }
            }
        }
    }
    const entities = Array.from(entityMap.values())
        .sort((a, b) => b.confidence - a.confidence);
    const primaryEntity = entities[0]?.entityId;
    const relatedEntityIds = new Set();
    for (const entity of entities) {
        const related = (0, entity_index_1.findRelatedEntities)(entity.entityId);
        for (const rel of related) {
            relatedEntityIds.add(rel.id);
        }
    }
    return {
        clusterId: cluster.id,
        title: cluster.primaryTitle,
        entities,
        primaryEntity,
        relatedEntityIds: Array.from(relatedEntityIds),
    };
}
function extractEntitiesFromClusters(clusters) {
    const contextMap = new Map();
    for (const cluster of clusters) {
        const context = extractEntitiesFromCluster(cluster);
        contextMap.set(cluster.id, context);
    }
    return contextMap;
}
function findNewsForEntity(entityId, newsContexts) {
    const index = (0, entity_index_1.getEntityIndex)();
    const entity = index.byId.get(entityId);
    if (!entity)
        return [];
    const relatedIds = new Set([entityId, ...(entity.related ?? [])]);
    const matches = [];
    for (const [clusterId, context] of newsContexts) {
        const directMatch = context.entities.find(e => e.entityId === entityId);
        if (directMatch) {
            matches.push({
                clusterId,
                title: context.title,
                confidence: directMatch.confidence,
            });
            continue;
        }
        const relatedMatch = context.entities.find(e => relatedIds.has(e.entityId));
        if (relatedMatch) {
            matches.push({
                clusterId,
                title: context.title,
                confidence: relatedMatch.confidence * 0.8,
            });
        }
    }
    return matches.sort((a, b) => b.confidence - a.confidence);
}
function findNewsForMarketSymbol(symbol, newsContexts) {
    return findNewsForEntity(symbol, newsContexts);
}
function getTopEntitiesFromNews(newsContexts, limit = 10) {
    const entityStats = new Map();
    for (const context of newsContexts.values()) {
        for (const entity of context.entities) {
            const stats = entityStats.get(entity.entityId) ?? { count: 0, totalConfidence: 0 };
            stats.count++;
            stats.totalConfidence += entity.confidence;
            entityStats.set(entity.entityId, stats);
        }
    }
    return Array.from(entityStats.entries())
        .map(([entityId, stats]) => ({
        entityId,
        name: (0, entity_index_1.getEntityDisplayName)(entityId),
        mentionCount: stats.count,
        avgConfidence: stats.totalConfidence / stats.count,
    }))
        .sort((a, b) => b.mentionCount - a.mentionCount)
        .slice(0, limit);
}
