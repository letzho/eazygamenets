const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'eazygame',
});

async function checkGameStatsStructure() {
  try {
    console.log('Checking game_stats table structure...');
    
    // Get table structure
    const structureResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'game_stats'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 game_stats table structure:');
    structureResult.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}) default: ${col.column_default || 'none'}`);
    });
    
    // Check what the backend code expects vs what exists
    console.log('\n🔍 Backend code expects these columns:');
    const expectedColumns = [
      'total_plays', 'total_wins', 'total_losses', 'credits_earned'
    ];
    
    const actualColumns = structureResult.rows.map(col => col.column_name);
    
    expectedColumns.forEach(expected => {
      if (actualColumns.includes(expected)) {
        console.log(`  ✅ ${expected}: EXISTS`);
      } else {
        console.log(`  ❌ ${expected}: MISSING`);
      }
    });
    
    // Show sample data
    console.log('\n📊 Sample data from game_stats:');
    const dataResult = await pool.query('SELECT * FROM game_stats LIMIT 3');
    dataResult.rows.forEach((row, index) => {
      console.log(`\n  Record ${index + 1}:`);
      Object.keys(row).forEach(key => {
        console.log(`    ${key}: ${row[key]}`);
      });
    });
    
  } catch (error) {
    console.error('❌ Error checking game_stats:', error.message);
  } finally {
    await pool.end();
  }
}

checkGameStatsStructure();




