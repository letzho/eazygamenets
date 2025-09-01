import React, { useEffect, useRef } from 'react';
import styles from './NetsPaymentPage.module.css';

export default function NetsPaymentPage({ 
  txnReq, 
  keyId, 
  hmac, 
  onPaymentComplete, 
  onPaymentError 
}) {
  const formRef = useRef(null);

  useEffect(() => {
    // Load NETS JavaScript plugin
    const loadNetsScripts = () => {
             // Load jQuery
       const jqueryScript = document.createElement('script');
       jqueryScript.src = 'https://sandbox.nets.openapipaas.com/js/jquery-3.1.1.min.js';
       jqueryScript.type = 'text/javascript';
       document.head.appendChild(jqueryScript);

       // Load NETS environment
       const envScript = document.createElement('script');
       envScript.src = 'https://sandbox.nets.openapipaas.com/pluginpages/env.jsp';
       envScript.type = 'text/javascript';
       document.head.appendChild(envScript);

       // Load NETS apps
       const appsScript = document.createElement('script');
       appsScript.src = 'https://sandbox.nets.openapipaas.com/js/apps.js';
      appsScript.type = 'text/javascript';
      appsScript.onload = () => {
        // Initialize NETS payment when scripts are loaded
        initializeNetsPayment();
      };
      document.head.appendChild(appsScript);
    };

    const initializeNetsPayment = () => {
      if (window.sendPayLoad && txnReq && keyId && hmac) {
        try {
          // Call NETS sendPayLoad function
          window.sendPayLoad(txnReq, hmac, keyId);
        } catch (error) {
          console.error('NETS payment initialization error:', error);
          onPaymentError?.(error);
        }
      }
    };

    loadNetsScripts();

         // Cleanup function
     return () => {
       // Remove scripts when component unmounts
       const scripts = document.querySelectorAll('script[src*="sandbox.nets.openapipaas.com"]');
       scripts.forEach(script => script.remove());
     };
  }, [txnReq, keyId, hmac, onPaymentError]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>NETS Payment</h2>
        <p>Please complete your payment using NETS</p>
      </div>

      {/* Hidden form with NETS required fields */}
      <form ref={formRef} style={{ display: 'none' }}>
        <input 
          type="hidden" 
          id="txnReq" 
          name="txnReq" 
          value={txnReq} 
        />
        <input 
          type="hidden" 
          id="keyId" 
          name="keyId" 
          value={keyId} 
        />
        <input 
          type="hidden" 
          id="hmac" 
          name="hmac" 
          value={hmac} 
        />
      </form>

      {/* NETS payment interface will be loaded here */}
      <div id="anotherSection" className={styles.netsSection}>
        <fieldset>
          <div id="ajaxResponse" className={styles.responseArea}>
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Loading NETS payment interface...</p>
            </div>
          </div>
        </fieldset>
      </div>

      <div className={styles.info}>
        <p>This payment is processed securely by NETS</p>
        <p>You will be redirected to complete your payment</p>
      </div>
    </div>
  );
}

