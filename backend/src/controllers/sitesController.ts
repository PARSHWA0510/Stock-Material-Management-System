import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { UpdateSiteRequest } from '../types';

const prisma = new PrismaClient();

export const getAllSites = async (req: Request, res: Response) => {
  try {
    const sites = await prisma.site.findMany();
    // Sort case-insensitively by name
    sites.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    res.json(sites);
  } catch (error) {
    console.error('Get sites error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createSite = async (req: Request, res: Response) => {
  try {
    const { name, address } = req.body;

    // Check if site with same name already exists
    const existingSite = await prisma.site.findUnique({
      where: { name }
    });

    if (existingSite) {
      return res.status(400).json({ message: 'Site with this name already exists' });
    }

    const site = await prisma.site.create({
      data: { name, address }
    });

    res.status(201).json(site);
  } catch (error) {
    console.error('Create site error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateSite = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const { name, address }: UpdateSiteRequest = req.body;

    // Check if site exists
    const existingSite = await prisma.site.findUnique({
      where: { id }
    });

    if (!existingSite) {
      return res.status(404).json({ message: 'Site not found' });
    }

    // Check if another site with same name exists (excluding current one)
    if (name && name !== existingSite.name) {
      const duplicateSite = await prisma.site.findUnique({
        where: { name }
      });

      if (duplicateSite) {
        return res.status(400).json({ message: 'Site with this name already exists' });
      }
    }

    const site = await prisma.site.update({
      where: { id },
      data: { name, address }
    });

    res.json(site);
  } catch (error) {
    console.error('Update site error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteSite = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    // Only admin can delete sites
    if (userRole !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admin can delete sites' });
    }

    // Check if site exists
    const existingSite = await prisma.site.findUnique({
      where: { id },
      include: {
        materialIssues: true
      }
    });

    if (!existingSite) {
      return res.status(404).json({ message: 'Site not found' });
    }

    // Check if site has associated material issues
    if (existingSite.materialIssues.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete site with associated material issues' 
      });
    }

    // Check if site has associated purchase bills (delivered to this site)
    const purchaseBillsToSite = await prisma.purchaseBill.findMany({
      where: {
        deliveredToType: 'SITE',
        deliveredToId: id
      }
    });

    if (purchaseBillsToSite.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete site with associated purchase bills' 
      });
    }

    await prisma.site.delete({
      where: { id }
    });

    res.json({ message: 'Site deleted successfully' });
  } catch (error) {
    console.error('Delete site error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
