const pool = require('./db');
const fs = require('fs');
const path = require('path');

async function createGameStatsTables() {
  try {
    console.log('Creating game stats and vouchers tables...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create_game_stats_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    await pool.query(sql);
    
    console.log('Game stats and vouchers tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating tables:', error);
    process.exit(1);
  }
}

createGameStatsTables();
