// Force cache refresh - Config v4.0
console.log('Config v4.0 loaded at:', new Date().toISOString());

// More robust environment detection
const isProduction = import.meta.env.PROD || 
                     window.location.hostname.includes('herokuapp.com') ||
                     window.location.hostname.includes('netlify.app') ||
                     window.location.hostname.includes('vercel.app') ||
                     window.location.hostname !== 'localhost';

// Get API URL from environment or use fallback
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
                     (isProduction 
                       ? window.location.origin  // Use current origin for production
                       : 'http://localhost:3002');

console.log('API_BASE_URL:', API_BASE_URL);
console.log('isProduction:', isProduction);
console.log('Current hostname:', window.location.hostname);
console.log('Full URL:', window.location.href);
console.log('Vite env PROD:', import.meta.env.PROD);
console.log('VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);

export default API_BASE_URL;









