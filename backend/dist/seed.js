"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting database seed...');
    // Create admin user
    const hashedPassword = await bcryptjs_1.default.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: {},
        create: {
            email: 'admin@example.com',
            password: hashedPassword,
            role: 'ADMIN',
            name: 'Admin User'
        }
    });
    // Create storekeeper user
    const storekeeper = await prisma.user.upsert({
        where: { email: 'storekeeper@example.com' },
        update: {},
        create: {
            email: 'storekeeper@example.com',
            password: hashedPassword,
            role: 'STOREKEEPER',
            name: 'Store Keeper'
        }
    });
    // Create companies
    const company1 = await prisma.company.upsert({
        where: { name: 'ABC Suppliers' },
        update: {},
        create: {
            name: 'ABC Suppliers',
            gstin: '29ABCDE1234F1Z5',
            address: '123 Industrial Area, Mumbai'
        }
    });
    const company2 = await prisma.company.upsert({
        where: { name: 'XYZ Materials' },
        update: {},
        create: {
            name: 'XYZ Materials',
            gstin: '30FGHIJ5678K2L6',
            address: '456 Commercial Street, Delhi'
        }
    });
    // Create materials
    const cement = await prisma.material.upsert({
        where: { name: 'Cement' },
        update: {},
        create: {
            name: 'Cement',
            unit: 'Bag',
            hsnSac: '25232910'
        }
    });
    const steelRod = await prisma.material.upsert({
        where: { name: 'Steel Rod' },
        update: {},
        create: {
            name: 'Steel Rod',
            unit: 'Meter',
            hsnSac: '72142000'
        }
    });
    const cable = await prisma.material.upsert({
        where: { name: 'Cable' },
        update: {},
        create: {
            name: 'Cable',
            unit: 'Meter',
            hsnSac: '85444220'
        }
    });
    // Create sites
    const dahejSite = await prisma.site.upsert({
        where: { name: 'Dahej Site' },
        update: {},
        create: {
            name: 'Dahej Site',
            address: 'Dahej Industrial Area, Gujarat'
        }
    });
    const mumbaiSite = await prisma.site.upsert({
        where: { name: 'Mumbai Site' },
        update: {},
        create: {
            name: 'Mumbai Site',
            address: 'Mumbai Industrial Area, Maharashtra'
        }
    });
    // Create godowns
    const mainGodown = await prisma.godown.upsert({
        where: { name: 'Main Godown' },
        update: {},
        create: {
            name: 'Main Godown',
            address: 'Central Warehouse, Mumbai'
        }
    });
    const secondaryGodown = await prisma.godown.upsert({
        where: { name: 'Secondary Godown' },
        update: {},
        create: {
            name: 'Secondary Godown',
            address: 'Secondary Warehouse, Delhi'
        }
    });
    // Create Purchase Bills
    const purchaseBill1 = await prisma.purchaseBill.create({
        data: {
            companyId: company1.id,
            invoiceNumber: 'INV-001-2024',
            gstinNumber: '29ABCDE1234F1Z5',
            billDate: new Date('2024-01-15'),
            deliveredToType: 'GODOWN',
            deliveredToId: mainGodown.id,
            createdById: admin.id,
            items: {
                create: [
                    {
                        materialId: cement.id,
                        quantity: 100,
                        unit: 'Bag',
                        rate: 400,
                        gstPercent: 18,
                        totalExclGst: 40000,
                        totalInclGst: 47200,
                        locationInGodown: 'A-1-01'
                    },
                    {
                        materialId: steelRod.id,
                        quantity: 500,
                        unit: 'Meter',
                        rate: 80,
                        gstPercent: 18,
                        totalExclGst: 40000,
                        totalInclGst: 47200,
                        locationInGodown: 'A-1-02'
                    }
                ]
            }
        }
    });
    const purchaseBill2 = await prisma.purchaseBill.create({
        data: {
            companyId: company2.id,
            invoiceNumber: 'INV-002-2024',
            gstinNumber: '30FGHIJ5678K2L6',
            billDate: new Date('2024-01-20'),
            deliveredToType: 'SITE',
            deliveredToId: dahejSite.id,
            createdById: storekeeper.id,
            items: {
                create: [
                    {
                        materialId: cable.id,
                        quantity: 1000,
                        unit: 'Meter',
                        rate: 25,
                        gstPercent: 18,
                        totalExclGst: 25000,
                        totalInclGst: 29500,
                        locationInGodown: null
                    }
                ]
            }
        }
    });
    // Create Material Issues
    const materialIssue1 = await prisma.materialIssue.create({
        data: {
            identifier: 'MI-001-2024',
            issueDate: new Date('2024-01-25'),
            siteId: dahejSite.id,
            fromGodownId: mainGodown.id,
            createdById: storekeeper.id,
            items: {
                create: [
                    {
                        materialId: cement.id,
                        quantity: 50,
                        unit: 'Bag',
                        rate: 400,
                        totalExclGst: 20000,
                        gstPercent: 18,
                        totalInclGst: 23600
                    },
                    {
                        materialId: steelRod.id,
                        quantity: 200,
                        unit: 'Meter',
                        rate: 80,
                        totalExclGst: 16000,
                        gstPercent: 18,
                        totalInclGst: 18880
                    }
                ]
            }
        }
    });
    const materialIssue2 = await prisma.materialIssue.create({
        data: {
            identifier: 'MI-002-2024',
            issueDate: new Date('2024-01-30'),
            siteId: mumbaiSite.id,
            fromGodownId: mainGodown.id,
            createdById: admin.id,
            items: {
                create: [
                    {
                        materialId: cement.id,
                        quantity: 30,
                        unit: 'Bag',
                        rate: 400,
                        totalExclGst: 12000,
                        gstPercent: 18,
                        totalInclGst: 14160
                    }
                ]
            }
        }
    });
    console.log('✅ Database seeded successfully!');
    console.log('👤 Admin user: admin@example.com / admin123');
    console.log('👤 Storekeeper user: storekeeper@example.com / admin123');
    console.log('📦 Created 2 purchase bills and 2 material issues');
}
main()
    .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
