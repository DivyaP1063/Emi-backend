# Firebase Setup Guide for GitHub Actions

This guide explains how to properly configure Firebase credentials for the EMI reminder cron job in GitHub Actions.

## Problem

The Firebase Admin SDK requires a service account JSON file with a private key. When storing this in GitHub Secrets, the private key's newline characters can cause issues, resulting in the error:

```
invalid_grant: Invalid JWT Signature
```

## Solution: Use Base64-Encoded Service Account JSON

The recommended approach is to encode your entire Firebase service account JSON file as base64 and store it as a single GitHub Secret.

---

## Step-by-Step Setup

### 1. Get Your Firebase Service Account JSON

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon ⚙️ → **Project settings**
4. Go to **Service accounts** tab
5. Click **Generate new private key**
6. Save the downloaded JSON file (e.g., `firebase-service-account.json`)

### 2. Convert to Base64

**On Windows (PowerShell):**
```powershell
# Replace the path with your actual file path
$filePath = "C:\path\to\firebase-service-account.json"
$bytes = [System.IO.File]::ReadAllBytes($filePath)
$base64 = [Convert]::ToBase64String($bytes)
$base64 | Set-Clipboard
Write-Host "Base64 string copied to clipboard!"
```

**On macOS/Linux:**
```bash
base64 -i firebase-service-account.json | pbcopy
# Or without copying to clipboard:
base64 -i firebase-service-account.json
```

**Alternative - Manual Method:**
1. Open your `firebase-service-account.json` file
2. Copy the entire contents
3. Go to https://www.base64encode.org/ (or any trusted base64 encoder)
4. Paste the JSON content and encode it
5. Copy the base64 result

### 3. Add to GitHub Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secret:

   **Name:** `FIREBASE_SERVICE_ACCOUNT_BASE64`
   
   **Value:** Paste the base64 string from Step 2

5. Click **Add secret**

### 4. Add MongoDB URI Secret

If you haven't already, add your MongoDB connection string:

1. Click **New repository secret**
2. **Name:** `MONGODB_URI`
3. **Value:** Your MongoDB connection string (e.g., `mongodb+srv://username:password@cluster.mongodb.net/dbname`)
4. Click **Add secret**

---

## Verify Setup

### Local Testing (Optional)

Before deploying to GitHub Actions, you can test locally:

1. Add to your `.env` file:
   ```env
   FIREBASE_SERVICE_ACCOUNT_BASE64=<your-base64-string>
   MONGODB_URI=<your-mongodb-uri>
   ```

2. Run the cron job locally:
   ```bash
   node src/cron/emiReminderCron.js
   ```

3. You should see:
   ```
   ✅ Firebase initialized with base64-encoded service account
   ✅ MongoDB connected successfully
   ```

### GitHub Actions Testing

1. Go to your repository → **Actions** tab
2. Select **EMI Reminder Cron Job** workflow
3. Click **Run workflow** → **Run workflow** (manual trigger)
4. Wait for the workflow to complete
5. Check the logs for:
   ```
   ✅ Firebase initialized with base64-encoded service account
   ✅ MongoDB connected successfully
   ```

---

## Alternative Method (Not Recommended for CI/CD)

If you prefer to use individual environment variables instead of base64:

### GitHub Secrets to Add:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

### Important Notes for FIREBASE_PRIVATE_KEY:

When copying the private key:
1. Open your `firebase-service-account.json`
2. Copy the entire `private_key` value INCLUDING the quotes
3. It should look like:
   ```
   -----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhki...\n-----END PRIVATE KEY-----\n
   ```
4. Paste this EXACT string (with `\n` characters) into the GitHub Secret

⚠️ **Warning:** This method is prone to newline escaping issues in CI/CD environments. Use the base64 method instead.

---

## Troubleshooting

### Error: "Invalid JWT Signature"

**Cause:** The private key has incorrect newline formatting.

**Solution:** Use the base64-encoded service account method (recommended).

### Error: "Firebase is not initialized"

**Cause:** Missing or incorrect Firebase credentials.

**Solution:** 
1. Verify `FIREBASE_SERVICE_ACCOUNT_BASE64` secret exists in GitHub
2. Check the base64 string is valid
3. Ensure the service account JSON is from the correct Firebase project

### Error: "Invalid FIREBASE_SERVICE_ACCOUNT_BASE64 format"

**Cause:** The base64 string is corrupted or incomplete.

**Solution:**
1. Re-generate the base64 string
2. Ensure you copied the ENTIRE string (no truncation)
3. Verify there are no extra spaces or newlines in the GitHub Secret value

### How to Check Which Method is Being Used

Check the GitHub Actions logs. You should see one of:
- `✅ Firebase initialized with base64-encoded service account` (Method 1 - Recommended)
- `✅ Firebase initialized with service account file` (Method 2 - Local dev)
- `✅ Firebase initialized with environment variables` (Method 3 - Fallback)

---

## Security Best Practices

1. **Never commit** `firebase-service-account.json` to your repository
2. **Add to `.gitignore`:**
   ```
   firebase-service-account.json
   *-service-account.json
   ```
3. **Rotate credentials** if they are ever exposed
4. **Use GitHub Environments** for production secrets (optional but recommended)
5. **Limit service account permissions** in Firebase Console to only what's needed (FCM)

---

## Summary

✅ **Recommended Setup:**
- GitHub Secret: `FIREBASE_SERVICE_ACCOUNT_BASE64` (base64-encoded service account JSON)
- GitHub Secret: `MONGODB_URI`

This approach completely avoids newline escaping issues and works reliably in CI/CD environments.
