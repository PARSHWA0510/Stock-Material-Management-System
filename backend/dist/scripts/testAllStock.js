"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function testAllStock() {
    try {
        console.log('🔍 COMPREHENSIVE STOCK TESTING');
        console.log('================================\n');
        // Get all materials and godowns
        const materials = await prisma.material.findMany();
        const godowns = await prisma.godown.findMany();
        console.log(`📦 Materials: ${materials.length}`);
        materials.forEach((m) => console.log(`   - ${m.name} (${m.unit})`));
        console.log(`\n🏪 Godowns: ${godowns.length}`);
        godowns.forEach((g) => console.log(`   - ${g.name}`));
        console.log('\n📊 DETAILED STOCK ANALYSIS');
        console.log('===========================\n');
        // Test each material in each godown
        for (const material of materials) {
            console.log(`\n🔸 Material: ${material.name}`);
            console.log('─'.repeat(50));
            for (const godown of godowns) {
                // Get transactions for this material in this godown
                const transactions = await prisma.stockTransaction.findMany({
                    where: {
                        materialId: material.id,
                        godownId: godown.id
                    },
                    orderBy: { createdAt: 'asc' }
                });
                if (transactions.length === 0) {
                    console.log(`   ${godown.name}: No transactions`);
                    continue;
                }
                // Calculate stock
                let stock = 0;
                let totalValue = 0;
                let lastTransaction = null;
                for (const tx of transactions) {
                    if (tx.txType === 'IN') {
                        stock += Number(tx.quantity);
                        totalValue += Number(tx.quantity) * Number(tx.rate);
                    }
                    else {
                        stock -= Number(tx.quantity);
                        totalValue -= Number(tx.quantity) * Number(tx.rate);
                    }
                    lastTransaction = tx;
                }
                console.log(`   ${godown.name}: ${stock} ${material.unit} (₹${totalValue.toFixed(2)})`);
                if (lastTransaction) {
                    console.log(`     Last transaction: ${lastTransaction.txType} ${lastTransaction.quantity} on ${lastTransaction.txDate.toISOString().split('T')[0]}`);
                }
            }
        }
        console.log('\n📈 SUMMARY BY GODOWN');
        console.log('====================\n');
        // Summary by godown
        for (const godown of godowns) {
            console.log(`🏪 ${godown.name}:`);
            const godownTransactions = await prisma.stockTransaction.findMany({
                where: { godownId: godown.id },
                include: { material: true },
                orderBy: { createdAt: 'asc' }
            });
            const stockLevels = {};
            for (const tx of godownTransactions) {
                const materialId = tx.materialId;
                if (!stockLevels[materialId]) {
                    stockLevels[materialId] = {
                        material: tx.material,
                        quantity: 0,
                        value: 0
                    };
                }
                if (tx.txType === 'IN') {
                    stockLevels[materialId].quantity += Number(tx.quantity);
                    stockLevels[materialId].value += Number(tx.quantity) * Number(tx.rate);
                }
                else {
                    stockLevels[materialId].quantity -= Number(tx.quantity);
                    stockLevels[materialId].value -= Number(tx.quantity) * Number(tx.rate);
                }
            }
            const activeStock = Object.values(stockLevels).filter((level) => level.quantity > 0);
            if (activeStock.length === 0) {
                console.log('   No stock available');
            }
            else {
                activeStock.forEach((level) => {
                    console.log(`   - ${level.material.name}: ${level.quantity} ${level.material.unit} (₹${level.value.toFixed(2)})`);
                });
            }
            console.log('');
        }
        console.log('✅ Stock testing completed!');
    }
    catch (error) {
        console.error('❌ Error testing stock:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
testAllStock();
