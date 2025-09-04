const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const pool = require('./db');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
// const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const OpenAI = require('openai');
const { 
  PAYMENT_METHODS, 
  createPaymentPayload, 
  createNetsQrPayload,
  makeNetsRequest,
  generateHMAC
} = require('./netsConfig');

// Generate real QR code with NETS logo overlay
const generateSimulatedQrCode = async (txnId, amount) => {
  try {
    // Create QR code data (NETS payment data)
    const qrData = `NETS_PAYMENT:${txnId}:${amount}:${Date.now()}`;
    
    // Generate real QR code using qrcode library
    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      width: 200,
      height: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    // Convert data URL to base64
    const base64Data = qrCodeDataURL.split(',')[1];
    
    // Read the NETS logo from assets folder
    const netsLogoPath = path.join(__dirname, '..', 'eazygame', 'src', 'assets', 'netsQrLogo.png');
    const netsLogoBuffer = fs.readFileSync(netsLogoPath);
    const netsLogoBase64 = netsLogoBuffer.toString('base64');
    
    // Create SVG with real QR code and NETS logo overlay
    const svg = `
      <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <!-- Real QR Code as background -->
        <image href="data:image/png;base64,${base64Data}" width="200" height="200"/>
        
        <!-- White background for NETS Logo clear zone -->
        <rect x="75" y="75" width="50" height="50" fill="white"/>
        <!-- NETS Logo overlay in center -->
        <image href="data:image/png;base64,${netsLogoBase64}" x="75" y="75" width="50" height="50"/>
      </svg>
    `;
    
    return Buffer.from(svg).toString('base64');
    
  } catch (error) {
    console.error('Error generating QR code:', error);
    
    // Fallback to simple QR code if library fails
    const svg = `
      <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="200" fill="white"/>
        <text x="100" y="100" text-anchor="middle" fill="black" font-size="16">QR Code</text>
        <text x="100" y="120" text-anchor="middle" fill="black" font-size="12">${txnId}</text>
        <text x="100" y="140" text-anchor="middle" fill="black" font-size="12">$${amount}</text>
      </svg>
    `;
    return Buffer.from(svg).toString('base64');
  }
};

const app = express();
const PORT = process.env.PORT || 3002;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'https://eazygamenets-3d29b52fe934.herokuapp.com/',
    
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Optional: a health check under /api
app.get("/api/health", (req, res) => res.json({ ok: true }));

// Get NETS API credentials for frontend
app.get("/api/nets-credentials", (req, res) => {
  const apiKey = process.env.SANDBOX_API_KEY;
  const projectId = process.env.PROJECT_ID;
  
  if (!apiKey || !projectId) {
    return res.status(500).json({ 
      error: 'NETS API credentials not configured',
      message: 'Please check your .env file for SANDBOX_API_KEY and PROJECT_ID'
    });
  }
  
  res.json({ 
    apiKey: apiKey,
    projectId: projectId
  });
});

// Handle preflight requests
app.options('*', cors());

// Test route (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.get('/', (req, res) => {
    res.json({ message: 'Backend is running!' });
  });
}

// Test database connection
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      message: 'Database connected successfully!',
      timestamp: result.rows[0].now 
    });
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed', details: error.message });
  }
});

