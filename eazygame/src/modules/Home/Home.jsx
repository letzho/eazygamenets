import React, { useState, useEffect, useRef } from 'react';
import styles from './Home.module.css';
import CardFormModal from '../Cards/CardFormModal';
import Modal from '../../components/Modal/Modal';
import SendMoneyModal from '../../components/SendMoneyModal/SendMoneyModal';
import PaymentGame from '../../components/PaymentGame/PaymentGame';
import { getCurrentUser } from '../../userStore';
import QrScanner from 'react-qr-scanner';
import jsQR from 'jsqr';
import QrScanModal from '../../components/QrScanModal';
import UserIcon from '../../components/UserIcon/UserIcon';
import BalanceDetailsModal from '../../components/BalanceDetailsModal/BalanceDetailsModal';
import TransactionsModal from '../../components/TransactionsModal/TransactionsModal';
import StatsModal from '../../components/StatsModal/StatsModal';
import NFCModal from '../../components/NFCModal/NFCModal';
import netsLogo from '../../assets/nets-40.png';
import Jack from '../../assets/Jack.jpg';
import Nurul from '../../assets/Nurul.jpg';
import Michelle from '../../assets/Michelle.jpg';
import Michael from '../../assets/Michael.jpg';
import Miko from '../../assets/Miko.jpg';
import Sherlyn from '../../assets/Sherlyn.jpg';
import Kartik from '../../assets/Kartik.jpg';
import netscard1 from '../../assets/netscard1.png';
import netscard2 from '../../assets/netscard2.png';
import netscard3 from '../../assets/netscard3.png';
import netscard4 from '../../assets/netscard4.png';
import candyIcon from '../../assets/candy.png';
import bubbleIcon from '../../assets/bubble.png';
import minesweeperIcon from '../../assets/minesweeper.png';
import snakeIcon from '../../assets/snake.png';
import GameContainer from '../Games/GameContainer';
import AvatarPaymentGame from '../../components/AvatarPaymentGame/AvatarPaymentGame';
import VoucherModal from '../../components/VoucherModal/VoucherModal';
import PaymentGateway from '../../components/PaymentGateway/PaymentGateway';
import API_BASE_URL from '../../config.js';

const FRIENDS_LIST = [
  { name: 'Leow Seng Heang', phone: '+6591850816', email: 'leowseng@gmail.com', type: 'email' },
  { name: 'Evan', phone: '+6582284718', email: 'en.jjlee@gmail.com', type: 'email' },
  { name: 'Alice Tan', phone: '+6581234567', email: 'alice.tan@example.com', type: 'email' },
  { name: 'Cheryl Ng', phone: '+6583456789', email: 'cheryl.ng@example.com', type: 'email' },
  { name: 'Tzhoji', phone: '+6591850816', email: null, type: 'whatsapp' },
  { name: 'Shi Lin', phone: '+6591513013', email: null, type: 'whatsapp' },
];

function getAllTransactions(cards) {
  // Flatten all transactions from all cards, add card info, and sort by date (assume time is parseable)
  return cards
    .flatMap(card =>
      (card.transactions || []).map(txn => ({ ...txn, cardNumber: card.number, cardId: card.id }))
    )
    .sort((a, b) => new Date(b.time) - new Date(a.time));
}

