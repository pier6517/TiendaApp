<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware para verificar roles de usuario.
 * Uso en rutas: middleware('role:admin,supervisor')
 */
class CheckRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        // Sin usuario autenticado
        if (!$user) {
            return response()->json(['message' => 'No autenticado.'], 401);
        }

        // Usuario inactivo
        if (!$user->activo) {
            return response()->json(['message' => 'Usuario inactivo. Contacte al administrador.'], 403);
        }

        // Verificar si el rol del usuario está en los roles permitidos
        if (!in_array($user->role, $roles)) {
            return response()->json([
                'message' => 'No tiene permisos para realizar esta acción.',
                'required_roles' => $roles,
                'your_role' => $user->role,
            ], 403);
        }

        return $next($request);
    }
}
