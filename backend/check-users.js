const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'eazygame',
});

async function checkUsers() {
  try {
    console.log('Checking users in database...');
    
    // Check if users table exists and has data
    const result = await pool.query('SELECT id, username FROM users LIMIT 10');
    
    if (result.rows.length === 0) {
      console.log('❌ No users found in database');
      console.log('You need to create a user first or run the seed script');
    } else {
      console.log('✅ Users found:');
      result.rows.forEach(user => {
        console.log(`  ID: ${user.id}, Username: ${user.username}`);
      });
    }
    
    // Check check_ins table
    console.log('\nChecking check_ins table...');
    const checkInsResult = await pool.query('SELECT * FROM check_ins LIMIT 5');
    console.log(`Found ${checkInsResult.rows.length} check-in records`);
    
    // Check game_stats table
    console.log('\nChecking game_stats table...');
    const gameStatsResult = await pool.query('SELECT * FROM game_stats LIMIT 5');
    console.log(`Found ${gameStatsResult.rows.length} game stats records`);
    
  } catch (error) {
    console.error('❌ Error checking database:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsers();
