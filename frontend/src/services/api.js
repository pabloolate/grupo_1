import axios from 'axios';
import { obtenerToken } from '../utils/auth.js';

export const API_URLS = {
  auth: import.meta.env.VITE_AUTH_API || 'http://localhost:8081',
  reclamos: import.meta.env.VITE_RECLAMOS_API || 'http://localhost:8082',
  integracion: import.meta.env.VITE_INTEGRACION_API || 'http://localhost:8083',
  reporteria: import.meta.env.VITE_REPORTERIA_API || 'http://localhost:8084',
};

export function crearClienteApi(baseURL) {
  const cliente = axios.create({ baseURL, timeout: 15000 });

  cliente.interceptors.request.use((config) => {
    const token = obtenerToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  return cliente;
}

export const authApi = crearClienteApi(API_URLS.auth);
export const reclamosApi = crearClienteApi(API_URLS.reclamos);
export const integracionApi = crearClienteApi(API_URLS.integracion);
export const reporteriaApi = crearClienteApi(API_URLS.reporteria);
