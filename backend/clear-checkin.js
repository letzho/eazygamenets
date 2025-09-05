const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'eazygame',
});

async function clearCheckIn() {
  try {
    console.log('Clearing check-in records...');
    
    // Clear all check-in records
    const result = await pool.query('DELETE FROM check_ins');
    console.log(`✅ Deleted ${result.rowCount} check-in record(s)`);
    
    // Also clear related game_stats for check-ins
    const gameStatsResult = await pool.query("DELETE FROM game_stats WHERE game_type = 'check_in'");
    console.log(`✅ Deleted ${gameStatsResult.rowCount} check-in game stats record(s)`);
    
    console.log('✅ Check-in data cleared successfully!');
    console.log('You can now check in again.');
    
  } catch (error) {
    console.error('❌ Error clearing check-ins:', error.message);
  } finally {
    await pool.end();
  }
}

clearCheckIn();




