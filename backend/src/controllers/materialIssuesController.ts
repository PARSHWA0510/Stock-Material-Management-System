import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { CreateMaterialIssueRequest } from '../types';

const prisma = new PrismaClient();

export const getAllMaterialIssues = async (req: Request, res: Response) => {
  try {
    const materialIssues = await prisma.materialIssue.findMany({
      include: {
        site: true,
        fromGodown: true,
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

    // Sort by issue date in descending order (latest first)
    materialIssues.sort((a, b) => {
      const dateA = new Date(a.issueDate).getTime();
      const dateB = new Date(b.issueDate).getTime();
      return dateB - dateA; // Descending order (newest first)
    });

    res.json(materialIssues);
  } catch (error) {
    console.error('Get material issues error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMaterialIssueById = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const materialIssue = await prisma.materialIssue.findUnique({
      where: { id },
      include: {
        site: true,
        fromGodown: true,
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

    if (!materialIssue) {
      return res.status(404).json({ message: 'Material issue not found' });
    }

    res.json(materialIssue);
  } catch (error) {
    console.error('Get material issue error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createMaterialIssue = async (req: Request<{}, any, CreateMaterialIssueRequest>, res: Response) => {
  try {
    const { siteId, fromGodownId, issueDate, items } = req.body;
    const createdById = (req as any).user.id;

    // Validate site exists
    const site = await prisma.site.findUnique({
      where: { id: siteId }
    });

    if (!site) {
      return res.status(400).json({ message: 'Site not found' });
    }

    // Validate godown exists if provided
    if (fromGodownId) {
      const godown = await prisma.godown.findUnique({
        where: { id: fromGodownId }
      });
      if (!godown) {
        return res.status(400).json({ message: 'Godown not found' });
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

    // Check stock availability for each material
    for (const item of items) {
      // Build where clause for stock transactions
      const whereClause: any = {
        materialId: item.materialId
      };
      
      // If fromGodownId is provided, filter by godownId
      // If not provided (direct issue), only get transactions without godownId
      if (fromGodownId) {
        whereClause.godownId = fromGodownId;
      } else {
        whereClause.godownId = null;
      }

      const stockTransactions = await prisma.stockTransaction.findMany({
        where: whereClause,
        orderBy: { createdAt: 'asc' }
      });

      let currentStock = 0;
      for (const tx of stockTransactions) {
        if (tx.txType === 'IN') {
          currentStock += Number(tx.quantity);
        } else {
          currentStock -= Number(tx.quantity);
        }
      }

      if (currentStock < Number(item.quantity)) {
        return res.status(400).json({ 
          message: `Insufficient stock for material ${materials.find(m => m.id === item.materialId)?.name}. Available: ${currentStock}, Required: ${item.quantity}` 
        });
      }
    }

    // Generate next identifier
    const lastIssue = await prisma.materialIssue.findFirst({
      orderBy: { identifier: 'desc' }
    });
    const nextIdentifier = lastIssue ? 
      `MI-${String(parseInt(lastIssue.identifier.split('-')[1]) + 1).padStart(3, '0')}` : 
      'MI-001';

    // Create material issue with items
    const materialIssue = await prisma.materialIssue.create({
      data: {
        identifier: nextIdentifier,
        siteId,
        fromGodownId,
        issueDate: new Date(issueDate),
        createdById,
        items: {
          create: items.map(item => ({
            materialId: item.materialId,
            quantity: item.quantity,
            unit: item.unit,
            rate: item.rate,
            totalExclGst: item.totalExclGst,
            gstPercent: item.gstPercent,
            totalInclGst: item.totalInclGst
          }))
        }
      },
      include: {
        site: true,
        fromGodown: true,
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
      await prisma.stockTransaction.create({
        data: {
          materialId: item.materialId,
          godownId: fromGodownId || null,
          siteId: siteId,
          txType: 'OUT',
          referenceTable: 'material_issues',
          referenceId: materialIssue.id,
          quantity: item.quantity,
          rate: item.rate,
          balanceAfter: 0, // Will be calculated by a service
          txDate: new Date(issueDate)
        }
      });
    }

    res.status(201).json(materialIssue);
  } catch (error) {
    console.error('Create material issue error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteMaterialIssue = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    // Only admin can delete material issues
    if (userRole !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admin can delete material issues' });
    }

    // Check if material issue exists
    const existingIssue = await prisma.materialIssue.findUnique({
      where: { id },
      include: {
        items: true
      }
    });

    if (!existingIssue) {
      return res.status(404).json({ message: 'Material issue not found' });
    }

    // Delete the material issue (items will be deleted due to cascade)
    await prisma.materialIssue.delete({
      where: { id }
    });

    res.json({ message: 'Material issue deleted successfully' });
  } catch (error) {
    console.error('Delete material issue error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
