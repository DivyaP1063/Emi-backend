# Android Management API - API Documentation

## Overview

Complete API reference for Android Management API (AMAPI) endpoints. Includes both admin endpoints for device management and retailer endpoints for device provisioning during sales.

**Base URL:** `https://your-backend.com`

---

## Authentication

### Admin Endpoints

Admin endpoints require JWT authentication with admin role:

```http
Authorization: Bearer <admin_token>
```

### Retailer Endpoints

Retailer endpoints require JWT authentication with retailer role:

```http
Authorization: Bearer <retailer_token>
```

---

## Retailer API Endpoints

### 1. Generate QR Code for Device Setup (Retailer)

Generate a QR code when selling a device to a customer. This endpoint is used by the retailer app during device sales.

**Endpoint:**
```
POST /api/retailer/device-setup/qr/:customerId
```

**Authentication:** Required (Retailer)

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| customerId | string | Yes | MongoDB ObjectId of the customer |

**Request Body:** None

**Success Response (200):**
```json
{
  "success": true,
  "message": "QR code generated successfully",
  "data": {
    "customerId": "6750abcd1234567890123456",
    "customerName": "John Doe",
    "mobileNumber": "9876543210",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "expiresAt": "2025-12-27T00:03:00.000Z",
    "instructions": {
      "step1": "Factory reset the device",
      "step2": "Start setup wizard",
      "step3": "Tap screen 6 times to open camera",
      "step4": "Scan this QR code",
      "step5": "Device will auto-configure"
    }
  }
}
```

**Error Responses:**

**404 - Customer Not Found:**
```json
{
  "success": false,
  "error": "CUSTOMER_NOT_FOUND",
  "message": "Customer not found"
}
```

**403 - Not Retailer's Customer:**
```json
{
  "success": false,
  "error": "FORBIDDEN",
  "message": "This customer does not belong to your shop"
}
```

**400 - Already Enrolled:**
```json
{
  "success": false,
  "error": "ALREADY_ENROLLED",
  "message": "Device is already enrolled. Factory reset required for new enrollment.",
  "enrolledAt": "2025-12-26T10:00:00.000Z"
}
```

**Example Usage:**
```bash
curl -X POST https://your-backend.com/api/retailer/device-setup/qr/6750abcd1234567890123456 \
  -H "Authorization: Bearer YOUR_RETAILER_TOKEN"
```

---

## Admin API Endpoints

### 1. Generate QR Code for Device Provisioning

Generate a QR code for enrolling a new device with Android Management.

**Endpoint:**

```
POST /api/admin/amapi/qr/:customerId
```

**Authentication:** Required (Admin)

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| customerId | string | Yes | MongoDB ObjectId of the customer |

**Request Body:**

```json
{
  "policyId": "policy_emi_default",
  "duration": 3600
}
```

**Body Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| policyId | string | No | policy_emi_default | Policy to apply to enrolled device |
| duration | number | No | 3600 | Token validity in seconds (1 hour) |

**Success Response (200):**

```json
{
  "success": true,
  "message": "QR code generated successfully",
  "data": {
    "customerId": "6750abcd1234567890123456",
    "customerName": "John Doe",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "enrollmentToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjQwN...",
    "expiresAt": "2025-12-26T14:22:00.000Z",
    "policyId": "policy_emi_default",
    "payload": {
      "android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME": "com.androidmanager/.receiver.EMIDeviceAdminReceiver",
      "android.app.extra.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM": "146de983c5730650...",
      "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION": "https://play.google.com/store/apps/details?id=com.androidmanager",
      "android.app.extra.PROVISIONING_SKIP_ENCRYPTION": false,
      "android.app.extra.PROVISIONING_LEAVE_ALL_SYSTEM_APPS_ENABLED": true,
      "android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE": {
        "backend_url": "https://emi-backend-2wts.onrender.com",
        "enrollment_token": "eyJhbGciOiJSUzI1NiIs...",
        "customer_id": "6750abcd1234567890123456",
        "enterprise_id": "enterprises/LC..."
      }
    }
  }
}
```

**Error Responses:**

**404 - Customer Not Found:**

```json
{
  "success": false,
  "error": "CUSTOMER_NOT_FOUND",
  "message": "Customer not found"
}
```

**500 - Token Generation Failed:**

