import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting production seed...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN'
    }
  });

  console.log('✅ Admin user created:', adminUser.email);

  // Create materials
  const materials = [
    { name: 'Cement', unit: 'Bags', description: 'Portland Cement' },
    { name: 'Steel Rods', unit: 'Kg', description: 'Reinforcement Steel' },
    { name: 'Sand', unit: 'Cubic Feet', description: 'Construction Sand' },
    { name: 'Bricks', unit: 'Pieces', description: 'Red Clay Bricks' },
    { name: 'Cable', unit: 'Meters', description: 'Electrical Cable' }
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
    { name: 'Site A - Downtown Project', location: 'Downtown Area' },
    { name: 'Site B - Residential Complex', location: 'Suburb Area' },
    { name: 'Site C - Office Building', location: 'Business District' }
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
    { name: 'Main Godown', location: 'Central Warehouse' },
    { name: 'Anand Godown', location: 'Anand District' },
    { name: 'North Godown', location: 'Northern Area' }
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
