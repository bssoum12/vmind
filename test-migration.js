const fs = require('fs');
const { Client } = require('pg');

async function test() {
  const content = fs.readFileSync('C:\\Users\\hamza\\OneDrive\\Bureau\\Vmind-front\\VMIND DEVOPS\\VMIND%20AI\\src\\migrations\\database_unification (1).md', 'utf-8');
  
  // Extract SQL block
  const sqlMatch = content.match(/\\\sql\s+([\s\S]*?)\s+\\\/);
  if (!sqlMatch) {
    console.error('No SQL block found');
    process.exit(1);
  }
  const sqlContent = sqlMatch[1];

  const rootClient = new Client({
    user: 'postgres',
    password: process.env.DB_PASSWORD || 'host123',
    host: 'localhost',
    port: 5432,
    database: 'postgres'
  });

  try {
    await rootClient.connect();
    await rootClient.query('DROP DATABASE IF EXISTS vmind_test_migration;');
    await rootClient.query('CREATE DATABASE vmind_test_migration;');
    console.log('[1/3] Temporary database vmind_test_migration created.');
  } catch (e) {
    console.error('Failed to create DB:', e.message);
    process.exit(1);
  } finally {
    await rootClient.end();
  }

  const testClient = new Client({
    user: 'postgres',
    password: process.env.DB_PASSWORD || 'host123',
    host: 'localhost',
    port: 5432,
    database: 'vmind_test_migration'
  });

  try {
    await testClient.connect();
    console.log('[2/3] Connected to vmind_test_migration. Running SQL script...');
    
    await testClient.query(sqlContent);
    console.log('\x1b[32m[SUCCESS] The SQL script ran perfectly without any syntax or dependency errors!\x1b[0m');
  } catch (e) {
    console.error('\x1b[31m[ERROR] The SQL script failed:\x1b[0m', e.message);
  } finally {
    await testClient.end();
  }
}
test();
