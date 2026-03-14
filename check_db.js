const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://nuclearwar_db_user:Kg5fnacbBT1wwukMwvJ2zSm03eRNbze5@dpg-d6j5m8kr85hc73fqe70g-a.oregon-postgres.render.com/nuclearwar_db',
  ssl: { rejectUnauthorized: false }
});
async function run() {
  try {
    const res = await pool.query("SELECT callsign, portfolio, mining_inventory FROM commanders WHERE callsign ILIKE '%gemini%' OR callsign ILIKE '%claude%'");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch(e) { console.log(e.message); }
  pool.end();
}
run();
