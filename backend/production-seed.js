const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting production seed...');

  // Create admin user
  const adminHashedPassword = await bcrypt.hash('admin15101970', 10);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin-user@gmail.com' },
    update: {},
    create: {
      email: 'admin-user@gmail.com',
      password: adminHashedPassword,
      name: 'Admin User',
      role: 'ADMIN'
    }
  });

  console.log('✅ Admin user created:', adminUser.email);

  // Create storekeeper user
  const storekeeperHashedPassword = await bcrypt.hash('storekeeper123', 10);
  
  const storekeeperUser = await prisma.user.upsert({
    where: { email: 'store-keeper@gmail.com' },
    update: {},
    create: {
      email: 'store-keeper@gmail.com',
      password: storekeeperHashedPassword,
      name: 'Store Keeper',
      role: 'STOREKEEPER'
    }
  });

  console.log('✅ Storekeeper user created:', storekeeperUser.email);

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

  console.log('🎉 Production seed completed successfully!');
  console.log('📧 Admin Login: admin-user@gmail.com');
  console.log('🔑 Admin Password: admin15101970');
  console.log('📧 Storekeeper Login: store-keeper@gmail.com');
  console.log('🔑 Storekeeper Password: storekeeper123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
