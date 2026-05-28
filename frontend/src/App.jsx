/**
 * APP.JSX — ENTRADA PRINCIPAL
 *
 * Configura:
 * - React Router con rutas protegidas por rol
 * - Toast notifications (react-hot-toast)
 * - QueryClient para caché de datos (TanStack Query)
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useAuthStore from './store/authStore';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Páginas públicas
import LoginPage from './pages/auth/LoginPage';

// Páginas protegidas
import DashboardPage    from './pages/dashboard/DashboardPage';
import ProductosPage    from './pages/inventory/ProductosPage';
import ProductoForm     from './pages/inventory/ProductoForm';
import POSPage          from './pages/sales/POSPage';
import VentasPage       from './pages/sales/VentasPage';
import CreditosPage     from './pages/credits/CreditosPage';
import CreditoDetalle   from './pages/credits/CreditoDetalle';
import ClientesPage     from './pages/customers/ClientesPage';
import ClienteDetalle   from './pages/customers/ClienteDetalle';
import CajaPage         from './pages/cash/CajaPage';
import GastosPage from './pages/cash/GastosPage';
import ReportesPage     from './pages/reports/ReportesPage';

// QueryClient configurado para el sistema
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:   1000 * 60 * 2, // 2 minutos de caché
      retry:       1,
      refetchOnWindowFocus: false,
    },
  },
});

// ─────────────────────────────────────────────────────────────
// COMPONENTE: RUTA PROTEGIDA
// Redirige al login si no hay sesión activa
// ─────────────────────────────────────────────────────────────
function PrivateRoute({ children, roles }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Verificar rol si se especificó
  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>

        {/* Notificaciones toast globales */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              borderRadius: '8px',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />

        <Routes>
          {/* ── RUTAS PÚBLICAS ── */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* ── RUTAS PROTEGIDAS (dentro del layout principal) ── */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <DashboardLayout />
              </PrivateRoute>
            }
          >
            {/* Dashboard principal */}
            <Route path="dashboard" element={<DashboardPage />} />

            {/* Inventario */}
            <Route path="productos"        element={<ProductosPage />} />
            <Route path="productos/nuevo"  element={<ProductoForm />} />
            <Route path="productos/:id"    element={<ProductoForm />} />

            {/* POS y Ventas */}
            <Route path="pos"    element={<POSPage />} />
            <Route path="ventas" element={<VentasPage />} />

            {/* Créditos y Fiados */}
            <Route path="creditos"     element={<CreditosPage />} />
            <Route path="creditos/:id" element={<CreditoDetalle />} />

            {/* Clientes */}
            <Route path="clientes"     element={<ClientesPage />} />
            <Route path="clientes/:id" element={<ClienteDetalle />} />

            {/* Caja */}
            <Route path="caja"   element={<CajaPage />} />
            <Route path="gastos" element={<GastosPage />} />

            {/* Reportes — solo admin y supervisor */}
            <Route
              path="reportes"
              element={
                <PrivateRoute roles={['admin', 'supervisor']}>
                  <ReportesPage />
                </PrivateRoute>
              }
            />
          </Route>

          {/* 404 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>

      </BrowserRouter>
    </QueryClientProvider>
  );
}
