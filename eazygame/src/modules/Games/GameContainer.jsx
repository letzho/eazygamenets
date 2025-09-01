import React, { useState, useEffect } from 'react';
import styles from './GameContainer.module.css';
import CandyCrush from './CandyCrush';
import PopBubble from './PopBubble';
import Minesweeper from './Minesweeper';
import GoogleSnake from './GoogleSnake';
import GameScoreDisplay from './GameScoreDisplay';
import bubbleSvg from '../../assets/bubble.svg';
import minesweeperSvg from '../../assets/minesweeper.svg';
import snakeSvg from '../../assets/snake.svg';
import candySvg from '../../assets/candy.svg';

const GAMES = [
  { id: 'candy-crush', name: 'Candy Crush', icon: candySvg, component: CandyCrush },
  { id: 'pop-bubble', name: 'Pop Bubble', icon: bubbleSvg, component: PopBubble },
  { id: 'minesweeper', name: 'Minesweeper', icon: minesweeperSvg, component: Minesweeper },
  { id: 'google-snake', name: 'Google Snake', icon: snakeSvg, component: GoogleSnake },
];

export default function GameContainer({ onGameComplete, userCoins = 0, onGameScoreUpdate, initialGame = null, onVoucherExchange }) {
  const [selectedGame, setSelectedGame] = useState(initialGame);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [gameTimer, setGameTimer] = useState(null);
  const [showGameStats, setShowGameStats] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const [gameScores, setGameScores] = useState({
    'candy-crush': { gamesPlayed: 0, wins: 0, bestScore: 0 },
    'pop-bubble': { gamesPlayed: 0, wins: 0, bestScore: 0 },
    'minesweeper': { gamesPlayed: 0, wins: 0, bestScore: 0 },
    'google-snake': { gamesPlayed: 0, wins: 0, bestScore: 0 },
  });

  // Auto-start game if initialGame is provided
  useEffect(() => {
    if (initialGame && !isPlaying) {
      startGame(initialGame);
    }
  }, [initialGame]);

  const startGame = (gameId) => {
    // Prevent multiple timers from running
    if (timerActive) {
      console.log('Timer already active, preventing duplicate start');
      return;
    }
    
    // Clear any existing timer first to prevent multiple timers
    if (gameTimer) {
      clearInterval(gameTimer);
      setGameTimer(null);
    }
    
    setSelectedGame(gameId);
    setIsPlaying(true);
    setTimeLeft(10);
    setTimerActive(true);
    
    // Update games played count
    setGameScores(prev => ({
      ...prev,
      [gameId]: {
        ...prev[gameId],
        gamesPlayed: prev[gameId].gamesPlayed + 1
      }
    }));
    
    // Use a more reliable timer implementation
    let currentTime = 10;
    const timer = setInterval(() => {
      currentTime -= 1;
      console.log('Timer tick, currentTime:', currentTime); // Debug log
      
      setTimeLeft(currentTime);
      
      if (currentTime <= 0) {
        clearInterval(timer);
        setTimerActive(false);
        endGame();
      }
    }, 1000); // 1-second countdown
    
    setGameTimer(timer);
  };

  const endGame = () => {
    console.log('Ending game, timerActive:', timerActive);
    setIsPlaying(false);
    setTimerActive(false);
    if (gameTimer) {
      clearInterval(gameTimer);
      setGameTimer(null);
    }
  };

  const handleGameComplete = (gameResult = {}) => {
    endGame();
    
    // Update wins count
    if (selectedGame) {
      setGameScores(prev => ({
        ...prev,
        [selectedGame]: {
          ...prev[selectedGame],
          wins: prev[selectedGame].wins + 1
        }
      }));
    }
    
    // Pass game type and result to parent
    onGameComplete(selectedGame, gameResult);
  };

  const closeGame = () => {
    endGame();
    setSelectedGame(null);
  };

  const restartGame = () => {
    console.log('Restarting game...'); // Debug log
    
    // Clear any existing timer first
    if (gameTimer) {
      clearInterval(gameTimer);
      setGameTimer(null);
    }
    
    // Reset game state immediately
    setTimeLeft(10);
    setIsPlaying(false);
    setTimerActive(false);
    
    // Start the game immediately without delay
    if (selectedGame) {
      startGame(selectedGame);
    }
  };

  const selectedGameData = GAMES.find(game => game.id === selectedGame);
  const GameComponent = selectedGameData?.component;

  // Update parent component with game scores whenever they change
  useEffect(() => {
    if (onGameScoreUpdate) {
      onGameScoreUpdate(gameScores);
    }
  }, [gameScores, onGameScoreUpdate]);

  // Ensure timer is properly managed when game state changes
  useEffect(() => {
    if (!isPlaying && gameTimer) {
      console.log('Game stopped, clearing timer');
      clearInterval(gameTimer);
      setGameTimer(null);
      setTimerActive(false);
    }
  }, [isPlaying, gameTimer]);

  // Debug: Monitor timeLeft changes
  useEffect(() => {
    console.log('TimeLeft changed to:', timeLeft);
  }, [timeLeft]);

    return (
    <>
      <div className={styles.gamesContainer}>
        <div className={styles.gamesHeader}>
          <div className={styles.gamesTitle}>🎮 Mini Games</div>
          <button 
            className={styles.statsBtn}
            onClick={() => setShowGameStats(true)}
          >
            📊 Stats
          </button>
        </div>
        
        <div className={styles.gamesScroll}>
          {GAMES.map((game) => (
            <button
              key={game.id}
              className={styles.gameCard}
              onClick={() => startGame(game.id)}
            >
              <div className={styles.gameIcon}>
                <img src={game.icon} alt={game.name} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedGame && (
        <>
          <div className={styles.overlay} onClick={closeGame}></div>
          <div className={styles.gamePlaying}>
                      <div className={styles.gameHeader}>
            <div className={styles.gameInfo}>
              <span className={styles.gameIcon}>
                <img src={selectedGameData.icon} alt={selectedGameData.name} />
              </span>
              <span className={styles.gameName}>{selectedGameData.name}</span>
            </div>
                          <div className={styles.gameControls}>
              <div className={`${styles.timer} ${timeLeft <= 3 ? styles.timerWarning : ''}`}>
                ⏱️ {timeLeft}s
              </div>
              <button className={styles.restartBtn} onClick={restartGame}>🔄</button>
              <button className={styles.closeBtn} onClick={closeGame}>✕</button>
            </div>
            </div>
            <div className={styles.gameArea}>
              <GameComponent 
                onComplete={handleGameComplete}
                onRestart={restartGame}
                timeLeft={timeLeft}
                isPlaying={isPlaying}
              />
            </div>
          </div>
        </>
      )}

      {/* Game Stats Modal */}
      {showGameStats && (
        <>
          <div className={styles.overlay} onClick={() => setShowGameStats(false)}></div>
          <div className={styles.statsModal}>
            <div className={styles.statsHeader}>
              <h3>Game Statistics</h3>
              <button 
                className={styles.closeBtn} 
                onClick={() => setShowGameStats(false)}
              >
                ✕
              </button>
            </div>
            <div className={styles.statsContent}>
              <GameScoreDisplay 
                gameScores={gameScores} 
                totalCoins={userCoins} 
                onVoucherExchange={onVoucherExchange}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
} 
