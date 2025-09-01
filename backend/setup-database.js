const { Pool } = require('pg');

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function setupDatabase() {
  try {
    console.log('Starting database setup...');
    
    // Read and execute SQL files in order
    const fs = require('fs');
    const path = require('path');
    
    // List of SQL files to execute in order
    const sqlFiles = [
      'create_check_in_table.sql',
      'create_payments_table.sql', 
      'create_game_stats_table.sql',
      'add_design_column.sql'
    ];
    
    for (const sqlFile of sqlFiles) {
      const sqlPath = path.join(__dirname, sqlFile);
      
      if (fs.existsSync(sqlPath)) {
        console.log(`Executing ${sqlFile}...`);
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        // Split by semicolon and execute each statement
        const statements = sql.split(';').filter(stmt => stmt.trim());
        
        for (const statement of statements) {
          if (statement.trim()) {
            await pool.query(statement);
          }
        }
        
        console.log(`✅ ${sqlFile} executed successfully`);
      } else {
        console.log(`⚠️ ${sqlFile} not found, skipping...`);
      }
    }
    
    // Seed the database with initial data
    console.log('Seeding database...');
    const seedScript = require('./seed.js');
    await seedScript.seedDatabase();
    
    console.log('✅ Database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('Database setup finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupDatabase };
