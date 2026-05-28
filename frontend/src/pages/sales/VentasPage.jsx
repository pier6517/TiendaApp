import { useQuery } from '@tanstack/react-query'
import { ventasApi } from '@/api'
import { formatCOP, formatDateTime } from '@/utils/format'

export default function VentasPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['ventas'],
    queryFn: () => ventasApi.listar({}).then(r => r.data),
  })

  if (isLoading) return <div className="flex justify-center py-20"><div className="spinner w-8 h-8" /></div>

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Historial de Ventas</h1>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>N° Venta</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Método</th>
              <th className="text-right">Total</th>
              <th className="text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            {data?.data?.map(v => (
              <tr key={v.id}>
                <td className="font-mono text-sm">{v.numero_venta}</td>
                <td className="text-sm text-gray-500">{formatDateTime(v.created_at)}</td>
                <td>{v.cliente?.nombre ?? 'Contado'}</td>
                <td className="capitalize">{v.metodo_pago}</td>
                <td className="text-right font-semibold">{formatCOP(v.total)}</td>
                <td className="text-center">
                  <span className={`badge ${v.estado === 'completada' ? 'badge-green' : v.estado === 'anulada' ? 'badge-red' : 'badge-yellow'}`}>
                    {v.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}