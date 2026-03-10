/**
 * NUCLEAR WAR - PROFESSIONAL GAME EVENT LOGGER
 * Designed to synchronously trace all major game interactions into the PostgreSQL history log.
 */

class GameLogger {
    constructor() {
        this.pgPool = null;
    }

    initialize(pool) {
        this.pgPool = pool;
        console.log("☢ GameLogger (CONTROLLER) -> Online & Connected to PostgreSQL");
    }

    async logEvent(eventType, actor, target, details) {
        if (!this.pgPool) return;

        try {
            const query = `
                INSERT INTO game_events_log (event_type, actor, target, action_details)
                VALUES ($1, $2, $3, $4)
            `;
            const values = [
                eventType, 
                actor || 'UNKNOWN', 
                target || null, 
                JSON.stringify(details || {})
            ];
            
            await this.pgPool.query(query, values);
        } catch (err) {
            console.error(`[LOGGER ERROR] Failed to record ${eventType}:`, err.message);
        }
    }

    // Semantic Wrappers for clean usage in server.js
    
    trade(actor, item, quantity, cost, currency) {
        this.logEvent('TRADE', actor, 'MARKET', { item, quantity, cost, currency });
    }

    hack(actor, targetCompany, success, payload) {
        this.logEvent('HACK', actor, targetCompany, { success, ...payload });
    }

    combat(actor, targetRegion, actionType, payload) {
        this.logEvent('COMBAT', actor, targetRegion, { actionType, ...payload });
    }
    
    movement(actor, entityId, fromLatLon, toLatLon) {
        this.logEvent('MOVEMENT', actor, entityId, { from: fromLatLon, to: toLatLon });
    }

    generic(actor, textDescription) {
        this.logEvent('SYSTEM', actor, null, { note: textDescription });
    }
}

module.exports = new GameLogger();