// Check database schema
app.get('/api/db-schema', async (req, res) => {
  try {
    // Check if tables exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'cards', 'transactions')
      ORDER BY table_name
    `);
    
    const tableNames = tablesResult.rows.map(row => row.table_name);
    
    // Check table structures
    const schemaInfo = {};
    for (const tableName of tableNames) {
      const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);
      schemaInfo[tableName] = columnsResult.rows;
    }
    
    // Count records in each table
    const counts = {};
    for (const tableName of tableNames) {
      const countResult = await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
      counts[tableName] = parseInt(countResult.rows[0].count);
    }
    
    res.json({
      tables_exist: tableNames,
      schema: schemaInfo,
      record_counts: counts,
      all_tables_present: tableNames.length === 3
    });
  } catch (error) {
    res.status(500).json({ error: 'Schema check failed', details: error.message });
  }
});

// User login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE username = $1 AND password_hash = $2', [username, password]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const user = userResult.rows[0];
    // Fetch cards
    const cardsResult = await pool.query('SELECT * FROM cards WHERE user_id = $1', [user.id]);
    // Fetch ALL transactions for the user, including those without cards (eNETS, NETS QR)
    const txResult = await pool.query('SELECT * FROM transactions WHERE user_id = $1 ORDER BY time DESC', [user.id]);
    res.json({
      user: { id: user.id, username: user.username },
      cards: cardsResult.rows,
      transactions: txResult.rows
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed', details: err.message });
  }
});

// Get cards for a user (by user_id query param for demo)
app.get('/api/cards', async (req, res) => {
  const userId = req.query.user_id;
  if (!userId) return res.status(400).json({ error: 'Missing user_id' });
  try {
    const cardsResult = await pool.query('SELECT * FROM cards WHERE user_id = $1', [userId]);
    res.json(cardsResult.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cards', details: err.message });
  }
});

// Get transactions for a user (by user_id query param for demo)
app.get('/api/transactions', async (req, res) => {
  const userId = req.query.user_id;
  if (!userId) return res.status(400).json({ error: 'Missing user_id' });
  try {
    // Fetch ALL transactions for the user, including those without cards (eNETS, NETS QR)
    const txResult = await pool.query('SELECT * FROM transactions WHERE user_id = $1 ORDER BY time DESC', [userId]);
    res.json(txResult.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transactions', details: err.message });
  }
});

// Add new card for a user
app.post('/api/cards', async (req, res) => {
  const { user_id, number, holder, expiry, design } = req.body;
  if (!user_id || !number || !holder || !expiry) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO cards (user_id, number, holder, expiry, balance, design) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [user_id, number, holder, expiry, 0, design || 'netscard1']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add card', details: err.message });
  }
});

// User registration
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing username or password' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
      [username, password]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') { // PostgreSQL unique violation
      return res.status(409).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Registration failed', details: err.message });
  }
});

// Top up card balance
app.post('/api/cards/topup', async (req, res) => {
  console.log('Top-up request received:', req.body);
  const { card_id, amount } = req.body;
  
  if (!card_id || !amount) {
    console.log('Missing required fields:', { card_id, amount });
    return res.status(400).json({ error: 'Missing card_id or amount' });
  }
  
  try {
    // Check if card exists first
    const cardCheck = await pool.query('SELECT * FROM cards WHERE id = $1', [card_id]);
    if (cardCheck.rows.length === 0) {
      console.log('Card not found:', card_id);
      return res.status(404).json({ error: 'Card not found' });
    }
    
    console.log('Updating card balance:', { card_id, current_balance: cardCheck.rows[0].balance, amount });
    
    // Update card balance
    const updateResult = await pool.query(
      'UPDATE cards SET balance = balance + $1 WHERE id = $2 RETURNING *',
      [amount, card_id]
    );
    
    console.log('Card updated:', updateResult.rows[0]);
    
    // Get user_id from the card
    const userResult = await pool.query('SELECT user_id FROM cards WHERE id = $1', [card_id]);
    const user_id = userResult.rows[0].user_id;
    
    // Insert a transaction record
    const transactionResult = await pool.query(
      'INSERT INTO transactions (user_id, card_id, name, time, amount, type) VALUES ($1, $2, $3, NOW(), $4, $5) RETURNING *',
      [user_id, card_id, 'Top-up', amount, 'income']
    );
    
    console.log('Transaction created:', transactionResult.rows[0]);
    
    res.json({ 
      success: true, 
      updated_card: updateResult.rows[0],
      transaction: transactionResult.rows[0]
    });
  } catch (err) {
    console.error('Top-up error:', err);
    res.status(500).json({ error: 'Top up failed', details: err.message });
  }
});

// Deduct from card balance (for sending money)
app.post('/api/cards/deduct', async (req, res) => {
  console.log('Deduct request received:', req.body);
  console.log('Request headers:', req.headers);
  console.log('Request method:', req.method);
  const { card_id, amount } = req.body;

  if (!card_id || amount === undefined || amount === null) {
    console.log('Missing required fields:', { card_id, amount });
    console.log('card_id type:', typeof card_id, 'value:', card_id);
    console.log('amount type:', typeof amount, 'value:', amount);
    return res.status(400).json({ error: 'Missing card_id or amount' });
  }
  
  if (amount < 0) {
    console.log('Invalid amount (negative):', amount);
    return res.status(400).json({ error: 'Amount cannot be negative' });
  }

  try {
    // Atomic update: only deduct if balance is sufficient
    const updateResult = await pool.query(
      `UPDATE cards
       SET balance = balance - $1
       WHERE id = $2 AND balance >= $1
       RETURNING *`,
      [amount, card_id]
    );

    if (updateResult.rows.length === 0) {
      // Not enough balance
      console.log('Insufficient balance for atomic update');
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    console.log('Card updated:', updateResult.rows[0]);

    res.json({
      success: true,
      updated_card: updateResult.rows[0]
    });
  } catch (err) {
    console.error('Deduct error:', err);
    res.status(500).json({ error: 'Deduct failed', details: err.message });
  }
});

// Add transaction record
app.post('/api/transactions', async (req, res) => {
  console.log('Transaction request received:', req.body);
  const { user_id, card_id, name, amount, type } = req.body;
  // Ignore any 'time' sent from frontend
  // card_id can be null for external payment methods (eNETS, NETS QR)
  if (!user_id || !name || amount === undefined || !type) {
    console.log('Missing required fields:', { user_id, name, amount, type });
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const transactionResult = await pool.query(
      'INSERT INTO transactions (user_id, card_id, name, time, amount, type) VALUES ($1, $2, $3, NOW(), $4, $5) RETURNING *',
      [user_id, card_id, name, amount, type]
    );
    console.log('Transaction created:', transactionResult.rows[0]);
    res.status(201).json(transactionResult.rows[0]);
  } catch (err) {
    console.error('Transaction creation error:', err);
    res.status(500).json({ error: 'Failed to create transaction', details: err.message });
  }
});

// Get user details by user ID
app.get('/api/users/:id', async (req, res) => {
  const userId = req.params.id;
  try {
    const userResult = await pool.query('SELECT id, username FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userResult.rows[0];
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user', details: err.message });
  }
});

// Split Bill endpoint for new payments
app.post('/api/split-bill', async (req, res) => {
  const { payer, payerEmail, amount, friends, message, cardId } = req.body;
  if (!payer || !payerEmail || !amount || !Array.isArray(friends) || friends.length === 0 || !cardId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    // Deduct total bill amount from selected card
    const deductResult = await pool.query(
      `UPDATE cards SET balance = balance - $1 WHERE id = $2 AND balance >= $1 RETURNING *`,
      [amount, cardId]
    );
    if (deductResult.rows.length === 0) {
      return res.status(400).json({ error: 'Insufficient balance on selected card' });
    }
    // Get user_id from the card
    const userResult = await pool.query('SELECT user_id FROM cards WHERE id = $1', [cardId]);
    const user_id = userResult.rows[0].user_id;
    
    // Add transaction for full bill amount
    await pool.query(
      'INSERT INTO transactions (user_id, card_id, name, time, amount, type) VALUES ($1, $2, $3, NOW(), $4, $5)',
      [user_id, cardId, 'Split Bill Payment', Math.abs(amount), 'expense']
    );
    // Calculate split amount (include payer)
    const totalPeople = friends.length + 1;
    const splitAmount = (amount / totalPeople).toFixed(2);
    // Generate NETS QR code for split bill
    const txnId = `split_bill_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const netsQrCode = await generateSimulatedQrCode(txnId, splitAmount);
    
    console.log('Generated QR code for split bill:', {
      txnId,
      splitAmount,
      qrCodeLength: netsQrCode ? netsQrCode.length : 0
    });
    
    // Store split bill payment record
    await pool.query(
      'INSERT INTO payments (user_id, txn_id, retrieval_ref, amount, payment_method, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
      [null, txnId, `split_${Date.now()}`, splitAmount, 'ENETS_QR', 'pending']
    );

    // Separate email and WhatsApp friends
    const emailFriends = friends.filter(friend => friend.type === 'email');
    const whatsappFriends = friends.filter(friend => friend.type === 'whatsapp');

    // Send emails to email friends
    if (emailFriends.length > 0) {
      // Set up nodemailer
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      // Send email to each friend
      for (const friend of emailFriends) {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: friend.email,
          subject: `NETS QR Payment Request from ${payer}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #003da6; text-align: center;">NETS QR Payment Request</h2>
              <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
                <h3 style="color: #333; margin-bottom: 15px;">Split Bill Details</h3>
                <p><strong>From:</strong> ${payer}</p>
                <p><strong>Amount:</strong> SGD $${splitAmount}</p>
                <p><strong>Message:</strong> ${message || 'Split bill payment'}</p>
                <p><strong>Transaction ID:</strong> ${txnId}</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <h3 style="color: #333; margin-bottom: 15px;">Scan NETS QR Code to Pay</h3>
                <div style="background: white; padding: 20px; border: 2px solid #e0e0f0; border-radius: 10px; display: inline-block;">
                  <img src="data:image/svg+xml;base64,${netsQrCode}" alt="NETS QR Code" style="max-width: 250px; height: auto; display: block; margin: 0 auto;" />
                </div>
                <p style="color: #666; margin-top: 15px; font-size: 14px;">
                  📱 Open your NETSPay app and scan this QR code to complete the payment
                </p>
              </div>
              <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h4 style="color: #0066cc; margin-bottom: 10px;">How to Pay:</h4>
                <ol style="color: #333; line-height: 1.6;">
                  <li>Open your NETSPay mobile app</li>
                  <li>Tap on "Scan QR" or "Pay QR"</li>
                  <li>Point your camera at the QR code above</li>
                  <li>Confirm the payment amount of SGD $${splitAmount}</li>
                  <li>Complete the payment</li>
                </ol>
              </div>
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0f0;">
                <p style="color: #666; font-size: 12px;">
                  This payment request was sent from EasyGame Payment App
                </p>
              </div>
            </div>
          `,
          attachments: [
            {
              filename: 'nets-qr-code.svg',
              content: netsQrCode,
              encoding: 'base64',
              contentType: 'image/svg+xml'
            }
          ]
        };
        try {
          await transporter.sendMail(mailOptions);
        } catch (emailErr) {
          console.error('Failed to send email to', friend.email, emailErr);
          return res.status(500).json({ error: `Failed to send email to ${friend.email}`, details: emailErr.message });
        }
      }
    }

    // Send WhatsApp messages to WhatsApp friends
    if (whatsappFriends.length > 0) {
      // Check if Twilio credentials are available
      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_WHATSAPP_FROM) {
        console.log('Twilio credentials not configured. Skipping WhatsApp messages.');
        // Continue without failing the request
      } else {
        try {
          const twilio = require('twilio');
          const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
          
          for (const friend of whatsappFriends) {
            const whatsappMessage = `💰 *NETS QR Payment Request*

*From:* ${payer}
*Amount:* SGD $${splitAmount}
*Message:* ${message || 'Split bill payment'}
*Transaction ID:* ${txnId}

📧 *QR Code Sent to Email*

Since WhatsApp cannot display QR codes directly, we've sent the NETS QR code to your email address. Please check your email for the QR code to complete the payment.

*How to Pay:*
1. Check your email for the NETS QR code
2. Open your NETSPay mobile app
3. Tap on "Scan QR" or "Pay QR"
4. Point your camera at the QR code from your email
5. Confirm the payment amount of SGD $${splitAmount}
6. Complete the payment

*Alternative:* You can also use the NETSPay app to scan any NETS QR code at participating merchants.

This payment request was sent from EasyGame Payment App`;

            try {
              await client.messages.create({
                body: whatsappMessage,
                from: process.env.TWILIO_WHATSAPP_FROM,
                to: `whatsapp:${friend.phone}`
              });
              console.log(`WhatsApp message sent to ${friend.phone}`);
            } catch (whatsappErr) {
              console.error('Failed to send WhatsApp message to', friend.phone, whatsappErr);
              // Continue with other friends even if one fails
            }
          }
        } catch (twilioErr) {
          console.error('Twilio setup error:', twilioErr);
          // Don't fail the entire request if Twilio fails, just log the error
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Split bill error:', err);
    res.status(500).json({ error: 'Failed to process split bill', details: err.message });
  }
});

// Generate QR codes for existing transactions (no payment required)
app.post('/api/split-bill/existing', async (req, res) => {
  const { payer, payerEmail, amount, friends, message } = req.body;
  if (!payer || !payerEmail || !amount || !Array.isArray(friends) || friends.length === 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  try {
    // Calculate split amount (include payer)
    const totalPeople = friends.length + 1;
    const splitAmount = (amount / totalPeople).toFixed(2);
    
    // Generate NETS QR code for split bill
    const txnId = `split_bill_existing_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const netsQrCode = await generateSimulatedQrCode(txnId, splitAmount);
    
    console.log('Generated QR code for existing transaction split bill:', {
      txnId,
      splitAmount,
      qrCodeLength: netsQrCode ? netsQrCode.length : 0
    });
    
    // Store split bill payment record (no user_id since no payment made)
    await pool.query(
      'INSERT INTO payments (user_id, txn_id, retrieval_ref, amount, payment_method, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
      [null, txnId, `split_existing_${Date.now()}`, splitAmount, 'ENETS_QR', 'pending']
    );

    // Separate email and WhatsApp friends
    const emailFriends = friends.filter(friend => friend.type === 'email');
    const whatsappFriends = friends.filter(friend => friend.type === 'whatsapp');

    // Send emails to email friends
    if (emailFriends.length > 0) {
      // Set up nodemailer
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      // Send email to each friend
      for (const friend of emailFriends) {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: friend.email,
          subject: `NETS QR Payment Request from ${payer}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #003da6; text-align: center;">NETS QR Payment Request</h2>
              <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
                <h3 style="color: #333; margin-bottom: 15px;">Split Bill Details</h3>
                <p><strong>From:</strong> ${payer}</p>
                <p><strong>Amount:</strong> SGD $${splitAmount}</p>
                <p><strong>Message:</strong> ${message || 'Split bill payment'}</p>
                <p><strong>Transaction ID:</strong> ${txnId}</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <h3 style="color: #333; margin-bottom: 15px;">Scan NETS QR Code to Pay</h3>
                <div style="background: white; padding: 20px; border: 2px solid #e0e0f0; border-radius: 10px; display: inline-block;">
                  <img src="data:image/svg+xml;base64,${netsQrCode}" alt="NETS QR Code" style="max-width: 250px; height: auto; display: block; margin: 0 auto;" />
                </div>
                <p style="color: #666; margin-top: 15px; font-size: 14px;">
                  📱 Open your NETSPay app and scan this QR code to complete the payment
                </p>
              </div>
              <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h4 style="color: #0066cc; margin-bottom: 10px;">How to Pay:</h4>
                <ol style="color: #333; line-height: 1.6;">
                  <li>Open your NETSPay mobile app</li>
                  <li>Tap on "Scan QR" or "Pay QR"</li>
                  <li>Point your camera at the QR code above</li>
                  <li>Confirm the payment amount of SGD $${splitAmount}</li>
                  <li>Complete the payment</li>
                </ol>
              </div>
              <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                <p style="color: #856404; margin: 0; font-weight: 600;">
                  💡 This is a split bill request for an existing transaction. The main payment has already been made.
                </p>
              </div>
            </div>`
        };

        try {
          await transporter.sendMail(mailOptions);
          console.log(`Email sent to ${friend.email}`);
        } catch (emailErr) {
          console.error('Failed to send email to', friend.email, emailErr);
          // Continue with other friends even if one fails
        }
      }
    }

    // Send WhatsApp messages to WhatsApp friends
    if (whatsappFriends.length > 0) {
      // Check if Twilio credentials are available
      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_WHATSAPP_FROM) {
        console.log('Twilio credentials not configured. Skipping WhatsApp messages.');
        // Continue without failing the request
      } else {
        try {
          const twilio = require('twilio');
          const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
          
          for (const friend of whatsappFriends) {
            const whatsappMessage = `💰 *NETS QR Payment Request*

*From:* ${payer}
*Amount:* SGD $${splitAmount}
*Message:* ${message || 'Split bill payment'}
*Transaction ID:* ${txnId}

📧 *QR Code Sent to Email*

Since WhatsApp cannot display QR codes directly, we've sent the NETS QR code to your email address. Please check your email for the QR code to complete the payment.

*How to Pay:*
1. Check your email for the NETS QR code
2. Open your NETSPay mobile app
3. Tap on "Scan QR" or "Pay QR"
4. Point your camera at the QR code from your email
5. Confirm the payment amount of SGD $${splitAmount}
6. Complete the payment

*Alternative:* You can also use the NETSPay app to scan any NETS QR code at participating merchants.

💡 *This is a split bill request for an existing transaction. The main payment has already been made.*

This payment request was sent from EasyGame Payment App`;

            try {
              await client.messages.create({
                body: whatsappMessage,
                from: process.env.TWILIO_WHATSAPP_FROM,
                to: `whatsapp:${friend.phone}`
              });
              console.log(`WhatsApp message sent to ${friend.phone}`);
            } catch (whatsappErr) {
              console.error('Failed to send WhatsApp message to', friend.phone, whatsappErr);
              // Continue with other friends even if one fails
            }
          }
        } catch (twilioErr) {
          console.error('Twilio setup error:', twilioErr);
        }
      }
    }

    res.json({ 
      success: true, 
      message: 'QR codes generated and sent successfully',
      txnId,
      splitAmount,
      emailSent: emailFriends.length,
      whatsappSent: whatsappFriends.length
    });
    
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR codes', details: err.message });
  }
});

// Delete card endpoint
app.delete('/api/cards/:id', async (req, res) => {
  const cardId = req.params.id;
  try {
    // Check if card exists
    const cardCheck = await pool.query('SELECT * FROM cards WHERE id = $1', [cardId]);
    if (cardCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }
    
    // Delete the card
    await pool.query('DELETE FROM cards WHERE id = $1', [cardId]);
    
    res.json({ message: 'Card deleted successfully' });
  } catch (err) {
    console.error('Delete card error:', err);
    res.status(500).json({ error: 'Failed to delete card', details: err.message });
  }
});

// AI Eaze endpoint
app.post('/api/ai-response', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('AI Request received:', message);
    console.log('OpenAI API Key:', process.env.OPENAI_API_KEY ? 'Present' : 'Missing');

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful AI assistant for a payment app called NETS. You can help users with payment-related questions, financial advice, and general assistance. Keep responses concise and friendly."
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0].message.content;
    console.log('AI Response:', aiResponse);

    res.json({ 
      response: aiResponse,
      source: "openai"
    });

  } catch (error) {
    console.error('AI Error:', error);
    res.status(500).json({ 
      error: 'Failed to get AI response', 
      details: error.message,
      source: "error"
    });
  }
});

// Google Places API endpoint
app.get('/api/places/nearby', async (req, res) => {
  try {
    const { lat, lng, type = 'restaurant' } = req.query;
  
  if (!lat || !lng) {
    return res.status(400).json({ error: 'Latitude and longitude are required' });
  }

    console.log('Places API Request:', { lat, lng, type });
    console.log('Google API Key:', process.env.GOOGLE_API_KEY ? 'Present' : 'Missing');

    if (!process.env.GOOGLE_API_KEY) {
      console.log('No Google API key found, returning mock data');
      // Return mock data if no API key
      const mockPlaces = [
        {
          id: 1,
          name: 'McDonald\'s',
          category: 'Fast Food',
          rating: 4.2,
          distance: '0.3km',
          deliveryTime: '15-25 min',
          image: '🍔',
          priceRange: '$$'
        },
        {
          id: 2,
          name: 'Starbucks Coffee',
          category: 'Coffee',
          rating: 4.5,
          distance: '0.5km',
          deliveryTime: '10-20 min',
          image: '☕',
          priceRange: '$$'
        },
        {
          id: 3,
          name: 'KFC',
          category: 'Fast Food',
          rating: 4.1,
          distance: '0.7km',
          deliveryTime: '20-30 min',
          image: '🍗',
          priceRange: '$$'
        }
      ];
      return res.json({ places: mockPlaces });
    }

    // Make request to Google Places API
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=1000&type=${type}&key=${process.env.GOOGLE_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Google Places API error:', data.status, data.error_message);
      throw new Error(`Google Places API error: ${data.status}`);
    }

    // Transform Google Places data to our format
    const places = data.results.map((place, index) => ({
      id: index + 1,
      name: place.name,
      category: place.types?.[0] || 'Restaurant',
      rating: place.rating || 4.0,
      distance: `${Math.round(place.geometry?.location?.distance || 0.5)}km`,
      deliveryTime: `${Math.floor(Math.random() * 15) + 10}-${Math.floor(Math.random() * 15) + 20} min`,
      image: place.photos?.[0]?.photo_reference ? 
        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${process.env.GOOGLE_API_KEY}` : 
        '🍽️',
      priceRange: place.price_level ? '$'.repeat(place.price_level) : '$$'
    }));

    console.log(`Found ${places.length} places`);
    res.json({ places });

  } catch (error) {
    console.error('Places API Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch nearby places', 
      details: error.message 
    });
  }
});

