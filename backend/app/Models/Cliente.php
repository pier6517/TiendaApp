<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * MODELO: CLIENTE
 * Clientes de la tienda, con control de crédito y fiado.
 */
class Cliente extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'nombre', 'cedula', 'telefono', 'telefono2', 'email',
        'direccion', 'barrio', 'ciudad', 'cupo_credito',
        'saldo_pendiente', 'permite_credito', 'estado_credito',
        'notas', 'activo',
    ];

    protected $casts = [
        'cupo_credito'    => 'decimal:2',
        'saldo_pendiente' => 'decimal:2',
        'permite_credito' => 'boolean',
        'activo'          => 'boolean',
    ];

    // Relaciones
    public function ventas()   { return $this->hasMany(Venta::class); }
    public function creditos() { return $this->hasMany(Credito::class); }

    // Scopes
    public function scopeMorosos($query) {
        return $query->where('estado_credito', 'moroso');
    }

    public function scopeConDeuda($query) {
        return $query->where('saldo_pendiente', '>', 0);
    }

    public function scopeBuscar($query, string $termino) {
        return $query->where(function($q) use ($termino) {
            $q->where('nombre', 'LIKE', "%{$termino}%")
              ->orWhere('cedula', 'LIKE', "%{$termino}%")
              ->orWhere('telefono', 'LIKE', "%{$termino}%");
        });
    }

    // Métodos de negocio
    /** ¿Puede adquirir más crédito? */
    public function puedeTomarCredito(float $monto): bool {
        if (!$this->permite_credito) return false;
        if ($this->estado_credito === 'bloqueado') return false;
        if ($this->cupo_credito <= 0) return true; // Sin límite
        return ($this->saldo_pendiente + $monto) <= $this->cupo_credito;
    }

    /** Creditos activos (pendiente o parcial) */
    public function creditosActivos() {
        return $this->creditos()->whereIn('estado', ['pendiente', 'parcial']);
    }

    /** Actualizar estado de crédito basado en saldo */
    public function actualizarEstadoCredito(): void {
        if ($this->saldo_pendiente <= 0) {
            $this->estado_credito = 'bueno';
        }
        // La mora se actualiza por un comando programado
        $this->save();
    }
}

// ══════════════════════════════════════════════════════════════

/**
 * MODELO: VENTA
 */
class Venta extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'numero_venta', 'user_id', 'cliente_id', 'caja_id',
        'subtotal', 'descuento', 'impuesto', 'total',
        'metodo_pago', 'monto_pagado', 'cambio', 'estado', 'notas',
    ];

    protected $casts = [
        'subtotal'     => 'decimal:2',
        'descuento'    => 'decimal:2',
        'impuesto'     => 'decimal:2',
        'total'        => 'decimal:2',
        'monto_pagado' => 'decimal:2',
        'cambio'       => 'decimal:2',
    ];

    // Relaciones
    public function user()     { return $this->belongsTo(User::class); }
    public function cliente()  { return $this->belongsTo(Cliente::class); }
    public function caja()     { return $this->belongsTo(Caja::class); }
    public function detalles() { return $this->hasMany(VentaDetalle::class, 'venta_id'); }
    public function credito()  { return $this->hasOne(Credito::class); }

    // Scopes
    public function scopeDelDia($query) {
        return $query->whereDate('created_at', today());
    }

    public function scopeCompletadas($query) {
        return $query->where('estado', 'completada');
    }

    /** Ganancia bruta de la venta */
    public function gananciaBruta(): float {
        return $this->detalles->sum(function($d) {
            return ($d->precio_unitario - $d->costo_unitario) * $d->cantidad;
        });
    }
}

// ══════════════════════════════════════════════════════════════

/**
 * MODELO: VENTA DETALLE
 * Línea de producto dentro de una venta.
 */
class VentaDetalle extends Model
{
    use HasFactory;

    protected $table    = 'venta_detalles';
    protected $fillable = [
        'venta_id', 'producto_id', 'nombre_producto',
        'precio_unitario', 'costo_unitario', 'cantidad',
        'descuento', 'impuesto', 'subtotal',
    ];

    protected $casts = [
        'precio_unitario' => 'decimal:2',
        'costo_unitario'  => 'decimal:2',
        'descuento'       => 'decimal:2',
        'impuesto'        => 'decimal:2',
        'subtotal'        => 'decimal:2',
    ];

    public function venta()    { return $this->belongsTo(Venta::class); }
    public function producto() { return $this->belongsTo(Producto::class); }

    /** Ganancia de esta línea */
    public function ganancia(): float {
        return ($this->precio_unitario - $this->costo_unitario) * $this->cantidad;
    }
}

// ══════════════════════════════════════════════════════════════

/**
 * MODELO: CREDITO (FIADO)
 * Núcleo del sistema — control de deudas.
 */
