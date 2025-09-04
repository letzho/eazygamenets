const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'eazygame',
});

async function checkTables() {
  try {
    console.log('Checking what tables exist in database...');
    
    // Get list of all tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\n📋 Tables found:');
    if (tablesResult.rows.length === 0) {
      console.log('❌ No tables found!');
    } else {
      tablesResult.rows.forEach(table => {
        console.log(`  ✅ ${table.table_name}`);
      });
    }
    
    // Check specific tables we need
    const requiredTables = ['users', 'check_ins', 'game_stats', 'cards', 'transactions'];
    
    console.log('\n🔍 Checking required tables:');
    for (const tableName of requiredTables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
        console.log(`  ${tableName}: ${result.rows[0].count} rows`);
      } catch (error) {
        console.log(`  ${tableName}: ❌ Table doesn't exist or error: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();