// NETS Payment Gateway Endpoints

// Get available payment methods
app.get('/api/payment/methods', (req, res) => {
  try {
    res.json({ 
      methods: PAYMENT_METHODS,
      success: true 
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ 
      error: 'Failed to get payment methods', 
      details: error.message 
    });
  }
});

// Step 2: Create NETS B2S Transaction Request
app.post('/api/payment/create', async (req, res) => {
  try {
    const { amount, paymentMethod, otpType, items } = req.body;
    
    if (!amount || !paymentMethod) {
      return res.status(400).json({ error: 'Amount and payment method are required' });
    }

    if (!PAYMENT_METHODS[paymentMethod]) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    console.log('Creating NETS B2S payment request:', { amount, paymentMethod, otpType });

    // Create txnReq message and generate MAC value
    const { txnReq, keyId, macValue, merchantTxnRef, merchantTxnDtm } = createPaymentPayload(amount, paymentMethod, otpType);

    // Store payment record in database
    const userId = req.body.userId || null;
    await pool.query(
      'INSERT INTO payments (user_id, txn_id, retrieval_ref, amount, payment_method, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
      [userId, merchantTxnRef, merchantTxnRef, amount, paymentMethod, 'pending']
    );

    // Step 2: Return keyId, MAC Value, and txnReq for embedding in HTML page
    res.json({
      success: true,
      keyId: keyId,
      macValue: macValue,
      txnReq: txnReq,
      merchantTxnRef: merchantTxnRef,
      merchantTxnDtm: merchantTxnDtm,
      paymentMethod: PAYMENT_METHODS[paymentMethod]
    });

  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ 
      error: 'Failed to create payment', 
      details: error.message 
    });
  }
});

