import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Search, AlertTriangle, CheckCircle, Clock, XCircle, ChevronRight, Plus, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { creditosApi } from '@/api';
import { formatCOP, formatFechaCorta } from '@/utils/format';

const CREDITO_ESTADO_COLOR = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  parcial:   'bg-blue-100 text-blue-800',
  pagado:    'bg-green-100 text-green-800',
  vencido:   'bg-red-100 text-red-800',
};

const ESTADO_LABELS = {
  pendiente: 'Pendiente',
  parcial:   'Parcial',
  pagado:    'Pagado',
  vencido:   'Vencido',
};

function ModalAbono({ credito, onClose }) {
  const queryClient = useQueryClient();
  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [comprobante, setComprobante] = useState('');

  const { mutate: abonar, isPending } = useMutation({
    mutationFn: (data) => creditosApi.abonar(credito.id, data),
    onSuccess: () => {
      toast.success('Abono registrado exitosamente.');
      queryClient.invalidateQueries(['creditos']);
      queryClient.invalidateQueries(['creditos-resumen']);
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error al registrar abono'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!monto || parseFloat(monto) <= 0) return toast.error('Ingresa un monto válido');
    abonar({ monto: parseFloat(monto), metodo_pago: metodoPago, comprobante });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Registrar Abono</h2>
          <p className="text-sm text-gray-500 mt-1">Cliente: <span className="font-medium">{credito.cliente?.nombre}</span></p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-orange-50 rounded-xl p-4 grid grid-cols-2 gap-3">
            <div><p className="text-xs text-gray-500">Deuda total</p><p className="text-lg font-bold text-orange-700">{formatCOP(credito.monto_total)}</p></div>
            <div><p className="text-xs text-gray-500">Saldo pendiente</p><p className="text-lg font-bold text-red-600">{formatCOP(credito.saldo_pendiente)}</p></div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor del abono *</label>
            <input
              type="number" value={monto} onChange={e => setMonto(e.target.value)}
              max={credito.saldo_pendiente} min="1" step="1" placeholder="$ 0" autoFocus
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2 mt-2">
              {[5000, 10000, 20000, 50000].map(v => (
                <button key={v} type="button" onClick={() => setMonto(Math.min(v, credito.saldo_pendiente).toString())}
                  className="text-xs bg-gray-100 hover:bg-blue-100 px-3 py-1.5 rounded-lg">{formatCOP(v)}</button>
              ))}
              <button type="button" onClick={() => setMonto(credito.saldo_pendiente.toString())}
                className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-medium">Todo</button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
            <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="efectivo">💵 Efectivo</option>
              <option value="nequi">🟣 Nequi</option>
              <option value="daviplata">🔴 Daviplata</option>
              <option value="transferencia">🏦 Transferencia</option>
              <option value="tarjeta">💳 Tarjeta</option>
            </select>
          </div>
          {metodoPago !== 'efectivo' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1"># Comprobante (opcional)</label>
              <input type="text" value={comprobante} onChange={e => setComprobante(e.target.value)}
                placeholder="Número de transacción"
                className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={isPending || !monto}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold disabled:opacity-50">
              {isPending ? 'Registrando...' : '✅ Registrar Abono'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CreditosPage() {
  const [filtroEstado, setFiltroEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [creditoAbono, setCreditoAbono] = useState(null);

  const { data: resumen } = useQuery({
    queryKey: ['creditos-resumen'],
    queryFn: () => creditosApi.resumen().then(r => r.data),
  });

  const { data: creditosData, isLoading } = useQuery({
    queryKey: ['creditos', filtroEstado, busqueda],
    queryFn: () => creditosApi.listar({ estado: filtroEstado, buscar: busqueda }).then(r => r.data),
  });

  const creditos = creditosData?.data || [];

  const FILTROS = [
    { id: '',          label: 'Todos',     icon: CreditCard },
    { id: 'pendiente', label: 'Pendiente', icon: Clock },
    { id: 'parcial',   label: 'Parcial',   icon: AlertTriangle },
    { id: 'vencido',   label: 'Vencidos',  icon: XCircle },
    { id: 'pagado',    label: 'Pagados',   icon: CheckCircle },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Créditos & Fiados</h1>
          <p className="text-sm text-gray-500 mt-1">Control de deudas y abonos</p>
        </div>
        <Link to="/pos" className="btn-primary">
          <Plus size={16} /> Crear Fiado en POS
        </Link>
      </div>

      {resumen && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="card"><p className="text-xs text-gray-500">Total Cartera</p><p className="text-xl font-bold text-gray-900">{formatCOP(resumen.total_cartera)}</p></div>
          <div className="card"><p className="text-xs text-gray-500">Créditos Activos</p><p className="text-xl font-bold text-blue-600">{resumen.creditos_activos}</p></div>
          <div className="card bg-red-50"><p className="text-xs text-red-500">Vencidos</p><p className="text-xl font-bold text-red-600">{resumen.creditos_vencidos}</p></div>
          <div className="card bg-red-50"><p className="text-xs text-red-500">Morosos</p><p className="text-xl font-bold text-red-600">{resumen.clientes_morosos}</p></div>
          <div className="card bg-green-50"><p className="text-xs text-green-600">Cobrado Hoy</p><p className="text-xl font-bold text-green-700">{formatCOP(resumen.cobrado_hoy)}</p></div>
          <div className="card bg-green-50"><p className="text-xs text-green-600">Cobrado Mes</p><p className="text-xl font-bold text-green-700">{formatCOP(resumen.cobrado_mes)}</p></div>
        </div>
      )}

      <div className="card">
        <div className="flex flex-wrap gap-2 mb-4">
          {FILTROS.map(f => (
            <button key={f.id} onClick={() => setFiltroEstado(f.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${filtroEstado === f.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              <f.icon size={14} />{f.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre de cliente o número..."
            className="input pl-9" />
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center"><div className="spinner w-8 h-8 mx-auto" /></div>
        ) : creditos.length === 0 ? (
          <div className="empty-state p-8">
            <CreditCard size={48} className="mb-2 opacity-30" />
            <p>No hay créditos para mostrar</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Cliente</th><th>N° Crédito</th><th className="text-right">Deuda Total</th>
                <th className="text-right">Saldo</th><th className="text-center">Estado</th>
                <th>Vence</th><th className="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {creditos.map(credito => (
                <tr key={credito.id}>
                  <td>
                    <p className="font-medium text-sm">{credito.cliente?.nombre}</p>
                    <p className="text-xs text-gray-500">{credito.cliente?.telefono}</p>
                  </td>
                  <td><span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{credito.numero_credito}</span></td>
                  <td className="text-right text-sm">{formatCOP(credito.monto_total)}</td>
                  <td className="text-right"><span className="font-bold text-sm text-red-600">{formatCOP(credito.saldo_pendiente)}</span></td>
                  <td className="text-center">
                    <span className={`badge ${CREDITO_ESTADO_COLOR[credito.estado]}`}>{ESTADO_LABELS[credito.estado]}</span>
                  </td>
                  <td className="text-sm text-gray-500">{credito.fecha_vencimiento ? formatFechaCorta(credito.fecha_vencimiento) : '—'}</td>
                  <td className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      {credito.estado !== 'pagado' && (
                        <button onClick={() => setCreditoAbono(credito)}
                          className="text-xs bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1.5 rounded-lg font-medium">
                          <DollarSign size={12} className="inline" /> Abonar
                        </button>
                      )}
                      <Link to={`/creditos/${credito.id}`} className="text-blue-600 hover:text-blue-800">
                        <ChevronRight size={16} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {creditoAbono && <ModalAbono credito={creditoAbono} onClose={() => setCreditoAbono(null)} />}
    </div>
  );
}