<?php

namespace App\Services;

use App\Models\Venta;
use App\Models\VentaDetalle;
use App\Models\Producto;
use App\Models\Caja;
use App\Models\MovimientoCaja;
use App\Models\MovimientoInventario;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

/**
 * SERVICE: VENTA SERVICE
 *
 * Contiene toda la lógica de negocio de las ventas.
 * Los controladores deben usar este servicio, NO la lógica directamente.
 *
 * Responsabilidades:
 * - Crear ventas (validar stock, calcular totales, registrar movimientos)
 * - Generar número de venta correlativo
 * - Actualizar stock de productos
 * - Registrar movimiento en caja
 * - Iniciar crédito si la venta es fiada
 */
class VentaService
{
    public function __construct(
        private readonly CreditoService $creditoService
    ) {}

    /**
     * CREAR UNA NUEVA VENTA (POS)
     *
     * @param array $datos {
     *   cliente_id?: int,
     *   metodo_pago: string,
     *   monto_pagado: float,
     *   descuento: float,
     *   items: [{ producto_id, cantidad, precio_unitario }],
     *   notas?: string
     * }
     * @return Venta
     */
    public function crearVenta(array $datos): Venta
    {
        return DB::transaction(function () use ($datos) {

            // 1. Verificar que haya caja abierta
            $caja = $this->obtenerCajaAbierta();

            // 2. Validar stock de todos los productos antes de crear nada
            $this->validarStock($datos['items']);

            // 3. Calcular totales
            $totales = $this->calcularTotales($datos['items'], $datos['descuento'] ?? 0);

            // 4. Determinar cambio
            $cambio = max(0, ($datos['monto_pagado'] ?? $totales['total']) - $totales['total']);

            // 5. Crear la venta
            $venta = Venta::create([
                'numero_venta' => $this->generarNumeroVenta(),
                'user_id'      => Auth::id(),
                'cliente_id'   => $datos['cliente_id'] ?? null,
                'caja_id'      => $caja?->id,
                'subtotal'     => $totales['subtotal'],
                'descuento'    => $totales['descuento'],
                'impuesto'     => $totales['impuesto'],
                'total'        => $totales['total'],
                'metodo_pago'  => $datos['metodo_pago'],
                'monto_pagado' => $datos['monto_pagado'] ?? $totales['total'],
                'cambio'       => $cambio,
                'estado'       => in_array($datos['metodo_pago'], ['fiado', 'credito'])
                                  ? 'pendiente' : 'completada',
                'notas'        => $datos['notas'] ?? null,
            ]);

            // 6. Crear el detalle (líneas de productos)
            foreach ($datos['items'] as $item) {
                $producto = Producto::findOrFail($item['producto_id']);

                VentaDetalle::create([
                    'venta_id'        => $venta->id,
                    'producto_id'     => $producto->id,
                    'nombre_producto' => $producto->nombre,        // Snapshot
                    'precio_unitario' => $item['precio_unitario'],
                    'costo_unitario'  => $producto->costo,         // Para ganancia
                    'cantidad'        => $item['cantidad'],
                    'descuento'       => $item['descuento'] ?? 0,
                    'impuesto'        => $item['impuesto'] ?? 0,
                    'subtotal'        => $item['precio_unitario'] * $item['cantidad'],
                ]);

                // 7. Descontar del inventario
                $this->descontarStock($producto, $item['cantidad'], $venta->id);
            }

            // 8. Si es fiado → crear crédito automáticamente
            if (in_array($datos['metodo_pago'], ['fiado', 'credito'])) {
                $this->creditoService->crearDesdeVenta($venta, $datos);
            }

            // 9. Registrar en caja (si hay caja abierta y el pago es efectivo)
            if ($caja && in_array($datos['metodo_pago'], ['efectivo', 'mixto'])) {
                $this->registrarEnCaja($caja, $venta);
            }

            // Cargar relaciones para la respuesta
            return $venta->load(['detalles.producto', 'cliente', 'user']);
        });
    }

