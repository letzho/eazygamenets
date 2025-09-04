import React, { useState } from 'react';
import styles from './TopUpSelectionModal.module.css';

export default function TopUpSelectionModal({ 
  open, 
  onClose, 
  cards, 
  onTopUp 
}) {
  const [topUpAmounts, setTopUpAmounts] = useState({});

  const handleTopUp = (cardId) => {
    const amount = parseFloat(topUpAmounts[cardId] || 10);
    if (amount > 0) {
      onTopUp(cardId, amount);
      onClose();
    }
  };

  const handleAmountChange = (cardId, value) => {
    setTopUpAmounts(prev => ({
      ...prev,
      [cardId]: value
    }));
  };

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.container} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.headerIcon}>💳</div>
            <h2 className={styles.title}>Select Card to Top Up</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.content}>
          {cards.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>💳</div>
              <h3>No Cards Found</h3>
              <p>You don't have any cards to top up.</p>
              <p>Add a card first using the "Prepaid Card" button.</p>
            </div>
          ) : (
            <div className={styles.cardsList}>
              {cards.map((card) => {
                const digits = (card.number || '').replace(/\D/g, '');
                const masked = digits.length >= 4
                  ? '**** **** **** ' + digits.slice(-4)
                  : card.number;
                
                return (
                  <div key={card.id} className={styles.cardItem}>
                    <div className={styles.cardInfo}>
                      <div className={styles.cardHeader}>
                        <div className={styles.cardNumber}>Card ending in {card.number.slice(-4)}</div>
                        <div className={styles.cardType}>NETS Prepaid</div>
                      </div>
                      <div className={styles.cardDetails}>
                        <span className={styles.cardExpiry}>Expires: {card.expiry}</span>
                        <span className={styles.cardBalance}>
                          Balance: <span className={styles.balanceAmount}>${Number(card.balance ?? 0).toFixed(2)}</span>
                        </span>
                      </div>
                    </div>
                    <div className={styles.cardActions}>
                      <div className={styles.amountInput}>
                        <label htmlFor={`amount-${card.id}`}>Amount</label>
                        <input
                          id={`amount-${card.id}`}
                          type="number"
                          min="1"
                          max="1000"
                          step="0.01"
                          value={topUpAmounts[card.id] || 10}
                          onChange={(e) => handleAmountChange(card.id, e.target.value)}
                          placeholder="10.00"
                          className={styles.input}
                        />
                      </div>
                      <button 
                        className={styles.topUpBtn}
                        onClick={() => handleTopUp(card.id)}
                        disabled={!topUpAmounts[card.id] || parseFloat(topUpAmounts[card.id]) <= 0}
                      >
                        <span className={styles.btnIcon}>💰</span>
                        Top Up
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
