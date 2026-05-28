import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { clientesApi } from '@/api'
import { formatCOP, formatFecha } from '@/utils/format'
import { ArrowLeft, Phone, MapPin } from 'lucide-react'

export default function ClienteDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['cliente', id],
    queryFn: () => clientesApi.ver(id).then(r => r.data),
  })

  if (isLoading) return <div className="flex justify-center py-20"><div className="spinner w-8 h-8" /></div>

  const { cliente, stats } = data ?? {}

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/clientes')} className="btn-secondary p-2">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">{cliente?.nombre}</h1>
      </div>

      <div className="card space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600"><Phone className="w-4 h-4" />{cliente?.telefono ?? '—'}</div>
          <div className="flex items-center gap-2 text-gray-600"><MapPin className="w-4 h-4" />{cliente?.barrio ?? '—'}</div>
          <div><p className="text-gray-500">Cédula</p><p className="font-semibold">{cliente?.cedula ?? '—'}</p></div>
          <div><p className="text-gray-500">Estado crédito</p><p className="font-semibold capitalize">{cliente?.estado_credito}</p></div>
          <div><p className="text-gray-500">Cupo crédito</p><p className="font-semibold">{formatCOP(cliente?.cupo_credito)}</p></div>
          <div><p className="text-gray-500">Saldo pendiente</p><p className="font-bold text-red-600">{formatCOP(cliente?.saldo_pendiente)}</p></div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-3">Estadísticas</h3>
        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          <div><p className="text-2xl font-bold text-blue-600">{stats?.total_compras ?? 0}</p><p className="text-gray-500">Compras</p></div>
          <div><p className="text-2xl font-bold text-green-600">{formatCOP(stats?.total_comprado ?? 0)}</p><p className="text-gray-500">Total comprado</p></div>
          <div><p className="text-2xl font-bold text-orange-600">{stats?.creditos_activos ?? 0}</p><p className="text-gray-500">Créditos activos</p></div>
        </div>
      </div>
    </div>
  )
}