import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Material } from '../types';

const prisma = new PrismaClient();

export const getAllMaterials = async (req: Request, res: Response) => {
  try {
    const materials = await prisma.material.findMany();
    // Sort case-insensitively by name
    materials.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    res.json(materials);
  } catch (error) {
    console.error('Get materials error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMaterialById = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const material = await prisma.material.findUnique({
      where: { id }
    });

    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    res.json(material);
  } catch (error) {
    console.error('Get material error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createMaterial = async (req: Request<{}, Material, Omit<Material, 'id' | 'createdAt' | 'updatedAt'>>, res: Response) => {
  try {
    const { name, unit, hsnSac } = req.body;

    // Check if material with same name already exists
    const existingMaterial = await prisma.material.findUnique({
      where: { name }
    });

    if (existingMaterial) {
      return res.status(400).json({ message: 'Material with this name already exists' });
    }

    const material = await prisma.material.create({
      data: { name, unit, hsnSac }
    });

    res.status(201).json(material);
  } catch (error) {
    console.error('Create material error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateMaterial = async (req: Request<{ id: string }, Material, Partial<Omit<Material, 'id' | 'createdAt' | 'updatedAt'>>>, res: Response) => {
  try {
    const { id } = req.params;
    const { name, unit, hsnSac } = req.body;

    // Check if material exists
    const existingMaterial = await prisma.material.findUnique({
      where: { id }
    });

    if (!existingMaterial) {
      return res.status(404).json({ message: 'Material not found' });
    }

    // Check if new name conflicts with existing material
    if (name && name !== existingMaterial.name) {
      const nameConflict = await prisma.material.findUnique({
        where: { name }
      });

      if (nameConflict) {
        return res.status(400).json({ message: 'Material with this name already exists' });
      }
    }

    const material = await prisma.material.update({
      where: { id },
      data: { name, unit, hsnSac }
    });

    res.json(material);
  } catch (error) {
    console.error('Update material error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteMaterial = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;

    // Check if material exists
    const existingMaterial = await prisma.material.findUnique({
      where: { id }
    });

    if (!existingMaterial) {
      return res.status(404).json({ message: 'Material not found' });
    }

    // Check if material is used in any transactions
    const usageCount = await prisma.purchaseBillItem.count({
      where: { materialId: id }
    }) + await prisma.materialIssueItem.count({
      where: { materialId: id }
    });

    if (usageCount > 0) {
      return res.status(400).json({ message: 'Cannot delete material that is used in transactions' });
    }

    await prisma.material.delete({
      where: { id }
    });

    res.json({ message: 'Material deleted successfully' });
  } catch (error) {
    console.error('Delete material error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const bulkCreateMaterials = async (req: Request, res: Response) => {
  try {
    const { materials } = req.body;

    if (!Array.isArray(materials) || materials.length === 0) {
      return res.status(400).json({ message: 'Materials array is required and must not be empty' });
    }

    // Validate all materials first
    const errors: Array<{ name: string; error: string }> = [];
    const materialsToCreate: Array<{ name: string; unit: string; hsnSac: string | null }> = [];

    for (const materialData of materials) {
      const { name, unit, hsnSac } = materialData;

      if (!name || typeof name !== 'string' || name.trim() === '') {
        errors.push({ name: name || 'Unknown', error: 'Name is required' });
        continue;
      }

      if (!unit || typeof unit !== 'string' || unit.trim() === '') {
        errors.push({ name: name.trim() || 'Unknown', error: 'Unit is required' });
        continue;
      }

      const trimmedName = name.trim();
      const trimmedUnit = unit.trim();
      const trimmedHsnSac = hsnSac?.trim() || null;

      // Check if material with same name already exists
      const existingMaterial = await prisma.material.findUnique({
        where: { name: trimmedName }
      });

      if (existingMaterial) {
        errors.push({ name: trimmedName, error: 'Material with this name already exists' });
        continue;
      }

      materialsToCreate.push({
        name: trimmedName,
        unit: trimmedUnit,
        hsnSac: trimmedHsnSac
      });
    }

    // If there are any errors, return them without creating anything (all-or-nothing)
    if (errors.length > 0) {
      return res.status(400).json({
        message: `Validation failed: ${errors.length} error(s) found. No materials were created.`,
        results: {
          created: [],
          skipped: [],
          errors
        }
      });
    }

    // All validations passed, create all materials in a transaction
    const createdMaterials = await prisma.$transaction(
      materialsToCreate.map(materialData =>
        prisma.material.create({
          data: materialData
        })
      )
    );

    res.status(201).json({
      message: `Successfully created ${createdMaterials.length} materials`,
      results: {
        created: createdMaterials,
        skipped: [],
        errors: []
      }
    });
  } catch (error: any) {
    console.error('Bulk create materials error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      results: {
        created: [],
        skipped: [],
        errors: [{ name: 'System', error: error.message || 'Unknown error' }]
      }
    });
  }
};
