<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * MIGRACIÓN: USUARIOS
 * Tabla principal de usuarios del sistema.
 * Incluye: roles, estado activo, datos de perfil y auditoría.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();

            // Datos personales
            $table->string('name');                          // Nombre completo
            $table->string('email')->unique();               // Email único para login
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');                      // Bcrypt hash

            // Rol del usuario en el sistema
            $table->enum('role', [
                'admin',       // Administrador: acceso total
                'cajero',      // Cajero: ventas y caja
                'supervisor',  // Supervisor: reportes y aprobaciones
                'bodeguero',   // Bodeguero: inventario
            ])->default('cajero');

            // Estado de la cuenta
            $table->boolean('activo')->default(true);

            // Datos adicionales del perfil
            $table->string('telefono', 20)->nullable();
            $table->string('cedula', 20)->nullable();

            // Metadatos de sesión
            $table->timestamp('ultimo_acceso')->nullable();
            $table->string('remember_token', 100)->nullable();

            $table->timestamps();    // created_at, updated_at
            $table->softDeletes();   // deleted_at (borrado lógico)

            // Índices para búsquedas frecuentes
            $table->index('role');
            $table->index('activo');
        });

        // Tabla de tokens de Sanctum (autenticación API)
        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->morphs('tokenable');
            $table->string('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('personal_access_tokens');
        Schema::dropIfExists('users');
    }
};
