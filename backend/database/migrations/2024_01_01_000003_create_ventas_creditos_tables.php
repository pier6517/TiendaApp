<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * MIGRACIÓN: CLIENTES, VENTAS, CRÉDITOS Y CAJA
 * El orden de creación es crítico por las dependencias (foreign keys)
 */
return new class extends Migration
{
    public function up(): void
    {
        // ─────────────────────────────────────────
        // TABLA: CLIENTES
        // Clientes de la tienda, especialmente los fiados
        // ─────────────────────────────────────────
        Schema::create('clientes', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 150);
            $table->string('cedula', 20)->nullable()->unique();
            $table->string('telefono', 20)->nullable();
            $table->string('telefono2', 20)->nullable();
            $table->string('email')->nullable();
            $table->string('direccion')->nullable();
            $table->string('barrio', 100)->nullable();       // Muy útil en Colombia
            $table->string('ciudad', 100)->default('');

            // Control de crédito
            $table->decimal('cupo_credito', 12, 2)->default(0);    // Límite máximo de fiado
            $table->decimal('saldo_pendiente', 12, 2)->default(0); // Deuda actual total
            $table->boolean('permite_credito')->default(true);

            // Estado del cliente
            $table->enum('estado_credito', [
                'bueno',   // Al día
                'regular', // Algún atraso
                'moroso',  // En mora
                'bloqueado',// Sin crédito
            ])->default('bueno');

            $table->text('notas')->nullable();
            $table->boolean('activo')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index('nombre');
            $table->index('cedula');
            $table->index('estado_credito');
        });

        // ─────────────────────────────────────────
        // TABLA: CAJA REGISTRADORA
        // Control de apertura y cierre de caja diaria
        // ─────────────────────────────────────────
        Schema::create('cajas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users');     // Cajero responsable
            $table->date('fecha');
            $table->time('hora_apertura');
            $table->time('hora_cierre')->nullable();

            // Dinero en caja
            $table->decimal('saldo_inicial', 12, 2)->default(0);   // Con cuánto abre
            $table->decimal('saldo_final', 12, 2)->nullable();      // Con cuánto cierra
            $table->decimal('saldo_esperado', 12, 2)->nullable();   // Calculado por el sistema
            $table->decimal('diferencia', 12, 2)->nullable();       // saldo_final - saldo_esperado

            $table->enum('estado', ['abierta', 'cerrada'])->default('abierta');
            $table->text('observaciones')->nullable();
            $table->timestamps();

            $table->index(['fecha', 'estado']);
            $table->unique(['user_id', 'fecha']); // Un cajero, una caja por día
        });

        // ─────────────────────────────────────────
        // TABLA: VENTAS
        // Cada venta realizada en el POS
        // ─────────────────────────────────────────
        Schema::create('ventas', function (Blueprint $table) {
            $table->id();
            $table->string('numero_venta', 20)->unique();    // V-0001, V-0002...

            // Relaciones
            $table->foreignId('user_id')->constrained('users');    // Cajero que realizó
            $table->foreignId('cliente_id')->nullable()->constrained('clientes')->nullOnDelete();
            $table->foreignId('caja_id')->nullable()->constrained('cajas')->nullOnDelete();

            // Totales
            $table->decimal('subtotal', 12, 2);              // Sin impuestos
            $table->decimal('descuento', 12, 2)->default(0); // Descuento aplicado
            $table->decimal('impuesto', 12, 2)->default(0);  // IVA total
            $table->decimal('total', 12, 2);                 // Total a pagar

            // Pago
            $table->enum('metodo_pago', [
                'efectivo', 'nequi', 'daviplata',
                'transferencia', 'tarjeta', 'credito', 'fiado', 'mixto'
            ]);
            $table->decimal('monto_pagado', 12, 2)->default(0);    // Lo que entregó el cliente
            $table->decimal('cambio', 12, 2)->default(0);          // Vuelto

            // Estado de la venta
            $table->enum('estado', [
                'completada',  // Pagada al contado
                'pendiente',   // Fiado/Crédito sin pagar
                'anulada',     // Venta cancelada
                'devuelta',    // Devolución total
            ])->default('completada');

            $table->text('notas')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('numero_venta');
            $table->index('cliente_id');
            $table->index('estado');
            $table->index('created_at');
        });

        // ─────────────────────────────────────────
        // TABLA: DETALLE DE VENTAS
        // Cada producto dentro de una venta
        // ─────────────────────────────────────────
        Schema::create('venta_detalles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venta_id')->constrained('ventas')->cascadeOnDelete();
            $table->foreignId('producto_id')->constrained('productos')->restrictOnDelete();

            $table->string('nombre_producto');               // Snapshot del nombre al momento de vender
            $table->decimal('precio_unitario', 12, 2);       // Precio al momento de vender
            $table->decimal('costo_unitario', 12, 2);        // Para calcular ganancia
            $table->integer('cantidad');
            $table->decimal('descuento', 12, 2)->default(0);
            $table->decimal('impuesto', 12, 2)->default(0);
            $table->decimal('subtotal', 12, 2);              // precio * cantidad - descuento

            $table->timestamps();

            $table->index('venta_id');
            $table->index('producto_id');
        });

        // ─────────────────────────────────────────
        // TABLA: CRÉDITOS / FIADOS
        // NÚCLEO DEL SISTEMA — Control total de la deuda
        // ─────────────────────────────────────────
        Schema::create('creditos', function (Blueprint $table) {
            $table->id();
            $table->string('numero_credito', 20)->unique(); // CR-0001

            $table->foreignId('cliente_id')->constrained('clientes')->restrictOnDelete();
            $table->foreignId('venta_id')->nullable()->constrained('ventas')->nullOnDelete();
            $table->foreignId('user_id')->constrained('users'); // Quién aprobó

            // Montos
            $table->decimal('monto_total', 12, 2);           // Deuda original
            $table->decimal('saldo_pendiente', 12, 2);        // Cuánto falta por pagar
            $table->decimal('total_pagado', 12, 2)->default(0);

            // Condiciones del crédito
            $table->integer('numero_cuotas')->default(1);
            $table->decimal('interes', 5, 2)->default(0);    // % de interés (opcional)
            $table->date('fecha_inicio');
            $table->date('fecha_vencimiento')->nullable();

            // Estado
            $table->enum('estado', [
                'pendiente', // Sin ningún pago
                'parcial',   // Con pagos parciales
                'pagado',    // Saldado completamente
                'vencido',   // Pasó la fecha sin pagar
                'condonado', // Perdonado
            ])->default('pendiente');

            $table->text('observaciones')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('cliente_id');
            $table->index('estado');
            $table->index('fecha_vencimiento');
            $table->index('numero_credito');
        });

        // ─────────────────────────────────────────
        // TABLA: PAGOS DE CRÉDITOS (ABONOS)
        // Cada vez que el cliente abona a su deuda
        // ─────────────────────────────────────────
        Schema::create('credito_pagos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('credito_id')->constrained('creditos')->restrictOnDelete();
            $table->foreignId('user_id')->constrained('users'); // Quién recibió el pago
            $table->foreignId('caja_id')->nullable()->constrained('cajas')->nullOnDelete();

            $table->decimal('monto', 12, 2);                 // Valor del abono
            $table->decimal('saldo_antes', 12, 2);           // Saldo antes del abono
            $table->decimal('saldo_despues', 12, 2);         // Saldo después del abono

            $table->enum('metodo_pago', [
                'efectivo', 'nequi', 'daviplata',
                'transferencia', 'tarjeta'
            ])->default('efectivo');

            $table->string('comprobante')->nullable();       // Número de transferencia
            $table->text('observaciones')->nullable();
            $table->timestamps();

            $table->index('credito_id');
            $table->index('created_at');
        });

        // ─────────────────────────────────────────
        // TABLA: MOVIMIENTOS DE CAJA
        // Ingresos y egresos adicionales a las ventas
        // ─────────────────────────────────────────
        Schema::create('movimientos_caja', function (Blueprint $table) {
            $table->id();
            $table->foreignId('caja_id')->constrained('cajas')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users');

            $table->enum('tipo', ['ingreso', 'egreso']);
            $table->string('concepto', 200);                 // "Pago arriendo", "Venta extra"
            $table->decimal('monto', 12, 2);
            $table->enum('metodo_pago', [
                'efectivo', 'nequi', 'daviplata', 'transferencia', 'tarjeta'
            ])->default('efectivo');

            // Referencia al origen (venta, abono, etc.)
            $table->string('referencia_tipo')->nullable();
            $table->unsignedBigInteger('referencia_id')->nullable();

            $table->text('observaciones')->nullable();
            $table->timestamps();

            $table->index('caja_id');
            $table->index('tipo');
        });

        // ─────────────────────────────────────────
        // TABLA: GASTOS
        // Gastos operativos de la tienda
        // ─────────────────────────────────────────
        Schema::create('gastos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users');

            $table->string('concepto', 200);
            $table->enum('categoria', [
                'arriendo', 'servicios', 'nomina', 'compras',
                'mantenimiento', 'transporte', 'otros'
            ]);
            $table->decimal('monto', 12, 2);
            $table->date('fecha');
            $table->string('comprobante')->nullable();
            $table->text('observaciones')->nullable();
            $table->timestamps();

            $table->index('fecha');
            $table->index('categoria');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gastos');
        Schema::dropIfExists('movimientos_caja');
        Schema::dropIfExists('credito_pagos');
        Schema::dropIfExists('creditos');
        Schema::dropIfExists('venta_detalles');
        Schema::dropIfExists('ventas');
        Schema::dropIfExists('cajas');
        Schema::dropIfExists('clientes');
    }
};