```json
{
  "success": false,
  "error": "TOKEN_GENERATION_FAILED",
  "message": "Failed to generate enrollment token"
}
```

**500 - QR Generation Failed:**

```json
{
  "success": false,
  "error": "QR_GENERATION_FAILED",
  "message": "Failed to generate QR code"
}
```

**Example Usage:**

```bash
curl -X POST https://your-backend.com/api/admin/amapi/qr/6750abcd1234567890123456 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "policyId": "policy_emi_default",
    "duration": 3600
  }'
```

---

### 2. List All Enrolled Devices

Retrieve a list of all devices enrolled via Android Management.

**Endpoint:**

```
GET /api/admin/amapi/devices
```

**Authentication:** Required (Admin)

**Query Parameters:** None

**Success Response (200):**

```json
{
  "success": true,
  "count": 3,
  "devices": [
    {
      "customerId": "6750abcd1234567890123456",
      "customerName": "John Doe",
      "mobileNumber": "9876543210",
      "imei": "123456789012345",
      "enrollment": {
        "enrolled": true,
        "deviceName": "enterprises/LC.../devices/abc123",
        "enrollmentToken": "eyJhbGc...",
        "enrolledAt": "2025-12-26T10:00:00.000Z",
        "lastPolicySync": "2025-12-26T13:00:00.000Z",
        "complianceStatus": "COMPLIANT"
      }
    },
    {
      "customerId": "6750abcd1234567890123457",
      "customerName": "Jane Smith",
      "mobileNumber": "9876543211",
      "imei": "123456789012346",
      "enrollment": {
        "enrolled": true,
        "deviceName": "enterprises/LC.../devices/def456",
        "enrollmentToken": null,
        "enrolledAt": "2025-12-25T15:30:00.000Z",
        "lastPolicySync": "2025-12-26T12:45:00.000Z",
        "complianceStatus": "COMPLIANT"
      }
    }
  ]
}
```

**Error Response (500):**

```json
{
  "success": false,
  "error": "SERVER_ERROR",
  "message": "Failed to fetch devices"
}
```

**Example Usage:**

```bash
curl -X GET https://your-backend.com/api/admin/amapi/devices \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

### 3. Get Device Details by IMEI

Retrieve detailed information about a specific device.

**Endpoint:**

```
GET /api/admin/amapi/devices/:imei
```

**Authentication:** Required (Admin)

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| imei | string | Yes | Device IMEI (15 digits) |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "customer": {
      "id": "6750abcd1234567890123456",
      "fullName": "John Doe",
      "mobileNumber": "9876543210",
      "imei": "123456789012345",
      "isLocked": false,
      "isActive": true,
      "fcmToken": "Present"
    },
    "amapiEnrollment": {
      "enrolled": true,
      "deviceName": "enterprises/LC.../devices/abc123",
      "enrollmentToken": "eyJhbGc...",
      "enrolledAt": "2025-12-26T10:00:00.000Z",
      "lastPolicySync": "2025-12-26T13:00:00.000Z",
      "complianceStatus": "COMPLIANT"
    },
    "amapiDevice": {
      "name": "enterprises/LC.../devices/abc123",
      "state": "ACTIVE",
      "appliedState": "ACTIVE",
      "memoryInfo": {
        "totalRam": "4096000000",
        "totalInternalStorage": "64000000000"
      },
      "networkInfo": {
        "wifiMacAddress": "00:11:22:33:44:55"
      },
      "hardwareInfo": {
        "brand": "Samsung",
        "model": "Galaxy A52",
        "serialNumber": "123456789012345"
      },
      "lastStatusReportTime": "2025-12-26T13:00:00.000Z",
      "lastPolicySyncTime": "2025-12-26T13:00:00.000Z"
    }
  }
}
```

**Error Responses:**

**404 - Customer Not Found:**

```json
{
  "success": false,
  "error": "CUSTOMER_NOT_FOUND",
  "message": "No customer found with this IMEI"
}
```

**500 - Server Error:**

```json
{
  "success": false,
  "error": "SERVER_ERROR",
  "message": "Failed to fetch device details"
}
```

**Example Usage:**