// NETS QR payment request endpoint (matching working implementation)
app.post('/api/payment/nets-qr-request', async (req, res) => {
  try {
    console.log('=== NETS QR REQUEST DEBUG ===');
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);
    console.log('Request body type:', typeof req.body);
    console.log('Request body keys:', Object.keys(req.body || {}));
    console.log('=============================');
    
    const { txn_id, amt_in_dollars, notify_mobile = 0 } = req.body;
    
    if (!amt_in_dollars || !txn_id) {
      console.log('Validation failed - missing fields:');
      console.log('amt_in_dollars:', amt_in_dollars);
      console.log('txn_id:', txn_id);
      return res.status(400).json({ error: 'Amount and transaction ID are required' });
    }

    // Convert amount to number
    const numericAmount = parseFloat(amt_in_dollars);
    if (isNaN(numericAmount)) {
      return res.status(400).json({ error: 'Invalid amount format' });
    }

    console.log('Creating NETS QR payment request:', { numericAmount, txn_id, notify_mobile });

    // Create payload matching working implementation
    const payload = createNetsQrPayload(numericAmount, txn_id, notify_mobile);
    
    // Make request to NETS API using the correct endpoint
    console.log('Making NETS QR request to:', '/common/payments/nets-qr/request');
    console.log('Request payload:', payload);
    
    let netsResponse;
    try {
      // Call the real NETS API to get the actual QR code
      netsResponse = await makeNetsRequest('/common/payments/nets-qr/request', payload);
      console.log('NETS QR response from API:', netsResponse);
      
      // Check if we got a valid response with QR code
      if (!netsResponse.result || !netsResponse.result.data || !netsResponse.result.data.qr_code) {
        throw new Error('No QR code received from NETS API');
      }
      
    } catch (error) {
      console.log('NETS API error:', error.message);
      console.log('This is expected in sandbox environment - NETS API may not be accessible');
      
      // Generate simulated QR code for testing
      console.log('Generating simulated QR code for testing...');
      const simulatedQrCode = await generateSimulatedQrCode(txn_id, numericAmount);
      
      // Store payment record in database
      const userId = req.body.userId || null;
      await pool.query(
        'INSERT INTO payments (user_id, txn_id, retrieval_ref, amount, payment_method, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
        [userId, txn_id, `sim_${Date.now()}`, numericAmount, 'ENETS_QR', 'pending']
      );
      
      return res.json({
        success: true,
        response_code: "00",
        txn_status: 1,
        qr_code: simulatedQrCode,
        txn_retrieval_ref: `sim_${Date.now()}`,
        network_status: 0,
        instruction: "Scan this QR code to complete payment (Simulated for testing)"
      });
    }
    
    // Check if response is successful
    if (netsResponse.result && 
        netsResponse.result.data && 
        netsResponse.result.data.response_code === "00" &&
        netsResponse.result.data.txn_status === 1 &&
        netsResponse.result.data.qr_code) {
      
      // Store payment record in database
      const userId = req.body.userId || null;
      await pool.query(
        'INSERT INTO payments (user_id, txn_id, retrieval_ref, amount, payment_method, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
        [userId, txn_id, netsResponse.result.data.txn_retrieval_ref, numericAmount, 'ENETS_QR', 'pending']
      );
      
      res.json({
        success: true,
        response_code: netsResponse.result.data.response_code,
        txn_status: netsResponse.result.data.txn_status,
        qr_code: netsResponse.result.data.qr_code,
        txn_retrieval_ref: netsResponse.result.data.txn_retrieval_ref,
        network_status: netsResponse.result.data.network_status,
        instruction: netsResponse.result.data.instruction || ""
      });
    } else {
      res.json({
        success: false,
        response_code: netsResponse.result?.data?.response_code || "N.A.",
        txn_status: netsResponse.result?.data?.txn_status || 0,
        qr_code: "",
        instruction: netsResponse.result?.data?.instruction || "",
        errorMsg: netsResponse.result?.data?.network_status !== 0 ? "Frontend Error Message" : "",
        network_status: netsResponse.result?.data?.network_status || 0
      });
    }
    
  } catch (error) {
    console.error('NETS QR request error:', error);
    res.status(500).json({
      error: 'Failed to create NETS QR payment request',
      details: error.message
    });
  }
});

