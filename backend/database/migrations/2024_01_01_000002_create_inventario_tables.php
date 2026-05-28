<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * MIGRACIÓN: MÓDULO DE INVENTARIO
 * Crea las tablas: categorias, marcas, productos, movimientos_inventario
 * El orden importa por las foreign keys
 */
return new class extends Migration
{
    public function up(): void
    {
        // ─────────────────────────────────────────
        // TABLA: CATEGORÍAS
        // Agrupa los productos (Bebidas, Lácteos, Aseo, etc.)
        // ─────────────────────────────────────────
        Schema::create('categorias', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 100)->unique();
            $table->string('descripcion')->nullable();
            $table->string('icono', 50)->nullable();         // Icono para la UI
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        // ─────────────────────────────────────────
        // TABLA: MARCAS
        // Marca comercial del producto (Coca-Cola, Colanta, etc.)
        // ─────────────────────────────────────────
        Schema::create('marcas', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 100)->unique();
            $table->string('descripcion')->nullable();
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        // ─────────────────────────────────────────
        // TABLA: PROVEEDORES
        // Con quién se compra la mercancía
        // ─────────────────────────────────────────
        Schema::create('proveedores', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 150);
            $table->string('nit', 20)->nullable()->unique();
            $table->string('telefono', 20)->nullable();
            $table->string('email')->nullable();
            $table->string('contacto', 100)->nullable();      // Nombre del vendedor
            $table->string('direccion')->nullable();
            $table->string('ciudad', 100)->nullable();
            $table->decimal('saldo_pendiente', 12, 2)->default(0); // Cuentas por pagar
            $table->boolean('activo')->default(true);
            $table->text('notas')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // ─────────────────────────────────────────
        // TABLA: PRODUCTOS
        // Corazón del inventario
        // ─────────────────────────────────────────
        Schema::create('productos', function (Blueprint $table) {
            $table->id();

            // Identificación del producto
            $table->string('codigo', 50)->unique();           // Código interno (P001)
            $table->string('codigo_barras', 50)->nullable()->unique(); // EAN/UPC

            // Información básica
            $table->string('nombre', 200);
            $table->text('descripcion')->nullable();

            // Clasificación
            $table->foreignId('categoria_id')->constrained('categorias')->restrictOnDelete();
            $table->foreignId('marca_id')->nullable()->constrained('marcas')->nullOnDelete();
            $table->foreignId('proveedor_id')->nullable()->constrained('proveedores')->nullOnDelete();

            // Precios (en pesos colombianos, sin decimales en la práctica)
            $table->decimal('costo', 12, 2)->default(0);     // Precio de compra
            $table->decimal('precio_venta', 12, 2);          // Precio de venta al público
            $table->decimal('precio_mayorista', 12, 2)->nullable(); // Precio para mayoristas

            // Stock
            $table->integer('stock')->default(0);            // Unidades disponibles
            $table->integer('stock_minimo')->default(5);     // Alerta de stock bajo
            $table->integer('stock_maximo')->nullable();     // Para control de compras

            // Unidad de medida
            $table->enum('unidad_medida', [
                'unidad', 'kg', 'gramo', 'litro', 'ml',
                'par', 'caja', 'paquete', 'rollo', 'metro'
            ])->default('unidad');

            // Impuestos
            $table->decimal('impuesto', 5, 2)->default(0);   // % IVA (0, 5, 19)

            // Estado
            $table->boolean('activo')->default(true);
            $table->boolean('permite_venta_negativa')->default(false); // Vender sin stock
            $table->boolean('es_servicio')->default(false);  // No maneja inventario

            $table->timestamps();
            $table->softDeletes();

            // Índices para búsquedas rápidas en el POS
            $table->index('nombre');
            $table->index('codigo_barras');
            $table->index('categoria_id');
            $table->index('stock');
            $table->index('activo');
        });

        // ─────────────────────────────────────────
        // TABLA: MOVIMIENTOS DE INVENTARIO (KARDEX)
        // Registra CADA cambio de stock: entradas, salidas, ajustes
        // ─────────────────────────────────────────
        Schema::create('movimientos_inventario', function (Blueprint $table) {
            $table->id();

            $table->foreignId('producto_id')->constrained('productos')->restrictOnDelete();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete(); // Quién hizo el movimiento

            // Tipo de movimiento
            $table->enum('tipo', [
                'entrada',           // Compra de mercancía
                'salida',            // Venta
                'ajuste_positivo',   // Corrección de inventario (+)
                'ajuste_negativo',   // Corrección de inventario (-)
                'devolucion_compra', // Devolución al proveedor
                'devolucion_venta',  // Devolución del cliente
                'inventario_inicial',// Carga inicial del sistema
            ]);

            // Cantidades
            $table->integer('cantidad');                     // Unidades movidas
            $table->integer('stock_anterior');               // Stock antes del movimiento
            $table->integer('stock_nuevo');                  // Stock después del movimiento

            // Referencia al documento que originó el movimiento
            $table->string('referencia_tipo')->nullable();   // 'venta', 'compra', 'ajuste'
            $table->unsignedBigInteger('referencia_id')->nullable(); // ID del documento

            $table->decimal('costo_unitario', 12, 2)->nullable();
            $table->text('observacion')->nullable();

            $table->timestamps();

            $table->index('producto_id');
            $table->index('tipo');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('movimientos_inventario');
        Schema::dropIfExists('productos');
        Schema::dropIfExists('proveedores');
        Schema::dropIfExists('marcas');
        Schema::dropIfExists('categorias');
    }
};
