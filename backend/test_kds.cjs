const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const items = await prisma.orderItem.findMany({ include: { productSale: true } });
    console.log('Total items:', items.length);
    const kdsItems = items.filter(i => i.productSale && i.productSale.requiresPreparation);
    console.log('Items for KDS (requiresPreparation=true):', kdsItems.length);
    console.log('Status of KDS items:', kdsItems.map(i => i.status));
}

test().finally(() => prisma.$disconnect());
