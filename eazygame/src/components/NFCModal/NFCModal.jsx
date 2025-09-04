import React, { useState, useEffect, useRef } from 'react';
import { getCurrentUser } from '../../userStore';
import styles from './NFCModal.module.css';

// NFCModal v2.0 - No face-api.js dependencies

const NFCModal = ({ open, onClose, user, cards, onNFCSuccess }) => {
  console.log('NFCModal v2.0 loaded - No face-api.js dependencies');
  
  // Fallback to get user data if not provided
  const currentUserId = getCurrentUser();
  console.log('getCurrentUser() returned:', currentUserId);
  
  // Create a proper user object with email
  let currentUser;
  if (user && user.email) {
    currentUser = user;
  } else if (currentUserId) {
    // Map user ID to email for demo purposes
    const userIdToEmailMap = {
      '1': 'lsheang@yahoo.com',   // User ID 1
      '2': 'evanlee@gmail.com',   // User ID 2
      '3': 'shilin@gmail.com',    // User ID 3
      '8': 'lsheang@yahoo.com',   // Legacy user ID 8
      '9': 'evanlee@gmail.com',   // Legacy user ID 9
      '10': 'shilin@gmail.com'    // Legacy user ID 10
    };
    currentUser = { 
      email: userIdToEmailMap[currentUserId] || `user${currentUserId}@example.com`,
      id: currentUserId 
    };
  } else {
    currentUser = { email: 'demo@example.com', id: 'demo' };
  }
  
  console.log('NFCModal currentUser:', currentUser);
  console.log('NFCModal user prop:', user);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recognitionResult, setRecognitionResult] = useState(null);
  const [showSendReceive, setShowSendReceive] = useState(false);
  const [sendAmount, setSendAmount] = useState('');
  const [selectedCard, setSelectedCard] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [nfcMode, setNfcMode] = useState(null); // 'send' or 'receive'
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const modelsLoadedRef = useRef(false);

  // User email to image mapping
  const userImageMap = {
    'lsheang@yahoo.com': 'leow.jpg',
    'evanlee@gmail.com': 'evan.jpg',
    'shilin@gmail.com': 'shilin.jpg'
  };

  // Initialize demo mode (simulated facial recognition)
  useEffect(() => {
    const loadModels = async () => {
      if (modelsLoadedRef.current) return;
      
      try {
        setIsLoading(true);
        // For demo purposes, we'll skip the actual model loading
        // and use a simulated recognition approach
        console.log('Using simulated facial recognition for demo');
        
        // Test if identity images are accessible
        console.log('Testing identity images accessibility...');
        for (const [email, imageFile] of Object.entries(userImageMap)) {
          try {
            const testImage = new Image();
            const imagePath = `/src/assets/identity/${imageFile}`;
            await new Promise((resolve, reject) => {
              testImage.onload = resolve;
              testImage.onerror = reject;
              testImage.src = imagePath;
              setTimeout(() => reject(new Error('Timeout')), 2000);
            });
            console.log(`✅ Image accessible: ${email} -> ${imageFile}`);
          } catch (error) {
            console.warn(`⚠️ Image not accessible: ${email} -> ${imageFile}`, error);
          }
        }
        
        modelsLoadedRef.current = true;
      } catch (error) {
        console.log('Demo mode initialized successfully');
        // Fallback approach for demo
        modelsLoadedRef.current = true;
      } finally {
        setIsLoading(false);
      }
    };

    if (open) {
      loadModels();
    }
  }, [open]);

  // Start camera when modal opens
  useEffect(() => {
    if (open && modelsLoadedRef.current) {
      startCamera();
    }

    return () => {
      stopCamera();
    };
  }, [open, modelsLoadedRef.current]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user'
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const captureAndRecognize = async () => {
    console.log('captureAndRecognize called');
    console.log('videoRef.current:', videoRef.current);
    console.log('currentUser?.email:', currentUser?.email);
    
    if (!videoRef.current || !currentUser?.email) {
      console.log('Early return - missing video or user email');
      return;
    }

    console.log('Starting recognition process...');
    setIsRecognizing(true);
    
    try {
      // Capture frame from video
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if user has a corresponding image file
      const userImageFile = userImageMap[currentUser.email];
      
      if (userImageFile) {
        // Load the reference image to verify it exists
        try {
          const referenceImage = new Image();
          const imagePath = `/src/assets/identity/${userImageFile}`;
          console.log('Loading reference image:', imagePath);
          referenceImage.src = imagePath;
          
          await new Promise((resolve, reject) => {
            referenceImage.onload = () => {
              console.log('Reference image loaded successfully:', imagePath);
              resolve();
            };
            referenceImage.onerror = (error) => {
              console.error('Failed to load reference image:', imagePath, error);
              reject(error);
            };
            // Timeout after 3 seconds
            setTimeout(() => reject(new Error('Image load timeout')), 3000);
          });
          
          // If we get here, the image loaded successfully
          setRecognitionResult({
            success: true,
            confidence: 0.95,
            userEmail: currentUser.email,
            imageFile: userImageFile
          });
          setShowSendReceive(true);
          playSound('success');
        } catch (imageError) {
          console.error('Error loading reference image:', imageError);
          setRecognitionResult({
            success: false,
            message: `Reference image not found for ${currentUser.email}. Please contact admin.`
          });
          playSound('error');
        }
      } else {
        setRecognitionResult({
          success: false,
          message: `No registered face found for ${currentUser.email}. Please contact admin to register your face.`
        });
        playSound('error');
      }
    } catch (error) {
      console.error('Recognition error:', error);
      setRecognitionResult({
        success: false,
        message: 'Recognition failed. Please try again.'
      });
    } finally {
      setIsRecognizing(false);
    }
  };

  const playSound = (type) => {
    // Create audio context for sound effects
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (type === 'success') {
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
    } else if (type === 'send') {
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime + 0.2);
    } else if (type === 'receive') {
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1200, audioContext.currentTime + 0.2);
    } else {
      oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
    }
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  };

  const handleSend = async () => {
    console.log('handleSend called with:', { sendAmount, selectedCard, currentUser });
    
    if (!sendAmount || !selectedCard || !currentUser?.email) {
      alert('Please enter amount and select a card');
      return;
    }

    const amount = parseFloat(sendAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    // Convert selectedCard to number for comparison
    const selectedCardId = parseInt(selectedCard);
    const selectedCardData = cards.find(card => card.id === selectedCardId);
    console.log('Looking for card ID:', selectedCardId, 'Available cards:', cards);
    
    if (!selectedCardData) {
      alert('Please select a valid card');
      return;
    }

    if (amount > selectedCardData.balance) {
      alert('Insufficient balance');
      return;
    }

    setIsProcessing(true);
    setNfcMode('send');

    try {
      // Simulate NFC sending with flash effect
      setShowFlash(true);
      playSound('send');
      
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Create NFC transaction record
      const nfcTransaction = {
        sender_email: currentUser.email,
        recipient_email: 'shilin@gmail.com', // Default recipient for now
        amount: amount,
        card_id: selectedCardId,
        timestamp: new Date().toISOString(),
        status: 'sent'
      };

      // Send to backend
      const response = await fetch(`${API_BASE_URL}/api/nfc-transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nfcTransaction)
      });

      if (response.ok) {
        // Deduct from card
        const deductResponse = await fetch('http://localhost:3002/api/cards/deduct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            card_id: selectedCardId, 
            amount: amount 
          })
        });

        if (deductResponse.ok) {
          // Create a transaction record for the main transactions list
          const transactionRecord = {
            user_id: currentUserId, // Use numeric user ID, not email
            card_id: selectedCardId,
            amount: amount,
            type: 'NFC Payment',
            name: `NFC Payment to ${nfcTransaction.recipient_email}`,
            time: new Date().toISOString(),
            status: 'completed'
          };

          // Add transaction to main transactions table
          const transactionResponse = await fetch(`${API_BASE_URL}/api/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transactionRecord)
          });

          if (transactionResponse.ok) {
            alert(`NFC Payment sent successfully! $${amount} sent to shilin@gmail.com`);
            onNFCSuccess && onNFCSuccess();
            handleClose();
          } else {
            console.warn('NFC payment successful but failed to create transaction record');
            alert(`NFC Payment sent successfully! $${amount} sent to shilin@gmail.com`);
            onNFCSuccess && onNFCSuccess();
            handleClose();
          }
        } else {
          throw new Error('Failed to deduct from card');
        }
      } else {
        throw new Error('Failed to create NFC transaction');
      }
    } catch (error) {
      console.error('NFC Send error:', error);
      alert('NFC Payment failed: ' + error.message);
    } finally {
      setIsProcessing(false);
      setShowFlash(false);
      setNfcMode(null);
    }
  };

  const handleReceive = async () => {
    if (!currentUser?.email) return;

    setIsProcessing(true);
    setNfcMode('receive');

    try {
      // Check for pending NFC transactions
      const response = await fetch(`${API_BASE_URL}/api/nfc-transactions/receive/${encodeURIComponent(currentUser.email)}`);
      
      if (response.ok) {
        const pendingTransactions = await response.json();
        
        if (pendingTransactions.length > 0) {
          // Simulate NFC receiving with flash effect
          setShowFlash(true);
          playSound('receive');
          
          await new Promise(resolve => setTimeout(resolve, 1500));

          // Process the first pending transaction
          const transaction = pendingTransactions[0];
          
          // Add to user's default card (first card)
          const defaultCard = cards[0];
          if (defaultCard) {
            const topUpResponse = await fetch('http://localhost:3002/api/cards/topup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                card_id: defaultCard.id, 
                amount: transaction.amount 
              })
            });

            if (topUpResponse.ok) {
              // Mark transaction as received
              await fetch(`${API_BASE_URL}/api/nfc-transactions/${transaction.id}/receive`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' }
              });

              // Create a transaction record for the main transactions list
              const transactionRecord = {
                user_id: currentUserId, // Use numeric user ID, not email
                card_id: defaultCard.id,
                amount: transaction.amount,
                type: 'NFC Payment',
                name: `NFC Payment from ${transaction.sender_email}`,
                time: new Date().toISOString(),
                status: 'completed'
              };

              // Add transaction to main transactions table
              const transactionResponse = await fetch(`${API_BASE_URL}/api/transactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(transactionRecord)
              });

              if (transactionResponse.ok) {
                alert(`NFC Payment received! $${transaction.amount} from ${transaction.sender_email}`);
                onNFCSuccess && onNFCSuccess();
                handleClose();
              } else {
                console.warn('NFC receive successful but failed to create transaction record');
                alert(`NFC Payment received! $${transaction.amount} from ${transaction.sender_email}`);
                onNFCSuccess && onNFCSuccess();
                handleClose();
              }
            } else {
              throw new Error('Failed to add funds to card');
            }
          } else {
            throw new Error('No cards available to receive funds');
          }
        } else {
          alert('No pending NFC payments to receive');
        }
      } else {
        throw new Error('Failed to check for pending transactions');
      }
    } catch (error) {
      console.error('NFC Receive error:', error);
      alert('NFC Receive failed: ' + error.message);
    } finally {
      setIsProcessing(false);
      setShowFlash(false);
      setNfcMode(null);
    }
  };

  const handleClose = () => {
    stopCamera();
    setRecognitionResult(null);
    setShowSendReceive(false);
    setSendAmount('');
    setSelectedCard('');
    setNfcMode(null);
    setShowFlash(false);
    onClose();
  };

  if (!open) return null;
  
  console.log('NFCModal rendering - open:', open, 'user:', user);
  console.log('NFCModal user email:', user?.email);
  console.log('NFCModal user object keys:', user ? Object.keys(user) : 'user is undefined');

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>NFC Payment</h2>
          <button className={styles.closeButton} onClick={handleClose}>
            ✕
          </button>
        </div>

        <div className={styles.content}>
          {isLoading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Loading facial recognition...</p>
            </div>
          ) : !showSendReceive ? (
            <div className={styles.recognitionSection}>
              <div className={styles.cameraContainer}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={styles.video}
                />
                <canvas
                  ref={canvasRef}
                  className={styles.canvas}
                  style={{ display: 'none' }}
                />
                {isRecognizing && (
                  <div className={styles.recognizingOverlay}>
                    <div className={styles.recognizingSpinner}></div>
                    <p>Recognizing face...</p>
                  </div>
                )}
              </div>

              <div className={styles.instructions}>
                <p>Position your face in the camera and click "Recognize" to authenticate</p>
                <p className={styles.userInfo}>Authenticating as: {currentUser?.email}</p>
                <p className={styles.demoNote}>
                  <strong>✅ Demo Mode Active:</strong> Recognition is simulated based on registered users.
                  <br />
                  <strong>Registered users:</strong> lsheang@yahoo.com, evanlee@gmail.com, shilin@gmail.com
                  <br />
                  <em>No face-api.js dependencies - fully functional demo!</em>
                </p>
              </div>

              <div className={styles.buttons}>
                <button
                  onClick={() => {
                    console.log('Recognize Face button clicked!');
                    console.log('Video ref:', videoRef.current);
                    console.log('Current user:', currentUser);
                    console.log('Is recognizing:', isRecognizing);
                    captureAndRecognize();
                  }}
                  disabled={isRecognizing}
                  className={styles.recognizeButton}
                >
                  {isRecognizing ? 'Recognizing...' : 'Recognize Face'}
                </button>
              </div>

              {recognitionResult && (
                <div className={`${styles.result} ${recognitionResult.success ? styles.success : styles.error}`}>
                  {recognitionResult.success ? (
                    <div className={styles.successContent}>
                      <p>✅ Face recognized successfully!</p>
                      <div className={styles.referenceImageContainer}>
                        <p className={styles.referenceLabel}>Reference Image:</p>
                        <img 
                          src={`/src/assets/identity/${recognitionResult.imageFile}`}
                          alt="Reference"
                          className={styles.referenceImage}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                          }}
                        />
                        <div className={styles.imageError} style={{display: 'none'}}>
                          Image not found: {recognitionResult.imageFile}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p>❌ {recognitionResult.message}</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className={styles.sendReceiveSection}>
              <div className={styles.authenticatedInfo}>
                <p>✅ Authenticated as: {currentUser?.email}</p>
              </div>

              <div className={styles.actionButtons}>
                <button
                  onClick={() => setShowSendReceive('send')}
                  className={styles.actionButton}
                >
                  📤 Send Money
                </button>
                <button
                  onClick={() => setShowSendReceive('receive')}
                  className={styles.actionButton}
                >
                  📥 Receive Money
                </button>
              </div>

              {showSendReceive === 'send' && (
                <div className={styles.sendForm}>
                  <h3>Send Money via NFC</h3>
                  <div className={styles.formGroup}>
                    <label>Amount ($):</label>
                    <input
                      type="number"
                      value={sendAmount}
                      onChange={(e) => setSendAmount(e.target.value)}
                      placeholder="Enter amount"
                      min="0.01"
                      step="0.01"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>From Card:</label>
                    <select
                      value={selectedCard}
                      onChange={(e) => setSelectedCard(e.target.value)}
                    >
                      <option value="">Select a card</option>
                      {cards.map(card => (
                        <option key={card.id} value={card.id}>
                          {card.number.slice(-4)} - ${card.balance}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.formActions}>
                    <button
                      onClick={handleSend}
                      disabled={isProcessing}
                      className={styles.sendButton}
                    >
                      {isProcessing ? 'Sending...' : 'Send via NFC'}
                    </button>
                    <button
                      onClick={() => setShowSendReceive(false)}
                      className={styles.cancelButton}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {showSendReceive === 'receive' && (
                <div className={styles.receiveForm}>
                  <h3>Receive Money via NFC</h3>
                  <p>Check for pending NFC payments and receive them</p>
                  <div className={styles.formActions}>
                    <button
                      onClick={handleReceive}
                      disabled={isProcessing}
                      className={styles.receiveButton}
                    >
                      {isProcessing ? 'Receiving...' : 'Receive via NFC'}
                    </button>
                    <button
                      onClick={() => setShowSendReceive(false)}
                      className={styles.cancelButton}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Flash effect overlay */}
          {showFlash && (
            <div className={`${styles.flashOverlay} ${nfcMode === 'send' ? styles.sendFlash : styles.receiveFlash}`}>
              <div className={styles.flashContent}>
                {nfcMode === 'send' ? '📤 Sending...' : '📥 Receiving...'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NFCModal;
