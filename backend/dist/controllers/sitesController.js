"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSite = exports.updateSite = exports.createSite = exports.getAllSites = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getAllSites = async (req, res) => {
    try {
        const sites = await prisma.site.findMany({
            orderBy: { name: 'asc' }
        });
        res.json(sites);
    }
    catch (error) {
        console.error('Get sites error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getAllSites = getAllSites;
const createSite = async (req, res) => {
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
    }
    catch (error) {
        console.error('Create site error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.createSite = createSite;
const updateSite = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;
        // Only admin can update sites
        if (userRole !== 'ADMIN') {
            return res.status(403).json({ message: 'Only admin can update sites' });
        }
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
    }
    catch (error) {
        console.error('Update site error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.updateSite = updateSite;
const deleteSite = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;
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
    }
    catch (error) {
        console.error('Delete site error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.deleteSite = deleteSite;
