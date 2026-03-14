const { Client } = require('pg');
require('dotenv').config({ path: 'env' });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

client.connect()
  .then(() => {
    console.log("Connected successfully to:", process.env.DATABASE_URL.split('@')[1]);
    client.end();
  })
  .catch(err => console.error("Connection error:", err.message));
