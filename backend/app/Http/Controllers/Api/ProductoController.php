<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Producto;
use App\Models\Categoria;
use App\Models\MovimientoInventario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * CONTROLADOR: PRODUCTOS
 * CRUD completo + búsqueda + kardex
 *
 * Endpoints:
 * GET    /api/products           → Listar con filtros
 * POST   /api/products           → Crear producto
 * GET    /api/products/{id}      → Ver producto
 * PUT    /api/products/{id}      → Actualizar
 * DELETE /api/products/{id}      → Eliminar (soft delete)
 * GET    /api/products/search    → Búsqueda POS (por nombre/barras)
 * GET    /api/products/low-stock → Stock bajo
 * POST   /api/products/{id}/adjust → Ajuste de inventario
 */
class ProductoController extends Controller
{
    /**
     * LISTAR PRODUCTOS
     * Soporta filtros: categoría, marca, estado, búsqueda, paginación
     */
    public function index(Request $request): JsonResponse
    {
        $query = Producto::with(['categoria', 'marca', 'proveedor'])
            ->activos();

        // Filtros opcionales
        if ($request->filled('buscar')) {
            $query->buscar($request->buscar);
        }

        if ($request->filled('categoria_id')) {
            $query->where('categoria_id', $request->categoria_id);
        }

        if ($request->filled('marca_id')) {
            $query->where('marca_id', $request->marca_id);
        }

        if ($request->boolean('stock_bajo')) {
            $query->stockBajo();
        }

        // Ordenamiento
        $ordenar = $request->get('ordenar', 'nombre');
        $direccion = $request->get('direccion', 'asc');
        $query->orderBy($ordenar, $direccion);

        // Paginación (20 por página por defecto)
        $productos = $query->paginate($request->get('por_pagina', 20));

        return response()->json($productos);
    }

    /**
     * BÚSQUEDA RÁPIDA PARA EL POS
     * GET /api/products/search?q=coca
     * Devuelve máximo 10 resultados sin paginar para velocidad
     */
    public function buscarPos(Request $request): JsonResponse
    {
        $termino = $request->get('q', '');

        if (strlen($termino) < 2) {
            return response()->json([]);
        }

        $productos = Producto::activos()
            ->buscar($termino)
            ->select('id', 'codigo', 'codigo_barras', 'nombre', 'precio_venta', 'stock', 'impuesto')
            ->limit(10)
            ->get();

        return response()->json($productos);
    }

    /**
     * CREAR PRODUCTO
     * POST /api/products
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'codigo'          => ['required', 'string', 'unique:productos', 'max:50'],
            'codigo_barras'   => ['nullable', 'string', 'unique:productos', 'max:50'],
            'nombre'          => ['required', 'string', 'max:200'],
            'descripcion'     => ['nullable', 'string'],
            'categoria_id'    => ['required', 'exists:categorias,id'],
            'marca_id'        => ['nullable', 'exists:marcas,id'],
            'proveedor_id'    => ['nullable', 'exists:proveedores,id'],
            'costo'           => ['required', 'numeric', 'min:0'],
            'precio_venta'    => ['required', 'numeric', 'min:0'],
            'precio_mayorista'=> ['nullable', 'numeric', 'min:0'],
            'stock'           => ['required', 'integer', 'min:0'],
            'stock_minimo'    => ['required', 'integer', 'min:0'],
            'unidad_medida'   => ['required', 'string'],
            'impuesto'        => ['nullable', 'numeric', 'min:0', 'max:100'],
        ]);

        $producto = DB::transaction(function () use ($validated) {
            $producto = Producto::create($validated);

            // Registrar inventario inicial en el kardex
            if ($validated['stock'] > 0) {
                MovimientoInventario::create([
                    'producto_id'    => $producto->id,
                    'user_id'        => Auth::id(),
                    'tipo'           => 'inventario_inicial',
                    'cantidad'       => $validated['stock'],
                    'stock_anterior' => 0,
                    'stock_nuevo'    => $validated['stock'],
                    'observacion'    => 'Stock inicial al crear el producto',
                ]);
            }

            return $producto->load(['categoria', 'marca']);
        });

        return response()->json([
            'message'  => 'Producto creado correctamente.',
            'producto' => $producto,
        ], 201);
    }

    /**
     * VER PRODUCTO INDIVIDUAL
     * GET /api/products/{id}
     */
    public function show(Producto $producto): JsonResponse
    {
        $producto->load(['categoria', 'marca', 'proveedor']);

        // Últimos 20 movimientos del kardex
        $kardex = MovimientoInventario::where('producto_id', $producto->id)
            ->with('user:id,name')
            ->latest()
            ->limit(20)
            ->get();

        return response()->json([
            'producto' => $producto,
            'kardex'   => $kardex,
            'margen'   => $producto->margenGanancia(),
        ]);
    }

