/**
 * STORE: AUTENTICACIÓN — ZUSTAND
 *
 * Estado global de la sesión del usuario.
 * Persiste el token y usuario en localStorage.
 *
 * Se usa en toda la app con: const { user, login, logout } = useAuthStore()
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      // ─── ESTADO ───────────────────────────────────
      user:          null,    // Datos del usuario autenticado
      token:         null,    // Token Sanctum
      isLoading:     false,
      isAuthenticated: false,

      // ─── ACCIONES ─────────────────────────────────

      /**
       * LOGIN
       * Llama al API, guarda token y usuario en estado y localStorage.
       */
      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await authApi.login({ email, password });

          // Guardar token en localStorage para el interceptor de Axios
          localStorage.setItem('token', data.token);

          set({
            user:            data.user,
            token:           data.token,
            isAuthenticated: true,
            isLoading:       false,
          });

          return { success: true, user: data.user };
        } catch (error) {
          set({ isLoading: false });
          return {
            success: false,
            error: error.response?.data?.message || 'Error al iniciar sesión',
          };
        }
      },

      /**
       * LOGOUT
       * Revoca el token en el servidor y limpia el estado local.
       */
      logout: async () => {
        try {
          await authApi.logout();
        } catch (e) {
          // Si falla (token ya expirado), igual limpiamos
        } finally {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          set({
            user:            null,
            token:           null,
            isAuthenticated: false,
          });
        }
      },

      /**
       * REFRESCAR PERFIL
       * Actualiza los datos del usuario desde el servidor.
       */
      refreshUser: async () => {
        try {
          const { data } = await authApi.me();
          set({ user: data.user, isAuthenticated: true });
        } catch (e) {
          get().logout();
        }
      },

      // ─── HELPERS ──────────────────────────────────
      esAdmin:       () => get().user?.role === 'admin',
      esCajero:      () => get().user?.role === 'cajero',
      esSupervisor:  () => ['admin', 'supervisor'].includes(get().user?.role),
      puedeVerReportes: () => get().user?.permisos?.puede_ver_reportes ?? false,
    }),

    {
      name: 'tienda-auth',          // Clave en localStorage
      partialize: (state) => ({     // Solo persistir estos campos
        user:            state.user,
        token:           state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