class Credito extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'numero_credito', 'cliente_id', 'venta_id', 'user_id',
        'monto_total', 'saldo_pendiente', 'total_pagado',
        'numero_cuotas', 'interes', 'fecha_inicio',
        'fecha_vencimiento', 'estado', 'observaciones',
    ];

    protected $casts = [
        'monto_total'      => 'decimal:2',
        'saldo_pendiente'  => 'decimal:2',
        'total_pagado'     => 'decimal:2',
        'interes'          => 'decimal:2',
        'fecha_inicio'     => 'date',
        'fecha_vencimiento'=> 'date',
    ];

    // Relaciones
    public function cliente() { return $this->belongsTo(Cliente::class); }
    public function venta()   { return $this->belongsTo(Venta::class); }
    public function user()    { return $this->belongsTo(User::class); }
    public function pagos()   { return $this->hasMany(CreditoPago::class); }

    // Scopes
    public function scopeActivos($query) {
        return $query->whereIn('estado', ['pendiente', 'parcial']);
    }

    public function scopeVencidos($query) {
        return $query->where('estado', 'vencido')
                     ->orWhere(function($q) {
                         $q->whereIn('estado', ['pendiente', 'parcial'])
                           ->where('fecha_vencimiento', '<', now());
                     });
    }

    // Métodos de negocio
    /** Porcentaje pagado */
    public function porcentajePagado(): float {
        if ($this->monto_total <= 0) return 0;
        return round(($this->total_pagado / $this->monto_total) * 100, 1);
    }

    /** ¿Está vencido? */
    public function estaVencido(): bool {
        if (!$this->fecha_vencimiento) return false;
        return $this->fecha_vencimiento->isPast() &&
               in_array($this->estado, ['pendiente', 'parcial']);
    }

    /**
     * Aplicar un abono al crédito.
     * Actualiza saldo, total pagado y estado.
     */
    public function aplicarAbono(float $monto): void {
        $this->total_pagado    += $monto;
        $this->saldo_pendiente -= $monto;

        if ($this->saldo_pendiente <= 0) {
            $this->saldo_pendiente = 0;
            $this->estado = 'pagado';
        } elseif ($this->total_pagado > 0) {
            $this->estado = 'parcial';
        }

        $this->save();
    }
}

// ══════════════════════════════════════════════════════════════

/**
 * MODELO: CREDITO PAGO (ABONO)
 */
class CreditoPago extends Model
{
    use HasFactory;

    protected $table    = 'credito_pagos';
    protected $fillable = [
        'credito_id', 'user_id', 'caja_id', 'monto',
        'saldo_antes', 'saldo_despues', 'metodo_pago',
        'comprobante', 'observaciones',
    ];

    protected $casts = [
        'monto'          => 'decimal:2',
        'saldo_antes'    => 'decimal:2',
        'saldo_despues'  => 'decimal:2',
    ];

    public function credito() { return $this->belongsTo(Credito::class); }
    public function user()    { return $this->belongsTo(User::class); }
    public function caja()    { return $this->belongsTo(Caja::class); }
}

// ══════════════════════════════════════════════════════════════

/**
 * MODELO: CAJA
 */
class Caja extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'fecha', 'hora_apertura', 'hora_cierre',
        'saldo_inicial', 'saldo_final', 'saldo_esperado',
        'diferencia', 'estado', 'observaciones',
    ];

    protected $casts = [
        'fecha'           => 'date',
        'saldo_inicial'   => 'decimal:2',
        'saldo_final'     => 'decimal:2',
        'saldo_esperado'  => 'decimal:2',
        'diferencia'      => 'decimal:2',
    ];

    public function user()              { return $this->belongsTo(User::class); }
    public function ventas()            { return $this->hasMany(Venta::class); }
    public function movimientos()       { return $this->hasMany(MovimientoCaja::class); }
    public function pagosCredito()      { return $this->hasMany(CreditoPago::class); }

    public function estaAbierta(): bool { return $this->estado === 'abierta'; }

    /** Calcular saldo esperado basado en movimientos */
    public function calcularSaldoEsperado(): float {
        $ventas_efectivo = $this->ventas()
            ->where('estado', '!=', 'anulada')
            ->where('metodo_pago', 'efectivo')
            ->sum('total');

        $abonos_efectivo = $this->pagosCredito()
            ->where('metodo_pago', 'efectivo')
            ->sum('monto');

        $ingresos_extra = $this->movimientos()
            ->where('tipo', 'ingreso')
            ->where('metodo_pago', 'efectivo')
            ->sum('monto');

        $egresos = $this->movimientos()
            ->where('tipo', 'egreso')
            ->where('metodo_pago', 'efectivo')
            ->sum('monto');

        return $this->saldo_inicial + $ventas_efectivo + $abonos_efectivo + $ingresos_extra - $egresos;
    }
}

// ══════════════════════════════════════════════════════════════

/**
 * MODELO: MOVIMIENTO CAJA
 */
class MovimientoCaja extends Model
{
    use HasFactory;

    protected $table    = 'movimientos_caja';
    protected $fillable = [
        'caja_id', 'user_id', 'tipo', 'concepto',
        'monto', 'metodo_pago', 'referencia_tipo',
        'referencia_id', 'observaciones',
    ];

    protected $casts = ['monto' => 'decimal:2'];

    public function caja() { return $this->belongsTo(Caja::class); }
    public function user() { return $this->belongsTo(User::class); }
}

// ══════════════════════════════════════════════════════════════

/**
 * MODELO: GASTO
 */
class Gasto extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'concepto', 'categoria', 'monto',
        'fecha', 'comprobante', 'observaciones',
    ];

    protected $casts = [
        'monto' => 'decimal:2',
        'fecha' => 'date',
    ];

    public function user() { return $this->belongsTo(User::class); }

    public function scopeDelMes($query, int $mes, int $anio) {
        return $query->whereMonth('fecha', $mes)->whereYear('fecha', $anio);
    }
}
