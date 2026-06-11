const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

async function main() {
  console.log('========================================================');
  console.log(' DATABASE INITIALIZATION SCRIPT');
  console.log(` Target Connection: ${connectionString}`);
  console.log('========================================================');

  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('[Connection] Connected to PostgreSQL container successfully.');

    // 1. Apply schema.sql
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    console.log(`[Schema] Reading definitions from: ${schemaPath}`);
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('[Schema] Executing SQL definitions...');
    await client.query(schemaSql);
    console.log('[Schema] Tables, RLS policies, indexes, and RPC functions created.');

    // 2. Apply seeds.sql
    const seedsPath = path.join(__dirname, '../../database/seeds.sql');
    console.log(`[Seeds] Reading seeds from: ${seedsPath}`);
    const seedsSql = fs.readFileSync(seedsPath, 'utf8');
    
    console.log('[Seeds] Executing seed insertions...');
    await client.query(seedsSql);
    console.log('[Seeds] 30 knowledge nodes loaded successfully.');

    console.log('\n========================================================');
    console.log(' DATABASE INITIALIZATION COMPLETE!');
    console.log('========================================================');
  } catch (err) {
    console.error('\n[ERROR] Database initialization failed:');
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
