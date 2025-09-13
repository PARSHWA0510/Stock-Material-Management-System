import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { UpdateCompanyRequest } from '../types';

const prisma = new PrismaClient();

export const getAllCompanies = async (req: Request, res: Response) => {
  try {
    const companies = await prisma.company.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(companies);
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createCompany = async (req: Request, res: Response) => {
  try {
    const { name, gstin, address } = req.body;

    // Check if company with same name already exists
    const existingCompany = await prisma.company.findUnique({
      where: { name }
    });

    if (existingCompany) {
      return res.status(400).json({ message: 'Company with this name already exists' });
    }

    const company = await prisma.company.create({
      data: { name, gstin, address }
    });

    res.status(201).json(company);
  } catch (error) {
    console.error('Create company error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateCompany = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const { name, gstin, address }: UpdateCompanyRequest = req.body;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    // Only admin can update companies
    if (userRole !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admin can update companies' });
    }

    // Check if company exists
    const existingCompany = await prisma.company.findUnique({
      where: { id }
    });

    if (!existingCompany) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Check if another company with same name exists (excluding current one)
    if (name && name !== existingCompany.name) {
      const duplicateCompany = await prisma.company.findUnique({
        where: { name }
      });

      if (duplicateCompany) {
        return res.status(400).json({ message: 'Company with this name already exists' });
      }
    }

    const company = await prisma.company.update({
      where: { id },
      data: { name, gstin, address }
    });

    res.json(company);
  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteCompany = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    // Only admin can delete companies
    if (userRole !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admin can delete companies' });
    }

    // Check if company exists
    const existingCompany = await prisma.company.findUnique({
      where: { id },
      include: {
        purchaseBills: true
      }
    });

    if (!existingCompany) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Check if company has associated purchase bills
    if (existingCompany.purchaseBills.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete company with associated purchase bills' 
      });
    }

    await prisma.company.delete({
      where: { id }
    });

    res.json({ message: 'Company deleted successfully' });
  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