// NETS QR query endpoint (matching working implementation)
app.post('/api/payment/nets-qr-query', async (req, res) => {
  try {
    console.log('NETS QR query received:', req.body);
    
    const { txn_retrieval_ref, frontend_timeout_status = 0 } = req.body;
    
    if (!txn_retrieval_ref) {
      return res.status(400).json({ error: 'Transaction retrieval reference is required' });
    }

    console.log('Querying NETS QR payment:', { txn_retrieval_ref, frontend_timeout_status });

    // Create payload for query
    const payload = {
      txn_retrieval_ref: txn_retrieval_ref,
      frontend_timeout_status: frontend_timeout_status
    };
    
    // Make request to NETS API using the correct endpoint
    let netsResponse;
    try {
      netsResponse = await makeNetsRequest('/common/payments/nets-qr/query', payload);
      console.log('NETS QR query response:', netsResponse);
    } catch (error) {
      console.log('NETS API not accessible, using sandbox simulation');
      
      // Simulate successful query response for sandbox testing
      netsResponse = {
        result: {
          data: {
            response_code: "00",
            txn_status: 1
          }
        }
      };
      
      console.log('NETS QR query response (simulated):', netsResponse);
    }
    
    console.log('NETS QR query response:', netsResponse);
    
    // Check if response is successful
    if (netsResponse.result && 
        netsResponse.result.data && 
        netsResponse.result.data.response_code === "00" && 
        netsResponse.result.data.txn_status === 1) {
      
      // Update payment status in database
      await pool.query(
        'UPDATE payments SET status = $1, updated_at = NOW() WHERE retrieval_ref = $2',
        ['completed', txn_retrieval_ref]
      );
      
      res.json({
        success: true,
        response_code: netsResponse.result.data.response_code,
        txn_status: netsResponse.result.data.txn_status
      });
    } else {
      res.json({
        success: false,
        response_code: netsResponse.result?.data?.response_code || "N.A.",
        txn_status: netsResponse.result?.data?.txn_status || 0
      });
    }
    
  } catch (error) {
    console.error('NETS QR query error:', error);
    res.status(500).json({
      error: 'Failed to query NETS QR payment',
      details: error.message
    });
  }
});

// NETS QR webhook endpoint (Server-Sent Events)
app.get('/api/payment/nets-qr-webhook/:retrievalRef', async (req, res) => {
  try {
    const { retrievalRef } = req.params;
    
    console.log('NETS QR webhook connection for:', retrievalRef);
    
    // Set headers for Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });
    
    // Send initial connection message
    res.write(`data: ${JSON.stringify({ message: 'Connected to NETS QR webhook' })}\n\n`);
    
    // For sandbox testing, we'll only simulate the connection
    // The actual payment success should come from user scanning the QR code
    console.log('Webhook connection established for:', retrievalRef);
    
    // Send initial connection message
    res.write(`data: ${JSON.stringify({ 
      message: 'Connected to NETS QR webhook',
      retrievalRef: retrievalRef
    })}\n\n`);
    
    // Keep connection alive for 10 minutes (600 seconds)
    const keepAliveInterval = setInterval(() => {
      res.write(`data: ${JSON.stringify({ 
        message: 'keep-alive',
        timestamp: new Date().toISOString()
      })}\n\n`);
    }, 30000); // Send keep-alive every 30 seconds
    
    // Clean up on client disconnect or timeout
    req.on('close', () => {
      console.log('Webhook connection closed for:', retrievalRef);
      clearInterval(keepAliveInterval);
    });
    
    // Timeout after 10 minutes
    setTimeout(() => {
      console.log('Webhook connection timeout for:', retrievalRef);
      clearInterval(keepAliveInterval);
      res.end();
    }, 600000); // 10 minutes
    
    // Clean up on client disconnect
    req.on('close', () => {
      clearInterval(interval);
    });
    
  } catch (error) {
    console.error('NETS QR webhook error:', error);
    res.status(500).json({
      error: 'Failed to establish webhook connection',
      details: error.message
    });
  }
});

// NETS B2S QR Payment Page Generator
app.post('/api/payment/nets-b2s-qr', async (req, res) => {
  try {
    console.log('NETS B2S QR request received:', req.body);
    console.log('Request headers:', req.headers);
    
    const { amount, paymentMethod, otpType, items } = req.body;
    
    if (!amount || !paymentMethod) {
      console.log('Missing required fields:', { amount, paymentMethod });
      return res.status(400).json({ error: 'Amount and payment method are required' });
    }

    // Convert amount to number since form data comes as string
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) {
      console.log('Invalid amount:', amount);
      return res.status(400).json({ error: 'Invalid amount format' });
    }

    console.log('Creating NETS B2S QR payment page:', { numericAmount, paymentMethod, otpType });

    // Create txnReq message and generate MAC value
    const { txnReq, keyId, macValue, merchantTxnRef, merchantTxnDtm } = createPaymentPayload(numericAmount, paymentMethod, otpType);

    // Store payment record in database
    const userId = req.body.userId || null;
    await pool.query(
      'INSERT INTO payments (user_id, txn_id, retrieval_ref, amount, payment_method, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
      [userId, merchantTxnRef, merchantTxnRef, numericAmount, paymentMethod, 'pending']
    );

    // Create HTML page with embedded NETS JavaScript plugin
    const htmlPage = `
<!DOCTYPE html>
<html>
<head>
    <title>NETS B2S QR Payment</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 500px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
        }
        .payment-info {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .qr-container {
            text-align: center;
            margin: 20px 0;
        }
        .status {
            text-align: center;
            margin: 20px 0;
            font-weight: bold;
        }
        .loading {
            color: #007bff;
        }
        .success {
            color: #28a745;
        }
        .error {
            color: #dc3545;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>NETS QR Payment</h2>
            <p>Amount: SGD $${numericAmount.toFixed(2)}</p>
        </div>
        
        <div class="payment-info">
            <p><strong>Transaction ID:</strong> ${merchantTxnRef}</p>
            <p><strong>Payment Method:</strong> ${PAYMENT_METHODS[paymentMethod].name}</p>
        </div>
        
        <div class="qr-container" id="qrContainer">
            <div class="status loading">Generating QR Code...</div>
        </div>
        
        <div class="status" id="status">Please scan the QR code with your NETSPay app</div>
    </div>

    <!-- NETS JavaScript Plugin -->
    <script src="https://sit2.enets.sg/MerchantApp/js/jquery-1.10.2.min.js"></script>
    <script src="https://sit2.enets.sg/MerchantApp/js/env.jsp"></script>
    <script src="https://sit2.enets.sg/MerchantApp/js/apps.js"></script>
    
    <script>
        // NETS B2S QR Payment Flow
        const txnReq = ${JSON.stringify(txnReq)};
        const hmac = '${macValue}';
        const keyId = '${keyId}';
        
        console.log('NETS B2S QR Payment initiated');
        console.log('txnReq:', txnReq);
        console.log('hmac:', hmac);
        console.log('keyId:', keyId);
        
        // Step 3: Send to NETS Gateway via JavaScript Plugin
        try {
            // Call NETS JavaScript plugin to send payment request
            if (typeof window.sendPayLoad === 'function') {
                window.sendPayLoad(txnReq, hmac, keyId);
                
                // Update status
                document.getElementById('status').innerHTML = 'Payment request sent to NETS Gateway. Please scan QR code.';
                document.getElementById('status').className = 'status loading';
                
                // Simulate QR code generation (in real implementation, this comes from NETS)
                setTimeout(() => {
                    document.getElementById('qrContainer').innerHTML = 
                        '<div style="background: #f0f0f0; padding: 20px; border-radius: 8px;">' +
                        '<p>QR Code Generated</p>' +
                        '<p style="font-size: 12px; color: #666;">Scan with NETSPay app</p>' +
                        '</div>';
                }, 2000);
                
            } else {
                // Fallback: Simulate NETS B2S flow for sandbox testing
                console.log('NETS JavaScript plugin not available, using sandbox simulation');
                
                // Update status
                document.getElementById('status').innerHTML = 'Simulating NETS B2S QR flow for sandbox testing...';
                document.getElementById('status').className = 'status loading';
                
                // Simulate QR code generation
                setTimeout(() => {
                    document.getElementById('qrContainer').innerHTML = 
                        '<div style="background: #f0f4ff; padding: 20px; border-radius: 8px; border: 2px solid #003da6;">' +
                        '<h3 style="color: #003da6; margin: 0 0 10px 0;">NETS QR Code</h3>' +
                        '<div style="background: #fff; padding: 15px; border-radius: 4px; text-align: center;">' +
                        '<p style="margin: 0; font-size: 14px; color: #666;">[QR Code Placeholder]</p>' +
                        '<p style="margin: 5px 0 0 0; font-size: 12px; color: #003da6;">Scan with NETSPay app</p>' +
                        '</div>' +
                        '<p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">Amount: SGD $${numericAmount.toFixed(2)}</p>' +
                        '</div>';
                }, 2000);
                
                // Simulate successful payment after 10 seconds
                setTimeout(() => {
                    document.getElementById('status').innerHTML = 'Payment Successful! (Sandbox Simulation)';
                    document.getElementById('status').className = 'status success';
                    
                    // Mark payment as successful in backend
                    fetch('/api/payment/success', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            merchantTxnRef: '${merchantTxnRef}',
                            amount: ${numericAmount},
                            paymentMethod: '${paymentMethod}'
                        })
                    }).then(response => response.json())
                    .then(data => {
                        console.log('Payment marked as successful:', data);
                    })
                    .catch(error => {
                        console.error('Error marking payment as successful:', error);
                    });
                    
                    // Close window after 3 seconds
                    setTimeout(() => {
                        window.close();
                    }, 3000);
                }, 10000);
            }
        } catch (error) {
            console.error('NETS B2S QR Error:', error);
            document.getElementById('status').innerHTML = 'Error: ' + error.message;
            document.getElementById('status').className = 'status error';
        }
        
        // Poll for payment status
        function pollPaymentStatus() {
            fetch('/api/payment/status/${merchantTxnRef}')
                .then(response => response.json())
                .then(data => {
                    if (data.success && data.status === 'completed') {
                        document.getElementById('status').innerHTML = 'Payment Successful!';
                        document.getElementById('status').className = 'status success';
                        // Redirect or close after success
                        setTimeout(() => {
                            window.close();
                        }, 3000);
                    } else if (data.success && data.status === 'failed') {
                        document.getElementById('status').innerHTML = 'Payment Failed';
                        document.getElementById('status').className = 'status error';
                    }
                })
                .catch(error => {
                    console.error('Status polling error:', error);
                });
        }
        
        // Start polling every 5 seconds
        setInterval(pollPaymentStatus, 5000);
    </script>
</body>
</html>`;

    // Return the HTML page
    res.setHeader('Content-Type', 'text/html');
    res.send(htmlPage);

  } catch (error) {
    console.error('NETS B2S QR error:', error);
    res.status(500).json({ 
      error: 'Failed to create NETS B2S QR payment', 
      details: error.message 
    });
  }
});

