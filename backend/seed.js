const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

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

  console.log('✅ Admin user created:', admin.email);

  // Create materials
  const materials = [
    { name: 'Cement', unit: 'Bags', hsnSac: '25232910' },
    { name: 'Steel Rods', unit: 'Kg', hsnSac: '72142000' },
    { name: 'Sand', unit: 'Cubic Feet', hsnSac: '25051000' },
    { name: 'Bricks', unit: 'Pieces', hsnSac: '69010000' },
    { name: 'Cable', unit: 'Meters', hsnSac: '85444200' }
  ];

  for (const material of materials) {
    await prisma.material.upsert({
      where: { name: material.name },
      update: {},
      create: material
    });
  }

  console.log('✅ Materials created');

  // Create companies
  const companies = [
    { name: 'ABC Construction Ltd', address: '123 Main St, City' },
    { name: 'XYZ Builders', address: '456 Oak Ave, Town' },
    { name: 'DEF Materials Co', address: '789 Pine Rd, Village' }
  ];

  for (const company of companies) {
    await prisma.company.upsert({
      where: { name: company.name },
      update: {},
      create: company
    });
  }

  console.log('✅ Companies created');

  // Create sites
  const sites = [
    { name: 'Site A - Downtown Project', address: 'Downtown Area' },
    { name: 'Site B - Residential Complex', address: 'Suburb Area' },
    { name: 'Site C - Office Building', address: 'Business District' }
  ];

  for (const site of sites) {
    await prisma.site.upsert({
      where: { name: site.name },
      update: {},
      create: site
    });
  }

  console.log('✅ Sites created');

  // Create godowns
  const godowns = [
    { name: 'Main Godown', address: 'Central Warehouse' },
    { name: 'Anand Godown', address: 'Anand District' },
    { name: 'North Godown', address: 'Northern Area' }
  ];

  for (const godown of godowns) {
    await prisma.godown.upsert({
      where: { name: godown.name },
      update: {},
      create: godown
    });
  }

  console.log('✅ Godowns created');

  // Create sample purchase bills
  const allMaterials = await prisma.material.findMany();
  const allCompanies = await prisma.company.findMany();
  const allGodowns = await prisma.godown.findMany();

  if (allMaterials.length > 0 && allCompanies.length > 0 && allGodowns.length > 0) {
    const purchaseBill = await prisma.purchaseBill.create({
      data: {
        companyId: allCompanies[0].id,
        invoiceNumber: 'INV-001',
        gstinNumber: 'GST123456789',
        billDate: new Date('2024-01-15'),
        deliveredToType: 'GODOWN',
        deliveredToId: allGodowns[0].id,
        createdById: admin.id,
        items: {
          create: [
            {
              materialId: allMaterials[0].id,
              quantity: 100,
              rate: 350,
              gstPercentage: 18,
              totalExclGst: 35000,
              totalInclGst: 41300
            },
            {
              materialId: allMaterials[1].id,
              quantity: 500,
              rate: 50,
              gstPercentage: 18,
              totalExclGst: 25000,
              totalInclGst: 29500
            }
          ]
        }
      }
    });

    console.log('✅ Sample purchase bill created:', purchaseBill.invoiceNumber);
  }

  console.log('🎉 Database seed completed successfully!');
  console.log('📧 Admin Login: admin@example.com');
  console.log('🔑 Admin Password: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
