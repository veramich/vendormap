import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: true }
});

pool.on('error', (err) => {
  console.error('Unexpected DB pool error:', err);
});

export default pool;