// Step 4: Handle s2sTxnEnd (Server-to-Server Transaction End)
app.post('/api/payment/s2s-txn-end', async (req, res) => {
  try {
    const { keyId, macValue, txnRes } = req.body;
    
    console.log('Received s2sTxnEnd:', { keyId, macValue, txnRes });

    // Verify MAC value
    const expectedMac = generateHMAC(txnRes);
    if (macValue !== expectedMac) {
      return res.status(400).json({ error: 'Invalid MAC value' });
    }

    // Update payment status in database
    await pool.query(
      'UPDATE payments SET status = $1, updated_at = NOW() WHERE txn_id = $2',
      [txnRes.status || 'completed', txnRes.txn_id]
    );

    res.json({ success: true, message: 's2sTxnEnd processed successfully' });

  } catch (error) {
    console.error('s2sTxnEnd error:', error);
    res.status(500).json({ 
      error: 'Failed to process s2sTxnEnd', 
      details: error.message 
    });
  }
});

// Step 6: Handle b2sTxnEnd (Browser-to-Server Transaction End)
app.post('/api/payment/b2s-txn-end', async (req, res) => {
  try {
    const { keyId, macValue, txnRes } = req.body;
    
    console.log('Received b2sTxnEnd:', { keyId, macValue, txnRes });

    // Verify MAC value
    const expectedMac = generateHMAC(txnRes);
    if (macValue !== expectedMac) {
      return res.status(400).json({ error: 'Invalid MAC value' });
    }

    // Update payment status in database
    await pool.query(
      'UPDATE payments SET status = $1, updated_at = NOW() WHERE txn_id = $2',
      [txnRes.status || 'completed', txnRes.merchantTxnRef]
    );

    res.json({ success: true, message: 'b2sTxnEnd processed successfully' });

  } catch (error) {
    console.error('b2sTxnEnd error:', error);
    res.status(500).json({ 
      error: 'Failed to process b2sTxnEnd', 
      details: error.message 
    });
  }
});

// Query payment status
app.get('/api/payment/status/:txnId', async (req, res) => {
  try {
    const { txnId } = req.params;
    
    if (!txnId) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }

    console.log('Querying payment status for:', txnId);

    // First, check database for payment status
    const dbResult = await pool.query(
      'SELECT * FROM payments WHERE txn_id = $1',
      [txnId]
    );

    if (dbResult.rows.length > 0) {
      const payment = dbResult.rows[0];
      console.log('Payment found in database:', payment);
      
      res.json({
        success: true,
        status: payment.status,
        paymentData: payment
      });
      return;
    }

    // If not in database, try NETS API (for sandbox, this might fail)
    try {
      const payload = { txn_id: txnId };
      const netsResponse = await makeNetsRequest('/common/payments/enets/query', payload);

      // Update payment status in database
      await pool.query(
        'UPDATE payments SET status = $1, updated_at = NOW() WHERE txn_id = $2',
        [netsResponse.status || 'unknown', txnId]
      );

      res.json({
        success: true,
        status: netsResponse.status,
        paymentData: netsResponse
      });
    } catch (netsError) {
      console.log('NETS API not accessible, returning pending status');
      res.json({
        success: true,
        status: 'pending',
        paymentData: { txn_id: txnId, status: 'pending' }
      });
    }

  } catch (error) {
    console.error('Query payment status error:', error);
    res.status(500).json({ 
      error: 'Failed to query payment status', 
      details: error.message 
    });
  }
});

// Server-to-server transaction status check
app.get('/api/payment/s2s/:retrievalRef', async (req, res) => {
  try {
    const { retrievalRef } = req.params;
    
    if (!retrievalRef) {
      return res.status(400).json({ error: 'Retrieval reference is required' });
    }

    console.log('Checking S2S status for:', retrievalRef);

    // Query NETS API for S2S status
    const payload = { txn_retrieval_ref: retrievalRef };
    const netsResponse = await makeNetsRequest(`/common/payments/enets/s2s?txn_retrieval_ref=${retrievalRef}`, payload);

    res.json({
      success: true,
      s2sStatus: netsResponse,
      retrievalRef
    });

  } catch (error) {
    console.error('S2S status check error:', error);
    res.status(500).json({ 
      error: 'Failed to check S2S status', 
      details: error.message 
    });
  }
});



// Mark payment as successful (for testing)
app.post('/api/payment/success', async (req, res) => {
  try {
    const { merchantTxnRef, amount, paymentMethod } = req.body;
    
    console.log('Marking payment as successful:', { merchantTxnRef, amount, paymentMethod });

    // Update payment status in database
    await pool.query(
      'UPDATE payments SET status = $1, updated_at = NOW() WHERE txn_id = $2',
      ['completed', merchantTxnRef]
    );

    res.json({ 
      success: true, 
      message: 'Payment marked as successful',
      merchantTxnRef,
      amount,
      paymentMethod
    });

  } catch (error) {
    console.error('Mark payment success error:', error);
    res.status(500).json({ 
      error: 'Failed to mark payment as successful', 
      details: error.message 
    });
  }
});

