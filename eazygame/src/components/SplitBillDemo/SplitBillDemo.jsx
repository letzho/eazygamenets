import React, { useState } from 'react';
import API_BASE_URL from '../../config.js';
import styles from './SplitBillDemo.module.css';

const FRIENDS_LIST = [
  { name: 'Leow Seng Heang', phone: '+6591850816', email: 'leowseng@gmail.com' },
  { name: 'Evan', phone: '+6582284718', email: 'en.jjlee@gmail.com' },
  { name: 'Alice Tan', phone: '+6581234567', email: 'alice.tan@example.com' },
];

function SplitBillDemo() {
  const [amount, setAmount] = useState('100');
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [message, setMessage] = useState('Hackathon Demo - Split Bill with NETS QR');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [showDemoSteps, setShowDemoSteps] = useState(false);

  const handleFriendToggle = (friend) => {
    setSelectedFriends(prev =>
      prev.some(f => f.email === friend.email)
        ? prev.filter(f => f.email !== friend.email)
        : [...prev, friend]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || selectedFriends.length === 0) return;
    
    setSending(true);
    setResult(null);
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/split-bill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payer: 'Demo User',
          payerEmail: 'demo@easypay.com',
          amount: parseFloat(amount),
          friends: selectedFriends,
          message,
          cardId: 'demo-card-123'
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        setResult({ 
          success: true, 
          msg: `✅ NETS QR codes sent to ${selectedFriends.length} friends! Check their emails.` 
        });
        setShowDemoSteps(true);
      } else {
        setResult({ success: false, msg: data.error || 'Failed to send split bill.' });
      }
    } catch (err) {
      setResult({ success: false, msg: err.message });
    }
    
    setSending(false);
  };

  const simulatePaymentCompletion = async (friend) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/split-bill/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txnId: `split_bill_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
          friendName: friend.name,
          friendEmail: friend.email
        })
      });
      
      if (res.ok) {
        alert(`✅ ${friend.name} completed the payment! Notification email sent.`);
      }
    } catch (error) {
      console.error('Error simulating payment:', error);
    }
  };

  return (
    <div className={styles.demoContainer}>
      <div className={styles.header}>
        <h1>🎯 Hackathon Demo: Split Bill with NETS QR</h1>
        <p>Showcase real-time payment notifications and NETS QR integration</p>
      </div>

      <div className={styles.demoSection}>
        <h2>📧 Step 1: Send NETS QR Codes via Email</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Total Bill Amount ($):</label>
            <input 
              type="number" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)}
              min="0.01" 
              step="0.01" 
              required 
            />
          </div>

          <div className={styles.formGroup}>
            <label>Friends to Split With:</label>
            <div className={styles.friendsList}>
              {FRIENDS_LIST.map(friend => (
                <label key={friend.email} className={styles.friendItem}>
                  <input 
                    type="checkbox" 
                    checked={selectedFriends.some(f => f.email === friend.email)}
                    onChange={() => handleFriendToggle(friend)} 
                  />
                  <span>{friend.name}</span>
                  <span className={styles.email}>({friend.email})</span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Message:</label>
            <input 
              type="text" 
              value={message} 
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hackathon Demo - Split Bill with NETS QR"
            />
          </div>

          {selectedFriends.length > 0 && amount && (
            <div className={styles.splitInfo}>
              <strong>Each pays: ${(parseFloat(amount) / (selectedFriends.length + 1)).toFixed(2)}</strong>
            </div>
          )}

          <button 
            type="submit" 
            disabled={sending || !amount || selectedFriends.length === 0}
            className={styles.submitBtn}
          >
            {sending ? 'Sending...' : '🚀 Send NETS QR Codes'}
          </button>
        </form>

        {result && (
          <div className={`${styles.result} ${result.success ? styles.success : styles.error}`}>
            {result.msg}
          </div>
        )}
      </div>

      {showDemoSteps && (
        <div className={styles.demoSection}>
          <h2>📱 Step 2: Demo Payment Completion</h2>
          <p>Simulate friends completing their payments:</p>
          
          <div className={styles.simulationButtons}>
            {selectedFriends.map(friend => (
              <button
                key={friend.email}
                onClick={() => simulatePaymentCompletion(friend)}
                className={styles.simulateBtn}
              >
                ✅ {friend.name} Paid
              </button>
            ))}
          </div>
          
          <div className={styles.demoInfo}>
            <h3>🎯 Demo Features:</h3>
            <ul>
              <li>✅ <strong>Real NETS QR Codes</strong> generated with your logo</li>
              <li>✅ <strong>Professional Email Templates</strong> with embedded QR codes</li>
              <li>✅ <strong>Real-time Notifications</strong> when friends pay</li>
              <li>✅ <strong>Database Tracking</strong> of all split bill payments</li>
              <li>✅ <strong>Hackathon Ready</strong> - fully functional demo</li>
            </ul>
          </div>
        </div>
      )}

      <div className={styles.demoSection}>
        <h2>🔧 Technical Implementation</h2>
        <div className={styles.techDetails}>
          <div className={styles.techItem}>
            <h4>Backend (Node.js + Express)</h4>
            <ul>
              <li>NETS QR code generation with real logo overlay</li>
              <li>Email service integration (Gmail SMTP)</li>
              <li>PostgreSQL database for payment tracking</li>
              <li>Real-time notification system</li>
            </ul>
          </div>
          
          <div className={styles.techItem}>
            <h4>Frontend (React.js)</h4>
            <ul>
              <li>Split bill interface with friend selection</li>
              <li>Real-time payment status updates</li>
              <li>Responsive design for mobile/desktop</li>
              <li>Integration with existing payment system</li>
            </ul>
          </div>
          
          <div className={styles.techItem}>
            <h4>NETS Integration</h4>
            <ul>
              <li>Real QR code generation with payment data</li>
              <li>NETS logo overlay with white background</li>
              <li>Compatible with NETSPay app scanning</li>
              <li>Sandbox environment for testing</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SplitBillDemo;
