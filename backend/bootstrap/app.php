<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Sanctum stateful para SPA
        $middleware->statefulApi();

        // Registrar alias de middleware de roles
        // Uso: middleware('role:admin,supervisor')
        $middleware->alias([
            'role' => \App\Http\Middleware\CheckRole::class,
        ]);

        // Excluir CSRF para rutas API (usan Sanctum tokens)
        $middleware->validateCsrfTokens(except: [
            'api/*',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Respuestas JSON para todas las excepciones en rutas API
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, Request $request) {
            if ($request->expectsJson() || str_starts_with($request->path(), 'api/')) {
                return response()->json(['message' => 'No autenticado.'], 401);
            }
        });

        $exceptions->render(function (\Illuminate\Database\Eloquent\ModelNotFoundException $e, Request $request) {
            if ($request->expectsJson() || str_starts_with($request->path(), 'api/')) {
                return response()->json(['message' => 'Recurso no encontrado.'], 404);
            }
        });

        $exceptions->render(function (\Illuminate\Validation\ValidationException $e, Request $request) {
            if ($request->expectsJson() || str_starts_with($request->path(), 'api/')) {
                return response()->json([
                    'message' => 'Error de validación.',
                    'errors'  => $e->errors(),
                ], 422);
            }
        });
    })->create();
