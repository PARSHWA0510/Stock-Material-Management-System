"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function testStockCalculation() {
    try {
        console.log('Testing stock calculation for Anand godown...\n');
        // Get Anand godown ID
        const anandGodown = await prisma.godown.findFirst({
            where: { name: 'Anand' }
        });
        if (!anandGodown) {
            console.log('Anand godown not found');
            return;
        }
        console.log(`Anand godown ID: ${anandGodown.id}\n`);
        // Get Cement material ID
        const cementMaterial = await prisma.material.findFirst({
            where: { name: 'Cement' }
        });
        if (!cementMaterial) {
            console.log('Cement material not found');
            return;
        }
        console.log(`Cement material ID: ${cementMaterial.id}\n`);
        // Test inventory API logic
        console.log('=== INVENTORY API LOGIC ===');
        const inventoryTransactions = await prisma.stockTransaction.findMany({
            where: {
                materialId: cementMaterial.id,
                godownId: anandGodown.id
            },
            orderBy: { createdAt: 'asc' }
        });
        console.log(`Found ${inventoryTransactions.length} transactions for Cement in Anand godown:`);
        inventoryTransactions.forEach((tx, index) => {
            console.log(`${index + 1}. ${tx.txType} - Qty: ${tx.quantity}, Rate: ${tx.rate}, Balance: ${tx.balanceAfter}`);
        });
        let inventoryStock = 0;
        for (const tx of inventoryTransactions) {
            if (tx.txType === 'IN') {
                inventoryStock += Number(tx.quantity);
            }
            else {
                inventoryStock -= Number(tx.quantity);
            }
        }
        console.log(`\nInventory API calculated stock: ${inventoryStock}`);
        // Test material issues API logic (old)
        console.log('\n=== MATERIAL ISSUES API LOGIC (OLD) ===');
        const oldMaterialIssuesTransactions = await prisma.stockTransaction.findMany({
            where: {
                materialId: cementMaterial.id,
                godownId: anandGodown.id
            },
            orderBy: { createdAt: 'asc' }
        });
        let oldMaterialIssuesStock = 0;
        for (const tx of oldMaterialIssuesTransactions) {
            if (tx.txType === 'IN') {
                oldMaterialIssuesStock += Number(tx.quantity);
            }
            else {
                oldMaterialIssuesStock -= Number(tx.quantity);
            }
        }
        console.log(`Old Material Issues API calculated stock: ${oldMaterialIssuesStock}`);
        // Test material issues API logic (new)
        console.log('\n=== MATERIAL ISSUES API LOGIC (NEW) ===');
        const whereClause = {
            materialId: cementMaterial.id,
            godownId: anandGodown.id
        };
        const newMaterialIssuesTransactions = await prisma.stockTransaction.findMany({
            where: whereClause,
            orderBy: { createdAt: 'asc' }
        });
        let newMaterialIssuesStock = 0;
        for (const tx of newMaterialIssuesTransactions) {
            if (tx.txType === 'IN') {
                newMaterialIssuesStock += Number(tx.quantity);
            }
            else {
                newMaterialIssuesStock -= Number(tx.quantity);
            }
        }
        console.log(`New Material Issues API calculated stock: ${newMaterialIssuesStock}`);
        console.log('\n=== SUMMARY ===');
        console.log(`Inventory API: ${inventoryStock}`);
        console.log(`Old Material Issues API: ${oldMaterialIssuesStock}`);
        console.log(`New Material Issues API: ${newMaterialIssuesStock}`);
        console.log(`All should be equal: ${inventoryStock === oldMaterialIssuesStock && oldMaterialIssuesStock === newMaterialIssuesStock}`);
    }
    catch (error) {
        console.error('Error testing stock calculation:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
testStockCalculation();
//# sourceMappingURL=testStockCalculation.js.map