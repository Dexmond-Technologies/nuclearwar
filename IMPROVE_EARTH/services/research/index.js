"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchArxivPapers = fetchArxivPapers;
exports.fetchTrendingRepos = fetchTrendingRepos;
exports.fetchHackernewsItems = fetchHackernewsItems;
const service_client_1 = require("@/generated/client/worldmonitor/research/v1/service_client");
const utils_1 = require("@/utils");
const client = new service_client_1.ResearchServiceClient('', { fetch: (...args) => globalThis.fetch(...args) });
const arxivBreaker = (0, utils_1.createCircuitBreaker)({ name: 'ArXiv Papers', cacheTtlMs: 10 * 60 * 1000, persistCache: true });
const trendingBreaker = (0, utils_1.createCircuitBreaker)({ name: 'GitHub Trending', cacheTtlMs: 10 * 60 * 1000, persistCache: true });
const hnBreaker = (0, utils_1.createCircuitBreaker)({ name: 'Hacker News', cacheTtlMs: 10 * 60 * 1000, persistCache: true });
async function fetchArxivPapers(category = 'cs.AI', query = '', pageSize = 50) {
    return arxivBreaker.execute(async () => {
        const resp = await client.listArxivPapers({
            category,
            query,
            pageSize,
            cursor: '',
        });
        return resp.papers;
    }, []);
}
async function fetchTrendingRepos(language = 'python', period = 'daily', pageSize = 50) {
    return trendingBreaker.execute(async () => {
        const resp = await client.listTrendingRepos({
            language,
            period,
            pageSize,
            cursor: '',
        });
        return resp.repos;
    }, []);
}
async function fetchHackernewsItems(feedType = 'top', pageSize = 30) {
    return hnBreaker.execute(async () => {
        const resp = await client.listHackernewsItems({
            feedType,
            pageSize,
            cursor: '',
        });
        return resp.items;
    }, []);
}
