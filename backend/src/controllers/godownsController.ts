import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { UpdateGodownRequest } from '../types';

const prisma = new PrismaClient();

export const getAllGodowns = async (req: Request, res: Response) => {
  try {
    const godowns = await prisma.godown.findMany();
    // Sort case-insensitively by name
    godowns.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    res.json(godowns);
  } catch (error) {
    console.error('Get godowns error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createGodown = async (req: Request, res: Response) => {
  try {
    const { name, address } = req.body;

    // Check if godown with same name already exists
    const existingGodown = await prisma.godown.findUnique({
      where: { name }
    });

    if (existingGodown) {
      return res.status(400).json({ message: 'Godown with this name already exists' });
    }

    const godown = await prisma.godown.create({
      data: { name, address }
    });

    res.status(201).json(godown);
  } catch (error) {
    console.error('Create godown error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateGodown = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const { name, address }: UpdateGodownRequest = req.body;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    // Only admin can update godowns
    if (userRole !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admin can update godowns' });
    }

    // Check if godown exists
    const existingGodown = await prisma.godown.findUnique({
      where: { id }
    });

    if (!existingGodown) {
      return res.status(404).json({ message: 'Godown not found' });
    }

    // Check if another godown with same name exists (excluding current one)
    if (name && name !== existingGodown.name) {
      const duplicateGodown = await prisma.godown.findUnique({
        where: { name }
      });

      if (duplicateGodown) {
        return res.status(400).json({ message: 'Godown with this name already exists' });
      }
    }

    const godown = await prisma.godown.update({
      where: { id },
      data: { name, address }
    });

    res.json(godown);
  } catch (error) {
    console.error('Update godown error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteGodown = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    // Only admin can delete godowns
    if (userRole !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admin can delete godowns' });
    }

    // Check if godown exists
    const existingGodown = await prisma.godown.findUnique({
      where: { id },
      include: {
        materialIssues: true,
        stockTransactions: true
      }
    });

    if (!existingGodown) {
      return res.status(404).json({ message: 'Godown not found' });
    }

    // Check if godown has associated material issues or stock transactions
    if (existingGodown.materialIssues.length > 0 || existingGodown.stockTransactions.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete godown with associated material issues or stock transactions' 
      });
    }

    await prisma.godown.delete({
      where: { id }
    });

    res.json({ message: 'Godown deleted successfully' });
  } catch (error) {
    console.error('Delete godown error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
