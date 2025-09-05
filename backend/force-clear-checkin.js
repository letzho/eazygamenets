const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'eazygame',
});

async function forceClearCheckIn() {
  try {
    console.log('Forcefully clearing all check-in data...');
    
    // Clear check_ins table
    const checkInsResult = await pool.query('DELETE FROM check_ins');
    console.log(`✅ Deleted ${checkInsResult.rowCount} check-in record(s)`);
    
    // Clear game_stats for check-ins
    const gameStatsResult = await pool.query("DELETE FROM game_stats WHERE game_type = 'check_in'");
    console.log(`✅ Deleted ${gameStatsResult.rowCount} check-in game stats record(s)`);
    
    // Verify tables are empty
    const checkInsCount = await pool.query('SELECT COUNT(*) FROM check_ins');
    const gameStatsCount = await pool.query("SELECT COUNT(*) FROM game_stats WHERE game_type = 'check_in'");
    
    console.log(`\n📊 After clearing:`);
    console.log(`  check_ins: ${checkInsCount.rows[0].count} records`);
    console.log(`  game_stats (check_in): ${gameStatsCount.rows[0].count} records`);
    
    console.log('\n✅ Check-in data completely cleared!');
    console.log('You can now check in again.');
    
  } catch (error) {
    console.error('❌ Error clearing check-ins:', error.message);
  } finally {
    await pool.end();
  }
}

forceClearCheckIn();




