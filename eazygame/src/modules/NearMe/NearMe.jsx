import React, { useState, useEffect } from 'react';
import styles from './NearMe.module.css';
import netsLogo from '../../assets/nets-40.png';
import UserIcon from '../../components/UserIcon/UserIcon';
import BalanceDetailsModal from '../../components/BalanceDetailsModal/BalanceDetailsModal';
import TransactionsModal from '../../components/TransactionsModal/TransactionsModal';
import VoucherModal from '../../components/VoucherModal/VoucherModal';
import PaymentGateway from '../../components/PaymentGateway/PaymentGateway';
import API_BASE_URL from '../../config.js';

import coffeeIcon from '../../assets/coffee.jpg';
import burgerIcon from '../../assets/burger.jpg';
import cakeIcon from '../../assets/cake.jpg';   

export default function NearMe({ isSignedIn, user, onProfileClick, cards, setCards, onTabChange, onSignOut, onShowAuthModal, userVouchers = 0, onVoucherUse = null }) {
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('cafe');
  const [selectedCategoryType, setSelectedCategoryType] = useState('cafe');
  const [showBalanceDetailsModal, setShowBalanceDetailsModal] = useState(false);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [voucherHistory, setVoucherHistory] = useState([]);
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [paymentItems, setPaymentItems] = useState([]);

  // Calculate total balance from cards
  const totalBalance = cards && Array.isArray(cards)
    ? cards.reduce((sum, card) => sum + (Number(card.balance) || 0), 0)
    : 0;

  // Fetch transactions
  const fetchTransactions = async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/transactions?user_id=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  // Fetch nearby places from Google Places API
  const fetchNearbyPlaces = async (latitude, longitude, type = 'restaurant') => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:3002/api/places/nearby?lat=${latitude}&lng=${longitude}&type=${type}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch nearby places');
      }
      
      const data = await response.json();
      console.log('API response data:', data);
      const places = data.places || [];
      console.log('Places from API:', places);
      
      // Ensure all places have the necessary properties for food ordering
      const enhancedPlaces = places.map(place => {
        console.log('Processing place:', place.name);
        console.log('Place image from backend:', place.image);
        
        // Use the image directly from the backend response
        // The backend already creates the full Google Places photo URL
        let placeImage = place.image || burgerIcon;
        
        // If the backend didn't provide an image, fall back to local icon
        if (!place.image || place.image === '🍽️') {
          placeImage = burgerIcon;
        }
        
        return {
          ...place,
          foodItems: place.foodItems || [
            { 
              name: `${place.name} Special`, 
              price: 15.00, 
              image: placeImage 
            }
          ],
          image: placeImage,
          category: place.category || 'restaurant',
          rating: place.rating || 4.0,
          distance: place.distance || '1km',
          deliveryTime: place.deliveryTime || '20-30 min',
          priceRange: place.priceRange || '$$'
        };
      });
      
      setNearbyPlaces(enhancedPlaces);
    } catch (error) {
      console.error('Error fetching nearby places:', error);
      // Fallback to mock data if API fails
      setNearbyPlaces([
        {
          id: 1,
          name: 'Bok\'s Kitchen by Hidden Chefs',
          category: 'cafe',
          rating: 4.5,
          distance: '1km',
          deliveryTime: '11-26 min',
          image: burgerIcon,
          priceRange: '$$',
          foodItems: [
            { name: 'Signature Burger', price: 18.90, image: burgerIcon },
            { name: 'Truffle Fries', price: 8.50, image: burgerIcon },
            { name: 'Chicken Wings', price: 12.80, image: burgerIcon }
          ]
        },
        {
          id: 2,
          name: 'Food Master',
          category: 'cafe',
          rating: 4.0,
          distance: '1km',
          deliveryTime: '23-31 min',
          image: burgerIcon,
          priceRange: '$',
          foodItems: [
            { name: 'Classic Burger', price: 12.50, image: burgerIcon },
            { name: 'Cheese Fries', price: 6.80, image: burgerIcon },
            { name: 'Grilled Chicken', price: 15.90, image: burgerIcon }
          ]
        },
        {
          id: 3,
          name: 'Cafe 276',
          category: 'cafe',
          rating: 3.7,
          distance: '1km',
          deliveryTime: '24-32 min',
          image: coffeeIcon,
          priceRange: '$$',
          foodItems: [
            { name: 'Artisan Coffee', price: 6.50, image: coffeeIcon },
            { name: 'Croissant', price: 4.80, image: coffeeIcon },
            { name: 'Avocado Toast', price: 14.90, image: coffeeIcon }
          ]
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (userLocation) {
      fetchNearbyPlaces(userLocation.lat, userLocation.lng, selectedCategoryType);
    }
  }, [userLocation, selectedCategoryType]);

  // Fetch transactions on component mount
  useEffect(() => {
    if (user?.id) {
      fetchTransactions(user.id);
    }
  }, [user?.id]);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);
        },
        (error) => {
          console.log('Error getting location:', error);
          // Use default location (Singapore)
          setUserLocation({ lat: 1.3521, lng: 103.8198 });
        }
      );
    } else {
      setUserLocation({ lat: 1.3521, lng: 103.8198 });
    }
  };

  const handleOrder = (place) => {
    console.log('Ordering from place:', place);
    
    if (!place || !place.name) {
      console.error('Invalid place data:', place);
      alert('Error: Invalid restaurant data. Please try again.');
      return;
    }
    
    setSelectedFood(place);
    
    // Set up payment items for the selected food with fallback values
    const defaultPrice = place.foodItems?.[0]?.price || 15.00; // Fallback price if no food items
    const defaultImage = place.image || burgerIcon; // Fallback image
    
    console.log('Setting payment items:', {
      name: place.name,
      price: defaultPrice,
      image: defaultImage
    });
    
    setPaymentItems([{
      name: place.name,
      price: defaultPrice,
      image: defaultImage
    }]);
    setShowPaymentGateway(true);
  };

  const handlePaymentSuccess = async (paymentData) => {
    console.log('=== FOOD PAYMENT SUCCESS DEBUG ===');
    console.log('Payment data received:', paymentData);
    console.log('Selected food:', selectedFood);
    console.log('Payment items:', paymentItems);
    console.log('User ID:', user?.id);
    
    // Create transaction record for the successful food order
    try {
      const userId = user?.id;
      if (!userId) {
        console.error('No user ID found');
        return;
      }

      // Determine payment method and transaction details
      let paymentMethod = 'Unknown';
      let transactionName = selectedFood?.name || 'Food Order';
      
      if (paymentData.method === 'ENETS') {
        paymentMethod = 'eNETS Payment';
        transactionName = `${selectedFood?.name || 'Food Order'} (ENETS)`;
        console.log('Processing ENETS payment for:', transactionName);
      } else if (paymentData.method === 'ENETS_QR') {
        paymentMethod = 'NETS QR Payment';
        transactionName = `${selectedFood?.name || 'Food Order'} (NETS QR)`;
        console.log('Processing NETS QR payment for:', transactionName);
      } else if (paymentData.method === 'NETS_PREPAID') {
        paymentMethod = 'NETS Prepaid Card';
        transactionName = `${selectedFood?.name || 'Food Order'} (Prepaid Card)`;
        console.log('Processing NETS Prepaid payment for:', transactionName);
      }

      // Create transaction record
      const transactionData = {
        user_id: userId,
        card_id: paymentData.method === 'NETS_PREPAID' ? paymentData.cardId : null,
        name: transactionName,
        amount: -(paymentItems[0]?.price || 0), // Negative amount for expense
        type: 'expense'
      };
      
      console.log('=== TRANSACTION CREATION DEBUG ===');
      console.log('Transaction data to send:', transactionData);
      console.log('API endpoint:', `${API_BASE_URL}/api/transactions`);
      
      const transactionResponse = await fetch(`${API_BASE_URL}/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionData)
      });
      
      console.log('Transaction API response status:', transactionResponse.status);
      console.log('Transaction API response ok:', transactionResponse.ok);

      if (transactionResponse.ok) {
        const transaction = await transactionResponse.json();
        console.log('Food transaction created successfully:', transaction);
        console.log('Transaction response status:', transactionResponse.status);
        console.log('Transaction response headers:', transactionResponse.headers);
        
        // Refresh transactions to show the new one
        fetchTransactions(userId);
        
        // Close payment gateway
        setShowPaymentGateway(false);
        setSelectedFood(null);
        setPaymentItems([]);
        
        alert(`Order successful! Your food from ${selectedFood?.name} will be delivered soon.`);
      } else {
        const errorText = await transactionResponse.text();
        console.error('Failed to create food transaction. Status:', transactionResponse.status);
        console.error('Error response:', errorText);
        alert('Payment successful but failed to create transaction record. Please contact support.');
      }
    } catch (error) {
      console.error('Error creating food transaction:', error);
      alert('Payment successful but failed to create transaction record. Please contact support.');
    }
  };

  const handlePaymentFailure = (paymentData) => {
    console.log('Food payment failed:', paymentData);
    alert('Payment failed. Please try again.');
    setShowPaymentGateway(false);
  };

  const categories = [
    { key: 'cafe', label: 'Cafes', icon: coffeeIcon, type: 'cafe' },
    { key: 'fastfood', label: 'Fast Food', icon: burgerIcon, type: 'restaurant' },
    { key: 'desserts', label: 'Desserts', icon: cakeIcon, type: 'restaurant' }
  ];

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
              onClick={() => setShowVoucherModal(true)}
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
        <nav className={styles.tabs}>
          <span className={styles.tab + ' ' + styles.active}>Near Me</span>
        </nav>

        

        {/* Categories */}
        <section className={styles.categoriesSection}>
          <div className={styles.categoriesRow}>
                         {categories.map(cat => (
               <button
                 key={cat.key}
                 className={selectedCategory === cat.key ? styles.categoryActive : styles.categoryBtn}
                 onClick={() => {
                   setSelectedCategory(cat.key);
                   setSelectedCategoryType(cat.type);
                 }}
               >
                 <img src={cat.icon} alt={cat.label} className={styles.categoryIcon} />
                 <span className={styles.categoryLabel}>{cat.label}</span>
               </button>
             ))}
          </div>
        </section>

        {/* Nearby Places */}
        <section className={styles.placesSection}>
          <div className={styles.placesTitle}>Nearby Places</div>
          <div className={styles.placesList}>
            {loading ? (
              <div className={styles.loadingState}>
                <div className={styles.loadingSpinner}></div>
                <div className={styles.loadingText}>Finding nearby places...</div>
              </div>
            ) : (
              nearbyPlaces.map(place => (
              <div key={place.id} className={styles.placeCard}>
                                 <div className={styles.placeImage}>
                   {place.image ? (
                     <img 
                       src={place.image} 
                       alt={place.name} 
                       className={styles.placePhoto}
                       onError={(e) => {
                         e.target.style.display = 'none';
                         e.target.nextSibling.style.display = 'flex';
                       }}
                     />
                   ) : null}
                   <div className={styles.placeEmoji} style={{ display: place.image ? 'none' : 'flex' }}>
                     {place.emoji || '🍽️'}
                   </div>
                 </div>
                <div className={styles.placeInfo}>
                  <div className={styles.placeName}>{place.name}</div>
                  <div className={styles.placeCategory}>{place.category}</div>
                  <div className={styles.placeDetails}>
                    <span className={styles.rating}>⭐ {place.rating}</span>
                    <span className={styles.distance}>📍 {place.distance}</span>
                    <span className={styles.deliveryTime}>🕒 {place.deliveryTime}</span>
                  </div>
                  <div className={styles.priceRange}>{place.priceRange}</div>
                </div>
                <button 
                  className={styles.orderBtn}
                  onClick={() => handleOrder(place)}
                >
                  Order
                </button>
              </div>
            ))
            )}
          </div>
        </section>
      </div>

      {/* Balance Details Modal */}
      <BalanceDetailsModal 
        open={showBalanceDetailsModal} 
        onClose={() => setShowBalanceDetailsModal(false)} 
        cards={cards} 
        totalBalance={totalBalance} 
      />

      {/* Transactions Modal */}
            <TransactionsModal 
        open={showTransactionsModal} 
        onClose={() => setShowTransactionsModal(false)} 
        transactions={transactions}
        cards={cards} 
      />

      {/* Voucher Modal */}
      <VoucherModal
        open={showVoucherModal}
        onClose={() => setShowVoucherModal(false)}
        userVouchers={userVouchers}
        voucherHistory={voucherHistory}
      />

      {/* Payment Gateway for Food Orders */}
      <PaymentGateway
        open={showPaymentGateway}
        onClose={() => setShowPaymentGateway(false)}
        amount={paymentItems[0]?.price || 0}
        items={paymentItems}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentFailure={handlePaymentFailure}
        userVouchers={userVouchers}
        onVoucherUse={onVoucherUse}
        cards={cards}
      />

    </div>
  );
}
