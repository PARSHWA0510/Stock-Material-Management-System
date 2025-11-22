import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get site-wise material reports
export const getSiteMaterialReports = async (req: Request, res: Response) => {
  try {
    const { site_id } = req.query;

    // If specific site_id is provided, get data for that site only
    if (site_id) {
      const site = await prisma.site.findUnique({
        where: { id: site_id as string },
        include: {
          materialIssues: {
            include: {
              items: {
                include: {
                  material: true
                }
              },
              fromGodown: true
            },
            orderBy: { issueDate: 'desc' }
          }
        }
      });

      if (!site) {
        return res.status(404).json({ error: 'Site not found' });
      }

      // Calculate total materials and costs for this site
      const materialSummary: { [key: string]: any } = {};

      // Process material issues
      for (const issue of site.materialIssues) {
        for (const item of issue.items) {
          const materialId = item.materialId;
          const materialName = item.material.name;
          const unit = item.material.unit;

          if (!materialSummary[materialId]) {
            materialSummary[materialId] = {
              materialId,
              materialName,
              unit,
              totalQuantity: 0,
              totalValue: 0,
              issues: []
            };
          }

          const quantity = Number(item.quantity);
          const rate = Number(item.rate);
          const totalValue = quantity * rate;

          materialSummary[materialId].totalQuantity += quantity;
          materialSummary[materialId].totalValue += totalValue;
          materialSummary[materialId].issues.push({
            issueId: issue.id,
            issueDate: issue.issueDate,
            quantity,
            rate,
            totalValue,
            fromGodown: issue.fromGodown?.name || 'Direct'
          });
        }
      }

      // Process direct-to-site purchases
      const directPurchases = await prisma.purchaseBill.findMany({
        where: {
          deliveredToType: 'SITE',
          deliveredToId: site_id as string
        },
        include: {
          items: {
            include: {
              material: true
            }
          }
        }
      });

      for (const purchase of directPurchases) {
        for (const item of purchase.items) {
          const materialId = item.materialId;
          const materialName = item.material.name;
          const unit = item.material.unit;

          if (!materialSummary[materialId]) {
            materialSummary[materialId] = {
              materialId,
              materialName,
              unit,
              totalQuantity: 0,
              totalValue: 0,
              issues: []
            };
          }

          const quantity = Number(item.quantity);
          const rate = Number(item.rate);
          const totalValue = quantity * rate;

          materialSummary[materialId].totalQuantity += quantity;
          materialSummary[materialId].totalValue += totalValue;
          materialSummary[materialId].issues.push({
            issueId: purchase.id,
            issueDate: purchase.billDate,
            quantity,
            rate,
            totalValue,
            fromGodown: 'Direct Purchase',
            isDirectPurchase: true
          });
        }
      }

      const materials = Object.values(materialSummary);
      const grandTotal = materials.reduce((sum: number, material: any) => sum + material.totalValue, 0);

      return res.json({
        site: {
          id: site.id,
          name: site.name,
          address: site.address
        },
        materials,
        grandTotal,
        totalMaterials: materials.length
      });
    }

    // Get all sites with their material summaries
    const sites = await prisma.site.findMany({
      include: {
        materialIssues: {
          include: {
            items: {
              include: {
                material: true
              }
            },
            fromGodown: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const siteReports = [];

    for (const site of sites) {
      const materialSummary: { [key: string]: any } = {};

      // Process material issues
      for (const issue of site.materialIssues) {
        for (const item of issue.items) {
          const materialId = item.materialId;
          const materialName = item.material.name;
          const unit = item.material.unit;

          if (!materialSummary[materialId]) {
            materialSummary[materialId] = {
              materialId,
              materialName,
              unit,
              totalQuantity: 0,
              totalValue: 0
            };
          }

          const quantity = Number(item.quantity);
          const rate = Number(item.rate);
          const totalValue = quantity * rate;

          materialSummary[materialId].totalQuantity += quantity;
          materialSummary[materialId].totalValue += totalValue;
        }
      }

      // Process direct-to-site purchases
      const directPurchases = await prisma.purchaseBill.findMany({
        where: {
          deliveredToType: 'SITE',
          deliveredToId: site.id
        },
        include: {
          items: {
            include: {
              material: true
            }
          }
        }
      });

      for (const purchase of directPurchases) {
        for (const item of purchase.items) {
          const materialId = item.materialId;
          const materialName = item.material.name;
          const unit = item.material.unit;

          if (!materialSummary[materialId]) {
            materialSummary[materialId] = {
              materialId,
              materialName,
              unit,
              totalQuantity: 0,
              totalValue: 0
            };
          }

          const quantity = Number(item.quantity);
          const rate = Number(item.rate);
          const totalValue = quantity * rate;

          materialSummary[materialId].totalQuantity += quantity;
          materialSummary[materialId].totalValue += totalValue;
        }
      }

      const materials = Object.values(materialSummary);
      const grandTotal = materials.reduce((sum: number, material: any) => sum + material.totalValue, 0);

      siteReports.push({
        site: {
          id: site.id,
          name: site.name,
          address: site.address
        },
        materials,
        grandTotal,
        totalMaterials: materials.length
      });
    }

    // Calculate overall summary
    const overallTotal = siteReports.reduce((sum, report) => sum + report.grandTotal, 0);
    const totalSites = siteReports.length;

    return res.json({
      siteReports,
      summary: {
        totalSites,
        overallTotal,
        totalMaterials: siteReports.reduce((sum, report) => sum + report.totalMaterials, 0)
      }
    });

  } catch (error) {
    console.error('Error fetching site material reports:', error);
    res.status(500).json({ error: 'Failed to fetch site material reports' });
  }
};

// Get detailed material history for a specific site and material
export const getSiteMaterialHistory = async (req: Request, res: Response) => {
  try {
    const { site_id, material_id } = req.params;

    const site = await prisma.site.findUnique({
      where: { id: site_id }
    });

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    const material = await prisma.material.findUnique({
      where: { id: material_id }
    });

    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }

    // Get material issues for this site and material
    const materialIssues = await prisma.materialIssue.findMany({
      where: {
        siteId: site_id,
        items: {
          some: {
            materialId: material_id
          }
        }
      },
      include: {
        items: {
          where: { materialId: material_id },
          include: {
            material: true
          }
        },
        fromGodown: true
      },
      orderBy: { issueDate: 'desc' }
    });

    // Get direct purchases for this site and material
    const directPurchases = await prisma.purchaseBill.findMany({
      where: {
        deliveredToType: 'SITE',
        deliveredToId: site_id,
        items: {
          some: {
            materialId: material_id
          }
        }
      },
      include: {
        items: {
          where: { materialId: material_id },
          include: {
            material: true
          }
        },
        company: true
      },
      orderBy: { billDate: 'desc' }
    });

    const history = [];

    // Process material issues
    for (const issue of materialIssues) {
      for (const item of issue.items) {
        history.push({
          type: 'ISSUE',
          date: issue.issueDate,
          quantity: Number(item.quantity),
          rate: Number(item.rate),
          totalValue: Number(item.quantity) * Number(item.rate),
          fromGodown: issue.fromGodown?.name || 'Direct',
          reference: `Issue #${issue.identifier}`,
          issueId: issue.id
        });
      }
    }

    // Process direct purchases
    for (const purchase of directPurchases) {
      for (const item of purchase.items) {
        history.push({
          type: 'DIRECT_PURCHASE',
          date: purchase.billDate,
          quantity: Number(item.quantity),
          rate: Number(item.rate),
          totalValue: Number(item.quantity) * Number(item.rate),
          fromGodown: 'Direct Purchase',
          reference: `Bill #${purchase.invoiceNumber}`,
          company: purchase.company.name,
          purchaseId: purchase.id
        });
      }
    }

    // Sort by date (newest first)
    history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate totals
    const totalQuantity = history.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = history.reduce((sum, item) => sum + item.totalValue, 0);

    return res.json({
      site: {
        id: site.id,
        name: site.name,
        address: site.address
      },
      material: {
        id: material.id,
        name: material.name,
        unit: material.unit
      },
      history,
      totals: {
        totalQuantity,
        totalValue
      }
    });

  } catch (error) {
    console.error('Error fetching site material history:', error);
    res.status(500).json({ error: 'Failed to fetch site material history' });
  }
};

// Get material-wise reports showing additions and site distributions
export const getMaterialWiseReports = async (req: Request, res: Response) => {
  try {
    const { material_id } = req.query;

    // If specific material_id is provided, get data for that material only
    if (material_id) {
      const material = await prisma.material.findUnique({
        where: { id: material_id as string }
      });

      if (!material) {
        return res.status(404).json({ error: 'Material not found' });
      }

      // Get all purchase bills that added this material
      const purchaseBills = await prisma.purchaseBill.findMany({
        where: {
          items: {
            some: {
              materialId: material_id as string
            }
          }
        },
        include: {
          items: {
            where: { materialId: material_id as string },
            include: {
              material: true
            }
          },
          company: true
        },
        orderBy: { billDate: 'desc' }
      });

      // Get all material issues that sent this material to sites
      const materialIssues = await prisma.materialIssue.findMany({
        where: {
          items: {
            some: {
              materialId: material_id as string
            }
          }
        },
        include: {
          items: {
            where: { materialId: material_id as string },
            include: {
              material: true
            }
          },
          site: true,
          fromGodown: true
        },
        orderBy: { issueDate: 'desc' }
      });

      // Calculate total added from purchase bills
      let totalAdded = 0;
      const additions = [];
      for (const bill of purchaseBills) {
        for (const item of bill.items) {
          const quantity = Number(item.quantity);
          totalAdded += quantity;
          additions.push({
            date: bill.billDate,
            quantity,
            rate: Number(item.rate),
            totalValue: quantity * Number(item.rate),
            invoiceNumber: bill.invoiceNumber,
            company: bill.company.name,
            deliveredTo: bill.deliveredToType === 'GODOWN' ? 'Godown' : 'Site',
            purchaseBillId: bill.id
          });
        }
      }

      // Calculate distribution to sites
      const siteDistribution: { [key: string]: { siteName: string; totalQuantity: number; totalValue: number; issues: any[] } } = {};
      let totalDistributed = 0;

      for (const issue of materialIssues) {
        for (const item of issue.items) {
          const quantity = Number(item.quantity);
          const rate = Number(item.rate);
          const totalValue = quantity * rate;
          totalDistributed += quantity;

          if (!siteDistribution[issue.siteId]) {
            siteDistribution[issue.siteId] = {
              siteName: issue.site.name,
              totalQuantity: 0,
              totalValue: 0,
              issues: []
            };
          }

          siteDistribution[issue.siteId].totalQuantity += quantity;
          siteDistribution[issue.siteId].totalValue += totalValue;
          siteDistribution[issue.siteId].issues.push({
            date: issue.issueDate,
            quantity,
            rate,
            totalValue,
            issueId: issue.identifier,
            fromGodown: issue.fromGodown?.name || 'Direct'
          });
        }
      }

      const distribution = Object.values(siteDistribution);

      return res.json({
        material: {
          id: material.id,
          name: material.name,
          unit: material.unit,
          hsnSac: material.hsnSac
        },
        summary: {
          totalAdded,
          totalDistributed,
          remaining: totalAdded - totalDistributed
        },
        additions,
        distribution
      });
    }

    // Get all materials with their summaries
    const materials = await prisma.material.findMany({
      orderBy: { name: 'asc' }
    });

    const materialReports = [];

    for (const material of materials) {
      // Get total added
      const purchaseBills = await prisma.purchaseBill.findMany({
        where: {
          items: {
            some: {
              materialId: material.id
            }
          }
        },
        include: {
          items: {
            where: { materialId: material.id }
          }
        }
      });

      let totalAdded = 0;
      for (const bill of purchaseBills) {
        for (const item of bill.items) {
          totalAdded += Number(item.quantity);
        }
      }

      // Get total distributed
      const materialIssues = await prisma.materialIssue.findMany({
        where: {
          items: {
            some: {
              materialId: material.id
            }
          }
        },
        include: {
          items: {
            where: { materialId: material.id }
          },
          site: true
        }
      });

      let totalDistributed = 0;
      const siteDistribution: { [key: string]: number } = {};
      for (const issue of materialIssues) {
        for (const item of issue.items) {
          const quantity = Number(item.quantity);
          totalDistributed += quantity;
          if (!siteDistribution[issue.site.name]) {
            siteDistribution[issue.site.name] = 0;
          }
          siteDistribution[issue.site.name] += quantity;
        }
      }

      materialReports.push({
        material: {
          id: material.id,
          name: material.name,
          unit: material.unit,
          hsnSac: material.hsnSac
        },
        summary: {
          totalAdded,
          totalDistributed,
          remaining: totalAdded - totalDistributed
        },
        siteDistribution: Object.entries(siteDistribution).map(([siteName, quantity]) => ({
          siteName,
          quantity
        }))
      });
    }

    return res.json({
      materialReports,
      summary: {
        totalMaterials: materialReports.length,
        totalAdded: materialReports.reduce((sum, report) => sum + report.summary.totalAdded, 0),
        totalDistributed: materialReports.reduce((sum, report) => sum + report.summary.totalDistributed, 0)
      }
    });

  } catch (error) {
    console.error('Error fetching material-wise reports:', error);
    res.status(500).json({ error: 'Failed to fetch material-wise reports' });
  }
};