import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  Lock, Unlock, DollarSign, ArrowUpCircle,
  ArrowDownCircle, AlertCircle, CheckCircle,
} from 'lucide-react'
import { cajaApi } from '@/api'
import { formatCOP, formatDateTime } from '@/utils/format'

/**
 * CajaPage
 * Gestión de la caja diaria.
 * - Si no hay caja abierta: muestra formulario de apertura.
 * - Si hay caja abierta: muestra resumen y opciones de cierre/movimientos.
 */
export default function CajaPage() {
  const qc = useQueryClient()
  const [modalMovimiento, setModalMovimiento] = useState(false)
  const [modalCierre, setModalCierre]         = useState(false)

  // Estado actual de la caja
  const { data: estado, isLoading } = useQuery({
    queryKey: ['caja-actual'],
    queryFn: () => cajaApi.actual().then(r => r.data),
    refetchInterval: 30_000,
  })

  // Abrir caja
  const abrirMutation = useMutation({
    mutationFn: (datos) => cajaApi.abrir(datos),
    onSuccess: () => {
      qc.invalidateQueries(['caja-actual'])
      toast.success('¡Caja abierta! Buen día de ventas. 💚')
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Error al abrir caja.'),
  })

  // Registrar movimiento manual
  const movimientoMutation = useMutation({
    mutationFn: (datos) => cajaApi.registrarMovimiento(datos),
    onSuccess: () => {
      qc.invalidateQueries(['caja-actual'])
      setModalMovimiento(false)
      toast.success('Movimiento registrado.')
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Error al registrar movimiento.'),
  })

  // Cerrar caja
  const cerrarMutation = useMutation({
    mutationFn: (datos) => cajaApi.cerrar(datos),
    onSuccess: (res) => {
      qc.invalidateQueries(['caja-actual'])
      setModalCierre(false)
      const diff = res.data.diferencia
      if (diff === 0) toast.success('¡Caja cuadrada perfectamente! 🎯')
      else if (diff > 0) toast.success(`Caja cerrada. Sobrante: ${formatCOP(diff)}`)
      else toast.error(`Caja cerrada. Faltante: ${formatCOP(Math.abs(diff))}`)
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Error al cerrar caja.'),
  })

  if (isLoading) return <div className="flex justify-center py-20"><div className="spinner w-8 h-8" /></div>

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Caja diaria</h1>

      {!estado?.abierta ? (
        // ── CAJA CERRADA: formulario de apertura ──────────────────
        <AbrirCajaForm onAbrir={abrirMutation.mutate} loading={abrirMutation.isPending} />
      ) : (
        // ── CAJA ABIERTA: resumen y acciones ─────────────────────
        <>
          {/* Estado de la caja */}
          <div className="card bg-green-50 border-green-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <Unlock className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-green-800">Caja abierta</p>
                <p className="text-sm text-green-600">
                  Desde {formatDateTime(estado.caja?.apertura)} · {estado.caja?.usuario?.name}
                </p>
              </div>
            </div>

            {/* Saldo esperado */}
            <div className="bg-white rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Saldo esperado en caja</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {formatCOP(estado.saldo_esperado ?? 0)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Inicial: {formatCOP(estado.caja?.saldo_inicial ?? 0)}
              </p>
            </div>

            {/* Resumen del día */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <ResumenItem
                label="Ventas efectivo"
                valor={estado.resumen?.ingresos_ventas ?? 0}
                tipo="ingreso"
              />
              <ResumenItem
                label="Abonos recibidos"
                valor={estado.resumen?.abonos ?? 0}
                tipo="ingreso"
              />
              <ResumenItem
                label="Gastos"
                valor={estado.resumen?.gastos ?? 0}
                tipo="egreso"
              />
              <ResumenItem
                label="Ingresos extra"
                valor={estado.resumen?.ingresos_extra ?? 0}
                tipo="ingreso"
              />
            </div>
          </div>

          {/* Acciones */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setModalMovimiento(true)}
              className="btn-secondary py-3 flex-col gap-1 h-auto"
            >
              <ArrowUpCircle className="w-5 h-5 text-blue-500" />
              <span>Registrar movimiento</span>
            </button>
            <button
              onClick={() => setModalCierre(true)}
              className="btn py-3 flex-col gap-1 h-auto bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
            >
              <Lock className="w-5 h-5" />
              <span>Cerrar caja</span>
            </button>
          </div>
        </>
      )}

      {/* Modal: registrar movimiento */}
      {modalMovimiento && (
        <ModalMovimiento
          onGuardar={movimientoMutation.mutate}
          onCerrar={() => setModalMovimiento(false)}
          loading={movimientoMutation.isPending}
        />
      )}

      {/* Modal: cerrar caja */}
      {modalCierre && (
        <ModalCierre
          saldoEsperado={estado?.saldo_esperado ?? 0}
          onCerrar={() => setModalCierre(false)}
          onConfirmar={cerrarMutation.mutate}
          loading={cerrarMutation.isPending}
        />
      )}
    </div>
  )
}

// ── Sub-componentes ──────────────────────────────────────────────

function AbrirCajaForm({ onAbrir, loading }) {
  const { register, handleSubmit, formState: { errors } } = useForm()

  return (
    <div className="card text-center space-y-5">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto">
        <Lock className="w-8 h-8 text-gray-400" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Caja cerrada</h2>
        <p className="text-sm text-gray-500 mt-1">Ingresa el dinero inicial para abrir la caja del día.</p>
      </div>
      <form onSubmit={handleSubmit(onAbrir)} className="space-y-4 text-left">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Saldo inicial <span className="text-red-500">*</span>
          </label>
          <input
            {...register('saldo_inicial', { required: 'Ingresa el saldo inicial.' })}
            type="number" min="0" step="1000"
            className={`input text-xl text-center font-bold ${errors.saldo_inicial ? 'border-red-400' : ''}`}
            placeholder="0"
          />
          {errors.saldo_inicial && <p className="mt-1 text-xs text-red-500">{errors.saldo_inicial.message}</p>}
        </div>
        <button type="submit" disabled={loading} className="btn-success w-full py-3 text-base">
          {loading ? <><span className="spinner w-4 h-4" /> Abriendo...</> : '🔓 Abrir caja'}
        </button>
      </form>
    </div>
  )
}

function ResumenItem({ label, valor, tipo }) {
  return (
    <div className="bg-white rounded-lg p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`font-semibold text-sm mt-0.5 ${tipo === 'ingreso' ? 'text-green-700' : 'text-red-600'}`}>
        {tipo === 'ingreso' ? '+' : '-'}{formatCOP(valor)}
      </p>
    </div>
  )
}

function ModalMovimiento({ onGuardar, onCerrar, loading }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm()
  const tipo = watch('tipo')
  const esEgreso = ['gasto', 'retiro', 'prestamo'].includes(tipo)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <h3 className="font-semibold text-gray-800 mb-4">Registrar movimiento</h3>
        <form onSubmit={handleSubmit(onGuardar)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select {...register('tipo', { required: true })} className="input">
              <option value="ingreso_adicional">↑ Ingreso adicional</option>
              <option value="gasto">↓ Gasto</option>
              <option value="retiro">↓ Retiro de efectivo</option>
              <option value="prestamo">↓ Préstamo</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
            <input
              {...register('monto', { required: 'Ingresa el monto.', min: 1 })}
              type="number" min="1"
              className={`input ${errors.monto ? 'border-red-400' : ''}`}
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Concepto</label>
            <input
              {...register('concepto', { required: 'Describe el concepto.' })}
              className={`input ${errors.concepto ? 'border-red-400' : ''}`}
              placeholder="Ej: Pago servicio de agua"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCerrar} className="btn-secondary flex-1">Cancelar</button>
            <button
              type="submit" disabled={loading}
              className={`flex-1 btn ${esEgreso ? 'bg-red-600 text-white hover:bg-red-700' : 'btn-success'}`}
            >
              {loading ? 'Guardando...' : `${esEgreso ? '↓' : '↑'} Registrar`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalCierre({ saldoEsperado, onCerrar, onConfirmar, loading }) {
  const { register, handleSubmit, watch } = useForm()
  const saldoReal = parseFloat(watch('saldo_final_real') || 0)
  const diferencia = saldoReal - saldoEsperado

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <h3 className="font-semibold text-gray-800 mb-2">Cerrar caja</h3>
        <p className="text-sm text-gray-500 mb-4">
          Cuenta el dinero físico en caja e ingresa el total.
        </p>
        <div className="bg-blue-50 rounded-lg p-3 mb-4 text-sm">
          <p className="text-blue-700">Saldo esperado del sistema: <strong>{formatCOP(saldoEsperado)}</strong></p>
        </div>
        <form onSubmit={handleSubmit(onConfirmar)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dinero contado físicamente
            </label>
            <input
              {...register('saldo_final_real', { required: true, min: 0 })}
              type="number" min="0" step="1000"
              className="input text-xl text-center font-bold"
              placeholder="0"
            />
          </div>
          {saldoReal > 0 && (
            <div className={`rounded-lg p-3 text-center text-sm font-medium ${
              diferencia === 0 ? 'bg-green-50 text-green-700' :
              diferencia > 0  ? 'bg-blue-50 text-blue-700' :
                                'bg-red-50 text-red-700'
            }`}>
              {diferencia === 0 && <><CheckCircle className="w-4 h-4 inline mr-1" /> ¡Caja cuadrada!</>}
              {diferencia > 0  && <>Sobrante: {formatCOP(diferencia)}</>}
              {diferencia < 0  && <><AlertCircle className="w-4 h-4 inline mr-1" /> Faltante: {formatCOP(Math.abs(diferencia))}</>}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCerrar} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-danger flex-1">
              {loading ? 'Cerrando...' : '🔒 Cerrar caja'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
