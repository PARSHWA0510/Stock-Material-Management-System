"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStockTransactions = exports.getInventory = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getInventory = async (req, res) => {
    try {
        const { godownId, materialId } = req.query;
        let whereClause = {};
        if (godownId) {
            whereClause.godownId = godownId;
        }
        if (materialId) {
            whereClause.materialId = materialId;
        }
        const stockTransactions = await prisma.stockTransaction.findMany({
            where: whereClause,
            include: {
                material: true,
                godown: true,
                site: true
            },
            orderBy: [
                { materialId: 'asc' },
                { godownId: 'asc' },
                { createdAt: 'asc' }
            ]
        });
        // Calculate current stock levels
        const stockLevels = {};
        for (const tx of stockTransactions) {
            const key = `${tx.materialId}-${tx.godownId || 'direct'}`;
            if (!stockLevels[key]) {
                stockLevels[key] = {
                    material: tx.material,
                    godown: tx.godown,
                    quantity: 0,
                    totalValue: 0,
                    lastUpdated: tx.createdAt
                };
            }
            if (tx.txType === 'IN') {
                stockLevels[key].quantity += Number(tx.quantity);
                stockLevels[key].totalValue += Number(tx.quantity) * Number(tx.rate);
            }
            else {
                stockLevels[key].quantity -= Number(tx.quantity);
                stockLevels[key].totalValue -= Number(tx.quantity) * Number(tx.rate);
            }
            if (tx.createdAt > stockLevels[key].lastUpdated) {
                stockLevels[key].lastUpdated = tx.createdAt;
            }
        }
        // Filter out zero quantities
        const filteredStockLevels = Object.values(stockLevels).filter((level) => level.quantity > 0);
        res.json(filteredStockLevels);
    }
    catch (error) {
        console.error('Get inventory error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getInventory = getInventory;
const getStockTransactions = async (req, res) => {
    try {
        const { materialId, godownId, siteId, txType, limit = '50', offset = '0' } = req.query;
        let whereClause = {};
        if (materialId)
            whereClause.materialId = materialId;
        if (godownId)
            whereClause.godownId = godownId;
        if (siteId)
            whereClause.siteId = siteId;
        if (txType)
            whereClause.txType = txType;
        const transactions = await prisma.stockTransaction.findMany({
            where: whereClause,
            include: {
                material: true,
                godown: true,
                site: true
            },
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit),
            skip: parseInt(offset)
        });
        res.json(transactions);
    }
    catch (error) {
        console.error('Get stock transactions error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getStockTransactions = getStockTransactions;
