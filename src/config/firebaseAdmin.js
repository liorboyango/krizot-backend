/**
 * Firebase Admin SDK Singleton
 *
 * Initialises the Firebase Admin SDK from the FIREBASE_SERVICE_ACCOUNT
 * env var (full JSON string). Exposes the admin app, Firestore, and Auth
 * instances for the rest of the application to consume.
 */

'use strict';

const admin = require('firebase-admin');
const env = require('./env');

function loadServiceAccount() {
  const raw = env.firebase.serviceAccount;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[FIREBASE] FIREBASE_SERVICE_ACCOUNT is not valid JSON:', err.message);
    process.exit(1);
  }

  if (!parsed.project_id || !parsed.private_key || !parsed.client_email) {
    // eslint-disable-next-line no-console
    console.error(
      '[FIREBASE] FIREBASE_SERVICE_ACCOUNT JSON is missing required fields (project_id, private_key, client_email).'
    );
    process.exit(1);
  }

  // Some hosting platforms escape newlines in env vars — normalise them back.
  if (typeof parsed.private_key === 'string') {
    parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
  }
  return parsed;
}

if (!admin.apps.length) {
  const serviceAccount = loadServiceAccount();
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

const auth = admin.auth();

module.exports = {
  admin,
  db,
  auth,
  Timestamp: admin.firestore.Timestamp,
  FieldValue: admin.firestore.FieldValue,
};
