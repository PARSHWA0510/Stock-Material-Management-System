const XLSX = require('xlsx');

// Generate Companies Excel file
const companiesData = [
  { 
    Name: 'ABC Construction Ltd', 
    GSTIN: '29ABCDE1234F1Z5', 
    Address: '123 Main Street, Mumbai, Maharashtra 400001',
    'Contact Person': 'Rajesh Kumar',
    'Mobile Number': '9876543210',
    'Email ID': 'rajesh.kumar@abcconstruction.com'
  },
  { 
    Name: 'XYZ Builders Pvt Ltd', 
    GSTIN: '30FGHIJ5678K2L6', 
    Address: '456 Park Avenue, Delhi, Delhi 110001',
    'Contact Person': 'Priya Sharma',
    'Mobile Number': '9876543211',
    'Email ID': 'priya.sharma@xyzbuilders.com'
  },
  { 
    Name: 'DEF Materials Co', 
    GSTIN: '27KLMNO9012P3Q7', 
    Address: '789 Industrial Area, Bangalore, Karnataka 560001',
    'Contact Person': 'Amit Patel',
    'Mobile Number': '9876543212',
    'Email ID': 'amit.patel@defmaterials.com'
  },
  { 
    Name: 'GHI Suppliers', 
    GSTIN: '', 
    Address: '321 Trade Center, Pune, Maharashtra 411001',
    'Contact Person': 'Sneha Desai',
    'Mobile Number': '9876543213',
    'Email ID': 'sneha.desai@ghisuppliers.com'
  },
  { 
    Name: 'JKL Enterprises', 
    GSTIN: '24RSTUV3456W4X8', 
    Address: '654 Business Park, Hyderabad, Telangana 500001',
    'Contact Person': 'Vikram Singh',
    'Mobile Number': '9876543214',
    'Email ID': 'vikram.singh@jklenterprises.com'
  }
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

