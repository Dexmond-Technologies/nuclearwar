const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://nuclearwar_db_user:Kg5fnacbBT1wwukMwvJ2zSm03eRNbze5@dpg-d6j5m8kr85hc73fqe70g-a.oregon-postgres.render.com/nuclearwar_db',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  
  try {
    const res = await client.query('SELECT * FROM ai_combat_state WHERE id = 1');
    if(res.rows.length > 0) {
        console.log("Found ai_combat_state:", JSON.stringify(res.rows[0], null, 2));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
