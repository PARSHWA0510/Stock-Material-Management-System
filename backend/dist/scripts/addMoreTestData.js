"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function addMoreTestData() {
    try {
        console.log('Adding more test data...\n');
        // Get existing data
        const materials = await prisma.material.findMany();
        const godowns = await prisma.godown.findMany();
        const sites = await prisma.site.findMany();
        const companies = await prisma.company.findMany();
        const users = await prisma.user.findMany();
        console.log(`Found ${materials.length} materials, ${godowns.length} godowns, ${sites.length} sites`);
        // Add more purchase bills with different scenarios
        const additionalBills = [
            {
                companyId: companies[0].id,
                invoiceNumber: 'INV-003-2024',
                gstinNumber: 'GST123456789',
                billDate: new Date('2024-02-15'),
                deliveredToType: 'GODOWN',
                deliveredToId: godowns[0].id, // Anand godown
                createdById: users[0].id,
                items: [
                    {
                        materialId: materials[0].id, // Cement
                        quantity: 200,
                        unit: 'bag',
                        rate: 450,
                        gstPercent: 18,
                        totalExclGst: 90000,
                        totalInclGst: 106200
                    },
                    {
                        materialId: materials[1].id, // Steel Rod
                        quantity: 100,
                        unit: 'meter',
                        rate: 85,
                        gstPercent: 18,
                        totalExclGst: 8500,
                        totalInclGst: 10030
                    }
                ]
            },
            {
                companyId: companies[1].id,
                invoiceNumber: 'INV-004-2024',
                gstinNumber: 'GST987654321',
                billDate: new Date('2024-03-10'),
                deliveredToType: 'SITE',
                deliveredToId: sites[1].id, // Mumbai Site
                createdById: users[1].id,
                items: [
                    {
                        materialId: materials[2].id, // Cable
                        quantity: 500,
                        unit: 'meter',
                        rate: 30,
                        gstPercent: 18,
                        totalExclGst: 15000,
                        totalInclGst: 17700
                    }
                ]
            },
            {
                companyId: companies[0].id,
                invoiceNumber: 'INV-005-2024',
                gstinNumber: 'GST123456789',
                billDate: new Date('2024-04-05'),
                deliveredToType: 'GODOWN',
                deliveredToId: godowns[1].id, // Vadodara godown
                createdById: users[0].id,
                items: [
                    {
                        materialId: materials[0].id, // Cement
                        quantity: 150,
                        unit: 'bag',
                        rate: 420,
                        gstPercent: 18,
                        totalExclGst: 63000,
                        totalInclGst: 74340
                    },
                    {
                        materialId: materials[1].id, // Steel Rod
                        quantity: 200,
                        unit: 'meter',
                        rate: 90,
                        gstPercent: 18,
                        totalExclGst: 18000,
                        totalInclGst: 21240
                    }
                ]
            }
        ];
        // Create purchase bills
        for (const billData of additionalBills) {
            const { items, ...billInfo } = billData;
            const bill = await prisma.purchaseBill.create({
                data: {
                    ...billInfo,
                    items: {
                        create: items
                    }
                }
            });
            console.log(`Created purchase bill: ${bill.invoiceNumber}`);
            // Create stock transactions for this bill
            for (const item of items) {
                if (billData.deliveredToType === 'GODOWN') {
                    // IN transaction to godown
                    await prisma.stockTransaction.create({
                        data: {
                            materialId: item.materialId,
                            godownId: billData.deliveredToId,
                            txType: 'IN',
                            referenceTable: 'purchase_bills',
                            referenceId: bill.id,
                            quantity: item.quantity,
                            rate: item.rate,
                            balanceAfter: 0, // Will be calculated properly in real scenario
                            txDate: billData.billDate
                        }
                    });
                }
                else {
                    // Direct to site - IN and OUT transactions
                    await prisma.stockTransaction.create({
                        data: {
                            materialId: item.materialId,
                            txType: 'IN',
                            referenceTable: 'purchase_bills',
                            referenceId: bill.id,
                            quantity: item.quantity,
                            rate: item.rate,
                            balanceAfter: 0,
                            txDate: billData.billDate
                        }
                    });
                    await prisma.stockTransaction.create({
                        data: {
                            materialId: item.materialId,
                            siteId: billData.deliveredToId,
                            txType: 'OUT',
                            referenceTable: 'purchase_bills',
                            referenceId: bill.id,
                            quantity: item.quantity,
                            rate: item.rate,
                            balanceAfter: 0,
                            txDate: billData.billDate
                        }
                    });
                }
            }
        }
        // Add more material issues
        const additionalIssues = [
            {
                identifier: 'MI-003-2024',
                issueDate: new Date('2024-02-20'),
                siteId: sites[0].id, // Dahej Site
                fromGodownId: godowns[0].id, // Anand godown
                createdById: users[1].id,
                items: [
                    {
                        materialId: materials[0].id, // Cement
                        quantity: 50,
                        unit: 'bag',
                        rate: 450,
                        gstPercent: 18,
                        totalExclGst: 22500,
                        totalInclGst: 26550
                    }
                ]
            },
            {
                identifier: 'MI-004-2024',
                issueDate: new Date('2024-03-15'),
                siteId: sites[1].id, // Mumbai Site
                fromGodownId: godowns[1].id, // Vadodara godown
                createdById: users[0].id,
                items: [
                    {
                        materialId: materials[0].id, // Cement
                        quantity: 30,
                        unit: 'bag',
                        rate: 420,
                        gstPercent: 18,
                        totalExclGst: 12600,
                        totalInclGst: 14868
                    },
                    {
                        materialId: materials[1].id, // Steel Rod
                        quantity: 25,
                        unit: 'meter',
                        rate: 90,
                        gstPercent: 18,
                        totalExclGst: 2250,
                        totalInclGst: 2655
                    }
                ]
            }
        ];
        // Create material issues
        for (const issueData of additionalIssues) {
            const { items, ...issueInfo } = issueData;
            const issue = await prisma.materialIssue.create({
                data: {
                    ...issueInfo,
                    items: {
                        create: items
                    }
                }
            });
            console.log(`Created material issue: ${issue.identifier}`);
            // Create stock transactions for this issue
            for (const item of items) {
                await prisma.stockTransaction.create({
                    data: {
                        materialId: item.materialId,
                        godownId: issueData.fromGodownId,
                        siteId: issueData.siteId,
                        txType: 'OUT',
                        referenceTable: 'material_issues',
                        referenceId: issue.id,
                        quantity: item.quantity,
                        rate: item.rate,
                        balanceAfter: 0, // Will be calculated properly in real scenario
                        txDate: issueData.issueDate
                    }
                });
            }
        }
        console.log('\nAdditional test data added successfully!');
        console.log('You can now test material issuing with real stock data.');
    }
    catch (error) {
        console.error('Error adding test data:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
addMoreTestData();
//# sourceMappingURL=addMoreTestData.js.map