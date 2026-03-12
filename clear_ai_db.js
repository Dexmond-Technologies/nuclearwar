const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/nuclearwar',
  ssl: { rejectUnauthorized: false }
});

pool.query(`
    UPDATE ai_combat_state 
    SET gemini_portfolio = '{}'::jsonb, 
        claude_portfolio = '{}'::jsonb,
        gemini_weapon_inventory = '{}'::jsonb,
        claude_weapon_inventory = '{}'::jsonb
    WHERE id = 1
`).then(res => {
  console.log('AI Portfolios Cleared!');
  pool.end();
}).catch(console.error);
