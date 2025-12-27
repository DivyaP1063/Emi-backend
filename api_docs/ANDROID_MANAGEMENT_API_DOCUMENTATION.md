# Android Management API Integration

## Overview

This system now supports **two methods** for device lock/unlock operations:

1. **Firebase Cloud Messaging (FCM)** - Primary method
2. **Android Management API** - Fallback method

## How It Works

### Lock/Unlock Flow

When an admin locks/unlocks a customer:

1. **Primary: Firebase FCM** (instant, requires app)

   - If customer has FCM token → Send push notification
   - Device receives command and locks/unlocks
   - Device calls back to confirm action
   - Database updates after confirmation

2. **Fallback: Android Management API** (enterprise, policy-based)
   - If FCM fails or no FCM token → Try Android Management
   - Searches enterprise devices by IMEI
   - Sends lock command via Google API
   - Database updates immediately (policy-enforced)

### Method Comparison

| Feature             | Firebase FCM                | Android Management API        |
| ------------------- | --------------------------- | ----------------------------- |
| **Speed**           | Instant (push notification) | May have delay (policy sync)  |
| **Requirements**    | App installed + FCM token   | Device enrolled in enterprise |
| **Device Types**    | Any Android device          | Enterprise-managed only       |
| **Database Update** | After device confirmation   | Immediate                     |
| **Best For**        | Consumer devices            | Enterprise/work devices       |

---

## Setup Instructions

### 1. Firebase FCM (Already Configured)

Your Firebase setup is complete. Devices register FCM tokens via:

```
POST /api/customer/device/register
POST /api/customer/device/fcm-token
```

### 2. Android Management API (New)

#### A. Google Cloud Setup

1. **Go to Google Cloud Console**

   - Visit: https://console.cloud.google.com
   - Project: `android-manager-5d65f`

2. **Enable Android Management API**

   ```bash
   # In Cloud Console, enable the API:
   # APIs & Services > Library > Search "Android Management API" > Enable
   ```

3. **Create Enterprise** (if not already created)

   - Use the Android Management API to create an enterprise
   - Note your enterprise ID (format: `enterprises/LC12345678`)

4. **Service Account** (already created)
   - File: `android-manager-5d65f-a9b9cdcf6401.json`
   - Located in project root
   - Already configured in code

#### B. Environment Configuration

Update your `.env` file:

```env
# Android Management API Configuration
ANDROID_MANAGEMENT_ENABLED=true
ANDROID_MANAGEMENT_SERVICE_ACCOUNT_PATH=./android-manager-5d65f-a9b9cdcf6401.json
ANDROID_MANAGEMENT_ENTERPRISE_ID=enterprises/YOUR_ENTERPRISE_ID_HERE
```

**Important:** Replace `YOUR_ENTERPRISE_ID_HERE` with your actual enterprise ID.

#### C. Finding Your Enterprise ID

If you don't have an enterprise ID yet:

1. **Create an enterprise via API:**

   ```bash
   curl -X POST \
     'https://androidmanagement.googleapis.com/v1/enterprises?projectId=android-manager-5d65f&signupUrlName=MyEnterprise' \
     -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
     -H 'Content-Type: application/json'
   ```

2. **Or use the Google Admin Console:**
   - Go to: https://admin.google.com
   - Navigate to Devices > Mobile & endpoints
   - Enterprise ID will be shown

#### D. Device Enrollment

**Devices must be enrolled in Android Enterprise** to be controlled by the API.

**Enrollment Methods:**

1. **QR Code Enrollment (Recommended)**

   ```bash
   # Generate enrollment token via API or Admin Console
   # Device scans QR code during setup
   # Format: {"android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME": "..."}
   ```

2. **NFC Enrollment**

   - Tap NFC tag during device setup

3. **DPC Identifier**
   - Enter DPC identifier: `afw#setup`

**Note:** Only enrolled devices with IMEI matching database will be controlled.

---

## API Usage

### Lock Customer Device

**Endpoint:** `PUT /api/admin/customers/:customerId/lock`

**Behavior:**

- Tries Firebase FCM first (if FCM token exists)
- Falls back to Android Management API (if IMEI exists)
- Returns method used in response

**Example Request:**

```bash
curl -X PUT http://localhost:5000/api/admin/customers/6750abcd1234567890123456/lock \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isLocked": true}'
```

**Response (Firebase FCM):**

```json
{
  "success": true,
  "message": "Lock notification sent to Customer Name via Firebase FCM. Waiting for device confirmation.",
  "data": {
    "customerId": "6750abcd1234567890123456",
    "customerName": "Customer Name",
    "currentLockStatus": false,
    "requestedLockStatus": true,
    "lockStatusUpdated": false,
    "notificationSent": true,
    "methodUsed": "FIREBASE_FCM",
    "pendingDeviceConfirmation": true,
    "availableMethods": {
      "firebase": true,
      "androidManagement": true
    }
  }
}
```

