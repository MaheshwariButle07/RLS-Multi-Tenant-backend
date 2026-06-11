const { Client } = require('pg');

const targets = [
  'postgresql://postgres:postgres@127.0.0.1:5432/postgres',
  'postgresql://postgres:postgres@127.0.0.1:5433/postgres',
  'postgresql://postgres:hyVIbpQGC4ua8o4T@127.0.0.1:5432/postgres',
  'postgresql://postgres:hyVIbpQGC4ua8o4T@127.0.0.1:5433/postgres',
  'postgresql://postgres:@127.0.0.1:5432/postgres',
  'postgresql://postgres:@127.0.0.1:5433/postgres'
];

async function testConnection(connStr) {
  const client = new Client({ connectionString: connStr, connectionTimeoutMillis: 1000 });
  try {
    await client.connect();
    await client.query('SELECT version();');
    await client.end();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function run() {
  console.log('Testing local PostgreSQL service connections...');
  for (const target of targets) {
    console.log(`Trying: ${target}`);
    const res = await testConnection(target);
    if (res.success) {
      console.log(`>>> SUCCESS: Connected to ${target}`);
      process.exit(0);
    } else {
      console.log(`Failed: ${res.error}`);
    }
  }
  console.log('No connections succeeded.');
  process.exit(1);
}

run();
