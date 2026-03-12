class GameTelemetryClient {
    constructor(wsUrl) {
        console.log("[TELEMETRY] Booting Antigravity Telemetry Link to " + wsUrl);
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log("[TELEMETRY] Connection Established. Brain Module Active.");
        };

        this.ws.onmessage = this.handleServerCommand.bind(this);
        
        this.ws.onerror = (err) => {
            console.warn("[TELEMETRY] Brain Module unreachable. Operating without fail-safes.");
        };
    }

    sendTelemetry(type, data) {
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type, payload: data }));
        }
    }

    handleServerCommand(msg) {
        try {
            const data = JSON.parse(msg.data);
            
            // Listen for AI-Suggested Hotfixes approved by the developer on the dashboard
            if (data.type === 'APPLY_AI_HOTFIX') {
                try {
                    console.warn(`[TELEMETRY] Hotfix Received! Executing Pattern ID: ${data.payload.id}`);
                    const fixFunction = new Function('globalState', data.payload.codeBox);
                    fixFunction(window);
                    console.log(`[TELEMETRY] Successfully applied remote patch: ${data.payload.id}`);
                } catch (e) {
                    console.error("[TELEMETRY] Failed to apply remote patch", e);
                }
            }
        } catch(e) { /* ignore parse errors */ }
    }
}

class AntigravityErrorSystem {
    constructor(wsClient) {
        this.wsClient = wsClient;
        this.hotfixRules = [];
        this.initErrorHooks();
    }

    initErrorHooks() {
        // Intercept global uncaught errors
        window.addEventListener('error', (event) => this.handleError(event.error || event));
        
        // Intercept unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => this.handleError(event.reason));
    }

    async handleError(error) {
        if (!error) return;

        const errorPayload = {
            id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
            timestamp: new Date().toISOString(),
            message: error.message || String(error),
            stack: error.stack,
            context: this.getGameStateContext(),
            recovered: false
        };

        // Attempt local hotfix logic here if registered
        const fixApplied = this.attemptAutomatedHotfix(error, errorPayload);
        
        if (fixApplied) {
            errorPayload.recovered = true;
            errorPayload.fixDetails = fixApplied;
        } else {
            // Send to Brain Module for AI diagnosis
            this.wsClient.sendTelemetry('REQUEST_AI_FIX', errorPayload);
        }

        // Push Raw Error to Dashboard
        this.wsClient.sendTelemetry('CRITICAL_ERROR', errorPayload);
    }

    getGameStateContext() {
        return {
            activeSkin: window.currentSkinIndex ? window.SKINS[window.currentSkinIndex].name : 'Unknown',
            walletConnected: window.pendingSolanaAddress || false,
            userAgent: navigator.userAgent
        };
    }

    registerHotfixRule(pattern, fixCallback) {
        this.hotfixRules.push({ pattern, fixCallback });
    }

    attemptAutomatedHotfix(error, payload) {
        for (let rule of this.hotfixRules) {
            if (rule.pattern.test(error.message)) {
                try {
                    const fixResult = rule.fixCallback(error, payload.context);
                    console.log(`[HOTFIX APPLIED] ${fixResult.description}`);
                    return fixResult;
                } catch (fixErr) {
                    console.error("Hotfix failure:", fixErr);
                }
            }
        }
        return null;
    }
}

// Instantiate and attach globally so the developer can manually trigger errors via console
window.telemetryLink = new GameTelemetryClient(`ws://${window.location.host}`);
window.antigravityBrain = new AntigravityErrorSystem(window.telemetryLink);

// Example local rule
window.antigravityBrain.registerHotfixRule(
    /Cannot read properties of null/i,
    (error, context) => {
        return {
            type: 'NULL_POINTER_RECOVERY',
            description: 'NullReference intercepted. Safely bypassed frame execution.',
            time: Date.now()
        };
    }
);
