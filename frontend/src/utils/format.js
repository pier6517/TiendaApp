// ── Formateo de moneda colombiana ────────────────────────────────
export function formatCOP(valor) {
  if (valor === null || valor === undefined) return '$ 0'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(valor)
}

export function formatNum(valor) {
  return new Intl.NumberFormat('es-CO').format(valor ?? 0)
}

// ── Formateo de fechas ───────────────────────────────────────────
function parseFecha(fecha) {
  if (!fecha) return null
  // Reemplaza espacio por T para compatibilidad
  const f = typeof fecha === 'string' ? fecha.replace(' ', 'T') : fecha
  const d = new Date(f)
  return isNaN(d.getTime()) ? null : d
}

export function formatFecha(fecha) {
  const d = parseFecha(fecha)
  if (!d) return '—'
  return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function formatFechaCorta(fecha) {
  const d = parseFecha(fecha)
  if (!d) return '—'
  return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatDateTime(fecha) {
  const d = parseFecha(fecha)
  if (!d) return '—'
  return d.toLocaleDateString('es-CO', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

// ── Constantes de estado ─────────────────────────────────────────
export const CREDITO_ESTADO_COLOR = {
  pendiente: 'badge-yellow',
  parcial:   'badge-blue',
  pagado:    'badge-green',
  vencido:   'badge-red',
  condonado: 'badge-gray',
}

export const CLIENTE_ESTADO_COLOR = {
  bueno:    'badge-green',
  regular:  'badge-yellow',
  moroso:   'badge-red',
  bloqueado:'badge-gray',
}

export const VENTA_ESTADO_COLOR = {
  completada: 'badge-green',
  anulada:    'badge-red',
  pendiente:  'badge-yellow',
  devuelta:   'badge-gray',
}

export const ESTADO_LABELS = {
  pendiente:  'Pendiente',
  parcial:    'Parcial',
  pagado:     'Pagado',
  vencido:    'Vencido',
  condonado:  'Condonado',
  bueno:      'Bueno',
  regular:    'Regular',
  moroso:     'Moroso',
  bloqueado:  'Bloqueado',
  completada: 'Completada',
  anulada:    'Anulada',
}

export const METODO_PAGO_LABELS = {
  efectivo:      '💵 Efectivo',
  nequi:         '🟣 Nequi',
  daviplata:     '🔴 Daviplata',
  transferencia: '🏦 Transferencia',
  tarjeta:       '💳 Tarjeta',
  fiado:         '🤝 Fiado',
  credito:       '📋 Crédito',
  mixto:         '🔀 Mixto',
}

export function calcularCambio(pagado, total) {
  return Math.max(0, parseFloat(pagado || 0) - parseFloat(total || 0))
}

export function truncar(texto, largo = 30) {
  if (!texto) return ''
  return texto.length > largo ? texto.slice(0, largo) + '...' : texto
}

export function iniciales(nombre) {
  if (!nombre) return '?'
  return nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}