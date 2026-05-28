<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Gasto;
use App\Models\Caja;
use App\Models\MovimientoCaja;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

/**
 * GastoController
 * Control de gastos operativos de la tienda.
 * Cada gasto se registra también como movimiento en caja.
 */
class GastoController extends Controller
{
    // Categorías de gastos típicos de tiendas colombianas
    const CATEGORIAS = [
        'servicios'      => 'Servicios (luz, agua, internet)',
        'arriendo'       => 'Arriendo',
        'nomina'         => 'Nómina y pagos empleados',
        'mantenimiento'  => 'Mantenimiento y reparaciones',
        'transporte'     => 'Transporte y fletes',
        'empaques'       => 'Empaques y materiales',
        'publicidad'     => 'Publicidad',
        'otros'          => 'Otros gastos',
    ];

    public function index(Request $request): JsonResponse
    {
        $query = Gasto::with('usuario:id,name');

        // Filtro por fecha
        if ($desde = $request->get('desde')) {
            $query->whereDate('created_at', '>=', $desde);
        }
        if ($hasta = $request->get('hasta')) {
            $query->whereDate('created_at', '<=', $hasta);
        }

        // Filtro por categoría
        if ($categoria = $request->get('categoria')) {
            $query->where('categoria', $categoria);
        }

        // Por defecto: gastos del mes actual
        if (!$request->get('desde') && !$request->get('hasta')) {
            $query->whereMonth('created_at', now()->month)
                  ->whereYear('created_at', now()->year);
        }

        $gastos = $query->orderBy('created_at', 'desc')->paginate(25);

        // Totales del período
        $totalPeriodo = $query->sum('monto');

        return response()->json([
            'gastos'        => $gastos,
            'total_periodo' => $totalPeriodo,
            'categorias'    => self::CATEGORIAS,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'descripcion' => 'required|string|max:200',
            'monto'       => 'required|numeric|min:1',
            'categoria'   => 'required|in:' . implode(',', array_keys(self::CATEGORIAS)),
            'referencia'  => 'nullable|string|max:100',
        ], [
            'descripcion.required' => 'La descripción es obligatoria.',
            'monto.min'            => 'El monto debe ser mayor a $0.',
            'categoria.in'         => 'Categoría inválida.',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        return DB::transaction(function () use ($request) {
            $gasto = Gasto::create([
                'usuario_id'  => Auth::id(),
                'descripcion' => $request->descripcion,
                'monto'       => $request->monto,
                'categoria'   => $request->categoria,
                'referencia'  => $request->referencia,
            ]);

            // Registrar en caja si hay una abierta
            $caja = Caja::where('estado', 'abierta')->latest()->first();
            if ($caja) {
                MovimientoCaja::create([
                    'caja_id'    => $caja->id,
                    'usuario_id' => Auth::id(),
                    'tipo'       => 'gasto',
                    'monto'      => -$request->monto, // negativo = egreso
                    'concepto'   => 'Gasto: ' . $request->descripcion,
                    'referencia' => 'GASTO-' . $gasto->id,
                ]);
            }

            return response()->json([
                'message' => 'Gasto registrado exitosamente.',
                'gasto'   => $gasto->load('usuario:id,name'),
            ], 201);
        });
    }

    public function show(int $id): JsonResponse
    {
        return response()->json(Gasto::with('usuario:id,name')->findOrFail($id));
    }

    public function destroy(int $id): JsonResponse
    {
        // Solo admin puede eliminar gastos
        if (!Auth::user()->esAdmin()) {
            return response()->json(['message' => 'Sin permisos para eliminar gastos.'], 403);
        }

        $gasto = Gasto::findOrFail($id);
        $gasto->delete();

        return response()->json(['message' => 'Gasto eliminado.']);
    }

    /**
     * Resumen de gastos por categoría.
     * GET /api/expenses/summary
     */
    public function resumen(Request $request): JsonResponse
    {
        $mes  = $request->get('mes', now()->month);
        $anio = $request->get('anio', now()->year);

        $resumen = Gasto::whereMonth('created_at', $mes)
            ->whereYear('created_at', $anio)
            ->selectRaw('categoria, SUM(monto) as total, COUNT(*) as cantidad')
            ->groupBy('categoria')
            ->orderBy('total', 'desc')
            ->get()
            ->map(fn($g) => [
                'categoria'       => $g->categoria,
                'categoria_label' => self::CATEGORIAS[$g->categoria] ?? $g->categoria,
                'total'           => $g->total,
                'cantidad'        => $g->cantidad,
            ]);

        return response()->json([
            'mes'    => $mes,
            'anio'   => $anio,
            'resumen'=> $resumen,
            'total'  => $resumen->sum('total'),
        ]);
    }
}
