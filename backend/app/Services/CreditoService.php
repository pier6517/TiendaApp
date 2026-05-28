<?php

namespace App\Services;

use App\Models\Credito;
use App\Models\CreditoPago;
use App\Models\Cliente;
use App\Models\Venta;
use App\Models\MovimientoCaja;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

/**
 * SERVICE: CREDITO SERVICE
 *
 * Lógica de negocio del módulo de fiados y créditos.
 * Este es el NÚCLEO del sistema.
 *
 * Responsabilidades:
 * - Crear créditos (manual o desde venta)
 * - Registrar abonos
 * - Actualizar estados
 * - Marcar créditos vencidos
 * - Reportes de cartera
 */
class CreditoService
{
    /**
     * CREAR CRÉDITO DESDE UNA VENTA FIADA
     * Se llama automáticamente desde VentaService.
     */
    public function crearDesdeVenta(Venta $venta, array $datos): Credito
    {
        // Validar que el cliente puede tomar crédito
        if ($venta->cliente_id) {
            $cliente = Cliente::findOrFail($venta->cliente_id);

            if (!$cliente->puedeTomarCredito($venta->total)) {
                throw new \Exception(
                    "El cliente '{$cliente->nombre}' no puede tomar más crédito. " .
                    "Cupo disponible: $" . number_format($cliente->cupo_credito - $cliente->saldo_pendiente, 0, ',', '.')
                );
            }
        }

        return DB::transaction(function () use ($venta, $datos) {
            // Crear el crédito
            $credito = Credito::create([
                'numero_credito'    => $this->generarNumeroCredito(),
                'cliente_id'        => $venta->cliente_id,
                'venta_id'          => $venta->id,
                'user_id'           => Auth::id(),
                'monto_total'       => $venta->total,
                'saldo_pendiente'   => $venta->total,
                'total_pagado'      => 0,
                'numero_cuotas'     => $datos['numero_cuotas'] ?? 1,
                'interes'           => $datos['interes'] ?? 0,
                'fecha_inicio'      => today(),
                'fecha_vencimiento' => $datos['fecha_vencimiento'] ?? null,
                'estado'            => 'pendiente',
                'observaciones'     => $datos['notas'] ?? null,
            ]);

            // Actualizar saldo del cliente
            if ($venta->cliente_id) {
                $venta->cliente->increment('saldo_pendiente', $venta->total);
            }

            return $credito;
        });
    }

    /**
     * CREAR CRÉDITO MANUAL
     * Para registrar deudas que no vienen de una venta en el sistema.
     */
    public function crearManual(array $datos): Credito
    {
        $cliente = Cliente::findOrFail($datos['cliente_id']);

        if (!$cliente->puedeTomarCredito($datos['monto'])) {
            throw new \Exception("El cliente supera su cupo de crédito.");
        }

        return DB::transaction(function () use ($datos, $cliente) {
            $credito = Credito::create([
                'numero_credito'    => $this->generarNumeroCredito(),
                'cliente_id'        => $cliente->id,
                'venta_id'          => null,
                'user_id'           => Auth::id(),
                'monto_total'       => $datos['monto'],
                'saldo_pendiente'   => $datos['monto'],
                'total_pagado'      => 0,
                'numero_cuotas'     => $datos['numero_cuotas'] ?? 1,
                'interes'           => $datos['interes'] ?? 0,
                'fecha_inicio'      => $datos['fecha_inicio'] ?? today(),
                'fecha_vencimiento' => $datos['fecha_vencimiento'] ?? null,
                'estado'            => 'pendiente',
                'observaciones'     => $datos['observaciones'] ?? null,
            ]);

            // Actualizar saldo del cliente
            $cliente->increment('saldo_pendiente', $datos['monto']);

            return $credito;
        });
    }

