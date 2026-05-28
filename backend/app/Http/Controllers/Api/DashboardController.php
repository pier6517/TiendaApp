<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Venta;
use App\Models\Producto;
use App\Models\Cliente;
use App\Models\Credito;
use App\Models\CreditoPago;
use App\Models\Gasto;
use App\Models\VentaDetalle;
use App\Services\CreditoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * CONTROLADOR: DASHBOARD
 *
 * Provee todos los KPIs y estadísticas para el panel principal.
 * Optimizado para cargar todo en el menor número de queries posible.
 *
 * GET /api/dashboard → KPIs principales
 * GET /api/dashboard/sales-chart → Gráfica de ventas mensual
 * GET /api/dashboard/top-products → Productos más vendidos
 */
class DashboardController extends Controller
{
    public function __construct(
        private readonly CreditoService $creditoService
    ) {}

    /**
     * KPIs PRINCIPALES DEL DASHBOARD
     * GET /api/dashboard
     */
    public function index(): JsonResponse
    {
        $hoy   = today();
        $mes   = now()->month;
        $anio  = now()->year;

        // ─── VENTAS DE HOY ───────────────────────────────
        $ventasHoy = Venta::whereDate('created_at', $hoy)
            ->where('estado', '!=', 'anulada');

        $totalVentasHoy    = (clone $ventasHoy)->sum('total');
        $numeroVentasHoy   = (clone $ventasHoy)->count();
        $ventasEfectivoHoy = (clone $ventasHoy)->where('metodo_pago', 'efectivo')->sum('total');
        $ventasFiadoHoy    = (clone $ventasHoy)->where('metodo_pago', 'fiado')->sum('total');

        // ─── VENTAS DEL MES ──────────────────────────────
        $ventasMes = Venta::whereMonth('created_at', $mes)
            ->whereYear('created_at', $anio)
            ->where('estado', '!=', 'anulada');

        $totalVentasMes = (clone $ventasMes)->sum('total');

        // ─── GANANCIA BRUTA DEL DÍA ──────────────────────
        $gananciaBrutaHoy = VentaDetalle::whereHas('venta', function($q) use ($hoy) {
            $q->whereDate('created_at', $hoy)->where('estado', '!=', 'anulada');
        })->selectRaw('SUM((precio_unitario - costo_unitario) * cantidad) as ganancia')
          ->value('ganancia') ?? 0;

        // ─── GASTOS DE HOY ───────────────────────────────
        $gastosHoy = Gasto::whereDate('fecha', $hoy)->sum('monto');

        // ─── CARTERA ─────────────────────────────────────
        $cartera = $this->creditoService->resumenCartera();

        // ─── INVENTARIO ──────────────────────────────────
        $productosStockBajo = Producto::activos()->stockBajo()->count();
        $totalProductos     = Producto::activos()->count();

        // ─── CLIENTES ────────────────────────────────────
        $clientesMorosos = Cliente::morosos()->count();

        return response()->json([
            // Ventas
            'ventas_hoy'           => round($totalVentasHoy, 2),
            'numero_ventas_hoy'    => $numeroVentasHoy,
            'ventas_efectivo_hoy'  => round($ventasEfectivoHoy, 2),
            'ventas_fiado_hoy'     => round($ventasFiadoHoy, 2),
            'ventas_mes'           => round($totalVentasMes, 2),

            // Finanzas
            'ganancia_bruta_hoy'   => round($gananciaBrutaHoy, 2),
            'gastos_hoy'           => round($gastosHoy, 2),
            'ganancia_neta_hoy'    => round($gananciaBrutaHoy - $gastosHoy, 2),

            // Créditos
            'total_cartera'        => $cartera['total_cartera'],
            'creditos_activos'     => $cartera['creditos_activos'],
            'creditos_vencidos'    => $cartera['creditos_vencidos'],
            'cobrado_hoy'          => $cartera['cobrado_hoy'],

            // Inventario
            'productos_stock_bajo' => $productosStockBajo,
            'total_productos'      => $totalProductos,

            // Clientes
            'clientes_morosos'     => $clientesMorosos,
        ]);
    }

    /**
     * GRÁFICA DE VENTAS — ÚLTIMOS 12 MESES
     * GET /api/dashboard/sales-chart
     */
    public function graficaVentas(): JsonResponse
    {
        $datos = Venta::where('estado', '!=', 'anulada')
            ->where('created_at', '>=', now()->subMonths(12))
            ->selectRaw('
                YEAR(created_at) as anio,
                MONTH(created_at) as mes,
                SUM(total) as total_ventas,
                COUNT(*) as numero_ventas
            ')
            ->groupBy('anio', 'mes')
            ->orderBy('anio')
            ->orderBy('mes')
            ->get()
            ->map(function($row) {
                $fecha = \Carbon\Carbon::create($row->anio, $row->mes, 1);
                return [
                    'mes'           => $fecha->translatedFormat('M Y'),
                    'total_ventas'  => round($row->total_ventas, 2),
                    'numero_ventas' => $row->numero_ventas,
                ];
            });

        return response()->json($datos);
    }

    /**
     * TOP 10 PRODUCTOS MÁS VENDIDOS
     * GET /api/dashboard/top-products
     */
    public function topProductos(Request $request): JsonResponse
    {
        $dias = $request->get('dias', 30);

        $productos = VentaDetalle::whereHas('venta', function($q) use ($dias) {
                $q->where('estado', '!=', 'anulada')
                  ->where('created_at', '>=', now()->subDays($dias));
            })
            ->selectRaw('
                producto_id,
                nombre_producto,
                SUM(cantidad) as unidades_vendidas,
                SUM(subtotal) as total_vendido
            ')
            ->groupBy('producto_id', 'nombre_producto')
            ->orderByDesc('unidades_vendidas')
            ->limit(10)
            ->get();

        return response()->json($productos);
    }

    /**
     * VENTAS POR MÉTODO DE PAGO (DONA)
     * GET /api/dashboard/payment-methods
     */
    public function metodosPago(): JsonResponse
    {
        $datos = Venta::where('estado', '!=', 'anulada')
            ->whereDate('created_at', today())
            ->selectRaw('metodo_pago, SUM(total) as total, COUNT(*) as cantidad')
            ->groupBy('metodo_pago')
            ->get();

        return response()->json($datos);
    }
}
