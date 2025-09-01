const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function createCheckInTable() {
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create_check_in_table.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    await pool.query(sqlContent);
    
    console.log('✅ Check-ins table created successfully!');
    
    // Test the table
    const testResult = await pool.query('SELECT * FROM check_ins LIMIT 1');
    console.log('✅ Table test successful. Sample query result:', testResult.rows);
    
  } catch (error) {
    console.error('❌ Error creating check-ins table:', error);
  } finally {
    await pool.end();
  }
}

createCheckInTable();


