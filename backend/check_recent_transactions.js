const pool = require('./db');

async function checkRecentTransactions() {
  try {
    console.log('Checking recent transactions...\n');
    
    // Get the most recent 10 transactions
    const recentTransactions = await pool.query(`
      SELECT 
        t.id, 
        t.user_id, 
        t.card_id, 
        t.name, 
        t.amount, 
        t.type, 
        t.time,
        u.username
      FROM transactions t 
      LEFT JOIN users u ON t.user_id = u.id 
      ORDER BY t.time DESC 
      LIMIT 10
    `);
    
    console.log(`Found ${recentTransactions.rows.length} recent transactions:\n`);
    
    recentTransactions.rows.forEach((row, index) => {
      const timeStr = new Date(row.time).toLocaleString();
      const cardInfo = row.card_id ? `Card ID: ${row.card_id}` : 'No Card (External Payment)';
      console.log(`${index + 1}. [${timeStr}] ${row.name}`);
      console.log(`   Amount: ${row.amount > 0 ? '+' : ''}${row.amount} (${row.type})`);
      console.log(`   User: ${row.username} (ID: ${row.user_id})`);
      console.log(`   ${cardInfo}`);
      console.log(`   Transaction ID: ${row.id}`);
      console.log('');
    });
    
    // Check total count
    const totalCount = await pool.query('SELECT COUNT(*) as count FROM transactions');
    console.log(`Total transactions in database: ${totalCount.rows[0].count}`);
    
    // Check transactions created today
    const todayTransactions = await pool.query(`
      SELECT COUNT(*) as count 
      FROM transactions 
      WHERE DATE(t.time) = CURRENT_DATE
    `);
    console.log(`Transactions created today: ${todayTransactions.rows[0].count}`);
    
    // Check transactions created in the last hour
    const lastHourTransactions = await pool.query(`
      SELECT COUNT(*) as count 
      FROM transactions 
      WHERE t.time >= NOW() - INTERVAL '1 hour'
    `);
    console.log(`Transactions created in the last hour: ${lastHourTransactions.rows[0].count}`);
    
  } catch (error) {
    console.error('Error checking transactions:', error);
    throw error;
  }
}

// Run the check
checkRecentTransactions()
  .then(() => {
    console.log('Transaction check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Transaction check failed:', error);
    process.exit(1);
  });




