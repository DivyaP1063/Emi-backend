# EMI Payment Status & Customer Management API Documentation

**Version:** 1.0.0  
**Base URL:** `http://your-server-url` (e.g., `http://localhost:5000`)  
**Last Updated:** December 17, 2025

---

## Overview

This API allows **admin users only** to:
1. **Update EMI Payment Status** - Mark specific EMI months as **paid** or **pending** for any customer
2. **Lock/Unlock Customers** - Lock or unlock customer accounts to restrict access

### Authentication Required
- **Role:** Admin only
- **Header:** `Authorization: Bearer <admin_jwt_token>`

---

## API Endpoints

### 1. Update EMI Payment Status

**Endpoint:** `PUT /api/admin/customers/:customerId/emi/:monthNumber`  
**Authentication:** Required (Admin only)  
**Purpose:** Mark a specific EMI month as paid or pending

---

### 2. Lock/Unlock Customer

**Endpoint:** `PUT /api/admin/customers/:customerId/lock`  
**Authentication:** Required (Admin only)  
**Purpose:** Lock or unlock a customer account to restrict/allow access

---

## Request Format

### URL Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `customerId` | String | Customer's MongoDB ID (24 hex characters) | `6750abcd1234567890123456` |
| `monthNumber` | Integer | EMI month number (1 to numberOfMonths) | `1`, `2`, `3`, etc. |

### Request Headers

```
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json
```

### Request Body

```json
{
  "paid": true,
  "paidDate": "2025-12-17T00:00:00.000Z"
}
```

**Body Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `paid` | Boolean | Yes | `true` to mark as paid, `false` to mark as pending |
| `paidDate` | String (ISO 8601) | No | Date when payment was made. If not provided and `paid=true`, current date is used. Ignored if `paid=false`. |

---

## Response Format

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "EMI month 1 marked as paid",
  "data": {
    "customerId": "6750abcd1234567890123456",
    "customerName": "Rajesh Kumar Singh",
    "monthNumber": 1,
    "paid": true,
    "paidDate": "2025-12-17T12:30:00.000Z",
    "amount": 12206.25,
    "emiDetails": {
      "branch": "Main Branch Mumbai",
      "phoneType": "NEW",
      "model": "iPhone 14",
      "productName": "iPhone 14 Pro Max 256GB",
      "sellPrice": 120000,
      "landingPrice": 115000,
      "downPayment": 20000,
      "downPaymentPending": 5000,
      "emiRate": 3,
      "numberOfMonths": 8,
      "balanceAmount": 95000,
      "emiPerMonth": 12206.25,
      "totalEmiAmount": 97650,
      "emiMonths": [
        { "month": 1, "paid": true, "paidDate": "2025-12-17T12:30:00.000Z", "amount": 12206.25 },
        { "month": 2, "paid": false, "amount": 12206.25 },
        { "month": 3, "paid": false, "amount": 12206.25 },
        { "month": 4, "paid": false, "amount": 12206.25 },
        { "month": 5, "paid": false, "amount": 12206.25 },
        { "month": 6, "paid": false, "amount": 12206.25 },
        { "month": 7, "paid": false, "amount": 12206.25 },
        { "month": 8, "paid": false, "amount": 12206.25 }
      ]
    }
  }
}
```

**Response Fields:**

- `customerId`: Customer's unique ID
- `customerName`: Customer's full name
- `monthNumber`: The EMI month that was updated
- `paid`: Current payment status (true/false)
- `paidDate`: Date when payment was made (null if pending)
- `amount`: EMI amount for this month
- `emiDetails`: Complete EMI details including all months

---

## Error Responses

### 400 - Validation Error (Invalid Paid Status)

```json
{
  "success": false,
  "message": "Paid status is required and must be a boolean",
  "error": "VALIDATION_ERROR"
}
```

### 400 - Validation Error (Invalid Customer ID Format)

```json
{
  "success": false,
  "message": "Invalid customer ID format",
  "error": "VALIDATION_ERROR"
}
```

### 400 - Invalid Month Number

```json
{
  "success": false,
  "message": "Invalid month number. Must be between 1 and 8",
  "error": "INVALID_MONTH_NUMBER"
}
```

### 401 - Unauthorized (No Token)

```json
{
  "success": false,
  "message": "Authorization token not found",
  "error": "INVALID_TOKEN"
}
```

### 404 - Customer Not Found

```json
{
  "success": false,
  "message": "Customer not found",
  "error": "CUSTOMER_NOT_FOUND"
}
```

### 404 - EMI Month Not Found

```json
{
  "success": false,
  "message": "EMI month 1 not found",
  "error": "EMI_MONTH_NOT_FOUND"
}
```

### 500 - Server Error

```json
{
  "success": false,
  "message": "Failed to update EMI payment status",
  "error": "SERVER_ERROR"
}
```

---

## Usage Examples

### Example 1: Mark EMI Month as Paid (Current Date)

**Request:**
```bash
curl -X PUT http://localhost:5000/api/admin/customers/6750abcd1234567890123456/emi/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"paid": true}'
```

**Response:**
```json
{
  "success": true,
  "message": "EMI month 1 marked as paid",
  "data": {
    "customerId": "6750abcd1234567890123456",
    "customerName": "Rajesh Kumar Singh",
    "monthNumber": 1,
    "paid": true,
    "paidDate": "2025-12-17T12:30:00.000Z",
    "amount": 12206.25
  }
}
```

---

### Example 2: Mark EMI Month as Paid (Custom Date)

**Request:**
```bash
curl -X PUT http://localhost:5000/api/admin/customers/6750abcd1234567890123456/emi/2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "paid": true,
    "paidDate": "2025-12-15T00:00:00.000Z"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "EMI month 2 marked as paid",
  "data": {
    "customerId": "6750abcd1234567890123456",
    "customerName": "Rajesh Kumar Singh",
    "monthNumber": 2,
    "paid": true,
    "paidDate": "2025-12-15T00:00:00.000Z",
    "amount": 12206.25
  }
}
```

---

### Example 3: Mark EMI Month as Pending

**Request:**
```bash
curl -X PUT http://localhost:5000/api/admin/customers/6750abcd1234567890123456/emi/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"paid": false}'
```

**Response:**
```json
{
  "success": true,
  "message": "EMI month 1 marked as pending",
  "data": {
    "customerId": "6750abcd1234567890123456",
    "customerName": "Rajesh Kumar Singh",
    "monthNumber": 1,
    "paid": false,
    "paidDate": null,
    "amount": 12206.25
  }
}
```

---

## Customer Lock/Unlock API

### Request Format

**Endpoint:** `PUT /api/admin/customers/:customerId/lock`

#### URL Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `customerId` | String | Customer's MongoDB ID (24 hex characters) | `6750abcd1234567890123456` |

#### Request Headers

```
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json
```

#### Request Body

```json
{
  "isLocked": true
}
```

**Body Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `isLocked` | Boolean | Yes | `true` to lock customer, `false` to unlock customer |

---

### Response Format

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Customer locked successfully",
  "data": {
    "customerId": "6750abcd1234567890123456",
    "customerName": "Rajesh Kumar Singh",
    "isLocked": true,
    "updatedAt": "2025-12-17T13:00:00.000Z"
  }
}
```

