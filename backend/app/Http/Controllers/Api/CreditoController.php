<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Credito;
use App\Models\Cliente;
use App\Models\Venta;
use App\Models\Caja;
use App\Services\CreditoService;
use App\Services\VentaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * CONTROLADOR: CRÉDITOS
 *
 * Endpoints:
 * GET  /api/credits            → Listar créditos con filtros
 * POST /api/credits            → Crear crédito manual
 * GET  /api/credits/{id}       → Ver crédito detallado
 * POST /api/credits/{id}/payment → Registrar abono
 * GET  /api/credits/overdue    → Créditos vencidos
 * GET  /api/credits/summary    → Resumen de cartera
 */
class CreditoController extends Controller
{
    public function __construct(
        private readonly CreditoService $creditoService
    ) {}

    /**
     * LISTAR CRÉDITOS
     * Filtros: estado, cliente, fecha, vencidos
     */
    public function index(Request $request): JsonResponse
    {
        $query = Credito::with(['cliente:id,nombre,telefono', 'user:id,name'])
            ->latest();

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }

        if ($request->filled('cliente_id')) {
            $query->where('cliente_id', $request->cliente_id);
        }

        if ($request->boolean('vencidos')) {
            $query->vencidos();
        }

        if ($request->filled('buscar')) {
            $query->whereHas('cliente', function($q) use ($request) {
                $q->buscar($request->buscar);
            })->orWhere('numero_credito', 'LIKE', "%{$request->buscar}%");
        }

        $creditos = $query->paginate($request->get('por_pagina', 15));

        return response()->json($creditos);
    }

    /**
     * CREAR CRÉDITO MANUAL
     * POST /api/credits
     */
    public function store(Request $request): JsonResponse
    {
        // Solo admin y supervisor pueden crear créditos manualmente
        if (!Auth::user()->puedeAprobarCreditos()) {
            return response()->json(['message' => 'Sin permisos para crear créditos.'], 403);
        }

        $validated = $request->validate([
            'cliente_id'        => ['required', 'exists:clientes,id'],
            'monto'             => ['required', 'numeric', 'min:1'],
            'numero_cuotas'     => ['nullable', 'integer', 'min:1', 'max:60'],
            'interes'           => ['nullable', 'numeric', 'min:0', 'max:100'],
            'fecha_inicio'      => ['nullable', 'date'],
            'fecha_vencimiento' => ['nullable', 'date', 'after:today'],
            'observaciones'     => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $credito = $this->creditoService->crearManual($validated);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => 'Crédito creado correctamente.',
            'credito' => $credito->load(['cliente', 'user']),
        ], 201);
    }

    /**
     * VER CRÉDITO DETALLADO
     * GET /api/credits/{id}
     */
    public function show(Credito $credito): JsonResponse
    {
        $credito->load([
            'cliente',
            'venta.detalles.producto',
            'user:id,name',
            'pagos.user:id,name',
        ]);

        return response()->json([
            'credito'            => $credito,
            'porcentaje_pagado'  => $credito->porcentajePagado(),
            'esta_vencido'       => $credito->estaVencido(),
        ]);
    }

    /**
     * REGISTRAR ABONO
     * POST /api/credits/{id}/payment
     *
     * Body: { monto, metodo_pago, comprobante?, observaciones? }
     */
    public function registrarAbono(Request $request, Credito $credito): JsonResponse
    {
        $validated = $request->validate([
            'monto'         => ['required', 'numeric', 'min:1'],
            'metodo_pago'   => ['required', 'in:efectivo,nequi,daviplata,transferencia,tarjeta'],
            'comprobante'   => ['nullable', 'string', 'max:100'],
            'observaciones' => ['nullable', 'string', 'max:500'],
        ]);

        // Obtener caja abierta del cajero actual
        $caja = Caja::where('user_id', Auth::id())
            ->where('estado', 'abierta')
            ->whereDate('fecha', today())
            ->first();

        $validated['caja_id'] = $caja?->id;

        try {
            $pago = $this->creditoService->registrarAbono($credito, $validated);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message'        => 'Abono registrado correctamente.',
            'pago'           => $pago,
            'credito'        => $credito->fresh()->load('cliente'),
            'saldo_restante' => $credito->fresh()->saldo_pendiente,
        ], 201);
    }

    /**
     * CRÉDITOS VENCIDOS
     * GET /api/credits/overdue
     */
    public function vencidos(): JsonResponse
    {
        $creditos = Credito::vencidos()
            ->with(['cliente:id,nombre,telefono,barrio', 'user:id,name'])
            ->orderBy('fecha_vencimiento')
            ->get();

        return response()->json([
            'total'    => $creditos->count(),
            'cartera'  => $creditos->sum('saldo_pendiente'),
            'creditos' => $creditos,
        ]);
    }

    /**
     * RESUMEN DE CARTERA
     * GET /api/credits/summary
     */
    public function resumen(): JsonResponse
    {
        return response()->json(
            $this->creditoService->resumenCartera()
        );
    }
}

