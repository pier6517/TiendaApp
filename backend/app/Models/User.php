<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * MODELO: USER
 * Usuario del sistema con roles y permisos.
 *
 * Roles disponibles:
 * - admin: Acceso total al sistema
 * - cajero: Solo ventas y caja
 * - supervisor: Reportes y aprobaciones
 * - bodeguero: Solo inventario
 */
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'name', 'email', 'password', 'role',
        'activo', 'telefono', 'cedula',
    ];

    protected $hidden = [
        'password', 'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'ultimo_acceso'     => 'datetime',
        'activo'            => 'boolean',
        'password'          => 'hashed',
    ];

    // ─────────────────────────────────────────
    // RELACIONES
    // ─────────────────────────────────────────

    /** Ventas realizadas por este usuario/cajero */
    public function ventas()
    {
        return $this->hasMany(Venta::class);
    }

    /** Créditos que aprobó este usuario */
    public function creditos()
    {
        return $this->hasMany(Credito::class);
    }

    /** Cajas que abrió este usuario */
    public function cajas()
    {
        return $this->hasMany(Caja::class);
    }

    // ─────────────────────────────────────────
    // HELPERS DE ROL
    // ─────────────────────────────────────────

    /** ¿Es administrador? */
    public function esAdmin(): bool
    {
        return $this->role === 'admin';
    }

    /** ¿Es cajero? */
    public function esCajero(): bool
    {
        return $this->role === 'cajero';
    }

    /** ¿Es supervisor? */
    public function esSupervisor(): bool
    {
        return in_array($this->role, ['admin', 'supervisor']);
    }

    /** ¿Puede ver reportes financieros? */
    public function puedeVerReportes(): bool
    {
        return in_array($this->role, ['admin', 'supervisor']);
    }

    /** ¿Puede aprobar créditos? */
    public function puedeAprobarCreditos(): bool
    {
        return in_array($this->role, ['admin', 'supervisor']);
    }

    /** ¿Puede gestionar usuarios? */
    public function puedeGestionarUsuarios(): bool
    {
        return $this->role === 'admin';
    }
}