    /**
     * ACTUALIZAR PRODUCTO
     * PUT /api/products/{id}
     */
    public function update(Request $request, Producto $producto): JsonResponse
    {
        $validated = $request->validate([
            'nombre'          => ['sometimes', 'string', 'max:200'],
            'descripcion'     => ['nullable', 'string'],
            'categoria_id'    => ['sometimes', 'exists:categorias,id'],
            'costo'           => ['sometimes', 'numeric', 'min:0'],
            'precio_venta'    => ['sometimes', 'numeric', 'min:0'],
            'precio_mayorista'=> ['nullable', 'numeric', 'min:0'],
            'stock_minimo'    => ['sometimes', 'integer', 'min:0'],
            'impuesto'        => ['nullable', 'numeric', 'min:0', 'max:100'],
            'activo'          => ['sometimes', 'boolean'],
        ]);

        $producto->update($validated);

        return response()->json([
            'message'  => 'Producto actualizado.',
            'producto' => $producto->load(['categoria', 'marca']),
        ]);
    }

    /**
     * AJUSTE DE INVENTARIO
     * POST /api/products/{id}/adjust
     *
     * Body: { tipo: 'ajuste_positivo'|'ajuste_negativo', cantidad, observacion }
     */
    public function ajustarInventario(Request $request, Producto $producto): JsonResponse
    {
        $validated = $request->validate([
            'tipo'       => ['required', 'in:ajuste_positivo,ajuste_negativo'],
            'cantidad'   => ['required', 'integer', 'min:1'],
            'observacion'=> ['required', 'string', 'max:500'],
        ]);

        $stockAnterior = $producto->stock;

        if ($validated['tipo'] === 'ajuste_positivo') {
            $producto->increment('stock', $validated['cantidad']);
        } else {
            if ($producto->stock < $validated['cantidad']) {
                return response()->json([
                    'message' => 'No hay suficiente stock para este ajuste.',
                ], 422);
            }
            $producto->decrement('stock', $validated['cantidad']);
        }

        MovimientoInventario::create([
            'producto_id'    => $producto->id,
            'user_id'        => Auth::id(),
            'tipo'           => $validated['tipo'],
            'cantidad'       => $validated['cantidad'],
            'stock_anterior' => $stockAnterior,
            'stock_nuevo'    => $producto->stock,
            'observacion'    => $validated['observacion'],
        ]);

        return response()->json([
            'message'       => 'Inventario ajustado correctamente.',
            'stock_anterior'=> $stockAnterior,
            'stock_nuevo'   => $producto->stock,
        ]);
    }

    /**
     * PRODUCTOS CON STOCK BAJO
     * GET /api/products/low-stock
     */
    public function stockBajo(): JsonResponse
    {
        $productos = Producto::activos()
            ->stockBajo()
            ->with('categoria')
            ->get(['id', 'codigo', 'nombre', 'stock', 'stock_minimo', 'categoria_id']);

        return response()->json([
            'total'     => $productos->count(),
            'productos' => $productos,
        ]);
    }

    /**
     * ELIMINAR PRODUCTO (soft delete)
     * DELETE /api/products/{id}
     */
    public function destroy(Producto $producto): JsonResponse
    {
        // No eliminar si tiene ventas registradas
        if ($producto->ventaDetalles()->exists()) {
            return response()->json([
                'message' => 'No se puede eliminar un producto con ventas registradas. Desactívalo en su lugar.',
            ], 422);
        }

        $producto->delete();

        return response()->json(['message' => 'Producto eliminado.']);
    }
}
