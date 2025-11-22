import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addDummyCompanyData() {
  try {
    console.log('🔄 Adding dummy contact data to existing companies...\n');

    // Get all companies without contact data
    const companies = await prisma.company.findMany({
      where: {
        OR: [
          { contactPerson: null },
          { mobileNumber: null },
          { emailId: null }
        ]
      }
    });

    console.log(`Found ${companies.length} companies to update\n`);

    // Dummy data arrays
    const contactPersons = [
      'Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Sneha Desai',
      'Vikram Singh', 'Anjali Mehta', 'Rahul Gupta', 'Kavita Shah',
      'Suresh Reddy', 'Meera Nair', 'Deepak Joshi', 'Sunita Agarwal'
    ];

    const mobileNumbers = [
      '9876543210', '9876543211', '9876543212', '9876543213',
      '9876543214', '9876543215', '9876543216', '9876543217',
      '9876543218', '9876543219', '9876543220', '9876543221'
    ];

    const emailDomains = [
      'gmail.com', 'yahoo.com', 'outlook.com', 'company.com',
      'business.in', 'enterprise.co.in', 'corp.in', 'group.com'
    ];

    let updated = 0;

    for (const company of companies) {
      const randomIndex = Math.floor(Math.random() * contactPersons.length);
      const contactPerson = company.contactPerson || contactPersons[randomIndex];
      const mobileNumber = company.mobileNumber || mobileNumbers[randomIndex];
      const emailId = company.emailId || `${company.name.toLowerCase().replace(/\s+/g, '.')}@${emailDomains[randomIndex % emailDomains.length]}`;

      await prisma.company.update({
        where: { id: company.id },
        data: {
          contactPerson,
          mobileNumber,
          emailId
        }
      });

      console.log(`✓ Updated: ${company.name}`);
      updated++;
    }

    console.log(`\n✅ Successfully updated ${updated} companies with dummy contact data!`);
  } catch (error) {
    console.error('❌ Error adding dummy data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addDummyCompanyData()
  .then(() => {
    console.log('\n✨ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });

