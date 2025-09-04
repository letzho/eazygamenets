// Use window.location to detect if we're on Heroku
const isProduction = window.location.hostname === 'eazygamenets-3d29b52fe934.herokuapp.com';

const API_BASE_URL = isProduction
  ? 'https://eazygamenets-3d29b52fe934.herokuapp.com'
  : 'http://localhost:3002';

console.log('API_BASE_URL:', API_BASE_URL, 'isProduction:', isProduction);

export default API_BASE_URL;