```bash
curl -X GET https://your-backend.com/api/admin/amapi/devices/123456789012345 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

### 4. Factory Reset Device

Remotely wipe a device and remove it from enterprise management.

**Endpoint:**

```
POST /api/admin/amapi/devices/:imei/factory-reset
```

**Authentication:** Required (Admin)

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| imei | string | Yes | Device IMEI (15 digits) |

**Request Body:**

```json
{
  "confirm": "FACTORY_RESET_CONFIRMED"
}
```

**Body Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| confirm | string | Yes | Must be exactly "FACTORY_RESET_CONFIRMED" |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Factory reset initiated successfully. Device will be wiped.",
  "data": {
    "customerId": "6750abcd1234567890123456",
    "customerName": "John Doe",
    "imei": "123456789012345",
    "action": "FACTORY_RESET",
    "timestamp": "2025-12-26T13:20:00.000Z"
  }
}
```

**Error Responses:**

**400 - Confirmation Required:**

```json
{
  "success": false,
  "error": "CONFIRMATION_REQUIRED",
  "message": "You must confirm factory reset by sending: { \"confirm\": \"FACTORY_RESET_CONFIRMED\" }"
}
```

**404 - Customer Not Found:**

```json
{
  "success": false,
  "error": "CUSTOMER_NOT_FOUND",
  "message": "No customer found with this IMEI"
}
```

**404 - Device Not Enrolled:**

```json
{
  "success": false,
  "error": "DEVICE_NOT_ENROLLED",
  "message": "Device not enrolled in Android Management"
}
```

**500 - Factory Reset Failed:**

```json
{
  "success": false,
  "error": "FACTORY_RESET_FAILED",
  "message": "Failed to initiate factory reset"
}
```

**Example Usage:**

```bash
curl -X POST https://your-backend.com/api/admin/amapi/devices/123456789012345/factory-reset \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "confirm": "FACTORY_RESET_CONFIRMED"
  }'
```

**⚠️ WARNING:** This action is irreversible and will:

- Erase all data on the device
- Remove device from enterprise
- Require re-enrollment via new QR code

---

## Webhook Endpoint

### Receive AMAPI Events

Endpoint for Google to send webhook notifications.

**Endpoint:**

```
POST /api/webhooks/amapi
```

**Authentication:** Signature verification (not JWT)

**Headers:**

```
X-Goog-Signature: sha256=abc123def456...
Content-Type: application/json
```

**Request Body Examples:**

**Enrollment Event:**

```json
{
  "notificationType": "ENROLLMENT",
  "deviceName": "enterprises/LC.../devices/abc123",
  "additionalData": "6750abcd1234567890123456"
}
```

**Compliance Report:**

```json
{
  "notificationType": "COMPLIANCE_REPORT",
  "deviceName": "enterprises/LC.../devices/abc123",
  "complianceState": "COMPLIANT"
}
```

**Status Report:**

```json
{
  "notificationType": "STATUS_REPORT",
  "deviceName": "enterprises/LC.../devices/abc123",
  "statusReport": {
    "memoryInfo": {},
    "networkInfo": {}
  }
}
```

**Command Event:**

```json
{
  "notificationType": "COMMAND",
  "deviceName": "enterprises/LC.../devices/abc123",
  "commandType": "LOCK",
  "commandStatus": "SUCCESS"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Webhook received and processed"
}
```

**Error Response (401):**

```json
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "Invalid webhook signature"
}
```

**Security:**

- Webhook signature is verified using HMAC-SHA256
- Secret key must match `AMAPI_WEBHOOK_SECRET` in environment
- Unsigned requests are rejected with 401

---

## Error Codes Reference

| Error Code              | HTTP Status | Description                                     |
| ----------------------- | ----------- | ----------------------------------------------- |
| CUSTOMER_NOT_FOUND      | 404         | Customer with specified ID/IMEI not found       |
| TOKEN_GENERATION_FAILED | 500         | Failed to generate enrollment token             |
| QR_GENERATION_FAILED    | 500         | Failed to generate QR code image                |
| SERVER_ERROR            | 500         | Internal server error                           |
| DEVICE_NOT_ENROLLED     | 404         | Device not enrolled in AMAPI                    |
| CONFIRMATION_REQUIRED   | 400         | Factory reset confirmation not provided         |
| FACTORY_RESET_FAILED    | 500         | Failed to initiate factory reset                |
| UNAUTHORIZED            | 401         | Invalid webhook signature or missing auth token |
| WEBHOOK_ERROR           | 500         | Error processing webhook event                  |

---

## Testing with Postman

### Setup

1. **Create Environment:**

   - `base_url`: `https://your-backend.com`
   - `admin_token`: Your JWT admin token

