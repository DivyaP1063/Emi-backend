# Retailer Status Update API - Implementation Documentation

**Date:** December 20, 2025  
**Feature:** Admin API to Update Retailer Status

---

## Overview

Implemented a new admin API endpoint that allows administrators to update the status of retailers. Retailers can have three status values: `ACTIVE`, `INACTIVE`, or `SUSPENDED`.

---

## API Endpoint

### Update Retailer Status

**Endpoint:** `PUT /api/admin/retailers/:retailerId/status`  
**Authentication:** Required (Admin JWT token)  
**Purpose:** Update the status of a retailer

#### Request

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json
```

**URL Parameters:**
- `retailerId` - MongoDB ObjectId of the retailer

**Body:**
```json
{
  "status": "INACTIVE"
}
```

**Valid Status Values:**
- `ACTIVE` - Retailer can login and perform all operations
- `INACTIVE` - Retailer account is temporarily disabled, cannot login
- `SUSPENDED` - Retailer account is suspended due to violations, cannot login

#### Response

**Success (200):**
```json
{
  "success": true,
  "message": "Retailer status updated from ACTIVE to INACTIVE",
  "data": {
    "retailerId": "6750abcd1234567890123456",
    "fullName": "John Doe",
    "shopName": "John's Electronics",
    "email": "john@example.com",
    "mobileNumber": "9876543210",
    "previousStatus": "ACTIVE",
    "currentStatus": "INACTIVE",
    "updatedAt": "2025-12-20T10:00:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Validation error (invalid status value or retailer ID format)
- `401` - Unauthorized (missing or invalid admin token)
- `404` - Retailer not found
- `500` - Server error

---

## Implementation Details

### Files Modified

#### 1. Controller - `src/controllers/retailerController.js`

**Added:**
- `updateRetailerStatusValidation` - Express-validator middleware
  - Validates status is required and not empty
  - Ensures status is one of: ACTIVE, INACTIVE, SUSPENDED

- `updateRetailerStatus` - Controller function
  - Validates retailer ID format (MongoDB ObjectId)
  - Checks if retailer exists
  - Handles case where status is already the same
  - Updates status and returns detailed response

**Code Location:** Lines 234-336

#### 2. Routes - `src/routes/index.js`

**Added:**
```javascript
router.put('/retailers/:retailerId/status', authenticate, updateRetailerStatusValidation, updateRetailerStatus);
```

**Middleware Chain:**
1. `authenticate` - Admin authentication
2. `updateRetailerStatusValidation` - Request validation
3. `updateRetailerStatus` - Status update logic

**Code Location:** Line 13

**Important Note:** This route must be defined **before** the `router.use('/retailers', retailerRoutes)` mount point (line 16). Specific routes need to be registered before wildcard route mounts, otherwise they will never be matched.

#### 3. Documentation - `FRONTEND_API_DOCUMENTATION.md`

**Added:** Complete API documentation section 3.3
- Endpoint details
- Request/response examples
- Error responses
- Status descriptions
- Usage guidelines

**Code Location:** Lines 401-528

---

## Security Features

✅ **Admin Authentication Required** - Only authenticated admins can update retailer status  
✅ **Input Validation** - Status must be one of three valid values  
✅ **ID Validation** - Retailer ID format validated before database query  
✅ **Error Handling** - Comprehensive error responses for all failure scenarios  
✅ **Existing Integration** - Retailer authentication middleware already prevents login for non-ACTIVE retailers

---

## Testing Guide

### Prerequisites
1. Admin account with valid credentials
2. At least one retailer in the database

### Test Steps

**1. Get Admin Token**
```bash
# Send OTP
curl -X POST http://localhost:5000/api/admin/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"mobileNumber": "1234567890"}'

# Verify OTP
curl -X POST http://localhost:5000/api/admin/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"mobileNumber": "1234567890", "otp": "123456"}'
```

**2. Get Retailer List**
```bash
curl -X GET http://localhost:5000/api/admin/retailers \
  -H "Authorization: Bearer <admin_token>"
```

**3. Update Retailer Status**
```bash
# Set to INACTIVE
curl -X PUT http://localhost:5000/api/admin/retailers/<retailer_id>/status \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "INACTIVE"}'

# Set to SUSPENDED
curl -X PUT http://localhost:5000/api/admin/retailers/<retailer_id>/status \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "SUSPENDED"}'

# Reactivate
curl -X PUT http://localhost:5000/api/admin/retailers/<retailer_id>/status \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "ACTIVE"}'
```

**4. Verify Effect**
Try logging in as the retailer whose status was changed to confirm they cannot access when status is not ACTIVE.

---

## Integration Notes

The existing `authenticateRetailer` middleware (in `src/middleware/auth.js`) already checks retailer status:

```javascript
if (retailer.status !== 'ACTIVE') {
  return res.status(403).json({
    success: false,
    message: `Retailer account is ${retailer.status.toLowerCase()}`,
    error: 'ACCOUNT_NOT_ACTIVE'
  });
}
```

This means when an admin changes a retailer's status to `INACTIVE` or `SUSPENDED`, that retailer will **immediately** be unable to:
- Login to their account
- Access any protected retailer endpoints
- Perform any retailer operations

---

## Use Cases

1. **Temporary Deactivation**
   - Set status to `INACTIVE` when retailer requests temporary account suspension
   - Reactivate by setting back to `ACTIVE`

2. **Policy Violations**
   - Set status to `SUSPENDED` for retailers violating terms of service
   - Requires admin review before reactivation

3. **Account Management**
   - Quickly disable problematic accounts
   - Manage retailer access without deleting accounts
   - Maintain audit trail of status changes

---

## Summary

✅ API endpoint created and tested  
✅ Admin authentication enforced  
✅ Input validation implemented  
✅ Error handling comprehensive  
✅ Documentation updated  
✅ Integration with existing authentication confirmed  

The feature is **production-ready** and can be deployed immediately.

---

## Customer Lock/Unlock API (Existing Feature)

### Overview
This API was already implemented in the system. It allows admins to lock or unlock customer accounts.

### API Endpoint

**Endpoint:** `PUT /api/admin/customers/:customerId/lock`  
**Authentication:** Required (Admin JWT token)  
**Purpose:** Lock or unlock a customer account

#### Request

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json
```

**URL Parameters:**
- `customerId` - MongoDB ObjectId of the customer

**Body:**
```json
{
  "isLocked": true
}
```

**Field:**
- `isLocked` (boolean, required)
  - `true` - Lock the customer account
  - `false` - Unlock the customer account

#### Response

**Success (200):**
```json
{
  "success": true,
  "message": "Customer locked successfully",
  "data": {
    "customerId": "6750abcd1234567890123456",
    "customerName": "Rajesh Kumar",
    "isLocked": true,
    "updatedAt": "2025-12-20T10:00:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Validation error (isLocked must be boolean or invalid customer ID)
- `401` - Unauthorized (missing or invalid admin token)
- `404` - Customer not found
- `500` - Server error

### Testing in Postman

**1. Get Admin Token**
```
POST /api/admin/auth/send-otp
POST /api/admin/auth/verify-otp
```

**2. Get Customer ID**
```
GET /api/admin/customers
```

**3. Lock Customer**
```
PUT /api/admin/customers/{customerId}/lock

Body:
{
  "isLocked": true
}
```

**4. Unlock Customer**
```
PUT /api/admin/customers/{customerId}/lock

Body:
{
  "isLocked": false
}
```

### Implementation Details

**Controller:** `src/controllers/authController.js` (lines 350-410)  
**Function:** `toggleCustomerLock`  
**Route:** `src/routes/index.js` (line 21)

### Use Cases
- Lock customers who violate terms
- Prevent access for overdue payments
- Temporarily disable problematic accounts
- Quick account management without deletion

---

## Get Locked Customers IMEI API (New Feature)

### Overview
This API allows admins to fetch IMEI numbers of all customers who are currently locked. It returns both required (imei1) and optional (imei2) IMEI numbers.

### API Endpoint

**Endpoint:** `GET /api/admin/customers/locked/imei`  
**Authentication:** Required (Admin JWT token)  
**Purpose:** Retrieve IMEI numbers of all locked customers

#### Request

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**No Body Required** - This is a GET request

#### Response

**Success (200):**
```json
{
  "success": true,
  "message": "Locked customers IMEI fetched successfully",
  "data": {
    "totalLockedCustomers": 5,
    "totalImeis": 8,
    "allImeis": [
      "123456789012345",
      "987654321098765",
      "111222333444555",
      "666777888999000",
      "123123123123123",
      "456456456456456",
      "789789789789789",
      "321321321321321"
    ],
    "customers": [
      {
        "customerId": "6750abcd1234567890123456",
        "customerName": "Rajesh Kumar",
        "mobileNumber": "9876543210",
        "imei1": "123456789012345",
        "imei2": "987654321098765",
        "totalImeis": 2,
        "imeis": ["123456789012345", "987654321098765"],
        "retailer": {
          "id": "6750xyz1234567890123456",
          "name": "Amit Sharma",
          "shopName": "Sharma Mobile Store",
          "mobile": "9876543210"
        },
        "lockedSince": "2025-12-20T10:00:00.000Z"
      },
      {
        "customerId": "6750def1234567890123456",
        "customerName": "Priya Singh",
        "mobileNumber": "9123456789",
        "imei1": "111222333444555",
        "imei2": null,
        "totalImeis": 1,
        "imeis": ["111222333444555"],
        "retailer": {
          "id": "6750xyz1234567890123456",
          "name": "Amit Sharma",
          "shopName": "Sharma Mobile Store",
          "mobile": "9876543210"
        },
        "lockedSince": "2025-12-19T15:30:00.000Z"
      }
    ]
  }
}
```

**Response Fields:**
- `totalLockedCustomers` - Total number of locked customers
- `totalImeis` - Total count of all IMEI numbers (imei1 + imei2)
- `allImeis` - Flat array of all IMEI numbers for easy access
- `customers` - Detailed array of each locked customer with:
  - `customerId` - Customer's unique ID
  - `customerName` - Full name
  - `mobileNumber` - Contact number
  - `imei1` - Primary IMEI (always present)
  - `imei2` - Secondary IMEI (null if not provided)
  - `totalImeis` - Count of IMEIs for this customer (1 or 2)
  - `imeis` - Array of this customer's IMEIs
  - `retailer` - Retailer who registered this customer
  - `lockedSince` - When the customer was created

**Error Responses:**
- `401` - Unauthorized (missing or invalid admin token)
- `500` - Server error

### Testing in Postman

**Method:** `GET`  
**URL:** `http://localhost:5000/api/admin/customers/locked/imei`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**No Body Required**

### Implementation Details

**Controller:** `src/controllers/authController.js` (lines 412-477)  
**Function:** `getLockedCustomersImei`  
**Route:** `src/routes/index.js` (line 21)

### Use Cases
- Get list of all IMEI numbers to block on network
- Export locked customer IMEIs for device tracking
- Monitor which devices are associated with locked accounts
- Generate reports of locked customers and their devices
- Bulk IMEI blocking for security purposes
