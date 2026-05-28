<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * MODELO: PRODUCTO
 * Representa un artículo del inventario.
 */
class Producto extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'codigo', 'codigo_barras', 'nombre', 'descripcion',
        'categoria_id', 'marca_id', 'proveedor_id',
        'costo', 'precio_venta', 'precio_mayorista',
        'stock', 'stock_minimo', 'stock_maximo',
        'unidad_medida', 'impuesto', 'activo',
        'permite_venta_negativa', 'es_servicio',
    ];

    protected $casts = [
        'costo'                  => 'decimal:2',
        'precio_venta'           => 'decimal:2',
        'precio_mayorista'       => 'decimal:2',
        'impuesto'               => 'decimal:2',
        'activo'                 => 'boolean',
        'permite_venta_negativa' => 'boolean',
        'es_servicio'            => 'boolean',
    ];

    // ─────────────────────────────────────────
    // RELACIONES
    // ─────────────────────────────────────────
    public function categoria()     { return $this->belongsTo(Categoria::class); }
    public function marca()         { return $this->belongsTo(Marca::class); }
    public function proveedor()     { return $this->belongsTo(Proveedor::class); }
    public function movimientos()   { return $this->hasMany(MovimientoInventario::class); }
    public function ventaDetalles() { return $this->hasMany(VentaDetalle::class); }

    // ─────────────────────────────────────────
    // SCOPES (filtros reutilizables)
    // ─────────────────────────────────────────

    /** Solo productos activos */
    public function scopeActivos($query)  { return $query->where('activo', true); }

    /** Productos con stock bajo */
    public function scopeStockBajo($query) {
        return $query->whereRaw('stock <= stock_minimo')->where('es_servicio', false);
    }

    /** Buscar por nombre o código de barras */
    public function scopeBuscar($query, string $termino) {
        return $query->where(function($q) use ($termino) {
            $q->where('nombre', 'LIKE', "%{$termino}%")
              ->orWhere('codigo', 'LIKE', "%{$termino}%")
              ->orWhere('codigo_barras', 'LIKE', "%{$termino}%");
        });
    }

    // ─────────────────────────────────────────
    // MÉTODOS DE NEGOCIO
    // ─────────────────────────────────────────

    /** Margen de ganancia en porcentaje */
    public function margenGanancia(): float {
        if ($this->costo <= 0) return 0;
        return round((($this->precio_venta - $this->costo) / $this->costo) * 100, 2);
    }

    /** ¿Tiene stock suficiente para vender? */
    public function tieneStock(int $cantidad = 1): bool {
        if ($this->es_servicio || $this->permite_venta_negativa) return true;
        return $this->stock >= $cantidad;
    }

    /** ¿Está en stock bajo? */
    public function estaEnStockBajo(): bool {
        return !$this->es_servicio && $this->stock <= $this->stock_minimo;
    }
}

// ══════════════════════════════════════════════════════════════

/**
 * MODELO: CATEGORIA
 */
class Categoria extends Model
{
    use HasFactory;

    protected $fillable = ['nombre', 'descripcion', 'icono', 'activo'];
    protected $casts    = ['activo' => 'boolean'];

    public function productos() { return $this->hasMany(Producto::class); }
}

// ══════════════════════════════════════════════════════════════

/**
 * MODELO: MARCA
 */
class Marca extends Model
{
    use HasFactory;

    protected $fillable = ['nombre', 'descripcion', 'activo'];
    protected $casts    = ['activo' => 'boolean'];

    public function productos() { return $this->hasMany(Producto::class); }
}

// ══════════════════════════════════════════════════════════════

/**
 * MODELO: PROVEEDOR
 */
class Proveedor extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'nombre', 'nit', 'telefono', 'email', 'contacto',
        'direccion', 'ciudad', 'saldo_pendiente', 'activo', 'notas',
    ];

    protected $casts = [
        'saldo_pendiente' => 'decimal:2',
        'activo'          => 'boolean',
    ];

    public function productos() { return $this->hasMany(Producto::class); }
}

// ══════════════════════════════════════════════════════════════

/**
 * MODELO: MOVIMIENTO INVENTARIO (Kardex)
 */
class MovimientoInventario extends Model
{
    use HasFactory;

    protected $table    = 'movimientos_inventario';
    protected $fillable = [
        'producto_id', 'user_id', 'tipo', 'cantidad',
        'stock_anterior', 'stock_nuevo', 'referencia_tipo',
        'referencia_id', 'costo_unitario', 'observacion',
    ];

    public function producto() { return $this->belongsTo(Producto::class); }
    public function user()     { return $this->belongsTo(User::class); }
}
