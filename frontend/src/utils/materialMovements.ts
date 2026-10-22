export interface MaterialMovementRow {
  key: string;
  date: string;
  sortType: number;
  type: 'INWARD' | 'OUTWARD';
  reference: string;
  details: string;
  location: string;
  inwardQty: number;
  outwardQty: number;
  remaining: number;
  value: number;
}

export const getMaterialMovements = (report: any): MaterialMovementRow[] => {
  const rows: Omit<MaterialMovementRow, 'remaining'>[] = [];

  (report?.additions || []).forEach((addition: any, idx: number) => {
    rows.push({
      key: `in-${addition.purchaseBillId || idx}`,
      date: addition.date,
      sortType: 0,
      type: 'INWARD',
      reference: addition.invoiceNumber,
      details: addition.company,
      location: addition.deliveredToName
        ? `${addition.deliveredToName}${addition.deliveredTo ? ` (${addition.deliveredTo})` : ''}`
        : (addition.deliveredTo || '-'),
      inwardQty: Number(addition.quantity) || 0,
      outwardQty: 0,
      value: Number(addition.totalValue) || 0
    });
  });

  (report?.distribution || []).forEach((dist: any) => {
    (dist.issues || []).forEach((issue: any, issueIdx: number) => {
      rows.push({
        key: `out-${dist.siteName}-${issue.issueId || issueIdx}`,
        date: issue.date,
        sortType: 1,
        type: 'OUTWARD',
        reference: issue.issueId,
        details: dist.siteName,
        location: issue.fromGodown ? `From ${issue.fromGodown}` : 'Direct',
        inwardQty: 0,
        outwardQty: Number(issue.quantity) || 0,
        value: Number(issue.totalValue) || 0
      });
    });
  });

  rows.sort((a, b) => {
    const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return a.sortType - b.sortType;
  });

  let remaining = 0;
  return rows.map((row) => {
    remaining += row.inwardQty - row.outwardQty;
    return { ...row, remaining };
  });
};