**Response Fields:**

- `customerId`: Customer's unique ID
- `customerName`: Customer's full name
- `isLocked`: Current lock status (true = locked, false = unlocked)
- `updatedAt`: Timestamp when the status was updated

---

### Error Responses

#### 400 - Validation Error (Invalid isLocked Status)

```json
{
  "success": false,
  "message": "isLocked status is required and must be a boolean",
  "error": "VALIDATION_ERROR"
}
```

#### 400 - Validation Error (Invalid Customer ID Format)

```json
{
  "success": false,
  "message": "Invalid customer ID format",
  "error": "VALIDATION_ERROR"
}
```

#### 401 - Unauthorized (No Token)

```json
{
  "success": false,
  "message": "Authorization token not found",
  "error": "INVALID_TOKEN"
}
```

#### 404 - Customer Not Found

```json
{
  "success": false,
  "message": "Customer not found",
  "error": "CUSTOMER_NOT_FOUND"
}
```

#### 500 - Server Error

```json
{
  "success": false,
  "message": "Failed to update customer lock status",
  "error": "SERVER_ERROR"
}
```

---

### Usage Examples

#### Example 1: Lock a Customer

**Request:**
```bash
curl -X PUT http://localhost:5000/api/admin/customers/6750abcd1234567890123456/lock \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"isLocked": true}'
```

**Response:**
```json
{
  "success": true,
  "message": "Customer locked successfully",
  "data": {
    "customerId": "6750abcd1234567890123456",
    "customerName": "Rajesh Kumar Singh",
    "isLocked": true,
    "updatedAt": "2025-12-17T13:00:00.000Z"
  }
}
```

---

#### Example 2: Unlock a Customer

**Request:**
```bash
curl -X PUT http://localhost:5000/api/admin/customers/6750abcd1234567890123456/lock \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"isLocked": false}'
```

