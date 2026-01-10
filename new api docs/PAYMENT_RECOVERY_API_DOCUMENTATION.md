# Payment Recovery API Documentation

## Overview

This document describes the new Payment Recovery API and schema changes implemented for the EMI backend system. The API allows recovery persons to mark when customers pay their due amount and take back their devices.

**Last Updated:** January 10, 2026

---

## Table of Contents

1. [Schema Changes](#schema-changes)
2. [New API Endpoint](#new-api-endpoint)
3. [Modified Assignment Logic](#modified-assignment-logic)
4. [Complete Flow Example](#complete-flow-example)
5. [Error Codes](#error-codes)

---

## Schema Changes

### RecoveryPerson Model Update

**File:** `src/models/RecoveryPerson.js`

The `customers` array has been changed from a simple array of ObjectId references to an array of objects containing payment tracking information.

#### Previous Schema
```javascript
customers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
}]
```

#### New Schema
```javascript
customers: [{
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    moneyReceived: {
        type: Boolean,
        default: false
    }
}]
```

#### Impact
- **Breaking Change**: Existing RecoveryPerson documents will need migration
- **New Field**: `moneyReceived` tracks payment status for each assigned customer
- **Default Value**: `moneyReceived` defaults to `false` when customer is assigned

---

## New API Endpoint

### Mark Payment Received

Mark payment as received when a customer pays their due amount and takes back their device.

**Endpoint:** `POST /api/recovery-person/mark-payment-received`

**Authentication:** Required (Recovery Person JWT token)

**Headers:**
```json
{
  "Authorization": "Bearer <recovery_person_jwt_token>",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "customerId": "507f1f77bcf86cd799439011"
}
```

**Field Validations:**
- `customerId`: Required, must be a valid MongoDB ObjectId (24 hex characters)

---

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Payment received and customer status updated successfully",
  "data": {
    "customerId": "507f1f77bcf86cd799439011",
    "customerName": "John Doe",
    "moneyReceived": true,
    "customerStatus": {
      "assigned": false,
      "isCollected": false
    },
    "assignmentStatus": "INACTIVE",
    "updatedAt": "2026-01-10T08:12:40.000Z"
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| customerId | String | MongoDB ObjectId of the customer |
| customerName | String | Full name of the customer |
| moneyReceived | Boolean | Always `true` after successful payment marking |
| customerStatus.assigned | Boolean | Customer assignment status (set to `false`) |
| customerStatus.isCollected | Boolean | Device collection status (set to `false`) |
| assignmentStatus | String | Assignment record status (set to `INACTIVE`) |
| updatedAt | Date | Timestamp of the update |

---

### Error Responses

#### 400 Bad Request - Validation Error
```json
{
  "success": false,
  "message": "Validation failed",
  "error": "VALIDATION_ERROR",
  "details": [
    {
      "msg": "Customer ID is required",
      "param": "customerId",
      "location": "body"
    }
  ]
}
```

#### 400 Bad Request - Invalid Customer ID Format
```json
{
  "success": false,
  "message": "Validation failed",
  "error": "VALIDATION_ERROR",
  "details": [
    {
      "msg": "Invalid customer ID format",
      "param": "customerId",
      "location": "body"
    }
  ]
}
```

#### 404 Not Found - Customer Not Assigned
```json
{
  "success": false,
  "message": "Customer not found or not assigned to you",
  "error": "CUSTOMER_NOT_FOUND"
}
```

#### 404 Not Found - Customer Not in List
```json
{
  "success": false,
  "message": "Customer not found in your assigned list",
  "error": "CUSTOMER_NOT_IN_LIST"
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authorization token not found",
  "error": "INVALID_TOKEN"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to mark payment as received",
  "error": "SERVER_ERROR"
}
```

---

## What Happens When Payment is Marked

When a recovery person marks payment as received, the following updates occur automatically:

1. **RecoveryPerson Model**
   - Customer's `moneyReceived` field is set to `true`

2. **Customer Model**
   - `assigned` field is set to `false`
   - `isCollected` field is set to `false`

3. **RecoveryHeadAssignment Model**
   - `status` is set to `INACTIVE`
   - `unassignedAt` timestamp is recorded

This effectively unassigns the customer and marks the recovery task as complete.

---

## Modified Assignment Logic

### Files Modified
- `src/controllers/recoveryHeadController.js`

### Changes Made

#### 1. Auto-Assignment (assignCustomersToRecoveryPersons)
**Line 384-388**

**Previous:**
```javascript
await RecoveryPerson.findByIdAndUpdate(
    selectedRecoveryPerson._id,
    { $addToSet: { customers: customer._id } }
);
```

**New:**
```javascript
await RecoveryPerson.findByIdAndUpdate(
    selectedRecoveryPerson._id,
    { $addToSet: { customers: { customerId: customer._id, moneyReceived: false } } }
);
```

---

#### 2. Manual Assignment (assignCustomersToRecoveryPerson)
**Line 768-773**

**Previous:**
```javascript
const newCustomerIds = customerIds.filter(id => !recoveryPerson.customers.includes(id));
if (newCustomerIds.length > 0) {
    recoveryPerson.customers.push(...newCustomerIds);
    await recoveryPerson.save();
}
```

**New:**
```javascript
const existingCustomerIds = recoveryPerson.customers.map(c => c.customerId.toString());
const newCustomerIds = customerIds.filter(id => !existingCustomerIds.includes(id));
if (newCustomerIds.length > 0) {
    const newCustomers = newCustomerIds.map(id => ({ customerId: id, moneyReceived: false }));
    recoveryPerson.customers.push(...newCustomers);
    await recoveryPerson.save();
}
```

---

#### 3. Unassignment (unassignCustomerFromRecoveryPerson)
**Line 1002-1006**

**Previous:**
```javascript
await RecoveryPerson.findByIdAndUpdate(
    assignment.recoveryPersonId,
    { $pull: { customers: assignment.customerId } }
);
```

**New:**
```javascript
await RecoveryPerson.findByIdAndUpdate(
    assignment.recoveryPersonId,
    { $pull: { customers: { customerId: assignment.customerId } } }
);
```

---

## Complete Flow Example

### Scenario: Customer Pays and Takes Device Back

#### Step 1: Recovery Person Logs In
```bash
# Send OTP
curl -X POST http://localhost:5000/api/recovery-person/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"mobileNumber": "9876543210"}'

# Verify OTP and get token
curl -X POST http://localhost:5000/api/recovery-person/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "mobileNumber": "9876543210",
    "otp": "123456"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "recoveryPerson": { ... }
  }
}
```

---

#### Step 2: View Assigned Customers
```bash
curl -X GET http://localhost:5000/api/recovery-person/customers \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "success": true,
  "message": "Customers fetched successfully",
  "data": {
    "customers": [
      {
        "id": "507f1f77bcf86cd799439011",
        "fullName": "John Doe",
        "mobileNumber": "9876543210",
        "isCollected": true,
        "collectedAt": "2026-01-08T10:30:00.000Z"
      }
    ],
    "pagination": { ... }
  }
}
```

---

#### Step 3: Mark Payment Received
```bash
curl -X POST http://localhost:5000/api/recovery-person/mark-payment-received \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "507f1f77bcf86cd799439011"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Payment received and customer status updated successfully",
  "data": {
    "customerId": "507f1f77bcf86cd799439011",
    "customerName": "John Doe",
    "moneyReceived": true,
    "customerStatus": {
      "assigned": false,
      "isCollected": false
    },
    "assignmentStatus": "INACTIVE",
    "updatedAt": "2026-01-10T08:12:40.000Z"
  }
}
```

---

### JavaScript Example

```javascript
const markPaymentReceived = async (customerId) => {
  try {
    const token = localStorage.getItem('recoveryPersonToken');
    
    const response = await fetch(
      'http://localhost:5000/api/recovery-person/mark-payment-received',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ customerId })
      }
    );

    const data = await response.json();

    if (data.success) {
      console.log('✅ Payment marked as received');
      console.log('Customer:', data.data.customerName);
      console.log('Status:', data.data.customerStatus);
      return data.data;
    } else {
      console.error('❌ Failed:', data.message);
      return null;
    }
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
};

// Usage
markPaymentReceived('507f1f77bcf86cd799439011');
```

---

### Axios Example

```javascript
import axios from 'axios';

const markPaymentReceived = async (customerId) => {
  try {
    const token = localStorage.getItem('recoveryPersonToken');
    
    const response = await axios.post(
      'http://localhost:5000/api/recovery-person/mark-payment-received',
      { customerId },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    console.log('✅ Payment marked:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
    throw error;
  }
};

// Usage
markPaymentReceived('507f1f77bcf86cd799439011')
  .then(data => {
    console.log('Money received:', data.moneyReceived);
    console.log('Customer unassigned:', !data.customerStatus.assigned);
  })
  .catch(err => console.error('Failed to mark payment:', err));
```

---

## Error Codes

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `CUSTOMER_NOT_FOUND` | 404 | Customer not found or not assigned to recovery person |
| `CUSTOMER_NOT_IN_LIST` | 404 | Customer not in recovery person's assigned list |
| `INVALID_TOKEN` | 401 | JWT token is invalid or expired |
| `FORBIDDEN` | 403 | Access denied due to role mismatch |
| `SERVER_ERROR` | 500 | Internal server error |

---

## Migration Notes

### For Existing Data

If you have existing RecoveryPerson documents with customers in the old format, you'll need to migrate them:

```javascript
// Migration script example
const RecoveryPerson = require('./models/RecoveryPerson');

const migrateRecoveryPersons = async () => {
  const recoveryPersons = await RecoveryPerson.find({});
  
  for (const rp of recoveryPersons) {
    // Check if customers array has old format
    if (rp.customers.length > 0 && !rp.customers[0].customerId) {
      // Convert old format to new format
      const newCustomers = rp.customers.map(customerId => ({
        customerId: customerId,
        moneyReceived: false
      }));
      
      rp.customers = newCustomers;
      await rp.save();
      
      console.log(`✅ Migrated ${rp.fullName}`);
    }
  }
  
  console.log('Migration complete!');
};
```

---

## Testing Checklist

- [ ] Test marking payment for assigned customer
- [ ] Test marking payment for non-assigned customer (should fail)
- [ ] Test with invalid customer ID format
- [ ] Test without authentication token
- [ ] Verify customer's `assigned` becomes `false`
- [ ] Verify customer's `isCollected` becomes `false`
- [ ] Verify assignment status becomes `INACTIVE`
- [ ] Verify `moneyReceived` is set to `true` in RecoveryPerson
- [ ] Test assignment flow with new schema
- [ ] Test unassignment flow with new schema

---

## Support

For issues or questions regarding this API, please contact the development team.

---

## Changelog

### Version 1.0.0 - January 10, 2026
- ✨ Added `mark-payment-received` endpoint
- 🔄 Updated RecoveryPerson schema to include `moneyReceived` field
- 🔧 Fixed assignment logic to work with new schema
- 🔧 Fixed unassignment logic to work with new schema
- 📝 Added comprehensive API documentation
