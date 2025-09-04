const pool = require('./db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('Starting database migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrate_transactions_nullable.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running migration SQL...');
    console.log(migrationSQL);
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('Migration completed successfully!');
    
    // Verify the changes
    console.log('\nVerifying migration...');
    
    // Check if user_id column exists
    const userColumnCheck = await pool.query(`
      SELECT column_name, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'transactions' AND column_name = 'user_id'
    `);
    
    if (userColumnCheck.rows.length > 0) {
      console.log('✅ user_id column exists:', userColumnCheck.rows[0]);
    } else {
      console.log('❌ user_id column not found');
    }
    
    // Check if card_id is nullable
    const cardColumnCheck = await pool.query(`
      SELECT column_name, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'transactions' AND column_name = 'card_id'
    `);
    
    if (cardColumnCheck.rows.length > 0) {
      console.log('✅ card_id column is nullable:', cardColumnCheck.rows[0].is_nullable === 'YES' ? 'YES' : 'NO');
    } else {
      console.log('❌ card_id column not found');
    }
    
    // Check indexes
    const indexCheck = await pool.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'transactions'
    `);
    
    console.log('\nIndexes on transactions table:');
    indexCheck.rows.forEach(row => {
      console.log(`  - ${row.indexname}: ${row.indexdef}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
