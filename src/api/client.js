import axios from 'axios';
import { getToken } from '../crypto/keyStorage.js';
import { getApiUrl } from './baseUrl.js';

const client = axios.create({
  baseURL: getApiUrl(),
});

client.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;
