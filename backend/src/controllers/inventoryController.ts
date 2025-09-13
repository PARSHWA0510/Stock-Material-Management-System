import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getInventory = async (req: Request, res: Response) => {
  try {
    const { godownId, materialId } = req.query;

    let whereClause: any = {};
    if (godownId) {
      whereClause.godownId = godownId as string;
    }
    if (materialId) {
      whereClause.materialId = materialId as string;
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
    const stockLevels: any = {};
    
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
      } else {
        stockLevels[key].quantity -= Number(tx.quantity);
        stockLevels[key].totalValue -= Number(tx.quantity) * Number(tx.rate);
      }

      if (tx.createdAt > stockLevels[key].lastUpdated) {
        stockLevels[key].lastUpdated = tx.createdAt;
      }
    }

    // Filter out zero quantities
    const filteredStockLevels = Object.values(stockLevels).filter((level: any) => level.quantity > 0);

    res.json(filteredStockLevels);
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getStockTransactions = async (req: Request, res: Response) => {
  try {
    const { materialId, godownId, siteId, txType, limit = '50', offset = '0' } = req.query;

    let whereClause: any = {};
    if (materialId) whereClause.materialId = materialId as string;
    if (godownId) whereClause.godownId = godownId as string;
    if (siteId) whereClause.siteId = siteId as string;
    if (txType) whereClause.txType = txType as string;

    const transactions = await prisma.stockTransaction.findMany({
      where: whereClause,
      include: {
        material: true,
        godown: true,
        site: true
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    res.json(transactions);
  } catch (error) {
    console.error('Get stock transactions error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
