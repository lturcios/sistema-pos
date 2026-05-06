import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const rolePermissions = [
    // USUARIOS
    { resource: 'users', action: 'create', description: 'Crear nuevos usuarios en el sistema' },
    { resource: 'users', action: 'read', description: 'Ver el listado general de usuarios' },
    { resource: 'users', action: 'update', description: 'Editar datos y reasignar roles/sucursales de usuarios' },
    { resource: 'users', action: 'delete', description: 'Eliminar o desactivar usuarios permanentemente' },

    // ROLES
    { resource: 'roles', action: 'create', description: 'Crear nuevos perfiles y roles de acceso' },
    { resource: 'roles', action: 'read', description: 'Ver la lista de roles del sistema' },
    { resource: 'roles', action: 'update', description: 'Modificar los permisos y configuraciones de un rol' },
    { resource: 'roles', action: 'delete', description: 'Eliminar roles permanentemente' },

    // SUCURSALES
    { resource: 'branches', action: 'create', description: 'Crear nuevas sucursales' },
    { resource: 'branches', action: 'read', description: 'Ver información de las sucursales' },
    { resource: 'branches', action: 'update', description: 'Actualizar configuración de las sucursales' },
    { resource: 'branches', action: 'delete', description: 'Eliminar sucursales' },

    // CATÁLOGO DE INVENTARIO Y RECURSOS
    { resource: 'inventory', action: 'create', description: 'Ingresar traslados y movimientos iniciales de inventario' },
    { resource: 'inventory', action: 'read', description: 'Ver historiales de kardex y recuentos de insumos' },
    { resource: 'inventory', action: 'update', description: 'Realizar ajustes directos al inventario (ingresos/egresos manuales y conteos)' },
    { resource: 'inventory', action: 'delete', description: 'Anular movimientos de inventario' },
    { resource: 'inventory', action: 'reconcile', description: 'Conciliar conteos ciegos (Afectación real al Kardex)' },

    // PRODUCTOS A LA VENTA Y FÍSICOS
    { resource: 'products', action: 'create', description: 'Agregar nuevos productos para la venta o bodega' },
    { resource: 'products', action: 'read', description: 'Ver catálogo de productos de venta y bodega' },
    { resource: 'products', action: 'update', description: 'Modificar fórmulas, recetas, precios y descripciones de los productos' },
    { resource: 'products', action: 'delete', description: 'Borrar productos del catálogo principal' },

    // VENTAS Y ORDENES
    { resource: 'sales', action: 'create', description: 'Crear y registrar nuevas ventas/órdenes en el sistema' },
    { resource: 'sales', action: 'read', description: 'Consultar el historial de ventas y órdenes realizadas' },
    { resource: 'sales', action: 'update', description: 'Modificar órdenes abiertas o en curso (agregar/quitar items)' },
    { resource: 'sales', action: 'delete', description: 'Borrar/Cancelar órdenes y ventas en curso' },
    { resource: 'sales', action: 'void', description: 'Anular pedidos y órdenes ya facturadas' },

    // CAJA
    { resource: 'cash', action: 'create', description: 'Crear abonos monetarios y registros directos' },
    { resource: 'cash', action: 'read', description: 'Ver transacciones realizadas por caja' },
    { resource: 'cash', action: 'update', description: 'Modificar registros en un turno de caja (ajustes)' },
    { resource: 'cash', action: 'delete', description: 'Eliminar operaciones de caja' },
    { resource: 'cash', action: 'open', description: 'Aperturar un turno de caja de dinero' },
    { resource: 'cash', action: 'close', description: 'Cerrar y cuadrar caja (Arqueo/Corte)' },

    // REPORTES Y OPCIONES
    { resource: 'reports', action: 'create', description: 'Generar reportes a demanda' },
    { resource: 'reports', action: 'read', description: 'Tener acceso al módulo de analíticas y métricas de desempeño' },
    { resource: 'reports', action: 'update', description: 'Guardar/modificar perfiles de reportes base' },
    { resource: 'reports', action: 'delete', description: 'Eliminar reportes' },

    { resource: 'settings', action: 'create', description: 'Generar credenciales o configuraciones nuevas' },
    { resource: 'settings', action: 'read', description: 'Ver la configuración maestra del sistema' },
    { resource: 'settings', action: 'update', description: 'Cambiar configuración general (como tipo de moneda, impuestos globales)' },
    { resource: 'settings', action: 'delete', description: 'Remover ajustes' },
];

async function seedPermissions() {
    console.log("Seeding and updating permissions with descriptions...");

    for (const p of rolePermissions) {
        // Upsert permission matching resource and action
        const existing = await prisma.permission.findFirst({
            where: {
                resource: p.resource,
                action: p.action
            }
        });

        if (existing) {
            await prisma.permission.update({
                where: { id: existing.id },
                data: { description: p.description }
            });
        } else {
            await prisma.permission.create({
                data: p
            });
        }
    }

    console.log(`Updated or created ${rolePermissions.length} permissions successfully.`);
}

seedPermissions()
    .catch((e) => {
        console.error("Error seeding permissions:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
