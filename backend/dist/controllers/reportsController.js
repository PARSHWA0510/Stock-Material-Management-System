"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSiteMaterialHistory = exports.getSiteMaterialReports = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Get site-wise material reports
const getSiteMaterialReports = async (req, res) => {
    try {
        const { site_id } = req.query;
        // If specific site_id is provided, get data for that site only
        if (site_id) {
            const site = await prisma.site.findUnique({
                where: { id: site_id },
                include: {
                    materialIssues: {
                        include: {
                            items: {
                                include: {
                                    material: true
                                }
                            },
                            fromGodown: true
                        },
                        orderBy: { issueDate: 'desc' }
                    }
                }
            });
            if (!site) {
                return res.status(404).json({ error: 'Site not found' });
            }
            // Calculate total materials and costs for this site
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
                            totalValue: 0,
                            issues: []
                        };
                    }
                    const quantity = Number(item.quantity);
                    const rate = Number(item.rate);
                    const totalValue = quantity * rate;
                    materialSummary[materialId].totalQuantity += quantity;
                    materialSummary[materialId].totalValue += totalValue;
                    materialSummary[materialId].issues.push({
                        issueId: issue.id,
                        issueDate: issue.issueDate,
                        quantity,
                        rate,
                        totalValue,
                        fromGodown: issue.fromGodown?.name || 'Direct'
                    });
                }
            }
            // Process direct-to-site purchases
            const directPurchases = await prisma.purchaseBill.findMany({
                where: {
                    deliveredToType: 'SITE',
                    deliveredToId: site_id
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
                            totalValue: 0,
                            issues: []
                        };
                    }
                    const quantity = Number(item.quantity);
                    const rate = Number(item.rate);
                    const totalValue = quantity * rate;
                    materialSummary[materialId].totalQuantity += quantity;
                    materialSummary[materialId].totalValue += totalValue;
                    materialSummary[materialId].issues.push({
                        issueId: purchase.id,
                        issueDate: purchase.billDate,
                        quantity,
                        rate,
                        totalValue,
                        fromGodown: 'Direct Purchase',
                        isDirectPurchase: true
                    });
                }
            }
            const materials = Object.values(materialSummary);
            const grandTotal = materials.reduce((sum, material) => sum + material.totalValue, 0);
            return res.json({
                site: {
                    id: site.id,
                    name: site.name,
                    address: site.address
                },
                materials,
                grandTotal,
                totalMaterials: materials.length
            });
        }
        // Get all sites with their material summaries
        const sites = await prisma.site.findMany({
            include: {
                materialIssues: {
                    include: {
                        items: {
                            include: {
                                material: true
                            }
                        },
                        fromGodown: true
                    }
                }
            },
            orderBy: { name: 'asc' }
        });
        const siteReports = [];
        for (const site of sites) {
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
            siteReports.push({
                site: {
                    id: site.id,
                    name: site.name,
                    address: site.address
                },
                materials,
                grandTotal,
                totalMaterials: materials.length
            });
        }
        // Calculate overall summary
        const overallTotal = siteReports.reduce((sum, report) => sum + report.grandTotal, 0);
        const totalSites = siteReports.length;
        return res.json({
            siteReports,
            summary: {
                totalSites,
                overallTotal,
                totalMaterials: siteReports.reduce((sum, report) => sum + report.totalMaterials, 0)
            }
        });
    }
    catch (error) {
        console.error('Error fetching site material reports:', error);
        res.status(500).json({ error: 'Failed to fetch site material reports' });
    }
};
exports.getSiteMaterialReports = getSiteMaterialReports;
// Get detailed material history for a specific site and material
const getSiteMaterialHistory = async (req, res) => {
    try {
        const { site_id, material_id } = req.params;
        const site = await prisma.site.findUnique({
            where: { id: site_id }
        });
        if (!site) {
            return res.status(404).json({ error: 'Site not found' });
        }
        const material = await prisma.material.findUnique({
            where: { id: material_id }
        });
        if (!material) {
            return res.status(404).json({ error: 'Material not found' });
        }
        // Get material issues for this site and material
        const materialIssues = await prisma.materialIssue.findMany({
            where: {
                siteId: site_id,
                items: {
                    some: {
                        materialId: material_id
                    }
                }
            },
            include: {
                items: {
                    where: { materialId: material_id },
                    include: {
                        material: true
                    }
                },
                fromGodown: true
            },
            orderBy: { issueDate: 'desc' }
        });
        // Get direct purchases for this site and material
        const directPurchases = await prisma.purchaseBill.findMany({
            where: {
                deliveredToType: 'SITE',
                deliveredToId: site_id,
                items: {
                    some: {
                        materialId: material_id
                    }
                }
            },
            include: {
                items: {
                    where: { materialId: material_id },
                    include: {
                        material: true
                    }
                },
                company: true
            },
            orderBy: { billDate: 'desc' }
        });
        const history = [];
        // Process material issues
        for (const issue of materialIssues) {
            for (const item of issue.items) {
                history.push({
                    type: 'ISSUE',
                    date: issue.issueDate,
                    quantity: Number(item.quantity),
                    rate: Number(item.rate),
                    totalValue: Number(item.quantity) * Number(item.rate),
                    fromGodown: issue.fromGodown?.name || 'Direct',
                    reference: `Issue #${issue.identifier}`,
                    issueId: issue.id
                });
            }
        }
        // Process direct purchases
        for (const purchase of directPurchases) {
            for (const item of purchase.items) {
                history.push({
                    type: 'DIRECT_PURCHASE',
                    date: purchase.billDate,
                    quantity: Number(item.quantity),
                    rate: Number(item.rate),
                    totalValue: Number(item.quantity) * Number(item.rate),
                    fromGodown: 'Direct Purchase',
                    reference: `Bill #${purchase.invoiceNumber}`,
                    company: purchase.company.name,
                    purchaseId: purchase.id
                });
            }
        }
        // Sort by date (newest first)
        history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        // Calculate totals
        const totalQuantity = history.reduce((sum, item) => sum + item.quantity, 0);
        const totalValue = history.reduce((sum, item) => sum + item.totalValue, 0);
        return res.json({
            site: {
                id: site.id,
                name: site.name,
                address: site.address
            },
            material: {
                id: material.id,
                name: material.name,
                unit: material.unit
            },
            history,
            totals: {
                totalQuantity,
                totalValue
            }
        });
    }
    catch (error) {
        console.error('Error fetching site material history:', error);
        res.status(500).json({ error: 'Failed to fetch site material history' });
    }
};
exports.getSiteMaterialHistory = getSiteMaterialHistory;
