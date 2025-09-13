"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMaterial = exports.updateMaterial = exports.createMaterial = exports.getMaterialById = exports.getAllMaterials = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getAllMaterials = async (req, res) => {
    try {
        const materials = await prisma.material.findMany({
            orderBy: { name: 'asc' }
        });
        res.json(materials);
    }
    catch (error) {
        console.error('Get materials error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getAllMaterials = getAllMaterials;
const getMaterialById = async (req, res) => {
    try {
        const { id } = req.params;
        const material = await prisma.material.findUnique({
            where: { id }
        });
        if (!material) {
            return res.status(404).json({ message: 'Material not found' });
        }
        res.json(material);
    }
    catch (error) {
        console.error('Get material error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getMaterialById = getMaterialById;
const createMaterial = async (req, res) => {
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
    }
    catch (error) {
        console.error('Create material error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.createMaterial = createMaterial;
const updateMaterial = async (req, res) => {
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
    }
    catch (error) {
        console.error('Update material error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.updateMaterial = updateMaterial;
const deleteMaterial = async (req, res) => {
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
    }
    catch (error) {
        console.error('Delete material error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.deleteMaterial = deleteMaterial;
//# sourceMappingURL=materialsController.js.map