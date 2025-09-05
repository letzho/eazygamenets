import React, { useState, useRef, useEffect } from 'react';
import styles from './Merchants.module.css';
import MerchantCard from './components/MerchantCard';
import ProductModal from './components/ProductModal';
import Modal from '../../components/Modal/Modal';
import UserIcon from '../../components/UserIcon/UserIcon';
import BalanceDetailsModal from '../../components/BalanceDetailsModal/BalanceDetailsModal';
import TransactionsModal from '../../components/TransactionsModal/TransactionsModal';
import PaymentGateway from '../../components/PaymentGateway/PaymentGateway';
import SendMoneyModal from '../../components/SendMoneyModal/SendMoneyModal';
import VoucherModal from '../../components/VoucherModal/VoucherModal';
import netsLogo from '../../assets/nets-40.png';

// Helper function to get current user ID
const getCurrentUser = () => {
  return localStorage.getItem('user_id');
};

// Import product images
import handbag from '../../assets/handbag.jpg';
import laptop from '../../assets/laptop.jpg';
import apple from '../../assets/apple.jpg';
import pettoy from '../../assets/pettoy.jpg';
import tshirt from '../../assets/tshirt.jpg';
import polot from '../../assets/polot.jpg';
import singlet from '../../assets/singlet.jpg';
import bracelet from '../../assets/bracelet.jpg';
import jeans from '../../assets/jeans.jpg';

// Import merchant logos
import amazon from '../../assets/amazon.png';
import lazada from '../../assets/lazada.png';
import shopee from '../../assets/shopee.png';
import shein from '../../assets/shein.png';

const categories = [
  'All',
  'Fashion',
  'Electronics',
  'Groceries',
  'Pets',
  'Toys',
  'Books',
];
const featuredMerchants = [
  { name: 'Shopee', logo: shopee },
  { name: 'Lazada', logo: lazada },
  { name: 'Shein', logo: shein },
  { name: 'Amazon', logo: amazon },
];
const products = [
  // Electronics
  { id: 1, name: 'Laptop Pro 2023', price: 899, category: 'Electronics', image: laptop },
  { id: 2, name: 'Apple MacBook', price: 1299, category: 'Electronics', image: laptop },
  
  // Fashion
  { id: 3, name: 'Designer Handbag', price: 129, category: 'Fashion', image: handbag },
  { id: 4, name: 'Classic T-Shirt', price: 25, category: 'Fashion', image: tshirt },
  { id: 5, name: 'Polo Shirt', price: 35, category: 'Fashion', image: polot },
  { id: 6, name: 'Sport Singlet', price: 18, category: 'Fashion', image: singlet },
  { id: 7, name: 'Silver Bracelet', price: 45, category: 'Fashion', image: bracelet },
  { id: 8, name: 'Denim Jeans', price: 65, category: 'Fashion', image: jeans },
  
  // Groceries
  { id: 9, name: 'Fresh Apples', price: 6.5, category: 'Groceries', image: apple },
  
  // Pets
  { id: 10, name: 'Pet Toy Set', price: 12, category: 'Pets', image: pettoy },
];

