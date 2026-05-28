<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Categoria;
use App\Models\Marca;
use App\Models\Producto;
use App\Models\Cliente;
use App\Models\Proveedor;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * SEEDER PRINCIPAL
 * Carga datos de prueba realistas para una tienda de barrio colombiana.
 *
 * Ejecutar: php artisan db:seed
 * O desde cero: php artisan migrate:fresh --seed
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            UserSeeder::class,
            CategoriaSeeder::class,
            MarcaSeeder::class,
            ProveedorSeeder::class,
            ProductoSeeder::class,
            ClienteSeeder::class,
        ]);

        $this->command->info('✅ Base de datos poblada con datos de prueba.');
    }
}

// ══════════════════════════════════════════════════════════════
class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Administrador principal
        User::create([
            'name'     => 'Administrador',
            'email'    => 'admin@tienda.com',
            'password' => Hash::make('admin123'),
            'role'     => 'admin',
            'telefono' => '3001234567',
            'activo'   => true,
        ]);

        // Cajero
        User::create([
            'name'     => 'María García',
            'email'    => 'cajero@tienda.com',
            'password' => Hash::make('cajero123'),
            'role'     => 'cajero',
            'telefono' => '3107654321',
            'activo'   => true,
        ]);

        // Supervisor
        User::create([
            'name'     => 'Carlos Rodríguez',
            'email'    => 'supervisor@tienda.com',
            'password' => Hash::make('super123'),
            'role'     => 'supervisor',
            'activo'   => true,
        ]);

        $this->command->info('  ✓ Usuarios creados (admin@tienda.com / admin123)');
    }
}

// ══════════════════════════════════════════════════════════════
class CategoriaSeeder extends Seeder
{
    public function run(): void
    {
        $categorias = [
            ['nombre' => 'Bebidas',            'icono' => '🥤'],
            ['nombre' => 'Lácteos',            'icono' => '🥛'],
            ['nombre' => 'Panadería',          'icono' => '🍞'],
            ['nombre' => 'Granos y Cereales',  'icono' => '🌾'],
            ['nombre' => 'Snacks y Dulces',    'icono' => '🍪'],
            ['nombre' => 'Aseo Personal',      'icono' => '🧴'],
            ['nombre' => 'Aseo Hogar',         'icono' => '🧹'],
            ['nombre' => 'Carnes y Embutidos', 'icono' => '🥩'],
            ['nombre' => 'Frutas y Verduras',  'icono' => '🥦'],
            ['nombre' => 'Confitería',         'icono' => '🍬'],
            ['nombre' => 'Cigarrillos',        'icono' => '🚬'],
            ['nombre' => 'Minutos y Recargas', 'icono' => '📱'],
        ];

        foreach ($categorias as $cat) {
            Categoria::create(array_merge($cat, ['activo' => true]));
        }

        $this->command->info('  ✓ Categorías creadas');
    }
}

// ══════════════════════════════════════════════════════════════
class MarcaSeeder extends Seeder
{
    public function run(): void
    {
        $marcas = [
            'Coca-Cola', 'Pepsi', 'Postobón', 'Bavaria', 'Águila',
            'Colanta', 'Alpina', 'Alquería', 'Nestlé', 'Jet',
            'Nacional de Chocolates', 'Bimbo', 'Ramo',
            'Colgate', 'Pantene', 'Ariel', 'Fab',
            'Zenú', 'Rica', 'Pietrán',
            'Noel', 'Quala', 'Unilever',
            'Genérico',
        ];

        foreach ($marcas as $nombre) {
            Marca::create(['nombre' => $nombre, 'activo' => true]);
        }

        $this->command->info('  ✓ Marcas creadas');
    }
}

// ══════════════════════════════════════════════════════════════
class ProveedorSeeder extends Seeder
{
    public function run(): void
    {
        $proveedores = [
            [
                'nombre'   => 'Distribuidora El Paisa',
                'nit'      => '900123456-1',
                'telefono' => '3156789012',
                'contacto' => 'Juan Pérez',
                'ciudad'   => 'Medellín',
            ],
            [
                'nombre'   => 'Colanta Medellín',
                'nit'      => '890900294-6',
                'telefono' => '6044449090',
                'contacto' => 'Andrés Mora',
                'ciudad'   => 'Medellín',
            ],
            [
                'nombre'   => 'Bavaria S.A.',
                'nit'      => '860034313-7',
                'telefono' => '6017447000',
                'contacto' => 'Vendedor Bavaria',
                'ciudad'   => 'Bogotá',
            ],
        ];

        foreach ($proveedores as $proveedor) {
            Proveedor::create(array_merge($proveedor, ['activo' => true]));
        }

        $this->command->info('  ✓ Proveedores creados');
    }
}

