import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Eye, EyeOff, ShoppingBag, Lock, Mail } from 'lucide-react'
import useAuthStore from '@/store/authStore'

/**
 * LoginPage
 * Pantalla de acceso al sistema TiendaApp.
 * Valida con react-hook-form y llama al store de Zustand.
 */
export default function LoginPage() {
  const navigate   = useNavigate()
  const { login }  = useAuthStore()
  const [showPwd, setShowPwd] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm()

  const onSubmit = async (data) => {
    try {
      await login(data.email, data.password)
      navigate('/dashboard')
    } catch (err) {
      const msg = err.response?.data?.message || 'Credenciales incorrectas.'
      toast.error(msg)
      setError('email', { message: '' })
      setError('password', { message: msg })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      {/* Card principal */}
      <div className="w-full max-w-md">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-2xl mb-4 shadow-lg">
            <ShoppingBag className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">TiendaApp</h1>
          <p className="text-blue-300 text-sm mt-1">Sistema de gestión para tiendas de barrio</p>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Iniciar sesión</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  {...register('email', {
                    required: 'El correo es obligatorio.',
                    pattern: { value: /^\S+@\S+\.\S+$/, message: 'Correo inválido.' },
                  })}
                  type="email"
                  placeholder="admin@tienda.com"
                  className={`input pl-10 ${errors.email ? 'border-red-400 focus:ring-red-400' : ''}`}
                  autoComplete="email"
                />
              </div>
              {errors.email?.message && (
                <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  {...register('password', { required: 'La contraseña es obligatoria.' })}
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={`input pl-10 pr-10 ${errors.password ? 'border-red-400 focus:ring-red-400' : ''}`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password?.message && (
                <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            {/* Botón */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-2.5 text-base"
            >
              {isSubmitting ? (
                <>
                  <span className="spinner w-4 h-4" />
                  Ingresando...
                </>
              ) : (
                'Ingresar al sistema'
              )}
            </button>
          </form>

          {/* Usuarios de prueba */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">
              Usuarios de prueba
            </p>
            <div className="grid grid-cols-1 gap-2 text-xs text-gray-500">
              {[
                { role: 'Admin',      email: 'admin@tienda.com',      pwd: 'admin123' },
                { role: 'Cajero',     email: 'cajero@tienda.com',     pwd: 'cajero123' },
                { role: 'Supervisor', email: 'supervisor@tienda.com', pwd: 'super123' },
              ].map(u => (
                <button
                  key={u.email}
                  type="button"
                  onClick={() => {
                    document.querySelector('input[type="email"]').value = u.email
                    // Llenar vía form
                  }}
                  className="flex justify-between items-center p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition text-left"
                >
                  <span className="font-medium text-gray-700">{u.role}</span>
                  <span className="text-gray-400">{u.email} / {u.pwd}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-blue-400 text-xs mt-6">
          © {new Date().getFullYear()} TiendaApp — Gestión para tiendas de barrio
        </p>
      </div>
    </div>
  )
}
