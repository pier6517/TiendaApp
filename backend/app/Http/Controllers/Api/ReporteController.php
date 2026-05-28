<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Venta;
use App\Models\VentaDetalle;
use App\Models\Gasto;
use App\Models\Credito;
use App\Models\Cliente;
use App\Models\Producto;
use App\Models\CreditoPago;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * ReporteController
 * Genera reportes financieros y operacionales.
 * Solo accesible por admin y supervisor.
 */
class ReporteController extends Controller
{
    /**
     * Reporte de ventas por período.
     * GET /api/reports/sales?desde=2024-01-01&hasta=2024-01-31
     */
    public function ventas(Request $request): JsonResponse
    {
        [$desde, $hasta] = $this->obtenerRango($request);

        // Ventas completadas del período
        $ventas = Venta::whereBetween('created_at', [$desde, $hasta])
            ->where('estado', 'completada')
            ->selectRaw('
                COUNT(*) as total_ventas,
                SUM(total) as total_ingresos,
                SUM(descuento) as total_descuentos,
                AVG(total) as ticket_promedio,
                MAX(total) as venta_mayor,
                MIN(total) as venta_menor
            ')
            ->first();

        // Ventas por método de pago
        $porMetodo = Venta::whereBetween('created_at', [$desde, $hasta])
            ->where('estado', 'completada')
            ->selectRaw('metodo_pago, SUM(total) as total, COUNT(*) as cantidad')
            ->groupBy('metodo_pago')
            ->get();

        // Ventas por día del período
        $porDia = Venta::whereBetween('created_at', [$desde, $hasta])
            ->where('estado', 'completada')
            ->selectRaw('DATE(created_at) as fecha, SUM(total) as total, COUNT(*) as cantidad')
            ->groupBy('fecha')
            ->orderBy('fecha')
            ->get();

        // Ganancia bruta (precio_venta - costo)
        $gananciaBruta = VentaDetalle::whereHas('venta', function ($q) use ($desde, $hasta) {
            $q->whereBetween('created_at', [$desde, $hasta])->where('estado', 'completada');
        })->selectRaw('SUM((precio_unitario - costo_unitario) * cantidad) as ganancia')->value('ganancia') ?? 0;

        // Gastos del período
        $gastosPeriodo = Gasto::whereBetween('created_at', [$desde, $hasta])->sum('monto');

        return response()->json([
            'periodo'       => ['desde' => $desde, 'hasta' => $hasta],
            'resumen'       => $ventas,
            'ganancia_bruta'=> $gananciaBruta,
            'gastos'        => $gastosPeriodo,
            'ganancia_neta' => $gananciaBruta - $gastosPeriodo,
            'por_metodo'    => $porMetodo,
            'por_dia'       => $porDia,
        ]);
    }

    /**
     * Reporte de inventario con valorización.
     * GET /api/reports/inventory
     */
    public function inventario(): JsonResponse
    {
        // Productos con stock bajo
        $stockBajo = Producto::where('activo', true)
            ->whereRaw('stock <= stock_minimo')
            ->count();

        // Valorización total del inventario
        $valorizacion = Producto::where('activo', true)
            ->selectRaw('
                SUM(stock * costo) as valor_costo,
                SUM(stock * precio_venta) as valor_venta,
                COUNT(*) as total_productos,
                SUM(stock) as total_unidades
            ')
            ->first();

        // Por categoría
        $porCategoria = Producto::where('activo', true)
            ->join('categorias', 'productos.categoria_id', '=', 'categorias.id')
            ->selectRaw('categorias.nombre as categoria, COUNT(*) as productos, SUM(stock * costo) as valor_inventario')
            ->groupBy('categorias.id', 'categorias.nombre')
            ->orderBy('valor_inventario', 'desc')
            ->get();

        // Productos sin movimiento (posible inventario obsoleto)
        $sinMovimiento = Producto::where('activo', true)
            ->whereDoesntHave('movimientos', function ($q) {
                $q->where('created_at', '>=', now()->subDays(30));
            })
            ->count();

        return response()->json([
            'resumen'        => $valorizacion,
            'stock_bajo'     => $stockBajo,
            'sin_movimiento' => $sinMovimiento,
            'por_categoria'  => $porCategoria,
            'margen_promedio'=> $valorizacion->valor_costo > 0
                ? round((($valorizacion->valor_venta - $valorizacion->valor_costo) / $valorizacion->valor_costo) * 100, 1)
                : 0,
        ]);
    }

    /**
     * Reporte de cartera (créditos).
     * GET /api/reports/credits
     */
    public function cartera(): JsonResponse
    {
        // Totales por estado
        $porEstado = Credito::selectRaw('estado, SUM(saldo_pendiente) as saldo, COUNT(*) as cantidad')
            ->groupBy('estado')
            ->get()
            ->keyBy('estado');

        // Top 10 deudores
        $topDeudores = Cliente::conDeuda()
            ->orderBy('saldo_pendiente', 'desc')
            ->limit(10)
            ->get(['id', 'nombre', 'telefono', 'barrio', 'saldo_pendiente', 'estado_credito']);

        // Abonos del mes
        $abonosMes = CreditoPago::whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->selectRaw('SUM(monto) as total, COUNT(*) as cantidad')
            ->first();

        // Créditos vencidos hace más de 30 días
        $vencidosGraves = Credito::where('estado', 'vencido')
            ->where('fecha_vencimiento', '<', now()->subDays(30))
            ->sum('saldo_pendiente');

        return response()->json([
            'total_cartera'      => Credito::whereIn('estado', ['pendiente', 'parcial', 'vencido'])->sum('saldo_pendiente'),
            'por_estado'         => $porEstado,
            'top_deudores'       => $topDeudores,
            'abonos_mes'         => $abonosMes,
            'vencidos_graves'    => $vencidosGraves,
            'clientes_morosos'   => Cliente::morosos()->count(),
        ]);
    }

    /**
     * Reporte de productos más vendidos.
     * GET /api/reports/top-products?dias=30
     */
    public function topProductos(Request $request): JsonResponse
    {
        $dias = min($request->get('dias', 30), 365);
        $desde = now()->subDays($dias);

        $top = VentaDetalle::whereHas('venta', fn($q) =>
            $q->where('created_at', '>=', $desde)->where('estado', 'completada')
        )
        ->join('productos', 'venta_detalles.producto_id', '=', 'productos.id')
        ->selectRaw('
            productos.id,
            productos.nombre,
            productos.codigo,
            SUM(venta_detalles.cantidad) as unidades_vendidas,
            SUM(venta_detalles.subtotal) as ingresos,
            SUM((venta_detalles.precio_unitario - venta_detalles.costo_unitario) * venta_detalles.cantidad) as ganancia
        ')
        ->groupBy('productos.id', 'productos.nombre', 'productos.codigo')
        ->orderBy('unidades_vendidas', 'desc')
        ->limit(20)
        ->get();

        return response()->json([
            'periodo_dias' => $dias,
            'desde'        => $desde->toDateString(),
            'productos'    => $top,
        ]);
    }

    /**
     * Balance general del período.
     * GET /api/reports/balance
     */
    public function balance(Request $request): JsonResponse
    {
        [$desde, $hasta] = $this->obtenerRango($request);

        $ingresos = Venta::whereBetween('created_at', [$desde, $hasta])
            ->where('estado', 'completada')
            ->sum('total');

        $abonosRecibidos = CreditoPago::whereBetween('created_at', [$desde, $hasta])->sum('monto');

        $gastosTotales = Gasto::whereBetween('created_at', [$desde, $hasta])->sum('monto');

        $gananciaBruta = VentaDetalle::whereHas('venta', fn($q) =>
            $q->whereBetween('created_at', [$desde, $hasta])->where('estado', 'completada')
        )->selectRaw('SUM((precio_unitario - costo_unitario) * cantidad) as g')->value('g') ?? 0;

        return response()->json([
            'periodo'           => ['desde' => $desde, 'hasta' => $hasta],
            'ingresos_ventas'   => $ingresos,
            'abonos_recibidos'  => $abonosRecibidos,
            'total_ingresos'    => $ingresos + $abonosRecibidos,
            'gastos'            => $gastosTotales,
            'ganancia_bruta'    => $gananciaBruta,
            'ganancia_neta'     => $gananciaBruta - $gastosTotales,
            'margen'            => $ingresos > 0 ? round(($gananciaBruta / $ingresos) * 100, 1) : 0,
        ]);
    }

    // ── Helpers ──────────────────────────────────────────────────────

    private function obtenerRango(Request $request): array
    {
        $desde = $request->get('desde', now()->startOfMonth()->toDateTimeString());
        $hasta = $request->get('hasta', now()->endOfDay()->toDateTimeString());
        return [$desde, $hasta];
    }
}
