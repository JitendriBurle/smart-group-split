import axios from 'axios';
import { auth } from '../firebase';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000, // 15s timeout — fail fast instead of hanging forever
});

// ── Token Cache ──────────────────────────────────────────────────────────────
// Firebase ID tokens are valid for 1 hour. We cache them to avoid a round-trip
// to Google's auth servers on every single API request (~200-500ms saved each time).
let cachedToken = null;
let tokenExpiresAt = 0; // epoch ms

const getToken = async () => {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 5 * 60 * 1000) {
    return cachedToken; // Still valid — serve from cache instantly
  }
  const currentUser = auth.currentUser;
  if (!currentUser) return null;
  // getIdToken(false) = use Firebase's own in-memory token cache, no network call.
  // getIdToken(true)  = force a network refresh (only needed near expiry).
  const forceRefresh = !!cachedToken && now >= tokenExpiresAt - 5 * 60 * 1000;
  cachedToken = await currentUser.getIdToken(forceRefresh);
  tokenExpiresAt = now + 55 * 60 * 1000; // 55 minutes
  return cachedToken;
};

// Clear cache on sign-out so the next user always gets a fresh token
auth.onAuthStateChanged((user) => {
  if (!user) {
    cachedToken = null;
    tokenExpiresAt = 0;
  }
});

// Add cached token to every request header
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const groupService = {
  create:  (data)   => api.post('/groups', data),
  getAll:  ()       => api.get('/groups'),
  getById: (id)     => api.get(`/groups/${id}`),
  update:  (id, data) => api.put(`/groups/${id}`, data),
  delete:  (id)     => api.delete(`/groups/${id}`),
};

export const expenseService = {
  add:        (data)    => api.post('/expenses', data),
  getByGroup: (groupId) => api.get(`/expenses/${groupId}`),
  update:     (id, data) => api.put(`/expenses/${id}`, data),
  delete:     (id)      => api.delete(`/expenses/${id}`),
};

export const balanceService = {
  getBalances: (groupId) => api.get(`/balances/${groupId}`),
};

export default api;
