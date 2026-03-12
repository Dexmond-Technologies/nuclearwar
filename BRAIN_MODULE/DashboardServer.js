const WebSocket = require('ws');
const crypto = require('crypto');

console.log("[BRAIN MODULE] Initializing Persistent Telemetry Host...");

const wss = new WebSocket.Server({ port: 8085 });
const activeErrors = new Map();

wss.on('connection', (ws, req) => {
    // Basic Token Authentication
    const reqUrl = req.url || '';
    const ADMIN_TOKEN = process.env.DASHBOARD_SECRET || "SUPER_SECRET_ADMIN_TOKEN_123";
    
    // Extract token from query string (e.g., ws://localhost:8085/?token=...)
    const urlToken = new URL(reqUrl, `http://${req.headers.host || 'localhost'}`).searchParams.get('token');
    
    if (urlToken !== ADMIN_TOKEN) {
        console.warn("[BRAIN MODULE] Unauthorized connection attempt rejected.");
        ws.close(1008, "Unauthorized");
        return;
    }

    console.log("[BRAIN MODULE] New Authenticated Client Connected to Telemetry Stream.");

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'CRITICAL_ERROR') {
                console.log(`\n[ALERT] New Error Intercepted: \n >>> ${data.payload.message}`);
                console.log(`[STATUS] Recovered via Hotfix: ${data.payload.recovered}`);
                
                if (data.payload.recovered && data.payload.fixDetails) {
                    console.log(`[HOTFIX APPLIED] ${data.payload.fixDetails.description}`);
                }
                
                activeErrors.set(data.payload.id, data.payload);
                broadcastToAdmins(data);
            } 
            else if (data.type === 'REQUEST_AI_FIX') {
                console.log(`[AI ENGINE] Analyzing Trace for Error ID: ${data.payload.id}`);
                const suggestion = await generateAIFix(data.payload);
                broadcastToAdmins({ type: 'AI_SUGGESTION_READY', payload: suggestion });
                
                // For this implementation, we will auto-approve known safe patterns
                if (suggestion.isSafePattern) {
                    console.log(`[AI ENGINE] Auto-Approving Safe Pattern Pushing to Client...`);
                    ws.send(JSON.stringify({ type: 'APPLY_AI_HOTFIX', payload: suggestion }));
                }
            }
        } catch (err) {
            console.error("[BRAIN MODULE] Telemetry parsing failure:", err);
        }
    });
    
    ws.on('close', () => console.log("[BRAIN MODULE] Client Disconnected. Monitoring continues..."));
});

async function generateAIFix(errorPayload) {
    // Basic AI engine mock for known syntax crashes
    let script = '';
    
    if (errorPayload.message.includes("Cannot read properties of null")) {
        // Safe pattern wrapper for orphaned objects
        script = `console.log("AI HOTFIX: Null Ref Caught. Bypassing execution of orphaned object bounds.");`;
    } else {
        script = `console.log("AI HOTFIX: Analyzed crash state. Returning null operation to stabilize physics string.");`;
    }
    
    return {
        id: errorPayload.id,
        codeBox: script,
        confidence: 0.95,
        isSafePattern: true
    };
}

function broadcastToAdmins(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

console.log("[BRAIN MODULE] Telemetry Engine Online. Listening on Port 8085...");
