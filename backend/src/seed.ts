import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
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

  const seedInvoiceNumbers = ['INV-001-2024', 'INV-002-2024', 'INV-003-2024'];
  const seedIssueIdentifiers = ['MI-001-2024', 'MI-002-2024', 'MI-003-2024'];

  const existingSeedBills = await prisma.purchaseBill.findMany({
    where: { invoiceNumber: { in: seedInvoiceNumbers } },
    select: { id: true }
  });
  const existingSeedIssues = await prisma.materialIssue.findMany({
    where: { identifier: { in: seedIssueIdentifiers } },
    select: { id: true }
  });
  const seedReferenceIds = [
    ...existingSeedBills.map(bill => bill.id),
    ...existingSeedIssues.map(issue => issue.id)
  ];

  if (seedReferenceIds.length > 0) {
    await prisma.stockTransaction.deleteMany({
      where: { referenceId: { in: seedReferenceIds } }
    });
  }
  if (existingSeedIssues.length > 0) {
    await prisma.materialIssue.deleteMany({
      where: { id: { in: existingSeedIssues.map(issue => issue.id) } }
    });
  }
  if (existingSeedBills.length > 0) {
    await prisma.purchaseBill.deleteMany({
      where: { id: { in: existingSeedBills.map(bill => bill.id) } }
    });
  }

  const createStockTx = async (data: {
    materialId: string;
    godownId?: string | null;
    siteId?: string | null;
    txType: 'IN' | 'OUT';
    referenceTable: string;
    referenceId: string;
    quantity: number;
    rate: number;
    gstPercent?: number;
    txDate: Date;
  }) => {
    await prisma.stockTransaction.create({
      data: {
        materialId: data.materialId,
        godownId: data.godownId ?? null,
        siteId: data.siteId ?? null,
        txType: data.txType,
        referenceTable: data.referenceTable,
        referenceId: data.referenceId,
        quantity: data.quantity,
        rate: data.rate,
        gstPercent: data.gstPercent ?? 18,
        balanceAfter: 0,
        txDate: data.txDate
      }
    });
  };

  // Cement + Steel from ABC Suppliers into Main Godown
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
            discountPercent: 0,
            netRate: 400,
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
            discountPercent: 0,
            netRate: 80,
            gstPercent: 18,
            totalExclGst: 40000,
            totalInclGst: 47200,
            locationInGodown: 'A-1-02'
          }
        ]
      }
    }
  });

  await createStockTx({
    materialId: cement.id,
    godownId: mainGodown.id,
    txType: 'IN',
    referenceTable: 'purchase_bills',
    referenceId: purchaseBill1.id,
    quantity: 100,
    rate: 400,
    txDate: new Date('2024-01-15')
  });
  await createStockTx({
    materialId: steelRod.id,
    godownId: mainGodown.id,
    txType: 'IN',
    referenceTable: 'purchase_bills',
    referenceId: purchaseBill1.id,
    quantity: 500,
    rate: 80,
    txDate: new Date('2024-01-15')
  });

  // Cable from XYZ Materials delivered directly to Dahej Site
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
            discountPercent: 0,
            netRate: 25,
            gstPercent: 18,
            totalExclGst: 25000,
            totalInclGst: 29500,
            locationInGodown: null
          }
        ]
      }
    }
  });

  await createStockTx({
    materialId: cable.id,
    siteId: dahejSite.id,
    txType: 'IN',
    referenceTable: 'purchase_bills',
    referenceId: purchaseBill2.id,
    quantity: 1000,
    rate: 25,
    txDate: new Date('2024-01-20')
  });
  await createStockTx({
    materialId: cable.id,
    siteId: dahejSite.id,
    txType: 'OUT',
    referenceTable: 'purchase_bills',
    referenceId: purchaseBill2.id,
    quantity: 1000,
    rate: 25,
    txDate: new Date('2024-01-20')
  });

  // Cement from XYZ Materials into Main Godown (second company + later inward date)
  const purchaseBill3 = await prisma.purchaseBill.create({
    data: {
      companyId: company2.id,
      invoiceNumber: 'INV-003-2024',
      gstinNumber: '30FGHIJ5678K2L6',
      billDate: new Date('2024-02-10'),
      deliveredToType: 'GODOWN',
      deliveredToId: mainGodown.id,
      createdById: admin.id,
      items: {
        create: [
          {
            materialId: cement.id,
            quantity: 80,
            unit: 'Bag',
            rate: 420,
            discountPercent: 0,
            netRate: 420,
            gstPercent: 18,
            totalExclGst: 33600,
            totalInclGst: 39648,
            locationInGodown: 'A-1-01'
          }
        ]
      }
    }
  });

  await createStockTx({
    materialId: cement.id,
    godownId: mainGodown.id,
    txType: 'IN',
    referenceTable: 'purchase_bills',
    referenceId: purchaseBill3.id,
    quantity: 80,
    rate: 420,
    txDate: new Date('2024-02-10')
  });

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

  await createStockTx({
    materialId: cement.id,
    godownId: mainGodown.id,
    siteId: dahejSite.id,
    txType: 'OUT',
    referenceTable: 'material_issues',
    referenceId: materialIssue1.id,
    quantity: 50,
    rate: 400,
    txDate: new Date('2024-01-25')
  });
  await createStockTx({
    materialId: steelRod.id,
    godownId: mainGodown.id,
    siteId: dahejSite.id,
    txType: 'OUT',
    referenceTable: 'material_issues',
    referenceId: materialIssue1.id,
    quantity: 200,
    rate: 80,
    txDate: new Date('2024-01-25')
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

  await createStockTx({
    materialId: cement.id,
    godownId: mainGodown.id,
    siteId: mumbaiSite.id,
    txType: 'OUT',
    referenceTable: 'material_issues',
    referenceId: materialIssue2.id,
    quantity: 30,
    rate: 400,
    txDate: new Date('2024-01-30')
  });

  const materialIssue3 = await prisma.materialIssue.create({
    data: {
      identifier: 'MI-003-2024',
      issueDate: new Date('2024-02-12'),
      siteId: dahejSite.id,
      fromGodownId: mainGodown.id,
      createdById: storekeeper.id,
      items: {
        create: [
          {
            materialId: cement.id,
            quantity: 40,
            unit: 'Bag',
            rate: 420,
            totalExclGst: 16800,
            gstPercent: 18,
            totalInclGst: 19824
          }
        ]
      }
    }
  });

  await createStockTx({
    materialId: cement.id,
    godownId: mainGodown.id,
    siteId: dahejSite.id,
    txType: 'OUT',
    referenceTable: 'material_issues',
    referenceId: materialIssue3.id,
    quantity: 40,
    rate: 420,
    txDate: new Date('2024-02-12')
  });

  console.log('✅ Database seeded successfully!');
  console.log('👤 Admin user: admin@example.com / admin123');
  console.log('👤 Storekeeper user: storekeeper@example.com / admin123');
  console.log('📦 Created 3 purchase bills and 3 material issues');
  console.log('🧱 Cement sample: ABC (15 Jan) + XYZ (10 Feb) inward; outward 25 Jan, 30 Jan, 12 Feb');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
