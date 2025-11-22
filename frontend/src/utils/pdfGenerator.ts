import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper function to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
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

// Types
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
  additions?: Array<{
    date: string;
    invoiceNumber: string;
    company: string;
    quantity: number;
    rate: number;
    totalValue: number;
    deliveredTo: string;
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

// Generate PDF for material-wise overview (all materials)
export const generateMaterialWiseOverviewPDF = (data: MaterialWiseData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(18);
  doc.text('Material-Wise Report - All Materials Overview', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, pageWidth / 2, 30, { align: 'center' });

  const yPos = 40;

  if (data.materialReports && data.materialReports.length > 0) {
    const tableData = data.materialReports.map((report: MaterialReport) => [
      report.material.name,
      report.material.unit,
      `${report.summary.totalAdded} ${report.material.unit}`,
      `${report.summary.totalDistributed} ${report.material.unit}`,
      `${report.summary.remaining} ${report.material.unit}`,
      report.siteDistribution.length > 0 
        ? report.siteDistribution.map((s) => `${s.siteName} (${s.quantity})`).join(', ')
        : 'N/A'
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Material', 'Unit', 'Total Added', 'Total Distributed', 'Remaining', 'Site Distribution']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 20 },
        2: { cellWidth: 30 },
        3: { cellWidth: 30 },
        4: { cellWidth: 30 },
        5: { cellWidth: 'auto' }
      }
    });

    // Summary
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text('Summary', 14, finalY);
    doc.setFontSize(10);
      const summary = data.summary as { totalMaterials?: number; totalAdded?: number; totalDistributed?: number } | undefined;
      doc.text(`Total Materials: ${summary?.totalMaterials || data.materialReports.length}`, 14, finalY + 10);
      doc.text(`Total Added: ${summary?.totalAdded || 0}`, 14, finalY + 17);
      doc.text(`Total Distributed: ${summary?.totalDistributed || 0}`, 14, finalY + 24);
  }

  const fileName = `Material-Wise-Report-All-Materials-${formatDate(new Date()).replace(/\s+/g, '-')}.pdf`;
  doc.save(fileName);
};

// Generate PDF for material-wise site overview (all sites for a material)
export const generateMaterialWiseSitesOverviewPDF = (data: MaterialWiseData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(18);
  doc.text('Material-Wise Report - Sites Overview', pageWidth / 2, 20, { align: 'center' });

  if (data.material) {
    doc.setFontSize(14);
    doc.text(`Material: ${data.material.name}`, pageWidth / 2, 30, { align: 'center' });
  }

  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, pageWidth / 2, 40, { align: 'center' });

  let yPos = 50;

  if (data.material) {
    // Material details
    doc.setFontSize(12);
    doc.text('Material Details', 14, yPos);
    yPos += 10;
    doc.setFontSize(10);
    doc.text(`Name: ${data.material.name}`, 14, yPos);
    yPos += 7;
    doc.text(`Unit: ${data.material.unit}`, 14, yPos);
    yPos += 7;
    if (data.material.hsnSac) {
      doc.text(`HSN/SAC: ${data.material.hsnSac}`, 14, yPos);
      yPos += 7;
    }
    yPos += 5;

    // Summary
    if (data.summary && data.material) {
      doc.setFontSize(12);
      doc.text('Summary', 14, yPos);
      yPos += 10;
      doc.setFontSize(10);
      doc.text(`Total Added: ${data.summary.totalAdded} ${data.material.unit}`, 14, yPos);
      yPos += 7;
      doc.text(`Total Distributed: ${data.summary.totalDistributed} ${data.material.unit}`, 14, yPos);
      yPos += 7;
      doc.text(`Remaining: ${data.summary.remaining} ${data.material.unit}`, 14, yPos);
      yPos += 15;
    }

    // Distribution table
    if (data.distribution && data.distribution.length > 0) {
      const pageHeight = doc.internal.pageSize.getHeight();
      if (yPos > pageHeight - 50) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.text('Distribution to Sites', 14, yPos);
      yPos += 10;

      const unit = data.material?.unit || '';
      const distributionData = data.distribution.map((dist) => [
        dist.siteName,
        `${dist.totalQuantity} ${unit}`,
        formatCurrency(dist.totalValue)
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Site Name', 'Total Quantity', 'Total Value']],
        body: distributionData,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [40, 167, 69] }
      });
    }
  }

  const materialName = (data.material?.name || 'Unknown').replace(/\s+/g, '-');
  const fileName = `Material-Wise-Report-Sites-Overview-${materialName}-${formatDate(new Date()).replace(/\s+/g, '-')}.pdf`;
  doc.save(fileName);
};