// ══════════════════════════════════════════════════════════════
class ProductoSeeder extends Seeder
{
    public function run(): void
    {
        // Productos típicos de una tienda de barrio colombiana
        $productos = [
            // Bebidas
            ['codigo'=>'BEB001','nombre'=>'Coca-Cola 300ml',    'cat'=>'Bebidas','marca'=>'Coca-Cola',  'costo'=>1500,'precio'=>2000,'stock'=>48,'iva'=>0],
            ['codigo'=>'BEB002','nombre'=>'Coca-Cola 1.5L',     'cat'=>'Bebidas','marca'=>'Coca-Cola',  'costo'=>3800,'precio'=>5000,'stock'=>24,'iva'=>0],
            ['codigo'=>'BEB003','nombre'=>'Agua Cristal 600ml', 'cat'=>'Bebidas','marca'=>'Genérico',   'costo'=>800, 'precio'=>1200,'stock'=>60,'iva'=>0],
            ['codigo'=>'BEB004','nombre'=>'Gatorade 500ml',     'cat'=>'Bebidas','marca'=>'Postobón',   'costo'=>2500,'precio'=>3500,'stock'=>30,'iva'=>0],
            ['codigo'=>'BEB005','nombre'=>'Águila 330ml',       'cat'=>'Bebidas','marca'=>'Águila',     'costo'=>2200,'precio'=>3000,'stock'=>36,'iva'=>0],
            // Lácteos
            ['codigo'=>'LAC001','nombre'=>'Leche Colanta 1L',   'cat'=>'Lácteos','marca'=>'Colanta',   'costo'=>2800,'precio'=>3500,'stock'=>20,'iva'=>0],
            ['codigo'=>'LAC002','nombre'=>'Yogurt Alpina 150g', 'cat'=>'Lácteos','marca'=>'Alpina',    'costo'=>1200,'precio'=>1800,'stock'=>15,'iva'=>0],
            ['codigo'=>'LAC003','nombre'=>'Queso Campesino 250g','cat'=>'Lácteos','marca'=>'Colanta',  'costo'=>4500,'precio'=>6000,'stock'=>8,'iva'=>0],
            // Panadería
            ['codigo'=>'PAN001','nombre'=>'Pan tajado Bimbo',   'cat'=>'Panadería','marca'=>'Bimbo',   'costo'=>3500,'precio'=>4500,'stock'=>10,'iva'=>0],
            ['codigo'=>'PAN002','nombre'=>'Mantequilla 250g',   'cat'=>'Lácteos','marca'=>'Colanta',   'costo'=>3800,'precio'=>5000,'stock'=>12,'iva'=>0],
            // Snacks
            ['codigo'=>'SNK001','nombre'=>'Papas Margarita 30g','cat'=>'Snacks y Dulces','marca'=>'Noel','costo'=>800,'precio'=>1200,'stock'=>50,'iva'=>0],
            ['codigo'=>'SNK002','nombre'=>'Chitos 30g',         'cat'=>'Snacks y Dulces','marca'=>'Noel','costo'=>700,'precio'=>1000,'stock'=>40,'iva'=>0],
            ['codigo'=>'SNK003','nombre'=>'Chocolatina Jet',    'cat'=>'Snacks y Dulces','marca'=>'Jet', 'costo'=>500,'precio'=>800, 'stock'=>80,'iva'=>0],
            // Aseo
            ['codigo'=>'ASE001','nombre'=>'Jabón Protex 125g',  'cat'=>'Aseo Personal','marca'=>'Genérico','costo'=>1800,'precio'=>2500,'stock'=>20,'iva'=>19],
            ['codigo'=>'ASE002','nombre'=>'Colgate Triple Acc.', 'cat'=>'Aseo Personal','marca'=>'Colgate','costo'=>3500,'precio'=>5000,'stock'=>15,'iva'=>19],
            ['codigo'=>'ASE003','nombre'=>'Detergente Ariel 500g','cat'=>'Aseo Hogar','marca'=>'Ariel', 'costo'=>4500,'precio'=>6500,'stock'=>12,'iva'=>19],
            // Granos
            ['codigo'=>'GRA001','nombre'=>'Arroz Diana 500g',   'cat'=>'Granos y Cereales','marca'=>'Genérico','costo'=>1800,'precio'=>2500,'stock'=>30,'iva'=>0],
            ['codigo'=>'GRA002','nombre'=>'Frijoles 500g',      'cat'=>'Granos y Cereales','marca'=>'Genérico','costo'=>2200,'precio'=>3000,'stock'=>20,'iva'=>0],
            // Confitería
            ['codigo'=>'CON001','nombre'=>'Colombina Bon Bon',  'cat'=>'Confitería','marca'=>'Genérico','costo'=>200,'precio'=>300,'stock'=>200,'iva'=>0],
            ['codigo'=>'CON002','nombre'=>'Chicles Trident',    'cat'=>'Confitería','marca'=>'Genérico','costo'=>500,'precio'=>800,'stock'=>60,'iva'=>0],
        ];

        foreach ($productos as $p) {
            $categoria = Categoria::where('nombre', $p['cat'])->first();
            $marca     = Marca::where('nombre', $p['marca'])->first();

            Producto::create([
                'codigo'        => $p['codigo'],
                'nombre'        => $p['nombre'],
                'categoria_id'  => $categoria?->id,
                'marca_id'      => $marca?->id,
                'costo'         => $p['costo'],
                'precio_venta'  => $p['precio'],
                'stock'         => $p['stock'],
                'stock_minimo'  => 5,
                'impuesto'      => $p['iva'],
                'unidad_medida' => 'unidad',
                'activo'        => true,
            ]);
        }

        $this->command->info('  ✓ Productos creados (' . count($productos) . ')');
    }
}

