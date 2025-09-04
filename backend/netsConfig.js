const crypto = require('crypto');

// NETS Configuration
const NETS_CONFIG = {
  KEY_ID: process.env.NETS_KEY_ID || 'your_key_id_here',
  SECRET_KEY: process.env.NETS_SECRET_KEY || 'your_secret_key_here',
  NETS_MID: process.env.NETS_MID || 'UMID_887770001',
  B2S_TXN_END_URL: process.env.B2S_TXN_END_URL || 'https://sit2.enets.sg/MerchantApp/sim/b2sTxnEndURL.jsp',
  S2S_TXN_END_URL: process.env.S2S_TXN_END_URL || 'https://sit2.enets.sg/MerchantApp/rest/s2sTxnEnd',
  NETS_API_BASE_URL: process.env.NETS_API_BASE_URL || 'https://sandbox.nets.openapipaas.com',
  SANDBOX_API_KEY: process.env.SANDBOX_API_KEY || 'bY57TrFMmuAhHKi7nlym'
};

// Payment Methods Configuration
const PAYMENT_METHODS = {
  ENETS: {
    name: 'eNETS',
    timeout: 300, // 5 minutes
    description: 'Pay with eNETS'
  },
  ENETS_QR: {
    name: 'eNETS QR',
    timeout: 300, // 5 minutes
    description: 'Pay with eNETS QR'
  },
  NETS_PREPAID: {
    name: 'NETS Prepaid Card',
    timeout: 60, // 1 minute
    description: 'Pay with NETS Prepaid Card'
  }
};

// Generate HMAC for NETS API
function generateHMAC(payload) {
  const concatPayloadAndSecretKey = payload + NETS_CONFIG.SECRET_KEY;
  const hmac = crypto.createHmac('sha256', NETS_CONFIG.SECRET_KEY);
  hmac.update(concatPayloadAndSecretKey);
  return hmac.digest('base64');
}

// Create payment payload for B2S transactions
function createPaymentPayload(amount, paymentMethod, otpType = 'SMS') {
  const merchantTxnRef = `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  const merchantTxnDtm = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const txnAmount = Math.round(amount * 100); // Convert to cents

  const txnReq = JSON.stringify({
    ss: "1",
    msg: {
      txnAmount: txnAmount.toString(),
      merchantTxnRef: merchantTxnRef,
      b2sTxnEndURL: NETS_CONFIG.B2S_TXN_END_URL,
      s2sTxnEndURL: NETS_CONFIG.S2S_TXN_END_URL,
      netsMid: NETS_CONFIG.NETS_MID,
      merchantTxnDtm: merchantTxnDtm,
      otpType: otpType,
      paymentMethod: paymentMethod
    }
  });

  const keyId = NETS_CONFIG.KEY_ID;
  const macValue = generateHMAC(txnReq);

  return {
    txnReq,
    keyId,
    macValue,
    merchantTxnRef,
    merchantTxnDtm
  };
}

// Create NETS QR payload
function createNetsQrPayload(amount, txnId, notifyMobile = 0) {
  return {
    txn_id: txnId,
    amt_in_dollars: amount,
    notify_mobile: notifyMobile
  };
}

// Make request to NETS API
async function makeNetsRequest(endpoint, payload) {
  const url = `${NETS_CONFIG.NETS_API_BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${NETS_CONFIG.SANDBOX_API_KEY}`,
    'Accept': 'application/json'
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`NETS API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('NETS API request error:', error);
    throw error;
  }
}

module.exports = {
  PAYMENT_METHODS,
  createPaymentPayload,
  createNetsQrPayload,
  makeNetsRequest,
  generateHMAC,
  NETS_CONFIG
};