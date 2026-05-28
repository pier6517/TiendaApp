<?php

/**
 * CONFIGURACIÓN CORS
 * Permite que el frontend React (puerto 5173) consuma la API Laravel (puerto 8000)
 * Sin esto, el navegador bloquea todas las peticiones cross-origin
 */
return [

    /*
    |--------------------------------------------------------------------------
    | RUTAS AFECTADAS POR CORS
    |--------------------------------------------------------------------------
    | Aplicamos CORS a todas las rutas de la API
    */
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    /*
    |--------------------------------------------------------------------------
    | MÉTODOS HTTP PERMITIDOS
    |--------------------------------------------------------------------------
    */
    'allowed_methods' => ['*'],

    /*
    |--------------------------------------------------------------------------
    | ORÍGENES PERMITIDOS
    |--------------------------------------------------------------------------
    | En desarrollo: localhost:5173 (Vite) y localhost:3000 (CRA alternativo)
    | En producción: cambiar al dominio real del frontend
    */
    'allowed_origins' => [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
    ],

    'allowed_origins_patterns' => [],

    /*
    |--------------------------------------------------------------------------
    | CABECERAS PERMITIDAS
    |--------------------------------------------------------------------------
    */
    'allowed_headers' => ['*'],

    /*
    |--------------------------------------------------------------------------
    | CABECERAS EXPUESTAS AL FRONTEND
    |--------------------------------------------------------------------------
    */
    'exposed_headers' => [],

    /*
    |--------------------------------------------------------------------------
    | TIEMPO CACHE PRE-FLIGHT (segundos)
    |--------------------------------------------------------------------------
    */
    'max_age' => 0,

    /*
    |--------------------------------------------------------------------------
    | CREDENCIALES (cookies, authorization headers)
    |--------------------------------------------------------------------------
    | TRUE es necesario para que Sanctum funcione con cookies de sesión
    */
    'supports_credentials' => true,
];
