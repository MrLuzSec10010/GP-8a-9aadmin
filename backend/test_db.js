require('dotenv').config();
const { Pool } = require('pg');

console.log('Testing connection to:', process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('Connection error:', err.stack);
    process.exit(1);
  }
  console.log('Connection successful!');
  client.query('SELECT NOW()', (err, result) => {
    release();
    if (err) {
      console.error('Query error:', err.stack);
      process.exit(1);
    }
    console.log('Query result:', result.rows[0]);
    process.exit(0);
  });
});
