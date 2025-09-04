const pool = require('./db');

async function updateExistingTransactions() {
  try {
    console.log('Starting to update existing transactions with user_id...');
    
    // Get all transactions that don't have user_id set
    const nullUserTransactions = await pool.query(`
      SELECT t.id, t.card_id, c.user_id 
      FROM transactions t 
      LEFT JOIN cards c ON t.card_id = c.id 
      WHERE t.user_id IS NULL
    `);
    
    console.log(`Found ${nullUserTransactions.rows.length} transactions without user_id`);
    
    if (nullUserTransactions.rows.length === 0) {
      console.log('All transactions already have user_id set!');
      return;
    }
    
    // Update transactions with user_id from their associated cards
    let updatedCount = 0;
    for (const row of nullUserTransactions.rows) {
      if (row.user_id) {
        await pool.query(
          'UPDATE transactions SET user_id = $1 WHERE id = $2',
          [row.user_id, row.id]
        );
        updatedCount++;
        console.log(`Updated transaction ${row.id} with user_id ${row.user_id}`);
      } else {
        console.log(`Warning: Transaction ${row.id} has no card_id, cannot determine user_id`);
      }
    }
    
    console.log(`Successfully updated ${updatedCount} transactions with user_id`);
    
    // Verify the update
    const remainingNullUsers = await pool.query(`
      SELECT COUNT(*) as count 
      FROM transactions 
      WHERE user_id IS NULL
    `);
    
    console.log(`Remaining transactions without user_id: ${remainingNullUsers.rows[0].count}`);
    
    // Show some sample transactions
    const sampleTransactions = await pool.query(`
      SELECT t.id, t.user_id, t.card_id, t.name, t.amount, t.type, c.user_id as card_user_id
      FROM transactions t 
      LEFT JOIN cards c ON t.card_id = c.id 
      ORDER BY t.id 
      LIMIT 5
    `);
    
    console.log('\nSample transactions:');
    sampleTransactions.rows.forEach(row => {
      console.log(`  ID: ${row.id}, User: ${row.user_id}, Card: ${row.card_id}, Name: ${row.name}, Amount: ${row.amount}, Type: ${row.type}`);
    });
    
  } catch (error) {
    console.error('Error updating transactions:', error);
    throw error;
  }
}

// Run the update
updateExistingTransactions()
  .then(() => {
    console.log('Transaction update completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Transaction update failed:', error);
    process.exit(1);
  });



