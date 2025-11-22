const XLSX = require('xlsx');

// Generate Companies Excel file
const companiesData = [
  { Name: 'ABC Construction Ltd', GSTIN: '29ABCDE1234F1Z5', Address: '123 Main Street, Mumbai, Maharashtra 400001' },
  { Name: 'XYZ Builders Pvt Ltd', GSTIN: '30FGHIJ5678K2L6', Address: '456 Park Avenue, Delhi, Delhi 110001' },
  { Name: 'DEF Materials Co', GSTIN: '27KLMNO9012P3Q7', Address: '789 Industrial Area, Bangalore, Karnataka 560001' },
  { Name: 'GHI Suppliers', GSTIN: '', Address: '321 Trade Center, Pune, Maharashtra 411001' },
  { Name: 'JKL Enterprises', GSTIN: '24RSTUV3456W4X8', Address: '654 Business Park, Hyderabad, Telangana 500001' }
];

const companiesWorkbook = XLSX.utils.book_new();
const companiesWorksheet = XLSX.utils.json_to_sheet(companiesData);
XLSX.utils.book_append_sheet(companiesWorkbook, companiesWorksheet, 'Companies');
XLSX.writeFile(companiesWorkbook, 'sample-companies.xlsx');
console.log('✅ Created sample-companies.xlsx');

// Generate Materials Excel file
const materialsData = [
  { Name: 'Cement', Unit: 'Bag', 'HSN/SAC': '25232910' },
  { Name: 'Steel Rod', Unit: 'Meter', 'HSN/SAC': '72142000' },
  { Name: 'Bricks', Unit: 'Pieces', 'HSN/SAC': '69010000' },
  { Name: 'Sand', Unit: 'Cubic Feet', 'HSN/SAC': '25051000' },
  { Name: 'Cable', Unit: 'Meter', 'HSN/SAC': '85444220' },
  { Name: 'LED Light', Unit: 'Number', 'HSN/SAC': '85395000' },
  { Name: 'Paint', Unit: 'Liter', 'HSN/SAC': '32091000' },
  { Name: 'Tiles', Unit: 'Square Feet', 'HSN/SAC': '69089000' }
];

const materialsWorkbook = XLSX.utils.book_new();
const materialsWorksheet = XLSX.utils.json_to_sheet(materialsData);
XLSX.utils.book_append_sheet(materialsWorkbook, materialsWorksheet, 'Materials');
XLSX.writeFile(materialsWorkbook, 'sample-materials.xlsx');
console.log('✅ Created sample-materials.xlsx');

console.log('\n📝 Sample Excel files created successfully!');
console.log('   - sample-companies.xlsx (for Companies upload)');
console.log('   - sample-materials.xlsx (for Materials upload)');

