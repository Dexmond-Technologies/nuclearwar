const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://nuclearwar_db_user:Kg5fnacbBT1wwukMwvJ2zSm03eRNbze5@dpg-d6j5m8kr85hc73fqe70g-a.oregon-postgres.render.com/nuclearwar_db', ssl: { rejectUnauthorized: false }  });
pool.query("SELECT portfolio FROM commanders WHERE callsign = 'WORLD BANK'").then(res => {
  console.log(JSON.stringify(res.rows[0], null, 2));
  pool.end();
}).catch(e => console.error(e));
