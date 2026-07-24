/**
 * Removes stock_transactions that reference deleted material issues.
 * These orphans can leave inventory at 0 / negative after:
 * delete material issue (without reversing stock) → delete purchase bill → re-add purchase bill.
 *
 * Usage: npx ts-node src/scripts/cleanupOrphanedStockTransactions.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupOrphanedStockTransactions() {
  try {
    const materialIssueTxs = await prisma.stockTransaction.findMany({
      where: { referenceTable: 'material_issues' },
      select: {
        id: true,
        referenceId: true,
        materialId: true,
        godownId: true,
        quantity: true,
        txType: true,
        txDate: true
      }
    });

    if (materialIssueTxs.length === 0) {
      console.log('No material_issues stock transactions found.');
      return;
    }

    const referenceIds = [...new Set(materialIssueTxs.map((tx) => tx.referenceId))];
    const existingIssues = await prisma.materialIssue.findMany({
      where: { id: { in: referenceIds } },
      select: { id: true }
    });
    const existingIds = new Set(existingIssues.map((issue) => issue.id));

    const orphaned = materialIssueTxs.filter((tx) => !existingIds.has(tx.referenceId));

    if (orphaned.length === 0) {
      console.log('No orphaned material_issues stock transactions found.');
      return;
    }

    console.log(`Found ${orphaned.length} orphaned stock transaction(s):\n`);
    for (const tx of orphaned) {
      console.log(
        `  - ${tx.txType} qty=${tx.quantity} material=${tx.materialId} godown=${tx.godownId ?? 'n/a'} ref=${tx.referenceId}`
      );
    }

    const result = await prisma.stockTransaction.deleteMany({
      where: {
        id: { in: orphaned.map((tx) => tx.id) }
      }
    });

    console.log(`\nDeleted ${result.count} orphaned stock transaction(s). Inventory should now reflect re-added purchase bills.`);
  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

cleanupOrphanedStockTransactions();
