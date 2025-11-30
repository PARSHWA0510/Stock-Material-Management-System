import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { UpdateCompanyRequest } from '../types';

const prisma = new PrismaClient();

export const getAllCompanies = async (req: Request, res: Response) => {
  try {
    const companies = await prisma.company.findMany();
    // Sort case-insensitively by name
    companies.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    res.json(companies);
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createCompany = async (req: Request, res: Response) => {
  try {
    const { name, gstin, address, contactPerson, mobileNumber, emailId } = req.body;

    // Check if company with same name already exists
    const existingCompany = await prisma.company.findUnique({
      where: { name }
    });

    if (existingCompany) {
      return res.status(400).json({ message: 'Company with this name already exists' });
    }

    const company = await prisma.company.create({
      data: { 
        name, 
        gstin: gstin || null, 
        address: address || null,
        contactPerson: contactPerson || null,
        mobileNumber: mobileNumber || null,
        emailId: emailId || null
      }
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
    const { name, gstin, address, contactPerson, mobileNumber, emailId }: UpdateCompanyRequest = req.body;

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
      data: { 
        name, 
        gstin: gstin !== undefined ? gstin : undefined, 
        address: address !== undefined ? address : undefined,
        contactPerson: contactPerson !== undefined ? contactPerson : undefined,
        mobileNumber: mobileNumber !== undefined ? mobileNumber : undefined,
        emailId: emailId !== undefined ? emailId : undefined
      }
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

export const bulkCreateCompanies = async (req: Request, res: Response) => {
  try {
    const { companies } = req.body;

    if (!Array.isArray(companies) || companies.length === 0) {
      return res.status(400).json({ message: 'Companies array is required and must not be empty' });
    }

    // Validate all companies first
    const errors: Array<{ name: string; error: string }> = [];
    const companiesToCreate: Array<{ 
      name: string; 
      gstin: string | null; 
      address: string | null;
      contactPerson: string | null;
      mobileNumber: string | null;
      emailId: string | null;
    }> = [];

    for (const companyData of companies) {
      const { name, gstin, address, contactPerson, mobileNumber, emailId } = companyData;

      if (!name || typeof name !== 'string' || name.trim() === '') {
        errors.push({ name: name || 'Unknown', error: 'Name is required' });
        continue;
      }

      const trimmedName = name.trim();
      const trimmedGstin = gstin?.trim() || null;
      const trimmedAddress = address?.trim() || null;
      const trimmedContactPerson = contactPerson?.trim() || null;
      const trimmedMobileNumber = mobileNumber?.trim() || null;
      const trimmedEmailId = emailId?.trim() || null;

      // Check if company with same name already exists
      const existingByName = await prisma.company.findUnique({
        where: { name: trimmedName }
      });

      if (existingByName) {
        errors.push({ name: trimmedName, error: 'Company with this name already exists' });
        continue;
      }

      // Check if company with same GSTIN already exists (if GSTIN provided)
      if (trimmedGstin) {
        const existingByGstin = await prisma.company.findUnique({
          where: { gstin: trimmedGstin }
        });

        if (existingByGstin) {
          errors.push({ name: trimmedName, error: `GSTIN ${trimmedGstin} already exists for company: ${existingByGstin.name}` });
          continue;
        }
      }

      companiesToCreate.push({
        name: trimmedName,
        gstin: trimmedGstin,
        address: trimmedAddress,
        contactPerson: trimmedContactPerson,
        mobileNumber: trimmedMobileNumber,
        emailId: trimmedEmailId
      });
    }

    // If there are any errors, return them without creating anything (all-or-nothing)
    if (errors.length > 0) {
      return res.status(400).json({
        message: `Validation failed: ${errors.length} error(s) found. No companies were created.`,
        results: {
          created: [],
          skipped: [],
          errors
        }
      });
    }

    // All validations passed, create all companies in a transaction
    const createdCompanies = await prisma.$transaction(
      companiesToCreate.map(companyData =>
        prisma.company.create({
          data: companyData
        })
      )
    );

    res.status(201).json({
      message: `Successfully created ${createdCompanies.length} companies`,
      results: {
        created: createdCompanies,
        skipped: [],
        errors: []
      }
    });
  } catch (error: any) {
    console.error('Bulk create companies error:', error);
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