// Mark split bill payment as completed and notify payer
app.post('/api/split-bill/complete', async (req, res) => {
  try {
    const { txnId, friendName, friendEmail } = req.body;
    
    console.log('Split bill payment completed:', { txnId, friendName, friendEmail });

    // Update payment status in database
    await pool.query(
      'UPDATE payments SET status = $1, updated_at = NOW() WHERE txn_id = $2',
      ['completed', txnId]
    );

    // Get payment details
    const paymentResult = await pool.query(
      'SELECT * FROM payments WHERE txn_id = $1',
      [txnId]
    );

    if (paymentResult.rows.length > 0) {
      const payment = paymentResult.rows[0];
      
      // Send notification email to payer
      const transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER, // You can change this to the payer's email
        subject: `Split Bill Payment Completed - ${friendName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2ecc40; text-align: center;">✅ Payment Received!</h2>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
              <h3 style="color: #333; margin-bottom: 15px;">Split Bill Payment Completed</h3>
              <p><strong>From:</strong> ${friendName} (${friendEmail})</p>
              <p><strong>Amount:</strong> SGD $${payment.amount}</p>
              <p><strong>Transaction ID:</strong> ${txnId}</p>
              <p><strong>Status:</strong> <span style="color: #2ecc40; font-weight: bold;">COMPLETED</span></p>
            </div>
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #666; font-size: 14px;">
                Thank you for using EasyGame Payment App!
              </p>
            </div>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
    }

    res.json({ 
      success: true, 
      message: 'Split bill payment completed and notification sent',
      txnId,
      friendName,
      friendEmail
    });

  } catch (error) {
    console.error('Split bill completion error:', error);
    res.status(500).json({ 
      error: 'Failed to complete split bill payment', 
      details: error.message 
    });
  }
});

// Manual QR code scan simulation endpoint (for testing)
app.post('/api/payment/simulate-qr-scan', async (req, res) => {
  try {
    const { retrievalRef } = req.body;
    
    console.log('Simulating QR code scan for:', retrievalRef);

    // Update payment status in database
    await pool.query(
      'UPDATE payments SET status = $1, updated_at = NOW() WHERE retrieval_ref = $2',
      ['completed', retrievalRef]
    );

    res.json({ 
      success: true, 
      message: 'QR code scan simulated successfully',
      retrievalRef
    });

  } catch (error) {
    console.error('Simulate QR scan error:', error);
    res.status(500).json({ 
      error: 'Failed to simulate QR scan', 
      details: error.message 
    });
  }
});

// Get payment history
app.get('/api/payment/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const result = await pool.query(
      'SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json({
      success: true,
      payments: result.rows
    });

  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ 
      error: 'Failed to get payment history', 
      details: error.message 
    });
  }
});

// ===== GAME STATS AND VOUCHERS API ENDPOINTS =====

// Get user's game stats
app.get('/api/game-stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const result = await pool.query(
      'SELECT * FROM game_stats WHERE user_id = $1 ORDER BY game_type',
      [userId]
    );

    res.json({
      success: true,
      gameStats: result.rows
    });

  } catch (error) {
    console.error('Get game stats error:', error);
    res.status(500).json({ 
      error: 'Failed to get game stats', 
      details: error.message 
    });
  }
});

// Update game stats (when game is completed)
app.post('/api/game-stats/update', async (req, res) => {
  try {
    const { userId, gameType, gamesPlayed, wins, bestScore, creditsEarned } = req.body;
    
    if (!userId || !gameType) {
      return res.status(400).json({ error: 'User ID and game type are required' });
    }

    // Check if stats exist for this user and game
    const existingStats = await pool.query(
      'SELECT * FROM game_stats WHERE user_id = $1 AND game_type = $2',
      [userId, gameType]
    );

    if (existingStats.rows.length > 0) {
      // Update existing stats
      await pool.query(
        `UPDATE game_stats 
         SET games_played = $1, wins = $2, best_score = GREATEST(best_score, $3), 
             total_credits_earned = total_credits_earned + $4, updated_at = NOW()
         WHERE user_id = $5 AND game_type = $6`,
        [gamesPlayed, wins, bestScore, creditsEarned || 0, userId, gameType]
      );
    } else {
      // Insert new stats
      await pool.query(
        `INSERT INTO game_stats (user_id, game_type, games_played, wins, best_score, total_credits_earned)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, gameType, gamesPlayed, wins, bestScore, creditsEarned || 0]
      );
    }

    res.json({
      success: true,
      message: 'Game stats updated successfully'
    });

  } catch (error) {
    console.error('Update game stats error:', error);
    res.status(500).json({ 
      error: 'Failed to update game stats', 
      details: error.message 
    });
  }
});

// Get user's vouchers
app.get('/api/vouchers/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const result = await pool.query(
      'SELECT * FROM vouchers WHERE user_id = $1',
      [userId]
    );

    // If no voucher record exists, create one
    if (result.rows.length === 0) {
      await pool.query(
        'INSERT INTO vouchers (user_id, quantity, total_earned, total_used) VALUES ($1, 0, 0, 0)',
        [userId]
      );
      
      res.json({
        success: true,
        vouchers: { user_id: userId, quantity: 0, total_earned: 0, total_used: 0 }
      });
    } else {
      res.json({
        success: true,
        vouchers: result.rows[0]
      });
    }

  } catch (error) {
    console.error('Get vouchers error:', error);
    res.status(500).json({ 
      error: 'Failed to get vouchers', 
      details: error.message 
    });
  }
});

// Exchange credits for vouchers
app.post('/api/vouchers/exchange', async (req, res) => {
  try {
    const { userId, creditsToExchange } = req.body;
    
    if (!userId || !creditsToExchange) {
      return res.status(400).json({ error: 'User ID and credits to exchange are required' });
    }

    // Calculate vouchers to earn (10 coins = 1 voucher)
    const vouchersToEarn = Math.floor(creditsToExchange / 10);
    
    if (vouchersToEarn === 0) {
      return res.status(400).json({ error: 'Need at least 10 coins to exchange for 1 voucher' });
    }

    // Check if user has enough coins
    const gameStatsResult = await pool.query(
      'SELECT SUM(credits_earned) as total_coins FROM game_stats WHERE user_id = $1',
      [userId]
    );
    
    const totalCoins = parseInt(gameStatsResult.rows[0]?.total_coins || 0);
    
    if (totalCoins < creditsToExchange) {
      return res.status(400).json({ error: `Insufficient coins. You have ${totalCoins} coins but need ${creditsToExchange} coins to exchange for ${vouchersToEarn} voucher${vouchersToEarn > 1 ? 's' : ''}` });
    }

    // Get or create voucher record
    let voucherResult = await pool.query(
      'SELECT * FROM vouchers WHERE user_id = $1',
      [userId]
    );

    if (voucherResult.rows.length === 0) {
      // Create new voucher record
      await pool.query(
        'INSERT INTO vouchers (user_id, quantity, total_earned, total_used) VALUES ($1, 0, 0, 0)',
        [userId]
      );
      voucherResult = await pool.query(
        'SELECT * FROM vouchers WHERE user_id = $1',
        [userId]
      );
    }

    // Update vouchers
    await pool.query(
      `UPDATE vouchers 
       SET quantity = quantity + $1, total_earned = total_earned + $1, updated_at = NOW()
       WHERE user_id = $2`,
      [vouchersToEarn, userId]
    );

    // Record voucher transaction
    await pool.query(
      'INSERT INTO voucher_transactions (user_id, transaction_type, quantity, credits_used) VALUES ($1, $2, $3, $4)',
      [userId, 'earned', vouchersToEarn, creditsToExchange]
    );

    res.json({
      success: true,
      message: `Successfully exchanged ${creditsToExchange} coins for ${vouchersToEarn} vouchers`,
      vouchersEarned: vouchersToEarn,
      creditsUsed: creditsToExchange
    });

  } catch (error) {
    console.error('Exchange vouchers error:', error);
    res.status(500).json({ 
      error: 'Failed to exchange vouchers', 
      details: error.message 
    });
  }
});

// Use vouchers during payment
app.post('/api/vouchers/use', async (req, res) => {
  try {
    const { userId, vouchersToUse, paymentId } = req.body;
    
    if (!userId || !vouchersToUse || vouchersToUse <= 0) {
      return res.status(400).json({ error: 'User ID and valid voucher quantity are required' });
    }

    // Check if user has enough vouchers
    const voucherResult = await pool.query(
      'SELECT quantity FROM vouchers WHERE user_id = $1',
      [userId]
    );

    if (voucherResult.rows.length === 0 || voucherResult.rows[0].quantity < vouchersToUse) {
      return res.status(400).json({ error: 'Insufficient vouchers' });
    }

    // Update vouchers
    await pool.query(
      `UPDATE vouchers 
       SET quantity = quantity - $1, total_used = total_used + $1, updated_at = NOW()
       WHERE user_id = $2`,
      [vouchersToUse, userId]
    );

    // Record voucher transaction
    await pool.query(
      'INSERT INTO voucher_transactions (user_id, transaction_type, quantity, payment_id) VALUES ($1, $2, $3, $4)',
      [userId, 'used', vouchersToUse, paymentId]
    );

    res.json({
      success: true,
      message: `Successfully used ${vouchersToUse} vouchers`,
      vouchersUsed: vouchersToUse,
      remainingVouchers: voucherResult.rows[0].quantity - vouchersToUse
    });

  } catch (error) {
    console.error('Use vouchers error:', error);
    res.status(500).json({ 
      error: 'Failed to use vouchers', 
      details: error.message 
    });
  }
});

