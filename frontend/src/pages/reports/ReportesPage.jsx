import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { FileText, TrendingUp, Package, CreditCard } from 'lucide-react'
import { reportesApi } from '@/api'
import { formatCOP, formatFechaCorta } from '@/utils/format'

const PESTANAS = [
  { id: 'ventas',     label: 'Ventas',     icon: TrendingUp },
  { id: 'inventario', label: 'Inventario', icon: Package },
  { id: 'cartera',    label: 'Cartera',    icon: CreditCard },
  { id: 'balance',    label: 'Balance',    icon: FileText },
]

/**
 * ReportesPage
 * Reportes financieros por período.
 * Solo accesible para admin y supervisor.
 */
export default function ReportesPage() {
  const [pestana, setPestana] = useState('ventas')
  const [rango, setRango] = useState({
    desde: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    hasta: new Date().toISOString().split('T')[0],
  })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
        <p className="text-sm text-gray-500 mt-0.5">Análisis financiero de tu tienda</p>
      </div>

      {/* Selector de fechas */}
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Desde</label>
          <input
            type="date"
            value={rango.desde}
            onChange={e => setRango(r => ({ ...r, desde: e.target.value }))}
            className="input"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Hasta</label>
          <input
            type="date"
            value={rango.hasta}
            onChange={e => setRango(r => ({ ...r, hasta: e.target.value }))}
            className="input"
          />
        </div>
        {/* Atajos rápidos */}
        <div className="flex gap-2">
          {[
            { label: 'Hoy',     d: 0,   h: 0 },
            { label: 'Semana',  d: 7,   h: 0 },
            { label: 'Mes',     d: 30,  h: 0 },
            { label: '3 meses', d: 90,  h: 0 },
          ].map(({ label, d }) => (
            <button
              key={label}
              onClick={() => {
                const hoy   = new Date()
                const desde = new Date(hoy)
                desde.setDate(hoy.getDate() - d)
                setRango({
                  desde: desde.toISOString().split('T')[0],
                  hasta: hoy.toISOString().split('T')[0],
                })
              }}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Pestañas */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {PESTANAS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setPestana(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              pestana === id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Contenido de la pestaña */}
      {pestana === 'ventas'     && <ReporteVentas rango={rango} />}
      {pestana === 'inventario' && <ReporteInventario />}
      {pestana === 'cartera'    && <ReporteCartera />}
      {pestana === 'balance'    && <ReporteBalance rango={rango} />}
    </div>
  )
}

// ── Reporte de Ventas ────────────────────────────────────────────

function ReporteVentas({ rango }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reporte-ventas', rango],
    queryFn: () => reportesApi.ventas(rango).then(r => r.data),
  })

  if (isLoading) return <Cargando />

  const COLORES = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#a855f7','#06b6d4']

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard titulo="Total vendido"       valor={formatCOP(data?.resumen?.total_ingresos ?? 0)} />
        <StatCard titulo="N° ventas"           valor={data?.resumen?.total_ventas ?? 0} />
        <StatCard titulo="Ticket promedio"     valor={formatCOP(data?.resumen?.ticket_promedio ?? 0)} />
        <StatCard titulo="Ganancia bruta"      valor={formatCOP(data?.ganancia_bruta ?? 0)} color="green" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard titulo="Gastos del período"  valor={formatCOP(data?.gastos ?? 0)} color="red" />
        <StatCard titulo="Ganancia neta"       valor={formatCOP(data?.ganancia_neta ?? 0)} color={data?.ganancia_neta >= 0 ? 'green' : 'red'} />
        <StatCard titulo="Descuentos dados"    valor={formatCOP(data?.resumen?.total_descuentos ?? 0)} color="yellow" />
      </div>

      {/* Gráfica por día */}
      {data?.por_dia?.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Ventas por día</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.por_dia}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="fecha" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
              <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={v => formatCOP(v)} labelFormatter={v => `Fecha: ${v}`} />
              <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Métodos de pago */}
      {data?.por_metodo?.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Por método de pago</h3>
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Método</th><th className="text-right">Ventas</th><th className="text-right">Total</th><th className="text-right">%</th></tr></thead>
              <tbody>
                {data.por_metodo.map((m, i) => {
                  const pct = data.resumen?.total_ingresos > 0
                    ? Math.round((m.total / data.resumen.total_ingresos) * 100)
                    : 0
                  return (
                    <tr key={i}>
                      <td className="capitalize font-medium">{m.metodo_pago}</td>
                      <td className="text-right text-gray-500">{m.cantidad}</td>
                      <td className="text-right font-semibold">{formatCOP(m.total)}</td>
                      <td className="text-right">
                        <span className="text-xs text-gray-500">{pct}%</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Reporte Inventario ───────────────────────────────────────────

function ReporteInventario() {
  const { data, isLoading } = useQuery({
    queryKey: ['reporte-inventario'],
    queryFn: () => reportesApi.inventario().then(r => r.data),
  })

  if (isLoading) return <Cargando />

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard titulo="Valor en costo"     valor={formatCOP(data?.resumen?.valor_costo ?? 0)} />
        <StatCard titulo="Valor en venta"     valor={formatCOP(data?.resumen?.valor_venta ?? 0)} color="green" />
        <StatCard titulo="Total productos"    valor={data?.resumen?.total_productos ?? 0} />
        <StatCard titulo="Total unidades"     valor={data?.resumen?.total_unidades ?? 0} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <StatCard titulo="Stock bajo"         valor={data?.stock_bajo ?? 0} color="red" />
        <StatCard titulo="Margen promedio"    valor={`${data?.margen_promedio ?? 0}%`} color="blue" />
      </div>

      {data?.por_categoria?.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Inventario por categoría</h3>
          <table className="table">
            <thead><tr><th>Categoría</th><th className="text-right">Productos</th><th className="text-right">Valor inventario</th></tr></thead>
            <tbody>
              {data.por_categoria.map((c, i) => (
                <tr key={i}>
                  <td className="font-medium">{c.categoria}</td>
                  <td className="text-right text-gray-500">{c.productos}</td>
                  <td className="text-right font-semibold">{formatCOP(c.valor_inventario)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Reporte Cartera ──────────────────────────────────────────────

function ReporteCartera() {
  const { data, isLoading } = useQuery({
    queryKey: ['reporte-cartera'],
    queryFn: () => reportesApi.cartera().then(r => r.data),
    retry: false,
  })

  if (isLoading) return <Cargando />
  if (!data) return <div className="empty-state card">Sin datos de cartera</div>

  const topDeudores = data?.top_deudores ?? []
  const totalCartera = data?.total_cartera ?? 0
  const morosos = data?.clientes_morosos ?? 0
  const abonosMes = data?.abonos_mes?.total ?? 0
  const vencidosGraves = data?.vencidos_graves ?? 0

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard titulo="Total cartera"    valor={formatCOP(totalCartera)}  color="orange" />
        <StatCard titulo="Clientes morosos" valor={morosos}                  color="red" />
        <StatCard titulo="Abonos del mes"   valor={formatCOP(abonosMes)}     color="green" />
        <StatCard titulo="Vencidos graves"  valor={formatCOP(vencidosGraves)} color="red" />
      </div>

      {topDeudores.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Top deudores</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Barrio</th>
                <th>Teléfono</th>
                <th className="text-right">Deuda</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {topDeudores.map((c, i) => (
                <tr key={i}>
                  <td className="font-medium">{c.nombre}</td>
                  <td className="text-gray-500 text-sm">{c.barrio ?? '—'}</td>
                  <td className="text-gray-500 text-sm">{c.telefono ?? '—'}</td>
                  <td className="text-right font-bold text-red-600">{formatCOP(c.saldo_pendiente)}</td>
                  <td>
                    <span className={`badge ${c.estado_credito === 'moroso' ? 'badge-red' : 'badge-yellow'}`}>
                      {c.estado_credito}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

}

// ── Reporte Balance ──────────────────────────────────────────────

function ReporteBalance({ rango }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reporte-balance', rango],
    queryFn: () => reportesApi.balance(rango).then(r => r.data),
    retry: false,
  })

  if (isLoading) return <Cargando />
  if (!data) return <div className="empty-state card">Sin datos de balance</div>

  return (
    <div className="space-y-5">
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-5">
          Balance del período: {formatFechaCorta(rango.desde)} – {formatFechaCorta(rango.hasta)}
        </h3>
        <div className="space-y-3">
          <BalanceItem label="Ingresos por ventas"  valor={data?.ingresos_ventas ?? 0}  tipo="ingreso" />
          <BalanceItem label="Abonos recibidos"      valor={data?.abonos_recibidos ?? 0} tipo="ingreso" />
          <div className="border-t pt-3">
            <BalanceItem label="Total ingresos"      valor={data?.total_ingresos ?? 0}   tipo="ingreso" bold />
          </div>
          <BalanceItem label="Gastos operativos"     valor={data?.gastos ?? 0}           tipo="egreso" />
          <div className="border-t pt-3">
            <BalanceItem label="Ganancia bruta"      valor={data?.ganancia_bruta ?? 0}   tipo={data?.ganancia_bruta >= 0 ? 'ingreso' : 'egreso'} bold />
            <BalanceItem label="Ganancia neta"       valor={data?.ganancia_neta ?? 0}    tipo={data?.ganancia_neta >= 0 ? 'ingreso' : 'egreso'} bold />
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
            Margen neto: <strong>{data?.margen ?? 0}%</strong>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Helpers de UI ────────────────────────────────────────────────

function StatCard({ titulo, valor, color = 'gray' }) {
  const colors = {
    gray:   'bg-gray-50 text-gray-800',
    green:  'bg-green-50 text-green-700',
    red:    'bg-red-50 text-red-700',
    blue:   'bg-blue-50 text-blue-700',
    orange: 'bg-orange-50 text-orange-700',
    yellow: 'bg-yellow-50 text-yellow-700',
  }
  return (
    <div className={`rounded-xl p-4 ${colors[color]}`}>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{titulo}</p>
      <p className="text-xl font-bold mt-1">{valor}</p>
    </div>
  )
}

function BalanceItem({ label, valor, tipo, bold }) {
  return (
    <div className={`flex justify-between items-center py-1 ${bold ? 'font-semibold' : ''}`}>
      <span className={bold ? 'text-gray-800' : 'text-gray-600'}>{label}</span>
      <span className={tipo === 'ingreso' ? 'text-green-700' : 'text-red-600'}>
        {tipo === 'egreso' ? '-' : '+'}{formatCOP(valor)}
      </span>
    </div>
  )
}

function Cargando() {
  return <div className="flex justify-center py-20"><div className="spinner w-8 h-8" /></div>
}
