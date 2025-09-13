"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function testReports() {
    try {
        console.log('🧪 Testing Reports API Logic...\n');
        // Test site-wise material reports
        console.log('📊 Site-wise Material Reports:');
        console.log('==============================\n');
        const sites = await prisma.site.findMany({
            include: {
                materialIssues: {
                    include: {
                        items: {
                            include: {
                                material: true
                            }
                        }
                    }
                }
            },
            orderBy: { name: 'asc' }
        });
        for (const site of sites) {
            console.log(`🏗️ Site: ${site.name}`);
            console.log(`   Address: ${site.address || 'N/A'}`);
            const materialSummary = {};
            // Process material issues
            for (const issue of site.materialIssues) {
                for (const item of issue.items) {
                    const materialId = item.materialId;
                    const materialName = item.material.name;
                    const unit = item.material.unit;
                    if (!materialSummary[materialId]) {
                        materialSummary[materialId] = {
                            materialId,
                            materialName,
                            unit,
                            totalQuantity: 0,
                            totalValue: 0
                        };
                    }
                    const quantity = Number(item.quantity);
                    const rate = Number(item.rate);
                    const totalValue = quantity * rate;
                    materialSummary[materialId].totalQuantity += quantity;
                    materialSummary[materialId].totalValue += totalValue;
                }
            }
            // Process direct-to-site purchases
            const directPurchases = await prisma.purchaseBill.findMany({
                where: {
                    deliveredToType: 'SITE',
                    deliveredToId: site.id
                },
                include: {
                    items: {
                        include: {
                            material: true
                        }
                    }
                }
            });
            for (const purchase of directPurchases) {
                for (const item of purchase.items) {
                    const materialId = item.materialId;
                    const materialName = item.material.name;
                    const unit = item.material.unit;
                    if (!materialSummary[materialId]) {
                        materialSummary[materialId] = {
                            materialId,
                            materialName,
                            unit,
                            totalQuantity: 0,
                            totalValue: 0
                        };
                    }
                    const quantity = Number(item.quantity);
                    const rate = Number(item.rate);
                    const totalValue = quantity * rate;
                    materialSummary[materialId].totalQuantity += quantity;
                    materialSummary[materialId].totalValue += totalValue;
                }
            }
            const materials = Object.values(materialSummary);
            const grandTotal = materials.reduce((sum, material) => sum + material.totalValue, 0);
            if (materials.length === 0) {
                console.log('   No materials sent to this site');
            }
            else {
                console.log(`   Total Materials: ${materials.length}`);
                console.log(`   Total Value: ₹${grandTotal.toFixed(2)}`);
                console.log('   Materials:');
                materials.forEach((material) => {
                    console.log(`     - ${material.materialName}: ${material.totalQuantity} ${material.unit} (₹${material.totalValue.toFixed(2)})`);
                });
            }
            console.log('');
        }
        // Test specific site report
        if (sites.length > 0) {
            const firstSite = sites[0];
            console.log(`🔍 Detailed Report for: ${firstSite.name}`);
            console.log('=====================================\n');
            const materialIssues = await prisma.materialIssue.findMany({
                where: { siteId: firstSite.id },
                include: {
                    items: {
                        include: {
                            material: true
                        }
                    },
                    fromGodown: true
                },
                orderBy: { issueDate: 'desc' }
            });
            console.log(`Material Issues (${materialIssues.length}):`);
            materialIssues.forEach((issue, index) => {
                console.log(`  ${index + 1}. Issue #${issue.identifier} - ${issue.issueDate.toISOString().split('T')[0]}`);
                console.log(`     From: ${issue.fromGodown?.name || 'Direct'}`);
                issue.items.forEach(item => {
                    console.log(`     - ${item.material.name}: ${item.quantity} ${item.material.unit} @ ₹${item.rate}`);
                });
            });
            const directPurchases = await prisma.purchaseBill.findMany({
                where: {
                    deliveredToType: 'SITE',
                    deliveredToId: firstSite.id
                },
                include: {
                    items: {
                        include: {
                            material: true
                        }
                    },
                    company: true
                },
                orderBy: { billDate: 'desc' }
            });
            console.log(`\nDirect Purchases (${directPurchases.length}):`);
            directPurchases.forEach((purchase, index) => {
                console.log(`  ${index + 1}. Bill #${purchase.invoiceNumber} - ${purchase.billDate.toISOString().split('T')[0]}`);
                console.log(`     Company: ${purchase.company.name}`);
                purchase.items.forEach(item => {
                    console.log(`     - ${item.material.name}: ${item.quantity} ${item.material.unit} @ ₹${item.rate}`);
                });
            });
        }
        console.log('\n✅ Reports API logic test completed!');
    }
    catch (error) {
        console.error('❌ Error testing reports:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
testReports();
//# sourceMappingURL=testReports.js.map