/**
 * User Model — Firestore + Firebase Auth
 *
 * Users live in two places:
 *   - Firebase Auth (credentials, uid, disabled flag, custom claims)
 *   - Firestore `users/{uid}` (profile metadata: name, role, timestamps)
 *
 * The doc id is always the Firebase Auth UID.
 */

'use strict';

const { db, auth, FieldValue } = require('../config/firebaseAdmin');

const USERS_COLLECTION = 'users';

function userDocToObject(doc) {
  if (!doc.exists) return null;
  const data = doc.data();
  return {
    id: doc.id,
    email: data.email,
    name: data.name,
    role: data.role,
    createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
    updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
  };
}

async function findUserById(id) {
  const snap = await db.collection(USERS_COLLECTION).doc(id).get();
  return userDocToObject(snap);
}

async function findUserByEmail(email) {
  const normalized = email.toLowerCase().trim();
  const snap = await db
    .collection(USERS_COLLECTION)
    .where('email', '==', normalized)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return userDocToObject(snap.docs[0]);
}

async function listUsers({ limit = 20, role, cursor } = {}) {
  let query = db.collection(USERS_COLLECTION).orderBy('createdAt', 'desc');
  if (role) query = query.where('role', '==', role);
  if (cursor) {
    const cursorSnap = await db.collection(USERS_COLLECTION).doc(cursor).get();
    if (cursorSnap.exists) query = query.startAfter(cursorSnap);
  }
  const snap = await query.limit(limit).get();
  const users = snap.docs.map(userDocToObject);
  const nextCursor = snap.docs.length === limit ? snap.docs[snap.docs.length - 1].id : null;
  return { users, nextCursor };
}

/**
 * Create both the Firebase Auth user AND the profile doc.
 * Returns the public profile.
 */
async function createUser({ email, password, name, role = 'manager' }) {
  const normalizedEmail = email.toLowerCase().trim();
  const userRecord = await auth.createUser({
    email: normalizedEmail,
    password,
    displayName: name,
  });

  await auth.setCustomUserClaims(userRecord.uid, { role });

  const now = FieldValue.serverTimestamp();
  await db.collection(USERS_COLLECTION).doc(userRecord.uid).set({
    email: normalizedEmail,
    name: name.trim(),
    role,
    createdAt: now,
    updatedAt: now,
  });

  return findUserById(userRecord.uid);
}

/**
 * Update Firestore profile (and Firebase Auth fields when relevant).
 * Allowed fields: name, email, role, password.
 */
async function updateUser(id, data) {
  const authUpdate = {};
  const profileUpdate = { updatedAt: FieldValue.serverTimestamp() };

  if (data.email) {
    const email = data.email.toLowerCase().trim();
    authUpdate.email = email;
    profileUpdate.email = email;
  }
  if (data.name) {
    authUpdate.displayName = data.name.trim();
    profileUpdate.name = data.name.trim();
  }
  if (data.password) {
    authUpdate.password = data.password;
  }
  if (data.role) {
    profileUpdate.role = data.role;
  }

  if (Object.keys(authUpdate).length > 0) {
    await auth.updateUser(id, authUpdate);
  }
  if (data.role) {
    await auth.setCustomUserClaims(id, { role: data.role });
  }

  await db.collection(USERS_COLLECTION).doc(id).update(profileUpdate);

  return findUserById(id);
}

async function deleteUser(id) {
  await auth.deleteUser(id);
  await db.collection(USERS_COLLECTION).doc(id).delete();
}

module.exports = {
  USERS_COLLECTION,
  findUserById,
  findUserByEmail,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
};
