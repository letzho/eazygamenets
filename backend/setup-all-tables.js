const { Pool } = require('pg');
require('dotenv').config();

// Create connection pool
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'eazygame',
});

async function setupAllTables() {
  try {
    console.log('Starting database setup for all tables...');
    
    // List of SQL files to execute in order
    const sqlFiles = [
      '1_create_cards.sql',
      '2_create_checkins.sql',
      '3_create_game_stats.sql',
      '4_create_payments.sql',
      '5_create_transactions.sql',
      '6_create_users.sql',
      '7_create_voucher_transactions.sql',
      '8_create_vouchers.sql'
    ];
    
    for (const sqlFile of sqlFiles) {
      const sqlPath = require('path').join(__dirname, sqlFile);
      
      if (require('fs').existsSync(sqlPath)) {
        console.log(`Executing ${sqlFile}...`);
        const sql = require('fs').readFileSync(sqlPath, 'utf8');
        
        // Split by semicolon and execute each statement
        const statements = sql.split(';').filter(stmt => stmt.trim());
        
        for (const statement of statements) {
          if (statement.trim()) {
            try {
              await pool.query(statement);
              console.log(`  ✅ Statement executed`);
            } catch (error) {
              console.log(`  ⚠️ Statement failed (might already exist):`, error.message);
            }
          }
        }
        
        console.log(`✅ ${sqlFile} completed`);
      } else {
        console.log(`⚠️ ${sqlFile} not found, skipping...`);
      }
    }
    
    console.log('✅ All tables setup completed!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupAllTables()
    .then(() => {
      console.log('Database setup finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupAllTables };




