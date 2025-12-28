# Admin Recovery Head Management API Documentation

## Overview

This document describes the Admin APIs for managing recovery heads in the system. Recovery heads are managers who oversee recovery persons and monitor device collection operations.

**Key Changes in New Flow**:
- ❌ **No longer requires pincodes** when creating recovery heads
- ✅ **Only requires name and mobile number**
- ✅ Pincodes are now assigned to recovery persons, not recovery heads

---

## Table of Contents

1. [Create Recovery Head](#create-recovery-head)
2. [Get All Recovery Heads](#get-all-recovery-heads)
3. [Update Recovery Head Status](#update-recovery-head-status)
4. [Get Recovery Head Details](#get-recovery-head-details)

---

## Create Recovery Head

Create a new recovery head with name and mobile number.

**Endpoint:** `POST /api/admin/recovery-heads`

**Authentication:** Required (Admin JWT token)

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json
```

**Request Body:**

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `fullName` | String | Yes | Non-empty, trimmed | Full name of the recovery head |
| `mobileNumber` | String | Yes | Exactly 10 digits | Mobile number (must be unique) |

**Request Example:**
```json
{
  "fullName": "Rajesh Kumar",
  "mobileNumber": "9876543210"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Recovery head created successfully",
  "data": {
    "recoveryHeadId": "507f1f77bcf86cd799439011",
    "fullName": "Rajesh Kumar",
    "mobileNumber": "9876543210",
    "status": "ACTIVE",
    "createdAt": "2025-12-28T10:00:00.000Z",
    "updatedAt": "2025-12-28T10:00:00.000Z"
  }
}
```

**Error Responses:**

### 400 Bad Request - Validation Error
```json
{
  "success": false,
  "message": "Validation failed",
  "error": "VALIDATION_ERROR",
  "details": [
    {
      "msg": "Full name is required",
      "param": "fullName",
      "location": "body"
    }
  ]
}
```

### 409 Conflict - Mobile Number Already Exists
```json
{
  "success": false,
  "message": "Recovery head with this mobile number already exists",
  "error": "MOBILE_NUMBER_EXISTS"
}
```

### 401 Unauthorized - Invalid Token
```json
{
  "success": false,
  "message": "Authentication required",
  "error": "UNAUTHORIZED"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/admin/recovery-heads \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Rajesh Kumar",
    "mobileNumber": "9876543210"
  }'
```

---

## Get All Recovery Heads

Retrieve all recovery heads with pagination, search, and filtering.

**Endpoint:** `GET /api/admin/recovery-heads`

**Authentication:** Required (Admin JWT token)

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | Integer | No | 1 | Page number for pagination |
| `limit` | Integer | No | 20 | Number of items per page (max 100) |
| `search` | String | No | "" | Search by name or mobile number |
| `status` | String | No | All | Filter by status: 'ACTIVE' or 'INACTIVE' |

**Request Examples:**
```
GET /api/admin/recovery-heads
GET /api/admin/recovery-heads?page=1&limit=10
GET /api/admin/recovery-heads?search=Rajesh
GET /api/admin/recovery-heads?status=ACTIVE
GET /api/admin/recovery-heads?page=2&limit=20&search=Kumar&status=ACTIVE
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Recovery heads fetched successfully",
  "data": {
    "recoveryHeads": [
      {
        "recoveryHeadId": "507f1f77bcf86cd799439011",
        "fullName": "Rajesh Kumar",
        "mobileNumber": "9876543210",
        "status": "ACTIVE",
        "statistics": {
          "totalRecoveryPersons": 5,
          "totalCustomersAssigned": 45,
          "pendingCollections": 28,
          "completedCollections": 17,
          "collectionRate": 37.78
        },
        "createdAt": "2025-12-28T10:00:00.000Z",
        "updatedAt": "2025-12-28T10:00:00.000Z"
      },
      {
        "recoveryHeadId": "507f1f77bcf86cd799439012",
        "fullName": "Priya Sharma",
        "mobileNumber": "9123456789",
        "status": "ACTIVE",
        "statistics": {
          "totalRecoveryPersons": 3,
          "totalCustomersAssigned": 22,
          "pendingCollections": 10,
          "completedCollections": 12,
          "collectionRate": 54.55
        },
        "createdAt": "2025-12-27T09:00:00.000Z",
        "updatedAt": "2025-12-27T09:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 45,
      "itemsPerPage": 20
    }
  }
}
```

**cURL Example:**
```bash
curl -X GET "http://localhost:5000/api/admin/recovery-heads?page=1&limit=10&status=ACTIVE" \
  -H "Authorization: Bearer <admin_token>"
```

---

## Update Recovery Head Status

Activate or deactivate a recovery head.

**Endpoint:** `PUT /api/admin/recovery-heads/:recoveryHeadId/status`

**Authentication:** Required (Admin JWT token)

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json
```

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `recoveryHeadId` | String | MongoDB ObjectId of the recovery head (24 hex characters) |

**Request Body:**

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `status` | String | Yes | 'ACTIVE' or 'INACTIVE' | New status for the recovery head |

**Request Example:**
```json
{
  "status": "INACTIVE"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Recovery head status updated successfully",
  "data": {
    "recoveryHeadId": "507f1f77bcf86cd799439011",
    "fullName": "Rajesh Kumar",
    "mobileNumber": "9876543210",
    "status": "INACTIVE",
    "updatedAt": "2025-12-28T15:30:00.000Z"
  }
}
```

**cURL Example:**
```bash
curl -X PUT http://localhost:5000/api/admin/recovery-heads/507f1f77bcf86cd799439011/status \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "INACTIVE"
  }'
```

---

## Migration from Old Flow

### Old Flow (Deprecated)
```json
{
  "fullName": "Rajesh Kumar",
  "mobileNumber": "9876543210",
  "pinCodes": ["221001", "221002", "221005"]  // ❌ No longer required
}
```

### New Flow (Current)
```json
{
  "fullName": "Rajesh Kumar",
  "mobileNumber": "9876543210"
  // ✅ Pincodes now assigned to recovery persons, not recovery heads
}
```

---

**Document Version**: 1.0  
**Last Updated**: 2025-12-28  
**Author**: Development Team
