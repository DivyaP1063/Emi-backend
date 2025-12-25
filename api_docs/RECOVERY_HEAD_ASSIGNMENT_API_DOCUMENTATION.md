# Recovery Head Assignment API Documentation

## Overview

This document describes the Recovery Head Assignment system where recovery heads can assign customers to recovery persons, manage assignments, and track customer distribution among their recovery team.

---

## Table of Contents

1. [Assign Customer to Recovery Person](#1-assign-customer-to-recovery-person)
2. [Get Recovery Persons with Customers](#2-get-recovery-persons-with-customers)
3. [Get Assignment Details](#3-get-assignment-details)
4. [Unassign Customer from Recovery Person](#4-unassign-customer-from-recovery-person)

---

## 1. Assign Customer to Recovery Person

Assign a customer (who is already assigned to the recovery head) to a specific recovery person under the recovery head's management.

**Endpoint:** `POST /api/recovery-head/assign-customer`

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
  "recoveryPersonId": "507f1f77bcf86cd799439011",
  "customerId": "507f1f77bcf86cd799439022"
}
```

**Field Validations:**
- `recoveryPersonId`: Required, valid MongoDB ObjectId (24 hex characters)
- `customerId`: Required, valid MongoDB ObjectId (24 hex characters)

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Customer assigned to recovery person successfully",
  "data": {
    "assignmentId": "507f1f77bcf86cd799439033",
    "recoveryPersonId": "507f1f77bcf86cd799439011",
    "recoveryPersonName": "John Doe",
    "customerId": "507f1f77bcf86cd799439022",
    "customerName": "Jane Smith",
    "assignedAt": "2025-12-26T00:15:00.000Z"
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
      "msg": "Invalid recovery person ID format",
      "param": "recoveryPersonId",
      "location": "body"
    }
  ]
}
```

**404 Not Found - Recovery Person Not Found:**
```json
{
  "success": false,
  "message": "Recovery person not found or does not belong to you",
  "error": "RECOVERY_PERSON_NOT_FOUND"
}
```

**404 Not Found - Customer Not Found:**
```json
{
  "success": false,
  "message": "Customer not found or not assigned to you",
  "error": "CUSTOMER_NOT_FOUND"
}
```

**409 Conflict - Customer Already Assigned:**
```json
{
  "success": false,
  "message": "Customer is already assigned to a recovery person",
  "error": "CUSTOMER_ALREADY_ASSIGNED",
  "data": {
    "assignmentId": "507f1f77bcf86cd799439044",
    "recoveryPersonId": "507f1f77bcf86cd799439055",
    "recoveryPersonName": "Another Person"
  }
}
```

**Example cURL:**
```bash
curl -X POST http://localhost:5000/api/recovery-head/assign-customer \
  -H "Authorization: Bearer <recovery_head_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "recoveryPersonId": "507f1f77bcf86cd799439011",
    "customerId": "507f1f77bcf86cd799439022"
  }'
```

---

## 2. Get Recovery Persons with Customers

Retrieve all recovery persons belonging to the authenticated recovery head along with their assigned customers.

**Endpoint:** `GET /api/recovery-head/recovery-persons-with-customers`

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
- `search` (optional): Search by recovery person name or mobile number

**Example Request:**
```
GET /api/recovery-head/recovery-persons-with-customers?page=1&limit=10&search=John
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Recovery persons with customers fetched successfully",
  "data": {
    "recoveryPersons": [
      {
        "recoveryPersonId": "507f1f77bcf86cd799439011",
        "fullName": "John Doe",
        "mobileNumber": "9876543210",
        "aadharNumber": "123456789012",
        "isActive": true,
        "customersCount": 3,
        "customers": [
          {
            "customerId": "507f1f77bcf86cd799439022",
            "fullName": "Jane Smith",
            "mobileNumber": "9123456789",
            "pincode": "123456",
            "balanceAmount": 15000,
            "isLocked": true
          },
          {
            "customerId": "507f1f77bcf86cd799439023",
            "fullName": "Bob Johnson",
            "mobileNumber": "9234567890",
            "pincode": "123456",
            "balanceAmount": 8000,
            "isLocked": false
          }
        ]
      },
      {
        "recoveryPersonId": "507f1f77bcf86cd799439012",
        "fullName": "Alice Brown",
        "mobileNumber": "9345678901",
        "aadharNumber": "987654321098",
        "isActive": true,
        "customersCount": 0,
        "customers": []
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalItems": 15,
      "itemsPerPage": 10
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
curl -X GET "http://localhost:5000/api/recovery-head/recovery-persons-with-customers?page=1&limit=10" \
  -H "Authorization: Bearer <recovery_head_token>"
```

---

## 3. Get Assignment Details

Retrieve detailed information about a specific assignment.

**Endpoint:** `GET /api/recovery-head/assignments/:assignmentId`

**Authentication:** Required (Recovery Head JWT token)

**Headers:**
```json
{
  "Authorization": "Bearer <recovery_head_jwt_token>"
}
```

**URL Parameters:**
- `assignmentId`: MongoDB ObjectId of the assignment

**Example Request:**
```
GET /api/recovery-head/assignments/507f1f77bcf86cd799439033
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Assignment details fetched successfully",
  "data": {
    "assignmentId": "507f1f77bcf86cd799439033",
    "status": "ACTIVE",
    "recoveryPerson": {
      "recoveryPersonId": "507f1f77bcf86cd799439011",
      "fullName": "John Doe",
      "mobileNumber": "9876543210",
      "aadharNumber": "123456789012",
      "isActive": true
    },
    "customer": {
      "customerId": "507f1f77bcf86cd799439022",
      "fullName": "Jane Smith",
      "mobileNumber": "9123456789",
      "address": {
        "village": "Sample Village",
        "nearbyLocation": "Near Temple",
        "post": "Sample Post",
        "district": "Sample District",
        "pincode": "123456"
      },
      "balanceAmount": 15000,
      "isLocked": true
    },
    "assignedAt": "2025-12-26T00:15:00.000Z",
    "unassignedAt": null
  }
}
```

**Error Responses:**

**400 Bad Request - Invalid ID:**
```json
{
  "success": false,
  "message": "Invalid assignment ID format",
  "error": "VALIDATION_ERROR"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Assignment not found or does not belong to you",
  "error": "ASSIGNMENT_NOT_FOUND"
}
```

**Example cURL:**
```bash
curl -X GET http://localhost:5000/api/recovery-head/assignments/507f1f77bcf86cd799439033 \
  -H "Authorization: Bearer <recovery_head_token>"
```

---

## 4. Unassign Customer from Recovery Person

Remove a customer assignment from a recovery person, making the customer available for reassignment.

**Endpoint:** `DELETE /api/recovery-head/assignments/:assignmentId`

**Authentication:** Required (Recovery Head JWT token)

**Headers:**
```json
{
  "Authorization": "Bearer <recovery_head_jwt_token>"
}
```

**URL Parameters:**
- `assignmentId`: MongoDB ObjectId of the assignment

**Example Request:**
```
DELETE /api/recovery-head/assignments/507f1f77bcf86cd799439033
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Customer unassigned from recovery person successfully",
  "data": {
    "assignmentId": "507f1f77bcf86cd799439033",
    "recoveryPersonId": "507f1f77bcf86cd799439011",
    "recoveryPersonName": "John Doe",
    "customerId": "507f1f77bcf86cd799439022",
    "customerName": "Jane Smith",
    "unassignedAt": "2025-12-26T01:00:00.000Z"
  }
}
```

**Error Responses:**

**400 Bad Request - Invalid ID:**
```json
{
  "success": false,
  "message": "Invalid assignment ID format",
  "error": "VALIDATION_ERROR"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Active assignment not found or does not belong to you",
  "error": "ASSIGNMENT_NOT_FOUND"
}
```

**Example cURL:**
```bash
curl -X DELETE http://localhost:5000/api/recovery-head/assignments/507f1f77bcf86cd799439033 \
  -H "Authorization: Bearer <recovery_head_token>"
```

---

## Complete Flow Example

### Assigning Customers to Recovery Persons

```javascript
// Step 1: Recovery head logs in (existing flow)
const recoveryHeadToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

// Step 2: Get all recovery persons with their current assignments
const recoveryPersonsResponse = await fetch(
  'http://localhost:5000/api/recovery-head/recovery-persons-with-customers',
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${recoveryHeadToken}`
    }
  }
);

