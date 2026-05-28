# TiendaApp 🛒

Sistema de gestión para tiendas de barrio colombianas.

**Stack:** Laravel 11 + PHP 8.3 (Backend) | React + Vite + TailwindCSS (Frontend) | MySQL

---

## ⚡ Instalación rápida en Laragon

### Requisitos previos
- [Laragon](https://laragon.org/) con PHP 8.3+, MySQL 8, Apache/Nginx
- Node.js 20+ y npm
- Composer

---

## 1. Backend Laravel

### Paso 1 — Crear proyecto (si es desde cero)
```bash
cd C:\laragon\www
composer create-project laravel/laravel tienda-app/backend
cd tienda-app/backend
```

Si ya tienes los archivos del proyecto, solo instala dependencias:
```bash
cd tienda-app/backend
composer install
```

### Paso 2 — Instalar dependencias adicionales
```bash
composer require laravel/sanctum
```

### Paso 3 — Configurar variables de entorno
```bash
copy .env.example .env
php artisan key:generate
```

Edita `.env` con tus datos de Laragon:
```env
APP_NAME="TiendaApp"
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=tienda_barrio
DB_USERNAME=root
DB_PASSWORD=          # Laragon: vacío por defecto
```

### Paso 4 — Crear base de datos
Abre phpMyAdmin en Laragon (http://localhost/phpmyadmin) y crea:
```sql
CREATE DATABASE tienda_barrio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Paso 5 — Ejecutar migraciones y seeders
```bash
php artisan migrate
php artisan db:seed
```

Esto crea todas las tablas y carga:
- 3 usuarios (admin, cajero, supervisor)
- 12 categorías
- 20 productos típicos
- 8 clientes con deudas de ejemplo

### Paso 6 — Instalar Sanctum
```bash
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
```

Verifica que en `config/sanctum.php` el `stateful` incluya `localhost:5173`.

### Paso 7 — Iniciar el servidor
```bash
php artisan serve
```

Backend disponible en: **http://localhost:8000**

---

## 2. Frontend React

### Paso 1 — Instalar dependencias
```bash
cd tienda-app/frontend
npm install
```

Si es un proyecto nuevo:
```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install axios react-router-dom @tanstack/react-query zustand \
  react-hook-form react-hot-toast lucide-react recharts \
  date-fns numeral
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Paso 2 — Variables de entorno
Crea el archivo `.env`:
```env
VITE_API_URL=http://localhost:8000/api
```

### Paso 3 — Iniciar el servidor de desarrollo
```bash
npm run dev
```

Frontend disponible en: **http://localhost:5173**

---

## 3. Usuarios de prueba

| Rol        | Email                    | Contraseña | Acceso                        |
|------------|--------------------------|------------|-------------------------------|
| Admin      | admin@tienda.com         | admin123   | Todo el sistema               |
| Cajero     | cajero@tienda.com        | cajero123  | POS, caja, clientes           |
| Supervisor | supervisor@tienda.com    | super123   | Todo menos usuarios/configs   |

---

## 4. Estructura del proyecto

```
tienda-app/
├── backend/                    # Laravel 11
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   │   ├── Auth/       # AuthController
│   │   │   │   └── Api/        # Todos los controllers
│   │   │   └── Middleware/
│   │   │       └── CheckRole.php
│   │   ├── Models/             # Eloquent models
│   │   └── Services/           # Lógica de negocio
│   │       ├── VentaService.php
│   │       └── CreditoService.php
│   ├── database/
│   │   ├── migrations/         # Tablas de la BD
│   │   └── seeders/            # Datos de prueba
│   └── routes/
│       └── api.php             # Todos los endpoints
│
└── frontend/                   # React + Vite
    └── src/
        ├── api/                # Axios — llamadas al backend
        ├── pages/
        │   ├── auth/           # Login
        │   ├── dashboard/      # Dashboard con gráficas
        │   ├── inventory/      # Productos (CRUD)
        │   ├── sales/          # POS y ventas
        │   ├── credits/        # Créditos y abonos
        │   ├── cash/           # Caja diaria
        │   ├── customers/      # Clientes
        │   └── reports/        # Reportes financieros
        ├── store/              # Zustand (auth)
        ├── layouts/            # DashboardLayout
        └── utils/              # Formateo de moneda y fechas
```

---

## 5. Endpoints principales de la API

### Autenticación
```
POST   /api/login              Iniciar sesión
POST   /api/logout             Cerrar sesión
GET    /api/me                 Usuario actual
```

### Productos / Inventario
```
GET    /api/products           Listar con filtros
POST   /api/products           Crear producto
PUT    /api/products/{id}      Actualizar
DELETE /api/products/{id}      Eliminar (soft delete)
GET    /api/products/search    Buscar (para POS)
GET    /api/products/low-stock Productos con stock bajo
POST   /api/products/{id}/adjust Ajustar inventario
```

### Ventas
```
GET    /api/sales              Historial
POST   /api/sales              Crear venta (POS)
GET    /api/sales/{id}         Detalle
POST   /api/sales/{id}/cancel  Anular venta
```

### Créditos y Fiados
```
GET    /api/credits            Listar créditos
POST   /api/credits            Crear crédito manual
POST   /api/credits/{id}/payment  Registrar abono
GET    /api/credits/overdue    Créditos vencidos
GET    /api/credits/summary    Resumen cartera
```

### Caja
```
GET    /api/cash/current       Estado actual
POST   /api/cash/open          Abrir caja
POST   /api/cash/close         Cerrar caja
POST   /api/cash/movement      Movimiento manual
```

### Reportes (admin/supervisor)
```
GET    /api/reports/sales      Ventas por período
GET    /api/reports/inventory  Estado inventario
GET    /api/reports/credits    Cartera
GET    /api/reports/balance    Balance financiero
```

---

## 6. Flujo principal del sistema

```
Cliente llega a la tienda
        ↓
Cajero abre el POS (/pos)
        ↓
Busca productos por nombre o código
        ↓
Agrega al carrito y selecciona método de pago
        ↓
    ┌───────────────┐
    │ ¿Paga en      │
    │ efectivo?     │
    └───┬───────────┘
        │
   SÍ ─┼─ NO (fiado)
        │       ↓
        │   Selecciona cliente
        │   Sistema crea crédito
        │   Cliente queda con deuda
        ↓
Venta registrada
        ↓
Stock actualizado automáticamente
        ↓
Caja actualizada
```

---

## 7. Solución de problemas comunes

### Error CORS
Verifica que en `config/cors.php` el `allowed_origins` incluya `http://localhost:5173`.

### Error 401 en login
Asegúrate de que `SANCTUM_STATEFUL_DOMAINS=localhost:5173` esté en el `.env`.

### Error de migraciones
```bash
php artisan migrate:fresh --seed
```

### El frontend no conecta al backend
Verifica que `VITE_API_URL` en el `.env` del frontend apunte a `http://localhost:8000/api`.

---

## 8. Datos de prueba incluidos

El seeder carga datos realistas colombianos:
- **Productos:** Coca-Cola, Leche Colanta, Papas Margarita, Arroz Diana, etc.
- **Clientes:** Doña Rosa (deuda $45.000), Don Carlos, etc. con barrios de Medellín
- **Proveedores:** Distribuidora El Paisa, Colanta, Bavaria S.A.

---

Desarrollado para tiendas de barrio colombianas 🇨🇴
