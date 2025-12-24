import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateGstPercent() {
  try {
    console.log('Updating existing stock transactions to 18% GST...');
    
    // Use raw SQL to update all records
    const count = await prisma.$executeRaw`
      UPDATE stock_transactions 
      SET gst_percent = 18 
      WHERE gst_percent = 0 OR gst_percent IS NULL
    `;

    console.log(`✅ Updated ${count} stock transactions to 18% GST`);
  } catch (error) {
    console.error('Error updating GST percent:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateGstPercent();

