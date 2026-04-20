import axios from 'axios';
import { supabase } from '../supabase';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000, 
});

api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
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
