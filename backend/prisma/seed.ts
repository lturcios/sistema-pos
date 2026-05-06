import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...');

    // 1. Create permissions
    const resources = ['users', 'roles', 'branches', 'products', 'inventory', 'sales', 'reports', 'settings', 'pos', 'cash'];
    const actions = ['create', 'read', 'update', 'delete', 'manage', 'void', 'open', 'close'];
    
    const translateAction = (a: string) => ({ create: 'Crear', read: 'Leer/Ver', update: 'Editar', delete: 'Eliminar', manage: 'Administrar', void: 'Anular/Invalidar', open: 'Abrir', close: 'Cerrar' }[a] || a);
    const translateResource = (r: string) => ({ users: 'Usuarios', roles: 'Roles y Permisos', branches: 'Sucursales', products: 'Catálogo de Productos', inventory: 'Existencias (Inventario)', sales: 'Órdenes de Venta', reports: 'Reportes Generales', settings: 'Configuraciones', pos: 'Móduo POS (Punto de Venta)', cash: 'Manejo de Cajas' }[r] || r);

    const adminPermissions: string[] = [];
    
    for (const resource of resources) {
        for (const action of actions) {
            const desc = `${translateAction(action)} registros de ${translateResource(resource)}`;

            let perm = await prisma.permission.findFirst({
                where: { resource, action }
            });
            if (!perm) {
                perm = await prisma.permission.create({
                    data: { resource, action, description: desc }
                });
            } else {
                perm = await prisma.permission.update({
                    where: { id: perm.id },
                    data: { description: desc }
                });
            }
            adminPermissions.push(perm.id);
        }
    }
    
    // 2. Create Admin Role
    const adminRole = await prisma.role.upsert({
        where: { name: 'admin' },
        update: {
            permissions: {
                connect: adminPermissions.map(id => ({ id }))
            }
        },
        create: {
            name: 'admin',
            description: 'Administrador del Sistema',
            permissions: {
                connect: adminPermissions.map(id => ({ id }))
            }
        }
    });

    console.log(`✅ Role checked/created: ${adminRole.name}`);

    // 3. Create Default Branch
    const defaultBranch = await prisma.branch.upsert({
        where: { code: 'MATRIZ' },
        update: {},
        create: {
            name: 'Sucursal Central',
            code: 'MATRIZ',
            address: 'Av. Principal 123',
            phone: '555-0123'
        }
    });

    console.log(`✅ Branch checked/created: ${defaultBranch.name}`);

    // 4. Create Admin User
    const hash = await bcrypt.hash('admin123', 10);
    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@admin.com' },
        update: {
            passwordHash: hash
        },
        create: {
            email: 'admin@admin.com',
            passwordHash: hash,
            fullName: 'Administrador General',
            roleId: adminRole.id,
            branchId: defaultBranch.id,
            isActive: true
        }
    });

    console.log(`✅ User checked/created: ${adminUser.email}`);

    // 5. Create a default Cash Register
    let defaultRegister = await prisma.cashRegister.findFirst({
        where: { name: 'Caja 01', branchId: defaultBranch.id }
    });
    
    if (!defaultRegister) {
        defaultRegister = await prisma.cashRegister.create({
            data: {
                name: 'Caja 01',
                branchId: defaultBranch.id,
                isActive: true
            }
        });
    }
    
    console.log(`✅ Cash Register checked/created: ${defaultRegister.name}`);

    console.log('✅ Seeding finished.');
}

main()
    .catch((e) => {
        console.error('❌ Error during seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
