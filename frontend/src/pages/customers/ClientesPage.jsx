import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import {
  Plus, Search, Users, Phone, MapPin,
  AlertCircle, X, MessageCircle, DollarSign
} from 'lucide-react'
import { clientesApi } from '@/api'
import { formatCOP } from '@/utils/format'

// ── Función para abrir WhatsApp con mensaje predeterminado ──────
function abrirWhatsApp(cliente) {
  if (!cliente.telefono) {
    toast.error('Este cliente no tiene teléfono registrado.')
    return
  }

  const saldo = formatCOP(cliente.saldo_pendiente)

  const mensaje = `Hola ${cliente.nombre.split(' ')[0]} 👋, te recordamos amablemente que tienes un saldo pendiente de *${saldo}* en nuestra tienda. Cuando puedas, te esperamos. ¡Que tengas un excelente día! 🙏`

  // Limpiar número: quitar espacios, guiones, paréntesis
  let tel = cliente.telefono.replace(/[\s\-\(\)]/g, '')

  // Si empieza con 0, quitar el 0 y agregar +57
  if (tel.startsWith('0')) tel = tel.slice(1)

  // Si no tiene código de país, agregar Colombia (+57)
  if (!tel.startsWith('+') && !tel.startsWith('57')) {
    tel = '57' + tel
  }

  const url = `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`
  window.open(url, '_blank')
  toast.success('Abriendo WhatsApp... 📱')
}