function SplitBillModal(props) {
  const { open, onClose, payer, payerEmail, cards, setCards, setTransactions, amount } = props;
  const [localAmount, setLocalAmount] = useState(amount || '');
  useEffect(() => { setLocalAmount(amount || ''); }, [amount]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedCardId, setSelectedCardId] = useState(cards && cards.length > 0 ? cards[0].id : '');

  useEffect(() => {
    if (cards && cards.length > 0) setSelectedCardId(cards[0].id);
  }, [cards]);

  // Debug: Log cards when modal opens
  useEffect(() => {
    if (open) {
      console.log('SplitBillModal - Cards received:', cards);
      console.log('SplitBillModal - Selected card ID:', selectedCardId);
    }
  }, [open, cards, selectedCardId]);

  const handleFriendToggle = (friend) => {
    const identifier = friend.type === 'whatsapp' ? friend.phone : friend.email;
    setSelectedFriends(prev =>
      prev.some(f => (f.type === 'whatsapp' ? f.phone : f.email) === identifier)
        ? prev.filter(f => (f.type === 'whatsapp' ? f.phone : f.email) !== identifier)
        : [...prev, friend]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!localAmount || selectedFriends.length === 0 || !selectedCardId) return;
    setSending(true);
    setResult(null);
    try {
              const res = await fetch(`${API_BASE_URL}/api/split-bill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payer,
          payerEmail,
          amount: parseFloat(localAmount),
          friends: selectedFriends,
          message,
          cardId: selectedCardId
        })
      });
      const data = await res.json();
      if (res.ok) {
        const emailFriends = selectedFriends.filter(f => f.type === 'email');
        const whatsappFriends = selectedFriends.filter(f => f.type === 'whatsapp');
        let successMsg = '';
        if (emailFriends.length > 0) {
          successMsg += `Split bill QR codes sent to ${emailFriends.length} friend(s) via email! `;
        }
        if (whatsappFriends.length > 0) {
          successMsg += `WhatsApp messages sent to ${whatsappFriends.length} friend(s)!`;
        }
        if (emailFriends.length === 0 && whatsappFriends.length === 0) {
          successMsg = 'Split bill processed successfully!';
        }
        setResult({ success: true, msg: successMsg });
        setLocalAmount('');
        setSelectedFriends([]);
        setMessage('');
        // Refresh cards and transactions
                  const userId = getCurrentUser();
          if (userId) {
            fetch(`${API_BASE_URL}/api/cards?user_id=${userId}`)
            .then(res => res.json())
            .then(data => {
              const cardData = Array.isArray(data)
                ? data.map(card => ({ ...card, balance: Number(card.balance) }))
                : [];
              setCards(cardData);
            });
          fetch(`${API_BASE_URL}/api/transactions?user_id=${userId}`)
            .then(res => res.json())
            .then(data => setTransactions(data));
        }
      } else {
        setResult({ success: false, msg: data.error || 'Failed to send split bill.' });
      }
    } catch (err) {
      setResult({ success: false, msg: err.message });
    }
    setSending(false);
  };

  if (!open) return null;
  
  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      background: 'rgba(0, 0, 0, 0.6)', 
      zIndex: 1000, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '20px',
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{ 
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 50%, #fff5f5 100%)',
        borderRadius: '24px',
        padding: '28px',
        minWidth: '380px',
        maxWidth: '480px',
        width: '100%',
        maxHeight: '90vh',
        boxShadow: '0 20px 60px rgba(0, 61, 166, 0.15)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        border: '2px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              fontSize: '24px',
              background: 'linear-gradient(135deg, #003da6 0%, #0052cc 100%)',
              color: 'white',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              💰
            </div>
            <h2 style={{ 
              margin: 0, 
              fontSize: '1.5rem', 
              color: '#003da6', 
              fontWeight: 700 
            }}>
              Split Bill
            </h2>
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'rgba(0, 61, 166, 0.1)',
              border: 'none',
              fontSize: '20px',
              color: '#003da6',
              cursor: 'pointer',
              padding: '8px',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(0, 61, 166, 0.2)';
              e.target.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(0, 61, 166, 0.1)';
              e.target.style.transform = 'scale(1)';
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '16px',
          flex: 1,
          overflowY: 'auto',
          paddingRight: '8px'
        }}>
          {/* Total Bill Amount */}
          <div>
            <label style={{ 
              fontWeight: 600, 
              color: '#374151',
              fontSize: '14px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '12px',
              display: 'block'
            }}>
              Total Bill Amount ($)
            </label>
            <input 
              type="number" 
              min="0.01" 
              step="0.01" 
              value={localAmount} 
              onChange={e => setLocalAmount(e.target.value)} 
              style={{ 
                width: '100%', 
                padding: '12px 14px', 
                borderRadius: '12px', 
                border: '2px solid #e5e7eb', 
                fontSize: '16px',
                fontWeight: '600',
                color: '#1f2937',
                background: 'white',
                transition: 'all 0.3s ease',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#003da6';
                e.target.style.boxShadow = '0 0 0 3px rgba(0, 61, 166, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.boxShadow = 'none';
              }}
              required 
            />
          </div>

          {/* Pay with Card */}
          <div>
            <label style={{ 
              fontWeight: 600, 
              color: '#374151',
              fontSize: '14px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '12px',
              display: 'block'
            }}>
              Pay with Card
            </label>
            <select 
              value={selectedCardId} 
              onChange={e => setSelectedCardId(e.target.value)} 
              style={{ 
                width: '100%', 
                padding: '12px 14px', 
                borderRadius: '12px', 
                border: '2px solid #e5e7eb', 
                fontSize: '16px',
                fontWeight: '600',
                color: '#1f2937',
                background: 'white',
                transition: 'all 0.3s ease',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#003da6';
                e.target.style.boxShadow = '0 0 0 3px rgba(0, 61, 166, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.boxShadow = 'none';
              }}
              required
            >
              {!cards || cards.length === 0 ? (
                <option value="">No cards available</option>
              ) : (
                cards.map(card => (
                <option key={card.id} value={card.id}>
                  **** **** **** {String(card.number).slice(-4)} (Bal: ${Number(card.balance).toFixed(2)})
                </option>
                ))
              )}
            </select>
          </div>

                      {/* Friends to Split With */}
          <div>
              <label style={{ 
                fontWeight: 600, 
                color: '#374151',
                fontSize: '14px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '16px',
                display: 'block'
              }}>
                Friends to Split With
                </label>
              
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '10px', 
                maxHeight: '200px', 
                overflowY: 'auto',
                padding: '8px',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                background: '#fafafa',
                scrollbarWidth: 'thin',
                scrollbarColor: '#003da6 #e5e7eb'
              }}>
              {FRIENDS_LIST.map(friend => {
                const identifier = friend.type === 'whatsapp' ? friend.phone : friend.email;
                const isSelected = selectedFriends.some(f => (f.type === 'whatsapp' ? f.phone : f.email) === identifier);
                return (
                                     <label 
                     key={identifier} 
                     style={{ 
                       display: 'flex', 
                       alignItems: 'center', 
                       gap: '12px', 
                       fontSize: '15px',
                       padding: '8px 8px',
                       borderRadius: '10px',
                       border: `2px solid ${isSelected ? '#003da6' : '#e5e7eb'}`,
                       background: isSelected ? 'linear-gradient(135deg, #f0f4ff 0%, #e6f0ff 100%)' : 'white',
                       cursor: 'pointer',
                       transition: 'all 0.3s ease',
                       position: 'relative',
                       overflow: 'hidden',
                       minHeight: '44px'
                     }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.target.style.borderColor = '#003da6';
                        e.target.style.background = '#f8f9ff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.target.style.borderColor = '#e5e7eb';
                        e.target.style.background = 'white';
                      }
                    }}
                  >
                    <input 
                      type="checkbox" 
                      checked={isSelected} 
                      onChange={() => handleFriendToggle(friend)}
                      style={{
                        accentColor: '#003da6',
                        transform: 'scale(1.2)'
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontWeight: 600, 
                        color: '#1f2937',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        {friend.name}
                        {friend.type === 'whatsapp' && (
                          <span style={{
                            background: '#25D366',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '8px',
                            fontSize: '10px',
                            fontWeight: '600',
                            textTransform: 'uppercase'
                          }}>
                            WhatsApp
                          </span>
                        )}
                        {friend.type === 'email' && (
                          <span style={{
                            background: '#003da6',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '8px',
                            fontSize: '10px',
                            fontWeight: '600',
                            textTransform: 'uppercase'
                          }}>
                            Email
                          </span>
                        )}
            </div>
                      <div style={{ 
                        color: '#6b7280', 
                        fontSize: '13px',
                        marginTop: '2px'
                      }}>
                        {friend.type === 'whatsapp' ? friend.phone : friend.email}
          </div>
                    </div>
                    {isSelected && (
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        width: '20px',
                        height: '20px',
                        background: '#003da6',
                        color: 'white',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        ✓
                      </div>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Message */}
          <div>
            <label style={{ 
              fontWeight: 600, 
              color: '#374151',
              fontSize: '14px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '12px',
              display: 'block'
            }}>
              Message (optional)
            </label>
            <input 
              type="text" 
              value={message} 
              onChange={e => setMessage(e.target.value)} 
              placeholder="Add a message for your friends..."
              style={{ 
                width: '100%', 
                padding: '12px 14px', 
                borderRadius: '12px', 
                border: '2px solid #e5e7eb', 
                fontSize: '15px',
                fontWeight: '500',
                color: '#1f2937',
                background: 'white',
                transition: 'all 0.3s ease',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#003da6';
                e.target.style.boxShadow = '0 0 0 3px rgba(0, 61, 166, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Split Amount Display */}
            {selectedFriends.length > 0 && localAmount && (
            <div style={{ 
              background: 'linear-gradient(135deg, #f0f4ff 0%, #e6f0ff 100%)',
              border: '2px solid #003da6',
              borderRadius: '16px',
              padding: '12px 16px',
              textAlign: 'center',
              marginTop: '2px'
            }}>
              <div style={{ 
                color: '#003da6', 
                fontWeight: 700, 
                fontSize: '18px',
                marginBottom: '4px'
              }}>
                Each pays: ${(parseFloat(localAmount) / (selectedFriends.length + 1)).toFixed(2)}
          </div>
              <div style={{ 
                color: '#6b7280', 
                fontSize: '13px',
                fontWeight: '500'
              }}>
                Split between {selectedFriends.length + 1} people
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={sending || !localAmount || selectedFriends.length === 0 || !selectedCardId} 
            style={{ 
              background: sending || !localAmount || selectedFriends.length === 0 || !selectedCardId 
                ? '#9ca3af' 
                : 'linear-gradient(135deg, #003da6 0%, #0052cc 100%)',
              color: '#fff', 
              border: 'none', 
              borderRadius: '16px', 
              padding: '14px 20px', 
              fontWeight: 700, 
              fontSize: '16px', 
              cursor: sending || !localAmount || selectedFriends.length === 0 || !selectedCardId ? 'not-allowed' : 'pointer', 
              width: '100%', 
              marginTop: '2px',
              marginBottom: '8px',
              boxShadow: sending || !localAmount || selectedFriends.length === 0 || !selectedCardId 
                ? 'none' 
                : '0 8px 24px rgba(0, 61, 166, 0.3)',
              transition: 'all 0.3s ease',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              if (!sending && localAmount && selectedFriends.length > 0 && selectedCardId) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 12px 32px rgba(0, 61, 166, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!sending && localAmount && selectedFriends.length > 0 && selectedCardId) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 8px 24px rgba(0, 61, 166, 0.3)';
              }
            }}
          >
            {sending ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Sending...
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                💰 Send Split Bill
              </span>
            )}
          </button>
        </form>

        {/* Result Message */}
        {result && (
          <div style={{ 
            marginTop: '12px', 
            padding: '12px 16px',
            borderRadius: '12px',
            fontWeight: 600, 
            textAlign: 'center', 
            fontSize: '14px',
            background: result.success ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' : 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
            color: result.success ? '#065f46' : '#991b1b',
            border: `2px solid ${result.success ? '#10b981' : '#ef4444'}`
          }}>
            {result.msg}
          </div>
        )}
      </div>
    </div>
  );
}

// Split Bill Choice Modal
const SplitBillChoiceModal = ({ open, onClose, setShowSplitBillQR, setShowSplitBill, setSplitBillAmount }) => {
  if (!open) return null;
  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      background: 'rgba(0, 0, 0, 0.6)', 
      zIndex: 1000, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '20px',
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{ 
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 50%, #fff5f5 100%)',
        borderRadius: '24px',
        padding: '32px',
        minWidth: '360px',
        maxWidth: '420px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0, 61, 166, 0.15)',
        position: 'relative',
        textAlign: 'center',
        border: '2px solid #e5e7eb'
      }}>
        <button 
          onClick={onClose} 
          style={{ 
            position: 'absolute', 
            top: '16px', 
            right: '20px', 
            background: 'rgba(0, 61, 166, 0.1)',
            border: 'none', 
            fontSize: '20px', 
            color: '#003da6',
            cursor: 'pointer',
            padding: '8px',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(0, 61, 166, 0.2)';
            e.target.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(0, 61, 166, 0.1)';
            e.target.style.transform = 'scale(1)';
          }}
        >
          ×
        </button>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          marginBottom: '24px'
        }}>
          <div style={{
            fontSize: '24px',
            background: 'linear-gradient(135deg, #003da6 0%, #0052cc 100%)',
            color: 'white',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            💰
          </div>
          <h2 style={{ 
            margin: 0, 
            fontSize: '1.5rem', 
            color: '#003da6', 
            fontWeight: 700 
          }}>
            Split Bill
          </h2>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button 
            onClick={() => { onClose(); setShowSplitBillQR(true); }} 
            style={{ 
              width: '100%', 
              background: 'linear-gradient(135deg, #003da6 0%, #0052cc 100%)',
              color: '#fff', 
              border: 'none', 
              borderRadius: '16px', 
              padding: '16px 24px', 
              fontWeight: 700, 
              fontSize: '16px', 
              marginBottom: '16px', 
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              boxShadow: '0 8px 24px rgba(0, 61, 166, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 12px 32px rgba(0, 61, 166, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 8px 24px rgba(0, 61, 166, 0.3)';
            }}
          >
            📱 Scan QR to Split Bill
          </button>
          
          <button 
            onClick={() => { onClose(); setSplitBillAmount(''); setShowSplitBill(true); }} 
            style={{ 
              width: '100%', 
              background: 'white',
              color: '#003da6', 
              border: '2px solid #003da6', 
              borderRadius: '16px', 
              padding: '16px 24px', 
              fontWeight: 700, 
              fontSize: '16px', 
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#003da6';
              e.target.style.color = 'white';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 8px 24px rgba(0, 61, 166, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'white';
              e.target.style.color = '#003da6';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            ✏️ Manual Split Bill
          </button>
        </div>
      </div>
    </div>
  );
};

// Auto Top Up Modal Component
const AutoTopUpModal = ({ open, onClose, cards, onSaveSettings }) => {
  const [selectedCardId, setSelectedCardId] = useState('');
  const [thresholdAmount, setThresholdAmount] = useState('');
  const [topUpAmount, setTopUpAmount] = useState('30');
  const [isEnabled, setIsEnabled] = useState(false);

  const handleSave = () => {
    if (!selectedCardId || !thresholdAmount || !topUpAmount) {
      alert('Please fill in all fields');
      return;
    }
    
    const selectedCard = cards.find(c => c.id === selectedCardId);
    const settings = {
      cardId: selectedCardId,
      cardNumber: selectedCard?.number || '',
      thresholdAmount: parseFloat(thresholdAmount),
      topUpAmount: parseFloat(topUpAmount),
      isEnabled: isEnabled
    };
    
    onSaveSettings(settings);
    onClose();
  };

  if (!open) return null;
  
  return (
    <div className="modal-overlay" style={{ position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(0,0,0,0.18)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ 
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)', 
        borderRadius: 20, 
        padding: 32, 
        width: '90%', 
        maxWidth: 500, 
        boxShadow: '0 8px 32px rgba(0,61,166,0.15)', 
        position: 'relative',
        border: '2px solid #e0f0ff'
      }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 18, background: 'none', border: 'none', fontSize: 26, cursor: 'pointer', color: '#888' }}>&times;</button>
        <h2 style={{ marginBottom: 24, fontSize: '1.4rem', color: '#003da6', fontWeight: 700, textAlign: 'center' }}>Auto Top Up Settings</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Enable/Disable Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 100%)', borderRadius: 16, border: '1px solid #cce7ff' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '1rem', color: '#003da6' }}>Enable Auto Top Up</div>
              <div style={{ fontSize: '0.9rem', color: '#666', marginTop: 4 }}>Automatically top up when balance drops below threshold</div>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: 50, height: 24 }}>
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute',
                cursor: 'pointer',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: isEnabled ? '#003da6' : '#ccc',
                borderRadius: 24,
                transition: '0.3s',
                display: 'flex',
                alignItems: 'center',
                padding: '2px'
              }}>
                <span style={{
                  height: 18,
                  width: 18,
                  background: 'white',
                  borderRadius: '50%',
                  transition: '0.3s',
                  transform: isEnabled ? 'translateX(26px)' : 'translateX(0)'
                }} />
              </span>
            </label>
          </div>

          {/* Card Selection */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#003da6' }}>Select Card:</label>
            <select 
              value={selectedCardId} 
              onChange={(e) => setSelectedCardId(e.target.value)}
              style={{ 
                width: '100%', 
                padding: 12, 
                borderRadius: 12, 
                border: '2px solid #e0f0ff', 
                fontSize: 16,
                background: 'white',
                color: '#333',
                outline: 'none',
                transition: 'all 0.3s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#003da6'}
              onBlur={(e) => e.target.style.borderColor = '#e0f0ff'}
              required
            >
              <option value="">Choose a card...</option>
              {cards.map(card => (
                <option key={card.id} value={card.id}>
                  **** **** **** {String(card.number).slice(-4)} (Bal: ${Number(card.balance).toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          {/* Threshold Amount */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#003da6' }}>Threshold Amount ($):</label>
            <input 
              type="number" 
              min="0.01" 
              step="0.01" 
              value={thresholdAmount} 
              onChange={(e) => setThresholdAmount(e.target.value)}
              placeholder="e.g., 10.00"
              style={{ 
                width: '100%', 
                padding: 12, 
                borderRadius: 12, 
                border: '2px solid #e0f0ff', 
                fontSize: 16,
                background: 'white',
                outline: 'none',
                transition: 'all 0.3s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#003da6'}
              onBlur={(e) => e.target.style.borderColor = '#e0f0ff'}
              required
            />
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: 4 }}>
              Auto top up will trigger when balance drops below this amount
            </div>
          </div>

          {/* Top Up Amount */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#003da6' }}>Top Up Amount ($):</label>
            <input 
              type="number" 
              min="0.01" 
              step="0.01" 
              value={topUpAmount} 
              onChange={(e) => setTopUpAmount(e.target.value)}
              placeholder="e.g., 30.00"
              style={{ 
                width: '100%', 
                padding: 12, 
                borderRadius: 12, 
                border: '2px solid #e0f0ff', 
                fontSize: 16,
                background: 'white',
                outline: 'none',
                transition: 'all 0.3s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#003da6'}
              onBlur={(e) => e.target.style.borderColor = '#e0f0ff'}
              required
            />
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: 4 }}>
              Amount to add when auto top up is triggered
            </div>
          </div>

          {/* Summary */}
          {selectedCardId && thresholdAmount && topUpAmount && (
            <div style={{ padding: 20, background: 'linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 100%)', borderRadius: 16, border: '2px solid #cce7ff' }}>
              <div style={{ fontWeight: 600, color: '#003da6', marginBottom: 12, fontSize: '1.1rem' }}>📋 Summary:</div>
              <div style={{ fontSize: '0.95rem', color: '#333', lineHeight: 1.6 }}>
                When the balance of card ending in <strong>{cards.find(c => c.id === selectedCardId)?.number.slice(-4)}</strong> drops below <strong>${parseFloat(thresholdAmount).toFixed(2)}</strong>, 
                it will be automatically topped up with <strong>${parseFloat(topUpAmount).toFixed(2)}</strong>.
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button 
            onClick={onClose}
            style={{ 
              flex: 1, 
              background: '#f8f9fa', 
              color: '#666', 
              border: '2px solid #e0e0f0', 
              borderRadius: 12, 
              padding: '14px 16px', 
              fontWeight: 600, 
              fontSize: '1rem', 
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#e9ecef';
              e.target.style.borderColor = '#dee2e6';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#f8f9fa';
              e.target.style.borderColor = '#e0e0f0';
            }}
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={!selectedCardId || !thresholdAmount || !topUpAmount}
            style={{ 
              flex: 1, 
              background: !selectedCardId || !thresholdAmount || !topUpAmount ? '#ccc' : 'linear-gradient(135deg, #003da6 0%, #002d7a 100%)', 
              color: '#fff', 
              border: 'none', 
              borderRadius: 12, 
              padding: '14px 16px', 
              fontWeight: 600, 
              fontSize: '1rem', 
              cursor: !selectedCardId || !thresholdAmount || !topUpAmount ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: !selectedCardId || !thresholdAmount || !topUpAmount ? 'none' : '0 4px 12px rgba(0,61,166,0.3)'
            }}
            onMouseEnter={(e) => {
              if (selectedCardId && thresholdAmount && topUpAmount) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 16px rgba(0,61,166,0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedCardId && thresholdAmount && topUpAmount) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(0,61,166,0.3)';
              }
            }}
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

// Auto Top Up Notification Modal
const AutoTopUpNotificationModal = ({ open, onClose, data, onConfirm }) => {
  if (!open || !data) return null;
  
  return (
    <div className="modal-overlay" style={{ position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(0,0,0,0.18)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ 
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)', 
        borderRadius: 20, 
        padding: 32, 
        width: '90%', 
        maxWidth: '400px',
        boxShadow: '0 8px 32px rgba(0,61,166,0.15)', 
        position: 'relative', 
        textAlign: 'center',
        border: '2px solid #e0f0ff'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>💰</div>
        <h2 style={{ marginBottom: 16, fontSize: '1.3rem', color: '#003da6', fontWeight: 700 }}>Auto Top Up Alert!</h2>
        
        <div style={{ 
          background: 'linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 100%)', 
          borderRadius: 16, 
          padding: 20, 
          marginBottom: 24, 
          border: '2px solid #cce7ff' 
        }}>
          <div style={{ fontSize: '1.1rem', color: '#333', marginBottom: 12 }}>
            Your card ending in <strong>{data.cardNumber.slice(-4)}</strong> has dropped below the threshold of <strong>${data.thresholdAmount.toFixed(2)}</strong>.
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#28a745' }}>
            Auto top up of <strong>${data.topUpAmount.toFixed(2)}</strong> will be processed.
          </div>
        </div>
        
        <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: 24 }}>
          Current balance: <strong>${data.currentBalance.toFixed(2)}</strong><br/>
          New balance after top up: <strong>${(data.currentBalance + data.topUpAmount).toFixed(2)}</strong>
        </div>
        
        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            onClick={onClose}
            style={{ 
              flex: 1, 
              background: '#f8f9fa', 
              color: '#666', 
              border: '2px solid #e0e0f0', 
              borderRadius: 12, 
              padding: '14px 16px', 
              fontWeight: 600, 
              fontSize: '1rem', 
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#e9ecef';
              e.target.style.borderColor = '#dee2e6';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#f8f9fa';
              e.target.style.borderColor = '#e0e0f0';
            }}
          >
            Cancel
          </button>
          <button 
            onClick={() => {
              onConfirm(data);
              onClose();
            }}
            style={{ 
              flex: 1, 
              background: 'linear-gradient(135deg, #28a745 0%, #1e7e34 100%)', 
              color: '#fff', 
              border: 'none', 
              borderRadius: 12, 
              padding: '14px 16px', 
              fontWeight: 600, 
              fontSize: '1rem', 
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 12px rgba(40,167,69,0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 16px rgba(40,167,69,0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(40,167,69,0.3)';
            }}
          >
            Confirm Top Up
          </button>
        </div>
      </div>
    </div>
  );
};

// Save Confirmation Popup
const SaveConfirmationPopup = ({ open, onClose, message, type = 'settings' }) => {
  if (!open) return null;
  
  const isAutoTopUp = type === 'autoTopUp';
  
  return (
    <div className="modal-overlay" style={{ position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(0,0,0,0.18)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ 
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)', 
        borderRadius: 16, 
        padding: 24, 
        width: '90%', 
        maxWidth: 400, 
        boxShadow: '0 8px 32px rgba(0,61,166,0.15)', 
        position: 'relative', 
        textAlign: 'center',
        border: '2px solid #e0f0ff'
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>{isAutoTopUp ? '💰' : '✅'}</div>
        <h3 style={{ marginBottom: 16, fontSize: '1.2rem', color: '#003da6', fontWeight: 700 }}>
          {isAutoTopUp ? 'Auto Top Up Completed!' : 'Settings Saved!'}
        </h3>
        <div style={{ fontSize: '1rem', color: '#333', marginBottom: 20, lineHeight: 1.5 }}>
          {message}
        </div>
        <button 
          onClick={onClose}
          style={{ 
            background: 'linear-gradient(135deg, #003da6 0%, #002d7a 100%)', 
            color: '#fff', 
            border: 'none', 
            borderRadius: 12, 
            padding: '12px 24px', 
            fontWeight: 600, 
            fontSize: '1rem', 
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 12px rgba(0,61,166,0.3)'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 6px 16px rgba(0,61,166,0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 12px rgba(0,61,166,0.3)';
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
};

export default function Home({ isSignedIn, user, cards, setCards, onProfileClick, onTabChange, userVouchers = 0, setUserVouchers = null, onVoucherUse = null }) {
  // Debug user object
  console.log('Home component - user object:', user);
  console.log('Home component - isSignedIn:', isSignedIn);
  
  // Add CSS animation for spinner
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);
  const [transactions, setTransactions] = useState([]);
  const [showAddCard, setShowAddCard] = useState(false);
  const [topUpCardId, setTopUpCardId] = useState(null);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [showTopUpConfirmation, setShowTopUpConfirmation] = useState(false);
  const [topUpPaymentData, setTopUpPaymentData] = useState(null);
  const [showTopUpPaymentGateway, setShowTopUpPaymentGateway] = useState(false);
  const [showCardSelectionModal, setShowCardSelectionModal] = useState(false);
  const [showSendMoney, setShowSendMoney] = useState(false);
  const [showPaymentGame, setShowPaymentGame] = useState(false);
  const [showQuickSendModal, setShowQuickSendModal] = useState(false);
  const [showAvatarPaymentGame, setShowAvatarPaymentGame] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [quickSendAmount, setQuickSendAmount] = useState('');
  const [quickSendCardId, setQuickSendCardId] = useState('');
  const [paymentData, setPaymentData] = useState(null);
  const paymentHandledRef = useRef(false);
  const [showSplitBill, setShowSplitBill] = useState(false);
  const [splitBillAmount, setSplitBillAmount] = useState('');
      const [showSplitBillChoice, setShowSplitBillChoice] = useState(false);
    const [showSplitBillQR, setShowSplitBillQR] = useState(false);
    const [splitBillScanError, setSplitBillScanError] = useState('');
    const [splitBillUploadedImage, setSplitBillUploadedImage] = useState(null);
    const [showTransactionSplitModal, setShowTransactionSplitModal] = useState(false);
    const [selectedTransactionForSplit, setSelectedTransactionForSplit] = useState(null);
  const [selectedFriendsForSplit, setSelectedFriendsForSplit] = useState([]);
  const [sendingSplitBill, setSendingSplitBill] = useState(false);
  const [splitBillResult, setSplitBillResult] = useState(null);
  const splitBillFileInputRef = useRef();
  const [showBalanceDetailsModal, setShowBalanceDetailsModal] = useState(false);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showNFCModal, setShowNFCModal] = useState(false);
  const [showGame, setShowGame] = useState(false);
  const [currentGame, setCurrentGame] = useState(null);
  const [userCoins, setUserCoins] = useState(0);
  const [gameStats, setGameStats] = useState({});
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [voucherHistory, setVoucherHistory] = useState([]);
  const [checkInData, setCheckInData] = useState({
    lastCheckIn: null,
    currentStreak: 0,
    totalCheckIns: 0
  });
  const [showAutoTopUpModal, setShowAutoTopUpModal] = useState(false);
  const [autoTopUpSettings, setAutoTopUpSettings] = useState([]);
  const [showAutoTopUpNotification, setShowAutoTopUpNotification] = useState(false);
  const [autoTopUpNotificationData, setAutoTopUpNotificationData] = useState(null);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [saveConfirmationMessage, setSaveConfirmationMessage] = useState('');
  const [isProcessingAutoTopUp, setIsProcessingAutoTopUp] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  const [clickedDay, setClickedDay] = useState(null);

  useEffect(() => {
    const userId = getCurrentUser();
    if (userId) {
      fetch(`${API_BASE_URL}/api/transactions?user_id=${userId}`)
        .then(res => res.json())
        .then(data => setTransactions(data));
      fetch(`${API_BASE_URL}/api/cards?user_id=${userId}`)
        .then(res => res.json())
        .then(data => {
          const cardData = Array.isArray(data)
            ? data.map(card => ({ ...card, balance: Number(card.balance) }))
            : [];
          setCards(cardData);
        });
      
      // Load game stats and vouchers
      loadGameStatsAndVouchers(userId);
    } else {
      setCards([]);
      setTransactions([]);
    }
  }, [isSignedIn]);

  // Load game stats and vouchers from database
  const loadGameStatsAndVouchers = async (userId) => {
    try {
      // Load game stats
      const statsResponse = await fetch(`http://localhost:3002/api/game-stats/${userId}`);
      const statsData = await statsResponse.json();
      if (statsData.success) {
        const statsMap = {};
        let totalCoins = 0;
        statsData.gameStats.forEach(stat => {
          statsMap[stat.game_type] = stat;
          totalCoins += stat.credits_earned || 0;
        });
        setGameStats(statsMap);
        setUserCoins(totalCoins);
        console.log('Total coins loaded from database:', totalCoins);
      }

      // Load vouchers
      const vouchersResponse = await fetch(`http://localhost:3002/api/vouchers/${userId}`);
      const vouchersData = await vouchersResponse.json();
      console.log('Vouchers data loaded:', vouchersData); // Debug log
      if (vouchersData.success) {
        setUserVouchers(vouchersData.vouchers.quantity);
        console.log('User vouchers set to:', vouchersData.vouchers.quantity); // Debug log
      }

      // Load voucher history
      const historyResponse = await fetch(`${API_BASE_URL}/api/vouchers/transactions/${userId}`);
      const historyData = await historyResponse.json();
      if (historyData.success) {
        setVoucherHistory(historyData.transactions);
      }

      // Load check-in data
      const checkInResponse = await fetch(`http://localhost:3002/api/check-in/${userId}`);
      const checkInData = await checkInResponse.json();
      if (checkInData.success) {
        setCheckInData(checkInData.data);
      }
    } catch (error) {
      console.error('Error loading game stats and vouchers:', error);
    }
  };

  // Calculate total balance
  const totalBalance = cards.reduce((sum, card) => sum + (Number(card.balance) || 0), 0);

  // Gather all transactions from all cards
  const allTransactions = transactions.length > 0 ? transactions : getAllTransactions(cards);

  // Sort transactions by time descending (latest first)
  const sortedTransactions = [...allTransactions].sort(
    (a, b) => new Date(b.time) - new Date(a.time)
  );
  console.log('Rendering sortedTransactions:', sortedTransactions);

  // Before rendering, sort cards by id to preserve original order
  const sortedCards = [...cards].sort((a, b) => a.id - b.id);

  // Add new card handler
  const handleAddCard = async (card) => {
    const userId = getCurrentUser();
    console.log('Adding card for user ID:', userId);
    console.log('Card data:', card);
    
    if (!userId) {
      alert('You must be signed in to add a card.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          number: card.number,
          holder: card.holder,
          expiry: card.expiry,
          design: card.design || 'netscard1'
        })
      });
      if (!res.ok) {
        const err = await res.json();
        console.error('Failed to add card:', err);
        alert('Failed to add card: ' + (err.error || 'Unknown error'));
        return;
      }
      
      const result = await res.json();
      console.log('Card added successfully:', result);
      
      // Refresh cards
      console.log('Refreshing cards for user:', userId);
      fetch(`${API_BASE_URL}/api/cards?user_id=${userId}`)
        .then(res => res.json())
        .then(data => {
          console.log('Cards data received:', data);
          const cardData = Array.isArray(data)
            ? data.map(card => ({ ...card, balance: Number(card.balance) }))
            : [];
          console.log('Setting cards:', cardData);
          setCards(cardData);
        })
        .catch(err => {
          console.error('Error refreshing cards:', err);
        });
      setShowAddCard(false);
    } catch (e) {
      alert('Network error: ' + e.message);
    }
  };

  // Top up handlers
  const openTopUp = (cardId) => {
    setTopUpCardId(cardId);
    setTopUpAmount('');
  };
  
  // Smart Shortcut Top Up - show card selection first
  const openSmartShortcutTopUp = () => {
    if (cards.length === 0) {
      alert('No cards available. Please add a card first.');
      return;
    }
    // Always show card selection modal for better UX
    setShowCardSelectionModal(true);
  };
  
  const closeCardSelectionModal = () => {
    setShowCardSelectionModal(false);
  };
  
  const selectCardForTopUp = (cardId) => {
    setShowCardSelectionModal(false);
    openTopUp(cardId);
  };
  
  // Quick Send handlers
  const openQuickSend = (recipient) => {
    console.log('Quick Send clicked for:', recipient);
    setSelectedRecipient(recipient);
    setQuickSendAmount('');
    // Always set to first card if available, or keep current selection if valid
    if (cards.length > 0) {
      const currentCard = cards.find(card => card.id == quickSendCardId);
      if (!currentCard) {
        setQuickSendCardId(cards[0].id); // Set to first card if current selection is invalid
      }
    }
    setShowQuickSendModal(true);
  };
  
  const closeQuickSendModal = () => {
    setShowQuickSendModal(false);
    setSelectedRecipient(null);
    setQuickSendAmount('');
    // Don't reset quickSendCardId to keep user's selection for next time
  };
  
  const handleQuickSendSubmit = (e) => {
    e.preventDefault();
    if (!quickSendAmount || !quickSendCardId) {
      alert('Please enter amount and select a card');
      return;
    }
    
    const amount = parseFloat(quickSendAmount);
    if (amount <= 0) {
      alert('Please enter a valid amount greater than 0');
      return;
    }
    
    const selectedCard = cards.find(card => card.id == quickSendCardId);
    if (!selectedCard) {
      alert('Selected card not found');
      return;
    }
    
    // Close modal and start Avatar Payment Game
    setShowQuickSendModal(false);
    setShowAvatarPaymentGame(true);
  };
  
  const handleAvatarPaymentComplete = async (paymentData) => {
    const userId = getCurrentUser();
    if (!userId) {
      alert('You must be signed in to make payments.');
      return;
    }

    try {
      // Deduct amount from card
      const deductRes = await fetch(`${API_BASE_URL}/api/cards/deduct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_id: paymentData.card.id, amount: paymentData.amount })
      });
      
      if (!deductRes.ok) {
        throw new Error('Failed to deduct from card');
      }

      // Create transaction record
              const txnRes = await fetch(`${API_BASE_URL}/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          card_id: paymentData.card.id,
          name: `Quick Send to ${paymentData.recipient.name}`,
          amount: -paymentData.amount,
          type: 'expense'
        })
      });

      if (!txnRes.ok) {
        throw new Error('Failed to create transaction');
      }

      // Update card balance in place
      setCards(prevCards => prevCards.map(c =>
        c.id === paymentData.card.id 
          ? { ...c, balance: Number(c.balance) - Number(paymentData.amount) } 
          : c
      ));

      // Close modal and reset state
      setShowAvatarPaymentGame(false);
      setSelectedRecipient(null);
      setQuickSendAmount('');
      setQuickSendCardId('');
      
      // Refresh transactions
      refreshTransactions(userId);
      
      alert(`Payment sent successfully to ${paymentData.recipient.name}!`);
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment failed: ' + error.message);
    }
  };
  const closeTopUp = () => {
    setTopUpCardId(null);
    setTopUpAmount('');
  };

  const handleTopUpConfirmation = () => {
    if (!topUpCardId || !topUpAmount || parseFloat(topUpAmount) <= 0) {
      alert('Please enter a valid amount greater than 0');
      return;
    }
    
    const amount = parseFloat(topUpAmount);
    const selectedCard = cards.find(card => card.id === topUpCardId);
    
    if (!selectedCard) {
      alert('Selected card not found');
      return;
    }
    
    // Set up payment data for PaymentGateway
    setTopUpPaymentData({
      card: selectedCard,
      amount: amount,
      type: 'topup'
    });
    
    // Show confirmation modal
    setShowTopUpConfirmation(true);
  };

  const confirmTopUp = () => {
    setShowTopUpConfirmation(false);
    setShowTopUpPaymentGateway(true);
  };

  const handleTopUpPaymentSuccess = async (paymentData) => {
    console.log('Top-up payment successful:', paymentData);
    console.log('topUpPaymentData:', topUpPaymentData);
    
    if (!topUpPaymentData) {
      alert('Top-up data not found. Please try again.');
      setShowTopUpPaymentGateway(false);
      return;
    }
    
    try {
      // If payment was made with a prepaid card, we need to create both transactions:
      // 1. Debit transaction for the paying card (if it was a prepaid card)
      // 2. Credit transaction for the receiving card
      
      const userId = getCurrentUser();
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      // Create debit transaction for the paying card (if it was a prepaid card)
      if (paymentData.method === 'NETS_PREPAID' && paymentData.cardId) {
        console.log('Creating debit transaction for paying card:', paymentData.cardId);
        
        const debitResponse = await fetch(`${API_BASE_URL}/api/transactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            card_id: paymentData.cardId,
            name: `Top-up Payment for Card ending in ${topUpPaymentData.card.number.slice(-4)}`,
            amount: -topUpPaymentData.amount, // Negative amount for debit
            type: 'expense'
          })
        });
        
        if (!debitResponse.ok) {
          console.error('Failed to create debit transaction:', await debitResponse.text());
        } else {
          console.log('Debit transaction created successfully');
        }
      }
      
      // Call the backend API to actually top up the destination card
      console.log('Calling top-up API:', { 
        card_id: topUpPaymentData.card.id, 
        amount: topUpPaymentData.amount 
      });
      
      const response = await fetch(`${API_BASE_URL}/api/cards/topup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          card_id: topUpPaymentData.card.id, 
          amount: topUpPaymentData.amount 
        })
      });
      
      console.log('Top-up API response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Top-up API successful:', result);
      
      // Update both card balances in the UI immediately
      setCards(prevCards => {
        console.log('Previous cards:', prevCards);
        const updatedCards = prevCards.map(card => {
          // Update the receiving card (being topped up)
          if (card.id === topUpPaymentData.card.id) {
            const newBalance = Number(card.balance || 0) + Number(topUpPaymentData.amount);
            console.log(`Updating receiving card ${card.id} balance from ${card.balance} to ${newBalance}`);
            return { 
              ...card, 
              balance: newBalance 
            };
          }
          // Update the paying card (if it was a prepaid card)
          if (paymentData.method === 'NETS_PREPAID' && paymentData.cardId && card.id === paymentData.cardId) {
            const newBalance = Number(card.balance || 0) - Number(topUpPaymentData.amount);
            console.log(`Updating paying card ${card.id} balance from ${card.balance} to ${newBalance}`);
            return { 
              ...card, 
              balance: newBalance 
            };
          }
          return card;
        });
        console.log('Updated cards:', updatedCards);
        return updatedCards;
      });
      
      // Refresh transactions to show both the debit and credit transactions
      if (userId) {
        console.log('Refreshing transactions for user:', userId);
        refreshTransactions(userId);
      }
      
      alert('Top-up successful! Your card has been topped up.');
      setShowTopUpPaymentGateway(false);
      setTopUpPaymentData(null);
      setTopUpCardId(null);
      setTopUpAmount('');
      
    } catch (error) {
      console.error('Top-up API error:', error);
      alert('Payment successful but top-up failed: ' + error.message);
      setShowTopUpPaymentGateway(false);
    }
  };

  const handleTopUpPaymentFailure = (paymentData) => {
    console.log('Top-up payment failed:', paymentData);
    alert('Top-up payment failed. Please try again.');
    setShowTopUpPaymentGateway(false);
  };

  // Voucher handling for top-up
  const handleVoucherUse = (vouchersUsed) => {
    // This will be handled by the parent App component
    // We just need to pass it through
    if (typeof onVoucherUse === 'function') {
      onVoucherUse(vouchersUsed);
    }
  };

  // Send Money handlers
  const handleSendMoney = (recipient, card, amount) => {
    setPaymentData({ recipient, card, amount });
    setShowSendMoney(false);
    setShowPaymentGame(true);
  };

  // Split Bill handler for food transactions
  const handleSplitBill = (transaction) => {
    setSelectedTransactionForSplit(transaction);
    setSelectedFriendsForSplit([]);
    setSplitBillResult(null);
    setShowTransactionSplitModal(true);
  };

  // Delete card handler
  const handleDeleteCard = async (cardId) => {
    if (!confirm('Are you sure you want to delete this card?')) {
      return;
    }
    
    const userId = getCurrentUser();
    if (!userId) {
      alert('You must be signed in to delete a card.');
      return;
    }
    
    try {
      const res = await fetch(`http://localhost:3002/api/cards/${cardId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!res.ok) {
        const err = await res.json();
        alert('Failed to delete card: ' + (err.error || 'Unknown error'));
        return;
      }
      
      // Refresh cards
      fetch(`${API_BASE_URL}/api/cards?user_id=${userId}`)
        .then(res => res.json())
        .then(data => {
          const cardData = Array.isArray(data)
            ? data.map(card => ({ ...card, balance: Number(card.balance) }))
            : [];
          setCards(cardData);
        });
      
      alert('Card deleted successfully!');
    } catch (e) {
      alert('Network error: ' + e.message);
    }
  };

  const handlePaymentComplete = async (result) => {
    if (paymentHandledRef.current) return;
    paymentHandledRef.current = true;
    setShowPaymentGame(false);
    setPaymentData(null);

    if (result.success) {
      try {
        // Simulate sending money to recipient
        const userId = getCurrentUser();
        console.log('Processing payment for user:', userId);
        
        // Deduct from card
        console.log('Home: Sending deduct request with:', { card_id: result.card.id, amount: result.amount });
        const deductResponse = await fetch(`${API_BASE_URL}/api/cards/deduct`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            card_id: result.card.id, 
            amount: result.amount 
          })
        });
        
        console.log('Deduct response:', deductResponse.status);
        
        if (!deductResponse.ok) {
          const errorData = await deductResponse.json();
          throw new Error(errorData.error || 'Failed to deduct from card');
        }
        
        // Add transaction record
        const transactionResponse = await fetch(`${API_BASE_URL}/api/transactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            card_id: result.card.id,
            name: `Sent to ${result.recipient.name}`,
            amount: -result.amount,
            type: 'expense'
          })
        });
        
        console.log('Transaction response:', transactionResponse.status);
        
        if (!transactionResponse.ok) {
          const errorData = await transactionResponse.json();
          throw new Error(errorData.error || 'Failed to create transaction');
        }
        
        // Update only the specific card's balance without fetching all cards
        setCards(prevCards =>
          prevCards.map(card =>
            card.id === result.card.id
              ? { ...card, balance: Number(card.balance) - Number(result.amount) }
              : card
          )
        );
        
        refreshTransactions(userId);
        
        fetch(`${API_BASE_URL}/api/transactions?user_id=${userId}`)
          .then(res => res.json())
          .then(data => setTransactions(data));
        
        alert(`Successfully sent $${result.amount.toFixed(2)} to ${result.recipient.name}! Score: ${result.score}`);
      } catch (e) {
        console.error('Payment error:', e);
        alert('Payment failed: ' + e.message);
      }
    } else {
      alert(`Game over! You scored ${result.score} goals. Payment cancelled.`);
    }
  };

  useEffect(() => {
    if (!showPaymentGame) paymentHandledRef.current = false;
  }, [showPaymentGame]);

  // Add a helper function to refresh transactions
  const refreshTransactions = (userId) => {
    fetch(`${API_BASE_URL}/api/transactions?user_id=${userId}`)
      .then(res => res.json())
      .then(data => setTransactions(data));
  };

  // Game handlers
  const handleGameClick = (gameType) => {
    setCurrentGame(gameType);
    setShowGame(true);
  };

  const handleGameClose = () => {
    setShowGame(false);
    setCurrentGame(null);
  };

  const handleGameComplete = async (gameType, gameResult) => {
    const userId = getCurrentUser();
    if (!userId) return;

    // Update local coins
    setUserCoins(prev => prev + 1);
    console.log('Game completed! +1 coin');

    // Update game stats in database
    try {
      const currentStats = gameStats[gameType] || {
        games_played: 0,
        wins: 0,
        best_score: 0,
        total_credits_earned: 0
      };

      const updatedStats = {
        games_played: currentStats.games_played + 1,
        wins: currentStats.wins + (gameResult?.won ? 1 : 0),
        best_score: Math.max(currentStats.best_score, gameResult?.score || 0),
        total_credits_earned: currentStats.total_credits_earned + 1
      };

      await fetch('http://localhost:3002/api/game-stats/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          gameType,
          gamesPlayed: updatedStats.games_played,
          wins: updatedStats.wins,
          bestScore: updatedStats.best_score,
          creditsEarned: 1
        })
      });

      // Update local game stats
      setGameStats(prev => ({
        ...prev,
        [gameType]: updatedStats
      }));

    } catch (error) {
      console.error('Error updating game stats:', error);
    }
  };

  const handleVoucherExchange = async (vouchersToExchange) => {
    const userId = getCurrentUser();
    if (!userId) return;

    // Exchange coins for vouchers
    const coinsToDeduct = vouchersToExchange * 10;
    
    try {
      const response = await fetch('http://localhost:3002/api/vouchers/exchange', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          creditsToExchange: coinsToDeduct
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setUserCoins(prev => prev - coinsToDeduct);
        setUserVouchers(prev => prev + vouchersToExchange);
        alert(`✅ Exchanged ${coinsToDeduct} coins for ${vouchersToExchange} voucher${vouchersToExchange > 1 ? 's' : ''} worth $${(vouchersToExchange * 0.10).toFixed(2)}!`);
      } else {
        alert(`❌ Failed to exchange vouchers: ${data.error}`);
      }
    } catch (error) {
      console.error('Error exchanging vouchers:', error);
      alert('❌ Failed to exchange vouchers. Please try again.');
    }
  };

  const handleCheckIn = async () => {
    const userId = getCurrentUser();
    console.log('handleCheckIn called with userId:', userId);
    console.log('localStorage user_id:', localStorage.getItem('user_id'));
    console.log('isSignedIn state:', isSignedIn);
    console.log('Current frontend checkInData:', checkInData);
    if (!userId) {
      console.log('No userId, returning');
      alert('❌ You need to be signed in to check in!');
      return;
    }

    try {
      console.log('Making API call to check-in...');
      const response = await fetch('http://localhost:3002/api/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      });

      console.log('API response received:', response);
      const data = await response.json();
      console.log('API data:', data);
      
      if (data.success) {
        console.log('Check-in successful, updating state...');
        setUserCoins(prev => {
          console.log('Previous coins:', prev, 'Adding:', data.coinsEarned);
          return prev + data.coinsEarned;
        });
        setCheckInData(data.checkInData);
        console.log('New check-in data:', data.checkInData);
        // Show simple success message instead of modal to avoid loop
        alert(`✅ Check-in successful! You earned 1 coin!`);
      } else {
        console.log('Check-in failed:', data);
        console.log('Full response data:', JSON.stringify(data, null, 2));
        // Handle "already checked in" case
        if (data.message === 'Already checked in today') {
          console.log('Backend says already checked in today, updating frontend state...');
          setCheckInData(data.checkInData);
          setShowCheckInModal(true);
        } else {
          alert(`❌ ${data.error || 'Failed to check in'}`);
        }
      }
    } catch (error) {
      console.error('Error checking in:', error);
      alert('❌ Failed to check in. Please try again.');
    }
  };

  const clearCheckIn = async () => {
    const userId = getCurrentUser();
    if (!userId) return;

    try {
      const response = await fetch('http://localhost:3002/api/check-in/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      });

      const data = await response.json();
      if (data.success) {
        setCheckInData({
          lastCheckIn: null,
          currentStreak: 0,
          totalCheckIns: 0
        });
        alert('✅ Check-in record cleared! You can check in again.');
      } else {
        alert(`❌ ${data.error || 'Failed to clear check-in record'}`);
      }
    } catch (error) {
      console.error('Error clearing check-in:', error);
      alert('❌ Failed to clear check-in record. Please try again.');
    }
  };

  // Refresh check-in data from backend
  const refreshCheckInData = async () => {
    const userId = getCurrentUser();
    if (!userId) return;
    
    try {
      console.log('Refreshing check-in data from backend...');
      const response = await fetch(`http://localhost:3002/api/check-in/${userId}`);
      const data = await response.json();
      console.log('Refreshed check-in data:', data);
      if (data.success) {
        setCheckInData(data.data);
      }
    } catch (error) {
      console.error('Error refreshing check-in data:', error);
    }
  };

  const resetVouchers = async () => {
    const userId = getCurrentUser();
    if (!userId) return;

    try {
      const response = await fetch('http://localhost:3002/api/vouchers/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      });

      const data = await response.json();
      if (data.success) {
        setUserVouchers(0);
        alert('✅ Voucher data reset! You can now earn vouchers properly.');
      } else {
        alert(`❌ ${data.error || 'Failed to reset voucher data'}`);
      }
    } catch (error) {
      console.error('Error resetting vouchers:', error);
      alert('❌ Failed to reset voucher data. Please try again.');
    }
  };

  // Auto Top Up handlers
  const handleSaveAutoTopUpSettings = (settings) => {
    setAutoTopUpSettings(prev => {
      // Remove existing settings for the same card
      const filtered = prev.filter(s => s.cardId !== settings.cardId);
      return [...filtered, settings];
    });
    
    // Save to localStorage for persistence
    const updatedSettings = [...autoTopUpSettings.filter(s => s.cardId !== settings.cardId), settings];
    localStorage.setItem('autoTopUpSettings', JSON.stringify(updatedSettings));
    
    // Show save confirmation popup
    setSaveConfirmationMessage(`Auto top up settings saved for card ending in ${settings.cardNumber.slice(-4)}!`);
    setShowSaveConfirmation(true);
  };

  const handleCancelAutoTopUp = (cardId) => {
    setAutoTopUpSettings(prev => {
      const filtered = prev.filter(s => s.cardId !== cardId);
      localStorage.setItem('autoTopUpSettings', JSON.stringify(filtered));
      return filtered;
    });
    
    setSaveConfirmationMessage('Auto top up settings cancelled successfully!');
    setShowSaveConfirmation(true);
  };

  const handleAutoTopUpConfirm = async (data) => {
    try {
      // Set processing flag to prevent re-triggering
      setIsProcessingAutoTopUp(true);
      
      // Close the notification modal immediately
      setShowAutoTopUpNotification(false);
      setAutoTopUpNotificationData(null);
      
      // Call the backend API to top up the card
      const response = await fetch(`${API_BASE_URL}/api/cards/topup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          card_id: data.cardId, 
          amount: data.topUpAmount 
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to top up card');
      }
      
      // Update the card balance in the UI with proper parsing
      setCards(prevCards => prevCards.map(card => {
        if (card.id == data.cardId) {
          const currentBalance = parseFloat(card.balance || 0);
          const topUpAmount = parseFloat(data.topUpAmount);
          const newBalance = currentBalance + topUpAmount;
          console.log(`Updating card ${card.id}: ${currentBalance} + ${topUpAmount} = ${newBalance}`);
          return { ...card, balance: newBalance };
        }
        return card;
      }));
      
      // Refresh cards from backend to ensure we have the latest data
      const userId = getCurrentUser();
      if (userId) {
        try {
          const cardsResponse = await fetch(`${API_BASE_URL}/api/cards?user_id=${userId}`);
          if (cardsResponse.ok) {
            const cardsData = await cardsResponse.json();
            const updatedCardsData = Array.isArray(cardsData)
              ? cardsData.map(card => ({ ...card, balance: parseFloat(card.balance || 0) }))
              : [];
            console.log('Refreshed cards from backend:', updatedCardsData);
            setCards(updatedCardsData);
          }
        } catch (error) {
          console.error('Error refreshing cards:', error);
        }
        
        refreshTransactions(userId);
      }
      
      // Show success confirmation popup
      setSaveConfirmationMessage(`Auto top up successful! Card ending in ${data.cardNumber.slice(-4)} has been topped up with $${data.topUpAmount.toFixed(2)}.`);
      setShowSaveConfirmation(true);
      
      // Reset processing flag after a longer delay to ensure balance update is complete
      setTimeout(() => {
        setIsProcessingAutoTopUp(false);
      }, 3000);
    } catch (error) {
      console.error('Auto top up error:', error);
      alert('Auto top up failed: ' + error.message);
      // Reset processing flag on error
      setIsProcessingAutoTopUp(false);
    }
  };

  // Check for auto top up triggers whenever cards change
  useEffect(() => {
    if (autoTopUpSettings.length === 0 || isProcessingAutoTopUp) {
      console.log('Auto top up check skipped:', { 
        settingsLength: autoTopUpSettings.length, 
        isProcessing: isProcessingAutoTopUp 
      });
      return;
    }
    
    console.log('Auto top up check running with cards:', cards.map(c => ({ id: c.id, balance: c.balance })));
    
    autoTopUpSettings.forEach(setting => {
      if (!setting.isEnabled) {
        console.log('Setting disabled for card:', setting.cardId);
        return;
      }
      
      const card = cards.find(c => c.id == setting.cardId);
      if (!card) {
        console.log('Card not found for setting:', setting.cardId);
        return;
      }
      
      const currentBalance = parseFloat(card.balance || 0);
      const thresholdAmount = parseFloat(setting.thresholdAmount);
      
      console.log(`Checking card ${card.id}: balance=${currentBalance}, threshold=${thresholdAmount}`);
      
      if (currentBalance < thresholdAmount) {
        console.log(`Triggering auto top up for card ${card.id}: ${currentBalance} < ${thresholdAmount}`);
        // Show notification
        setAutoTopUpNotificationData({
          cardId: setting.cardId,
          cardNumber: setting.cardNumber,
          thresholdAmount: setting.thresholdAmount,
          topUpAmount: setting.topUpAmount,
          currentBalance: currentBalance
        });
        setShowAutoTopUpNotification(true);
      } else {
        console.log(`No auto top up needed for card ${card.id}: ${currentBalance} >= ${thresholdAmount}`);
      }
    });
  }, [cards, autoTopUpSettings, isProcessingAutoTopUp]);

  // Load auto top up settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('autoTopUpSettings');
    if (savedSettings) {
      try {
        setAutoTopUpSettings(JSON.parse(savedSettings));
      } catch (error) {
        console.error('Error loading auto top up settings:', error);
      }
    }
  }, []);

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
              onClick={() => {
                console.log('Voucher display clicked! userVouchers:', userVouchers);
                setShowVoucherModal(true);
              }}
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
        {/* Smart Shortcut Section */}
        <div style={{ margin: '1.2rem 0 1.5rem 0' }}>
          <div className={styles.quickActionsTitle}>Smart Shortcut</div>
          <div className={styles.quickActionsGrid}>
            <button onClick={() => setShowSendMoney(true)} className={styles.quickActionBtn}>
              <img src="/transfer.png" alt="Transfer" className={styles.quickActionIcon} />
              <span>Transfer</span>
          </button>
            <button onClick={() => setShowAutoTopUpModal(true)} className={styles.quickActionBtn}>
              <img src="/autotopup.png" alt="Auto Top Up" className={styles.quickActionIcon} />
              <span>Auto Top Up</span>
          </button>
            <button onClick={openSmartShortcutTopUp} className={styles.quickActionBtn}>
              <img src="/topup.png" alt="Top-up" className={styles.quickActionIcon} />
              <span>Top-up</span>
            </button>
            <button onClick={() => setShowSplitBillChoice(true)} className={styles.quickActionBtn}>
              <img src="/split.png" alt="Split Bill" className={styles.quickActionIcon} />
              <span>Split Bill</span>
          </button>
            <button onClick={() => {
              console.log('NFC Payment button clicked - opening modal');
              setShowNFCModal(true);
            }} className={styles.quickActionBtn}>
              <img src="/nfc.png" alt="NFC Payment" className={styles.quickActionIcon} />
              <span>NFC Payment</span>
            </button>
            <button onClick={() => setShowStatsModal(true)} className={styles.quickActionBtn}>
              <img src="/stats.png" alt="Stats" className={styles.quickActionIcon} />
              <span>Stats</span>
            </button>
          </div>
        </div>

        {/* Quick Send Section */}
        <div className={styles.quickSendSection}>
          <div className={styles.quickSendTitle}>Quick Send</div>
          <div className={styles.quickSendContainer}>

            
            {/* Profile Pictures */}
            <div className={styles.profilePictures}>
              <div className={styles.profileItem} onClick={() => openQuickSend({ name: 'Kartik', photo: Kartik })}>
                <img src={Kartik} alt="Kartik" className={styles.profilePhoto} />
                <span className={styles.profileName}>Kartik</span>
                </div>
              <div className={styles.profileItem} onClick={() => {
                console.log('Michael clicked!');
                openQuickSend({ name: 'Michael', photo: Michael });
              }}>
                <img src={Michael} alt="Michael" className={styles.profilePhoto} />
                <span className={styles.profileName}>Michael</span>
            </div>
              <div className={styles.profileItem} onClick={() => openQuickSend({ name: 'Miko', photo: Miko })}>
                <img src={Miko} alt="Miko" className={styles.profilePhoto} />
                <span className={styles.profileName}>Miko</span>
          </div>
              <div className={styles.profileItem} onClick={() => openQuickSend({ name: 'Sherlyn', photo: Sherlyn })}>
                <img src={Sherlyn} alt="Sherlyn" className={styles.profilePhoto} />
                <span className={styles.profileName}>Sherlyn</span>
        </div>
              <div className={styles.profileItem} onClick={() => openQuickSend({ name: 'Jack', photo: Jack })}>
                <img src={Jack} alt="Jack" className={styles.profilePhoto} />
                <span className={styles.profileName}>Jack</span>
            </div>
          </div>
            

          </div>
        </div>

        {/* Games Section */}
        <div className={styles.gamesSection}>
          <div className={styles.gamesHeader}>
            <div className={styles.gamesTitle}>Earn Eazygame Coin</div>
            <div className={styles.coinDisplay}>
              <span className={styles.coinIcon}>🪙</span>
              <span className={styles.coinText}>{userCoins}</span>
            </div>
          </div>
          <div className={styles.gamesGrid}>
            <button onClick={() => handleGameClick('candy-crush')} className={styles.gameBtn}>
              <img src={candyIcon} alt="Candy Crush" className={styles.gameIcon} />
              <span className={styles.gameName}>Candy Crush</span>
          </button>
            <button onClick={() => handleGameClick('pop-bubble')} className={styles.gameBtn}>
              <img src={bubbleIcon} alt="Pop Bubble" className={styles.gameIcon} />
              <span className={styles.gameName}>Pop Bubble</span>
          </button>
            <button onClick={() => handleGameClick('minesweeper')} className={styles.gameBtn}>
              <img src={minesweeperIcon} alt="Minesweeper" className={styles.gameIcon} />
              <span className={styles.gameName}>Minesweeper</span>
          </button>
            <button onClick={() => handleGameClick('google-snake')} className={styles.gameBtn}>
              <img src={snakeIcon} alt="Google Snake" className={styles.gameIcon} />
              <span className={styles.gameName}>Google Snake</span>
          </button>
          </div>
        </div>

        {/* Daily Check-in Section */}
        <div className={styles.checkInSection}>
          <div className={styles.checkInTitle}>Daily Check-in</div>
          <div className={styles.checkInGrid}>
            {[1, 2, 3, 4, 5, 6, 7].map((day) => {
              const isToday = day === 1;
              const isCompleted = checkInData.currentStreak >= day;
              const isSpecial = day === 7;
              const coinsReward = day === 7 ? 7 : day <= 2 ? 1 : day <= 4 ? 2 : day === 5 ? 3 : 5;
              
              return (
                <div 
                  key={day} 
                  className={`${styles.checkInCard} ${isToday ? styles.todayCard : ''} ${isCompleted ? styles.completedCard : ''} ${isSpecial && isCompleted ? styles.specialCard : ''}`}
                  onClick={() => {
                    if (isCompleted) {
                      // Show completed day info in modal
                      setClickedDay(day);
                      setShowCheckInModal(true);
                    } else if (isToday && !isCompleted) {
                      // Only allow check-in on Day 1, or if previous day is completed
                      if (day === 1 || checkInData.currentStreak >= day - 1) {
                        console.log(`Checking in for Day ${day}, current streak: ${checkInData.currentStreak}`);
                        handleCheckIn();
                      } else {
                        console.log(`Cannot check in Day ${day}, need to complete Day ${day - 1} first`);
                        setClickedDay(day);
                        setShowCheckInModal(true);
                      }
                    } else {
                      // Show info for future days in modal
                      setClickedDay(day);
                      setShowCheckInModal(true);
                    }
                  }}
                  style={{
                    cursor: 'pointer'
                  }}
                >
                  <div className={styles.coinReward}>+{coinsReward}</div>
                  <div className={styles.coinIcon}>
                    🪙
                  </div>
                  <div className={styles.dayLabel}>
                    {isToday ? 'Today' : `Day ${day}`}
                  </div>
                </div>
              );
            })}
          </div>
          <button 
            className={styles.checkInButton}
            onClick={() => {
              console.log('Check-in button clicked!'); // Debug log
              console.log('checkInData.lastCheckIn:', checkInData.lastCheckIn);
              console.log('Today:', new Date().toDateString());
              if (checkInData.lastCheckIn) {
                console.log('Last check-in date:', new Date(checkInData.lastCheckIn).toDateString());
              }
              
              // Always try to check in for now (for debugging)
              console.log('Performing check-in...');
              handleCheckIn();
            }}
            style={{
              position: 'relative',
              zIndex: 10
            }}
          >
            {checkInData.lastCheckIn && new Date(checkInData.lastCheckIn).toDateString() === new Date().toDateString() 
              ? 'Already checked in today!' 
              : 'Check in today to get 1 coin'
            }
          </button>
          

        </div>

        {/* Check-in Modal */}
        {console.log('Rendering check-in modal, open:', showCheckInModal)}
        <Modal open={showCheckInModal} onClose={() => {
          console.log('Closing check-in modal');
          setShowCheckInModal(false);
          setCheckInSuccess(false);
          setClickedDay(null);
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            padding: '1rem'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: '1rem',
              marginBottom: '1.5rem',
              borderBottom: '2px solid #e0e0f0'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <span style={{fontSize: '2rem'}}>🎯</span>
                <div style={{
                  fontWeight: 700,
                  fontSize: '1.3rem',
                  color: '#1f2937'
                }}>Daily Check-in Status</div>
              </div>
            </div>
            
            {/* Content */}
            <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
              {checkInSuccess ? (
                // Check-in successful
                <div style={{
                  textAlign: 'center',
                  padding: '2rem 1rem'
                }}>
                  <div style={{
                    fontSize: '4rem',
                    marginBottom: '1rem'
                  }}>🎉</div>
                  <div style={{
                    fontSize: '1.2rem',
                    fontWeight: 600,
                    color: '#059669',
                    marginBottom: '0.5rem'
                  }}>Check-in Successful!</div>
                  <div style={{
                    fontSize: '1rem',
                    color: '#6b7280',
                    marginBottom: '1.5rem'
                  }}>You earned 1 coin for today's check-in!</div>
                  <div style={{
                    background: '#f0fdf4',
                    border: '2px solid #bbf7d0',
                    borderRadius: 12,
                    padding: '1rem',
                    marginBottom: '1rem'
                  }}>
                    <div style={{
                      fontSize: '0.9rem',
                      color: '#059669',
                      fontWeight: 600
                    }}>Current Streak: {checkInData.currentStreak} days</div>
                    <div style={{
                      fontSize: '0.9rem',
                      color: '#059669'
                    }}>Total Check-ins: {checkInData.totalCheckIns}</div>
                  </div>
                  <div style={{
                    fontSize: '0.9rem',
                    color: '#6b7280'
                  }}>Come back tomorrow to continue your streak!</div>
                </div>
              ) : clickedDay && clickedDay > 1 && checkInData.currentStreak < clickedDay - 1 ? (
                // Cannot check in this day yet - show requirement
                <div style={{
                  textAlign: 'center',
                  padding: '2rem 1rem'
                }}>
                  <div style={{
                    fontSize: '4rem',
                    marginBottom: '1rem'
                  }}>🔒</div>
                  <div style={{
                    fontSize: '1.2rem',
                    fontWeight: 600,
                    color: '#dc2626',
                    marginBottom: '0.5rem'
                  }}>Day {clickedDay} Locked!</div>
                  <div style={{
                    fontSize: '1rem',
                    color: '#6b7280',
                    marginBottom: '1.5rem'
                  }}>You need to complete Day {clickedDay - 1} first to unlock Day {clickedDay}.</div>
                  <div style={{
                    background: '#fef2f2',
                    border: '2px solid #fecaca',
                    borderRadius: 12,
                    padding: '1rem',
                    marginBottom: '1rem'
                  }}>
                    <div style={{
                      fontSize: '0.9rem',
                      color: '#dc2626',
                      fontWeight: 600
                    }}>Current Streak: {checkInData.currentStreak} days</div>
                    <div style={{
                      fontSize: '0.9rem',
                      color: '#dc2626'
                    }}>Required: {clickedDay - 1} days</div>
                  </div>
                  <div style={{
                    fontSize: '0.9rem',
                    color: '#6b7280'
                  }}>Complete your daily check-ins in order to unlock higher rewards!</div>
                </div>
              ) : checkInData.lastCheckIn && new Date(checkInData.lastCheckIn).toDateString() === new Date().toDateString() ? (
                // Already checked in today - this should come BEFORE completed days check
                <div style={{
                  textAlign: 'center',
                  padding: '2rem 1rem'
                }}>
                  <div style={{
                    fontSize: '4rem',
                    marginBottom: '1rem'
                  }}>✅</div>
                  <div style={{
                    fontSize: '1.2rem',
                    fontWeight: 600,
                    color: '#059669',
                    marginBottom: '0.5rem'
                  }}>Already Checked In Today!</div>
                  <div style={{
                    fontSize: '1rem',
                    color: '#6b7280',
                    marginBottom: '1.5rem'
                  }}>You've already earned your daily coin reward.</div>
                  <div style={{
                    background: '#f0fdf4',
                    border: '2px solid #bbf7d0',
                    borderRadius: 12,
                    padding: '1rem',
                    marginBottom: '1rem'
                  }}>
                    <div style={{
                      fontSize: '0.9rem',
                      color: '#059669',
                      fontWeight: 600
                    }}>Current Streak: {checkInData.currentStreak} days</div>
                    <div style={{
                      fontSize: '0.9rem',
                      color: '#059669'
                    }}>Total Check-ins: {checkInData.totalCheckIns}</div>
                  </div>
                  <div style={{
                    fontSize: '0.9rem',
                    color: '#6b7280'
                  }}>Come back tomorrow for your next reward!</div>
                </div>
              ) : clickedDay && checkInData.currentStreak >= clickedDay ? (
                // Day completed - show completion info
                <div style={{
                  textAlign: 'center',
                  padding: '2rem 1rem'
                }}>
                  <div style={{
                    fontSize: '4rem',
                    marginBottom: '1rem'
                  }}>✅</div>
                  <div style={{
                    fontSize: '1.2rem',
                    fontWeight: 600,
                    color: '#059669',
                    marginBottom: '0.5rem'
                  }}>Day {clickedDay} Completed!</div>
                  <div style={{
                    fontSize: '1rem',
                    color: '#6b7280',
                    marginBottom: '1.5rem'
                  }}>Great job! You've completed Day {clickedDay} of your streak.</div>
                  <div style={{
                    background: '#f0fdf4',
                    border: '2px solid #bbf7d0',
                    borderRadius: 12,
                    padding: '1rem',
                    marginBottom: '1rem'
                  }}>
                    <div style={{
                      fontSize: '0.9rem',
                      color: '#059669',
                      fontWeight: 600
                    }}>Current Streak: {checkInData.currentStreak} days</div>
                    <div style={{
                      fontSize: '0.9rem',
                      color: '#059669'
                    }}>Total Check-ins: {checkInData.totalCheckIns}</div>
                  </div>
                  <div style={{
                    fontSize: '0.9rem',
                    color: '#6b7280'
                  }}>Keep up the good work!</div>
                </div>
              ) : (
                // Check if can check in today based on streak
                <div style={{
                  textAlign: 'center',
                  padding: '2rem 1rem'
                }}>
                  {checkInData.currentStreak === 0 ? (
                    // First time checking in
                    <>
                      <div style={{
                        fontSize: '4rem',
                        marginBottom: '1rem'
                      }}>🎯</div>
                      <div style={{
                        fontSize: '1.2rem',
                        fontWeight: 600,
                        color: '#1f2937',
                        marginBottom: '0.5rem'
                      }}>Start Your Daily Check-in Streak!</div>
                      <div style={{
                        fontSize: '1rem',
                        color: '#6b7280',
                        marginBottom: '1.5rem'
                      }}>Click the button below to earn your first daily coin reward.</div>
                      <div style={{
                        background: '#f0f9ff',
                        border: '2px solid #7dd3fc',
                        borderRadius: 12,
                        padding: '1rem',
                        marginBottom: '1.5rem'
                      }}>
                        <div style={{
                          fontSize: '0.9rem',
                          color: '#0369a1',
                          fontWeight: 600
                        }}>Current Streak: 0 days</div>
                        <div style={{
                          fontSize: '0.9rem',
                          color: '#0369a1'
                        }}>Total Check-ins: {checkInData.totalCheckIns}</div>
                      </div>
                      <button
                        onClick={() => {
                          handleCheckIn();
                          setShowCheckInModal(false);
                        }}
                        style={{
                          background: 'linear-gradient(135deg, #003da6 0%, #0052cc 100%)',
                          color: '#fff',
                          border: '2px solid #003da6',
                          borderRadius: 12,
                          padding: '1rem 2rem',
                          fontWeight: 700,
                          fontSize: '1rem',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          minWidth: '150px'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'linear-gradient(135deg, #002d7a 0%, #003da6 100%)';
                          e.target.style.borderColor = '#002d7a';
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = '0 8px 25px rgba(0, 61, 166, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'linear-gradient(135deg, #003da6 0%, #0052cc 100%)';
                          e.target.style.borderColor = '#003da6';
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = 'none';
                        }}
                      >
                        Start Check-in
                      </button>
                    </>
                  ) : (
                    // Continue streak
                    <>
                      <div style={{
                        fontSize: '4rem',
                        marginBottom: '1rem'
                      }}>🎯</div>
                      <div style={{
                        fontSize: '1.2rem',
                        fontWeight: 600,
                        color: '#1f2937',
                        marginBottom: '0.5rem'
                      }}>Continue Your Streak!</div>
                      <div style={{
                        fontSize: '1rem',
                        color: '#6b7280',
                        marginBottom: '1.5rem'
                      }}>Click the button below to continue your daily check-in streak.</div>
                      <div style={{
                        background: '#f0f9ff',
                        border: '2px solid #7dd3fc',
                        borderRadius: 12,
                        padding: '1rem',
                        marginBottom: '1.5rem'
                      }}>
                        <div style={{
                          fontSize: '0.9rem',
                          color: '#0369a1',
                          fontWeight: 600
                        }}>Current Streak: {checkInData.currentStreak} days</div>
                        <div style={{
                          fontSize: '0.9rem',
                          color: '#0369a1'
                        }}>Total Check-ins: {checkInData.totalCheckIns}</div>
                      </div>
                      <button
                        onClick={() => {
                          handleCheckIn();
                          setShowCheckInModal(false);
                        }}
                        style={{
                          background: 'linear-gradient(135deg, #003da6 0%, #0052cc 100%)',
                          color: '#fff',
                          border: '2px solid #003da6',
                          borderRadius: 12,
                          padding: '1rem 2rem',
                          fontWeight: 700,
                          fontSize: '1rem',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          minWidth: '150px'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'linear-gradient(135deg, #002d7a 0%, #003da6 100%)';
                          e.target.style.borderColor = '#002d7a';
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = '0 8px 25px rgba(0, 61, 166, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'linear-gradient(135deg, #003da6 0%, #0052cc 100%)';
                          e.target.style.borderColor = '#003da6';
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = 'none';
                        }}
                      >
                        Check In Now
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div style={{
              paddingTop: '1rem',
              borderTop: '2px solid #e0e0f0',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <button 
                onClick={() => setShowCheckInModal(false)}
                style={{
                  background: 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)',
                  color: '#fff',
                  border: '2px solid #6b7280',
                  borderRadius: 12,
                  padding: '0.8rem 2rem',
                  fontWeight: 700,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  minWidth: '120px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'linear-gradient(135deg, #4b5563 0%, #6b7280 100%)';
                  e.target.style.borderColor = '#4b5563';
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 8px 25px rgba(107, 114, 128, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)';
                  e.target.style.borderColor = '#6b7280';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                Close
              </button>
            </div>
          </div>
        </Modal>

        {/* Your Cards */}
        <section className={styles.cardsSection}>
          <div className={styles.cardsTitle}>NETS Prepaid</div>
          <div className={styles.cardList}>
            {Array.isArray(sortedCards) && sortedCards.map(card => {
              const digits = (card.number || '').replace(/\D/g, '');
              const masked = digits.length >= 4
                ? '**** **** **** ' + digits.slice(-4)
                : card.number;
              
              // Get card design image
              const getCardDesignImage = (design) => {
                switch (design) {
                  case 'netscard1': return netscard1;
                  case 'netscard2': return netscard2;
                  case 'netscard3': return netscard3;
                  case 'netscard4': return netscard4;
                  default: return netscard1;
                }
              };
              
                              return (
                  <div className={styles.cardPrimary} key={card.id}>
                  <div style={{display: 'flex', flexDirection: 'column', padding: '1rem 1.3rem'}}>
                    <div className={styles.cardDesignBackground}>
                      <img 
                        src={getCardDesignImage(card.design || 'netscard1')} 
                        alt="Card Design" 
                        className={styles.cardDesignImage}
                      />
                      <div className={styles.cardOverlay}>
                        <div className={styles.cardNumberOverlay}>{masked}</div>
                      </div>
                    </div>
                      <div className={styles.cardContent}>
                        <div className={styles.cardBalanceLabel}>Current Balance</div>
                        <div className={styles.cardBalance}>${Number(card.balance ?? 0).toFixed(2)}</div>
                        </div>
                      </div>
                  <div className={styles.cardButtons}>
                    <button className={styles.cardTopUpBtn} onClick={() => openSmartShortcutTopUp()}>Top Up</button>
                    <button className={styles.deleteCardBtn} onClick={() => handleDeleteCard(card.id)}>Delete</button>
                    </div>
                  </div>
                );
            })}
          </div>
          {isSignedIn && (
            <button className={styles.addCardBtn} onClick={() => setShowAddCard(true)}>＋ Add New Card</button>
          )}
        </section>

        {/* Recent Transactions */}
        <section className={styles.transactionsSection}>
          <div className={styles.transactionsTitle}>Recent Transactions</div>
          <ul className={styles.transactionsList}>
            {sortedTransactions.slice(0, 5).length === 0 && (
              <li className={styles.transaction} style={{justifyContent:'center',color:'#bbb'}}>No transactions yet.</li>
            )}
            {sortedTransactions.slice(0, 5).map(txn => {
              const card = cards.find(c => c.id === txn.card_id);
              let paymentMethod = 'Unknown';
              
              if (txn.card_id) {
                // Card-based transaction
                const digits = card && card.number ? card.number.replace(/\D/g, '') : '';
                paymentMethod = digits.length >= 4
                  ? '**** **** **** ' + digits.slice(-4)
                  : card && card.number ? card.number : 'Unknown';
              } else {
                // External payment method (eNETS, NETS QR)
                if (txn.name.includes('(ENETS)')) {
                  paymentMethod = 'eNETS Payment';
                } else if (txn.name.includes('(NETS QR)')) {
                  paymentMethod = 'NETS QR Payment';
                } else {
                  paymentMethod = 'External Payment';
                }
              }
              
              return (
                <li className={styles.transaction} key={txn.id + '-' + (txn.card_id || 'external')}>
                  <span className={styles.txnIcon + ' ' + (txn.type === 'income' ? styles.income : styles.expense)}>
                    {txn.type === 'income' ? '⬆️' : '⬇️'}
                  </span>
                  <div className={styles.txnDetails}>
                    <div className={styles.txnName}>{txn.name}</div>
                    <div className={styles.txnTime}>{new Date(txn.time).toLocaleString()}</div>
                    <div className={styles.cardNumber} style={{fontSize:'0.85rem',color:'#888'}}>
                      {txn.card_id ? `Card: ${paymentMethod}` : paymentMethod}
                    </div>
                  </div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <div className={styles.txnAmount + ' ' + (txn.type === 'income' ? styles.income : styles.expense)}>
                      {txn.type === 'income' ? '+' : ''}${Math.abs(txn.amount).toFixed(2)}
                    </div>
                    {/* Split button for food transactions */}
                    {txn.type === 'expense' && (
                      txn.name.includes('Food') || 
                      txn.name.includes('cafe') || 
                      txn.name.includes('restaurant') || 
                      txn.name.includes('Burger') || 
                      txn.name.includes('Coffee') ||
                      txn.name.includes('Kitchen') ||
                      txn.name.includes('Chefs') ||
                      txn.name.includes('(ENETS)') ||
                      txn.name.includes('(NETS QR)') ||
                      txn.name.includes('(Prepaid Card)')
                    ) && (
                      <button 
                        onClick={() => handleSplitBill(txn)}
                        style={{
                          background: '#003da6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '4px 8px',
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                          fontWeight: '600',
                          minWidth: '40px'
                        }}
                        title="Split this bill with friends"
                      >
                        Split
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {!isSignedIn && (
          <div style={{padding:'1rem',textAlign:'center',color:'#888',fontSize:'0.9rem',marginTop:'1rem'}}>
            Demo mode - <button style={{color:'var(--primary)',background:'none',border:'none',fontWeight:600,cursor:'pointer'}} onClick={onProfileClick}>sign in</button> for real data
          </div>
        )}
      </div>

      <CardFormModal
        open={showAddCard}
        onClose={() => setShowAddCard(false)}
        onSubmit={handleAddCard}
        isEdit={false}
      />



      {/* Card Selection Modal for Smart Shortcut Top Up */}
      <Modal open={showCardSelectionModal} onClose={closeCardSelectionModal}>
        {/* Header */}
        <div style={{
          display:'flex',
          justifyContent:'space-between',
          alignItems:'center',
          paddingBottom:'1rem',
          marginBottom:'1.5rem',
          borderBottom:'2px solid #e0e0f0'
        }}>
          <div style={{
            display:'flex',
            alignItems:'center',
            gap:'1rem'
          }}>
            <span style={{fontSize:'2rem'}}>💳</span>
            <div style={{
              fontWeight:700,
              fontSize:'1.3rem',
              color:'#1f2937'
            }}>Select Card to Top Up</div>
          </div>
        </div>
        
        <div style={{display:'flex',flexDirection:'column',gap:'1rem',marginBottom:'1.5rem'}}>
          {cards.map(card => {
            const masked = card.number.replace(/\d(?=\d{4})/g, '*');
            return (
              <div
                key={card.id}
                style={{
                  display:'flex',
                  justifyContent:'space-between',
                  alignItems:'center',
                  padding:'1.2rem 1.5rem',
                  border:'2px solid #e5e7eb',
                  borderRadius:16,
                  background:'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
                  fontSize:'0.95rem',
                  transition:'all 0.3s ease',
                  position:'relative',
                  overflow:'hidden'
                }}
              >
                {/* Blue top border */}
                <div style={{
                  position:'absolute',
                  top:0,
                  left:0,
                  right:0,
                  height:'3px',
                  background:'linear-gradient(90deg, #003da6 0%, #0052cc 50%, #0066ff 100%)'
                }} />
                
                <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
                  <span style={{
                    fontWeight:600,
                    fontSize:'1rem',
                    color:'#1f2937',
                    fontFamily:'Courier New, monospace',
                    letterSpacing:'1px'
                  }}>Card ending in {card.number.slice(-4)}</span>
                  <span style={{
                    color:'#374151',
                    fontSize:'0.9rem',
                    fontWeight:500
                  }}>Balance: <span style={{color:'#003da6',fontWeight:700}}>${Number(card.balance || 0).toFixed(2)}</span></span>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:'0.8rem',alignItems:'flex-end'}}>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="Amount"
                    value={topUpCardId === card.id ? topUpAmount : ''}
                    onChange={(e) => {
                      if (e.target.value === '' || parseFloat(e.target.value) > 0) {
                        setTopUpCardId(card.id);
                        setTopUpAmount(e.target.value);
                      }
                    }}
                    style={{
                      width:'80px',
                      padding:'0.6rem 0.6rem',
                      borderRadius:12,
                      border:'2px solid #e5e7eb',
                      fontSize:'0.85rem',
                      textAlign:'right',
                      fontWeight:600,
                      color:'#1f2937',
                      background:'white',
                      transition:'all 0.3s ease',
                      outline:'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#003da6'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  />
                  <button
                    onClick={() => {
                      if (topUpCardId === card.id && topUpAmount && parseFloat(topUpAmount) > 0) {
                        handleTopUpConfirmation();
                        } else {
                        alert('Please enter a valid amount first');
                      }
                    }}
                    style={{
                      background: topUpCardId === card.id && topUpAmount && parseFloat(topUpAmount) > 0 
                        ? 'linear-gradient(135deg, #003da6 0%, #0052cc 100%)' 
                        : '#f8f9fa',
                      color: topUpCardId === card.id && topUpAmount && parseFloat(topUpAmount) > 0 ? '#fff' : '#666',
                      border:'2px solid',
                      borderColor: topUpCardId === card.id && topUpAmount && parseFloat(topUpAmount) > 0 ? '#003da6' : '#e0e0f0',
                      borderRadius:12,
                      padding:'0.6rem 0.8rem',
                      fontWeight:700,
                      fontSize:'0.8rem',
                      cursor: topUpCardId === card.id && topUpAmount && parseFloat(topUpAmount) > 0 ? 'pointer' : 'not-allowed',
                      transition:'all 0.3s ease',
                      textTransform:'uppercase',
                      letterSpacing:'0.3px',
                      minWidth:'90px',
                      whiteSpace:'nowrap',
                      display:'flex',
                      alignItems:'center',
                      justifyContent:'center',
                      gap:'4px'
                    }}
                  >
                    💰 Top Up
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Footer with Cancel Button */}
        <div style={{
          paddingTop:'1rem',
          borderTop:'2px solid #e0e0f0',
          display:'flex',
          justifyContent:'center'
        }}>
          <button 
            onClick={closeCardSelectionModal}
            style={{
              background:'linear-gradient(135deg, #003da6 0%, #0052cc 100%)',
              color:'#fff',
              border:'2px solid #003da6',
              borderRadius:12,
              padding:'0.8rem 2rem',
              fontWeight:700,
              fontSize:'1rem',
              cursor:'pointer',
              transition:'all 0.3s ease',
              textTransform:'uppercase',
              letterSpacing:'0.5px',
              minWidth:'120px',
              position:'relative',
              overflow:'hidden'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'linear-gradient(135deg, #002d7a 0%, #003da6 100%)';
              e.target.style.borderColor = '#002d7a';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 8px 25px rgba(0, 61, 166, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'linear-gradient(135deg, #003da6 0%, #0052cc 100%)';
              e.target.style.borderColor = '#003da6';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            Cancel
          </button>
        </div>
      </Modal>

      {/* Top Up Confirmation Modal */}
      <Modal open={showTopUpConfirmation} onClose={() => setShowTopUpConfirmation(false)}>
        <div style={{display:'flex',flexDirection:'column',gap:'1rem',padding:'1.5rem',minWidth:300}}>
          <div style={{fontWeight:600,fontSize:'1.2rem',textAlign:'center'}}>Confirm Top Up</div>
          {topUpPaymentData && (
            <>
              <div style={{display:'flex',flexDirection:'column',gap:'0.5rem',padding:'1rem',background:'#f8f9fa',borderRadius:8}}>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <span>Card:</span>
                  <span style={{fontWeight:500}}>ending in {topUpPaymentData.card.number.slice(-4)}</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <span>Amount:</span>
                  <span style={{fontWeight:500,color:'#003da6'}}>SGD ${topUpPaymentData.amount.toFixed(2)}</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <span>Current Balance:</span>
                  <span style={{fontWeight:500}}>SGD ${Number(topUpPaymentData.card.balance || 0).toFixed(2)}</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <span>New Balance:</span>
                  <span style={{fontWeight:500,color:'#28a745'}}>SGD ${(Number(topUpPaymentData.card.balance || 0) + topUpPaymentData.amount).toFixed(2)}</span>
                </div>
              </div>
              <div style={{fontSize:'0.9rem',color:'#666',textAlign:'center'}}>
                You will be redirected to the payment gateway to complete this top-up.
              </div>
            </>
          )}
          <div style={{display:'flex',gap:'1rem',marginTop:'0.5rem'}}>
            <button 
              onClick={() => setShowTopUpConfirmation(false)}
              style={{
                flex:1,
                background:'#f8f9fa',
                color:'#666',
                border:'1.5px solid #e0e0f0',
                borderRadius:8,
                padding:'0.8rem 1rem',
                fontWeight:600,
                fontSize:'1rem',
                cursor:'pointer'
              }}
            >
              Cancel
            </button>
            <button 
              onClick={confirmTopUp}
              style={{
                flex:1,
                background:'#003da6',
                color:'#fff',
                border:'none',
                borderRadius:8,
                padding:'0.8rem 1rem',
                fontWeight:600,
                fontSize:'1rem',
                cursor:'pointer'
              }}
            >
              Confirm & Pay
            </button>
            
            {/* Result Message */}
            {splitBillResult && (
              <div style={{
                padding: '12px 16px',
                borderRadius: '12px',
                marginTop: '16px',
                fontSize: '14px',
                fontWeight: '500',
                textAlign: 'center',
                background: splitBillResult.success 
                  ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)'
                  : 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                color: splitBillResult.success ? '#065f46' : '#991b1b',
                border: `2px solid ${splitBillResult.success ? '#10b981' : '#ef4444'}`,
                position: 'relative'
              }}>
                {splitBillResult.success ? '✅ ' : '❌ '}
                {splitBillResult.msg}
                {splitBillResult.success && (
                  <button
                    onClick={() => setShowTransactionSplitModal(false)}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: 'rgba(16, 185, 129, 0.2)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      color: '#065f46',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Top Up Payment Gateway */}
      <PaymentGateway
        open={showTopUpPaymentGateway}
        onClose={() => setShowTopUpPaymentGateway(false)}
        amount={topUpPaymentData?.amount || 0}
        items={topUpPaymentData ? [{
          name: `Top Up - Card ending in ${topUpPaymentData.card.number.slice(-4)}`,
          price: topUpPaymentData.amount,
          image: topUpPaymentData.card.image || netscard1
        }] : []}
        onPaymentSuccess={handleTopUpPaymentSuccess}
        onPaymentFailure={handleTopUpPaymentFailure}
        userVouchers={userVouchers}
        onVoucherUse={handleVoucherUse}
        cards={cards}
      />

      <SendMoneyModal
        open={showSendMoney}
        onClose={() => setShowSendMoney(false)}
        cards={cards}
        onSend={handleSendMoney}
      />

      <PaymentGame
        open={showPaymentGame}
        onClose={() => setShowPaymentGame(false)}
        recipient={paymentData?.recipient}
        card={paymentData?.card}
        amount={paymentData?.amount}
        onPaymentComplete={handlePaymentComplete}
      />

      <SplitBillChoiceModal open={showSplitBillChoice} onClose={() => setShowSplitBillChoice(false)} setShowSplitBillQR={setShowSplitBillQR} setShowSplitBill={setShowSplitBill} setSplitBillAmount={setSplitBillAmount} />
      <QrScanModal
        open={showSplitBillQR}
        onClose={() => setShowSplitBillQR(false)}
        onScanSuccess={amount => {
          setSplitBillAmount(amount);
          setShowSplitBillQR(false);
          setShowSplitBill(true);
        }}
      />
      <SplitBillModal open={showSplitBill} onClose={() => setShowSplitBill(false)} payer={user?.username || 'User'} payerEmail={user?.email || 'noemail@example.com'} cards={cards} setCards={setCards} setTransactions={setTransactions} amount={splitBillAmount} />

      <BalanceDetailsModal 
        open={showBalanceDetailsModal} 
        onClose={() => setShowBalanceDetailsModal(false)} 
        cards={cards}
      />
      
      {/* Transaction Split Modal - For splitting existing food transactions */}
      <Modal key="transaction-split-modal" open={showTransactionSplitModal} onClose={() => {
        setShowTransactionSplitModal(false);
        setSelectedFriendsForSplit([]);
        setSplitBillResult(null);
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          minWidth: '400px',
          maxWidth: '500px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          position: 'relative',
          zIndex: 1001
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '2px solid #e0e0f0'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                background: '#003da6',
                color: 'white',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>
                💰
              </div>
              <div style={{
                fontWeight: '700',
                fontSize: '1.4rem',
                color: '#1f2937'
              }}>
                Split Transaction Bill
              </div>
            </div>
            <button
              onClick={() => setShowTransactionSplitModal(false)}
              style={{
                background: '#f3f4f6',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '16px',
                color: '#6b7280'
              }}
            >
              ✕
            </button>
          </div>

          {/* Transaction Details */}
          {selectedTransactionForSplit && (
            <div style={{
              background: '#f8f9ff',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: '1px solid #e0e0f0'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <span style={{ fontWeight: '600', color: '#374151' }}>Transaction:</span>
                <span style={{ fontWeight: '700', color: '#1f2937' }}>{selectedTransactionForSplit.name}</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <span style={{ fontWeight: '600', color: '#374151' }}>Total Amount:</span>
                <span style={{ fontWeight: '700', color: '#dc2626', fontSize: '1.2rem' }}>
                  ${Math.abs(selectedTransactionForSplit.amount).toFixed(2)}
                </span>
              </div>
              <div style={{
                fontSize: '0.9rem',
                color: '#6b7280',
                fontStyle: 'italic'
              }}>
                💡 This transaction has already been paid. Select friends to send payment requests for their share.
              </div>
            </div>
          )}



          {/* Friends Selection */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              fontWeight: '600',
              fontSize: '1rem',
              color: '#1f2937',
              marginBottom: '12px'
            }}>
              Select Friends to Split With:
            </div>
            <div style={{
              maxHeight: '200px',
              overflowY: 'auto',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px'
            }}>
              {FRIENDS_LIST.map((friend, index) => {
                const identifier = friend.type === 'whatsapp' ? friend.phone : friend.email;
                const isSelected = selectedFriendsForSplit.some(f => (f.type === 'whatsapp' ? f.phone : f.email) === identifier);
                return (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      borderBottom: index < FRIENDS_LIST.length - 1 ? '1px solid #f3f4f6' : 'none',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      transition: 'background-color 0.2s',
                      background: isSelected ? '#f0f4ff' : 'transparent',
                      border: isSelected ? '2px solid #003da6' : 'none'
                    }}
                    onClick={() => {
                      const identifier = friend.type === 'whatsapp' ? friend.phone : friend.email;
                      setSelectedFriendsForSplit(prev => {
                        const newSelection = prev.some(f => (f.type === 'whatsapp' ? f.phone : f.email) === identifier)
                          ? prev.filter(f => (f.type === 'whatsapp' ? f.phone : f.email) !== identifier)
                          : [...prev, friend];
                        return newSelection;
                      });
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.target.style.backgroundColor = '#f9fafb';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.target.style.backgroundColor = isSelected ? '#f0f4ff' : 'transparent';
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      id={`friend-${index}`}
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        const identifier = friend.type === 'whatsapp' ? friend.phone : friend.email;
                        setSelectedFriendsForSplit(prev => {
                          const newSelection = prev.some(f => (f.type === 'whatsapp' ? f.phone : f.email) === identifier)
                            ? prev.filter(f => (f.type === 'whatsapp' ? f.phone : f.email) !== identifier)
                            : [...prev, friend];
                          return newSelection;
                        });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        marginRight: '12px',
                        transform: 'scale(1.2)',
                        accentColor: '#003da6'
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', color: '#1f2937' }}>{friend.name}</div>
                      <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                        {friend.type === 'whatsapp' ? friend.phone : friend.email}
                      </div>
                    </div>
                    <span style={{
                      background: friend.type === 'whatsapp' ? '#25D366' : '#003da6',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      {friend.type === 'whatsapp' ? 'WHATSAPP' : 'EMAIL'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Split Calculation */}
          <div style={{
            background: '#f0f4ff',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px',
            border: '1px solid #dbeafe'
          }}>
            <div style={{
              fontWeight: '600',
              color: '#1e40af',
              marginBottom: '8px'
            }}>
              Split Calculation:
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.9rem',
              marginBottom: '4px'
            }}>
              <span>Total Amount:</span>
              <span style={{ fontWeight: '600' }}>
                ${selectedTransactionForSplit ? Math.abs(selectedTransactionForSplit.amount).toFixed(2) : '0.00'}
              </span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.9rem',
              marginBottom: '4px'
            }}>
              <span>People Splitting:</span>
              <span style={{ fontWeight: '600' }}>
                {selectedFriendsForSplit.length + 1}
              </span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.9rem',
              fontWeight: '700',
              color: '#1e40af'
            }}>
              <span>Amount per Person:</span>
              <span>
                ${(() => {
                  const totalPeople = selectedFriendsForSplit.length + 1;
                  const totalAmount = selectedTransactionForSplit ? Math.abs(selectedTransactionForSplit.amount) : 0;
                  const amountPerPerson = totalPeople > 0 ? (totalAmount / totalPeople) : 0;
                  return amountPerPerson.toFixed(2);
                })()}
              </span>
            </div>
          </div>

          {/* Send Split Bill Button */}
          <button
            onClick={async () => {
              if (selectedFriendsForSplit.length === 0) {
                alert('Please select at least one friend to split the bill with.');
                return;
              }
              
              setSendingSplitBill(true);
              setSplitBillResult(null);
              
              // Calculate split amount
              const totalPeople = selectedFriendsForSplit.length + 1;
              const totalAmount = selectedTransactionForSplit ? Math.abs(selectedTransactionForSplit.amount) : 0;
              const splitAmount = totalAmount / totalPeople;
              
              try {
                // Call the new API endpoint for existing transactions (no payment required)
                // This will generate and send QR codes to friends without deducting money
                const res = await fetch(`${API_BASE_URL}/api/split-bill/existing`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    payer: user?.username || 'User',
                    payerEmail: user?.email || 'noemail@example.com',
                    amount: totalAmount,
                    friends: selectedFriendsForSplit,
                    message: `Split bill for ${selectedTransactionForSplit?.name || 'transaction'}`
                  })
                });
                
                const data = await res.json();
                if (res.ok) {
                  const emailFriends = selectedFriendsForSplit.filter(f => f.type === 'email');
                  const whatsappFriends = selectedFriendsForSplit.filter(f => f.type === 'whatsapp');
                  let successMsg = '';
                  if (emailFriends.length > 0) {
                    successMsg += `Split bill QR codes sent to ${emailFriends.length} friend(s) via email! `;
                  }
                  if (whatsappFriends.length > 0) {
                    successMsg += `WhatsApp messages sent to ${whatsappFriends.length} friend(s)!`;
                  }
                  if (emailFriends.length === 0 && whatsappFriends.length === 0) {
                    successMsg = 'Split bill processed successfully!';
                  }
                  
                  setSplitBillResult({ success: true, msg: successMsg });
                  setSelectedFriendsForSplit([]);
                  
                  // Refresh cards and transactions to show the updated state
                  const userId = getCurrentUser();
                  if (userId) {
                    fetch(`${API_BASE_URL}/api/cards?user_id=${userId}`)
                      .then(res => res.json())
                      .then(data => {
                        const cardData = Array.isArray(data)
                          ? data.map(card => ({ ...card, balance: Number(card.balance) }))
                          : [];
                        setCards(cardData);
                      });
                    fetch(`${API_BASE_URL}/api/transactions?user_id=${userId}`)
                      .then(res => res.json())
                      .then(data => setTransactions(data));
                  }
                } else {
                  setSplitBillResult({ success: false, msg: data.error || 'Failed to create split bill.' });
                }
              } catch (err) {
                setSplitBillResult({ success: false, msg: err.message });
              } finally {
                setSendingSplitBill(false);
              }
            }}
            disabled={sendingSplitBill || selectedFriendsForSplit.length === 0}
            style={{
              width: '100%',
              background: (sendingSplitBill || selectedFriendsForSplit.length === 0) ? '#9ca3af' : '#003da6',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '1.1rem',
              fontWeight: '600',
              cursor: (sendingSplitBill || selectedFriendsForSplit.length === 0) ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              if (selectedFriendsForSplit.length > 0) {
                e.target.style.background = '#002d7a';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedFriendsForSplit.length > 0) {
                e.target.style.background = '#003da6';
              } else {
                e.target.style.background = '#9ca3af';
              }
            }}
          >
            {sendingSplitBill ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Processing...
              </span>
            ) : (
              '📱 GENERATE NETS QR FOR FRIENDS'
            )}
          </button>
          
          {/* Result Message */}
          {splitBillResult && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '12px',
              marginTop: '16px',
              fontSize: '14px',
              fontWeight: '500',
              textAlign: 'center',
              background: splitBillResult.success 
                ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)'
                : 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
              color: splitBillResult.success ? '#065f46' : '#991b1b',
              border: `2px solid ${splitBillResult.success ? '#10b981' : '#ef4444'}`,
              position: 'relative'
            }}>
              {splitBillResult.success ? '✅ ' : '❌ '}
              {splitBillResult.msg}
              {splitBillResult.success && (
                <button
                  onClick={() => setShowTransactionSplitModal(false)}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'rgba(16, 185, 129, 0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    color: '#065f46',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>
      </Modal>
      
      <TransactionsModal
        open={showTransactionsModal}
        onClose={() => setShowTransactionsModal(false)}
        transactions={sortedTransactions}
        cards={cards}
      />

        {/* Game Modal */}
        {showGame && (
          <Modal open={showGame} onClose={handleGameClose}>
            <GameContainer 
              onGameComplete={handleGameComplete}
              userCoins={userCoins}
              onGameScoreUpdate={() => {}}
              initialGame={currentGame}
              onVoucherExchange={handleVoucherExchange}
            />
          </Modal>
        )}

                  {/* Quick Send Modal */}
          <Modal open={showQuickSendModal} onClose={closeQuickSendModal}>
            <div 
              onClick={e => e.stopPropagation()}
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 50%, #fff5f5 100%)',
                borderRadius: '20px',
                padding: '2rem',
                minWidth: '350px',
                maxWidth: '400px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                border: '2px solid #e5e7eb',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Background Pattern */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(239, 68, 68, 0.1) 0%, transparent 50%)',
                pointerEvents: 'none'
              }} />
              
              {/* Close Button */}
              <button 
                onClick={closeQuickSendModal}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: '#f3f4f6',
                  border: '1px solid #e5e7eb',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  color: '#6b7280',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#ef4444';
                  e.target.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#f3f4f6';
                  e.target.style.color = '#6b7280';
                }}
              >
                ✕
              </button>
            
            <form onSubmit={handleQuickSendSubmit} style={{position: 'relative', zIndex: 5}}>
                             {/* Title */}
               <div style={{
                 textAlign: 'center',
                 marginBottom: '1.5rem'
               }}>
                 <div style={{
                   fontSize: '1.5rem',
                   fontWeight: '700',
                   color: '#1f2937',
                   marginBottom: '0.5rem'
                 }}>
                   🚀 Quick Send
                 </div>
                 <div style={{
                   fontSize: '1.1rem',
                   color: '#6b7280',
                   fontWeight: '500'
                 }}>
                   to {selectedRecipient?.name}
                 </div>
               </div>
              
                             {/* Recipient Card */}
               <div style={{
                 background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                 borderRadius: '16px',
                 padding: '1.2rem',
                 marginBottom: '1.5rem',
                 border: '1px solid #e5e7eb',
                 display: 'flex',
                 alignItems: 'center',
                 gap: '1rem',
                 boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)'
               }}>
                <div style={{
                  position: 'relative'
                }}>
                  <img 
                    src={selectedRecipient?.photo} 
                    alt={selectedRecipient?.name} 
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '3px solid rgba(255,255,255,0.3)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                    }} 
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: '-2px',
                    right: '-2px',
                    background: '#4CAF50',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    color: 'white',
                    border: '2px solid white'
                  }}>
                    ✓
                  </div>
                </div>
                <div>
                  <div style={{
                    fontSize: '1.2rem',
                    fontWeight: '600',
                    color: 'white',
                    marginBottom: '0.2rem'
                  }}>
                    {selectedRecipient?.name}
                  </div>
                  <div style={{
                    fontSize: '0.9rem',
                    color: 'rgba(255,255,255,0.8)'
                  }}>
                    Ready to receive payment
                  </div>
                </div>
              </div>
              
                             {/* Amount Input */}
               <div style={{marginBottom: '1.5rem'}}>
                 <label style={{
                   display: 'block',
                   fontSize: '0.9rem',
                   fontWeight: '600',
                   color: '#374151',
                   marginBottom: '0.5rem'
                 }}>
                   💰 Amount to Send
                 </label>
                 <input
                   type="number"
                   min="1"
                   step="0.01"
                   value={quickSendAmount}
                   onChange={e => setQuickSendAmount(e.target.value)}
                   placeholder="Enter amount"
                   style={{
                     width: '100%',
                     padding: '1rem',
                     borderRadius: '12px',
                     border: '2px solid #e5e7eb',
                     fontSize: '1.1rem',
                     background: 'white',
                     color: '#1f2937',
                     outline: 'none',
                     transition: 'all 0.3s ease'
                   }}
                   onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                   onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                   required
                 />
               </div>
              
                              {/* Card Selection */}
                <div style={{marginBottom: '1.5rem'}}>
                  {console.log('Current quickSendCardId:', quickSendCardId)}
                  <label style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.8rem'
                  }}>
                    💳 Select Payment Card (Current: {quickSendCardId})
                  </label>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.8rem'
                }}>
                  {cards.map(card => (
                                         <label 
                       key={card.id} 
                       style={{
                         display: 'flex',
                         alignItems: 'center',
                         gap: '0.8rem',
                         cursor: 'pointer',
                         padding: '0.8rem',
                         borderRadius: '12px',
                         background: quickSendCardId == card.id ? '#eff6ff' : '#f9fafb',
                         border: quickSendCardId == card.id ? '2px solid #3b82f6' : '2px solid #e5e7eb',
                         transition: 'all 0.3s ease'
                       }}
                       onMouseEnter={(e) => {
                         if (quickSendCardId != card.id) {
                           e.target.style.background = '#f0f9ff';
                           e.target.style.borderColor = '#93c5fd';
                         }
                       }}
                       onMouseLeave={(e) => {
                         if (quickSendCardId != card.id) {
                           e.target.style.background = '#f9fafb';
                           e.target.style.borderColor = '#e5e7eb';
                         }
                       }}
                     >
                                             <input
                         type="radio"
                         name="quickSendCard"
                         value={card.id}
                         checked={quickSendCardId == card.id}
                         onChange={e => {
                           console.log('Card selected:', e.target.value);
                           setQuickSendCardId(Number(e.target.value));
                         }}
                         style={{
                           margin: 0,
                           width: '18px',
                           height: '18px',
                           accentColor: '#4CAF50'
                         }}
                       />
                                             <div style={{flex: 1}}>
                         <div style={{
                           fontSize: '1rem',
                           fontWeight: '600',
                           color: '#1f2937',
                           marginBottom: '0.2rem'
                         }}>
                           Card ending in {card.number.slice(-4)}
                         </div>
                         <div style={{
                           fontSize: '0.9rem',
                           color: '#6b7280'
                         }}>
                           Balance: ${Number(card.balance || 0).toFixed(2)}
                         </div>
                       </div>
                                             {quickSendCardId == card.id && (
                         <div style={{
                           color: '#3b82f6',
                           fontSize: '1.2rem',
                           fontWeight: 'bold'
                         }}>
                           ✓
                         </div>
                       )}
                    </label>
                  ))}
                </div>
              </div>
              
                             {/* Send Button */}
               <button 
                 type="submit" 
                 style={{
                   width: '100%',
                   padding: '1.2rem',
                   borderRadius: '16px',
                   border: 'none',
                   background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                   color: 'white',
                   fontSize: '1.2rem',
                   fontWeight: '700',
                   cursor: 'pointer',
                   transition: 'all 0.3s ease',
                   boxShadow: '0 8px 20px rgba(239, 68, 68, 0.3)',
                   textTransform: 'uppercase',
                   letterSpacing: '0.5px'
                 }}
                 onMouseEnter={(e) => {
                   e.target.style.transform = 'translateY(-2px)';
                   e.target.style.boxShadow = '0 12px 25px rgba(239, 68, 68, 0.4)';
                 }}
                 onMouseLeave={(e) => {
                   e.target.style.transform = 'translateY(0)';
                   e.target.style.boxShadow = '0 8px 20px rgba(239, 68, 68, 0.3)';
                 }}
               >
                 🚀 Send Payment
      </button>
            </form>
          </div>
        </Modal>

        {/* Avatar Payment Game Modal */}
        {showAvatarPaymentGame && (
          <AvatarPaymentGame
            open={showAvatarPaymentGame}
            onClose={() => setShowAvatarPaymentGame(false)}
            recipient={selectedRecipient}
            card={cards.find(card => card.id === quickSendCardId)}
            amount={parseFloat(quickSendAmount)}
            onPaymentComplete={handleAvatarPaymentComplete}
            isQuickSend={true}
            availableCards={cards}
            message=""
            availableRecipients={[]}
          />
        )}

      {/* Voucher Modal */}
      <VoucherModal
        open={showVoucherModal}
        onClose={() => setShowVoucherModal(false)}
        userVouchers={userVouchers}
        voucherHistory={voucherHistory}
      />

      {/* Auto Top Up Modal */}
      <AutoTopUpModal
        open={showAutoTopUpModal}
        onClose={() => setShowAutoTopUpModal(false)}
        cards={cards}
        onSaveSettings={handleSaveAutoTopUpSettings}
        onCancelSettings={handleCancelAutoTopUp}
        existingSettings={autoTopUpSettings}
      />

      {/* Auto Top Up Notification Modal */}
      <AutoTopUpNotificationModal
        open={showAutoTopUpNotification}
        onClose={() => setShowAutoTopUpNotification(false)}
        data={autoTopUpNotificationData}
        onConfirm={handleAutoTopUpConfirm}
      />

      {/* Save Confirmation Popup */}
      <SaveConfirmationPopup
        open={showSaveConfirmation}
        onClose={() => setShowSaveConfirmation(false)}
        message={saveConfirmationMessage}
        type={saveConfirmationMessage.includes('Auto top up successful') ? 'autoTopUp' : 'settings'}
      />

      {/* Stats Modal */}
      <StatsModal
        open={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        transactions={transactions}
      />

      {/* NFC Modal */}
      <NFCModal
        open={showNFCModal}
        onClose={() => setShowNFCModal(false)}
        user={user}
        cards={cards}
        onNFCSuccess={() => {
          // Refresh transactions and cards after successful NFC transaction
          const userId = getCurrentUser();
          if (userId) {
            refreshTransactions(userId);
            // Refresh cards from backend
            fetch(`http://localhost:3002/api/cards?user_id=${userId}`)
              .then(res => res.json())
              .then(data => {
                const cardData = Array.isArray(data)
                  ? data.map(card => ({ ...card, balance: Number(card.balance) }))
                  : [];
                setCards(cardData);
              })
              .catch(err => {
                console.error('Error refreshing cards:', err);
              });
          }
        }}
      />
    </div>
  );
} 

