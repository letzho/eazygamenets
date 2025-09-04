const pool = require('./db');

async function checkLatestTransaction() {
  try {
    console.log('Checking the very latest transaction...\n');
    
    // Get the most recent transaction
    const latestTransaction = await pool.query(`
      SELECT 
        t.id, 
        t.user_id, 
        t.card_id, 
        t.name, 
        t.amount, 
        t.type, 
        t.time,
        u.username,
        EXTRACT(EPOCH FROM (NOW() - t.time)) as seconds_ago
      FROM transactions t 
      LEFT JOIN users u ON t.user_id = u.id 
      ORDER BY t.time DESC 
      LIMIT 1
    `);
    
    if (latestTransaction.rows.length > 0) {
      const row = latestTransaction.rows[0];
      const timeStr = new Date(row.time).toLocaleString();
      const cardInfo = row.card_id ? `Card ID: ${row.card_id}` : 'No Card (External Payment)';
      const secondsAgo = Math.round(row.seconds_ago);
      
      console.log(`Latest Transaction:`);
      console.log(`  ID: ${row.id}`);
      console.log(`  Name: ${row.name}`);
      console.log(`  Amount: ${row.amount > 0 ? '+' : ''}${row.amount} (${row.type})`);
      console.log(`  User: ${row.username} (ID: ${row.user_id})`);
      console.log(`  ${cardInfo}`);
      console.log(`  Time: ${timeStr}`);
      console.log(`  Created: ${secondsAgo} seconds ago`);
      console.log('');
    }
    
    // Check transactions created in the last 5 minutes
    const recent5Min = await pool.query(`
      SELECT COUNT(*) as count 
      FROM transactions 
      WHERE t.time >= NOW() - INTERVAL '5 minutes'
    `);
    console.log(`Transactions created in the last 5 minutes: ${recent5Min.rows[0].count}`);
    
    // Check transactions created in the last 1 minute
    const recent1Min = await pool.query(`
      SELECT COUNT(*) as count 
      FROM transactions 
      WHERE t.time >= NOW() - INTERVAL '1 minute'
    `);
    console.log(`Transactions created in the last 1 minute: ${recent1Min.rows[0].count}`);
    
    // Check if there are any pending payments
    const pendingPayments = await pool.query(`
      SELECT COUNT(*) as count 
      FROM payments 
      WHERE status = 'pending'
    `);
    console.log(`Pending payments: ${pendingPayments.rows[0].count}`);
    
    // Show recent pending payments
    if (pendingPayments.rows[0].count > 0) {
      const recentPending = await pool.query(`
        SELECT 
          p.txn_id, 
          p.amount, 
          p.payment_method, 
          p.status, 
          p.created_at,
          EXTRACT(EPOCH FROM (NOW() - p.created_at)) as seconds_ago
        FROM payments p 
        WHERE p.status = 'pending'
        ORDER BY p.created_at DESC 
        LIMIT 3
      `);
      
      console.log('\nRecent pending payments:');
      recentPending.rows.forEach((row, index) => {
        const timeStr = new Date(row.created_at).toLocaleString();
        const secondsAgo = Math.round(row.seconds_ago);
        console.log(`  ${index + 1}. ${row.payment_method}: $${row.amount} (${row.status}) - ${timeStr} (${secondsAgo}s ago)`);
      });
    }
    
  } catch (error) {
    console.error('Error checking latest transaction:', error);
    throw error;
  }
}

// Run the check
checkLatestTransaction()
  .then(() => {
    console.log('Latest transaction check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Latest transaction check failed:', error);
    process.exit(1);
  });



