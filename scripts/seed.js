/**
 * Seed Script
 *
 * Creates a baseline admin user (in Firebase Auth + Firestore) and a
 * sample station document. Idempotent: re-running is safe — existing
 * records are detected and skipped.
 *
 *   node scripts/seed.js
 *
 * Required env vars (loaded via .env):
 *   - FIREBASE_SERVICE_ACCOUNT
 *
 * Optional:
 *   - SEED_ADMIN_EMAIL    (default: admin@krizot.local)
 *   - SEED_ADMIN_PASSWORD (default: ChangeMe123!)
 *   - SEED_ADMIN_NAME     (default: Admin)
 */

'use strict';

require('dotenv').config();

const { auth, db, FieldValue } = require('../src/config/firebaseAdmin');

const ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL || 'admin@krizot.ai').toLowerCase();
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
const ADMIN_NAME = process.env.SEED_ADMIN_NAME || 'Admin';

async function ensureAdminUser() {
  let user;
  try {
    user = await auth.getUserByEmail(ADMIN_EMAIL);
    console.log(`Admin user already exists: ${user.uid}`);
  } catch (err) {
    if (err.code !== 'auth/user-not-found') throw err;
    user = await auth.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      displayName: ADMIN_NAME,
    });
    console.log(`Created admin user: ${user.uid}`);
  }

  await auth.setCustomUserClaims(user.uid, { role: 'admin' });

  const profileRef = db.collection('users').doc(user.uid);
  const snap = await profileRef.get();
  if (!snap.exists) {
    await profileRef.set({
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      role: 'admin',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log('Wrote admin profile to Firestore.');
  }
}

async function ensureSampleStation() {
  const existing = await db
    .collection('stations')
    .where('name', '==', 'Main Gate')
    .limit(1)
    .get();
  if (!existing.empty) {
    console.log('Sample station already exists.');
    return;
  }
  const ref = await db.collection('stations').add({
    name: 'Main Gate',
    location: 'North entrance',
    capacity: 4,
    status: 'ACTIVE',
    notes: 'Seeded by scripts/seed.js',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  console.log(`Created sample station: ${ref.id}`);
}

(async () => {
  try {
    await ensureAdminUser();
    await ensureSampleStation();
    console.log('Seed complete.');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
})();
