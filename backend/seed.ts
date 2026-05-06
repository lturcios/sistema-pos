import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    // 1. Crear o asegurar el Rol de Super Admin
    const adminRole = await prisma.role.upsert({
        where: { name: 'SuperAdmin' },
        update: {},
        create: {
            name: 'SuperAdmin',
            description: 'Rol con acceso total al sistema',
        },
    });

    // 2. Crear o asegurar una Sucursal Base
    const mainBranch = await prisma.branch.upsert({
        where: { code: 'MAIN-01' },
        update: {},
        create: {
            name: 'Sucursal Matriz',
            code: 'MAIN-01',
            address: 'Centro Histórico',
            phone: '2222-0000',
        },
    });

    // 3. Generar la contraseña encriptada (Password: admin123)
    const passwordHash = await bcrypt.hash('admin123', 10);

    // 4. Crear el Usuario de Pruebas
    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@pos.com' },
        update: {
            passwordHash, // actualiza la contraseña por si la base ya existía
            roleId: adminRole.id,
            branchId: mainBranch.id,
        },
        create: {
            email: 'admin@pos.com',
            passwordHash,
            fullName: 'Administrador General',
            roleId: adminRole.id,
            branchId: mainBranch.id,
            isActive: true,
        },
    });

    console.log('✅ Base de datos sembrada con éxito.');
    console.log('-----------------------------------------');
    console.log('   Credenciales de Acceso Creadas/Verificadas   ');
    console.log('   Email:     admin@pos.com              ');
    console.log('   Password:  admin123                   ');
    console.log('-----------------------------------------');
}

main()
    .catch((e) => {
        console.error('Error al sembrar la base de datos:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
