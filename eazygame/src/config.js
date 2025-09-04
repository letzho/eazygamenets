const API_BASE_URL = import.meta.env?.PROD
  ? '' // same-origin in production -> https://eazygamenets-.../api/...
  : 'http://localhost:3002'; // local dev

export default API_BASE_URL;









