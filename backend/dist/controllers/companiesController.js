"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCompany = exports.updateCompany = exports.createCompany = exports.getAllCompanies = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getAllCompanies = async (req, res) => {
    try {
        const companies = await prisma.company.findMany({
            orderBy: { name: 'asc' }
        });
        res.json(companies);
    }
    catch (error) {
        console.error('Get companies error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getAllCompanies = getAllCompanies;
const createCompany = async (req, res) => {
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
    }
    catch (error) {
        console.error('Create company error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.createCompany = createCompany;
const updateCompany = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, gstin, address } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;
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
    }
    catch (error) {
        console.error('Update company error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.updateCompany = updateCompany;
const deleteCompany = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;
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
    }
    catch (error) {
        console.error('Delete company error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.deleteCompany = deleteCompany;
