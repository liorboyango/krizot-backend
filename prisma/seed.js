/**
 * Database Seed Script
 * Populates the database with initial data for development/testing
 * Run with: npx prisma db seed
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data (in reverse dependency order)
  await prisma.schedule.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.station.deleteMany();
  await prisma.user.deleteMany();

  console.log('🗑️  Cleared existing data');

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin@123456', 12);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@krizot.com',
      password: adminPassword,
      firstName: 'System',
      lastName: 'Admin',
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log(`✅ Created admin user: ${admin.email}`);

  // Create manager users
  const managerPassword = await bcrypt.hash('Manager@123456', 12);
  const managers = await Promise.all([
    prisma.user.create({
      data: {
        email: 'j.cohen@krizot.com',
        password: managerPassword,
        firstName: 'Jacob',
        lastName: 'Cohen',
        role: 'MANAGER',
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'r.levi@krizot.com',
        password: managerPassword,
        firstName: 'Rachel',
        lastName: 'Levi',
        role: 'MANAGER',
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'a.mizrahi@krizot.com',
        password: managerPassword,
        firstName: 'Avi',
        lastName: 'Mizrahi',
        role: 'MANAGER',
        isActive: true,
      },
    }),
  ]);
  console.log(`✅ Created ${managers.length} manager users`);

  // Create stations
  const stations = await Promise.all([
    prisma.station.create({
      data: {
        name: 'Alpha Station',
        location: 'North Sector',
        capacity: 4,
        status: 'ACTIVE',
        notes: 'Primary northern command post',
      },
    }),
    prisma.station.create({
      data: {
        name: 'Beta Station',
        location: 'South Sector',
        capacity: 2,
        status: 'ACTIVE',
        notes: 'Southern monitoring post',
      },
    }),
    prisma.station.create({
      data: {
        name: 'Gamma Station',
        location: 'Central',
        capacity: 6,
        status: 'ACTIVE',
        notes: 'Central operations hub',
      },
    }),
    prisma.station.create({
      data: {
        name: 'Delta Station',
        location: 'East Wing',
        capacity: 3,
        status: 'MAINTENANCE',
        notes: 'Under scheduled maintenance',
      },
    }),
    prisma.station.create({
      data: {
        name: 'Echo Station',
        location: 'West Wing',
        capacity: 2,
        status: 'CLOSED',
        notes: 'Temporarily closed',
      },
    }),
  ]);
  console.log(`✅ Created ${stations.length} stations`);

  // Create sample schedules for today and the next 7 days
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const scheduleData = [];

  // Today's schedules
  scheduleData.push(
    {
      stationId: stations[0].id, // Alpha
      userId: managers[0].id,    // J. Cohen
      startTime: new Date(today.getTime() + 7 * 60 * 60 * 1000),  // 07:00
      endTime: new Date(today.getTime() + 15 * 60 * 60 * 1000),   // 15:00
      status: 'COVERED',
    },
    {
      stationId: stations[1].id, // Beta
      userId: null,
      startTime: new Date(today.getTime() + 7 * 60 * 60 * 1000),  // 07:00
      endTime: new Date(today.getTime() + 15 * 60 * 60 * 1000),   // 15:00
      status: 'OPEN',
    },
    {
      stationId: stations[2].id, // Gamma
      userId: managers[1].id,    // R. Levi
      startTime: new Date(today.getTime() + 15 * 60 * 60 * 1000), // 15:00
      endTime: new Date(today.getTime() + 23 * 60 * 60 * 1000),   // 23:00
      status: 'ASSIGNED',
    },
    {
      stationId: stations[0].id, // Alpha
      userId: null,
      startTime: new Date(today.getTime() + 23 * 60 * 60 * 1000), // 23:00
      endTime: new Date(today.getTime() + 31 * 60 * 60 * 1000),   // 07:00 next day
      status: 'CRITICAL',
    }
  );

  // Next 3 days schedules
  for (let day = 1; day <= 3; day++) {
    const dayStart = new Date(today.getTime() + day * 24 * 60 * 60 * 1000);
    scheduleData.push(
      {
        stationId: stations[0].id,
        userId: managers[day % 3].id,
        startTime: new Date(dayStart.getTime() + 7 * 60 * 60 * 1000),
        endTime: new Date(dayStart.getTime() + 15 * 60 * 60 * 1000),
        status: 'ASSIGNED',
      },
      {
        stationId: stations[1].id,
        userId: null,
        startTime: new Date(dayStart.getTime() + 7 * 60 * 60 * 1000),
        endTime: new Date(dayStart.getTime() + 15 * 60 * 60 * 1000),
        status: 'OPEN',
      },
      {
        stationId: stations[2].id,
        userId: managers[(day + 1) % 3].id,
        startTime: new Date(dayStart.getTime() + 15 * 60 * 60 * 1000),
        endTime: new Date(dayStart.getTime() + 23 * 60 * 60 * 1000),
        status: 'ASSIGNED',
      }
    );
  }

  await prisma.schedule.createMany({ data: scheduleData });
  console.log(`✅ Created ${scheduleData.length} schedules`);

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📋 Default credentials:');
  console.log('   Admin:   admin@krizot.com / Admin@123456');
  console.log('   Manager: j.cohen@krizot.com / Manager@123456');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
