import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testStockData() {
  try {
    console.log('Testing stock data...\n');

    // Get all stock transactions
    const transactions = await prisma.stockTransaction.findMany({
      include: {
        material: true,
        godown: true,
        site: true
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`Found ${transactions.length} stock transactions:\n`);

    transactions.forEach((tx: any, index: number) => {
      console.log(`${index + 1}. ${tx.txType} - ${tx.material.name}`);
      console.log(`   Quantity: ${tx.quantity}`);
      console.log(`   Rate: ${tx.rate}`);
      console.log(`   Balance After: ${tx.balanceAfter}`);
      console.log(`   Godown: ${tx.godown?.name || 'N/A'}`);
      console.log(`   Site: ${tx.site?.name || 'N/A'}`);
      console.log(`   Reference: ${tx.referenceTable} - ${tx.referenceId}`);
      console.log(`   Date: ${tx.txDate.toISOString()}`);
      console.log('');
    });

    // Calculate current stock levels
    const stockLevels: any = {};
    
    for (const tx of transactions) {
      const key = `${tx.materialId}-${tx.godownId || 'direct'}`;
      
      if (!stockLevels[key]) {
        stockLevels[key] = {
          material: tx.material,
          godown: tx.godown,
          quantity: 0,
          totalValue: 0
        };
      }

      if (tx.txType === 'IN') {
        stockLevels[key].quantity += Number(tx.quantity);
        stockLevels[key].totalValue += Number(tx.quantity) * Number(tx.rate);
      } else {
        stockLevels[key].quantity -= Number(tx.quantity);
        stockLevels[key].totalValue -= Number(tx.quantity) * Number(tx.rate);
      }
    }

    console.log('Current Stock Levels:');
    console.log('====================');
    
    Object.values(stockLevels).forEach((level: any) => {
      console.log(`Material: ${level.material.name}`);
      console.log(`Godown: ${level.godown?.name || 'Direct'}`);
      console.log(`Quantity: ${level.quantity}`);
      console.log(`Total Value: ₹${level.totalValue.toFixed(2)}`);
      console.log('---');
    });

  } catch (error) {
    console.error('Error testing stock data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testStockData();