// Generate PDF for material-wise site details (specific site)
export const generateMaterialWiseSiteDetailsPDF = (data: MaterialWiseData, siteName: string) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(18);
  doc.text('Material-Wise Report - Site Details', pageWidth / 2, 20, { align: 'center' });

  if (data.material) {
    doc.setFontSize(14);
    doc.text(`Material: ${data.material.name} | Site: ${siteName}`, pageWidth / 2, 30, { align: 'center' });
  }

  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, pageWidth / 2, 40, { align: 'center' });

  let yPos = 50;

  // Find the specific site distribution
  const siteDistribution = data.distribution?.find((dist) => dist.siteName === siteName);

  if (siteDistribution && siteDistribution.issues && siteDistribution.issues.length > 0) {
    // Site details
    doc.setFontSize(12);
    doc.text(`Site: ${siteName}`, 14, yPos);
    yPos += 10;
    doc.setFontSize(10);
    if (data.material) {
      doc.text(`Total Quantity: ${siteDistribution.totalQuantity} ${data.material.unit}`, 14, yPos);
    }
    yPos += 7;
    doc.text(`Total Value: ${formatCurrency(siteDistribution.totalValue)}`, 14, yPos);
    yPos += 15;

    // Issues table
    if (siteDistribution.issues && siteDistribution.issues.length > 0 && data.material) {
      doc.setFontSize(12);
      doc.text('Material Issue Details', 14, yPos);
      yPos += 10;

      const unit = data.material.unit;
      const issuesData = siteDistribution.issues.map((issue) => [
        formatDate(issue.date),
        issue.issueId,
        `${issue.quantity} ${unit}`,
        formatCurrency(issue.rate),
        formatCurrency(issue.totalValue),
        issue.fromGodown || 'Direct'
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Date', 'Issue ID', 'Quantity', 'Rate', 'Total Value', 'From Godown']],
        body: issuesData,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [66, 139, 202] }
      });
    }
  }

  const materialName = (data.material?.name || 'Unknown').replace(/\s+/g, '-');
  const fileName = `Material-Wise-Report-Site-Details-${materialName}-${siteName.replace(/\s+/g, '-')}-${formatDate(new Date()).replace(/\s+/g, '-')}.pdf`;
  doc.save(fileName);
};

// Generate PDF for site-wise insights
export const generateSiteWisePDF = (data: SiteWiseData, siteName?: string, type: 'overview' | 'details' = 'overview') => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(18);
  doc.text(type === 'details' ? 'Site-Wise Material Report - Details' : 'Site-Wise Material Report - Overview', pageWidth / 2, 20, { align: 'center' });

  if (siteName) {
    doc.setFontSize(14);
    doc.text(`Site: ${siteName}`, pageWidth / 2, 30, { align: 'center' });
  }

  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, pageWidth / 2, 40, { align: 'center' });

  let yPos = 50;

  if (data.site && type === 'details') {
    // Site details
    doc.setFontSize(12);
    doc.text('Site Details', 14, yPos);
    yPos += 10;
    doc.setFontSize(10);
    doc.text(`Name: ${data.site.name}`, 14, yPos);
    yPos += 7;
    if (data.site.address) {
      doc.text(`Address: ${data.site.address}`, 14, yPos);
      yPos += 7;
    }
    yPos += 10;

    // Materials table
    if (data.materials && data.materials.length > 0) {
      const materialsData = data.materials.map((mat) => [
        mat.materialName,
        mat.unit,
        `${mat.totalQuantity} ${mat.unit}`,
        formatCurrency(mat.totalValue)
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Material', 'Unit', 'Total Quantity', 'Total Value']],
        body: materialsData,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [66, 139, 202] }
      });

      // Summary
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      const grandTotal = data.materials.reduce((sum: number, mat) => sum + mat.totalValue, 0);
      doc.setFontSize(12);
      doc.text('Summary', 14, finalY);
      doc.setFontSize(10);
      doc.text(`Total Materials: ${data.materials.length}`, 14, finalY + 10);
      doc.text(`Grand Total: ${formatCurrency(grandTotal)}`, 14, finalY + 17);
    }
  } else if (data.siteReports) {
    // Multiple sites overview
    const tableData = data.siteReports.map((report: SiteReport) => [
      report.site.name,
      report.site.address || 'N/A',
      report.materials.length.toString(),
      formatCurrency(report.grandTotal)
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Site Name', 'Address', 'Materials Count', 'Grand Total']],
      body: tableData,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [66, 139, 202] }
    });

    // Summary
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text('Summary', 14, finalY);
    doc.setFontSize(10);
    doc.text(`Total Sites: ${data.summary?.totalSites || data.siteReports.length}`, 14, finalY + 10);
    doc.text(`Total Materials: ${data.summary?.totalMaterials || 0}`, 14, finalY + 17);
    doc.text(`Overall Total: ${formatCurrency(data.summary?.overallTotal || 0)}`, 14, finalY + 24);
  }

  const fileName = siteName 
    ? `Site-Wise-Report-${siteName.replace(/\s+/g, '-')}-${formatDate(new Date()).replace(/\s+/g, '-')}.pdf`
    : `Site-Wise-Report-All-Sites-${formatDate(new Date()).replace(/\s+/g, '-')}.pdf`;
  doc.save(fileName);
};

