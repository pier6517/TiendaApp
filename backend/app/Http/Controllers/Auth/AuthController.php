<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * CONTROLADOR: AUTENTICACIÓN
 *
 * Maneja:
 * - Login con Sanctum tokens
 * - Logout
 * - Registro de usuarios
 * - Perfil del usuario autenticado
 *
 * Respuestas siempre en JSON para consumo desde React.
 */
class AuthController extends Controller
{
    /**
     * LOGIN
     * POST /api/login
     *
     * Body: { email, password, remember? }
     * Respuesta: { user, token }
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        // Verificar credenciales
        if (!Auth::attempt($request->only('email', 'password'))) {
            throw ValidationException::withMessages([
                'email' => ['Las credenciales no coinciden con nuestros registros.'],
            ]);
        }

        $user = Auth::user();

        // Verificar que la cuenta esté activa
        if (!$user->activo) {
            Auth::logout();
            return response()->json([
                'message' => 'Tu cuenta está desactivada. Contacta al administrador.',
            ], 403);
        }

        // Actualizar último acceso
        $user->update(['ultimo_acceso' => now()]);

        // Revocar tokens anteriores (solo un dispositivo activo)
        $user->tokens()->delete();

        // Crear nuevo token con nombre del dispositivo
        $token = $user->createToken('tienda-app')->plainTextToken;

        return response()->json([
            'message' => '¡Bienvenido, ' . $user->name . '!',
            'user'    => [
                'id'              => $user->id,
                'name'            => $user->name,
                'email'           => $user->email,
                'role'            => $user->role,
                'ultimo_acceso'   => $user->ultimo_acceso,
            ],
            'token'   => $token,
        ]);
    }

    /**
     * LOGOUT
     * POST /api/logout
     *
     * Revoca el token actual del usuario.
     */
    public function logout(Request $request): JsonResponse
    {
        // Revocar solo el token actual
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Sesión cerrada correctamente.',
        ]);
    }

    /**
     * PERFIL DEL USUARIO AUTENTICADO
     * GET /api/me
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'user' => [
                'id'            => $user->id,
                'name'          => $user->name,
                'email'         => $user->email,
                'role'          => $user->role,
                'telefono'      => $user->telefono,
                'ultimo_acceso' => $user->ultimo_acceso,
                'permisos'      => [
                    'puede_ver_reportes'       => $user->puedeVerReportes(),
                    'puede_aprobar_creditos'   => $user->puedeAprobarCreditos(),
                    'puede_gestionar_usuarios' => $user->puedeGestionarUsuarios(),
                    'es_admin'                 => $user->esAdmin(),
                ],
            ],
        ]);
    }

    /**
     * REGISTRAR USUARIO (solo admin)
     * POST /api/users
     */
    public function register(Request $request): JsonResponse
    {
        // Solo admins pueden crear usuarios
        if (!$request->user()->esAdmin()) {
            return response()->json(['message' => 'Sin permisos.'], 403);
        }

        $validated = $request->validate([
            'name'     => ['required', 'string', 'max:150'],
            'email'    => ['required', 'email', 'unique:users'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'role'     => ['required', 'in:admin,cajero,supervisor,bodeguero'],
            'telefono' => ['nullable', 'string', 'max:20'],
        ]);

        $user = User::create([
            'name'     => $validated['name'],
            'email'    => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role'     => $validated['role'],
            'telefono' => $validated['telefono'] ?? null,
        ]);

        return response()->json([
            'message' => 'Usuario creado correctamente.',
            'user'    => $user->only(['id', 'name', 'email', 'role']),
        ], 201);
    }

    /**
     * CAMBIAR CONTRASEÑA
     * PUT /api/me/password
     */
    public function cambiarPassword(Request $request): JsonResponse
    {
        $request->validate([
            'password_actual' => ['required'],
            'password'        => ['required', 'min:8', 'confirmed'],
        ]);

        $user = $request->user();

        if (!Hash::check($request->password_actual, $user->password)) {
            throw ValidationException::withMessages([
                'password_actual' => ['La contraseña actual no es correcta.'],
            ]);
        }

        $user->update(['password' => Hash::make($request->password)]);

        return response()->json(['message' => 'Contraseña actualizada correctamente.']);
    }
}
