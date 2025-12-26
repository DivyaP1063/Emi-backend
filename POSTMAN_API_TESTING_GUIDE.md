# Device Lock/Unlock System - Postman API Testing Guide

Complete API reference for testing the EMI device lock/unlock system in Postman.

---

## 📋 Table of Contents

1. [Setup](#setup)
2. [Admin Authentication](#admin-authentication)
3. [Customer Lock/Unlock](#customer-lockunlock)
4. [Device Registration (Kotlin App)](#device-registration-kotlin-app)
5. [Device Callbacks](#device-callbacks)
6. [Customer Management](#customer-management)

---

## 🔧 Setup

### Base URL
```
http://localhost:5000
```

### Environment Variables (in Postman)
Create these variables in Postman environment:

| Variable | Value | Description |
|----------|-------|-------------|
| `base_url` | `http://localhost:5000` | Server base URL |
| `admin_token` | `<token>` | Admin JWT token (set after login) |
| `customer_id` | `<id>` | Test customer ID |

---

## 1️⃣ Admin Authentication

### 1.1 Send OTP

**Endpoint:** `POST {{base_url}}/api/admin/auth/send-otp`

**Headers:**
```json
Content-Type: application/json
```

**Request Body:**
```json
{
  "mobileNumber": "9999999999"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "otpSent": true,
    "expiresIn": 300
  }
}
```

**Error Response (403):**
```json
{
  "success": false,
  "message": "This mobile number is not registered as admin",
  "error": "UNAUTHORIZED_ACCESS"
}
```

---

### 1.2 Verify OTP & Login

**Endpoint:** `POST {{base_url}}/api/admin/auth/verify-otp`

**Headers:**
```json
Content-Type: application/json
```

**Request Body:**
```json
{
  "mobileNumber": "9999999999",
  "otp": "123456"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "admin": {
      "id": "6750abcd1234567890123456",
      "name": "Admin Name",
      "mobileNumber": "9999999999",
      "email": "admin@example.com"
    }
  }
}
```

**Postman Test Script:**
```javascript
// Auto-save token to environment
if (pm.response.code === 200) {
  const response = pm.response.json();
  pm.environment.set("admin_token", response.data.token);
  console.log("✅ Token saved!");
}
```

---

## 2️⃣ Customer Lock/Unlock

### 2.1 Lock Customer Device

**Endpoint:** `PUT {{base_url}}/api/admin/customers/:customerId/lock`

**Headers:**
```json
Authorization: Bearer {{admin_token}}
Content-Type: application/json
```

**Request Body:**
```json
{
  "isLocked": true
}
```

**Success Response - FCM Available (200):**
```json
{
  "success": true,
  "message": "Lock notification sent to John Doe via Firebase FCM. Waiting for device confirmation.",
  "data": {
    "customerId": "6750abcd1234567890123456",
    "customerName": "John Doe",
    "currentLockStatus": false,
    "requestedLockStatus": true,
    "lockStatusUpdated": false,
    "notificationSent": true,
    "methodUsed": "FIREBASE_FCM",
    "pendingDeviceConfirmation": true,
    "updatedAt": "2025-12-25T10:00:00.000Z"
  }
}
```

**Error Response - No FCM Token (400):**
```json
{
  "success": false,
  "message": "Cannot lock device. Customer device is not registered.",
  "error": "NO_FCM_TOKEN",
  "data": {
    "customerId": "6750abcd1234567890123456",
    "customerName": "John Doe",
    "currentLockStatus": false,
    "hasFcmToken": false,
    "reason": "Device must have the app installed and registered with FCM token. If token generation failed, return to setup/welcome screen."
  }
}
```

**Error Response - FCM Send Failed (500):**
```json
{
  "success": false,
  "message": "Failed to send lock notification to John Doe",
  "error": "FCM_SEND_FAILED",
  "data": {
    "customerId": "6750abcd1234567890123456",
    "customerName": "John Doe",
    "currentLockStatus": false,
    "requestedLockStatus": true,
    "notificationSent": false,
    "notificationError": "INVALID_TOKEN"
  }
}
```

**Postman Test Script:**
```javascript
// Check if lock command sent successfully
const response = pm.response.json();

pm.test("Lock command sent", function() {
  pm.expect(response.success).to.be.true;
  pm.expect(response.data.methodUsed).to.eql("FIREBASE_FCM");
  pm.expect(response.data.pendingDeviceConfirmation).to.be.true;
});

// Save customer ID for polling
pm.environment.set("customer_id", response.data.customerId);
```

---

### 2.2 Unlock Customer Device

**Endpoint:** `PUT {{base_url}}/api/admin/customers/:customerId/lock`

**Headers:**
```json
Authorization: Bearer {{admin_token}}
Content-Type: application/json
```

**Request Body:**
```json
{
  "isLocked": false
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Lock notification sent to John Doe via Firebase FCM. Waiting for device confirmation.",
  "data": {
    "customerId": "6750abcd1234567890123456",
    "customerName": "John Doe",
    "currentLockStatus": true,
    "requestedLockStatus": false,
    "lockStatusUpdated": false,
    "notificationSent": true,
    "methodUsed": "FIREBASE_FCM",
    "pendingDeviceConfirmation": true,
    "updatedAt": "2025-12-25T10:05:00.000Z"
  }
}
```

---

### 2.3 Get Customer Lock Status (For Long-Polling)

**Endpoint:** `GET {{base_url}}/api/admin/customers/:customerId/lock-status`

**Headers:**
```json
Authorization: Bearer {{admin_token}}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Customer lock status fetched successfully",
  "data": {
    "customerId": "6750abcd1234567890123456",
    "customerName": "John Doe",
    "mobileNumber": "9876543210",
    "isLocked": true,
    "hasFcmToken": true,
    "lastUpdated": "2025-12-25T10:05:30.000Z"
  }
}
```

**Postman Test Script (Polling Simulation):**
```javascript
// Simulate long-polling - check status every 2 seconds
const maxAttempts = 5;
const currentAttempt = pm.environment.get("poll_attempt") || 0;

if (currentAttempt < maxAttempts) {
  // Wait 2 seconds before next poll
  setTimeout(function() {
    pm.environment.set("poll_attempt", currentAttempt + 1);
    postman.setNextRequest(pm.info.requestName);
  }, 2000);
} else {
  pm.environment.unset("poll_attempt");
  console.log("Polling complete");
}
```

---

## 3️⃣ Device Registration (Kotlin App)

### 3.1 Register Device with FCM Token

**Endpoint:** `POST {{base_url}}/api/customer/device/register`

**Headers:**
```json
Content-Type: application/json
```

**Request Body:**
```json
{
  "fcmToken": "cX8r9H3fRj6V8yN2mK4pL1qT7wB5xC9dE0fG3hJ6...",
  "imei1": "123456789012345",
  "devicePin": "1234",
  "latitude": 28.6139,
  "longitude": 77.2090
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Device registered successfully",
  "data": {
    "customerId": "6750abcd1234567890123456",
    "customerName": "John Doe",
    "isLocked": false,
    "location": {
      "latitude": 28.6139,
      "longitude": 77.2090,
      "lastUpdated": "2025-12-25T10:00:00.000Z"
    },
    "updatedAt": "2025-12-25T10:00:00.000Z"
  }
}
```

**Error Response - Customer Not Found (404):**
```json
{
  "success": false,
  "message": "Customer not found with this IMEI",
  "error": "CUSTOMER_NOT_FOUND"
}
```

---

### 3.2 Update FCM Token Only

**Endpoint:** `POST {{base_url}}/api/customer/device/fcm-token`

**Headers:**
```json
Content-Type: application/json
```

**Request Body:**
```json
{
  "fcmToken": "cX8r9H3fRj6V8yN2mK4pL1qT7wB5xC9dE0fG3hJ6...",
  "imei1": "123456789012345"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "FCM token registered successfully",
  "data": {
    "customerId": "6750abcd1234567890123456",
    "customerName": "John Doe",
    "isLocked": false,
    "updatedAt": "2025-12-25T10:00:00.000Z"
  }
}
```

---

### 3.3 Get Customer Status by IMEI

**Endpoint:** `GET {{base_url}}/api/customer/device/status/:imei1`

**Headers:**
```json
None required (public endpoint)
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Customer status fetched successfully",
  "data": {
    "customerId": "6750abcd1234567890123456",
    "customerName": "John Doe",
    "mobileNumber": "9876543210",
    "isLocked": false,
    "hasPendingEmis": true,
    "pendingEmiCount": 2,
    "registeredAt": "2025-12-15T10:00:00.000Z",
    "lastUpdated": "2025-12-25T10:00:00.000Z"
  }
}
```

---

## 4️⃣ Device Callbacks

### 4.1 Device Lock/Unlock Response Callback

**Endpoint:** `POST {{base_url}}/api/customer/device/lock-response`

**Headers:**
```json
Content-Type: application/json
```

**Request Body - Lock Success:**
```json
{
  "imei1": "123456789012345",
  "lockSuccess": true,
  "action": "LOCK_DEVICE"
}
```

**Request Body - Lock Failed:**
```json
{
  "imei1": "123456789012345",
  "lockSuccess": false,
  "action": "LOCK_DEVICE",
  "errorMessage": "Device admin permission denied"
}
```

**Request Body - Unlock Success:**
```json
{
  "imei1": "123456789012345",
  "lockSuccess": true,
  "action": "UNLOCK_DEVICE"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Lock response received",
  "data": {
    "customerId": "6750abcd1234567890123456",
    "customerName": "John Doe",
    "currentLockStatus": true,
    "responseProcessed": true
  }
}
```

**Console Logs (Backend):**
```
📲 ===== DEVICE LOCK RESPONSE RECEIVED =====
Timestamp: 2025-12-25T10:05:30.000Z
IMEI: 123456789012345
Action: LOCK_DEVICE
Success: true
✅ Customer found: John Doe
Current DB Lock Status: false
Device reports successful LOCK_DEVICE
Should be locked: true
✅ DATABASE UPDATED
Previous Status: false
New Status: true
🔒 Customer John Doe is now LOCKED
=========================================
```

---

### 4.2 Update Device Location

**Endpoint:** `POST {{base_url}}/api/customer/device/location`

**Headers:**
```json
Content-Type: application/json
```

**Request Body:**
```json
{
  "imei1": "123456789012345",
  "latitude": 28.7041,
  "longitude": 77.1025
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Location updated successfully",
  "data": {
    "customerId": "6750abcd1234567890123456",
    "customerName": "John Doe",
    "location": {
      "latitude": 28.7041,
      "longitude": 77.1025,
      "lastUpdated": "2025-12-25T10:15:00.000Z"
    }
  }
}
```

---

## 5️⃣ Customer Management

### 5.1 Get All Customers

**Endpoint:** `GET {{base_url}}/api/admin/customers?page=1&limit=20&search=john`

**Headers:**
```json
Authorization: Bearer {{admin_token}}
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20) |
| `search` | string | Search by name, mobile, Aadhar, IMEI |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Customers fetched successfully",
  "data": {
    "customers": [
      {
        "id": "6750abcd1234567890123456",
        "fullName": "John Doe",
        "mobileNumber": "9876543210",
        "aadharNumber": "123456789012",
        "imei1": "123456789012345",
        "isLocked": false,
        "emiDetails": {
          "emiPerMonth": 12206.25,
          "numberOfMonths": 8,
          "emiMonths": [
            { "month": 1, "paid": true },
            { "month": 2, "paid": false }
          ]
        },
        "retailer": {
          "id": "6750xyz1234567890123456",
          "fullName": "Retailer Name",
          "shopName": "Shop Name"
        },
        "createdAt": "2025-12-15T10:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 100,
      "itemsPerPage": 20,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

---

### 5.2 Get Locked Customers IMEI

**Endpoint:** `GET {{base_url}}/api/admin/customers/locked/imei`

**Headers:**
```json
Authorization: Bearer {{admin_token}}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Locked customers IMEI fetched successfully",
  "data": {
    "totalLockedCustomers": 5,
    "totalImeis": 10,
    "allImeis": [
      "123456789012345",
      "234567890123456",
      "345678901234567"
    ],
    "customers": [
      {
        "customerId": "6750abcd1234567890123456",
        "customerName": "John Doe",
        "mobileNumber": "9876543210",
        "imei1": "123456789012345",
        "imei2": "234567890123456",
        "totalImeis": 2,
        "imeis": ["123456789012345", "234567890123456"],
        "retailer": {
          "name": "Retailer Name",
          "shopName": "Shop Name"
        }
      }
    ]
  }
}
```

---

## 📝 Postman Collection Structure

Organize your Postman collection like this:

```
EMI Lock System
├── 1. Admin Auth
│   ├── Send OTP
│   └── Verify OTP
├── 2. Customer Lock/Unlock
│   ├── Lock Customer
│   ├── Unlock Customer
│   └── Get Lock Status (Polling)
├── 3. Device Registration
│   ├── Register Device
│   ├── Update FCM Token
│   └── Get Customer Status
├── 4. Device Callbacks
│   ├── Lock Response (Success)
│   ├── Lock Response (Failed)
│   └── Update Location
└── 5. Customer Management
    ├── Get All Customers
    └── Get Locked Customers IMEI
```

---

## 🧪 Testing Scenarios

### Scenario 1: Complete Lock Flow

1. **Admin Login**
   ```
   POST /api/admin/auth/send-otp
   POST /api/admin/auth/verify-otp
   ```

2. **Find Customer**
   ```
   GET /api/admin/customers?search=john
   → Copy customer ID
   ```

3. **Lock Device**
   ```
   PUT /api/admin/customers/{customerId}/lock
   Body: { "isLocked": true }
   → Should return pendingDeviceConfirmation: true
   ```

4. **Simulate Device Response**
   ```
   POST /api/customer/device/lock-response
   Body: {
     "imei1": "123456789012345",
     "lockSuccess": true,
     "action": "LOCK_DEVICE"
   }
   ```

5. **Verify Lock Status**
   ```
   GET /api/admin/customers/{customerId}/lock-status
   → Should show isLocked: true
   ```

---

### Scenario 2: No FCM Token Error

1. **Find customer without FCM token**
   ```
   GET /api/admin/customers
   → Find customer with hasFcmToken: false
   ```

2. **Try to lock**
   ```
   PUT /api/admin/customers/{customerId}/lock
   Body: { "isLocked": true }
   → Should return error: NO_FCM_TOKEN
   ```

3. **Register device**
   ```
   POST /api/customer/device/register
   Body: {
     "fcmToken": "new_token...",
     "imei1": "customer_imei"
   }
   ```

4. **Retry lock**
   ```
   PUT /api/admin/customers/{customerId}/lock
   → Should succeed now
   ```

---

### Scenario 3: Long-Polling Simulation

Use Postman Pre-request Script:
```javascript
// Set polling counter
const attempt = pm.environment.get("poll_attempt") || 0;
pm.environment.set("poll_attempt", attempt + 1);
```

Use Postman Test Script:
```javascript
const response = pm.response.json();
const maxAttempts = 10;
const attempt = pm.environment.get("poll_attempt");

if (response.data.isLocked === true) {
  // Device is locked!
  console.log("✅ Device locked!");
  pm.environment.unset("poll_attempt");
} else if (attempt < maxAttempts) {
  // Keep polling
  setTimeout(() => {
    postman.setNextRequest(pm.info.requestName);
  }, 1000); // Poll every 1 second
} else {
  // Timeout
  console.log("❌ Timeout - device did not respond");
  pm.environment.unset("poll_attempt");
}
```

---

## 🔍 Error Codes Reference

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `NO_FCM_TOKEN` | 400 | Customer device not registered |
| `CUSTOMER_NOT_FOUND` | 404 | Customer ID or IMEI not found |
| `INVALID_TOKEN` | 401 | Admin JWT token invalid/expired |
| `VALIDATION_ERROR` | 400 | Request body validation failed |
| `FCM_SEND_FAILED` | 500 | Firebase notification failed |
| `SERVER_ERROR` | 500 | Internal server error |

---

## 💡 Pro Tips

### Auto-Save Token
In "Verify OTP" request Tests tab:
```javascript
if (pm.response.code === 200) {
  const token = pm.response.json().data.token;
  pm.environment.set("admin_token", token);
  console.log("Token saved:", token.substring(0, 20) + "...");
}
```

### Chain Requests
Use `postman.setNextRequest("Request Name")` to create flows

### Pre-fill IMEI
Save common IMEIs as environment variables:
```javascript
pm.environment.set("test_imei", "123456789012345");
```

---

## 📥 Import into Postman

1. Copy this entire document
2. Convert to JSON using [this tool](https://learning.postman.com/docs/getting-started/importing-and-exporting-data/)
3. Or manually create requests following the structure above

Happy Testing! 🎉