2. **Set Authorization:**
   - Type: Bearer Token
   - Token: `{{admin_token}}`

### Test Sequence

**1. Generate QR Code:**

```
POST {{base_url}}/api/admin/amapi/qr/6750abcd1234567890123456
Body: { "policyId": "policy_emi_default" }
```

**2. View QR in Browser:**

- Copy `data.qrCode` from response
- Create HTML: `<img src="PASTE_HERE" />`
- Open in browser

**3. List Devices:**

```
GET {{base_url}}/api/admin/amapi/devices
```

**4. Get Device Details:**

```
GET {{base_url}}/api/admin/amapi/devices/123456789012345
```

**5. Factory Reset (Emergency Only):**

```
POST {{base_url}}/api/admin/amapi/devices/123456789012345/factory-reset
Body: { "confirm": "FACTORY_RESET_CONFIRMED" }
```

---

## Authorization Summary

### Who Can Access AMAPI Endpoints?

**Retailer Endpoints:**
- ✅ **Retailers** - Can generate QR codes for their own customers only
- ❌ Admins, Recovery Heads, Accountants, Customers

**Admin Endpoints:**
- ✅ **Admins** - Full access to all AMAPI management features
- ❌ Retailers, Recovery Heads, Accountants, Customers

### Endpoint Access Matrix

| Endpoint | Admin | Retailer | Purpose |
|----------|-------|----------|---------|
| `POST /api/retailer/device-setup/qr/:customerId` | ❌ | ✅ | Generate QR for device sales |
| `POST /api/admin/amapi/qr/:customerId` | ✅ | ❌ | Generate QR with policy options |
| `GET /api/admin/amapi/devices` | ✅ | ❌ | List all enrolled devices |
| `GET /api/admin/amapi/devices/:imei` | ✅ | ❌ | Get device details |
| `POST /api/admin/amapi/devices/:imei/factory-reset` | ✅ | ❌ | Emergency device wipe |

### Security Features

**Retailer Protection:**
- Retailers can only access their own customers
- Validates `customer.retailerId === req.retailer.id`
- Prevents cross-retailer data access

**Admin Protection:**
- Full device management capabilities
- Factory reset requires explicit confirmation
- All actions require valid admin JWT token

---

## Environment Variables Required

```env
# AMAPI Configuration
ANDROID_MANAGEMENT_ENABLED=true
ANDROID_MANAGEMENT_SERVICE_ACCOUNT_PATH=./config/android-manager-xxxxx.json
ANDROID_MANAGEMENT_ENTERPRISE_ID=enterprises/LC...
ANDROID_MANAGEMENT_DEFAULT_POLICY_ID=policy_emi_default

# Webhook Settings
AMAPI_WEBHOOK_SECRET=your_webhook_secret_from_google

# QR Code Settings
QR_CODE_SIZE=512
QR_CODE_ERROR_CORRECTION=M

# Backend Configuration
BACKEND_URL=https://emi-backend-2wts.onrender.com
APP_SIGNATURE_CHECKSUM=your_app_sha256_fingerprint
```

---

## Complete Workflow Example

### Device Provisioning Flow

**Step 1: Admin generates QR**

```bash
POST /api/admin/amapi/qr/6750abcd1234567890123456
→ Returns QR code image
```

**Step 2: Customer scans QR**

```
→ Device factory reset
→ Scan QR during setup
→ Device auto-enrolls with AMAPI
```

**Step 3: Webhook received**

```bash
POST /api/webhooks/amapi
Body: { "notificationType": "ENROLLMENT", ... }
→ Customer.amapiEnrollment updated
```

**Step 4: Device appears in list**

```bash
GET /api/admin/amapi/devices
→ Shows newly enrolled device
```

**Step 5: Monitor device**

```bash
GET /api/admin/amapi/devices/123456789012345
→ Shows device status, compliance, etc.
```

---

## Support & Troubleshooting

**QR Generation fails:**

- Verify enterprise ID is correct
- Check service account permissions
- Ensure policy exists in AMAPI console

**Webhook not received:**

- Verify webhook URL in Google Console
- Check webhook secret matches
- Ensure endpoint is publicly accessible

**Factory reset fails:**

- Device must be enrolled in AMAPI
- Check device is online
- Verify enterprise permissions

---

**All APIs are ready for production use!** 🚀
