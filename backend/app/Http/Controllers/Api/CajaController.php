<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Caja;
use App\Models\MovimientoCaja;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

/**
 * CajaController
 * Gestión de la caja diaria: apertura, cierre, arqueo y movimientos.
 * Solo puede haber UNA caja abierta a la vez.
 */
class CajaController extends Controller
{
    /**
     * Obtener el estado actual de la caja.
     * GET /api/cash/current
     */
    public function actual(): JsonResponse
    {
        $caja = Caja::where('estado', 'abierta')
            ->with('usuario:id,name')
            ->latest()
            ->first();

        if (!$caja) {
            return response()->json([
                'abierta' => false,
                'message' => 'No hay caja abierta.',
                'caja'    => null,
            ]);
        }

        // Calcular saldo actual en tiempo real
        $saldoEsperado = $caja->calcularSaldoEsperado();

        // Resumen de movimientos del día
        $movimientos = MovimientoCaja::where('caja_id', $caja->id)
            ->selectRaw('tipo, SUM(monto) as total, COUNT(*) as cantidad')
            ->groupBy('tipo')
            ->get()
            ->keyBy('tipo');

        return response()->json([
            'abierta'        => true,
            'caja'           => $caja,
            'saldo_esperado' => $saldoEsperado,
            'resumen'        => [
                'ingresos_ventas' => $movimientos->get('venta')?->total ?? 0,
                'abonos'         => $movimientos->get('abono_credito')?->total ?? 0,
                'gastos'         => $movimientos->get('gasto')?->total ?? 0,
                'ingresos_extra' => $movimientos->get('ingreso_adicional')?->total ?? 0,
            ],
        ]);
    }

    /**
     * Abrir caja del día.
     * POST /api/cash/open
     */
    public function abrir(Request $request): JsonResponse
    {
        // Verificar que no haya caja abierta
        $cajaAbierta = Caja::where('estado', 'abierta')->exists();
        if ($cajaAbierta) {
            return response()->json([
                'message' => 'Ya hay una caja abierta. Ciérrela antes de abrir una nueva.',
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'saldo_inicial' => 'required|numeric|min:0',
            'observaciones' => 'nullable|string|max:500',
        ], [
            'saldo_inicial.required' => 'El saldo inicial es obligatorio.',
            'saldo_inicial.min'      => 'El saldo inicial no puede ser negativo.',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $caja = Caja::create([
            'usuario_id'    => Auth::id(),
            'saldo_inicial' => $request->saldo_inicial,
            'estado'        => 'abierta',
            'apertura'      => now(),
            'observaciones' => $request->observaciones,
        ]);

        return response()->json([
            'message' => 'Caja abierta exitosamente.',
            'caja'    => $caja->load('usuario:id,name'),
        ], 201);
    }

    /**
     * Cerrar caja del día con arqueo.
     * POST /api/cash/close
     */
    public function cerrar(Request $request): JsonResponse
    {
        $caja = Caja::where('estado', 'abierta')->latest()->first();

        if (!$caja) {
            return response()->json(['message' => 'No hay caja abierta.'], 422);
        }

        $validator = Validator::make($request->all(), [
            'saldo_final_real' => 'required|numeric|min:0',
            'observaciones'    => 'nullable|string|max:500',
        ], [
            'saldo_final_real.required' => 'El saldo real contado es obligatorio.',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $saldoEsperado = $caja->calcularSaldoEsperado();
        $saldoReal     = $request->saldo_final_real;
        $diferencia    = $saldoReal - $saldoEsperado;

        $caja->update([
            'saldo_final'    => $saldoReal,
            'saldo_esperado' => $saldoEsperado,
            'diferencia'     => $diferencia,
            'estado'         => 'cerrada',
            'cierre'         => now(),
            'observaciones'  => $request->observaciones,
        ]);

        return response()->json([
            'message'        => 'Caja cerrada exitosamente.',
            'caja'           => $caja->fresh()->load('usuario:id,name'),
            'saldo_esperado' => $saldoEsperado,
            'saldo_real'     => $saldoReal,
            'diferencia'     => $diferencia,
            'estado_arqueo'  => $diferencia === 0.0 ? 'cuadrada' : ($diferencia > 0 ? 'sobrante' : 'faltante'),
        ]);
    }

    /**
     * Registrar movimiento manual (ingreso o egreso).
     * POST /api/cash/movement
     */
    public function registrarMovimiento(Request $request): JsonResponse
    {
        $caja = Caja::where('estado', 'abierta')->latest()->first();

        if (!$caja) {
            return response()->json(['message' => 'No hay caja abierta.'], 422);
        }

        $validator = Validator::make($request->all(), [
            'tipo'        => 'required|in:ingreso_adicional,gasto,retiro,prestamo',
            'monto'       => 'required|numeric|min:1',
            'concepto'    => 'required|string|max:200',
            'referencia'  => 'nullable|string|max:100',
        ], [
            'tipo.in'          => 'Tipo inválido. Use: ingreso_adicional, gasto, retiro, prestamo.',
            'monto.min'        => 'El monto debe ser mayor a $0.',
            'concepto.required'=> 'El concepto es obligatorio.',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Los egresos tienen monto negativo en caja
        $tiposEgreso = ['gasto', 'retiro', 'prestamo'];
        $montoReal   = in_array($request->tipo, $tiposEgreso)
            ? -abs($request->monto)
            : abs($request->monto);

        $movimiento = MovimientoCaja::create([
            'caja_id'    => $caja->id,
            'usuario_id' => Auth::id(),
            'tipo'       => $request->tipo,
            'monto'      => $montoReal,
            'concepto'   => $request->concepto,
            'referencia' => $request->referencia,
        ]);

        return response()->json([
            'message'    => 'Movimiento registrado.',
            'movimiento' => $movimiento,
        ], 201);
    }

    /**
     * Historial de cajas (últimas 30).
     * GET /api/cash
     */
    public function historial(Request $request): JsonResponse
    {
        $cajas = Caja::with('usuario:id,name')
            ->orderBy('created_at', 'desc')
            ->paginate(30);

        return response()->json($cajas);
    }

    /**
     * Detalle de una caja con todos sus movimientos.
     * GET /api/cash/{id}
     */
    public function show(int $id): JsonResponse
    {
        $caja = Caja::with([
            'usuario:id,name',
            'movimientos' => fn($q) => $q->with('usuario:id,name')->orderBy('created_at', 'desc'),
        ])->findOrFail($id);

        return response()->json($caja);
    }
}
