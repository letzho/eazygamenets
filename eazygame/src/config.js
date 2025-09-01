// API Configuration
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://netseazygame-0dd1ff80b2d1.herokuapp.com'  // Heroku backend URL
  : 'http://localhost:3002';  // Local development

export default API_BASE_URL;






