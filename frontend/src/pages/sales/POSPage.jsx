import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Minus, Trash2, User, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { productosApi, ventasApi, clientesApi } from '@/api';
import { formatCOP } from '@/utils/format';

const METODOS_PAGO = [
  { id: 'efectivo',      label: '💵 Efectivo'     },
  { id: 'nequi',         label: '🟣 Nequi'         },
  { id: 'daviplata',     label: '🔴 Daviplata'     },
  { id: 'transferencia', label: '🏦 Transferencia' },
  { id: 'tarjeta',       label: '💳 Tarjeta'       },
  { id: 'fiado',         label: '🤝 Fiado'         },
];

export default function POSPage() {
  const queryClient = useQueryClient();
  const [carrito, setCarrito]                   = useState([]);
  const [busqueda, setBusqueda]                 = useState('');
  const [metodoPago, setMetodoPago]             = useState('efectivo');
  const [montoPagado, setMontoPagado]           = useState('');
  const [descuento, setDescuento]               = useState(0);
  const [clienteId, setClienteId]               = useState(null);
  const [buscarCliente, setBuscarCliente]       = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const busquedaRef = useRef(null);

  // Todos los productos para la grilla rápida
  const { data: todosProductos = [] } = useQuery({
    queryKey: ['productos-pos-todos'],
    queryFn: () => productosApi.listar({ page: 1 }).then(r => r.data.data),
  });

  // Búsqueda en tiempo real
  const { data: resultadosBusqueda = [], isLoading: buscando } = useQuery({
    queryKey: ['productos-buscar', busqueda],
    queryFn: () => productosApi.buscar(busqueda).then(r => r.data),
    enabled: busqueda.length >= 2,
  });

  // Búsqueda de clientes para fiado
  const { data: clientesBusqueda = [] } = useQuery({
    queryKey: ['clientes-buscar', buscarCliente],
    queryFn: () => clientesApi.buscar(buscarCliente).then(r => r.data.data),
    enabled: buscarCliente.length >= 2,
  });

  // Crear venta
  const { mutate: crearVenta, isPending: creando } = useMutation({
    mutationFn: (datos) => ventasApi.crear(datos),
    onSuccess: (response) => {
      toast.success(`✅ Venta ${response.data.venta.numero_venta} registrada!`);
      setCarrito([]);
      setBusqueda('');
      setMetodoPago('efectivo');
      setMontoPagado('');
      setDescuento(0);
      setClienteSeleccionado(null);
      setClienteId(null);
      queryClient.invalidateQueries(['productos-pos-todos']);
      busquedaRef.current?.focus();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al crear la venta');
    },
  });

  // Cálculos
  const subtotal = carrito.reduce((sum, item) => sum + (item.precio_venta * item.cantidad), 0);
  const total    = subtotal - descuento;
  const cambio   = Math.max(0, parseFloat(montoPagado || 0) - total);

  const agregarProducto = useCallback((producto) => {
    if (producto.stock <= 0) {
      toast.error(`Sin stock: ${producto.nombre}`);
      return;
    }
    setCarrito(prev => {
      const existe = prev.find(i => i.id === producto.id);
      if (existe) {
        if (existe.cantidad >= producto.stock) {
          toast.error(`Stock máximo: ${producto.stock}`);
          return prev;
        }
        return prev.map(i => i.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });
    setBusqueda('');
  }, []);

  const cambiarCantidad = (id, delta) => {
    setCarrito(prev => prev
      .map(i => i.id === id ? { ...i, cantidad: i.cantidad + delta } : i)
      .filter(i => i.cantidad > 0)
    );
  };

  const procesarVenta = () => {
    if (carrito.length === 0) return toast.error('Agrega al menos un producto');
    if (metodoPago === 'fiado' && !clienteId) return toast.error('Para fiado debes seleccionar un cliente');
    if (metodoPago === 'efectivo' && montoPagado && parseFloat(montoPagado) < total) return toast.error('El monto pagado es menor al total');

    crearVenta({
      cliente_id:  clienteId,
      metodo_pago: metodoPago,
      descuento,
      items: carrito.map(item => ({
        producto_id:     item.id,
        cantidad:        item.cantidad,
        precio_unitario: item.precio_venta,
      })),
    });
  };

  // Productos filtrados para la grilla (excluye los ya en carrito o sin stock)
  const productosGrilla = todosProductos
    .filter(p => p.activo && p.stock > 0)
    .slice(0, 20);

  return (
    <div className="flex gap-3 h-full" style={{ minHeight: 'calc(100vh - 100px)' }}>

      {/* ── PANEL IZQUIERDO ── */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">

        {/* Barra de búsqueda */}
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              ref={busquedaRef}
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar producto por nombre o código..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              autoFocus
            />
          </div>

          {/* Resultados búsqueda */}
          {busqueda.length >= 2 && (
            <div className="mt-2 border border-gray-100 rounded-lg overflow-hidden divide-y max-h-48 overflow-y-auto">
              {buscando ? (
                <div className="p-3 text-center text-sm text-gray-500">Buscando...</div>
              ) : resultadosBusqueda.length === 0 ? (
                <div className="p-3 text-center text-sm text-gray-500">No encontrado</div>
              ) : (
                resultadosBusqueda.map(producto => (
                  <button key={producto.id} onClick={() => agregarProducto(producto)}
                    className="w-full flex items-center justify-between p-2.5 hover:bg-blue-50 text-left">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{producto.nombre}</p>
                      <p className="text-xs text-gray-400">Stock: {producto.stock}</p>
                    </div>
                    <p className="text-sm font-bold text-blue-600">{formatCOP(producto.precio_venta)}</p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* ── GRILLA DE PRODUCTOS RÁPIDOS ── */}
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Toca para agregar al carrito
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
            {productosGrilla.map(producto => {
              const enCarrito = carrito.find(i => i.id === producto.id);
              return (
                <button
                  key={producto.id}
                  onClick={() => agregarProducto(producto)}
                  className={`
                    relative flex flex-col items-center justify-center p-2 rounded-xl border-2 
                    text-center transition-all hover:scale-105 active:scale-95
                    ${enCarrito
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                    }
                  `}
                >
                  {/* Badge cantidad en carrito */}
                  {enCarrito && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {enCarrito.cantidad}
                    </span>
                  )}
                  {/* Nombre */}
                  <p className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2 mb-1">
                    {producto.nombre}
                  </p>
                  {/* Precio */}
                  <p className="text-sm font-bold text-blue-600">
                    {formatCOP(producto.precio_venta)}
                  </p>
                  {/* Stock */}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {producto.stock} u.
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── PANEL DERECHO: CARRITO Y COBRO ── */}
      <div className="w-72 flex flex-col gap-3">

        {/* Cliente para fiado */}
        {metodoPago === 'fiado' && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-orange-800 mb-2 flex items-center gap-1">
              <User size={12} /> Cliente requerido para fiado
            </p>
            {clienteSeleccionado ? (
              <div className="flex items-center justify-between bg-white rounded-lg p-2">
                <div>
                  <p className="text-sm font-medium">{clienteSeleccionado.nombre}</p>
                  <p className="text-xs text-gray-500">{formatCOP(clienteSeleccionado.saldo_pendiente)} pendiente</p>
                </div>
                <button onClick={() => { setClienteSeleccionado(null); setClienteId(null); }} className="text-red-400">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <input type="text" value={buscarCliente} onChange={e => setBuscarCliente(e.target.value)}
                  placeholder="Buscar cliente..." autoFocus
                  className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-orange-400" />
                {buscarCliente.length >= 2 && (
                  <div className="mt-1 border rounded-lg bg-white max-h-32 overflow-y-auto">
                    {clientesBusqueda.slice(0, 5).map(c => (
                      <button key={c.id} onClick={() => { setClienteSeleccionado(c); setClienteId(c.id); setBuscarCliente(''); }}
                        className="w-full text-left px-3 py-2 hover:bg-orange-50 text-sm border-b last:border-b-0">
                        <p className="font-medium">{c.nombre}</p>
                        <p className="text-xs text-gray-500">Debe: {formatCOP(c.saldo_pendiente)}</p>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Carrito */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 flex flex-col">
          <div className="p-3 border-b border-gray-100">
            <p className="font-semibold text-gray-800 text-sm">
              🛒 Carrito — {carrito.length} producto{carrito.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5" style={{ maxHeight: '200px' }}>
            {carrito.length === 0 ? (
              <p className="text-center text-gray-400 text-xs py-6">Toca un producto para agregar</p>
            ) : (
              carrito.map(item => (
                <div key={item.id} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{item.nombre}</p>
                    <p className="text-xs text-gray-500">{formatCOP(item.precio_venta)} c/u</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => cambiarCantidad(item.id, -1)}
                      className="w-6 h-6 bg-red-100 text-red-600 rounded-full text-xs font-bold flex items-center justify-center">−</button>
                    <span className="w-5 text-center text-xs font-bold">{item.cantidad}</span>
                    <button onClick={() => cambiarCantidad(item.id, 1)}
                      className="w-6 h-6 bg-green-100 text-green-600 rounded-full text-xs font-bold flex items-center justify-center">+</button>
                  </div>
                  <p className="text-xs font-bold text-gray-800 w-14 text-right">
                    {formatCOP(item.precio_venta * item.cantidad)}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Totales */}
          <div className="p-3 border-t border-gray-100 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span><span>{formatCOP(subtotal)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-16">Descuento</span>
              <input type="number" value={descuento} onChange={e => setDescuento(parseFloat(e.target.value) || 0)}
                min="0" max={subtotal}
                className="flex-1 px-2 py-1 border rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div className="flex justify-between font-bold text-base border-t pt-2">
              <span>TOTAL</span>
              <span className="text-blue-600">{formatCOP(total)}</span>
            </div>
          </div>
        </div>

        {/* Método de pago */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
          <div className="grid grid-cols-2 gap-1.5 mb-2">
            {METODOS_PAGO.map(mp => (
              <button key={mp.id} onClick={() => setMetodoPago(mp.id)}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all border-2 ${
                  metodoPago === mp.id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                }`}>
                {mp.label}
              </button>
            ))}
          </div>

          {metodoPago === 'efectivo' && (
            <div className="space-y-1">
              <input type="number" value={montoPagado} onChange={e => setMontoPagado(e.target.value)}
                placeholder={`$ ${total.toLocaleString('es-CO')}`}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {parseFloat(montoPagado) > 0 && (
                <div className="bg-green-50 rounded-lg p-2 flex justify-between text-sm">
                  <span className="text-green-700">💵 Cambio:</span>
                  <span className="font-bold text-green-800">{formatCOP(cambio)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Botón cobrar */}
        <button onClick={procesarVenta} disabled={carrito.length === 0 || creando}
          className={`w-full py-3.5 rounded-xl font-bold text-base transition-all ${
            carrito.length === 0 || creando
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg active:scale-95'
          }`}>
          {creando ? '⏳ Procesando...' : `💳 Cobrar ${formatCOP(total)}`}
        </button>
      </div>
    </div>
  );
}