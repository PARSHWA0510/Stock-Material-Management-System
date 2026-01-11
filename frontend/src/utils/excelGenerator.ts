import * as XLSX from 'xlsx';

// Helper function to format currency
const formatCurrency = (amount: number | null | undefined): number => {
  const numAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return Math.round(numAmount * 100) / 100; // Round to 2 decimal places
};

// Helper function to format date
const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Types (matching pdfGenerator types)
interface MaterialReport {
  material: {
    name: string;
    unit: string;
    hsnSac?: string;
  };
  summary: {
    totalAdded: number;
    totalDistributed: number;
    remaining: number;
  };
  siteDistribution: Array<{
    siteName: string;
    quantity: number;
  }>;
}

interface MaterialWiseData {
  material?: {
    name: string;
    unit: string;
    hsnSac?: string;
  };
  summary?: {
    totalAdded: number;
    totalDistributed: number;
    remaining: number;
  };
  distribution?: Array<{
    siteName: string;
    totalQuantity: number;
    totalValue: number;
    issues?: Array<{
      date: string;
      issueId: string;
      quantity: number;
      rate: number;
      totalValue: number;
      fromGodown?: string;
    }>;
  }>;
  materialReports?: MaterialReport[];
}

interface SiteReport {
  site: {
    id: string;
    name: string;
    address?: string;
  };
  materials: Array<{
    materialName: string;
    unit: string;
    totalQuantity: number;
    totalValue: number;
  }>;
  grandTotal: number;
}

interface SiteWiseData {
  site?: {
    name: string;
    address?: string;
  };
  materials?: Array<{
    materialName: string;
    unit: string;
    totalQuantity: number;
    totalValue: number;
  }>;
  siteReports?: SiteReport[];
  summary?: {
    totalSites: number;
    totalMaterials: number;
    overallTotal: number;
  };
}

interface InventoryItem {
  material: {
    name: string;
    unit: string;
  };
  quantity: number;
  rate: number;
  totalValue: number;
  godown?: {
    id: string;
    name: string;
  };
}

