import React, { useState, useEffect } from 'react';
import TabBar from './components/TabBar/TabBar';
import Home from './modules/Home/Home';
import ScanQR from './modules/ScanQR/ScanQR';
import Merchants from './modules/Merchants/Merchants';
import Cards from './modules/Cards/Cards';
import NearMe from './modules/NearMe/NearMe';
import AIEaze from './modules/AIEaze/AIEaze';
import Modal from './components/Modal/Modal';
import { signIn, signUp, signOut, getCurrentUser, updateCurrentUserData, deleteCurrentUser } from './userStore';
import API_BASE_URL from './config.js';
import './App.css';
// Import icons using dynamic imports to ensure proper bundling
const homeIcon = new URL('./assets/home.png', import.meta.url).href;
const merchantsIcon = new URL('./assets/merchant.png', import.meta.url).href;
const cameraIcon = new URL('./assets/camera1.png', import.meta.url).href;
const nearmeIcon = new URL('./assets/nearme.png', import.meta.url).href;
const aieazeIcon = new URL('./assets/aieaze.png', import.meta.url).href;

const TABS = [
  { key: 'home', label: 'Home', icon: homeIcon },
  { key: 'merchants', label: 'Shop', icon: merchantsIcon },
  { key: 'scanqr', label: 'Scan QR', icon: cameraIcon },
  { key: 'nearme', label: 'Near Me', icon: nearmeIcon },
  { key: 'aieaze', label: 'AI Eaze', icon: aieazeIcon },
];

// Debug logging
console.log('TABS configuration:', TABS);
console.log('homeIcon:', homeIcon);
console.log('merchantsIcon:', merchantsIcon);
console.log('nearmeIcon:', nearmeIcon);
console.log('aieazeIcon:', aieazeIcon);