// ══════════════════════════════════════════════════════════════

/**
 * CONTROLADOR: VENTAS
 *
 * Endpoints:
 * POST /api/sales        → Crear venta (POS)
 * GET  /api/sales        → Historial de ventas
 * GET  /api/sales/{id}   → Ver venta
 * POST /api/sales/{id}/cancel → Anular venta
 */
class VentaController extends Controller
{
    public function __construct(
        private readonly VentaService $ventaService
    ) {}

    /**
     * CREAR VENTA (POS)
     * POST /api/sales
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'cliente_id'              => ['nullable', 'exists:clientes,id'],
            'metodo_pago'             => ['required', 'in:efectivo,nequi,daviplata,transferencia,tarjeta,credito,fiado,mixto'],
            'monto_pagado'            => ['nullable', 'numeric', 'min:0'],
            'descuento'               => ['nullable', 'numeric', 'min:0'],
            'notas'                   => ['nullable', 'string', 'max:500'],
            'items'                   => ['required', 'array', 'min:1'],
            'items.*.producto_id'     => ['required', 'exists:productos,id'],
            'items.*.cantidad'        => ['required', 'integer', 'min:1'],
            'items.*.precio_unitario' => ['required', 'numeric', 'min:0'],
            'items.*.descuento'       => ['nullable', 'numeric', 'min:0'],
            // Para créditos fiados
            'fecha_vencimiento'       => ['nullable', 'date'],
            'numero_cuotas'           => ['nullable', 'integer', 'min:1'],
        ]);

        // Si es fiado, debe tener cliente
        if (in_array($validated['metodo_pago'], ['fiado', 'credito']) && empty($validated['cliente_id'])) {
            return response()->json([
                'message' => 'Para ventas fiadas o a crédito debe seleccionar un cliente.',
            ], 422);
        }

        try {
            $venta = $this->ventaService->crearVenta($validated);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => 'Venta registrada correctamente.',
            'venta'   => $venta,
        ], 201);
    }

    /**
     * HISTORIAL DE VENTAS
     * GET /api/sales?fecha=2024-01-15&estado=completada
     */
    public function index(Request $request): JsonResponse
    {
        $query = Venta::with(['user:id,name', 'cliente:id,nombre'])
            ->latest();

        if ($request->filled('fecha')) {
            $query->whereDate('created_at', $request->fecha);
        }

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }

        if ($request->filled('metodo_pago')) {
            $query->where('metodo_pago', $request->metodo_pago);
        }

        // Resumen del período consultado
        $resumen = [
            'total_ventas'    => (clone $query)->sum('total'),
            'numero_ventas'   => (clone $query)->count(),
            'total_efectivo'  => (clone $query)->where('metodo_pago', 'efectivo')->sum('total'),
            'total_nequi'     => (clone $query)->where('metodo_pago', 'nequi')->sum('total'),
        ];

        $ventas = $query->paginate($request->get('por_pagina', 20));

        return response()->json([
            'resumen' => $resumen,
            'ventas'  => $ventas,
        ]);
    }

    /**
     * VER VENTA DETALLADA
     * GET /api/sales/{id}
     */
    public function show(Venta $venta): JsonResponse
    {
        $venta->load(['detalles.producto', 'cliente', 'user', 'credito']);

        return response()->json([
            'venta'          => $venta,
            'ganancia_bruta' => $venta->gananciaBruta(),
        ]);
    }

    /**
     * ANULAR VENTA
     * POST /api/sales/{id}/cancel
     */
    public function anular(Request $request, Venta $venta): JsonResponse
    {
        $request->validate([
            'motivo' => ['required', 'string', 'min:10', 'max:500'],
        ]);

        // Solo admin puede anular ventas
        if (!Auth::user()->esAdmin() && $venta->user_id !== Auth::id()) {
            return response()->json(['message' => 'Sin permisos para anular esta venta.'], 403);
        }

        try {
            $venta = $this->ventaService->anularVenta($venta, $request->motivo);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => 'Venta anulada correctamente.',
            'venta'   => $venta,
        ]);
    }
}