    /**
     * REGISTRAR UN ABONO A UN CRÉDITO
     *
     * Flujo:
     * 1. Validar monto
     * 2. Registrar pago
     * 3. Actualizar crédito (saldo, estado)
     * 4. Actualizar cliente (saldo_pendiente)
     * 5. Registrar en caja si aplica
     */
    public function registrarAbono(Credito $credito, array $datos): CreditoPago
    {
        if ($credito->estado === 'pagado') {
            throw new \Exception('Este crédito ya está pagado completamente.');
        }

        if ($datos['monto'] <= 0) {
            throw new \Exception('El monto del abono debe ser mayor a cero.');
        }

        if ($datos['monto'] > $credito->saldo_pendiente) {
            throw new \Exception(
                "El abono (\${$datos['monto']}) supera el saldo pendiente " .
                "(\${$credito->saldo_pendiente})."
            );
        }

        return DB::transaction(function () use ($credito, $datos) {
            $saldoAntes   = $credito->saldo_pendiente;
            $saldoDespues = $saldoAntes - $datos['monto'];

            // 1. Registrar el pago
            $pago = CreditoPago::create([
                'credito_id'     => $credito->id,
                'user_id'        => Auth::id(),
                'caja_id'        => $datos['caja_id'] ?? null,
                'monto'          => $datos['monto'],
                'saldo_antes'    => $saldoAntes,
                'saldo_despues'  => $saldoDespues,
                'metodo_pago'    => $datos['metodo_pago'] ?? 'efectivo',
                'comprobante'    => $datos['comprobante'] ?? null,
                'observaciones'  => $datos['observaciones'] ?? null,
            ]);

            // 2. Actualizar el crédito
            $credito->aplicarAbono($datos['monto']);

            // 3. Actualizar saldo del cliente
            $credito->cliente->decrement('saldo_pendiente', $datos['monto']);

            // Si el cliente queda en cero, marcar como bueno
            if ($credito->cliente->fresh()->saldo_pendiente <= 0) {
                $credito->cliente->update(['estado_credito' => 'bueno']);
            }

            // 4. Registrar en caja si se paga en efectivo
            if (isset($datos['caja_id']) && $datos['metodo_pago'] === 'efectivo') {
                MovimientoCaja::create([
                    'caja_id'         => $datos['caja_id'],
                    'user_id'         => Auth::id(),
                    'tipo'            => 'ingreso',
                    'concepto'        => "Abono crédito #{$credito->numero_credito} - {$credito->cliente->nombre}",
                    'monto'           => $datos['monto'],
                    'metodo_pago'     => 'efectivo',
                    'referencia_tipo' => 'credito_pago',
                    'referencia_id'   => $pago->id,
                ]);
            }

            return $pago->load(['credito.cliente', 'user']);
        });
    }

    /**
     * MARCAR CRÉDITOS VENCIDOS
     * Ejecutar diariamente con un comando programado (cron).
     */
    public function marcarVencidos(): int
    {
        $cantidad = Credito::whereIn('estado', ['pendiente', 'parcial'])
            ->whereNotNull('fecha_vencimiento')
            ->where('fecha_vencimiento', '<', now())
            ->update(['estado' => 'vencido']);

        // Marcar clientes como morosos
        if ($cantidad > 0) {
            $clientesConVencidos = Credito::where('estado', 'vencido')
                ->pluck('cliente_id')
                ->unique();

            Cliente::whereIn('id', $clientesConVencidos)
                ->update(['estado_credito' => 'moroso']);
        }

        return $cantidad;
    }

    /**
     * RESUMEN DE CARTERA
     * Para el dashboard — cuánto dinero está por cobrar.
     */
    public function resumenCartera(): array
    {
        return [
            'total_cartera'    => Credito::activos()->sum('saldo_pendiente'),
            'creditos_activos' => Credito::activos()->count(),
            'creditos_vencidos'=> Credito::where('estado', 'vencido')->count(),
            'clientes_morosos' => Cliente::morosos()->count(),
            'cobrado_hoy'      => CreditoPago::whereDate('created_at', today())->sum('monto'),
            'cobrado_mes'      => CreditoPago::whereMonth('created_at', now()->month)->sum('monto'),
        ];
    }

    /** Generar número correlativo CR-000001 */
    private function generarNumeroCredito(): string
    {
        $ultimo = Credito::withTrashed()->max('id') ?? 0;
        return 'CR-' . str_pad($ultimo + 1, 6, '0', STR_PAD_LEFT);
    }
}
