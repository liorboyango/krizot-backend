/**
 * Database Seed Script
 * Creates initial admin user and sample data for development
 * Run: node prisma/seed.js
 */

'use strict';

require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin@123!', 12);
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
  console.log(`✅ Admin user created: ${admin.email}`);

  // Create manager user
  const managerPassword = await bcrypt.hash('Manager@123!', 12);
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
  console.log(`✅ Manager user created: ${manager.email}`);

  // Create sample stations
  const stations = [
    { name: 'Alpha Station', location: 'North Sector', capacity: 4, status: 'active' },
    { name: 'Beta Station', location: 'South Sector', capacity: 2, status: 'active' },
    { name: 'Gamma Station', location: 'Central', capacity: 6, status: 'active' },
    { name: 'Delta Station', location: 'East Wing', capacity: 3, status: 'maintenance' },
  ];

  for (const stationData of stations) {
    const station = await prisma.station.upsert({
      where: { id: stationData.name }, // Use name as temp key
      update: {},
      create: stationData,
    }).catch(async () => {
      // If upsert fails (no unique constraint on name), just create
      return prisma.station.create({ data: stationData });
    });
    console.log(`✅ Station created: ${station.name}`);
  }

  console.log('\n🎉 Database seed completed successfully!');
  console.log('\nDefault credentials:');
  console.log('  Admin:   admin@krizot.com / Admin@123!');
  console.log('  Manager: manager@krizot.com / Manager@123!');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
