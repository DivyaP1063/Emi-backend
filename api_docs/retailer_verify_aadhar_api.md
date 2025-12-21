# Retailer Aadhar Verification API Documentation

## Overview
This API allows retailers to verify if an Aadhar number is safe to use for registering a new customer. It checks if a customer with the given Aadhar number already exists in the system and whether they have any pending EMI payments.

## Endpoint Details

**URL:** `/api/retailer/verify-aadhar`  
**Method:** `POST`  
**Authentication:** Required (Retailer JWT Token)  
**Content-Type:** `application/json`

---

## Request

### Headers
```
Authorization: Bearer <retailer_jwt_token>
Content-Type: application/json
```

### Request Body
```json
{
  "aadharNumber": "123456789012"
}
```

### Request Body Parameters

| Parameter | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| aadharNumber | String | Yes | Customer's 12-digit Aadhar number | Must be exactly 12 digits |

---

## Response

### Success Response (200 OK)

The API returns different responses based on three scenarios:

#### Scenario 1: Customer Not Found ✅ VERIFIED
Customer with this Aadhar number does not exist in the database. **Safe to register.**

```json
{
  "success": true,
  "verified": true,
  "message": "No customer found with this Aadhar number. Safe to register.",
  "data": {
    "aadharNumber": "123456789012",
    "customerExists": false,
    "hasPendingEmi": false
  }
}
```

#### Scenario 2: Customer Exists with Pending EMI ❌ FAILED
Customer exists and has pending EMI payments. **Cannot register.**

```json
{
  "success": true,
  "verified": false,
  "message": "Customer with this Aadhar number exists and has pending EMI payments. Cannot register.",
  "data": {
    "aadharNumber": "123456789012",
    "customerExists": true,
    "hasPendingEmi": true,
    "pendingEmiCount": 3,
    "customerInfo": {
      "fullName": "John Doe",
      "mobileNumber": "9876543210"
    }
  }
}
```

#### Scenario 3: Customer Exists with No Pending EMI ✅ VERIFIED
Customer exists but has no pending EMI payments. **Safe to register.**

```json
{
  "success": true,
  "verified": true,
  "message": "Customer with this Aadhar number exists but has no pending EMI payments. Safe to register.",
  "data": {
    "aadharNumber": "123456789012",
    "customerExists": true,
    "hasPendingEmi": false,
    "customerInfo": {
      "fullName": "John Doe",
      "mobileNumber": "9876543210"
    }
  }
}
```

---

## Error Responses

### 400 Bad Request - Validation Error
```json
{
  "success": false,
  "message": "Validation failed",
  "error": "VALIDATION_ERROR",
  "details": [
    {
      "type": "field",
      "value": "12345",
      "msg": "Aadhar number must be exactly 12 digits",
      "path": "aadharNumber",
      "location": "body"
    }
  ]
}
```

### 401 Unauthorized - Missing or Invalid Token
```json
{
  "success": false,
  "message": "Access denied. No token provided.",
  "error": "NO_TOKEN"
}
```

### 403 Forbidden - Invalid Retailer
```json
{
  "success": false,
  "message": "Invalid token or retailer not found",
  "error": "INVALID_TOKEN"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to verify Aadhar number",
  "error": "SERVER_ERROR"
}
```

---

## Usage Examples

### cURL Example

```bash
curl -X POST http://localhost:5000/api/retailer/verify-aadhar \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "aadharNumber": "123456789012"
  }'
```

### JavaScript (Fetch API) Example

```javascript
const verifyAadhar = async (aadharNumber) => {
  try {
    const response = await fetch('http://localhost:5000/api/retailer/verify-aadhar', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('retailerToken')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        aadharNumber: aadharNumber
      })
    });

    const data = await response.json();

    if (data.success && data.verified) {
      console.log('✅ Aadhar verified:', data.message);
      // Proceed with customer registration
      return true;
    } else if (data.success && !data.verified) {
      console.log('❌ Verification failed:', data.message);
      // Show error to user - customer has pending EMIs
      alert(`Cannot register: ${data.message}`);
      return false;
    }
  } catch (error) {
    console.error('Error verifying Aadhar:', error);
    return false;
  }
};

// Usage
verifyAadhar('123456789012');
```

### Axios Example

```javascript
import axios from 'axios';

const verifyAadhar = async (aadharNumber) => {
  try {
    const response = await axios.post(
      'http://localhost:5000/api/retailer/verify-aadhar',
      { aadharNumber },
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('retailerToken')}`
        }
      }
    );

    const { verified, message, data } = response.data;

    if (verified) {
      console.log('✅ Verification successful:', message);
      return { success: true, data };
    } else {
      console.log('❌ Verification failed:', message);
      return { success: false, message, data };
    }
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data };
  }
};
```

---

## Frontend Integration Guide

### Step-by-Step Integration

1. **Call this API before customer registration**
   - When the user enters the Aadhar number in the registration form
   - Before proceeding to the next step or submitting the form

2. **Handle the response**
   ```javascript
   if (response.verified === true) {
     // Allow user to proceed with registration
     enableNextButton();
   } else {
     // Show error message and prevent registration
     showError(response.message);
     disableNextButton();
   }
   ```

3. **Display appropriate messages**
   - **Verified (No customer)**: "Aadhar verified. You can proceed with registration."
   - **Verified (Customer exists, no pending EMI)**: "Aadhar verified. Customer exists but has cleared all EMIs."
   - **Failed (Pending EMI)**: "Cannot register. Customer has pending EMI payments. Please contact support."

### Recommended UI Flow

```
1. User enters Aadhar number
   ↓
2. User clicks "Verify" or moves to next field
   ↓
3. Call /verify-aadhar API
   ↓
4. Show loading indicator
   ↓
5. Handle response:
   - If verified: Show success message + enable form
   - If not verified: Show error message + disable form
   ↓
6. User proceeds with registration (if verified)
```

---

## Important Notes

1. **Database Scope**: This API searches the **entire database**, not just the retailer's own customers.

2. **Pending EMI Definition**: An EMI is considered "pending" if:
   - `paid` field is `false`
   - `dueDate` is before the current date

3. **Security**: Always include the retailer JWT token in the Authorization header.

4. **Validation**: The Aadhar number must be exactly 12 digits (numeric only).

5. **Response Structure**: Always check the `verified` field in the response to determine if registration should proceed.

---

## Testing Checklist

- [ ] Test with non-existent Aadhar number (should return verified: true)
- [ ] Test with existing customer who has pending EMIs (should return verified: false)
- [ ] Test with existing customer who has no pending EMIs (should return verified: true)
- [ ] Test with invalid Aadhar format (should return validation error)
- [ ] Test without authentication token (should return 401 error)
- [ ] Test with invalid/expired token (should return 403 error)

---

## Support

For any issues or questions regarding this API, please contact the backend development team.
