import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { creditosApi } from '@/api'
import { formatCOP, formatFecha } from '@/utils/format'
import { ArrowLeft } from 'lucide-react'

export default function CreditoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['credito', id],
    queryFn: () => creditosApi.ver(id).then(r => r.data),
  })

  if (isLoading) return <div className="flex justify-center py-20"><div className="spinner w-8 h-8" /></div>

  const credito = data?.credito ?? data

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/creditos')} className="btn-secondary p-2">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Crédito {credito?.numero_credito}</h1>
      </div>

      <div className="card space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-gray-500">Cliente</p><p className="font-semibold">{credito?.cliente?.nombre}</p></div>
          <div><p className="text-gray-500">Estado</p><p className="font-semibold capitalize">{credito?.estado}</p></div>
          <div><p className="text-gray-500">Monto total</p><p className="font-semibold">{formatCOP(credito?.monto_total)}</p></div>
          <div><p className="text-gray-500">Saldo pendiente</p><p className="font-bold text-red-600">{formatCOP(credito?.saldo_pendiente)}</p></div>
          <div><p className="text-gray-500">Total pagado</p><p className="font-semibold text-green-600">{formatCOP(credito?.total_pagado)}</p></div>
          <div><p className="text-gray-500">Vence</p><p className="font-semibold">{credito?.fecha_vencimiento ? formatFecha(credito.fecha_vencimiento) : 'Sin fecha'}</p></div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-3">Historial de pagos</h3>
        {data?.pagos?.length === 0 ? (
          <p className="text-gray-400 text-sm">Sin pagos registrados</p>
        ) : (
          <table className="table">
            <thead><tr><th>Fecha</th><th>Método</th><th className="text-right">Monto</th><th className="text-right">Saldo después</th></tr></thead>
            <tbody>
              {data?.pagos?.map(p => (
                <tr key={p.id}>
                  <td className="text-sm">{formatFecha(p.created_at)}</td>
                  <td className="capitalize text-sm">{p.metodo_pago}</td>
                  <td className="text-right font-semibold text-green-600">{formatCOP(p.monto)}</td>
                  <td className="text-right text-sm">{formatCOP(p.saldo_despues)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}