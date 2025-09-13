"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function populateStockTransactions() {
    try {
        console.log('Starting stock transactions population...');
        // Clear existing stock transactions
        console.log('Clearing existing stock transactions...');
        await prisma.stockTransaction.deleteMany({});
        // Get all purchase bills with items
        const purchaseBills = await prisma.purchaseBill.findMany({
            include: {
                items: true
            },
            orderBy: { billDate: 'asc' }
        });
        console.log(`Found ${purchaseBills.length} purchase bills`);
        // Get all material issues with items
        const materialIssues = await prisma.materialIssue.findMany({
            include: {
                items: true
            },
            orderBy: { issueDate: 'asc' }
        });
        console.log(`Found ${materialIssues.length} material issues`);
        // Track stock balances per material and godown
        const stockBalances = {};
        // Process purchase bills
        for (const bill of purchaseBills) {
            console.log(`Processing purchase bill: ${bill.invoiceNumber}`);
            for (const item of bill.items) {
                const materialId = item.materialId;
                const quantity = Number(item.quantity);
                const rate = Number(item.rate);
                // Initialize material balance if not exists
                if (!stockBalances[materialId]) {
                    stockBalances[materialId] = {};
                }
                if (bill.deliveredToType === 'GODOWN' && bill.deliveredToId) {
                    // Material delivered to godown - create IN transaction
                    const godownId = bill.deliveredToId;
                    // Initialize godown balance if not exists
                    if (!stockBalances[materialId][godownId]) {
                        stockBalances[materialId][godownId] = 0;
                    }
                    // Update balance
                    stockBalances[materialId][godownId] += quantity;
                    // Create IN transaction
                    await prisma.stockTransaction.create({
                        data: {
                            materialId: materialId,
                            godownId: godownId,
                            txType: 'IN',
                            referenceTable: 'purchase_bills',
                            referenceId: bill.id,
                            quantity: quantity,
                            rate: rate,
                            balanceAfter: stockBalances[materialId][godownId],
                            txDate: bill.billDate
                        }
                    });
                    console.log(`  - IN: ${quantity} units of material ${materialId} to godown ${godownId}`);
                }
                else if (bill.deliveredToType === 'SITE' && bill.deliveredToId) {
                    // Material delivered directly to site - create IN and immediate OUT transaction
                    const siteId = bill.deliveredToId;
                    // Create IN transaction (virtual - no godown)
                    await prisma.stockTransaction.create({
                        data: {
                            materialId: materialId,
                            txType: 'IN',
                            referenceTable: 'purchase_bills',
                            referenceId: bill.id,
                            quantity: quantity,
                            rate: rate,
                            balanceAfter: 0, // No balance in godown for direct-to-site
                            txDate: bill.billDate
                        }
                    });
                    // Create immediate OUT transaction to site
                    await prisma.stockTransaction.create({
                        data: {
                            materialId: materialId,
                            siteId: siteId,
                            txType: 'OUT',
                            referenceTable: 'purchase_bills',
                            referenceId: bill.id,
                            quantity: quantity,
                            rate: rate,
                            balanceAfter: 0, // No balance in godown for direct-to-site
                            txDate: bill.billDate
                        }
                    });
                    console.log(`  - IN+OUT: ${quantity} units of material ${materialId} directly to site ${siteId}`);
                }
            }
        }
        // Process material issues
        for (const issue of materialIssues) {
            console.log(`Processing material issue: ${issue.identifier}`);
            for (const item of issue.items) {
                const materialId = item.materialId;
                const quantity = Number(item.quantity);
                const rate = Number(item.rate);
                if (issue.fromGodownId) {
                    // Material issued from godown - create OUT transaction
                    const godownId = issue.fromGodownId;
                    // Check if we have balance for this material in this godown
                    if (!stockBalances[materialId] || !stockBalances[materialId][godownId]) {
                        console.log(`  - WARNING: No stock balance found for material ${materialId} in godown ${godownId}`);
                        stockBalances[materialId] = stockBalances[materialId] || {};
                        stockBalances[materialId][godownId] = 0;
                    }
                    // Update balance
                    stockBalances[materialId][godownId] -= quantity;
                    // Create OUT transaction
                    await prisma.stockTransaction.create({
                        data: {
                            materialId: materialId,
                            godownId: godownId,
                            siteId: issue.siteId,
                            txType: 'OUT',
                            referenceTable: 'material_issues',
                            referenceId: issue.id,
                            quantity: quantity,
                            rate: rate,
                            balanceAfter: stockBalances[materialId][godownId],
                            txDate: issue.issueDate
                        }
                    });
                    console.log(`  - OUT: ${quantity} units of material ${materialId} from godown ${godownId} to site ${issue.siteId}`);
                }
                else {
                    // Direct issue (no godown) - create OUT transaction
                    await prisma.stockTransaction.create({
                        data: {
                            materialId: materialId,
                            siteId: issue.siteId,
                            txType: 'OUT',
                            referenceTable: 'material_issues',
                            referenceId: issue.id,
                            quantity: quantity,
                            rate: rate,
                            balanceAfter: 0, // No godown balance for direct issues
                            txDate: issue.issueDate
                        }
                    });
                    console.log(`  - OUT: ${quantity} units of material ${materialId} directly to site ${issue.siteId}`);
                }
            }
        }
        // Display final stock balances
        console.log('\nFinal Stock Balances:');
        for (const materialId in stockBalances) {
            const material = await prisma.material.findUnique({
                where: { id: materialId }
            });
            console.log(`\nMaterial: ${material?.name || materialId}`);
            for (const godownId in stockBalances[materialId]) {
                const godown = await prisma.godown.findUnique({
                    where: { id: godownId }
                });
                const balance = stockBalances[materialId][godownId];
                console.log(`  ${godown?.name || godownId}: ${balance} units`);
            }
        }
        // Get total count of transactions created
        const transactionCount = await prisma.stockTransaction.count();
        console.log(`\nStock transactions population completed! Created ${transactionCount} transactions.`);
    }
    catch (error) {
        console.error('Error populating stock transactions:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
// Run the script
populateStockTransactions();