**Response:**
```json
{
  "success": true,
  "message": "Customer unlocked successfully",
  "data": {
    "customerId": "6750abcd1234567890123456",
    "customerName": "Rajesh Kumar Singh",
    "isLocked": false,
    "updatedAt": "2025-12-17T13:05:00.000Z"
  }
}
```

---

### Common Use Cases

#### 1. Lock Customer for Non-Payment
When a customer fails to pay EMIs on time:
```json
{
  "isLocked": true
}
```

#### 2. Unlock Customer After Payment
When a customer clears their dues:
```json
{
  "isLocked": false
}
```

#### 3. Temporary Lock for Investigation
Lock customer account while investigating fraud or disputes:
```json
{
  "isLocked": true
}
```

---

### Important Notes

1. **Admin Only**: This endpoint requires admin authentication. Retailer tokens will not work.

2. **Lock Effect**: When a customer is locked (`isLocked: true`), they may be restricted from:
   - Making new purchases
   - Accessing certain features
   - Receiving services (depending on your business logic)

3. **Unlock Restores Access**: Setting `isLocked: false` restores full customer access.

4. **Customer ID Format**: The customer ID must be a valid MongoDB ObjectId (24 hexadecimal characters).

5. **Audit Trail**: The `updatedAt` timestamp tracks when the lock status was last changed.

---

## Common Use Cases

### 1. Customer Makes Payment
When a customer pays their EMI for a specific month:
```json
{
  "paid": true
}
```
The system will automatically set `paidDate` to the current date/time.

### 2. Recording Past Payment
When recording a payment that was made on a previous date:
```json
{
  "paid": true,
  "paidDate": "2025-12-10T00:00:00.000Z"
}
```

### 3. Correcting Mistake (Mark as Pending)
If a payment was marked as paid by mistake:
```json
{
  "paid": false
}
```
This will remove the `paidDate` and mark the month as pending.

### 4. Updating Multiple Months
To mark multiple months as paid, make separate API calls for each month:
```bash
# Mark month 1 as paid
curl -X PUT .../emi/1 -d '{"paid": true}'

# Mark month 2 as paid
curl -X PUT .../emi/2 -d '{"paid": true}'

# Mark month 3 as paid
curl -X PUT .../emi/3 -d '{"paid": true}'
```

---

## Important Notes

1. **Admin Only**: This endpoint requires admin authentication. Retailer tokens will not work.

2. **Month Number Validation**: The month number must be between 1 and the customer's `numberOfMonths` (typically 4 or 8).

3. **Automatic Date**: If you don't provide `paidDate` when marking as paid, the current date/time will be used automatically.

4. **Pending Removes Date**: When marking as pending (`paid: false`), any existing `paidDate` will be removed.

5. **Complete EMI Details**: The response includes the complete `emiDetails` object with all months, so you can update your UI with the latest status.

6. **Customer ID Format**: The customer ID must be a valid MongoDB ObjectId (24 hexadecimal characters).

---

## Integration Steps

### Step 1: Get Admin Token
First, authenticate as admin to get the JWT token:

```bash
# Send OTP
POST /api/admin/auth/send-otp
Body: { "mobileNumber": "1234567890" }

# Verify OTP
POST /api/admin/auth/verify-otp
Body: { "mobileNumber": "1234567890", "otp": "123456" }

# Save the token from response
```

### Step 2: Get Customer List
Fetch customers to get their IDs:

```bash
GET /api/admin/customers
Header: Authorization: Bearer <token>
```

### Step 3: Update EMI Status
Use the customer ID and month number to update payment status:

```bash
PUT /api/admin/customers/:customerId/emi/:monthNumber
Header: Authorization: Bearer <token>
Body: { "paid": true }
```

---

## Testing Checklist

### EMI Payment Status API
- [ ] Test marking month as paid with current date
- [ ] Test marking month as paid with custom date
- [ ] Test marking month as pending
- [ ] Test with invalid customer ID
- [ ] Test with invalid month number (0, negative, > numberOfMonths)
- [ ] Test without authentication token
- [ ] Test with retailer token (should fail)
- [ ] Test marking the same month multiple times
- [ ] Verify `paidDate` is set correctly when marking as paid
- [ ] Verify `paidDate` is removed when marking as pending

### Customer Lock/Unlock API
- [ ] Test locking a customer
- [ ] Test unlocking a customer
- [ ] Test with invalid customer ID
- [ ] Test without authentication token
- [ ] Test with retailer token (should fail)
- [ ] Verify lock status is updated correctly
- [ ] Test locking an already locked customer
- [ ] Test unlocking an already unlocked customer

---

## Support

For any questions or issues with this API, please contact the backend development team.