export default function Merchants({ isSignedIn, user, onProfileClick, cards, setCards, userVouchers = 0, onVoucherUse = null }) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [modalProduct, setModalProduct] = useState(null);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAlloc, setPayAlloc] = useState([]); // [{cardId, amount}]
  const [payError, setPayError] = useState('');
  const [showBalanceDetailsModal, setShowBalanceDetailsModal] = useState(false);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [showSendMoneyModal, setShowSendMoneyModal] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [paymentItems, setPaymentItems] = useState([]);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [voucherHistory, setVoucherHistory] = useState([]);

  // Calculate total balance from cards
  const totalBalance = cards && Array.isArray(cards)
    ? cards.reduce((sum, card) => sum + (Number(card.balance) || 0), 0)
    : 0;

  // Fetch transactions
  const fetchTransactions = async (userId) => {
    try {
      const response = await fetch(`http://localhost:3002/api/transactions?user_id=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  // Refresh transactions
  const refreshTransactions = (userId) => {
    fetchTransactions(userId);
  };

  const handlePaymentSuccess = async (paymentData) => {
    console.log('Payment successful:', paymentData);
    
    // Create transaction record for the successful payment
    try {
      const userId = getCurrentUser();
      if (!userId) {
        console.error('No user ID found');
        return;
      }

      // Determine payment method and transaction details
      let paymentMethod = 'Unknown';
      let transactionName = modalProduct?.name || 'Merchant Purchase';
      
      if (paymentData.method === 'ENETS') {
        paymentMethod = 'eNETS Payment';
        transactionName = `${modalProduct?.name || 'Merchant Purchase'} (ENETS)`;
      } else if (paymentData.method === 'ENETS_QR') {
        paymentMethod = 'NETS QR Payment';
        transactionName = `${modalProduct?.name || 'Merchant Purchase'} (NETS QR)`;
      } else if (paymentData.method === 'NETS_PREPAID') {
        paymentMethod = 'NETS Prepaid Card';
        transactionName = `${modalProduct?.name || 'Merchant Purchase'} (Prepaid Card)`;
      }

      // Create transaction record
      const transactionResponse = await fetch('http://localhost:3002/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          card_id: paymentData.method === 'NETS_PREPAID' ? paymentData.cardId : null, // card_id for prepaid, null for external
          name: transactionName,
          amount: modalProduct?.price || 0,
          type: 'expense'
        })
      });

      if (transactionResponse.ok) {
        const transaction = await transactionResponse.json();
        console.log('Transaction created successfully:', transaction);
        
        // Refresh transactions to show the new one
        refreshTransactions(userId);
      } else {
        console.error('Failed to create transaction:', await transactionResponse.text());
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
    }

    alert('Payment successful! Your order has been processed.');
    setShowPaymentGateway(false);
    setModalProduct(null);
    setPaymentItems([]);
  };

  const handlePaymentFailure = (paymentData) => {
    console.log('Payment failed:', paymentData);
    alert('Payment failed. Please try again.');
    setShowPaymentGateway(false);
  };

  // Fetch transactions on component mount
  useEffect(() => {
    if (user?.id) {
      fetchTransactions(user.id);
    }
  }, [user?.id]);

  const handleBuy = (product) => {
    setModalProduct(product);
    setRecentlyViewed((prev) => {
      const exists = prev.find((p) => p.id === product.id);
      if (exists) return prev;
      return [product, ...prev].slice(0, 6);
    });
    
    // Set up payment items for NETS payment gateway
    setPaymentItems([{
      name: product.name,
      price: product.price,
      image: product.image
    }]);
    
    // Show payment gateway instead of card allocation
    setShowPaymentGateway(true);
  };

  const handlePayAllocChange = (cardId, value) => {
    // Allow empty string, only allow numbers
    if (/^\d*$/.test(value)) {
      setPayAlloc(prev => prev.map(a => a.cardId === cardId ? { ...a, amount: value } : a));
    }
  };

  const handlePayAllocMax = (cardId) => {
    if (!modalProduct) return;
    const totalSoFar = payAlloc.reduce((sum, a) => sum + (a.cardId === cardId ? 0 : Number(a.amount || 0)), 0);
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    const max = Math.min(card.balance, modalProduct.price - totalSoFar);
    setPayAlloc(prev => prev.map(a => a.cardId === cardId ? { ...a, amount: String(max) } : a));
  };

  const handleConfirmPay = async () => {
    if (!modalProduct) return;
    const total = payAlloc.reduce((sum, a) => sum + Number(a.amount || 0), 0);
    if (total !== modalProduct.price) {
      setPayError('Total allocated must match product price.');
      return;
    }
    for (const alloc of payAlloc) {
      const card = cards.find(c => c.id === alloc.cardId);
      if (!card) {
        setPayError('Invalid card.');
        return;
      }
      if (Number(alloc.amount || 0) > Number(card.balance)) {
        setPayError('Insufficient balance on one or more cards.');
        return;
      }
    }
    // Deduct and create transaction for each card
    try {
      for (const alloc of payAlloc) {
        const amount = Number(alloc.amount || 0);
        // Only process cards with positive amounts
        if (amount > 0) {
          console.log('Merchants: Sending deduct request with:', { card_id: alloc.cardId, amount });
                  // Deduct
        const deductRes = await fetch('http://localhost:3002/api/cards/deduct', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ card_id: alloc.cardId, amount })
          });
          if (!deductRes.ok) throw new Error('Failed to deduct from card');
          // Transaction
          const txnRes = await fetch('http://localhost:3002/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: user?.id,
              card_id: alloc.cardId,
              name: `Purchase: ${modalProduct.name}`,
              amount: -amount,
              type: 'expense'
            })
          });
          if (!txnRes.ok) throw new Error('Failed to create transaction');
        }
      }
      // Update cards in UI
      setCards(prevCards => prevCards.map(card => {
        const alloc = payAlloc.find(a => a.cardId === card.id);
        return alloc ? { ...card, balance: Number(card.balance) - Number(alloc.amount || 0) } : card;
      }));
      setShowPayModal(false);
      setModalProduct(null);
      setPayAlloc([]);
      setPayError('');
      alert('Payment successful!');
    } catch (e) {
      setPayError('Payment failed: ' + e.message);
    }
  };



  const handleSendMoney = async (recipient, card, amount) => {
    try {
      // Deduct from card
      const deductRes = await fetch('http://localhost:3002/api/cards/deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_id: card.id, amount })
      });
      if (!deductRes.ok) throw new Error('Failed to deduct from card');
      
      // Add transaction
      const txnRes = await fetch('http://localhost:3002/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          card_id: card.id,
          name: `Sent to ${recipient.name}`,
          amount: -amount,
          type: 'expense'
        })
      });
      if (!txnRes.ok) throw new Error('Failed to create transaction');
      
      // Update card balance
      setCards(prevCards => prevCards.map(c =>
        c.id === card.id ? { ...c, balance: Number(c.balance) - Number(amount) } : c
      ));
      setShowSendMoneyModal(false);
      alert(`Successfully sent $${amount} to ${recipient.name}`);
    } catch (e) {
      alert('Payment failed: ' + e.message);
    }
  };

  return (
    <div className={styles.container}>
      {/* White Logo Bar */}
      <div className={styles.logoBar}>
        <div className={styles.logoContainer}>
          <img src={netsLogo} alt="NETS" className={styles.netsLogo} />
        </div>
      </div>

      {/* Blue Header */}
      <div className={styles.blueHeader}>
        <div className={styles.headerTop}>
          <div className={styles.balanceDisplay}>
            <span className={styles.balanceAmount}>SGD ${totalBalance.toFixed(2)}</span>
            <div 
              className={`${styles.voucherDisplay} ${userVouchers > 0 ? styles.clickable : ''}`}
              onClick={() => setShowVoucherModal(true)}
              style={{ cursor: userVouchers > 0 ? 'pointer' : 'default' }}
            >
              <span className={styles.voucherIcon}>🎫</span>
              <span className={styles.voucherText}>
                {userVouchers > 0 
                  ? `${userVouchers} voucher${userVouchers > 1 ? 's' : ''} ($${(userVouchers * 0.10).toFixed(2)})`
                  : 'No vouchers - Click to view'
                }
              </span>
            </div>
          </div>
          <div className={styles.profileSection}>
            <UserIcon isSignedIn={isSignedIn} onProfileClick={onProfileClick} />
            {isSignedIn && (
              <div className={styles.welcomeText}>
                Welcome, {user?.username || user?.name || user?.email}!
              </div>
            )}
          </div>
        </div>
        
        <div className={styles.headerActions}>
          <button className={styles.viewBalanceLink} onClick={() => setShowBalanceDetailsModal(true)}>
            View balance details &gt;
          </button>
          <button className={styles.transactionsBtn} onClick={() => setShowTransactionsModal(true)}>
            <span className={styles.transactionsText}>Transactions &gt;</span>
          </button>
        </div>
      </div>
      
      <div className={styles.scrollableContent}>
         <nav className={styles.tabs}>
           <span className={styles.tab + ' ' + styles.active}>Merchants</span>
         </nav>
        <section className={styles.categoriesSection}>
          <div className={styles.categoriesRow}>
            {categories.map(cat => (
              <button
                key={cat}
                className={selectedCategory === cat ? styles.categoryActive : styles.categoryBtn}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>
        <section className={styles.featuredSection}>
          <div className={styles.featuredTitle}>Featured Merchants</div>
          <div className={styles.featuredRow}>
            {featuredMerchants.map(m => (
              <div key={m.name} className={styles.merchantLogoBox} title={m.name}>
                <img src={m.logo} alt={m.name} className={styles.merchantLogo} />
                <div className={styles.merchantName}>{m.name}</div>
              </div>
            ))}
          </div>
        </section>
        <section className={styles.productsSection}>
          <div className={styles.productsTitle}>Deals</div>
          <div className={styles.productsRow}>
            {products
              .filter(p => selectedCategory === 'All' || p.category === selectedCategory)
              .map(product => (
                <MerchantCard
                  key={product.id}
                  product={product}
                  onBuy={() => handleBuy(product)}
                />
              ))}
          </div>
        </section>
        <section className={styles.recentlyViewedSection}>
          <div className={styles.recentlyViewedTitle}>Recently Viewed</div>
          <div className={styles.recentlyViewedRow}>
            {recentlyViewed.length === 0 ? (
              <div className={styles.emptyText}>No items yet.</div>
            ) : (
              recentlyViewed.map(product => (
                <MerchantCard
                  key={product.id}
                  product={product}
                  onBuy={() => handleBuy(product)}
                />
              ))
            )}
          </div>
        </section>
      </div>
      
      <Modal open={showPayModal} onClose={() => setShowPayModal(false)}>
        {modalProduct && (
        <div style={{ padding: 24, minWidth: 320, maxWidth: 400, width: '100%', margin: '0 auto', wordBreak: 'break-word', overflowWrap: 'break-word', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16 }}>
              <img 
                src={modalProduct.image} 
                alt={modalProduct.name} 
                style={{ 
                  width: 80, 
                  height: 80, 
                  objectFit: 'cover', 
                  borderRadius: 12, 
                  marginBottom: 8,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }} 
              />
              <div style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: 2 }}>{modalProduct.name}</div>
              <div style={{ color: '#888', fontSize: '1rem', marginBottom: 2 }}>{modalProduct.category}</div>
              <div style={{ color: '#003da6', fontWeight: 600, fontSize: '1.1rem', marginBottom: 8 }}>${modalProduct.price.toFixed(2)}</div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 500, marginBottom: 6 }}>Allocate payment across your cards:</div>
            {cards.map(card => {
              const alloc = payAlloc.find(a => a.cardId === card.id) || { amount: '' };
              return (
                <div key={card.id} style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.2fr) 80px',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 10,
                  background: '#f0f4ff',
                  borderRadius: 8,
                  padding: '8px 12px',
                  boxSizing: 'border-box',
                  width: '100%'
                }}>
                  <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 90 }}>💳 ****{String(card.number).slice(-4)}</span>
                  <span style={{ color: '#888', fontSize: '0.97rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>(${Number(card.balance).toFixed(2)})</span>
                  <input
                    type="number"
                    min={0}
                    max={card.balance}
                    placeholder="0"
                    value={alloc.amount}
                    onChange={e => handlePayAllocChange(card.id, e.target.value)}
                    style={{ width: 70, borderRadius: 6, border: '1.5px solid #e0e0f0', padding: '0.3rem', boxSizing: 'border-box' }}
                  />
                </div>
              );
            })}
          </div>
          {(() => {
            const total = payAlloc.reduce((sum, a) => sum + Number(a.amount || 0), 0);
              if (total < modalProduct.price) {
                return <div style={{ color: '#e14a4a', fontWeight: 500, textAlign: 'center', marginBottom: 12 }}>Total allocated is less than the product price. Please allocate the full amount.</div>;
              } else if (total > modalProduct.price) {
                return <div style={{ color: '#e14a4a', fontWeight: 500, textAlign: 'center', marginBottom: 12 }}>Total allocated exceeds the product price. Please adjust your allocation.</div>;
            } else if (payError) {
              return <div style={{ color: '#e14a4a', fontWeight: 500, textAlign: 'center', marginBottom: 12 }}>{payError}</div>;
            } else {
              return <div style={{ color: '#888', fontWeight: 500, textAlign: 'center', marginBottom: 12 }}>Total: ${total.toFixed(2)}</div>;
            }
          })()}
          <button
            style={{ background: '#003da6', color: '#fff', border: 'none', borderRadius: 8, padding: '0.8rem 1.5rem', fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer', width: '100%', maxWidth: 360, margin: '8px auto 0 auto', boxSizing: 'border-box', display: 'block' }}
            onClick={handleConfirmPay}
              disabled={payAlloc.reduce((sum, a) => sum + Number(a.amount || 0), 0) !== modalProduct.price || payAlloc.some(a => Number(a.amount || 0) < 0 || Number(a.amount || 0) > (cards.find(c => c.id === a.cardId)?.balance || 0))}
            >
              Confirm Payment
          </button>
            </div>
          )}
      </Modal>

      <BalanceDetailsModal 
        open={showBalanceDetailsModal} 
        onClose={() => setShowBalanceDetailsModal(false)} 
        cards={cards} 
      />

      <TransactionsModal 
        open={showTransactionsModal} 
        onClose={() => setShowTransactionsModal(false)} 
        transactions={transactions}
        cards={cards} 
      />



      {/* Send Money Modal */}
      <SendMoneyModal
        open={showSendMoneyModal}
        onClose={() => setShowSendMoneyModal(false)}
        cards={cards}
        onSend={handleSendMoney}
      />

      {/* NETS Payment Gateway */}
      <PaymentGateway
        open={showPaymentGateway}
        onClose={() => setShowPaymentGateway(false)}
        amount={modalProduct?.price || 0}
        items={paymentItems}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentFailure={handlePaymentFailure}
        userVouchers={userVouchers}
        onVoucherUse={onVoucherUse}
        cards={cards}
      />

      {/* Voucher Modal */}
      <VoucherModal
        open={showVoucherModal}
        onClose={() => setShowVoucherModal(false)}
        userVouchers={userVouchers}
        voucherHistory={voucherHistory}
      />
    </div>
  );
} 
