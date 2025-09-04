import React, { useState, useEffect } from 'react';
import styles from './PaymentGateway.module.css';

// Helper function to get current user ID
const getCurrentUser = () => {
  return localStorage.getItem('user_id');
};
import API_BASE_URL from '../../config.js';

// Import payment method images
import enetsImage from '../../assets/ENETS.avif';
import netscardImage from '../../assets/netscard_icon.png';
import qrImage from '../../assets/netsQrLogo.png';

const PAYMENT_METHODS = {
  ENETS: {
    name: 'eNETS',
    image: enetsImage,
    description: 'Direct bank transfer',
    timeout: 125
  },
  ENETS_QR: {
    name: 'NETS QR',
    image: qrImage,
    description: 'QR code payment',
    timeout: 605
  },
  NETS_PREPAID: {
    name: 'NETS Prepaid Card',
    image: netscardImage,
    description: 'Pay with prepaid card',
    timeout: 605
  }
};

export default function PaymentGateway({ 
  open, 
  onClose, 
  amount, 
  items = [], 
  onPaymentSuccess, 
  onPaymentFailure,
  userVouchers = 0,
  onVoucherUse = null,
  cards = [] // Add cards prop for prepaid card selection
}) {
  console.log('PaymentGateway props - userVouchers:', userVouchers, 'onVoucherUse:', onVoucherUse);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [otpType, setOtpType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [error, setError] = useState(null);
  const [timer, setTimer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedPrepaidCard, setSelectedPrepaidCard] = useState(null);
  const [showPrepaidCardSelection, setShowPrepaidCardSelection] = useState(false);

  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [vouchersToUse, setVouchersToUse] = useState(0);



  useEffect(() => {
    if (open) {
      setSelectedMethod(null);
      setOtpType(null);
      setPaymentData(null);
      setError(null);
      setTimeLeft(0);
      setPaymentSuccess(false);
      setProcessing(false);
      setVouchersToUse(0);
      setSelectedPrepaidCard(null);
      setShowPrepaidCardSelection(false);
    }
  }, [open]); // Removed userVouchers dependency to prevent unnecessary resets

  useEffect(() => {
    if (timer && timeLeft > 0) {
      const interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            handlePaymentTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer, timeLeft]);

  const handleMethodSelect = (method) => {
    setSelectedMethod(method);
    setOtpType(null);
    setError(null);
    
    // If NETS Prepaid Card is selected, show card selection
    if (method === 'NETS_PREPAID') {
      setShowPrepaidCardSelection(true);
    } else {
      setShowPrepaidCardSelection(false);
      setSelectedPrepaidCard(null);
    }
  };

  const handleOtpTypeSelect = (type) => {
    setOtpType(type);
    setError(null);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePaymentTimeout = () => {
    setError('Payment timeout. Please try again.');
    setLoading(false);
    setPaymentData(null);
  };

  const handlePayment = async () => {
    if (!selectedMethod) {
      setError('Please select a payment method');
      return;
    }

    if (PAYMENT_METHODS[selectedMethod].otpOptions && !otpType) {
      setError('Please select OTP option');
      return;
    }

    if (selectedMethod === 'NETS_PREPAID' && !selectedPrepaidCard) {
      setError('Please select a prepaid card');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Calculate final amount after vouchers
      const finalAmount = Math.max(0, amount - (vouchersToUse * 0.10));
      
      // Handle NETS Prepaid Card payment
      if (selectedMethod === 'NETS_PREPAID') {
        await handlePrepaidCardPayment(finalAmount);
        return;
      }
      
      // For eNETS QR, use the special NETS QR endpoint
      if (selectedMethod === 'ENETS_QR') {
        setProcessing(true);
        handleNetsB2SQRFlow(finalAmount);
        return;
      }

      // Step 2: Create payment request and get keyId, MAC Value, TxnReq
      const response = await fetch(`${API_BASE_URL}/api/payment/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: finalAmount,
          paymentMethod: selectedMethod,
          otpType,
          items,
          userId: localStorage.getItem('user_id'),
          vouchersUsed: vouchersToUse
        })
      });

      const data = await response.json();

             if (data.success) {
         // Store payment data for NETS B2S flow
         setPaymentData({
           ...data,
           keyId: data.keyId,
           macValue: data.macValue,
           txnReq: data.txnReq,
           merchantTxnRef: data.merchantTxnRef
         });
         setTimeLeft(PAYMENT_METHODS[selectedMethod].timeout);
         setTimer(true);
         
         // For NETS B2S flow, we need to handle the browser-to-server flow
         if (selectedMethod === 'ENETS') {
           handleNetsB2SFlow(data, finalAmount);
         } else {
           // For other payment methods, start polling
           pollPaymentStatus(data.merchantTxnRef);
         }
      } else {
        setError(data.error || 'Payment creation failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setError('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrepaidCardPayment = async (finalAmount) => {
    try {
      setProcessing(true);
      setError(null);
      
      console.log('Processing NETS Prepaid Card payment:', {
        cardId: selectedPrepaidCard.id,
        amount: finalAmount,
        cardBalance: selectedPrepaidCard.balance
      });
      
      // Check if card has sufficient balance
      if (parseFloat(selectedPrepaidCard.balance) < finalAmount) {
        setError(`Insufficient balance. Card has $${selectedPrepaidCard.balance} but payment requires $${finalAmount.toFixed(2)}`);
        setProcessing(false);
        return;
      }
      
      // Deduct amount from prepaid card
      const response = await fetch(`${API_BASE_URL}/api/cards/deduct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_id: selectedPrepaidCard.id,
          amount: finalAmount
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Show success state
        setPaymentSuccess(true);
        
        // Use vouchers if any were applied
        if (vouchersToUse > 0 && onVoucherUse) {
          onVoucherUse(vouchersToUse);
          
          // Update vouchers in database
          try {
            const userId = getCurrentUser();
            await fetch('http://localhost:3002/api/vouchers/use', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId,
                vouchersToUse,
                paymentId: data.paymentId || data.id || 'prepaid_success'
              })
            });
          } catch (error) {
            console.error('Error updating vouchers in database:', error);
          }
        }
        
        // Call success callback after showing checkmark
        setTimeout(() => {
          onPaymentSuccess?.({
            ...data,
            method: selectedMethod,
            amount: finalAmount,
            items: items,
            cardId: selectedPrepaidCard.id
          });
          onClose();
        }, 2000);
      } else {
        setError(data.error || 'Prepaid card payment failed');
      }
    } catch (error) {
      console.error('Prepaid card payment error:', error);
      setError('Prepaid card payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleNetsB2SFlow = async (paymentData, finalAmount) => {
    try {
      // Step 3: For sandbox testing, we'll simulate the NETS B2S flow
      console.log('NETS B2S Flow - Step 3: Simulating NETS Gateway interaction');
      console.log('txnReq:', paymentData.txnReq);
      
      // Since the sandbox API endpoints might not be fully accessible,
      // we'll simulate a successful payment for testing purposes
      console.log('Simulating successful NETS payment...');
      
      // Simulate the payment processing time
      setTimeout(async () => {
        try {
          // Mark payment as successful in backend
          const response = await fetch(`${API_BASE_URL}/api/payment/success`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              merchantTxnRef: paymentData.merchantTxnRef,
              amount: finalAmount,
              paymentMethod: selectedMethod
            })
          });

          const data = await response.json();
          
          if (data.success) {
            // Show success state with checkmark
            setPaymentSuccess(true);
            // Use vouchers if any were applied
            if (vouchersToUse > 0 && onVoucherUse) {
              onVoucherUse(vouchersToUse);
              
              // Update vouchers in database
              try {
                const userId = getCurrentUser();
                await fetch('http://localhost:3002/api/vouchers/use', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    userId,
                    vouchersToUse,
                    paymentId: data.paymentId || data.id || 'b2s_success'
                  })
                });
              } catch (error) {
                console.error('Error updating vouchers in database:', error);
              }
            }
            
            // Call success callback after showing checkmark
            setTimeout(() => {
              onPaymentSuccess?.({
                ...data,
                method: selectedMethod,
                amount: finalAmount,
                items: items
              });
              onClose();
            }, 2000);
          } else {
            setError('Failed to mark payment as successful');
          }
        } catch (error) {
          console.error('Payment success error:', error);
          setError('Payment verification failed');
        }
      }, 2000);
      
    } catch (error) {
      console.error('NETS B2S flow error:', error);
      setError('NETS B2S payment flow failed');
    }
  };

  const handleNetsB2SQRFlow = async (finalAmount) => {
    // Generate transaction ID (moved outside try block)
    const txnId = `sandbox_nets|m|${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    try {
      setProcessing(true);
      setError(null);
      
      console.log('Starting NETS QR flow:', { amount: finalAmount, selectedMethod, otpType });
      
      // Call backend API endpoint which has access to NETS credentials
      const body = { 
        txn_id: txnId, 
        amt_in_dollars: finalAmount, 
        notify_mobile: 0
      };
      
      console.log('Calling backend NETS QR API:', body);
      
      const response = await fetch(`${API_BASE_URL}/api/payment/nets-qr-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      const result = await response.json();
      console.log('Backend NETS QR response:', result);
      
      // Check for specific NETS API errors
      if (result.error || result.message) {
        console.error('NETS API Error:', result);
        setError(`NETS API Error: ${result.error || result.message}`);
        setProcessing(false);
        return;
      }
      
      if (result.success && result.qr_code) {
        
        // Store retrieval reference for webhook
        localStorage.setItem('txnRetrievalRef', result.txn_retrieval_ref);
        
        // Use your working approach for QR code display
        const qrCodeDataUrl = "data:image/svg+xml;base64," + result.qr_code;
        console.log('QR Code Data URL created:', qrCodeDataUrl.substring(0, 100) + '...');
        
        // Show QR code in modal using your working pattern
        setPaymentData({
          merchantTxnRef: txnId,
          paymentMethod: PAYMENT_METHODS[selectedMethod],
          qrCode: qrCodeDataUrl,
          txnRetrievalRef: result.txn_retrieval_ref,
          txnId: txnId,
          netsQrResponseCode: result.response_code,
          networkCode: result.network_status,
          openApiPaasTxnStatus: result.txn_status
        });
        
        setTimeLeft(PAYMENT_METHODS[selectedMethod].timeout);
        setTimer(true);
        setProcessing(false); // Reset processing state to show QR code
        
        // Start webhook connection
        startWebhookConnection(result.txn_retrieval_ref);
        
      } else {
        setError(result.instruction || 'Failed to generate QR code');
        setProcessing(false);
      }
      
    } catch (error) {
      console.error('NETS QR error:', error);
      
      // Fall back to simulation if API call fails
      console.log('Falling back to simulation due to API error');
      await simulateQrCodeGeneration(txnId);
    }
  };
  

  
  const startWebhookConnection = (retrievalRef) => {
    const eventSource = new EventSource(`${API_BASE_URL}/api/payment/nets-qr-webhook/${retrievalRef}`);
    
    eventSource.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      console.log('Webhook message:', data);
      
      if (data.message === 'Connected to NETS QR webhook') {
        console.log('Webhook connected successfully');
      } else if (data.message === 'keep-alive') {
        // Keep connection alive, do nothing
        console.log('Webhook keep-alive received');
      } else if (data.message === 'QR code scanned' && data.response_code === '00') {
        setPaymentData(prev => ({
          ...prev,
          status: 'scanned'
        }));
      } else if (data.message === 'Payment successful' && data.response_code === '00') {
        setPaymentSuccess(true);
        
        // Use vouchers if any were applied
        if (vouchersToUse > 0 && onVoucherUse) {
          onVoucherUse(vouchersToUse);
          
          // Update vouchers in database
          try {
            const userId = getCurrentUser();
            await fetch('http://localhost:3002/api/vouchers/use', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId,
                vouchersToUse,
                paymentId: data.paymentId || data.id || 'webhook_success'
              })
            });
          } catch (error) {
            console.error('Error updating vouchers in database:', error);
          }
        }
        
        eventSource.close();
        
        // Call success callback
        onPaymentSuccess?.({
          method: selectedMethod,
          amount: finalAmount,
          items: items,
          paymentId: data.paymentId || 'webhook_success'
        });
        
        setTimeout(() => {
          onClose();
        }, 3000);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('Webhook error:', error);
      eventSource.close();
    };
    
    // Store event source for cleanup
    setPaymentData(prev => ({
      ...prev,
      eventSource: eventSource
    }));
  };

  // Note: handleB2sTxnEnd is now handled by the backend when NETS calls our callback URLs
  // The frontend now polls for status instead of manually calling b2sTxnEnd

  const pollPaymentStatus = async (txnId) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/payment/status/${txnId}`);
        const data = await response.json();

        if (data.success) {
          if (data.status === 'success' || data.status === 'completed') {
            clearInterval(pollInterval);
            setTimer(false);
            setTimeLeft(0);
            setPaymentSuccess(true);
            
            // Use vouchers if any were applied
            if (vouchersToUse > 0 && onVoucherUse) {
              onVoucherUse(vouchersToUse);
              
              // Update vouchers in database
              try {
                const userId = getCurrentUser();
                await fetch('http://localhost:3002/api/vouchers/use', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    userId,
                    vouchersToUse,
                    paymentId: data.paymentId || data.id
                  })
                });
              } catch (error) {
                console.error('Error updating vouchers in database:', error);
              }
            }
            
            // Call success callback after showing checkmark
            setTimeout(() => {
              onPaymentSuccess?.(data);
              onClose();
            }, 2000);
          } else if (data.status === 'failed' || data.status === 'cancelled') {
            clearInterval(pollInterval);
            setTimer(false);
            setTimeLeft(0);
            onPaymentFailure?.(data);
            setError('Payment failed');
          }
        }
      } catch (error) {
        console.error('Status polling error:', error);
      }
    }, 5000); // Poll every 5 seconds

    // Clear interval after timeout
    setTimeout(() => {
      clearInterval(pollInterval);
    }, PAYMENT_METHODS[selectedMethod].timeout * 1000);
  };

  const handleCancel = () => {
    setTimer(false);
    setTimeLeft(0);
    setPaymentData(null);
    setError(null);
    setProcessing(false);
    onClose();
  };

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Payment Gateway</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.content}>
          {!paymentData ? (
            <>
              {/* Payment Method Selection */}
              <div className={styles.section}>
                <h3>Select Payment Method</h3>
                <div className={styles.methodsGrid}>
                  {Object.entries(PAYMENT_METHODS).map(([key, method]) => (
                    <div
                      key={key}
                      className={`${styles.methodCard} ${selectedMethod === key ? styles.selected : ''}`}
                      onClick={() => handleMethodSelect(key)}
                    >
                      <img src={method.image} alt={method.name} className={styles.methodImage} />
                      <div className={styles.methodInfo}>
                        <h4>{method.name}</h4>
                        <p>{method.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Prepaid Card Selection */}
              {selectedMethod === 'NETS_PREPAID' && showPrepaidCardSelection && (
                <div className={styles.section}>
                  <h3>Select Prepaid Card</h3>
                  {cards.length === 0 ? (
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIcon}>💳</div>
                      <h4>No Prepaid Cards Found</h4>
                      <p>You don't have any prepaid cards yet.</p>
                    </div>
                  ) : (
                    <div className={styles.cardsGrid}>
                      {cards.map((card) => {
                        const digits = (card.number || '').replace(/\D/g, '');
                        const masked = digits.length >= 4
                          ? '**** **** **** ' + digits.slice(-4)
                          : card.number;
                        
                        return (
                          <div
                            key={card.id}
                            className={`${styles.cardItem} ${selectedPrepaidCard?.id === card.id ? styles.selected : ''}`}
                            onClick={() => setSelectedPrepaidCard(card)}
                          >
                            <div className={styles.cardInfo}>
                              <div className={styles.cardNumber}>{masked}</div>
                              <div className={styles.cardDetails}>
                                <span className={styles.cardExpiry}>Expires: {card.expiry}</span>
                                <span className={styles.cardBalance}>
                                  Balance: ${Number(card.balance ?? 0).toFixed(2)}
                                </span>
                              </div>
                            </div>
                            {selectedPrepaidCard?.id === card.id && (
                              <div className={styles.selectedIndicator}>✓</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* OTP Selection for VISA/MasterCard */}
              {selectedMethod && PAYMENT_METHODS[selectedMethod].otpOptions && (
                <div className={styles.section}>
                  <h3>OTP Option</h3>
                  <div className={styles.otpOptions}>
                    <label className={styles.otpOption}>
                      <input
                        type="radio"
                        name="otpType"
                        value="with_otp"
                        checked={otpType === 'with_otp'}
                        onChange={() => handleOtpTypeSelect('with_otp')}
                      />
                      <span>With OTP (More Secure)</span>
                    </label>
                    <label className={styles.otpOption}>
                      <input
                        type="radio"
                        name="otpType"
                        value="without_otp"
                        checked={otpType === 'without_otp'}
                        onChange={() => handleOtpTypeSelect('without_otp')}
                      />
                      <span>Without OTP (Faster)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Payment Summary */}
              <div className={styles.section}>
                <h3>Payment Summary</h3>
                <div className={styles.summary}>
                  <div className={styles.summaryRow}>
                    <span>Amount:</span>
                    <span className={styles.amount}>SGD ${amount.toFixed(2)}</span>
                  </div>
                  
                                {/* Voucher Section */}
              <div className={styles.voucherSection}>
                {userVouchers > 0 ? (
                  <>
                    <div className={styles.voucherInfo}>
                      <span className={styles.voucherIcon}>🎫</span>
                      <span>Available Vouchers: {userVouchers} (${(userVouchers * 0.10).toFixed(2)})</span>
                    </div>
                    <div className={styles.voucherControls}>
                      <button 
                        className={styles.voucherBtn}
                        onClick={() => {
                          const newValue = Math.max(0, vouchersToUse - 1);
                          setVouchersToUse(newValue);
                        }}
                        disabled={vouchersToUse <= 0}
                      >
                        -
                      </button>
                      <span className={styles.voucherCount}>{vouchersToUse}</span>
                      <button 
                        className={styles.voucherBtn}
                        onClick={() => {
                          const newValue = Math.min(userVouchers, vouchersToUse + 1);
                          setVouchersToUse(newValue);
                        }}
                        disabled={vouchersToUse >= userVouchers}
                      >
                        +
                      </button>
                    </div>
                  </>
                ) : (
                  <div className={styles.voucherInfo}>
                    <span className={styles.voucherIcon}>🎫</span>
                    <span>No vouchers available. Play games to earn coins and exchange for vouchers!</span>
                  </div>
                )}
              </div>
                  
                  {/* Final Amount After Vouchers */}
                  {vouchersToUse > 0 && (
                    <div className={styles.summaryRow}>
                      <span>Voucher Discount:</span>
                      <span className={styles.discount}>-SGD ${(vouchersToUse * 0.10).toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className={styles.summaryRow}>
                    <span>Final Amount:</span>
                    <span className={styles.finalAmount}>
                      SGD ${Math.max(0, amount - (vouchersToUse * 0.10)).toFixed(2)}
                    </span>
                  </div>
                  
                  {items.length > 0 && (
                    <div className={styles.itemsList}>
                      {items.map((item, index) => (
                        <div key={index} className={styles.item}>
                          <span>{item.name}</span>
                          <span>SGD ${item.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {error && <div className={styles.error}>{error}</div>}

              <div className={styles.actions}>
                <button className={styles.cancelBtn} onClick={handleCancel}>
                  Cancel
                </button>
                <button 
                  className={styles.payBtn} 
                  onClick={handlePayment}
                  disabled={loading || processing || !selectedMethod}
                >
                  {loading || processing ? 'Processing...' : 'Pay Now'}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Payment Processing */}
              <div className={styles.processingSection}>
                <div className={styles.processingHeader}>
                  <h3>Payment Processing</h3>
                  {timeLeft > 0 && (
                    <div className={styles.timer}>
                      Time remaining: {formatTime(timeLeft)}
                    </div>
                  )}
                </div>

                                 <div className={styles.paymentInfo}>
                   <div className={styles.infoRow}>
                     <span>Transaction ID:</span>
                     <div className={styles.txnIdContainer}>
                       <span className={styles.txnId}>{paymentData.merchantTxnRef}</span>
                       <button 
                         className={styles.copyBtn}
                         onClick={() => {
                           navigator.clipboard.writeText(paymentData.merchantTxnRef);
                         }}
                         title="Copy Transaction ID"
                       >
                         📋
                       </button>
                     </div>
                   </div>
                   <div className={styles.infoRow}>
                     <span>Payment Method:</span>
                     <span>{paymentData.paymentMethod.name}</span>
                   </div>
                   <div className={styles.infoRow}>
                     <span>Amount:</span>
                     <span>SGD ${Math.max(0, amount - (vouchersToUse * 0.10)).toFixed(2)}</span>
                   </div>
                                       {(selectedMethod === 'ENETS' || selectedMethod === 'ENETS_QR') && (
                      <>
                        <div className={styles.infoRow}>
                          <span>Key ID:</span>
                          <span>{paymentData.keyId?.substring(0, 8)}...</span>
                        </div>
                        <div className={styles.infoRow}>
                          <span>MAC Value:</span>
                          <span>{paymentData.macValue?.substring(0, 8)}...</span>
                        </div>
                        <div className={styles.infoRow}>
                          <span>Merchant Txn Ref:</span>
                          <span>{paymentData.merchantTxnRef?.substring(0, 20)}...</span>
                        </div>
                      </>
                    )}
                 </div>

                                 <div className={styles.processingAnimation}>
                   {paymentSuccess ? (
                     <div className={styles.checkmark}>✓</div>
                   ) : paymentData.qrCode ? (
                     <div style={{ textAlign: 'center' }}>
                       <h3 style={{ color: '#003da6', marginBottom: '15px', fontSize: '18px' }}>
                         Scan QR Code to Pay
                       </h3>
                       <div style={{
                         display: 'inline-block',
                         background: '#fff',
                         padding: 16,
                         borderRadius: 12,
                         boxShadow: '0 6px 18px rgba(0,0,0,.12)'
                       }}>
                         <img 
                           src={paymentData.qrCode} 
                           alt="NETS QR Code" 
                           style={{ 
                             width: 240, 
                             height: 'auto'
                           }}
                           onLoad={() => console.log('QR Code image loaded successfully')}
                           onError={(e) => console.error('QR Code image failed to load:', e)}
                         />
                       </div>
                       <p style={{ marginTop: '15px', fontSize: '16px', color: '#003da6', fontWeight: 'bold' }}>
                         📱 Scan with NETSPay app
                       </p>
                       <p style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
                         Amount: SGD ${Math.max(0, amount - (vouchersToUse * 0.10)).toFixed(2)}
                       </p>
                       {paymentData.status === 'scanned' && (
                         <div style={{ 
                           marginTop: '10px', 
                           padding: '8px 12px', 
                           backgroundColor: '#d4edda', 
                           color: '#155724',
                           borderRadius: '6px',
                           fontSize: '14px'
                         }}>
                           ✓ QR Code scanned - Processing payment...
                         </div>
                       )}
                       
                       {/* Manual scan simulation button for testing */}
                       <button 
                         onClick={async () => {
                           try {
                             const response = await fetch(`${API_BASE_URL}/api/payment/simulate-qr-scan`, {
                               method: 'POST',
                               headers: { 'Content-Type': 'application/json' },
                               body: JSON.stringify({
                                 retrievalRef: paymentData.txnRetrievalRef
                               })
                             });
                             
                             if (response.ok) {
                               // Create transaction record for simulated NETS QR payment
                               try {
                                 const userId = getCurrentUser();
                                 const transactionResponse = await fetch(`${API_BASE_URL}/api/transactions`, {
                                   method: 'POST',
                                   headers: { 'Content-Type': 'application/json' },
                                   body: JSON.stringify({
                                     user_id: userId,
                                     card_id: null, // No card involved for NETS QR
                                     name: `Purchase: ${items.map(item => item.name).join(', ')} (NETS QR - Simulated)`,
                                     amount: -finalAmount,
                                     type: 'expense'
                                   })
                                 });
                                 
                                 if (!transactionResponse.ok) {
                                   console.error('Failed to create simulated NETS QR transaction record');
                                 } else {
                                   console.log('Simulated NETS QR transaction record created successfully');
                                 }
                               } catch (error) {
                                 console.error('Error creating simulated NETS QR transaction record:', error);
                               }
                               
                               setPaymentSuccess(true);
                               
                               // Use vouchers if any were applied
                               if (vouchersToUse > 0 && onVoucherUse) {
                                 onVoucherUse(vouchersToUse);
                                 
                                 // Update vouchers in database
                                 try {
                                   const userId = getCurrentUser();
                                   await fetch('http://localhost:3002/api/vouchers/use', {
                                     method: 'POST',
                                     headers: {
                                       'Content-Type': 'application/json',
                                     },
                                     body: JSON.stringify({
                                       userId,
                                       vouchersToUse,
                                       paymentId: 'simulate_qr_scan'
                                     })
                                   });
                                 } catch (error) {
                                   console.error('Error updating vouchers in database:', error);
                                 }
                               }
                               
                               setTimeout(() => {
                                 onClose();
                               }, 3000);
                             }
                           } catch (error) {
                             console.error('Error simulating scan:', error);
                           }
                         }}
                         style={{
                           marginTop: '15px',
                           padding: '8px 16px',
                           backgroundColor: '#007bff',
                           color: 'white',
                           border: 'none',
                           borderRadius: '6px',
                           cursor: 'pointer',
                           fontSize: '12px'
                         }}
                       >
                         🧪 Simulate QR Scan (Testing)
                       </button>
                     </div>
                   ) : (
                     <div className={styles.spinner}></div>
                   )}
                   <p>
                     {paymentSuccess 
                       ? 'Payment Successful!' 
                       : paymentData.qrCode
                         ? 'QR Code ready for scanning'
                         : (selectedMethod === 'ENETS' || selectedMethod === 'ENETS_QR') 
                           ? 'Generating QR code...' 
                           : 'Processing your payment...'
                     }
                   </p>
                   {!paymentSuccess && !paymentData.qrCode && (selectedMethod === 'ENETS' || selectedMethod === 'ENETS_QR') && (
                     <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
                       Following NETS B2S flow: Merchant → Browser Plugin → NETS Gateway → Merchant
                     </p>
                   )}
                 </div>

                {error && <div className={styles.error}>{error}</div>}
                


                <button className={styles.cancelBtn} onClick={handleCancel}>
                  {paymentData.qrCode ? 'Cancel & Close' : 'Cancel Payment'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
