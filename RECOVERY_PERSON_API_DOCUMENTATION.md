# Recovery Person API Documentation

## Overview

This document describes the Recovery Person management system where recovery heads can create and manage recovery persons, and recovery persons can authenticate and access the system.

---

## Table of Contents

1. [Recovery Head APIs](#recovery-head-apis)
   - [Create Recovery Person](#1-create-recovery-person)
   - [Get All Recovery Persons](#2-get-all-recovery-persons)
   - [Update Recovery Person Status](#3-update-recovery-person-status)
2. [Recovery Person APIs](#recovery-person-apis)
   - [Send OTP](#1-send-otp)
   - [Verify OTP & Login](#2-verify-otp--login)

---

## Recovery Head APIs

These APIs allow recovery heads to create and manage their recovery persons.

### 1. Create Recovery Person

Create a new recovery person under the authenticated recovery head.

**Endpoint:** `POST /api/recovery-head/recovery-persons`

**Authentication:** Required (Recovery Head JWT token)

**Headers:**
```json
{
  "Authorization": "Bearer <recovery_head_jwt_token>",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "fullName": "John Doe",
  "aadharNumber": "123456789012",
  "mobileNumber": "9876543210"
}
```

**Field Validations:**
- `fullName`: Required, non-empty string
- `aadharNumber`: Required, exactly 12 digits, unique
- `mobileNumber`: Required, exactly 10 digits, unique

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Recovery person created successfully",
  "data": {
    "recoveryPersonId": "507f1f77bcf86cd799439011",
    "fullName": "John Doe",
    "aadharNumber": "123456789012",
    "mobileNumber": "9876543210",
    "mobileVerified": true,
    "isActive": true,
    "recoveryHeadId": "507f1f77bcf86cd799439012",
    "createdAt": "2025-12-25T10:30:00.000Z"
  }
}
```

**Error Responses:**

**400 Bad Request - Validation Error:**
```json
{
  "success": false,
  "message": "Validation failed",
  "error": "VALIDATION_ERROR",
  "details": [
    {
      "msg": "Aadhar number must be exactly 12 digits",
      "param": "aadharNumber",
      "location": "body"
    }
  ]
}
```

**400 Bad Request - Duplicate Aadhar:**
```json
{
  "success": false,
  "message": "Recovery person with this Aadhar number already exists",
  "error": "DUPLICATE_AADHAR"
}
```

**400 Bad Request - Duplicate Mobile:**
```json
{
  "success": false,
  "message": "Mobile number already registered",
  "error": "DUPLICATE_MOBILE"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Authorization token not found",
  "error": "INVALID_TOKEN"
}
```

**Example cURL:**
```bash
curl -X POST http://localhost:5000/api/recovery-head/recovery-persons \
  -H "Authorization: Bearer <recovery_head_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "aadharNumber": "123456789012",
    "mobileNumber": "9876543210"
  }'
```

---

### 2. Get All Recovery Persons

Retrieve all recovery persons created by the authenticated recovery head with pagination and search.

**Endpoint:** `GET /api/recovery-head/recovery-persons`

**Authentication:** Required (Recovery Head JWT token)

**Headers:**
```json
{
  "Authorization": "Bearer <recovery_head_jwt_token>"
}
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `search` (optional): Search by name, mobile, or aadhar

**Example Request:**
```
GET /api/recovery-head/recovery-persons?page=1&limit=10&search=John
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Recovery persons fetched successfully",
  "data": {
    "recoveryPersons": [
      {
        "id": "507f1f77bcf86cd799439011",
        "fullName": "John Doe",
        "aadharNumber": "123456789012",
        "mobileNumber": "9876543210",
        "mobileVerified": true,
        "isActive": true,
        "createdAt": "2025-12-25T10:30:00.000Z",
        "updatedAt": "2025-12-25T10:30:00.000Z"
      },
      {
        "id": "507f1f77bcf86cd799439013",
        "fullName": "Jane Smith",
        "aadharNumber": "987654321098",
        "mobileNumber": "9123456789",
        "mobileVerified": true,
        "isActive": false,
        "createdAt": "2025-12-24T15:20:00.000Z",
        "updatedAt": "2025-12-25T09:15:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 25,
      "itemsPerPage": 10,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

**Error Responses:**

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Authorization token not found",
  "error": "INVALID_TOKEN"
}
```

**Example cURL:**
```bash
curl -X GET "http://localhost:5000/api/recovery-head/recovery-persons?page=1&limit=10&search=John" \
  -H "Authorization: Bearer <recovery_head_token>"
```

---

### 3. Update Recovery Person Status

Activate or deactivate a recovery person.

**Endpoint:** `PUT /api/recovery-head/recovery-persons/:recoveryPersonId/status`

**Authentication:** Required (Recovery Head JWT token)

**Headers:**
```json
{
  "Authorization": "Bearer <recovery_head_jwt_token>",
  "Content-Type": "application/json"
}
```

**URL Parameters:**
- `recoveryPersonId`: MongoDB ObjectId of the recovery person

**Request Body:**
```json
{
  "isActive": false
}
```

**Field Validations:**
- `isActive`: Required, boolean (true or false)

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Recovery person deactivated successfully",
  "data": {
    "recoveryPersonId": "507f1f77bcf86cd799439011",
    "fullName": "John Doe",
    "previousStatus": true,
    "currentStatus": false,
    "updatedAt": "2025-12-25T11:00:00.000Z"
  }
}
```

**Error Responses:**

**400 Bad Request - Invalid Status:**
```json
{
  "success": false,
  "message": "isActive status is required and must be a boolean",
  "error": "VALIDATION_ERROR"
}
```

**400 Bad Request - Invalid ID:**
```json
{
  "success": false,
  "message": "Invalid recovery person ID format",
  "error": "VALIDATION_ERROR"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Recovery person not found or not authorized",
  "error": "RECOVERY_PERSON_NOT_FOUND"
}
```

**Example cURL:**
```bash
curl -X PUT http://localhost:5000/api/recovery-head/recovery-persons/507f1f77bcf86cd799439011/status \
  -H "Authorization: Bearer <recovery_head_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "isActive": false
  }'
```

---

## Recovery Person APIs

These APIs allow recovery persons to authenticate and access the system.

### 1. Send OTP

Send OTP to recovery person's mobile number for login.

**Endpoint:** `POST /api/recovery-person/auth/send-otp`

**Authentication:** Not required (Public)

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "mobileNumber": "9876543210"
}
```

**Field Validations:**
- `mobileNumber`: Required, exactly 10 digits

**Success Response (200 OK):**
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

**Note:** OTP is valid for 5 minutes (300 seconds). In development, the OTP is logged to the console.

**Error Responses:**

**400 Bad Request - Validation Error:**
```json
{
  "success": false,
  "message": "Invalid mobile number format",
  "error": "VALIDATION_ERROR",
  "details": [
    {
      "msg": "Mobile number must be exactly 10 digits",
      "param": "mobileNumber",
      "location": "body"
    }
  ]
}
```

**403 Forbidden - Not Registered:**
```json
{
  "success": false,
  "message": "This mobile number is not registered as recovery person",
  "error": "UNAUTHORIZED_ACCESS"
}
```

**403 Forbidden - Account Inactive:**
```json
{
  "success": false,
  "message": "Recovery person account is inactive. Please contact your recovery head.",
  "error": "ACCOUNT_INACTIVE"
}
```

**Example cURL:**
```bash
curl -X POST http://localhost:5000/api/recovery-person/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "mobileNumber": "9876543210"
  }'
```

---

### 2. Verify OTP & Login

Verify OTP and receive JWT token for authentication.

**Endpoint:** `POST /api/recovery-person/auth/verify-otp`

**Authentication:** Not required (Public)

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "mobileNumber": "9876543210",
  "otp": "123456"
}
```

**Field Validations:**
- `mobileNumber`: Required, exactly 10 digits
- `otp`: Required, exactly 6 digits

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "recoveryPerson": {
      "id": "507f1f77bcf86cd799439011",
      "fullName": "John Doe",
      "mobileNumber": "9876543210",
      "aadharNumber": "123456789012",
      "recoveryHead": {
        "id": "507f1f77bcf86cd799439012",
        "fullName": "Recovery Head Name",
        "mobileNumber": "9123456789"
      }
    }
  }
}
```

**Token Details:**
- The JWT token contains:
  - `id`: Recovery person ID
  - `mobileNumber`: Recovery person mobile number
  - `role`: "RECOVERY_PERSON"
  - `recoveryHeadId`: Associated recovery head ID
- Use this token in the `Authorization: Bearer <token>` header for protected routes

**Error Responses:**

**400 Bad Request - Validation Error:**
```json
{
  "success": false,
  "message": "Validation failed",
  "error": "VALIDATION_ERROR",
  "details": [
    {
      "msg": "OTP must be exactly 6 digits",
      "param": "otp",
      "location": "body"
    }
  ]
}
```

**401 Unauthorized - Invalid OTP:**
```json
{
  "success": false,
  "message": "Invalid or expired OTP",
  "error": "INVALID_OTP"
}
```

**401 Unauthorized - Not Found:**
```json
{
  "success": false,
  "message": "Recovery person not found",
  "error": "UNAUTHORIZED_ACCESS"
}
```

**403 Forbidden - Account Inactive:**
```json
{
  "success": false,
  "message": "Recovery person account is inactive",
  "error": "ACCOUNT_INACTIVE"
}
```

**Example cURL:**
```bash
curl -X POST http://localhost:5000/api/recovery-person/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "mobileNumber": "9876543210",
    "otp": "123456"
  }'
```

---

## Complete Flow Example

### Recovery Head Creates Recovery Person

```javascript
// Step 1: Recovery head logs in (existing flow)
const recoveryHeadToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

// Step 2: Create recovery person
const createResponse = await fetch('http://localhost:5000/api/recovery-head/recovery-persons', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${recoveryHeadToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    fullName: "John Doe",
    aadharNumber: "123456789012",
    mobileNumber: "9876543210"
  })
});

const result = await createResponse.json();
console.log(result);
// Recovery person created with ID: 507f1f77bcf86cd799439011
```

### Recovery Person Login

```javascript
// Step 1: Send OTP
const otpResponse = await fetch('http://localhost:5000/api/recovery-person/auth/send-otp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    mobileNumber: "9876543210"
  })
});

const otpResult = await otpResponse.json();
console.log(otpResult);
// OTP sent successfully (check console for OTP in development)

// Step 2: Verify OTP (use OTP from console/SMS)
const verifyResponse = await fetch('http://localhost:5000/api/recovery-person/auth/verify-otp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    mobileNumber: "9876543210",
    otp: "123456"
  })
});

const loginResult = await verifyResponse.json();
console.log(loginResult);
// Login successful, token received

// Step 3: Use token for authenticated requests
const recoveryPersonToken = loginResult.data.token;
// Use this token in Authorization header for protected routes
```

---

## Error Codes Reference

| Error Code | Description |
|------------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `DUPLICATE_AADHAR` | Aadhar number already exists |
| `DUPLICATE_MOBILE` | Mobile number already registered |
| `INVALID_TOKEN` | JWT token is invalid or expired |
| `UNAUTHORIZED_ACCESS` | User not found or not authorized |
| `ACCOUNT_INACTIVE` | Account is deactivated |
| `RECOVERY_PERSON_NOT_FOUND` | Recovery person not found |
| `FORBIDDEN` | Access denied due to role mismatch |
| `INVALID_OTP` | OTP is invalid or expired |
| `SERVER_ERROR` | Internal server error |

---

## Notes

1. **OTP Expiry**: OTPs expire after 5 minutes
2. **Rate Limiting**: OTP endpoints are rate-limited to prevent abuse
3. **Mobile Verification**: Recovery persons are created with `mobileVerified: true`
4. **Active Status**: Only active recovery persons can login
5. **Recovery Head Association**: Each recovery person is linked to the recovery head who created them
6. **JWT Token**: Tokens contain role information for authorization
7. **Development Mode**: In development, OTPs are logged to console for testing

---

## Testing

### Using Postman

1. **Create Recovery Person**:
   - Method: POST
   - URL: `http://localhost:5000/api/recovery-head/recovery-persons`
   - Headers: `Authorization: Bearer <recovery_head_token>`
   - Body (JSON):
     ```json
     {
       "fullName": "Test Person",
       "aadharNumber": "123456789012",
       "mobileNumber": "9876543210"
     }
     ```

2. **Recovery Person Login**:
   - Send OTP: POST to `/api/recovery-person/auth/send-otp`
   - Check console for OTP
   - Verify OTP: POST to `/api/recovery-person/auth/verify-otp`
   - Save the token from response

3. **Get All Recovery Persons**:
   - Method: GET
   - URL: `http://localhost:5000/api/recovery-head/recovery-persons`
   - Headers: `Authorization: Bearer <recovery_head_token>`

---

## Support

For issues or questions, please contact the development team.