export default function App() {
  const [tab, setTab] = useState('home');
  const [isSignedIn, setIsSignedIn] = useState(() => !!getCurrentUser());
  const [user, setUser] = useState(() => getCurrentUser()?.user || null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [authMode, setAuthMode] = useState('signin'); // 'signin' or 'signup'
  const [authError, setAuthError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // Shared card state
  const [cards, setCards] = useState([]);
  // Shared voucher state
  const [userVouchers, setUserVouchers] = useState(0);

  console.log('App component rendering, current tab:', tab);

  useEffect(() => {
    if (isSignedIn && user) updateCurrentUserData(user);
  }, [user, isSignedIn]);

  useEffect(() => {
    const userId = getCurrentUser();
    if (isSignedIn && userId) {
              fetch(`${API_BASE_URL}/api/cards?user_id=${userId}`)
        .then(res => res.json())
        .then(data => setCards(data));
    } else {
      setCards([]);
    }
  }, [isSignedIn, user]);

  useEffect(() => {
    const userId = getCurrentUser();
    if (isSignedIn && userId) {
      fetch(`${API_BASE_URL}/api/users/${userId}`)
        .then(res => res.json())
        .then(data => setUser(data));
      
      // Load user vouchers from database
      fetch(`${API_BASE_URL}/api/vouchers/${userId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setUserVouchers(data.vouchers.quantity);
            console.log('User vouchers loaded in App:', data.vouchers.quantity);
          }
        })
        .catch(error => {
          console.error('Error loading user vouchers:', error);
        });
    }
  }, [isSignedIn]);

   function validatePassword(password) {
    if (password.length < 6) return 'Password must be at least 6 characters.';
    if (!/[a-zA-Z]/.test(password)) return 'Password must contain at least one letter.';
    if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
    return '';
  }

  const handleSignIn = async (username, password) => {
    const result = await signIn(username, password);
    if (result) {
      setUser({ ...result.user, name: result.user.username });
      setIsSignedIn(true);
      setShowProfileModal(false);
      setAuthError('');
    } else {
      setAuthError('Invalid username or password.');
    }
  };
  const handleSignUp = async (username, password) => {
    const validation = validatePassword(password);
    if (validation) {
      setAuthError(validation);
      return;
    }
    const result = await signUp(username, password);
    if (result) {
      setUser({ ...result.user, name: result.user.username });
      setIsSignedIn(true);
      setShowProfileModal(false);
      setAuthError('');
    } else {
      setAuthError('User already exists with that username and password.');
    }
  };
  const handleSignOut = () => {
    signOut();
    setIsSignedIn(false);
    setUser(null);
    setShowProfileModal(false);
  };
  const handleDeleteAccount = () => {
    deleteCurrentUser();
    setIsSignedIn(false);
    setUser(null);
    setShowProfileModal(false);
    setShowDeleteConfirm(false);
  };
  // Pass updateUser to children for data changes
  const updateUser = (newUser) => setUser(newUser);

  const handleVoucherUse = (vouchersUsed) => {
    setUserVouchers(prev => prev - vouchersUsed);
  };

  const handleTabChange = (newTab) => {
    console.log('Tab changing from', tab, 'to', newTab);
    setTab(newTab);
  };
  return (
    <div className="app-bg">
      <div className="app-container">
        <div className="app-content">
          {tab === 'home' && <Home isSignedIn={isSignedIn} user={user} cards={cards} setCards={setCards} onProfileClick={() => setShowProfileModal(true)} onTabChange={handleTabChange} userVouchers={userVouchers} setUserVouchers={setUserVouchers} onVoucherUse={handleVoucherUse} />}
          {tab === 'scanqr' && <ScanQR isSignedIn={isSignedIn} user={user} cards={cards} setCards={setCards} onProfileClick={() => setShowProfileModal(true)} />}
          {tab === 'merchants' && <Merchants isSignedIn={isSignedIn} user={user} cards={cards} setCards={setCards} onProfileClick={() => setShowProfileModal(true)} userVouchers={userVouchers} onVoucherUse={handleVoucherUse} />}
          {tab === 'cards' && <Cards isSignedIn={isSignedIn} user={user} cards={cards} setCards={setCards} onProfileClick={() => setShowProfileModal(true)} />}
          {tab === 'nearme' && <NearMe isSignedIn={isSignedIn} user={user} cards={cards} setCards={setCards} onProfileClick={() => setShowProfileModal(true)} userVouchers={userVouchers} onVoucherUse={handleVoucherUse} />}
          {tab === 'aieaze' && <AIEaze isSignedIn={isSignedIn} user={user} cards={cards} setCards={setCards} onProfileClick={() => setShowProfileModal(true)} userVouchers={userVouchers} onVoucherUse={handleVoucherUse} />}
        </div>
        <TabBar tabs={TABS} activeTab={tab} onTabChange={handleTabChange} />
      </div>
      <Modal open={showProfileModal} onClose={() => setShowProfileModal(false)}>
        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>👤</div>
          {isSignedIn ? (
            <>
              <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '1.2rem' }}>Signed in as {user?.name || 'User'}</div>
              <button style={{ background: '#e14a4a', color: '#fff', border: 'none', borderRadius: 10, padding: '0.7rem 1.5rem', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', marginRight: 8 }} onClick={handleSignOut}>Sign Out</button>
              <button style={{ background: '#fff', color: '#e14a4a', border: '1.5px solid #e14a4a', borderRadius: 10, padding: '0.7rem 1.5rem', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }} onClick={() => setShowDeleteConfirm(true)}>Delete Account</button>
            </>
          ) : (
            <>
              <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '1.2rem' }}>
                {authMode === 'signin' ? 'Sign In' : 'Sign Up'}
              </div>
              <AuthForm
                mode={authMode}
                onSignIn={handleSignIn}
                onSignUp={handleSignUp}
                error={authError}
              />
              <div style={{ marginTop: '1rem', fontSize: '0.95rem' }}>
                {authMode === 'signin' ? (
                  <>Don&apos;t have an account? <button style={{ color: 'var(--primary)', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer' }} onClick={() => { setAuthMode('signup'); setAuthError(''); }}>Sign Up</button></>
                ) : (
                  <>Already have an account? <button style={{ color: 'var(--primary)', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer' }} onClick={() => { setAuthMode('signin'); setAuthError(''); }}>Sign In</button></>
                )}
              </div>
            </>
          )}
        </div>
      </Modal>
      <Modal open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}>
        <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
          <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '1.2rem' }}>Are you sure you want to delete your account?</div>
          <button style={{ background: '#e14a4a', color: '#fff', border: 'none', borderRadius: 10, padding: '0.7rem 1.5rem', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', marginRight: 8 }} onClick={handleDeleteAccount}>Yes, Delete</button>
          <button style={{ background: '#fff', color: '#222', border: '1.5px solid #888', borderRadius: 10, padding: '0.7rem 1.5rem', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }} onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
        </div>
      </Modal>
    </div>
  );
}

function AuthForm({ mode, onSignIn, onSignUp, error }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        if (mode === 'signin') onSignIn(username, password);
        else onSignUp(username, password);
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}
    >
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={e => setUsername(e.target.value)}
        style={{ padding: '0.7rem 1rem', borderRadius: 8, border: '1.5px solid #e0e0f0', fontSize: '1rem', width: 220 }}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={{ padding: '0.7rem 1rem', borderRadius: 8, border: '1.5px solid #e0e0f0', fontSize: '1rem', width: 220 }}
        required
      />
      {error && <div style={{ color: '#e14a4a', fontSize: '0.97rem', marginBottom: '-0.5rem' }}>{error}</div>}
      <button
        type="submit"
        style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 10, padding: '0.7rem 1.5rem', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', marginTop: '0.5rem' }}
      >
        {mode === 'signin' ? 'Sign In' : 'Sign Up'}
      </button>
    </form>
  );
} 
