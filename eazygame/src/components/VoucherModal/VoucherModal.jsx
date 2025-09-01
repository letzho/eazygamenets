import React from 'react';
import styles from './VoucherModal.module.css';

export default function VoucherModal({ open, onClose, userVouchers = 0, voucherHistory = [] }) {
  console.log('VoucherModal render - open:', open, 'userVouchers:', userVouchers);
  if (!open) return null;

  const totalValue = userVouchers * 0.10;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>🎫 My Vouchers</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.content}>
          {/* Current Vouchers */}
          <div className={styles.currentVouchers}>
            <div className={styles.voucherCount}>
              <span className={styles.voucherIcon}>🎫</span>
              <span className={styles.voucherNumber}>{userVouchers}</span>
              <span className={styles.voucherLabel}>Vouchers Available</span>
            </div>
            <div className={styles.voucherValue}>
              <span className={styles.valueLabel}>Total Value:</span>
              <span className={styles.valueAmount}>SGD ${totalValue.toFixed(2)}</span>
            </div>
            <div className={styles.voucherInfo}>
              <p>💡 Each voucher is worth SGD $0.10</p>
              <p>💡 Use vouchers during checkout to get discounts</p>
              <p>💡 Earn vouchers by playing games and exchanging coins</p>
            </div>
          </div>

          {/* Voucher History */}
          {voucherHistory.length > 0 && (
            <div className={styles.historySection}>
              <h3>📋 Voucher History</h3>
              <div className={styles.historyList}>
                {voucherHistory.slice(0, 10).map((transaction, index) => (
                  <div key={index} className={styles.historyItem}>
                    <div className={styles.historyInfo}>
                      <span className={styles.historyType}>
                        {transaction.transaction_type === 'earned' ? '🟢 Earned' : '🔴 Used'}
                      </span>
                      <span className={styles.historyDate}>
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className={styles.historyAmount}>
                      {transaction.transaction_type === 'earned' ? '+' : '-'}{transaction.quantity} voucher{transaction.quantity > 1 ? 's' : ''}
                    </div>
                    {transaction.payment_amount && (
                      <div className={styles.paymentInfo}>
                        Payment: SGD ${transaction.payment_amount}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* How to Earn Vouchers */}
          <div className={styles.earnSection}>
            <h3>💰 How to Earn Vouchers</h3>
            <div className={styles.earnSteps}>
              <div className={styles.step}>
                <span className={styles.stepNumber}>1</span>
                <span className={styles.stepText}>Play mini-games to earn coins</span>
              </div>
              <div className={styles.step}>
                <span className={styles.stepNumber}>2</span>
                <span className={styles.stepText}>Collect 10 coins</span>
              </div>
              <div className={styles.step}>
                <span className={styles.stepNumber}>3</span>
                <span className={styles.stepText}>Exchange for 1 voucher worth $0.10</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.closeButton} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
