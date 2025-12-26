# AMAPI Setup for Render Deployment

## Problem

Your Android Manager service account JSON file is not available on Render because:
1. It's in `.gitignore` (correct for security)
2. Render doesn't have access to it
3. The path `/opt/render/project/src/android-manager-*.json` doesn't exist

---

## Solution: Use Environment Variable with Base64

### Step 1: Encode Service Account to Base64

**On your local machine:**

```bash
# Windows PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("android-manager-5d65f-a9b9cdcf6401.json")) | Out-File -FilePath android-base64.txt

# OR Linux/Mac
cat android-manager-5d65f-a9b9cdcf6401.json | base64 -w 0 > android-base64.txt
```

This creates a file `android-base64.txt` with the base64-encoded JSON.

---

### Step 2: Add to Render Environment Variables

1. **Go to Render Dashboard**
   - Select your service
   - Go to "Environment" tab

2. **Add New Environment Variable:**
   ```
   Key: ANDROID_MANAGEMENT_SERVICE_ACCOUNT_BASE64
   Value: <paste the entire base64 string from android-base64.txt>
   ```

3. **Update Existing Variable:**
   ```
   ANDROID_MANAGEMENT_SERVICE_ACCOUNT_PATH=./config/android-manager.json
   ```
   (We'll create this file from base64 at runtime)

---

### Step 3: Update Service to Decode at Runtime

Update `androidManagementService.js` to handle base64 environment variable:

**Add at the top of initialization:**

```javascript
const initializeAndroidManagement = async () => {
    try {
        // Check if base64 credentials exist
        const base64Creds = process.env.ANDROID_MANAGEMENT_SERVICE_ACCOUNT_BASE64;
        
        if (base64Creds) {
            // Decode and write to temp file
            const fs = require('fs');
            const path = require('path');
            
            const credJson = Buffer.from(base64Creds, 'base64').toString('utf-8');
            const credPath = path.join(__dirname, '../../config/android-manager.json');
            
            // Ensure config directory exists
            const dir = path.dirname(credPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            // Write credentials file
            fs.writeFileSync(credPath, credJson, 'utf-8');
            console.log('✅ Created service account file from base64 env variable');
        }
        
        // Rest of initialization code...
```

**Benefits:**
- ✅ No credentials in Git
- ✅ Works on Render deployment
- ✅ Secure
- ✅ Easy to rotate credentials

---

## Alternative: Render Secret Files (Recommended)

Render supports secret files directly without encoding:

### Step 1: Add Secret File in Render

1. Go to Render Dashboard → Your Service
2. Click "Environment" tab
3. Scroll to "Secret Files" section
4. Click "Add Secret File"
5. Set:
   - **Filename:** `config/android-manager.json`
   - **Contents:** Paste entire JSON from `android-manager-5d65f-a9b9cdcf6401.json`

### Step 2: Update Environment Variable

```
ANDROID_MANAGEMENT_SERVICE_ACCOUNT_PATH=config/android-manager.json
```

**That's it!** Render will create the file at runtime.

---

## Verification

After deploying, check logs for:

```
✅ Android Management API initialized with service account file
✅ Android Management API ready for enterprise: enterprises/LC04j9pb5k
```

If you see these, AMAPI is working! 🎉

---

## Current Error Explained

```
ENOENT: no such file or directory, open '/opt/render/project/src/android-manager-5d65f-a9b9cdcf6401.json'
```

**Why:**
- File is in root, but code looks in `src/` directory
- File doesn't exist on Render (in `.gitignore`)
- Path isn't correct for deployment

**Fix:** Use Secret Files or Base64 method above.

---

## Recommended Approach

**Use Render Secret Files** - It's the simplest:

1. Add secret file: `config/android-manager.json`
2. Set env var: `ANDROID_MANAGEMENT_SERVICE_ACCOUNT_PATH=config/android-manager.json`
3. Deploy
4. Done! ✅

No code changes needed!