const recoveryPersonsData = await recoveryPersonsResponse.json();
console.log(recoveryPersonsData);
// Shows all recovery persons and their assigned customers

// Step 3: Get customers assigned to recovery head (from existing API)
const customersResponse = await fetch(
  'http://localhost:5000/api/recovery-head/assigned-customers',
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${recoveryHeadToken}`
    }
  }
);

const customersData = await customersResponse.json();
console.log(customersData);
// Shows all customers assigned to this recovery head

// Step 4: Assign a customer to a recovery person
const assignResponse = await fetch(
  'http://localhost:5000/api/recovery-head/assign-customer',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${recoveryHeadToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      recoveryPersonId: "507f1f77bcf86cd799439011",
      customerId: "507f1f77bcf86cd799439022"
    })
  }
);

const assignResult = await assignResponse.json();
console.log(assignResult);
// Customer assigned successfully

// Step 5: Get assignment details
const assignmentId = assignResult.data.assignmentId;
const assignmentResponse = await fetch(
  `http://localhost:5000/api/recovery-head/assignments/${assignmentId}`,
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${recoveryHeadToken}`
    }
  }
);

const assignmentData = await assignmentResponse.json();
console.log(assignmentData);
// Shows complete assignment details

// Step 6: Unassign customer (if needed)
const unassignResponse = await fetch(
  `http://localhost:5000/api/recovery-head/assignments/${assignmentId}`,
  {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${recoveryHeadToken}`
    }
  }
);

const unassignResult = await unassignResponse.json();
console.log(unassignResult);
// Customer unassigned successfully
```

---

## Error Codes Reference

| Error Code | Description |
|------------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `INVALID_TOKEN` | JWT token is invalid or expired |
| `RECOVERY_PERSON_NOT_FOUND` | Recovery person not found or doesn't belong to recovery head |
| `CUSTOMER_NOT_FOUND` | Customer not found or not assigned to recovery head |
| `CUSTOMER_ALREADY_ASSIGNED` | Customer is already assigned to a recovery person |
| `ASSIGNMENT_NOT_FOUND` | Assignment not found or doesn't belong to recovery head |
| `SERVER_ERROR` | Internal server error |

---

## Business Logic

### Assignment Rules

1. **Recovery Person Ownership**: A recovery head can only assign customers to recovery persons they created
2. **Customer Eligibility**: Only customers already assigned to the recovery head can be assigned to recovery persons
3. **Single Assignment**: A customer can only be actively assigned to one recovery person at a time
4. **Status Tracking**: Assignments have ACTIVE/INACTIVE status for audit trail
5. **Bidirectional Updates**: When assigning/unassigning, both the assignment record and recovery person's customers array are updated

### Data Model

The system uses three main models:

1. **RecoveryHeadAssignment**: Tracks all assignments with complete audit trail
   - Recovery head information
   - Recovery person information
   - Customer information
   - Assignment status (ACTIVE/INACTIVE)
   - Timestamps (assignedAt, unassignedAt)

2. **RecoveryPerson**: Updated to include customers array
   - Stores customer IDs for quick access
   - Automatically updated when assignments change

3. **Customer**: Existing model (no changes needed)
   - Already has assignedToRecoveryHeadId field

---

## Notes

1. **Prerequisites**: Customer must be assigned to recovery head before being assigned to recovery person
2. **Active Status**: Only active recovery persons can receive customer assignments
3. **Reassignment**: To reassign a customer, first unassign from current recovery person, then assign to new one
4. **Audit Trail**: All assignments are preserved with INACTIVE status when unassigned
5. **Pagination**: List endpoints support pagination for large datasets
6. **Search**: Recovery persons can be searched by name or mobile number

---

## Testing

### Using Postman

1. **Assign Customer**:
   - Method: POST
   - URL: `http://localhost:5000/api/recovery-head/assign-customer`
   - Headers: `Authorization: Bearer <recovery_head_token>`
   - Body (JSON):
     ```json
     {
       "recoveryPersonId": "507f1f77bcf86cd799439011",
       "customerId": "507f1f77bcf86cd799439022"
     }
     ```

2. **Get Recovery Persons with Customers**:
   - Method: GET
   - URL: `http://localhost:5000/api/recovery-head/recovery-persons-with-customers`
   - Headers: `Authorization: Bearer <recovery_head_token>`

3. **Get Assignment Details**:
   - Method: GET
   - URL: `http://localhost:5000/api/recovery-head/assignments/<assignmentId>`
   - Headers: `Authorization: Bearer <recovery_head_token>`

4. **Unassign Customer**:
   - Method: DELETE
   - URL: `http://localhost:5000/api/recovery-head/assignments/<assignmentId>`
   - Headers: `Authorization: Bearer <recovery_head_token>`

---

## Support

For issues or questions, please contact the development team.
