/**
 * Script to generate base64-encoded Firebase service account from .env variables
 * Run this locally to get the base64 string for GitHub Secrets
 */

require('dotenv').config();

const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    // These are standard fields that Firebase expects
    private_key_id: "",
    client_id: "",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.FIREBASE_CLIENT_EMAIL)}`
};

// Convert to JSON string
const jsonString = JSON.stringify(serviceAccount, null, 2);

// Convert to base64
const base64String = Buffer.from(jsonString).toString('base64');

console.log('\n========================================');
console.log('Firebase Service Account (JSON):');
console.log('========================================');
console.log(jsonString);
console.log('\n========================================');
console.log('Base64 Encoded (for GitHub Secret):');
console.log('========================================');
console.log(base64String);
console.log('\n========================================');
console.log('Instructions:');
console.log('========================================');
console.log('1. Copy the base64 string above');
console.log('2. Go to GitHub repo → Settings → Secrets and variables → Actions');
console.log('3. Create a new secret named: FIREBASE_SERVICE_ACCOUNT_BASE64');
console.log('4. Paste the base64 string as the value');
console.log('5. Save the secret');
console.log('========================================\n');
