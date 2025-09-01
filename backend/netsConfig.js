const axios = require('axios');
const CryptoJS = require('crypto-js');
require('dotenv').config();

// NETS API Configuration - Using Sandbox environment
const NETS_CONFIG = {
  baseUrl: 'https://sandbox.nets.openapipaas.com/api/v1',
  apiKey: process.env.SANDBOX_API_KEY, // Your sandbox API key
  projectId: process.env.PROJECT_ID,
  txnId: process.env.TXN_ID,
  retrievalRef: process.env.RETRIEVAL_REF,
  secretKey: process.env.SECRET_KEY || 'your-secret-key'
};

// API Headers - matching your working configuration
const getHeaders = () => ({
  'api-key': NETS_CONFIG.apiKey,
  'project-id': NETS_CONFIG.projectId,
  'Content-Type': 'application/json'
});

// Generate HMAC signature
const generateHMAC = (payload) => {
  const message = JSON.stringify(payload);
  const signature = CryptoJS.HmacSHA256(message, NETS_CONFIG.secretKey);
  return CryptoJS.enc.Base64.stringify(signature);
};

// Generate unique transaction ID
const generateTxnId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const prefix = NETS_CONFIG.txnId || 'txn';
  return `${prefix}_${timestamp}_${random}`;
};

// Generate unique retrieval reference
const generateRetrievalRef = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const prefix = NETS_CONFIG.retrievalRef || 'ref';
  return `${prefix}_${timestamp}_${random}`;
};

// Payment method configurations
const PAYMENT_METHODS = {
  ENETS: {
    name: 'eNETS',
    code: 'ENETS',
    timeout: 125, // 2 minutes 5 seconds
    requiresOTP: false
  },
  ENETS_QR: {
    name: 'eNETS QR',
    code: 'ENETS_QR',
    timeout: 605, // 10 minutes 5 seconds
    requiresOTP: false
  },
  VISA: {
    name: 'VISA',
    code: 'VISA',
    timeout: 605, // 10 minutes 5 seconds
    requiresOTP: true, // Can be with or without OTP
    otpOptions: ['with_otp', 'without_otp']
  },
  MASTERCARD: {
    name: 'Master Card',
    code: 'MASTERCARD',
    timeout: 605, // 10 minutes 5 seconds
    requiresOTP: true, // Can be with or without OTP
    otpOptions: ['with_otp', 'without_otp']
  }
};

// Create NETS QR payment request payload (matching working implementation)
const createNetsQrPayload = (amount, txnId, mobile = 0) => {
  return {
    txn_id: txnId,
    amt_in_dollars: amount.toString(),
    notify_mobile: mobile
  };
};

// Create NETS B2S Transaction Request (txnReq) message
const createPaymentPayload = (amount, paymentMethod, otpType = null) => {
  const merchantTxnRef = generateTxnId();
  const merchantTxnDtm = new Date().toISOString().replace('T', ' ').replace('Z', '');
  
  // Step 1: Create txnReq message according to NETS specification
  const txnReq = {
    ss: "1", // default
    msg: {
      txnAmount: (amount * 100).toString(), // Convert to cents
      merchantTxnRef: merchantTxnRef,
      b2sTxnEndURL: "https://sit2.enets.sg/MerchantApp/sim/b2sTxnEndURL.jsp", // Replace with your callback URL
      s2sTxnEndURL: "https://sit2.enets.sg/MerchantApp/rest/s2sTxnEnd", // Replace with your callback URL
      netsMid: NETS_CONFIG.projectId || "UMID_887770001", // Your merchant ID
      merchantTxnDtm: merchantTxnDtm,
      submissionMode: "B", // default value
      paymentType: "SALE", // default value
      paymentMode: "", // default value
      clientType: "W", // default value
      currencyCode: "SGD", // default value
      merchantTimeZone: "+8:00", // default value
      netsMidIndicator: "U" // default value
    }
  };

  // Step 2: Generate MAC value of txnReq
  const macValue = generateHMAC(txnReq);

  return {
    txnReq: txnReq,
    keyId: NETS_CONFIG.apiKey,
    macValue: macValue,
    merchantTxnRef: merchantTxnRef,
    merchantTxnDtm: merchantTxnDtm
  };
};

// Make API request to NETS
const makeNetsRequest = async (endpoint, payload) => {
  try {
    const headers = getHeaders();
    const signature = generateHMAC(payload);
    headers['signature'] = signature;

    console.log('Making NETS API request to:', `${NETS_CONFIG.baseUrl}${endpoint}`);
    console.log('Payload:', payload);
    console.log('Headers:', headers);

    const response = await axios.post(`${NETS_CONFIG.baseUrl}${endpoint}`, payload, { headers });
    console.log('NETS API response:', response.data);
    return response.data;
  } catch (error) {
    console.error('NETS API Error:', error.response?.data || error.message);
    console.error('Full error:', error);
    throw error;
  }
};

module.exports = {
  NETS_CONFIG,
  PAYMENT_METHODS,
  createPaymentPayload,
  createNetsQrPayload,
  makeNetsRequest,
  generateTxnId,
  generateRetrievalRef,
  getHeaders,
  generateHMAC
};
