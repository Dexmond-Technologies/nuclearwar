const { Pool } = require('pg');
require('dotenv').config();

async function patch() {
  if (!process.env.DATABASE_URL) {
    console.log("No DATABASE_URL found.");
    return;
  }
  const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const res = await pgPool.query('SELECT state FROM game_state WHERE id = 1');
    if (res.rows.length > 0) {
      let gs = res.rows[0].state;
      // String replacement
      let gsStr = JSON.stringify(gs);
      gsStr = gsStr.replace(/"name":"RAINCLOUD"/g, '"name":"RAINCLAUDE"');
      gsStr = gsStr.replace(/"RAINCLOUD"/g, '"RAINCLAUDE"'); // Just in case
      gs = JSON.parse(gsStr);

      await pgPool.query(`
        UPDATE game_state SET state = $1, updated_at = NOW() WHERE id = 1
      `, [JSON.stringify(gs)]);
      console.log("Database successfully patched.");
    } else {
      console.log("No state found in DB.");
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    pgPool.end();
  }
}
patch();
