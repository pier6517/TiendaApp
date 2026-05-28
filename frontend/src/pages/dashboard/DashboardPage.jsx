import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  ShoppingCart, TrendingUp, AlertCircle, Users,
  Package, DollarSign, CreditCard, RefreshCw,
} from 'lucide-react'
import { dashboardApi } from '@/api'
import { formatCOP } from '@/utils/format'
import useAuthStore from '@/store/authStore'

const COLORES_METODO = {
  efectivo: '#22c55e', nequi: '#a855f7', daviplata:'#f97316',
  fiado: '#ef4444', tarjeta: '#3b82f6', transferencia: '#06b6d4',
}

export default function DashboardPage() {
  const { user } = useAuthStore()

  const { data: dash, isLoading, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.resumen().then(r => r.data),
    refetchInterval: 60_000,
  })

  const { data: graficaVentas } = useQuery({
    queryKey: ['dashboard-ventas-graf'],
    queryFn: () => dashboardApi.graficaVentas().then(r => r.data),
  })

  const { data: metodosPago } = useQuery({
    queryKey: ['dashboard-metodos'],
    queryFn: () => dashboardApi.metodosPago().then(r => r.data),
  })

  const { data: topProductos } = useQuery({
    queryKey: ['dashboard-top-productos'],
    queryFn: () => dashboardApi.topProductos(30).then(r => r.data),
  })

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="spinner w-8 h-8" /></div>

  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{saludo}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-sm text-gray-500 mt-0.5">Aquí está el resumen de tu tienda hoy.</p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary gap-2">
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard titulo="Ventas de hoy"     valor={formatCOP(dash?.ventas_hoy ?? 0)}              sub={`${dash?.numero_ventas_hoy ?? 0} transacciones`}                   icon={<ShoppingCart className="w-5 h-5" />} color="blue"   />
        <KpiCard titulo="Ganancia neta hoy" valor={formatCOP(dash?.ganancia_neta_hoy ?? 0)}       sub={`Gastos: ${formatCOP(dash?.gastos_hoy ?? 0)}`}                      icon={<TrendingUp   className="w-5 h-5" />} color="green"  />
        <KpiCard titulo="Total cartera"     valor={formatCOP(dash?.cartera?.total_cartera ?? 0)}  sub={`${dash?.cartera?.creditos_activos ?? 0} créditos activos`}         icon={<CreditCard   className="w-5 h-5" />} color="orange" />
        <KpiCard titulo="Clientes morosos"  valor={dash?.clientes_morosos ?? 0}                   sub={`${dash?.cartera?.creditos_vencidos ?? 0} créditos vencidos`}       icon={<AlertCircle  className="w-5 h-5" />} color="red"    />
      </div>

      {/* Segunda fila */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard titulo="Ventas del mes" valor={formatCOP(dash?.ventas_mes ?? 0)} sub="Mes actual" icon={<DollarSign className="w-5 h-5" />} color="indigo" />

        {/* ── STOCK BAJO — clickeable ── */}
        <Link to="/productos?stock_bajo=1" className="block">
          <KpiCard
            titulo="Stock bajo"
            valor={dash?.productos_stock_bajo ?? 0}
            sub={`de ${dash?.total_productos ?? 0} productos · Toca para ver 👆`}
            icon={<Package className="w-5 h-5" />}
            color="yellow"
            clickable
          />
        </Link>

        <KpiCard titulo="Cobrado hoy" valor={formatCOP(dash?.cartera?.cobrado_hoy ?? 0)} sub="Abonos recibidos" icon={<Users className="w-5 h-5" />} color="teal" />
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <h3 className="font-semibold text-gray-800 mb-4">Ventas — últimos 12 meses</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={graficaVentas?.datos ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes_label" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={v => formatCOP(v)} />
              <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={{ fill:'#3b82f6', r:4 }} activeDot={{ r:6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Métodos de pago hoy</h3>
          {metodosPago?.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={metodosPago} dataKey="total" nameKey="metodo_pago" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3}>
                  {metodosPago.map((entry, i) => <Cell key={i} fill={COLORES_METODO[entry.metodo_pago] ?? '#94a3b8'} />)}
                </Pie>
                <Tooltip formatter={v => formatCOP(v)} />
                <Legend formatter={val => val.charAt(0).toUpperCase() + val.slice(1)} iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state h-48 text-sm">Sin ventas registradas hoy</div>
          )}
        </div>
      </div>

      {/* Top productos */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4">Top 10 productos más vendidos (últimos 30 días)</h3>
        {topProductos?.productos?.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topProductos.productos.slice(0,10)} layout="vertical" margin={{ left:20, right:30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize:11 }} />
              <YAxis type="category" dataKey="nombre" tick={{ fontSize:11 }} width={130} />
              <Tooltip formatter={v => `${v} unidades`} />
              <Bar dataKey="unidades_vendidas" fill="#3b82f6" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-state text-sm">Sin datos disponibles</div>
        )}
      </div>

      {/* Alerta stock bajo */}
      {dash?.productos_stock_bajo > 0 && (
        <Link to="/productos?stock_bajo=1">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3 hover:bg-yellow-100 transition cursor-pointer">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800">
                ⚠️ {dash.productos_stock_bajo} producto(s) con stock bajo — <span className="underline">Ver y hacer pedido</span>
              </p>
              <p className="text-sm text-yellow-600 mt-0.5">
                Toca aquí para ver qué productos se están agotando.
              </p>
            </div>
          </div>
        </Link>
      )}
    </div>
  )
}

const COLOR_MAP = {
  blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-100 text-blue-600',    text: 'text-blue-700'   },
  green:  { bg: 'bg-green-50',  icon: 'bg-green-100 text-green-600',   text: 'text-green-700'  },
  orange: { bg: 'bg-orange-50', icon: 'bg-orange-100 text-orange-600', text: 'text-orange-700' },
  red:    { bg: 'bg-red-50',    icon: 'bg-red-100 text-red-600',       text: 'text-red-700'    },
  yellow: { bg: 'bg-yellow-50', icon: 'bg-yellow-100 text-yellow-600', text: 'text-yellow-700' },
  indigo: { bg: 'bg-indigo-50', icon: 'bg-indigo-100 text-indigo-600', text: 'text-indigo-700' },
  teal:   { bg: 'bg-teal-50',   icon: 'bg-teal-100 text-teal-600',    text: 'text-teal-700'   },
}

function KpiCard({ titulo, valor, sub, icon, color = 'blue', clickable }) {
  const c = COLOR_MAP[color]
  return (
    <div className={`rounded-xl p-5 ${c.bg} border border-white ${clickable ? 'hover:scale-105 transition-transform cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{titulo}</p>
          <p className={`text-2xl font-bold mt-1 ${c.text}`}>{valor}</p>
          {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
        <div className={`${c.icon} w-10 h-10 rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  )
}