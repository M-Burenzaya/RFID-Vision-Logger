import axios from "axios";

// Use the environment variable REACT_APP_BACKEND_URL, fallback to localhost if not set
const api = axios.create({
  baseURL: "http://localhost:8000",  // Fallback to localhost if not set
});

export default api;
