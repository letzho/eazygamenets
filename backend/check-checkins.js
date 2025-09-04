const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'eazygame',
});

async function checkCheckIns() {
  try {
    console.log('Checking check-in records...');
    
    // First, let's see the table structure
    console.log('\n1. Checking table structure...');
    const structureResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'check_ins'
      ORDER BY ordinal_position
    `);
    
    console.log('Check-ins table structure:');
    structureResult.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Get all check-in records (simpler query)
    console.log('\n2. Checking check-in records...');
    const result = await pool.query('SELECT * FROM check_ins ORDER BY created_at DESC');
    
    if (result.rows.length === 0) {
      console.log('❌ No check-in records found');
    } else {
      console.log(`✅ Found ${result.rows.length} check-in record(s):`);
      result.rows.forEach((record, index) => {
        console.log(`\n  Record ${index + 1}:`);
        console.log(`    ID: ${record.id}`);
        console.log(`    User ID: ${record.user_id}`);
        console.log(`    Last Check-in: ${record.last_check_in}`);
        console.log(`    Current Streak: ${record.current_streak}`);
        console.log(`    Total Check-ins: ${record.total_check_ins}`);
        console.log(`    Created: ${record.created_at}`);
        console.log(`    Updated: ${record.updated_at}`);
        
        // Check if this is today's check-in
        if (record.last_check_in) {
          const lastCheckIn = new Date(record.last_check_in);
          const today = new Date();
          const isToday = lastCheckIn.toDateString() === today.toDateString();
          console.log(`    Is Today: ${isToday ? 'YES' : 'NO'}`);
        }
      });
    }
    
    // Check users table structure too
    console.log('\n3. Checking users table structure...');
    const usersStructureResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('Users table structure:');
    usersStructureResult.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
  } catch (error) {
    console.error('❌ Error checking check-ins:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

checkCheckIns();
