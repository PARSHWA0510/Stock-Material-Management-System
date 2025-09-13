"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePurchaseBill = exports.createPurchaseBill = exports.getPurchaseBillById = exports.getAllPurchaseBills = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getAllPurchaseBills = async (req, res) => {
    try {
        const purchaseBills = await prisma.purchaseBill.findMany({
            include: {
                company: true,
                createdBy: {
                    select: { id: true, name: true, email: true }
                },
                items: {
                    include: {
                        material: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(purchaseBills);
    }
    catch (error) {
        console.error('Get purchase bills error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getAllPurchaseBills = getAllPurchaseBills;
const getPurchaseBillById = async (req, res) => {
    try {
        const { id } = req.params;
        const purchaseBill = await prisma.purchaseBill.findUnique({
            where: { id },
            include: {
                company: true,
                createdBy: {
                    select: { id: true, name: true, email: true }
                },
                items: {
                    include: {
                        material: true
                    }
                }
            }
        });
        if (!purchaseBill) {
            return res.status(404).json({ message: 'Purchase bill not found' });
        }
        res.json(purchaseBill);
    }
    catch (error) {
        console.error('Get purchase bill error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getPurchaseBillById = getPurchaseBillById;
const createPurchaseBill = async (req, res) => {
    try {
        const { companyId, invoiceNumber, gstinNumber, billDate, deliveredToType, deliveredToId, items } = req.body;
        const createdById = req.user.id;
        // Validate company exists
        const company = await prisma.company.findUnique({
            where: { id: companyId }
        });
        if (!company) {
            return res.status(400).json({ message: 'Company not found' });
        }
        // Validate delivered to location exists
        if (deliveredToType === 'GODOWN') {
            const godown = await prisma.godown.findUnique({
                where: { id: deliveredToId }
            });
            if (!godown) {
                return res.status(400).json({ message: 'Godown not found' });
            }
        }
        else if (deliveredToType === 'SITE') {
            const site = await prisma.site.findUnique({
                where: { id: deliveredToId }
            });
            if (!site) {
                return res.status(400).json({ message: 'Site not found' });
            }
        }
        // Validate materials exist
        const materialIds = items.map(item => item.materialId);
        const materials = await prisma.material.findMany({
            where: { id: { in: materialIds } }
        });
        if (materials.length !== materialIds.length) {
            return res.status(400).json({ message: 'One or more materials not found' });
        }
        // Create purchase bill with items
        const purchaseBill = await prisma.purchaseBill.create({
            data: {
                companyId,
                invoiceNumber,
                gstinNumber,
                billDate: new Date(billDate),
                deliveredToType,
                deliveredToId,
                createdById,
                items: {
                    create: items.map(item => ({
                        materialId: item.materialId,
                        quantity: item.quantity,
                        unit: item.unit,
                        rate: item.rate,
                        gstPercent: item.gstPercent,
                        totalExclGst: item.totalExclGst,
                        totalInclGst: item.totalInclGst,
                        locationInGodown: item.locationInGodown
                    }))
                }
            },
            include: {
                company: true,
                createdBy: {
                    select: { id: true, name: true, email: true }
                },
                items: {
                    include: {
                        material: true
                    }
                }
            }
        });
        // Create stock transactions
        for (const item of items) {
            // IN transaction
            await prisma.stockTransaction.create({
                data: {
                    materialId: item.materialId,
                    godownId: deliveredToType === 'GODOWN' ? deliveredToId : null,
                    siteId: deliveredToType === 'SITE' ? deliveredToId : null,
                    txType: 'IN',
                    referenceTable: 'purchase_bills',
                    referenceId: purchaseBill.id,
                    quantity: item.quantity,
                    rate: item.rate,
                    balanceAfter: 0, // Will be calculated by a service
                    txDate: new Date(billDate)
                }
            });
            // If delivered to site, create immediate OUT transaction
            if (deliveredToType === 'SITE') {
                await prisma.stockTransaction.create({
                    data: {
                        materialId: item.materialId,
                        godownId: null,
                        siteId: deliveredToId,
                        txType: 'OUT',
                        referenceTable: 'purchase_bills',
                        referenceId: purchaseBill.id,
                        quantity: item.quantity,
                        rate: item.rate,
                        balanceAfter: 0, // Will be calculated by a service
                        txDate: new Date(billDate)
                    }
                });
            }
        }
        res.status(201).json(purchaseBill);
    }
    catch (error) {
        console.error('Create purchase bill error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.createPurchaseBill = createPurchaseBill;
const deletePurchaseBill = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;
        // Check if purchase bill exists
        const purchaseBill = await prisma.purchaseBill.findUnique({
            where: { id },
            include: { items: true }
        });
        if (!purchaseBill) {
            return res.status(404).json({ message: 'Purchase bill not found' });
        }
        // Only admin can delete purchase bills
        if (userRole !== 'ADMIN') {
            return res.status(403).json({ message: 'Only admin can delete purchase bills' });
        }
        // Delete related stock transactions first
        await prisma.stockTransaction.deleteMany({
            where: {
                referenceTable: 'purchase_bills',
                referenceId: id
            }
        });
        // Delete purchase bill items
        await prisma.purchaseBillItem.deleteMany({
            where: { purchaseBillId: id }
        });
        // Delete purchase bill
        await prisma.purchaseBill.delete({
            where: { id }
        });
        res.json({ message: 'Purchase bill deleted successfully' });
    }
    catch (error) {
        console.error('Delete purchase bill error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.deletePurchaseBill = deletePurchaseBill;
//# sourceMappingURL=purchaseBillsController.js.map