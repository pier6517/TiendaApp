import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Plus, Search, AlertTriangle, Package,
  Edit, Trash2, PlusCircle, MinusCircle,
} from 'lucide-react'
import { productosApi, categoriasApi } from '@/api'
import { formatCOP } from '@/utils/format'

export default function ProductosPage() {
  const queryClient = useQueryClient()
  const params = new URLSearchParams(window.location.search)
  const [filtros, setFiltros] = useState({
    buscar: '', categoria_id: '',
    stock_bajo: params.get('stock_bajo') === '1',
    pagina: 1,
  })
  const [productoAjuste, setProductoAjuste] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['productos', filtros],
    queryFn: () => productosApi.listar({
      buscar:       filtros.buscar,
      categoria_id: filtros.categoria_id,
      stock_bajo:   filtros.stock_bajo ? 1 : undefined,
      page:         filtros.pagina,
    }).then(r => r.data),
    keepPreviousData: true,
  })

  const { data: categorias } = useQuery({
    queryKey: ['categorias'],
    queryFn: () => categoriasApi.listar().then(r => r.data),
  })

  const eliminarMutation = useMutation({
    mutationFn: (id) => productosApi.eliminar(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['productos'])
      toast.success('Producto eliminado.')
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Error al eliminar.'),
  })

  const confirmarEliminar = (producto) => {
    if (window.confirm(`¿Eliminar "${producto.nombre}"?`)) {
      eliminarMutation.mutate(producto.id)
    }
  }

  const actualizarFiltro = (campo, valor) =>
    setFiltros(f => ({ ...f, [campo]: valor, pagina: 1 }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data?.total ?? 0} productos registrados</p>
        </div>
        <Link to="/productos/nuevo" className="btn-primary">
          <Plus className="w-4 h-4" /> Nuevo producto
        </Link>
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o código..."
            value={filtros.buscar}
            onChange={e => actualizarFiltro('buscar', e.target.value)}
            className="input pl-10"
          />
        </div>
        <select
          value={filtros.categoria_id}
          onChange={e => actualizarFiltro('categoria_id', e.target.value)}
          className="input w-auto"
        >
          <option value="">Todas las categorías</option>
          {categorias?.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <button
          onClick={() => actualizarFiltro('stock_bajo', !filtros.stock_bajo)}
          className={`btn gap-2 ${filtros.stock_bajo ? 'bg-yellow-500 text-white' : 'btn-secondary'}`}
        >
          <AlertTriangle className="w-4 h-4" /> Stock bajo
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="spinner w-8 h-8" /></div>
      ) : data?.data?.length === 0 ? (
        <div className="empty-state card">
          <Package className="w-12 h-12 text-gray-300 mb-3" />
          <p className="font-medium text-gray-600">Sin productos</p>
          <Link to="/productos/nuevo" className="btn-primary mt-4">
            <Plus className="w-4 h-4" /> Agregar producto
          </Link>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th className="text-right">Costo</th>
                  <th className="text-right">Precio</th>
                  <th className="text-right">Margen</th>
                  <th className="text-center">Stock</th>
                  <th className="text-center">Estado</th>
                  <th className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data?.data?.map(prod => (
                  <ProductoFila
                    key={prod.id}
                    producto={prod}
                    onEliminar={confirmarEliminar}
                    onAjustar={setProductoAjuste}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {data?.last_page > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Mostrando {data.from}–{data.to} de {data.total} productos
              </p>
              <div className="flex gap-2">
                <button disabled={filtros.pagina === 1} onClick={() => actualizarFiltro('pagina', filtros.pagina - 1)} className="btn-secondary">Anterior</button>
                <span className="btn-secondary pointer-events-none">{filtros.pagina} / {data.last_page}</span>
                <button disabled={filtros.pagina === data.last_page} onClick={() => actualizarFiltro('pagina', filtros.pagina + 1)} className="btn-secondary">Siguiente</button>
              </div>
            </div>
          )}
        </>
      )}

      {productoAjuste && (
        <ModalAjusteStock
          producto={productoAjuste}
          onCerrar={() => setProductoAjuste(null)}
          onExito={() => {
            queryClient.invalidateQueries(['productos'])
            setProductoAjuste(null)
            toast.success('Stock actualizado. 📦')
          }}
        />
      )}
    </div>
  )
}

