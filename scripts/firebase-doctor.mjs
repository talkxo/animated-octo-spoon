import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredEnvKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

const placeholderValues = new Set([
  '',
  'your_api_key_here',
  'your_auth_domain_here',
  'your_project_id_here',
  'your_storage_bucket_here',
  'your_messaging_sender_id_here',
  'your_app_id_here',
]);

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const env = {};
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    env[key] = value;
  }

  return env;
}

function printCheck(ok, message) {
  const prefix = ok ? 'OK' : 'MISSING';
  console.log(`${prefix}  ${message}`);
}

const envPath = path.join(root, '.env');
const firebasercPath = path.join(root, '.firebaserc');
const firebaseJsonPath = path.join(root, 'firebase.json');
const firestoreRulesPath = path.join(root, 'firestore.rules');
const firestoreIndexesPath = path.join(root, 'firestore.indexes.json');

const env = readEnvFile(envPath);
const missingEnvKeys = requiredEnvKeys.filter((key) => {
  const value = env[key];
  return !value || placeholderValues.has(value);
});

console.log('Pluto Firebase Doctor');
console.log('');

printCheck(fs.existsSync(firebaseJsonPath), 'firebase.json is present');
printCheck(fs.existsSync(firestoreRulesPath), 'firestore.rules is present');
printCheck(fs.existsSync(firestoreIndexesPath), 'firestore.indexes.json is present');
printCheck(fs.existsSync(envPath), '.env file exists');

for (const key of requiredEnvKeys) {
  const value = env[key];
  printCheck(Boolean(value) && !placeholderValues.has(value), `${key} is configured`);
}

let firebasercProjectId = '';
if (fs.existsSync(firebasercPath)) {
  try {
    const parsed = JSON.parse(fs.readFileSync(firebasercPath, 'utf8'));
    firebasercProjectId = parsed?.projects?.default || '';
  } catch (_) {
    firebasercProjectId = '';
  }
}

printCheck(Boolean(firebasercProjectId), '.firebaserc has a default Firebase project');

console.log('');

if (!fs.existsSync(envPath)) {
  console.log('Next: copy .env.example to .env and paste your Firebase web app config values.');
} else if (missingEnvKeys.length > 0) {
  console.log(`Next: fill the missing Firebase env values in .env (${missingEnvKeys.join(', ')}).`);
}

if (!firebasercProjectId) {
  console.log('Next: create .firebaserc from .firebaserc.example and set your real Firebase project id.');
}

if (missingEnvKeys.length === 0 && firebasercProjectId) {
  console.log('Repo setup looks ready.');
  console.log('Then run: npm run firebase:login');
  console.log('After login, run: npm run firebase:deploy');
}
