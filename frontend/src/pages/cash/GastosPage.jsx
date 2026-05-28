import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Plus, X, TrendingDown, DollarSign } from 'lucide-react'
import { gastosApi } from '@/api'
import { formatCOP, formatFechaCorta } from '@/utils/format'

const CATEGORIAS = [
  { id: 'arriendo',      label: '🏠 Arriendo' },
  { id: 'servicios',     label: '💡 Servicios públicos' },
  { id: 'nomina',        label: '👷 Nómina / empleados' },
  { id: 'transporte',    label: '🚚 Transporte / fletes' },
  { id: 'mantenimiento', label: '🔧 Mantenimiento' },
  { id: 'empaques',      label: '📦 Empaques / materiales' },
  { id: 'publicidad',    label: '📢 Publicidad' },
  { id: 'otros',         label: '💰 Otros gastos' },
]

function ModalGasto({ onGuardar, onCerrar, loading }) {
  const { register, handleSubmit, formState: { errors } } = useForm()

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800 text-lg">Registrar gasto</h3>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onGuardar)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoría <span className="text-red-500">*</span>
            </label>
            <select {...register('categoria', { required: 'Selecciona una categoría.' })}
              className={`input ${errors.categoria ? 'border-red-400' : ''}`}>
              <option value="">Seleccionar...</option>
              {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            {errors.categoria && <p className="mt-1 text-xs text-red-500">{errors.categoria.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción <span className="text-red-500">*</span>
            </label>
            <input {...register('descripcion', { required: 'La descripción es obligatoria.' })}
              className={`input ${errors.descripcion ? 'border-red-400' : ''}`}
              placeholder="Ej: Pago arriendo mes de mayo" />
            {errors.descripcion && <p className="mt-1 text-xs text-red-500">{errors.descripcion.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monto <span className="text-red-500">*</span>
            </label>
            <input {...register('monto', { required: 'El monto es obligatorio.', min: { value: 1, message: 'Mínimo $1' } })}
              type="number" min="1" step="1000" inputMode="numeric"
              className={`input ${errors.monto ? 'border-red-400' : ''}`}
              placeholder="$ 0" />
            {errors.monto && <p className="mt-1 text-xs text-red-500">{errors.monto.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Referencia / Factura (opcional)
            </label>
            <input {...register('referencia')} className="input"
              placeholder="Ej: Factura #12345" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCerrar} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-danger flex-1">
              {loading ? 'Guardando...' : '💸 Registrar gasto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function GastosPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [catFiltro, setCatFiltro] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['gastos', catFiltro],
    queryFn: () => gastosApi.listar({ categoria: catFiltro || undefined }).then(r => r.data),
  })

  const { data: resumen } = useQuery({
    queryKey: ['gastos-resumen'],
    queryFn: () => gastosApi.resumen().then(r => r.data),
  })

  const crearMutation = useMutation({
    mutationFn: (datos) => gastosApi.crear(datos),
    onSuccess: () => {
      qc.invalidateQueries(['gastos'])
      qc.invalidateQueries(['gastos-resumen'])
      setModal(false)
      toast.success('Gasto registrado. 💸')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Error al registrar gasto.'),
  })

  const eliminarMutation = useMutation({
    mutationFn: (id) => gastosApi.eliminar(id),
    onSuccess: () => {
      qc.invalidateQueries(['gastos'])
      qc.invalidateQueries(['gastos-resumen'])
      toast.success('Gasto eliminado.')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Sin permisos para eliminar.'),
  })

  const totalMes = data?.gastos?.data?.reduce((s, g) => s + parseFloat(g.monto), 0) ?? 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Gastos del negocio</h1>
          <p className="text-sm text-gray-500 mt-0.5">Arriendo, servicios, nómina y más</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-danger">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nuevo gasto</span>
          <span className="sm:hidden">Nuevo</span>
        </button>
      </div>

      {/* KPIs por categoría */}
      {resumen?.resumen?.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {resumen.resumen.slice(0, 4).map(r => (
            <div key={r.categoria} className="card p-4">
              <p className="text-xs text-gray-500 truncate">
                {CATEGORIAS.find(c => c.id === r.categoria)?.label ?? r.categoria}
              </p>
              <p className="text-lg font-bold text-red-600 mt-1">{formatCOP(r.total)}</p>
              <p className="text-xs text-gray-400">{r.cantidad} registro{r.cantidad > 1 ? 's' : ''}</p>
            </div>
          ))}
        </div>
      )}

      {/* Total del mes */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-4">
        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
          <TrendingDown className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <p className="text-xs text-red-600 font-medium uppercase tracking-wide">Total gastos del mes</p>
          <p className="text-2xl font-bold text-red-700">{formatCOP(resumen?.total ?? totalMes)}</p>
        </div>
      </div>

      {/* Filtro por categoría */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setCatFiltro('')}
          className={`btn text-xs py-1.5 px-3 ${!catFiltro ? 'btn-primary' : 'btn-secondary'}`}>
          Todos
        </button>
        {CATEGORIAS.map(c => (
          <button key={c.id} onClick={() => setCatFiltro(c.id)}
            className={`btn text-xs py-1.5 px-3 ${catFiltro === c.id ? 'btn-primary' : 'btn-secondary'}`}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Lista de gastos */}
      {isLoading ? (
        <div className="flex justify-center py-20"><div className="spinner w-8 h-8" /></div>
      ) : data?.gastos?.data?.length === 0 ? (
        <div className="empty-state card">
          <DollarSign className="w-12 h-12 text-gray-300 mb-3" />
          <p className="font-medium text-gray-600">Sin gastos registrados</p>
          <p className="text-sm text-gray-400 mt-1">Registra los gastos del negocio para ver tu ganancia real.</p>
          <button onClick={() => setModal(true)} className="btn-danger mt-4">
            <Plus className="w-4 h-4" /> Registrar gasto
          </button>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>Categoría</th>
                <th>Descripción</th>
                <th>Referencia</th>
                <th>Fecha</th>
                <th className="text-right">Monto</th>
                <th className="text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {data?.gastos?.data?.map(gasto => (
                <tr key={gasto.id}>
                  <td>
                    <span className="badge badge-red text-xs">
                      {CATEGORIAS.find(c => c.id === gasto.categoria)?.label ?? gasto.categoria}
                    </span>
                  </td>
                  <td className="font-medium text-sm">{gasto.descripcion}</td>
                  <td className="text-sm text-gray-500">{gasto.referencia ?? '—'}</td>
                  <td className="text-sm text-gray-500">{formatFechaCorta(gasto.created_at)}</td>
                  <td className="text-right font-bold text-red-600">{formatCOP(gasto.monto)}</td>
                  <td className="text-center">
                    <button onClick={() => {
                      if (window.confirm('¿Eliminar este gasto?')) eliminarMutation.mutate(gasto.id)
                    }} className="text-xs text-red-500 hover:text-red-700 px-2 py-1 hover:bg-red-50 rounded">
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <ModalGasto
          onGuardar={crearMutation.mutate}
          onCerrar={() => setModal(false)}
          loading={crearMutation.isPending}
        />
      )}
    </div>
  )
}