// Generate Excel for material-wise overview (all materials)
export const generateMaterialWiseOverviewExcel = (data: MaterialWiseData) => {
  const workbook = XLSX.utils.book_new();

  if (data.materialReports && data.materialReports.length > 0) {
    const worksheetData = [
      ['Material', 'Unit', 'Total Added', 'Total Distributed', 'Remaining', 'Site Distribution']
    ];

    data.materialReports.forEach((report: MaterialReport) => {
      const siteDist = report.siteDistribution.length > 0
        ? report.siteDistribution.map((s) => `${s.siteName} (${s.quantity})`).join(', ')
        : 'N/A';
      
      worksheetData.push([
        report.material.name,
        report.material.unit,
        `${report.summary.totalAdded} ${report.material.unit}`,
        `${report.summary.totalDistributed} ${report.material.unit}`,
        `${report.summary.remaining} ${report.material.unit}`,
        siteDist
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 30 }, // Material
      { wch: 15 }, // Unit
      { wch: 20 }, // Total Added
      { wch: 20 }, // Total Distributed
      { wch: 15 }, // Remaining
      { wch: 50 }  // Site Distribution
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Materials Overview');
  }

  // Summary sheet
  if (data.summary) {
    const summaryData = [
      ['Summary'],
      ['Total Materials', String((data.summary as any).totalMaterials || data.materialReports?.length || 0)],
      ['Total Added', String(data.summary.totalAdded || 0)],
      ['Total Distributed', String(data.summary.totalDistributed || 0)]
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  }

  const fileName = `Material-Wise-Report-All-Materials-${formatDate(new Date()).replace(/\s+/g, '-')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

// Generate Excel for material-wise site overview
export const generateMaterialWiseSitesOverviewExcel = (data: MaterialWiseData) => {
  const workbook = XLSX.utils.book_new();

  if (data.material) {
    // Material details sheet
    const materialData = [
      ['Material Details'],
      ['Name', data.material.name],
      ['Unit', data.material.unit]
    ];
    if (data.material.hsnSac) {
      materialData.push(['HSN/SAC', data.material.hsnSac]);
    }
    const materialSheet = XLSX.utils.aoa_to_sheet(materialData);
    XLSX.utils.book_append_sheet(workbook, materialSheet, 'Material Details');

    // Summary sheet
    if (data.summary) {
      const summaryData = [
        ['Summary'],
        ['Total Added', `${data.summary.totalAdded} ${data.material.unit}`],
        ['Total Distributed', `${data.summary.totalDistributed} ${data.material.unit}`],
        ['Remaining', `${data.summary.remaining} ${data.material.unit}`]
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    }

    // Distribution sheet
    if (data.distribution && data.distribution.length > 0) {
      const distributionData = [
        ['Site Name', 'Total Quantity', 'Total Value (Rs.)']
      ];

      data.distribution.forEach((dist) => {
        distributionData.push([
          dist.siteName,
          String(dist.totalQuantity),
          String(formatCurrency(dist.totalValue))
        ]);
      });

      const distributionSheet = XLSX.utils.aoa_to_sheet(distributionData);
      distributionSheet['!cols'] = [
        { wch: 30 },
        { wch: 15 },
        { wch: 20 }
      ];
      XLSX.utils.book_append_sheet(workbook, distributionSheet, 'Distribution');
    }
  }

  const materialName = (data.material?.name || 'Unknown').replace(/\s+/g, '-');
  const fileName = `Material-Wise-Report-Sites-Overview-${materialName}-${formatDate(new Date()).replace(/\s+/g, '-')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

// Generate Excel for material-wise site details
export const generateMaterialWiseSiteDetailsExcel = (data: MaterialWiseData, siteName: string) => {
  const workbook = XLSX.utils.book_new();

  if (data.material) {
    // Material and site info
    const infoData = [
      ['Material', data.material.name],
      ['Site', siteName],
      ['Unit', data.material.unit]
    ];
    const infoSheet = XLSX.utils.aoa_to_sheet(infoData);
    XLSX.utils.book_append_sheet(workbook, infoSheet, 'Info');

    // Find the specific site distribution
    const siteDistribution = data.distribution?.find((dist) => dist.siteName === siteName);

    if (siteDistribution && siteDistribution.issues && siteDistribution.issues.length > 0) {
      const issuesData = [
        ['Date', 'Issue ID', 'Quantity', 'Rate (Rs.)', 'Total Value (Rs.)', 'From Godown']
      ];

      siteDistribution.issues.forEach((issue) => {
        issuesData.push([
          formatDate(issue.date),
          issue.issueId,
          String(issue.quantity),
          String(formatCurrency(issue.rate)),
          String(formatCurrency(issue.totalValue)),
          issue.fromGodown || 'Direct'
        ]);
      });

      const issuesSheet = XLSX.utils.aoa_to_sheet(issuesData);
      issuesSheet['!cols'] = [
        { wch: 15 },
        { wch: 20 },
        { wch: 12 },
        { wch: 15 },
        { wch: 18 },
        { wch: 20 }
      ];
      XLSX.utils.book_append_sheet(workbook, issuesSheet, 'Issue Details');

      // Summary
      const summaryData = [
        ['Summary'],
        ['Total Quantity', `${siteDistribution.totalQuantity} ${data.material.unit}`],
        ['Total Value (Rs.)', String(formatCurrency(siteDistribution.totalValue))]
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    }
  }

  const materialName = (data.material?.name || 'Unknown').replace(/\s+/g, '-');
  const fileName = `Material-Wise-Report-Site-Details-${materialName}-${siteName.replace(/\s+/g, '-')}-${formatDate(new Date()).replace(/\s+/g, '-')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

// Generate Excel for site-wise reports
export const generateSiteWiseExcel = (data: SiteWiseData, siteName?: string, type: 'overview' | 'details' = 'overview') => {
  const workbook = XLSX.utils.book_new();

  if (data.site && type === 'details') {
    // Site details sheet
    const siteData = [
      ['Site Details'],
      ['Name', data.site.name]
    ];
    if (data.site.address) {
      siteData.push(['Address', data.site.address]);
    }
    const siteSheet = XLSX.utils.aoa_to_sheet(siteData);
    XLSX.utils.book_append_sheet(workbook, siteSheet, 'Site Details');

    // Materials sheet
    if (data.materials && data.materials.length > 0) {
      const materialsData = [
        ['Material', 'Unit', 'Total Quantity', 'Total Value (Rs.)']
      ];

      data.materials.forEach((mat) => {
        materialsData.push([
          mat.materialName,
          mat.unit,
          String(mat.totalQuantity),
          String(formatCurrency(mat.totalValue))
        ]);
      });

      const materialsSheet = XLSX.utils.aoa_to_sheet(materialsData);
      materialsSheet['!cols'] = [
        { wch: 30 },
        { wch: 15 },
        { wch: 15 },
        { wch: 20 }
      ];
      XLSX.utils.book_append_sheet(workbook, materialsSheet, 'Materials');

      // Summary
      const grandTotal = data.materials.reduce((sum, mat) => sum + mat.totalValue, 0);
      const summaryData = [
        ['Summary'],
        ['Total Materials', String(data.materials.length)],
        ['Grand Total (Rs.)', String(formatCurrency(grandTotal))]
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    }
  } else if (data.siteReports) {
    // Multiple sites overview
    const sitesData = [
      ['Site Name', 'Address', 'Materials Count', 'Grand Total (Rs.)']
    ];

    data.siteReports.forEach((report: SiteReport) => {
      sitesData.push([
        report.site.name,
        report.site.address || 'N/A',
        String(report.materials.length),
        String(formatCurrency(report.grandTotal))
      ]);
    });

    const sitesSheet = XLSX.utils.aoa_to_sheet(sitesData);
    sitesSheet['!cols'] = [
      { wch: 30 },
      { wch: 40 },
      { wch: 15 },
      { wch: 20 }
    ];
    XLSX.utils.book_append_sheet(workbook, sitesSheet, 'Sites Overview');

    // Summary
    if (data.summary) {
      const summaryData = [
        ['Summary'],
        ['Total Sites', String(data.summary.totalSites || data.siteReports.length)],
        ['Total Materials', String(data.summary.totalMaterials || 0)],
        ['Overall Total (Rs.)', String(formatCurrency(data.summary.overallTotal || 0))]
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    }
  }

  const fileName = siteName
    ? `Site-Wise-Report-${siteName.replace(/\s+/g, '-')}-${formatDate(new Date()).replace(/\s+/g, '-')}.xlsx`
    : `Site-Wise-Report-All-Sites-${formatDate(new Date()).replace(/\s+/g, '-')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

// Generate Excel for godown inventory
export const generateGodownInventoryExcel = (inventory: InventoryItem[], godownName?: string, type: 'all' | 'godown' = 'all') => {
  const workbook = XLSX.utils.book_new();

  if (type === 'all') {
    // Group by godown
    const godownGroups: { [key: string]: InventoryItem[] } = {};
    inventory.forEach(item => {
      const gName = item.godown?.name || 'Direct';
      if (!godownGroups[gName]) {
        godownGroups[gName] = [];
      }
      godownGroups[gName].push(item);
    });

    // Summary sheet
    const summaryData = [
      ['Godown Name', 'Materials Count', 'Total Quantity', 'Total Value (Rs.)']
    ];

    Object.entries(godownGroups).forEach(([gName, items]) => {
      const totalValue = items.reduce((sum, item) => sum + item.totalValue, 0);
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
      summaryData.push([
        gName,
        String(items.length),
        String(totalQuantity),
        String(formatCurrency(totalValue))
      ]);
    });

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet['!cols'] = [
      { wch: 30 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 }
    ];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Godowns Summary');

    // Overall summary
    const overallTotal = inventory.reduce((sum, item) => sum + item.totalValue, 0);
    const overallQuantity = inventory.reduce((sum, item) => sum + item.quantity, 0);
    const overallData = [
      ['Overall Summary'],
      ['Total Godowns', String(Object.keys(godownGroups).length)],
      ['Total Materials', String(inventory.length)],
      ['Total Quantity', String(overallQuantity)],
      ['Total Value (Rs.)', String(formatCurrency(overallTotal))]
    ];
    const overallSheet = XLSX.utils.aoa_to_sheet(overallData);
    XLSX.utils.book_append_sheet(workbook, overallSheet, 'Overall Summary');
  } else {
    // Specific godown details
    const filteredInventory = godownName
      ? inventory.filter(item => item.godown?.name === godownName)
      : inventory;

    if (filteredInventory.length > 0) {
      const inventoryData = [
        ['Material', 'Unit', 'Quantity', 'Rate (Rs.)', 'Total Value (Rs.)']
      ];

      filteredInventory.forEach((item) => {
        inventoryData.push([
          item.material.name,
          item.material.unit,
          String(item.quantity),
          String(formatCurrency(item.rate)),
          String(formatCurrency(item.totalValue))
        ]);
      });

      const inventorySheet = XLSX.utils.aoa_to_sheet(inventoryData);
      inventorySheet['!cols'] = [
        { wch: 30 },
        { wch: 15 },
        { wch: 12 },
        { wch: 15 },
        { wch: 18 }
      ];
      XLSX.utils.book_append_sheet(workbook, inventorySheet, 'Inventory');

      // Summary
      const totalValue = filteredInventory.reduce((sum, item) => sum + item.totalValue, 0);
      const totalQuantity = filteredInventory.reduce((sum, item) => sum + item.quantity, 0);
      const summaryData = [
        ['Summary'],
        ['Total Materials', String(filteredInventory.length)],
        ['Total Quantity', String(totalQuantity)],
        ['Total Value (Rs.)', String(formatCurrency(totalValue))]
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    }
  }

  const fileName = godownName
    ? `Godown-Inventory-Report-${godownName.replace(/\s+/g, '-')}-${formatDate(new Date()).replace(/\s+/g, '-')}.xlsx`
    : `Godown-Inventory-Report-All-Godowns-${formatDate(new Date()).replace(/\s+/g, '-')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

