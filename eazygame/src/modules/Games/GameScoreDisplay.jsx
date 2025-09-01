import React, { useState } from 'react';
import styles from './GameScoreDisplay.module.css';

export default function GameScoreDisplay({ gameScores, totalCoins, onVoucherExchange }) {
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const games = [
    { id: 'candy-crush', name: 'Candy Crush', icon: '🍬' },
    { id: 'pop-bubble', name: 'Pop Bubble', icon: '🫧' },
    { id: 'minesweeper', name: 'Minesweeper', icon: '💣' },
    { id: 'google-snake', name: 'Snake', icon: '🐍' },
  ];

  const totalGamesPlayed = Object.values(gameScores).reduce((sum, score) => sum + score.gamesPlayed, 0);
  const totalWins = Object.values(gameScores).reduce((sum, score) => sum + score.wins, 0);
  const winRate = totalGamesPlayed > 0 ? Math.round((totalWins / totalGamesPlayed) * 100) : 0;
  
  // Voucher system: 10 coins = $0.10 voucher
  const canExchangeVoucher = totalCoins >= 10;
  const vouchersEarned = Math.floor(totalCoins / 10);
  const remainingCoins = totalCoins % 10;

  const handleVoucherExchange = () => {
    if (canExchangeVoucher) {
      setShowVoucherModal(true);
    }
  };

  const confirmVoucherExchange = () => {
    if (onVoucherExchange) {
      onVoucherExchange(vouchersEarned);
    }
    setShowVoucherModal(false);
  };

  return (
    <div className={styles.scoreContainer}>
      <div className={styles.scoreHeader}>
        <div className={styles.scoreTitle}>
          <span className={styles.gameIcon}>🎮</span>
          <span>Game Stats</span>
        </div>
        <div className={styles.totalCredits}>
          <span className={styles.creditsIcon}>🪙</span>
          <span>{totalCoins} Coins</span>
        </div>
      </div>
      
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statNumber}>{totalGamesPlayed}</div>
          <div className={styles.statLabel}>Games Played</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statNumber}>{totalWins}</div>
          <div className={styles.statLabel}>Wins</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statNumber}>{winRate}%</div>
          <div className={styles.statLabel}>Win Rate</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statNumber}>{vouchersEarned}</div>
          <div className={styles.statLabel}>Vouchers</div>
        </div>
      </div>

      {/* Voucher Exchange Section */}
      {canExchangeVoucher && (
        <div className={styles.voucherSection}>
          <div className={styles.voucherInfo}>
            <span className={styles.voucherIcon}>🎫</span>
            <span className={styles.voucherText}>
              You can exchange {vouchersEarned} voucher{vouchersEarned > 1 ? 's' : ''} worth ${(vouchersEarned * 0.10).toFixed(2)} (10 coins each)
            </span>
          </div>
          <button 
            className={styles.exchangeBtn}
            onClick={handleVoucherExchange}
          >
            💰 Exchange for Vouchers
          </button>
        </div>
      )}

      <div className={styles.gameBreakdown}>
        <div className={styles.breakdownTitle}>Game Breakdown</div>
        <div className={styles.gameList}>
          {games.map(game => {
            const score = gameScores[game.id] || { gamesPlayed: 0, wins: 0, bestScore: 0 };
            const gameWinRate = score.gamesPlayed > 0 ? Math.round((score.wins / score.gamesPlayed) * 100) : 0;
            
            return (
              <div key={game.id} className={styles.gameItem}>
                <div className={styles.gameInfo}>
                  <span className={styles.gameIcon}>{game.icon}</span>
                  <span className={styles.gameName}>{game.name}</span>
                </div>
                <div className={styles.gameStats}>
                  <div className={styles.gameStat}>
                    <span className={styles.statValue}>{score.gamesPlayed}</span>
                    <span className={styles.statLabel}>Played</span>
                  </div>
                  <div className={styles.gameStat}>
                    <span className={styles.statValue}>{score.wins}</span>
                    <span className={styles.statLabel}>Wins</span>
                  </div>
                  <div className={styles.gameStat}>
                    <span className={styles.statValue}>{gameWinRate}%</span>
                    <span className={styles.statLabel}>Rate</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Voucher Exchange Modal */}
      {showVoucherModal && (
        <div className={styles.voucherModal}>
          <div className={styles.voucherModalContent}>
            <div className={styles.voucherModalHeader}>
              <span className={styles.voucherModalIcon}>🎫</span>
                             <h3>Exchange Coins for Vouchers</h3>
            </div>
            <div className={styles.voucherModalBody}>
                             <p>Exchange {vouchersEarned * 10} coins for {vouchersEarned} voucher{vouchersEarned > 1 ? 's' : ''}?</p>
              <p className={styles.voucherValue}>Total Value: ${(vouchersEarned * 0.10).toFixed(2)}</p>
              <p className={styles.voucherNote}>Vouchers can be used during merchant checkout!</p>
            </div>
            <div className={styles.voucherModalActions}>
              <button 
                className={styles.voucherCancelBtn}
                onClick={() => setShowVoucherModal(false)}
              >
                Cancel
              </button>
              <button 
                className={styles.voucherConfirmBtn}
                onClick={confirmVoucherExchange}
              >
                Confirm Exchange
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