// ══════════════════════════════════════════════════════════════
class ClienteSeeder extends Seeder
{
    public function run(): void
    {
        $clientes = [
            ['nombre'=>'Doña Rosa Martínez',    'cedula'=>'43256789','telefono'=>'3142345678','barrio'=>'El Poblado',   'saldo'=>45000],
            ['nombre'=>'Don Carlos Vélez',       'cedula'=>'71345678','telefono'=>'3167891234','barrio'=>'Laureles',     'saldo'=>0],
            ['nombre'=>'Ana Lucía Restrepo',     'cedula'=>'42789012','telefono'=>'3201234567','barrio'=>'Belén',        'saldo'=>120000],
            ['nombre'=>'Juan David Gómez',       'cedula'=>'98234567','telefono'=>'3112345678','barrio'=>'Robledo',      'saldo'=>0],
            ['nombre'=>'Marleny Ospina',         'cedula'=>'32456789','telefono'=>'3189876543','barrio'=>'San Javier',   'saldo'=>78000],
            ['nombre'=>'Pedro Álvarez',          'cedula'=>'15678901','telefono'=>'3123456789','barrio'=>'Manrique',     'saldo'=>25000],
            ['nombre'=>'Gloria Inés Salazar',    'cedula'=>'43567890','telefono'=>'3145678901','barrio'=>'Castilla',     'saldo'=>0],
            ['nombre'=>'Hernán Giraldo',         'cedula'=>'71890123','telefono'=>'3156789012','barrio'=>'Aranjuez',     'saldo'=>200000],
        ];

        foreach ($clientes as $c) {
            Cliente::create([
                'nombre'          => $c['nombre'],
                'cedula'          => $c['cedula'],
                'telefono'        => $c['telefono'],
                'barrio'          => $c['barrio'],
                'ciudad'          => 'Medellín',
                'cupo_credito'    => 300000, // $300.000 de cupo
                'saldo_pendiente' => $c['saldo'],
                'permite_credito' => true,
                'estado_credito'  => $c['saldo'] > 150000 ? 'moroso' : ($c['saldo'] > 0 ? 'regular' : 'bueno'),
                'activo'          => true,
            ]);
        }

        $this->command->info('  ✓ Clientes creados (' . count($clientes) . ')');
    }
}