**Response (Android Management API):**

```json
{
  "success": true,
  "message": "Device lock command sent to Customer Name via Android Management API.",
  "data": {
    "customerId": "6750abcd1234567890123456",
    "customerName": "Customer Name",
    "currentLockStatus": true,
    "requestedLockStatus": true,
    "lockStatusUpdated": true,
    "notificationSent": true,
    "methodUsed": "ANDROID_MANAGEMENT_API",
    "pendingDeviceConfirmation": false,
    "availableMethods": {
      "firebase": false,
      "androidManagement": true
    }
  }
}
```

---

## Response Fields

| Field                                | Description                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| `methodUsed`                         | `FIREBASE_FCM` or `ANDROID_MANAGEMENT_API` or `null`                                 |
| `lockStatusUpdated`                  | `true` if DB updated immediately (Android Mgmt), `false` if waiting for device (FCM) |
| `pendingDeviceConfirmation`          | `true` if waiting for device callback, `false` if completed                          |
| `availableMethods.firebase`          | Whether customer has FCM token registered                                            |
| `availableMethods.androidManagement` | Whether customer has IMEI for Android Mgmt                                           |

---

## Troubleshooting

### Firebase FCM Works, Android Management Fails

**Check:**

1. Is Android Management API enabled in Google Cloud?
2. Is `ANDROID_MANAGEMENT_ENABLED=true` in `.env`?
3. Is enterprise ID correctly configured?
4. Is device enrolled in your enterprise?
5. Does device IMEI match customer IMEI in database?

**Common Errors:**

| Error                                | Cause                                | Solution                                         |
| ------------------------------------ | ------------------------------------ | ------------------------------------------------ |
| `ANDROID_MANAGEMENT_NOT_INITIALIZED` | API not configured                   | Check `.env` and service account file            |
| `DEVICE_NOT_FOUND`                   | Device not enrolled or IMEI mismatch | Enroll device and verify IMEI                    |
| `Permission denied`                  | Service account lacks permissions    | Add Android Management API role in Cloud Console |

### Both Methods Fail

**Error Response:**

```json
{
  "success": false,
  "message": "Cannot lock device. No lock method available.",
  "error": "NO_LOCK_METHOD_AVAILABLE",
  "data": {
    "hasFcmToken": false,
    "hasImei": false,
    "reason": "Device must either register FCM token or be enrolled in Android Enterprise Management"
  }
}
```

**Solution:** Device needs to either:

1. Install your app and register FCM token, OR
2. Be enrolled in Android Enterprise

---

## Logs

When a lock command is executed, you'll see logs like:

```
🔐 ===== CUSTOMER LOCK/UNLOCK REQUEST =====
✅ Customer found: John Doe
FCM Token: Present
IMEI1: 123456789012345
📤 PRIMARY METHOD: Attempting Firebase FCM notification...
✅ FCM notification sent successfully
Method Used: FIREBASE_FCM
=========================================
```

Or with fallback:

```
🔐 ===== CUSTOMER LOCK/UNLOCK REQUEST =====
✅ Customer found: Jane Smith
FCM Token: Missing
IMEI1: 987654321098765
⚠️  No FCM token - Skipping Firebase FCM
🔄 FALLBACK METHOD: Attempting Android Management API...
✅ Android Management command sent successfully
✅ Database lock status updated to: true
Method Used: ANDROID_MANAGEMENT_API
=========================================
```

---

## Testing

### Test Firebase FCM

1. Customer installs your app
2. App registers FCM token
3. Admin locks customer
4. Push notification sent instantly
5. Device locks and reports back

### Test Android Management API

1. Enroll device in enterprise
2. Ensure IMEI matches database
3. Remove FCM token or let it fail
4. Admin locks customer
5. Android Management API sends policy command
6. Device locks (may take a few minutes for policy sync)

---

## Security Considerations

1. **Service Account Security**

   - Keep `android-manager-5d65f-a9b9cdcf6401.json` secure
   - Never commit to version control
   - Add to `.gitignore`

2. **Enterprise Enrollment**

   - Only enroll company-owned devices
   - Ensure users understand enterprise policies

3. **Lock Commands**
   - Only admins can issue lock/unlock commands
   - Requires JWT authentication
   - All actions logged

---

## Additional Resources

- [Android Management API Documentation](https://developers.google.com/android/management)
- [Enterprise Enrollment Guide](https://developers.google.com/android/management/provision-device)
- [Policy Configuration](https://developers.google.com/android/management/create-policy)
- [Google Cloud Console](https://console.cloud.google.com)
