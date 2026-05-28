<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Api\ProductoController;
use App\Http\Controllers\Api\CreditoController;
use App\Http\Controllers\Api\VentaController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ClienteController;
use App\Http\Controllers\Api\CajaController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API ROUTES — TIENDA APP
|--------------------------------------------------------------------------
|
| Estructura:
| - Rutas públicas: login
| - Rutas protegidas: todo lo demás (requiere token Sanctum)
|
| Responde siempre JSON.
| URL base: http://localhost:8000/api/
|
*/

// ──────────────────────────────────────────────────────────────────────────
// RUTAS PÚBLICAS (sin autenticación)
// ──────────────────────────────────────────────────────────────────────────
Route::post('/login', [AuthController::class, 'login']);

// ──────────────────────────────────────────────────────────────────────────
// RUTAS PROTEGIDAS (requieren token Sanctum)
// ──────────────────────────────────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // ── AUTENTICACIÓN ─────────────────────────────────────────────────────
    Route::post('/logout',           [AuthController::class, 'logout']);
    Route::get('/me',                [AuthController::class, 'me']);
    Route::put('/me/password',       [AuthController::class, 'cambiarPassword']);

    // ── USUARIOS (solo admin) ─────────────────────────────────────────────
    Route::post('/users',            [AuthController::class, 'register']);

    // ── DASHBOARD ─────────────────────────────────────────────────────────
    Route::prefix('dashboard')->group(function () {
        Route::get('/',                [DashboardController::class, 'index']);
        Route::get('/sales-chart',     [DashboardController::class, 'graficaVentas']);
        Route::get('/top-products',    [DashboardController::class, 'topProductos']);
        Route::get('/payment-methods', [DashboardController::class, 'metodosPago']);
    });

    // ── INVENTARIO ────────────────────────────────────────────────────────
    Route::prefix('products')->group(function () {
        Route::get('/',              [ProductoController::class, 'index']);
        Route::post('/',             [ProductoController::class, 'store']);
        Route::get('/search',        [ProductoController::class, 'buscarPos']);     // POS búsqueda rápida
        Route::get('/low-stock',     [ProductoController::class, 'stockBajo']);
        Route::get('/{product}',     [ProductoController::class, 'show']);
        Route::put('/{product}',     [ProductoController::class, 'update']);
        Route::delete('/{product}',  [ProductoController::class, 'destroy']);
        Route::post('/{product}/adjust', [ProductoController::class, 'ajustarInventario']);
    });

    // Categorías y marcas (CRUD simple)
    Route::apiResource('categories', \App\Http\Controllers\Api\CategoriaController::class);
    Route::apiResource('brands',     \App\Http\Controllers\Api\MarcaController::class);
    Route::apiResource('suppliers',  \App\Http\Controllers\Api\ProveedorController::class);

    // ── VENTAS (POS) ──────────────────────────────────────────────────────
    Route::prefix('sales')->group(function () {
        Route::get('/',              [VentaController::class, 'index']);
        Route::post('/',             [VentaController::class, 'store']);        // Crear venta
        Route::get('/{sale}',        [VentaController::class, 'show']);
        Route::post('/{sale}/cancel',[VentaController::class, 'anular']);      // Anular venta
    });

    // ── CLIENTES ──────────────────────────────────────────────────────────
    Route::prefix('customers')->group(function () {
        Route::get('/',              [ClienteController::class, 'index']);
        Route::post('/',             [ClienteController::class, 'store']);
        Route::get('/morosos',       [ClienteController::class, 'morosos']);   // Lista de morosos
        Route::get('/{customer}',    [ClienteController::class, 'show']);
        Route::put('/{customer}',    [ClienteController::class, 'update']);
        Route::delete('/{customer}', [ClienteController::class, 'destroy']);
    });

    // ── CRÉDITOS / FIADOS ─────────────────────────────────────────────────
    Route::prefix('credits')->group(function () {
        Route::get('/',              [CreditoController::class, 'index']);
        Route::post('/',             [CreditoController::class, 'store']);      // Crear crédito manual
        Route::get('/overdue',       [CreditoController::class, 'vencidos']);  // Créditos vencidos
        Route::get('/summary',       [CreditoController::class, 'resumen']);   // KPI cartera
        Route::get('/{credit}',      [CreditoController::class, 'show']);
        Route::post('/{credit}/payment', [CreditoController::class, 'registrarAbono']); // ABONO
    });

    // ── CAJA ──────────────────────────────────────────────────────────────
    Route::prefix('cash')->group(function () {
        Route::get('/',              [CajaController::class, 'index']);
        Route::post('/open',         [CajaController::class, 'abrir']);        // Apertura de caja
        Route::post('/close',        [CajaController::class, 'cerrar']);       // Cierre de caja
        Route::get('/current',       [CajaController::class, 'actual']);       // Caja activa
        Route::post('/movement',     [CajaController::class, 'registrarMovimiento']); // Ingreso/Egreso
    });

    // ── GASTOS ────────────────────────────────────────────────────────────
    Route::apiResource('expenses', \App\Http\Controllers\Api\GastoController::class);

    // ── REPORTES (solo admin y supervisor) ───────────────────────────────
    Route::middleware('role:admin,supervisor')->prefix('reports')->group(function () {
        Route::get('/sales',         [\App\Http\Controllers\Api\ReporteController::class, 'ventas']);
        Route::get('/credits',       [\App\Http\Controllers\Api\ReporteController::class, 'creditos']);
        Route::get('/inventory',     [\App\Http\Controllers\Api\ReporteController::class, 'inventario']);
        Route::get('/cash-flow',     [\App\Http\Controllers\Api\ReporteController::class, 'flujoCaja']);
    });

});
