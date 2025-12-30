# Backend Changes Required for AMAPI DPC Integration

## Overview

The Android app has been updated to act as a **custom AMAPI Device Policy Controller (DPC)**. The backend QR code generation **must be updated** to point to our app instead of Google's default DPC.

---

## Critical Changes Required

### 1. Update QR Code JSON Structure

**OLD (Incorrect - Points to Google's DPC):**
```json
{
  "android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME": "com.google.android.apps.work.clouddpc/.receivers.CloudDeviceAdminReceiver",
  "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION": "https://play.google.com/...",
  ...
}
```

**NEW (Correct - Points to Our App):**
```json
{
  "android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME": "com.androidmanager/.receiver.DeviceAdminReceiver",
  "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION": "https://your-backend.com/downloads/AndroidManager.apk",
  "android.app.extra.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM": "YOUR_APP_SIGNATURE_CHECKSUM_HERE",
  "android.app.extra.PROVISIONING_SKIP_ENCRYPTION": false,
  "android.app.extra.PROVISIONING_LEAVE_ALL_SYSTEM_APPS_ENABLED": true,
  "android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE": {
    "backend_url": "https://your-backend.com/api",
    "enrollment_token": "YOUR_AMAPI_ENROLLMENT_TOKEN",
    "customer_id": "CUSTOMER_ID_HERE",
    "enterprise_id": "enterprises/LC00abc123"
  }
}
```

---

## Required Changes (Step by Step)

### Change 1: Component Name ⚠️ **CRITICAL**

**Field:** `android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME`

**Old Value:**
```
com.google.android.apps.work.clouddpc/.receivers.CloudDeviceAdminReceiver
```

**New Value:**
```
com.androidmanager/.receiver.DeviceAdminReceiver
```

**⚠️ This is THE most important change. If this is wrong, provisioning will fail.**

---

### Change 2: APK Download Location

**Field:** `android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION`

**Requirements:**
- Must be HTTPS URL
- Must serve the release APK file
- File must be publicly accessible during provisioning

**Example:**
```
https://api.yourdomain.com/downloads/AndroidManager-release.apk
```

**Implementation:**
```python
# Example endpoint to serve APK
@app.route('/downloads/AndroidManager.apk')
def download_apk():
    return send_file('/path/to/release/AndroidManager-release.apk', 
                     mimetype='application/vnd.android.package-archive')
```

---

### Change 3: App Signature Checksum

**Field:** `android.app.extra.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM`

**What it is:** SHA-256 hash of the app's signing certificate in base64 URL-safe format

**How to get it:**

**Option A: From Keystore (Recommended)**
```bash
# 1. Extract certificate
keytool -exportcert -alias YOUR_KEY_ALIAS \
  -keystore your-release-key.jks \
  -storepass YOUR_KEYSTORE_PASSWORD \
  | openssl dgst -sha256 -binary \
  | openssl base64 \
  | tr '+/' '-_' \
  | tr -d '='
```

**Option B: From Installed APK**
```bash
# 1. Get SHA-256 from keystore
keytool -list -v -keystore your-release-key.jks -alias YOUR_KEY_ALIAS

# 2. You'll see something like:
# SHA256: AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90

# 3. Remove colons and convert to base64 URL-safe format
```

**Example Result:**
```
nQ7HLM3nrW8pG4oBzm8g0pF9r_NKxHhcPqJqLg4K8Ys
```

**⚠️ Important:**
- Must use **release keystore** (not debug)
- Format must be **base64 URL-safe** (use `-_` instead of `+/`, no `=` padding)
- Must match the APK you're serving

---

### Change 4: Admin Extras Bundle

**Field:** `android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE`

**Purpose:** Custom data passed to the app during provisioning

**Required Fields:**
```json
{
  "backend_url": "https://your-backend.com/api",
  "enrollment_token": "AMAPI_ENROLLMENT_TOKEN",
  "customer_id": "customer_unique_id",
  "enterprise_id": "enterprises/LC00abc123"
}
```

**Field Descriptions:**

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `backend_url` | String | Your backend API base URL | `https://api.example.com/api` |
| `enrollment_token` | String | AMAPI enrollment token from Google | `AFb7uP9...` (from AMAPI console) |
| `customer_id` | String | Your internal customer/shop ID | `CUST-12345` |
| `enterprise_id` | String | AMAPI enterprise resource name | `enterprises/LC00abc123` |

**How to get `enrollment_token`:**
1. Go to Google AMAPI Console
2. Create/select your enterprise
3. Create a new enrollment token
4. Copy the token string

**How to get `enterprise_id`:**
- Format: `enterprises/LC########`
- Found in AMAPI console URL or API responses

---

## Complete Example

### Python (Django/Flask)

```python
import json
import qrcode
from io import BytesIO

def generate_amapi_qr_code(customer_id, enrollment_token, enterprise_id):
    """Generate AMAPI DPC QR code for device provisioning"""
    
    qr_data = {
        # CRITICAL: Must point to our app's DeviceAdminReceiver
        "android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME": 
            "com.androidmanager/.receiver.DeviceAdminReceiver",
        
        # URL where Android can download the APK
        "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION": 
            "https://api.yourdomain.com/downloads/AndroidManager.apk",
        
        # SHA-256 checksum of the release APK signing certificate
        "android.app.extra.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM": 
            "YOUR_APP_SIGNATURE_CHECKSUM_HERE",  # Replace with actual checksum
        
        # Device configuration
        "android.app.extra.PROVISIONING_SKIP_ENCRYPTION": False,
        "android.app.extra.PROVISIONING_LEAVE_ALL_SYSTEM_APPS_ENABLED": True,
        
        # Custom data passed to the app
        "android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE": {
            "backend_url": "https://api.yourdomain.com/api",
            "enrollment_token": enrollment_token,
            "customer_id": customer_id,
            "enterprise_id": enterprise_id
        }
    }
    
    # Convert to JSON string for QR code
    qr_string = json.dumps(qr_data)
    
    # Generate QR code
    qr = qrcode.QRCode(version=None, box_size=10, border=4)
    qr.add_data(qr_string)
    qr.make(fit=True)
    
    # Create image
    img = qr.make_image(fill_color="black", back_color="white")
    
    return img  # Return QR code image
```

### Node.js (Express)

```javascript
const qrcode = require('qrcode');

async function generateAmapiQRCode(customerId, enrollmentToken, enterpriseId) {
  const qrData = {
    "android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME": 
      "com.androidmanager/.receiver.DeviceAdminReceiver",
    
    "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION": 
      "https://api.yourdomain.com/downloads/AndroidManager.apk",
    
    "android.app.extra.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM": 
      "YOUR_APP_SIGNATURE_CHECKSUM_HERE",
    
    "android.app.extra.PROVISIONING_SKIP_ENCRYPTION": false,
    "android.app.extra.PROVISIONING_LEAVE_ALL_SYSTEM_APPS_ENABLED": true,
    
    "android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE": {
      "backend_url": "https://api.yourdomain.com/api",
      "enrollment_token": enrollmentToken,
      "customer_id": customerId,
      "enterprise_id": enterpriseId
    }
  };
  
  const qrString = JSON.stringify(qrData);
  
  // Generate QR code as data URL
  const qrCodeDataUrl = await qrcode.toDataURL(qrString);
  
  return qrCodeDataUrl;
}
```

---

## Testing Checklist

Before deploying to production:

- [ ] Component name is exactly: `com.androidmanager/.receiver.DeviceAdminReceiver`
- [ ] APK download URL is HTTPS and publicly accessible
- [ ] APK signature checksum matches your **release** keystore
- [ ] Backend URL in admin extras is correct
- [ ] Enrollment token is valid (from AMAPI console)
- [ ] Enterprise ID format is correct: `enterprises/LC########`
- [ ] QR code generates successfully
- [ ] QR code can be scanned on factory reset device

---

## Common Issues & Solutions

### ❌ Issue: "Download failed" during provisioning
**Solution:** 
- Ensure APK URL is HTTPS
- Verify APK is publicly accessible (test in browser)
- Check file permissions on server

### ❌ Issue: "Signature verification failed"
**Solution:**
- Ensure checksum is from **release keystore** (not debug)
- Verify checksum format is base64 URL-safe
- Rebuild and re-upload APK if keystore changed

### ❌ Issue: "Component not found"
**Solution:**
- Verify component name is exactly: `com.androidmanager/.receiver.DeviceAdminReceiver`
- Check for typos (case-sensitive)
- Ensure APK package name is `com.androidmanager`

### ❌ Issue: "No admin extras received"
**Solution:**
- Verify JSON structure is correct
- Check that all string values are properly quoted
- Test JSON validity: `echo 'your-json' | python -m json.tool`

---

## Deployment Steps

1. **Get App Signature Checksum**
   ```bash
   keytool -list -v -keystore release.jks -alias release
   # Copy SHA-256 and convert to base64 URL-safe
   ```

2. **Update Backend QR Code Generation**
   - Update component name
   - Update APK download URL
   - Add signature checksum
   - Update admin extras bundle

3. **Upload Release APK**
   ```bash
   # Build release APK
   ./gradlew assembleRelease
   
   # Upload to server
   scp app/build/outputs/apk/release/app-release.apk \
       your-server:/path/to/downloads/AndroidManager.apk
   ```

4. **Test QR Code Generation**
   - Generate a test QR code
   - Verify JSON structure
   - Test on factory reset device

5. **Monitor Logs**
   ```bash
   # Connect device via ADB
   adb logcat | grep -E "(DeviceAdmin|AMAPI|MainActivity)"
   ```

---

## Support

If provisioning fails, check these logs:

**Android Device Logs:**
```bash
adb logcat | grep -E "(Provision|DeviceAdmin|AMAPI)"
```

**Expected Success Logs:**
```
DeviceAdmin: ✅ Device Admin Enabled - AMAPI DPC Mode
MainActivity: ✅ AMAPI provisioning detected!
MainActivity: ✅ AMAPI data stored successfully
AmapiPolicyManager: 📱 Device is AMAPI provisioned
```

**Backend Logs:**
- QR code generation requests
- APK download requests
- Any errors during QR generation

---

## Summary

**3 Critical Changes:**

1. ⚠️ **Component Name:** `com.androidmanager/.receiver.DeviceAdminReceiver`
2. 🔐 **APK Signature:** Get from release keystore (base64 URL-safe format)
3. 📦 **Admin Extras:** Include backend_url, enrollment_token, customer_id, enterprise_id

**Without these changes, the app will NOT work as a DPC and AMAPI provisioning will FAIL.**
