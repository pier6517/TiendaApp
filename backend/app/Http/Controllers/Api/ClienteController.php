<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cliente;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

/**
 * ClienteController
 * Gestión completa de clientes de la tienda.
 * Los clientes pueden tener créditos/fiados asociados.
 */
class ClienteController extends Controller
{
    /**
     * Listar clientes con filtros y paginación.
     * GET /api/customers
     */
    public function index(Request $request): JsonResponse
    {
        $query = Cliente::query();

        // Filtro búsqueda general (nombre, cédula, teléfono)
        if ($buscar = $request->get('buscar')) {
            $query->buscar($buscar);
        }

        // Filtro por estado de crédito
        if ($estado = $request->get('estado_credito')) {
            $query->where('estado_credito', $estado);
        }

        // Solo clientes morosos
        if ($request->boolean('morosos')) {
            $query->morosos();
        }

        // Solo con deuda activa
        if ($request->boolean('con_deuda')) {
            $query->conDeuda();
        }

        // Ordenar
        $orden = $request->get('ordenar', 'nombre');
        $direccion = $request->get('direccion', 'asc');
        $columnas = ['nombre', 'saldo_pendiente', 'created_at'];
        if (in_array($orden, $columnas)) {
            $query->orderBy($orden, $direccion === 'desc' ? 'desc' : 'asc');
        }

        $clientes = $query->withCount('creditos')->paginate(20);

        return response()->json($clientes);
    }

    /**
     * Crear nuevo cliente.
     * POST /api/customers
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'nombre'        => 'required|string|max:100',
            'cedula'        => 'nullable|string|max:20|unique:clientes,cedula',
            'telefono'      => 'nullable|string|max:20',
            'direccion'     => 'nullable|string|max:200',
            'barrio'        => 'nullable|string|max:100',
            'cupo_credito'  => 'nullable|numeric|min:0',
            'observaciones' => 'nullable|string|max:500',
        ], [
            'nombre.required'   => 'El nombre del cliente es obligatorio.',
            'cedula.unique'     => 'Ya existe un cliente con esta cédula.',
            'cupo_credito.min'  => 'El cupo de crédito no puede ser negativo.',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $cliente = Cliente::create([
            'nombre'        => $request->nombre,
            'cedula'        => $request->cedula,
            'telefono'      => $request->telefono,
            'direccion'     => $request->direccion,
            'barrio'        => $request->barrio,
            'cupo_credito'  => $request->cupo_credito ?? 0,
            'saldo_pendiente' => 0,
            'estado_credito'=> 'bueno',
            'observaciones' => $request->observaciones,
        ]);

        return response()->json([
            'message' => 'Cliente creado exitosamente.',
            'cliente' => $cliente,
        ], 201);
    }

    /**
     * Detalle de un cliente con su historial.
     * GET /api/customers/{id}
     */
    public function show(int $id): JsonResponse
    {
        $cliente = Cliente::with([
            // Últimas 10 ventas
            'ventas' => function ($q) {
                $q->orderBy('created_at', 'desc')->limit(10);
            },
            // Créditos activos primero
            'creditos' => function ($q) {
                $q->orderBy('created_at', 'desc')->limit(10);
            },
        ])->findOrFail($id);

        // Estadísticas del cliente
        $stats = [
            'total_compras'       => $cliente->ventas()->count(),
            'total_comprado'      => $cliente->ventas()->where('estado', 'completada')->sum('total'),
            'creditos_activos'    => $cliente->creditos()->whereIn('estado', ['pendiente', 'parcial'])->count(),
            'creditos_pagados'    => $cliente->creditos()->where('estado', 'pagado')->count(),
            'mayor_compra'        => $cliente->ventas()->where('estado', 'completada')->max('total'),
            'ultima_compra'       => $cliente->ventas()->latest()->value('created_at'),
        ];

        return response()->json([
            'cliente' => $cliente,
            'stats'   => $stats,
        ]);
    }

    /**
     * Actualizar cliente.
     * PUT /api/customers/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $cliente = Cliente::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'nombre'        => 'sometimes|string|max:100',
            'cedula'        => 'nullable|string|max:20|unique:clientes,cedula,' . $id,
            'telefono'      => 'nullable|string|max:20',
            'direccion'     => 'nullable|string|max:200',
            'barrio'        => 'nullable|string|max:100',
            'cupo_credito'  => 'nullable|numeric|min:0',
            'observaciones' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $cliente->update($request->only([
            'nombre', 'cedula', 'telefono', 'direccion',
            'barrio', 'cupo_credito', 'observaciones',
        ]));

        return response()->json([
            'message' => 'Cliente actualizado.',
            'cliente' => $cliente->fresh(),
        ]);
    }

    /**
     * Eliminar cliente (solo si no tiene deudas activas).
     * DELETE /api/customers/{id}
     */
    public function destroy(int $id): JsonResponse
    {
        $cliente = Cliente::findOrFail($id);

        // No permitir eliminar si tiene saldo pendiente
        if ($cliente->saldo_pendiente > 0) {
            return response()->json([
                'message' => 'No se puede eliminar un cliente con saldo pendiente de $' . number_format($cliente->saldo_pendiente, 0, ',', '.'),
            ], 422);
        }

        $cliente->delete();

        return response()->json(['message' => 'Cliente eliminado.']);
    }

    /**
     * Lista de clientes morosos para cobro.
     * GET /api/customers/morosos
     */
    public function morosos(): JsonResponse
    {
        $morosos = Cliente::morosos()
            ->with(['creditos' => function ($q) {
                $q->whereIn('estado', ['pendiente', 'parcial', 'vencido']);
            }])
            ->orderBy('saldo_pendiente', 'desc')
            ->get()
            ->map(function ($cliente) {
                return [
                    'id'              => $cliente->id,
                    'nombre'          => $cliente->nombre,
                    'telefono'        => $cliente->telefono,
                    'barrio'          => $cliente->barrio,
                    'saldo_pendiente' => $cliente->saldo_pendiente,
                    'estado_credito'  => $cliente->estado_credito,
                    'creditos_activos'=> $cliente->creditos->count(),
                    'credito_mas_antiguo' => $cliente->creditos->min('created_at'),
                ];
            });

        return response()->json([
            'morosos' => $morosos,
            'total_cartera' => $morosos->sum('saldo_pendiente'),
            'cantidad' => $morosos->count(),
        ]);
    }

    /**
     * Historial completo de pagos de un cliente.
     * GET /api/customers/{id}/payments
     */
    public function historialPagos(int $id): JsonResponse
    {
        $cliente = Cliente::findOrFail($id);

        $pagos = $cliente->creditos()
            ->with('pagos')
            ->get()
            ->flatMap(fn($credito) => $credito->pagos)
            ->sortByDesc('created_at')
            ->values();

        return response()->json([
            'cliente' => $cliente->only(['id', 'nombre', 'saldo_pendiente']),
            'pagos'   => $pagos,
            'total_pagado' => $pagos->sum('monto'),
        ]);
    }
}
