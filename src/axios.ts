import Axios from 'axios';

// Local backend API URL
const path = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const axios = Axios.create({
  baseURL: path,
  headers: {
    'Content-Type': 'application/json',
  },
});

// No authentication needed for local backend
// If you want to add authentication later, you can add it here

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export default axios;
