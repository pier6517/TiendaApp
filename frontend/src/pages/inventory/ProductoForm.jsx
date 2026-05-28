import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowLeft, Save, Package } from 'lucide-react'
import { productosApi, categoriasApi, marcasApi, proveedoresApi } from '@/api'
import { formatCOP } from '@/utils/format'

/**
 * ProductoForm
 * Crea o edita un producto. La misma página sirve para ambos casos.
 * Si hay :id en la URL, carga el producto existente.
 */
export default function ProductoForm() {
  const { id }    = useParams() // undefined = nuevo, número = editar
  const navigate  = useNavigate()
  const qc        = useQueryClient()
  const esNuevo   = !id

  const {
    register, handleSubmit, reset, watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      activo: true, impuesto: 0, stock: 0,
      stock_minimo: 5, unidad_medida: 'unidad',
    },
  })

  // Cargar producto si estamos editando
  const { data: productoData } = useQuery({
    queryKey: ['producto', id],
    queryFn: () => productosApi.obtener(id).then(r => r.data.producto),
    enabled: !!id,
  })

  // Llenar el form al cargar datos
  useEffect(() => {
    if (productoData) reset(productoData)
  }, [productoData, reset])

  // Catálogos
  const { data: categorias } = useQuery({ queryKey: ['categorias'], queryFn: () => categoriasApi.listar().then(r => r.data) })
  const { data: marcas }     = useQuery({ queryKey: ['marcas'],     queryFn: () => marcasApi.listar().then(r => r.data) })
  const { data: proveedores} = useQuery({ queryKey: ['proveedores'],queryFn: () => proveedoresApi.listar({}).then(r => r.data.data) })

  // Mutaciones
  const guardarMutation = useMutation({
    mutationFn: (datos) => esNuevo
      ? productosApi.crear(datos)
      : productosApi.actualizar(id, datos),
    onSuccess: () => {
      qc.invalidateQueries(['productos'])
      toast.success(esNuevo ? 'Producto creado exitosamente.' : 'Producto actualizado.')
      navigate('/productos')
    },
    onError: (err) => {
      const errors = err.response?.data?.errors
      if (errors) {
        Object.values(errors).flat().forEach(msg => toast.error(msg))
      } else {
        toast.error('Error al guardar el producto.')
      }
    },
  })

  // Preview de margen en tiempo real
  const costo = parseFloat(watch('costo') || 0)
  const precio = parseFloat(watch('precio_venta') || 0)
  const margen = costo > 0 ? Math.round(((precio - costo) / costo) * 100) : 0
  const ganancia = precio - costo

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/productos')} className="btn-secondary p-2">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {esNuevo ? 'Nuevo producto' : 'Editar producto'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {esNuevo ? 'Agrega un producto al inventario' : `Editando: ${productoData?.nombre}`}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(d => guardarMutation.mutate(d))} className="space-y-5">
        {/* Información básica */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-500" />
            Información básica
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nombre */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del producto <span className="text-red-500">*</span>
              </label>
              <input
                {...register('nombre', { required: 'El nombre es obligatorio.' })}
                className={`input ${errors.nombre ? 'border-red-400' : ''}`}
                placeholder="Ej: Coca-Cola 300ml"
              />
              {errors.nombre && <p className="mt-1 text-xs text-red-500">{errors.nombre.message}</p>}
            </div>

            {/* Código */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código interno</label>
              <input {...register('codigo')} className="input" placeholder="Ej: CCL-300" />
            </div>

            {/* Código de barras */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código de barras</label>
              <input {...register('codigo_barras')} className="input" placeholder="Escanea o digita" />
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría <span className="text-red-500">*</span>
              </label>
              <select
                {...register('categoria_id', { required: 'Selecciona una categoría.' })}
                className={`input ${errors.categoria_id ? 'border-red-400' : ''}`}
              >
                <option value="">Seleccionar...</option>
                {categorias?.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              {errors.categoria_id && <p className="mt-1 text-xs text-red-500">{errors.categoria_id.message}</p>}
            </div>

            {/* Marca */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
              <select {...register('marca_id')} className="input">
                <option value="">Sin marca</option>
                {marcas?.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </div>

            {/* Proveedor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor principal</label>
              <select {...register('proveedor_id')} className="input">
                <option value="">Sin proveedor</option>
                {proveedores?.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>

            {/* Unidad de medida */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unidad de medida</label>
              <select {...register('unidad_medida')} className="input">
                {['unidad', 'litro', 'kilogramo', 'gramo', 'caja', 'bolsa', 'par'].map(u => (
                  <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Precios */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Precios e impuestos</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Costo (compra) <span className="text-red-500">*</span>
              </label>
              <input
                {...register('costo', { required: 'El costo es obligatorio.', min: { value: 0, message: 'Mínimo $0' } })}
                type="number" step="1" min="0"
                className={`input ${errors.costo ? 'border-red-400' : ''}`}
                placeholder="0"
              />
              {errors.costo && <p className="mt-1 text-xs text-red-500">{errors.costo.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio de venta <span className="text-red-500">*</span>
              </label>
              <input
                {...register('precio_venta', { required: 'El precio es obligatorio.', min: { value: 0, message: 'Mínimo $0' } })}
                type="number" step="1" min="0"
                className={`input ${errors.precio_venta ? 'border-red-400' : ''}`}
                placeholder="0"
              />
              {errors.precio_venta && <p className="mt-1 text-xs text-red-500">{errors.precio_venta.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IVA (%)</label>
              <select {...register('impuesto')} className="input">
                <option value={0}>0% — Exento</option>
                <option value={5}>5%</option>
                <option value={19}>19% — General</option>
              </select>
            </div>
          </div>

          {/* Preview margen */}
          {costo > 0 && precio > 0 && (
            <div className={`rounded-lg p-3 text-sm flex gap-4 ${margen >= 20 ? 'bg-green-50 text-green-700' : margen >= 10 ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'}`}>
              <span>Ganancia por unidad: <strong>{formatCOP(ganancia)}</strong></span>
              <span>Margen: <strong>{margen}%</strong></span>
              {margen < 10 && <span>⚠️ Margen bajo</span>}
            </div>
          )}
        </div>

        {/* Stock */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Control de stock</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock inicial {esNuevo && <span className="text-gray-400">(unidades actuales)</span>}
              </label>
              <input
                {...register('stock', { min: { value: 0, message: 'Mínimo 0' } })}
                type="number" min="0"
                className="input"
                disabled={!esNuevo} // En edición, usar "Ajustar inventario"
              />
              {!esNuevo && (
                <p className="text-xs text-gray-400 mt-1">Usa "Ajustar inventario" para cambiar el stock.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock mínimo (alerta)</label>
              <input
                {...register('stock_minimo', { min: { value: 0, message: 'Mínimo 0' } })}
                type="number" min="0"
                className="input"
              />
            </div>
          </div>

          {/* Estado activo */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              {...register('activo')}
              type="checkbox"
              className="w-4 h-4 rounded border-gray-300 text-blue-600"
            />
            <span className="text-sm font-medium text-gray-700">Producto activo (visible en POS)</span>
          </label>
        </div>

        {/* Botones */}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate('/productos')} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? (
              <><span className="spinner w-4 h-4" /> Guardando...</>
            ) : (
              <><Save className="w-4 h-4" /> {esNuevo ? 'Crear producto' : 'Guardar cambios'}</>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
