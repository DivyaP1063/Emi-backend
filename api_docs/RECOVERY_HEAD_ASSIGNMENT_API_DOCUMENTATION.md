# Recovery Head Assignment API Documentation

## Overview

This document describes the Recovery Head Assignment system where recovery heads can assign multiple customers to recovery persons in bulk. The system follows a specific workflow:

1. **Get Unassigned Customers** - Fetch customers assigned to recovery head but not yet assigned to any recovery person
2. **Select Multiple Customers** - Choose one or more customers from the unassigned list
3. **Assign to Recovery Person** - Assign all selected customers to a specific recovery person in one operation

---

## Table of Contents

1. [Get Unassigned Customers](#1-get-unassigned-customers)
2. [Bulk Assign Customers to Recovery Person](#2-bulk-assign-customers-to-recovery-person)
3. [Get Recovery Persons with Customers](#3-get-recovery-persons-with-customers)
4. [Get Assignment Details](#4-get-assignment-details)
5. [Unassign Customer from Recovery Person](#5-unassign-customer-from-recovery-person)

---

## 1. Get Unassigned Customers

Retrieve all customers who are assigned to the recovery head but have NOT been assigned to any recovery person yet. This is the first step in the assignment workflow.

**Endpoint:** `GET /api/recovery-head/unassigned-customers`

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
- `search` (optional): Search by customer name, mobile number, or IMEI

**Example Request:**
```
GET /api/recovery-head/unassigned-customers?page=1&limit=20&search=John
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Unassigned customers fetched successfully",
  "data": {
    "customers": [
      {
        "customerId": "507f1f77bcf86cd799439022",
        "fullName": "Jane Smith",
        "mobileNumber": "9123456789",
        "pincode": "123456",
        "balanceAmount": 15000,
        "emiPerMonth": 1500,
        "isLocked": true,
        "assignedAt": "2025-12-25T10:00:00.000Z"
      },
      {
        "customerId": "507f1f77bcf86cd799439023",
        "fullName": "Bob Johnson",
        "mobileNumber": "9234567890",
        "pincode": "123456",
        "balanceAmount": 8000,
        "emiPerMonth": 800,
        "isLocked": false,
        "assignedAt": "2025-12-25T11:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalItems": 35,
      "itemsPerPage": 20
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
curl -X GET "http://localhost:5000/api/recovery-head/unassigned-customers?page=1&limit=20" \
  -H "Authorization: Bearer <recovery_head_token>"
```

---

## 2. Bulk Assign Customers to Recovery Person

Assign multiple customers to a single recovery person in one operation. All customers must be from the unassigned list (customers assigned to recovery head but not to any recovery person).

**Endpoint:** `POST /api/recovery-head/assign-customers`

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
  "customerIds": [
    "507f1f77bcf86cd799439022",
    "507f1f77bcf86cd799439023",
    "507f1f77bcf86cd799439024"
  ]
}
```

**Field Validations:**
- `recoveryPersonId`: Required, valid MongoDB ObjectId (24 hex characters)
- `customerIds`: Required, array with at least one customer ID, each must be a valid MongoDB ObjectId

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "3 customer(s) assigned to recovery person successfully",
  "data": {
    "recoveryPersonId": "507f1f77bcf86cd799439011",
    "recoveryPersonName": "John Doe",
    "assignedCount": 3,
    "assignments": [
      {
        "assignmentId": "507f1f77bcf86cd799439033",
        "customerId": "507f1f77bcf86cd799439022",
        "customerName": "Jane Smith",
        "assignedAt": "2025-12-26T00:40:00.000Z"
      },
      {
        "assignmentId": "507f1f77bcf86cd799439034",
        "customerId": "507f1f77bcf86cd799439023",
        "customerName": "Bob Johnson",
        "assignedAt": "2025-12-26T00:40:00.000Z"
      },
      {
        "assignmentId": "507f1f77bcf86cd799439035",
        "customerId": "507f1f77bcf86cd799439024",
        "customerName": "Alice Brown",
        "assignedAt": "2025-12-26T00:40:00.000Z"
      }
    ]
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
      "msg": "Customer IDs must be an array with at least one customer",
      "param": "customerIds",
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

**404 Not Found - Customers Not Found:**
```json
{
  "success": false,
  "message": "Some customers not found or not assigned to you",
  "error": "CUSTOMER_NOT_FOUND"
}
```

**409 Conflict - Customers Already Assigned:**
```json
{
  "success": false,
  "message": "Some customers are already assigned to recovery persons",
  "error": "CUSTOMERS_ALREADY_ASSIGNED",
  "data": {
    "alreadyAssignedCustomers": [
      {
        "customerId": "507f1f77bcf86cd799439022",
        "customerName": "Jane Smith",
        "recoveryPersonId": "507f1f77bcf86cd799439055",
        "recoveryPersonName": "Another Person"
      }
    ]
  }
}
```

**Example cURL:**
```bash
curl -X POST http://localhost:5000/api/recovery-head/assign-customers \
  -H "Authorization: Bearer <recovery_head_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "recoveryPersonId": "507f1f77bcf86cd799439011",
    "customerIds": [
      "507f1f77bcf86cd799439022",
      "507f1f77bcf86cd799439023",
      "507f1f77bcf86cd799439024"
    ]
  }'
```

---

## 3. Get Recovery Persons with Customers

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

## 4. Get Assignment Details

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
    "assignedAt": "2025-12-26T00:40:00.000Z",
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

## 5. Unassign Customer from Recovery Person

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

## Complete Assignment Workflow

### Step-by-Step Flow

```javascript
// Step 1: Recovery head logs in (existing flow)
const recoveryHeadToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

// Step 2: Get all unassigned customers (customers assigned to recovery head but not to recovery person)
const unassignedResponse = await fetch(
  'http://localhost:5000/api/recovery-head/unassigned-customers?page=1&limit=50',
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${recoveryHeadToken}`
    }
  }
);

const unassignedData = await unassignedResponse.json();
console.log(unassignedData);
// Shows all customers available for assignment

// Step 3: User selects multiple customers from the list
const selectedCustomerIds = [
  "507f1f77bcf86cd799439022",
  "507f1f77bcf86cd799439023",
  "507f1f77bcf86cd799439024"
];

// Step 4: User selects a recovery person to assign these customers to
const selectedRecoveryPersonId = "507f1f77bcf86cd799439011";

// Step 5: Bulk assign selected customers to the recovery person
const assignResponse = await fetch(
  'http://localhost:5000/api/recovery-head/assign-customers',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${recoveryHeadToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      recoveryPersonId: selectedRecoveryPersonId,
      customerIds: selectedCustomerIds
    })
  }
);

const assignResult = await assignResponse.json();
console.log(assignResult);
// 3 customers assigned successfully

// Step 6: View all recovery persons with their assigned customers
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

// Step 7: If needed, unassign a customer
const assignmentIdToRemove = assignResult.data.assignments[0].assignmentId;
const unassignResponse = await fetch(
  `http://localhost:5000/api/recovery-head/assignments/${assignmentIdToRemove}`,
  {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${recoveryHeadToken}`
    }
  }
);

const unassignResult = await unassignResponse.json();
console.log(unassignResult);
// Customer unassigned successfully and will appear in unassigned list again
```

---

## UI Workflow Recommendation

### Assignment Screen Flow

1. **Button Click**: User clicks "Assign Customers" button
2. **Fetch Unassigned**: System fetches unassigned customers via `GET /api/recovery-head/unassigned-customers`
3. **Display List**: Show customers in a selectable list/table with checkboxes
4. **Multi-Select**: User selects one or more customers (checkboxes)
5. **Select Recovery Person**: User selects a recovery person from dropdown
6. **Submit**: User clicks "Assign" button
7. **API Call**: System calls `POST /api/recovery-head/assign-customers` with selected IDs
8. **Success**: Show success message with count of assigned customers
9. **Refresh**: Refresh the unassigned customers list

### Example UI Components

**Unassigned Customers Table:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Unassigned Customers (35)                    [Assign Selected]  │
├──┬──────────────┬──────────────┬─────────┬──────────┬──────────┤
│☐ │ Customer Name│ Mobile       │ Pincode │ Balance  │ Status   │
├──┼──────────────┼──────────────┼─────────┼──────────┼──────────┤
│☑ │ Jane Smith   │ 9123456789   │ 123456  │ ₹15,000  │ Locked   │
│☑ │ Bob Johnson  │ 9234567890   │ 123456  │ ₹8,000   │ Unlocked │
│☐ │ Alice Brown  │ 9345678901   │ 654321  │ ₹12,000  │ Locked   │
└──┴──────────────┴──────────────┴─────────┴──────────┴──────────┘
```

**Assignment Modal:**
```
┌─────────────────────────────────────────┐
│ Assign Customers                    [X] │
├─────────────────────────────────────────┤
│ Selected Customers: 2                   │
│ - Jane Smith (9123456789)              │
│ - Bob Johnson (9234567890)             │
│                                         │
│ Assign to Recovery Person:             │
│ [Select Recovery Person ▼]             │
│                                         │
│           [Cancel]  [Assign]           │
└─────────────────────────────────────────┘
```

---

## Error Codes Reference

| Error Code | Description |
|------------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `INVALID_TOKEN` | JWT token is invalid or expired |
| `RECOVERY_PERSON_NOT_FOUND` | Recovery person not found or doesn't belong to recovery head |
| `CUSTOMER_NOT_FOUND` | Some customers not found or not assigned to recovery head |
| `CUSTOMERS_ALREADY_ASSIGNED` | Some customers are already assigned to recovery persons |
| `ASSIGNMENT_NOT_FOUND` | Assignment not found or doesn't belong to recovery head |
| `SERVER_ERROR` | Internal server error |

---

## Business Logic

### Assignment Rules

1. **Unassigned Customers Only**: Only customers assigned to recovery head but NOT assigned to any recovery person can be assigned
2. **Bulk Assignment**: Multiple customers can be assigned to ONE recovery person in a single operation
3. **Recovery Person Ownership**: Recovery head can only assign to recovery persons they created
4. **Active Recovery Person**: Only active recovery persons can receive assignments
5. **No Duplicate Assignments**: A customer cannot be assigned to multiple recovery persons simultaneously
6. **Audit Trail**: All assignments are tracked with ACTIVE/INACTIVE status

### Data Flow

1. **Customer Assignment to Recovery Head**: Done automatically by cron job when device is locked
2. **Customer Assignment to Recovery Person**: Done manually by recovery head via this API
3. **Unassignment**: Marks assignment as INACTIVE and removes from recovery person's customers array
4. **Reassignment**: Customer must be unassigned first, then can be assigned to another recovery person

---

## Notes

1. **Bulk Operations**: The API supports assigning multiple customers at once for efficiency
2. **Unassigned List**: Automatically excludes customers already assigned to recovery persons
3. **Search Functionality**: Both unassigned customers and recovery persons support search
4. **Pagination**: All list endpoints support pagination for large datasets
5. **Real-time Updates**: After assignment/unassignment, fetch the lists again to see updated data
6. **Validation**: System validates that all customers belong to the recovery head before assignment

---

## Testing

### Using Postman

1. **Get Unassigned Customers**:
   - Method: GET
   - URL: `http://localhost:5000/api/recovery-head/unassigned-customers?page=1&limit=20`
   - Headers: `Authorization: Bearer <recovery_head_token>`

2. **Bulk Assign Customers**:
   - Method: POST
   - URL: `http://localhost:5000/api/recovery-head/assign-customers`
   - Headers: `Authorization: Bearer <recovery_head_token>`
   - Body (JSON):
     ```json
     {
       "recoveryPersonId": "507f1f77bcf86cd799439011",
       "customerIds": [
         "507f1f77bcf86cd799439022",
         "507f1f77bcf86cd799439023"
       ]
     }
     ```

3. **Get Recovery Persons with Customers**:
   - Method: GET
   - URL: `http://localhost:5000/api/recovery-head/recovery-persons-with-customers`
   - Headers: `Authorization: Bearer <recovery_head_token>`

4. **Unassign Customer**:
   - Method: DELETE
   - URL: `http://localhost:5000/api/recovery-head/assignments/<assignmentId>`
   - Headers: `Authorization: Bearer <recovery_head_token>`

---

## Support

For issues or questions, please contact the development team.
