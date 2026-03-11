const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:8888');

ws.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.type === 'saved_state' || msg.type === 'game_start' || msg.type === 'state_update') {
        const state = msg.gameState;
        if (state && state.countries) {
            // Find a territory owned by Gemini (Player 0)
            const geminiIso = Object.keys(state.countries).find(iso => state.countries[iso].owner === 0);
            if (geminiIso) {
                // In the game math: 1 internal troop = 10,000 displayed troops.
                // To display 400,000,000, we need to inject 40,000 internal troops.
                console.log(`Initial internal troops at ${geminiIso}: ${state.countries[geminiIso].troops}`);
                state.countries[geminiIso].troops += 40000;
                
                ws.send(JSON.stringify({
                    type: 'state_update',
                    gameState: state
                }));
                console.log(`Successfully injected 400,000,000 troops (40,000 internal) into Gemini territory ${geminiIso}.`);
                process.exit(0);
            } else {
                console.log('Gemini has no territories to inject troops into! Cannot inject.');
                process.exit(1);
            }
        }
    }
});

ws.on('open', () => {
    console.log('Connected to local WS server. Requesting state...');
    ws.send(JSON.stringify({ type: 'get_saved_state' }));
});

ws.on('error', (err) => {
    console.error('WebSocket Error:', err);
    process.exit(1);
});
