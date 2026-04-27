/**
 * Database Seed Script
 * Creates initial admin user and sample data for development.
 */

'use strict';

require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin@123456', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@krizot.com' },
    update: {},
    create: {
      email: 'admin@krizot.com',
      password: adminPassword,
      name: 'System Admin',
      role: 'admin',
    },
  });
  console.log(`✅ Admin user: ${admin.email}`);

  // Create manager user
  const managerPassword = await bcrypt.hash('Manager@123456', 12);
  const manager = await prisma.user.upsert({
    where: { email: 'manager@krizot.com' },
    update: {},
    create: {
      email: 'manager@krizot.com',
      password: managerPassword,
      name: 'Shift Manager',
      role: 'manager',
    },
  });
  console.log(`✅ Manager user: ${manager.email}`);

  // Create sample stations
  const stations = [
    { name: 'Alpha Station', location: 'North Sector', capacity: 4 },
    { name: 'Beta Station', location: 'South Sector', capacity: 2 },
    { name: 'Gamma Station', location: 'Central', capacity: 6 },
    { name: 'Delta Station', location: 'East Wing', capacity: 3 },
  ];

  for (const stationData of stations) {
    const station = await prisma.station.create({ data: stationData });
    console.log(`✅ Station: ${station.name} (${station.location})`);
  }

  console.log('\n🎉 Seed completed successfully!');
  console.log('\nDefault credentials:');
  console.log('  Admin:   admin@krizot.com / Admin@123456');
  console.log('  Manager: manager@krizot.com / Manager@123456');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
