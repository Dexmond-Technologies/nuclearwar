# Solana RPC Nodes and Integration Best Practices

This document serves as a backup for alternative Solana RPC nodes and guidelines to prevent API rate limiting (429 errors) and ensure efficient blockchain interactions.

## Alternative Public RPC Endpoints

If the official Solana Foundation node is congested or rate-limiting, use these alternatives:

| Provider              | Endpoint URL                              | Notes                                                                    |
| :-------------------- | :---------------------------------------- | :----------------------------------------------------------------------- |
| **Solana Foundation** | `https://api.mainnet-beta.solana.com`     | Official public endpoint; good for testing but can be congested.         |
| **Ankr**              | `https://rpc.ankr.com/solana`             | Multi-chain provider with solid uptime; supports JSON-RPC over HTTPS.    |
| **OnFinality**        | `https://solana.api.onfinality.io/public` | High-performance public access; low latency in many regions.             |
| **dRPC**              | `https://solana.drpc.org`                 | Decentralized RPC service; reliable for general queries without keys.    |
| **Project Serum**     | `https://solana-api.projectserum.com`     | Older (legacy) but still active public endpoint; suitable for light use. |

## Best Practices for Integration and Rate Limit Avoidance

To avoid spamming nodes, hitting API rate limits, or causing errors like 429 ("Too many requests"), follow these ecosystem guidelines focusing on efficiency, resilience, and resource management:

### 1. Implement Client-Side Rate Limiting

Enforce your own limits in code (e.g., no more than 100 requests per second per endpoint) using libraries like `bottleneck` in Node.js or similar tools in other languages. This prevents accidental floods and distributes load if you're using multiple endpoints in a pool.

### 2. Batch Requests Where Possible

Use methods like `getMultipleAccountsInfo` to fetch data for multiple accounts in one call instead of sequential individual requests. This reduces call volume by up to 90% and minimizes bandwidth usage.

### 3. Use WebSockets for Real-Time Data

Instead of polling (e.g., repeatedly calling `getAccountInfo`), subscribe via WebSockets (`accountSubscribe`, `programSubscribe`) for updates. This avoids unnecessary requests and keeps connections efficient. **Important:** Close subscriptions when done to prevent memory leaks.

### 4. Apply Pagination and Filters

For large datasets (e.g., `getProgramAccounts` or `getSignaturesForAddress`), use cursor-based pagination with limits (e.g., up to 10,000 items) and filters like `dataSize`, `memcmp`, or `dataSlice` to retrieve only the needed data. Process in chunks to avoid timeouts.

### 5. Handle Errors with Retries and Exponential Backoff

For rate limit errors (429) or network issues, implement exponential backoff (e.g., wait 1s, then 2s, then 4s before retrying). Add circuit breakers to pause requests during prolonged outages, and cache frequent responses locally to skip redundant calls.

### 6. Monitor and Optimize Commitment Levels

Use the `confirmed` commitment level for most queries, as it balances speed and reliability. Only use `finalized` for critical operations where absolute certainty is required. Track your usage metrics (calls, latency, errors) to stay under limits—tools like provider dashboards can help if you upgrade to a keyed plan.

### 7. Additional Optimization Tips

- **Compression:** Enable compression (e.g., Gzip) for responses to cut data transfer size.
- **Transactions:** Simulate transactions first to set compute units accurately, skip preflight checks if confident, and set priority fees dynamically to ensure inclusion during congestion.
- **Endpoint Rotation:** Implement logic to rotate between multiple RPC endpoints if one gets throttled or goes offline.
