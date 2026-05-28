<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Categoria;
use App\Models\Marca;
use App\Models\Proveedor;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

// ═══════════════════════════════════════════════════════════════════
// CATEGORÍAS
// ═══════════════════════════════════════════════════════════════════

class CategoriaController extends Controller
{
    public function index(): JsonResponse
    {
        $categorias = Categoria::withCount('productos')->orderBy('nombre')->get();
        return response()->json($categorias);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'nombre'      => 'required|string|max:100|unique:categorias,nombre',
            'descripcion' => 'nullable|string|max:300',
            'color'       => 'nullable|string|max:20',
        ]);
        if ($validator->fails()) return response()->json(['errors' => $validator->errors()], 422);

        $categoria = Categoria::create($request->only(['nombre', 'descripcion', 'color']));
        return response()->json(['message' => 'Categoría creada.', 'categoria' => $categoria], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $categoria = Categoria::findOrFail($id);
        $validator = Validator::make($request->all(), [
            'nombre' => 'sometimes|string|max:100|unique:categorias,nombre,' . $id,
        ]);
        if ($validator->fails()) return response()->json(['errors' => $validator->errors()], 422);
        $categoria->update($request->only(['nombre', 'descripcion', 'color']));
        return response()->json(['message' => 'Categoría actualizada.', 'categoria' => $categoria]);
    }

    public function destroy(int $id): JsonResponse
    {
        $categoria = Categoria::findOrFail($id);
        if ($categoria->productos()->exists()) {
            return response()->json(['message' => 'No se puede eliminar: tiene productos asociados.'], 422);
        }
        $categoria->delete();
        return response()->json(['message' => 'Categoría eliminada.']);
    }
}

// ═══════════════════════════════════════════════════════════════════
// MARCAS
// ═══════════════════════════════════════════════════════════════════

class MarcaController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Marca::withCount('productos')->orderBy('nombre')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'nombre' => 'required|string|max:100|unique:marcas,nombre',
        ]);
        if ($validator->fails()) return response()->json(['errors' => $validator->errors()], 422);

        $marca = Marca::create($request->only(['nombre', 'descripcion']));
        return response()->json(['message' => 'Marca creada.', 'marca' => $marca], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $marca = Marca::findOrFail($id);
        $marca->update($request->only(['nombre', 'descripcion']));
        return response()->json(['message' => 'Marca actualizada.', 'marca' => $marca]);
    }

    public function destroy(int $id): JsonResponse
    {
        $marca = Marca::findOrFail($id);
        if ($marca->productos()->exists()) {
            return response()->json(['message' => 'No se puede eliminar: tiene productos asociados.'], 422);
        }
        $marca->delete();
        return response()->json(['message' => 'Marca eliminada.']);
    }
}

// ═══════════════════════════════════════════════════════════════════
// PROVEEDORES
// ═══════════════════════════════════════════════════════════════════

class ProveedorController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Proveedor::query();
        if ($buscar = $request->get('buscar')) {
            $query->where('nombre', 'like', "%{$buscar}%")
                  ->orWhere('nit', 'like', "%{$buscar}%");
        }
        return response()->json($query->withCount('productos')->orderBy('nombre')->paginate(20));
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'nombre'   => 'required|string|max:150',
            'nit'      => 'nullable|string|max:30|unique:proveedores,nit',
            'telefono' => 'nullable|string|max:20',
            'email'    => 'nullable|email|max:100',
            'contacto' => 'nullable|string|max:100',
            'ciudad'   => 'nullable|string|max:80',
        ]);
        if ($validator->fails()) return response()->json(['errors' => $validator->errors()], 422);

        $proveedor = Proveedor::create($request->only([
            'nombre', 'nit', 'telefono', 'email', 'contacto', 'ciudad', 'direccion',
        ]));
        return response()->json(['message' => 'Proveedor creado.', 'proveedor' => $proveedor], 201);
    }

    public function show(int $id): JsonResponse
    {
        $proveedor = Proveedor::with(['productos' => fn($q) => $q->limit(20)])->findOrFail($id);
        return response()->json($proveedor);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $proveedor = Proveedor::findOrFail($id);
        $validator = Validator::make($request->all(), [
            'nit' => 'nullable|string|max:30|unique:proveedores,nit,' . $id,
        ]);
        if ($validator->fails()) return response()->json(['errors' => $validator->errors()], 422);
        $proveedor->update($request->only(['nombre', 'nit', 'telefono', 'email', 'contacto', 'ciudad', 'direccion']));
        return response()->json(['message' => 'Proveedor actualizado.', 'proveedor' => $proveedor]);
    }

    public function destroy(int $id): JsonResponse
    {
        $proveedor = Proveedor::findOrFail($id);
        if ($proveedor->productos()->exists()) {
            return response()->json(['message' => 'No se puede eliminar: tiene productos asociados.'], 422);
        }
        $proveedor->delete();
        return response()->json(['message' => 'Proveedor eliminado.']);
    }
}