// Get voucher transaction history
app.get('/api/vouchers/transactions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const result = await pool.query(
      `SELECT vt.*, p.amount as payment_amount 
       FROM voucher_transactions vt 
       LEFT JOIN payments p ON vt.payment_id = p.id 
       WHERE vt.user_id = $1 
       ORDER BY vt.created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      transactions: result.rows
    });

  } catch (error) {
    console.error('Get voucher transactions error:', error);
    res.status(500).json({ 
      error: 'Failed to get voucher transactions', 
      details: error.message 
    });
  }
});

// Get check-in data for user
app.get('/api/check-in/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get or create check-in record
    let result = await pool.query(
      'SELECT * FROM check_ins WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      // Create new check-in record
      await pool.query(
        'INSERT INTO check_ins (user_id, last_check_in, current_streak, total_check_ins) VALUES ($1, NULL, 0, 0)',
        [userId]
      );
      result = await pool.query(
        'SELECT * FROM check_ins WHERE user_id = $1',
        [userId]
      );
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get check-in data error:', error);
    res.status(500).json({ 
      error: 'Failed to get check-in data', 
      details: error.message 
    });
  }
});

// Perform daily check-in
app.post('/api/check-in', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get current check-in data
    let result = await pool.query(
      'SELECT * FROM check_ins WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      // Create new check-in record
      await pool.query(
        'INSERT INTO check_ins (user_id, last_check_in, current_streak, total_check_ins) VALUES ($1, NOW(), 1, 1)',
        [userId]
      );
      
      // Add coins to user's game stats
      await pool.query(
        `INSERT INTO game_stats (user_id, game_type, games_played, wins, total_credits_earned, updated_at)
         VALUES ($1, 'check_in', 1, 1, 1, NOW())
         ON CONFLICT (user_id, game_type) 
         DO UPDATE SET 
           games_played = game_stats.games_played + 1,
           wins = game_stats.wins + 1,
           total_credits_earned = game_stats.total_credits_earned + 1,
           updated_at = NOW()`,
        [userId]
      );

      res.json({
        success: true,
        coinsEarned: 1,
        checkInData: {
          lastCheckIn: new Date(),
          currentStreak: 1,
          totalCheckIns: 1
        }
      });
      return;
    }

    const checkInData = result.rows[0];
    
    // Use more robust date comparison - compare only year, month, and day
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let lastCheckIn = null;
    if (checkInData.last_check_in) {
      const lastCheckInDate = new Date(checkInData.last_check_in);
      lastCheckIn = new Date(lastCheckInDate.getFullYear(), lastCheckInDate.getMonth(), lastCheckInDate.getDate());
    }

    // Check if already checked in today
    if (lastCheckIn && lastCheckIn.getTime() === today.getTime()) {
      console.log('User already checked in today. Last check-in:', lastCheckIn, 'Today:', today);
      return res.json({ 
        success: false,
        message: 'Already checked in today',
        checkInData: {
          lastCheckIn: checkInData.last_check_in,
          currentStreak: checkInData.current_streak,
          totalCheckIns: checkInData.total_check_ins
        }
      });
    }

    // Calculate streak
    let newStreak = 1;
    if (lastCheckIn) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      if (lastCheckIn.getTime() === yesterday.getTime()) {
        newStreak = checkInData.current_streak + 1;
      }
    }

    // Update check-in data
    await pool.query(
      `UPDATE check_ins 
       SET last_check_in = NOW(), 
           current_streak = $1, 
           total_check_ins = total_check_ins + 1,
           updated_at = NOW()
       WHERE user_id = $2`,
      [newStreak, userId]
    );

    // Add coins to user's game stats
    await pool.query(
      `INSERT INTO game_stats (user_id, game_type, games_played, wins, total_credits_earned, updated_at)
       VALUES ($1, 'check_in', 1, 1, 1, NOW())
       ON CONFLICT (user_id, game_type) 
       DO UPDATE SET 
         games_played = game_stats.games_played + 1,
         wins = game_stats.wins + 1,
         total_credits_earned = game_stats.total_credits_earned + 1,
         updated_at = NOW()`,
      [userId]
    );

    res.json({
      success: true,
      coinsEarned: 1,
      checkInData: {
        lastCheckIn: new Date(),
        currentStreak: newStreak,
        totalCheckIns: checkInData.total_check_ins + 1
      }
    });

  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ 
      error: 'Failed to check in', 
      details: error.message 
    });
  }
});

// Clear check-in record (for testing)
app.post('/api/check-in/clear', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Clear the check-in record
    await pool.query(
      'UPDATE check_ins SET last_check_in = NULL, current_streak = 0 WHERE user_id = $1',
      [userId]
    );

    res.json({
      success: true,
      message: 'Check-in record cleared successfully'
    });

  } catch (error) {
    console.error('Clear check-in error:', error);
    res.status(500).json({ 
      error: 'Failed to clear check-in record', 
      details: error.message 
    });
  }
});

// Reset voucher data (for testing/fixing inconsistent data)
app.post('/api/vouchers/reset', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Reset vouchers to 0
    await pool.query(
      'UPDATE vouchers SET quantity = 0, total_earned = 0, total_used = 0 WHERE user_id = $1',
      [userId]
    );

    // Clear voucher transactions
    await pool.query(
      'DELETE FROM voucher_transactions WHERE user_id = $1',
      [userId]
    );

    res.json({
      success: true,
      message: 'Voucher data reset successfully'
    });

  } catch (error) {
    console.error('Reset vouchers error:', error);
    res.status(500).json({ 
      error: 'Failed to reset voucher data', 
      details: error.message 
    });
  }
});

// NFC Transactions API endpoints
app.post('/api/nfc-transactions', async (req, res) => {
  try {
    const { sender_email, recipient_email, amount, card_id } = req.body;
    
    if (!sender_email || !recipient_email || !amount || !card_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await pool.query(
      'INSERT INTO nfc_transactions (sender_email, recipient_email, amount, card_id, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [sender_email, recipient_email, amount, card_id, 'sent']
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating NFC transaction:', error);
    res.status(500).json({ error: 'Failed to create NFC transaction' });
  }
});

app.get('/api/nfc-transactions/receive/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM nfc_transactions WHERE recipient_email = $1 AND status = $2 ORDER BY timestamp DESC',
      [email, 'sent']
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching pending NFC transactions:', error);
    res.status(500).json({ error: 'Failed to fetch pending transactions' });
  }
});

app.put('/api/nfc-transactions/:id/receive', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'UPDATE nfc_transactions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      ['received', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'NFC transaction not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating NFC transaction:', error);
    res.status(500).json({ error: 'Failed to update NFC transaction' });
  }
});

app.get('/api/nfc-transactions/history/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM nfc_transactions WHERE (sender_email = $1 OR recipient_email = $1) ORDER BY timestamp DESC LIMIT 50',
      [email]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching NFC transaction history:', error);
    res.status(500).json({ error: 'Failed to fetch transaction history' });
  }
});

// Serve Vite build (only for production)
if (process.env.NODE_ENV === 'production') {
  const clientBuild = path.join(__dirname, "..", "eazygame", "dist");
  app.use(express.static(clientBuild));
  app.get("*", (_, res) => {
    res.sendFile(path.join(clientBuild, "index.html"));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Test the API: http://localhost:${PORT}/api/test-db`);
}); 