// ── Tarjeta de cliente ──────────────────────────────────────────
function ClienteCard({ cliente }) {
  const tieneDeuda = cliente.saldo_pendiente > 0

  const colorEstado = {
    bueno:    'badge-green',
    regular:  'badge-yellow',
    moroso:   'badge-red',
    bloqueado:'badge-gray',
  }[cliente.estado_credito] ?? 'badge-gray'

  const labelEstado = {
    bueno: 'Al día', regular: 'Regular',
    moroso: 'Moroso', bloqueado: 'Bloqueado',
  }[cliente.estado_credito] ?? cliente.estado_credito

  return (
    <div className="card hover:shadow-card-hover transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <Link to={`/clientes/${cliente.id}`} className="flex items-center gap-3 flex-1 min-w-0">
          {/* Avatar */}
          <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0
            ${tieneDeuda ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
            {cliente.nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{cliente.nombre}</p>
            <span className={`badge ${colorEstado} text-xs`}>{labelEstado}</span>
          </div>
        </Link>
      </div>

      {/* Info */}
      <div className="space-y-1 text-sm text-gray-500 mb-3">
        {cliente.telefono && (
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{cliente.telefono}</span>
          </div>
        )}
        {cliente.barrio && (
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{cliente.barrio}</span>
          </div>
        )}
      </div>

      {/* Deuda + WhatsApp */}
      {tieneDeuda ? (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs text-gray-500">Saldo pendiente</p>
              <p className="font-bold text-red-600 text-base">{formatCOP(cliente.saldo_pendiente)}</p>
            </div>
            <DollarSign className="w-5 h-5 text-red-300" />
          </div>

          {/* Botón WhatsApp — EL GOLAZO */}
          {cliente.telefono && (
            <button
              onClick={() => abrirWhatsApp(cliente)}
              className="w-full flex items-center justify-center gap-2 py-2 px-3
                         bg-green-500 hover:bg-green-600 active:scale-95
                         text-white text-sm font-semibold rounded-xl
                         transition-all shadow-sm"
            >
              <MessageCircle className="w-4 h-4" />
              Recordar por WhatsApp
            </button>
          )}
        </div>
      ) : (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-green-600 font-medium">✓ Sin deudas</p>
        </div>
      )}
    </div>
  )
}

// ── Modal nuevo cliente ─────────────────────────────────────────
function ModalNuevoCliente({ onGuardar, onCerrar, loading }) {
  const { register, handleSubmit, formState: { errors } } = useForm()

  const BARRIOS = [
    'Laureles','El Poblado','Belén','Robledo','Castilla',
    'Aranjuez','Manrique','Guayabal','La América','Itagüí',
    'Bello','Envigado','Sabaneta','Otro',
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        {/* Handle de arrastre en móvil */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800 text-lg">Nuevo cliente</h3>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onGuardar)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre completo <span className="text-red-500">*</span>
            </label>
            <input
              {...register('nombre', { required: 'El nombre es obligatorio.' })}
              className={`input ${errors.nombre ? 'border-red-400' : ''}`}
              placeholder="Ej: Doña Rosa Martínez"
              autoFocus
            />
            {errors.nombre && <p className="mt-1 text-xs text-red-500">{errors.nombre.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cédula</label>
              <input {...register('cedula')} className="input" placeholder="123456789" inputMode="numeric" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono <span className="text-green-600 text-xs">(para WhatsApp)</span>
              </label>
              <input {...register('telefono')} className="input" placeholder="300 123 4567" inputMode="tel" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Barrio</label>
            <select {...register('barrio')} className="input">
              <option value="">Seleccionar barrio...</option>
              {BARRIOS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cupo de fiado (máximo)
            </label>
            <input
              {...register('cupo_credito', { min: 0 })}
              type="number" min="0" step="5000"
              className="input"
              placeholder="0 = sin crédito"
              inputMode="numeric"
            />
            <p className="text-xs text-gray-400 mt-1">
              Monto máximo que puede deber en fiado.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCerrar} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Guardando...' : '✓ Crear cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Página principal ────────────────────────────────────────────
export default function ClientesPage() {
  const qc = useQueryClient()
  const [filtros, setFiltros] = useState({ buscar: '', morosos: false, pagina: 1 })
  const [modalNuevo, setModalNuevo] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['clientes', filtros],
    queryFn: () => clientesApi.listar({
      buscar:  filtros.buscar,
      morosos: filtros.morosos ? 1 : undefined,
      page:    filtros.pagina,
    }).then(r => r.data),
    keepPreviousData: true,
  })

  const crearMutation = useMutation({
    mutationFn: (datos) => clientesApi.crear(datos),
    onSuccess: () => {
      qc.invalidateQueries(['clientes'])
      setModalNuevo(false)
      toast.success('Cliente registrado exitosamente. 🎉')
    },
    onError: (err) => {
      const errors = err.response?.data?.errors
      if (errors) Object.values(errors).flat().forEach(m => toast.error(m))
      else toast.error('Error al crear el cliente.')
    },
  })

  const f = (campo, valor) => setFiltros(p => ({ ...p, [campo]: valor, pagina: 1 }))

  // Clientes con deuda para el resumen
  const conDeuda = data?.data?.filter(c => c.saldo_pendiente > 0) ?? []
  const totalCartera = conDeuda.reduce((s, c) => s + c.saldo_pendiente, 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data?.total ?? 0} registrados</p>
        </div>
        <button onClick={() => setModalNuevo(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nuevo cliente</span>
          <span className="sm:hidden">Nuevo</span>
        </button>
      </div>

      {/* Alerta cartera si hay morosos */}
      {conDeuda.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-red-800 text-sm">
              {conDeuda.length} cliente{conDeuda.length > 1 ? 's' : ''} con deuda —
              Total: <span className="font-bold">{formatCOP(totalCartera)}</span>
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              Usa el botón "Recordar por WhatsApp" para cobrar sin incomodar 💬
            </p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="card p-3 sm:p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, cédula o teléfono..."
            value={filtros.buscar}
            onChange={e => f('buscar', e.target.value)}
            className="input pl-10"
          />
        </div>
        <button
          onClick={() => f('morosos', !filtros.morosos)}
          className={`btn gap-2 whitespace-nowrap ${filtros.morosos ? 'bg-red-500 text-white' : 'btn-secondary'}`}
        >
          <AlertCircle className="w-4 h-4" />
          <span className="hidden sm:inline">Solo con deuda</span>
          <span className="sm:hidden">Con deuda</span>
        </button>
      </div>

      {/* Contenido */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="spinner w-8 h-8" />
        </div>
      ) : data?.data?.length === 0 ? (
        <div className="empty-state card">
          <Users className="w-12 h-12 text-gray-300 mb-3" />
          <p className="font-medium text-gray-600">Sin clientes</p>
          <p className="text-sm mt-1 text-gray-400">Agrega tu primer cliente.</p>
          <button onClick={() => setModalNuevo(true)} className="btn-primary mt-4">
            <Plus className="w-4 h-4" /> Agregar cliente
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.data?.map(cliente => (
            <ClienteCard key={cliente.id} cliente={cliente} />
          ))}
        </div>
      )}

      {/* Paginación */}
      {data?.last_page > 1 && (
        <div className="flex justify-center gap-2">
          <button disabled={filtros.pagina === 1}
            onClick={() => f('pagina', filtros.pagina - 1)}
            className="btn-secondary">Anterior</button>
          <span className="btn-secondary pointer-events-none">
            {filtros.pagina} / {data.last_page}
          </span>
          <button disabled={filtros.pagina === data.last_page}
            onClick={() => f('pagina', filtros.pagina + 1)}
            className="btn-secondary">Siguiente</button>
        </div>
      )}

      {/* Modal nuevo cliente */}
      {modalNuevo && (
        <ModalNuevoCliente
          onGuardar={crearMutation.mutate}
          onCerrar={() => setModalNuevo(false)}
          loading={crearMutation.isPending}
        />
      )}
    </div>
  )
}
