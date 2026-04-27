/**
 * Prisma Database Seeder
 * Seeds initial admin user and sample stations for development
 */

'use strict';

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create default admin user
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@krizot.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@123456';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'System Admin',
        role: 'ADMIN',
      },
    });
    console.log(`✅ Created admin user: ${admin.email}`);
  } else {
    console.log(`ℹ️  Admin user already exists: ${adminEmail}`);
  }

  // Create sample stations for development
  const sampleStations = [
    { name: 'Alpha Station', location: 'North Sector', capacity: 4, status: 'ACTIVE', notes: 'Main entrance post' },
    { name: 'Beta Station', location: 'South Sector', capacity: 2, status: 'ACTIVE', notes: 'Secondary checkpoint' },
    { name: 'Gamma Station', location: 'Central', capacity: 6, status: 'ACTIVE', notes: 'Command center' },
    { name: 'Delta Station', location: 'East Wing', capacity: 3, status: 'CLOSED', notes: 'Under maintenance' },
  ];

  for (const stationData of sampleStations) {
    const existing = await prisma.station.findFirst({
      where: { name: stationData.name },
    });

    if (!existing) {
      const station = await prisma.station.create({ data: stationData });
      console.log(`✅ Created station: ${station.name}`);
    } else {
      console.log(`ℹ️  Station already exists: ${stationData.name}`);
    }
  }

  console.log('🎉 Database seed completed successfully!');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
