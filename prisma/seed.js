/**
 * Database Seed Script
 *
 * Creates initial admin user and sample data for development.
 * Run with: node prisma/seed.js
 */

require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Create Admin User ────────────────────────────────────────────────────
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

  // ─── Create Manager User ──────────────────────────────────────────────────
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

  // ─── Create Sample Stations ───────────────────────────────────────────────
  const stations = await Promise.all([
    prisma.station.upsert({
      where: { id: 'station-alpha' },
      update: {},
      create: {
        id: 'station-alpha',
        name: 'Alpha Station',
        location: 'North Sector',
        capacity: 4,
        status: 'active',
        notes: 'Main entry point station',
      },
    }),
    prisma.station.upsert({
      where: { id: 'station-beta' },
      update: {},
      create: {
        id: 'station-beta',
        name: 'Beta Station',
        location: 'South Sector',
        capacity: 2,
        status: 'active',
        notes: 'Secondary checkpoint',
      },
    }),
    prisma.station.upsert({
      where: { id: 'station-gamma' },
      update: {},
      create: {
        id: 'station-gamma',
        name: 'Gamma Station',
        location: 'Central',
        capacity: 6,
        status: 'active',
        notes: 'Command center',
      },
    }),
  ]);
  console.log(`✅ Created ${stations.length} stations`);

  console.log('\n🎉 Seed complete!');
  console.log('\nDefault credentials:');
  console.log('  Admin:   admin@krizot.com / Admin@123456');
  console.log('  Manager: manager@krizot.com / Manager@123456');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
