const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function checkAndFixPaymentsTable() {
  try {
    console.log('Checking payments table structure...');
    
    // Check if table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'payments'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('Payments table does not exist. Creating...');
      await pool.query(`
        CREATE TABLE payments (
          id SERIAL PRIMARY KEY,
          user_id INTEGER,
          txn_id VARCHAR(255) UNIQUE NOT NULL,
          retrieval_ref VARCHAR(255) UNIQUE NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          payment_method VARCHAR(50) NOT NULL,
          status VARCHAR(50) DEFAULT 'pending',
          items JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      
      // Create indexes
      await pool.query('CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_payments_txn_id ON payments(txn_id);');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);');
      
      console.log('Payments table created successfully!');
    } else {
      console.log('Payments table exists. Checking structure...');
      
      // Check columns
      const columns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'payments'
        ORDER BY ordinal_position;
      `);
      
      console.log('Current columns:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    }
    
    // Test insert
    console.log('\nTesting insert...');
    const testTxnId = `test_${Date.now()}`;
    await pool.query(`
      INSERT INTO payments (user_id, txn_id, retrieval_ref, amount, payment_method, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (txn_id) DO NOTHING
    `, [1, testTxnId, `ref_${Date.now()}`, 18.00, 'ENETS', 'pending']);
    
    console.log('Test insert successful!');
    
    // Test update
    console.log('Testing update...');
    await pool.query(`
      UPDATE payments SET status = $1, updated_at = NOW() WHERE txn_id = $2
    `, ['completed', testTxnId]);
    
    console.log('Test update successful!');
    
    // Clean up test data
    await pool.query('DELETE FROM payments WHERE txn_id = $1', [testTxnId]);
    console.log('Test data cleaned up.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkAndFixPaymentsTable();










