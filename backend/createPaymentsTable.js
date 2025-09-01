const pool = require('./db');
const fs = require('fs');
const path = require('path');

async function createPaymentsTable() {
  try {
    console.log('Creating payments table...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create_payments_table.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    await pool.query(sqlContent);
    
    console.log('✅ Payments table created successfully!');
    
    // Verify the table was created
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'payments'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Table verification successful!');
    } else {
      console.log('❌ Table verification failed!');
    }
    
  } catch (error) {
    console.error('❌ Error creating payments table:', error.message);
  } finally {
    await pool.end();
  }
}

createPaymentsTable();