    /**
     * ANULAR UNA VENTA
     * Devuelve el stock y revierte el movimiento de caja.
     */
    public function anularVenta(Venta $venta, string $motivo): Venta
    {
        if ($venta->estado === 'anulada') {
            throw new \Exception('La venta ya fue anulada.');
        }

        return DB::transaction(function () use ($venta, $motivo) {
            // Devolver stock
            foreach ($venta->detalles as $detalle) {
                $producto = $detalle->producto;
                $stockAnterior = $producto->stock;
                $producto->increment('stock', $detalle->cantidad);

                MovimientoInventario::create([
                    'producto_id'      => $producto->id,
                    'user_id'          => Auth::id(),
                    'tipo'             => 'devolucion_venta',
                    'cantidad'         => $detalle->cantidad,
                    'stock_anterior'   => $stockAnterior,
                    'stock_nuevo'      => $producto->stock,
                    'referencia_tipo'  => 'venta',
                    'referencia_id'    => $venta->id,
                    'observacion'      => "Anulación: {$motivo}",
                ]);
            }

            $venta->update(['estado' => 'anulada', 'notas' => $motivo]);

            return $venta;
        });
    }

    // ─────────────────────────────────────────
    // MÉTODOS PRIVADOS
    // ─────────────────────────────────────────

    /** Verificar stock disponible antes de procesar */
    private function validarStock(array $items): void
    {
        foreach ($items as $item) {
            $producto = Producto::findOrFail($item['producto_id']);

            if (!$producto->tieneStock($item['cantidad'])) {
                throw new \Exception(
                    "Stock insuficiente para '{$producto->nombre}'. " .
                    "Disponible: {$producto->stock}, solicitado: {$item['cantidad']}"
                );
            }
        }
    }

    /** Calcular subtotal, descuento, impuesto y total */
    private function calcularTotales(array $items, float $descuentoGlobal = 0): array
    {
        $subtotal = 0;
        $impuesto = 0;

        foreach ($items as $item) {
            $lineaSubtotal = $item['precio_unitario'] * $item['cantidad'];
            $lineaDescuento = $item['descuento'] ?? 0;
            $lineaBase = $lineaSubtotal - $lineaDescuento;

            // Calcular IVA de la línea
            $producto = Producto::find($item['producto_id']);
            $lineaIva = $lineaBase * ($producto->impuesto / 100);

            $subtotal += $lineaBase;
            $impuesto += $lineaIva;
        }

        $total = $subtotal + $impuesto - $descuentoGlobal;

        return [
            'subtotal'  => round($subtotal, 2),
            'descuento' => round($descuentoGlobal, 2),
            'impuesto'  => round($impuesto, 2),
            'total'     => round(max(0, $total), 2),
        ];
    }

    /** Descontar unidades del stock y registrar en kardex */
    private function descontarStock(Producto $producto, int $cantidad, int $ventaId): void
    {
        $stockAnterior = $producto->stock;
        $producto->decrement('stock', $cantidad);

        MovimientoInventario::create([
            'producto_id'    => $producto->id,
            'user_id'        => Auth::id(),
            'tipo'           => 'salida',
            'cantidad'       => $cantidad,
            'stock_anterior' => $stockAnterior,
            'stock_nuevo'    => $producto->stock,
            'referencia_tipo'=> 'venta',
            'referencia_id'  => $ventaId,
            'costo_unitario' => $producto->costo,
        ]);
    }

    /** Registrar el pago de efectivo en la caja */
    private function registrarEnCaja(Caja $caja, Venta $venta): void
    {
        MovimientoCaja::create([
            'caja_id'         => $caja->id,
            'user_id'         => Auth::id(),
            'tipo'            => 'ingreso',
            'concepto'        => "Venta #{$venta->numero_venta}",
            'monto'           => $venta->monto_pagado,
            'metodo_pago'     => $venta->metodo_pago,
            'referencia_tipo' => 'venta',
            'referencia_id'   => $venta->id,
        ]);
    }

    /** Generar número correlativo V-0001 */
    private function generarNumeroVenta(): string
    {
        $ultimo = Venta::withTrashed()->max('id') ?? 0;
        return 'V-' . str_pad($ultimo + 1, 6, '0', STR_PAD_LEFT);
    }

    /** Obtener caja abierta del usuario actual */
    private function obtenerCajaAbierta(): ?Caja
    {
        return Caja::where('user_id', Auth::id())
                   ->where('estado', 'abierta')
                   ->whereDate('fecha', today())
                   ->first();
    }
}