// Generate PDF for godown-wise inventory insights
export const generateGodownInventoryPDF = (inventory: InventoryItem[], godownName?: string, type: 'all' | 'godown' = 'all') => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(18);
  if (type === 'godown' && godownName) {
    doc.text('Godown Inventory Report - Godown Details', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text(`Godown: ${godownName}`, pageWidth / 2, 30, { align: 'center' });
  } else {
    doc.text('Godown Inventory Report - All Godowns Summary', pageWidth / 2, 20, { align: 'center' });
  }

  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, pageWidth / 2, type === 'godown' ? 40 : 30, { align: 'center' });

  const yPos = type === 'godown' ? 50 : 40;

  if (type === 'all') {
    // Group by godown
    const godownGroups: { [key: string]: InventoryItem[] } = {};
    inventory.forEach(item => {
      const godownName = item.godown?.name || 'Direct';
      if (!godownGroups[godownName]) {
        godownGroups[godownName] = [];
      }
      godownGroups[godownName].push(item);
    });

    // Summary table
    const summaryData = Object.entries(godownGroups).map((entry) => {
      const [godownName, items] = entry as [string, InventoryItem[]];
      const totalValue = items.reduce((sum, item) => sum + item.totalValue, 0);
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
      return [
        godownName,
        items.length.toString(),
        totalQuantity.toFixed(2),
        formatCurrency(totalValue)
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['Godown Name', 'Materials Count', 'Total Quantity', 'Total Value']],
      body: summaryData,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [66, 139, 202] }
    });

    // Overall summary
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    const overallTotal = inventory.reduce((sum, item) => sum + item.totalValue, 0);
    const overallQuantity = inventory.reduce((sum, item) => sum + item.quantity, 0);
    doc.setFontSize(12);
    doc.text('Overall Summary', 14, finalY);
    doc.setFontSize(10);
    doc.text(`Total Godowns: ${Object.keys(godownGroups).length}`, 14, finalY + 10);
    doc.text(`Total Materials: ${inventory.length}`, 14, finalY + 17);
    doc.text(`Total Quantity: ${overallQuantity.toFixed(2)}`, 14, finalY + 24);
    doc.text(`Total Value: ${formatCurrency(overallTotal)}`, 14, finalY + 31);
  } else {
    // Specific godown details
    const filteredInventory = godownName 
      ? inventory.filter(item => item.godown?.name === godownName)
      : inventory;

    if (filteredInventory.length > 0) {
      const tableData = filteredInventory.map((item) => [
        item.material.name,
        item.material.unit,
        `${item.quantity} ${item.material.unit}`,
        formatCurrency(item.rate),
        formatCurrency(item.totalValue)
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Material', 'Unit', 'Quantity', 'Rate', 'Total Value']],
        body: tableData,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [66, 139, 202] }
      });

      // Summary
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      const totalValue = filteredInventory.reduce((sum, item) => sum + item.totalValue, 0);
      const totalQuantity = filteredInventory.reduce((sum, item) => sum + item.quantity, 0);
      doc.setFontSize(12);
      doc.text('Summary', 14, finalY);
      doc.setFontSize(10);
      doc.text(`Total Materials: ${filteredInventory.length}`, 14, finalY + 10);
      doc.text(`Total Quantity: ${totalQuantity.toFixed(2)}`, 14, finalY + 17);
      doc.text(`Total Value: ${formatCurrency(totalValue)}`, 14, finalY + 24);
    }
  }

  const fileName = godownName
    ? `Godown-Inventory-Report-${godownName.replace(/\s+/g, '-')}-${formatDate(new Date()).replace(/\s+/g, '-')}.pdf`
    : `Godown-Inventory-Report-All-Godowns-${formatDate(new Date()).replace(/\s+/g, '-')}.pdf`;
  doc.save(fileName);
};
