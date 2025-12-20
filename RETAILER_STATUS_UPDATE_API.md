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
