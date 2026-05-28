import axios from 'axios'
import useAuthStore from '@/store/authStore'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
  withCredentials: false,
})

// Interceptor: adjunta token
api.interceptors.request.use(config => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Interceptor: manejo de errores
api.interceptors.response.use(
  response => response,
  error => {
    const status = error.response?.status
    if (status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    } else if (status === 403) {
      toast.error('Sin permisos para esta acción.')
    } else if (status === 422) {
      const errors = error.response?.data?.errors
      if (errors) Object.values(errors).flat().forEach(m => toast.error(m))
      else toast.error(error.response?.data?.message || 'Error de validación.')
    } else if (status === 500) {
      toast.error('Error interno del servidor. Intenta nuevamente.')
    }
    return Promise.reject(error)
  }
)

/** AUTH */
export const authApi = {
  login:          (data)    => api.post('/login', data),
  logout:         ()        => api.post('/logout'),
  me:             ()        => api.get('/me'),
  cambiarPassword:(data)    => api.put('/me/password', data),
}

/** DASHBOARD */
export const dashboardApi = {
  resumen:        ()        => api.get('/dashboard'),
  graficaVentas:  ()        => api.get('/dashboard/sales-chart'),
  topProductos:   (dias)    => api.get('/dashboard/top-products', { params: { dias } }),
  metodosPago:    ()        => api.get('/dashboard/payment-methods'),
}

/** PRODUCTOS */
export const productosApi = {
  listar:         (params)  => api.get('/products', { params }),
  buscar:         (q)       => api.get('/products/search', { params: { q } }),
  obtener:        (id)      => api.get(`/products/${id}`),
  crear:          (data)    => api.post('/products', data),
  actualizar:     (id,data) => api.put(`/products/${id}`, data),
  eliminar:       (id)      => api.delete(`/products/${id}`),
  stockBajo:      ()        => api.get('/products/low-stock'),
  ajustar:        (id,data) => api.post(`/products/${id}/adjust`, data),
}

/** CATEGORÍAS */
export const categoriasApi = {
  listar:         ()        => api.get('/categories'),
  crear:          (data)    => api.post('/categories', data),
  actualizar:     (id,data) => api.put(`/categories/${id}`, data),
  eliminar:       (id)      => api.delete(`/categories/${id}`),
}

/** MARCAS */
export const marcasApi = {
  listar:         ()        => api.get('/brands'),
  crear:          (data)    => api.post('/brands', data),
}

/** PROVEEDORES */
export const proveedoresApi = {
  listar:         (params)  => api.get('/suppliers', { params }),
  obtener:        (id)      => api.get(`/suppliers/${id}`),
  crear:          (data)    => api.post('/suppliers', data),
  actualizar:     (id,data) => api.put(`/suppliers/${id}`, data),
  eliminar:       (id)      => api.delete(`/suppliers/${id}`),
}

/** VENTAS */
export const ventasApi = {
  listar:         (params)  => api.get('/sales', { params }),
  crear:          (data)    => api.post('/sales', data),
  obtener:        (id)      => api.get(`/sales/${id}`),
  anular:         (id,data) => api.post(`/sales/${id}/cancel`, data),
}

/** CLIENTES */
export const clientesApi = {
  listar:         (params)  => api.get('/customers', { params }),
  buscar:         (q)       => api.get('/customers', { params: { buscar: q } }),
  obtener:        (id)      => api.get(`/customers/${id}`),
  crear:          (data)    => api.post('/customers', data),
  actualizar:     (id,data) => api.put(`/customers/${id}`, data),
  eliminar:       (id)      => api.delete(`/customers/${id}`),
  morosos:        ()        => api.get('/customers/morosos'),
}

/** CRÉDITOS */
export const creditosApi = {
  listar:         (params)  => api.get('/credits', { params }),
  resumen:        ()        => api.get('/credits/summary'),
  obtener:        (id)      => api.get(`/credits/${id}`),
  crear:          (data)    => api.post('/credits', data),
  abonar:         (id,data) => api.post(`/credits/${id}/payment`, data),
  vencidos:       ()        => api.get('/credits/overdue'),
  ver:            (id)      => api.get(`/credits/${id}`),
}

/** CAJA */
export const cajaApi = {
  actual:              ()     => api.get('/cash/current'),
  abrir:               (data) => api.post('/cash/open', data),
  cerrar:              (data) => api.post('/cash/close', data),
  registrarMovimiento: (data) => api.post('/cash/movement', data),
  historial:           ()     => api.get('/cash'),
}

/** GASTOS */
export const gastosApi = {
  listar:         (params)  => api.get('/expenses', { params }),
  crear:          (data)    => api.post('/expenses', data),
  eliminar:       (id)      => api.delete(`/expenses/${id}`),
  resumen:        (params)  => api.get('/expenses/summary', { params }),
}

/** REPORTES */
export const reportesApi = {
  ventas:         (params)  => api.get('/reports/sales', { params }),
  inventario:     ()        => api.get('/reports/inventory'),
  cartera:        ()        => api.get('/reports/credits'),
  topProductos:   (dias)    => api.get('/reports/top-products', { params: { dias } }),
  balance:        (params)  => api.get('/reports/balance', { params }),
}

export default api