function ProductoFila({ producto, onEliminar, onAjustar }) {
  const stockBajo = producto.stock <= producto.stock_minimo
  const margen    = producto.costo > 0
    ? Math.round(((producto.precio_venta - producto.costo) / producto.costo) * 100)
    : 0

  return (
    <tr>
      <td><span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{producto.codigo}</span></td>
      <td>
        <p className="font-medium text-gray-900 line-clamp-1">{producto.nombre}</p>
        {producto.marca && <p className="text-xs text-gray-400">{producto.marca.nombre}</p>}
      </td>
      <td><span className="text-sm text-gray-600">{producto.categoria?.nombre ?? '—'}</span></td>
      <td className="text-right text-sm">{formatCOP(producto.costo)}</td>
      <td className="text-right font-semibold">{formatCOP(producto.precio_venta)}</td>
      <td className="text-right">
        <span className={`text-sm font-medium ${margen >= 20 ? 'text-green-600' : margen >= 10 ? 'text-yellow-600' : 'text-red-500'}`}>
          {margen}%
        </span>
      </td>
      <td className="text-center">
        <span className={`font-bold text-sm ${stockBajo ? 'text-red-600' : 'text-gray-800'}`}>
          {producto.stock}
          {stockBajo && <AlertTriangle className="w-3 h-3 inline ml-1" />}
        </span>
        <p className="text-xs text-gray-400">min: {producto.stock_minimo}</p>
      </td>
      <td className="text-center">
        <span className={producto.activo ? 'badge-green' : 'badge-gray'}>
          {producto.activo ? 'Activo' : 'Inactivo'}
        </span>
      </td>
      <td>
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => onAjustar(producto)}
            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition"
            title="Ajustar stock"
          >
            <PlusCircle className="w-4 h-4" />
          </button>
          <Link to={`/productos/${producto.id}`} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Editar">
            <Edit className="w-4 h-4" />
          </Link>
          <button onClick={() => onEliminar(producto)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition" title="Eliminar">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}

function ModalAjusteStock({ producto, onCerrar, onExito }) {
  const [cantidad, setCantidad] = useState('')
  const [tipo, setTipo]         = useState('ajuste_positivo')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!cantidad || parseInt(cantidad) <= 0) { toast.error('Ingresa una cantidad válida'); return }
    setLoading(true)
    try {
      await productosApi.ajustar(producto.id, {
        tipo,
        cantidad: parseInt(cantidad),
        motivo: tipo === 'ajuste_positivo' ? 'Entrada de mercancía' : 'Ajuste de inventario',
      })
      onExito()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al ajustar stock')
    }
    setLoading(false)
  }

  const stockFinal = tipo === 'ajuste_positivo'
    ? producto.stock + (parseInt(cantidad) || 0)
    : producto.stock - (parseInt(cantidad) || 0)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md">
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-800 text-lg">Ajustar stock</h3>
            <p className="text-sm text-gray-500">{producto.nombre}</p>
          </div>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-xl p-3 flex justify-between items-center">
            <span className="text-sm text-gray-600">Stock actual</span>
            <span className={`text-xl font-bold ${producto.stock <= producto.stock_minimo ? 'text-red-600' : 'text-gray-800'}`}>
              {producto.stock} unidades
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setTipo('ajuste_positivo')}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-medium text-sm transition-all
                ${tipo === 'ajuste_positivo' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600'}`}>
              <PlusCircle className="w-4 h-4" /> Entrada
            </button>
            <button type="button" onClick={() => setTipo('ajuste_negativo')}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-medium text-sm transition-all
                ${tipo === 'ajuste_negativo' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600'}`}>
              <MinusCircle className="w-4 h-4" /> Salida
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad de unidades</label>
            <input type="number" min="1" value={cantidad} onChange={e => setCantidad(e.target.value)}
              className="input text-center text-xl font-bold" placeholder="0" autoFocus inputMode="numeric" />
          </div>

          {cantidad && (
            <div className={`rounded-xl p-3 text-center ${stockFinal < 0 ? 'bg-red-50' : 'bg-blue-50'}`}>
              <p className="text-xs text-gray-500">Stock después del ajuste</p>
              <p className={`text-2xl font-bold ${stockFinal < 0 ? 'text-red-600' : 'text-blue-700'}`}>
                {stockFinal} unidades
              </p>
              {stockFinal < 0 && <p className="text-xs text-red-500 mt-1">⚠️ No puede quedar negativo</p>}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCerrar} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={loading || stockFinal < 0}
              className={`flex-1 btn text-white disabled:opacity-50 ${tipo === 'ajuste_positivo' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
              {loading ? 'Guardando...' : tipo === 'ajuste_positivo' ? '📦 Agregar stock' : '📉 Reducir stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}