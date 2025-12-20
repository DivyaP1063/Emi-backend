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

---

## Get Pending EMI Customers API (New Feature)

### Overview
This feature provides two APIs - one for admins and one for retailers - to fetch customers who have pending (overdue) EMI payments. The APIs automatically filter customers based on EMI due dates that have passed.

---

### Admin API - Get All Pending EMI Customers

**Endpoint:** `GET /api/admin/customers/pending-emi`  
**Authentication:** Required (Admin JWT token)  
**Purpose:** Retrieve all customers with overdue EMI payments across all retailers

#### Request

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Query Parameters:**
- `page` (optional, default: 1) - Page number for pagination
- `limit` (optional, default: 20) - Number of items per page
- `search` (optional) - Search by customer name, mobile, aadhar, or IMEI

**Example:**
```
GET /api/admin/customers/pending-emi?page=1&limit=10&search=Sagar
```

#### Response

**Success (200):**
```json
{
  "success": true,
  "message": "Pending EMI customers fetched successfully",
  "data": {
    "customers": [
      {
        "id": "6750abcd1234567890123456",
        "fullName": "Sagar Kumar",
        "mobileNumber": "9876543210",
        "aadharNumber": "123456789012",
        "dob": "1995-05-15T00:00:00.000Z",
        "imei1": "123456789012345",
        "imei2": "987654321098765",
        "fatherName": "Rajesh Kumar",
        "address": {
          "village": "Patna",
          "nearbyLocation": "Near Railway Station",
          "post": "Patna City",
          "district": "Patna",
          "pincode": "800001"
        },
        "isLocked": false,
        "emiDetails": {
          "branch": "Patna Main",
          "phoneType": "NEW",
          "model": "iPhone 14",
          "productName": "Apple iPhone 14 128GB",
          "emiPerMonth": 5000,
          "numberOfMonths": 6
        },
        "pendingEmis": [
          {
            "month": 1,
            "dueDate": "2024-10-01T00:00:00.000Z",
            "paid": false,
            "amount": 5000
          },
          {
            "month": 2,
            "dueDate": "2024-11-01T00:00:00.000Z",
            "paid": false,
            "amount": 5000
          }
        ],
        "retailer": {
          "id": "6750xyz1234567890123456",
          "fullName": "Amit Sharma",
          "shopName": "Sharma Mobile Store",
          "mobileNumber": "9876543210",
          "email": "amit@example.com"
        },
        "createdAt": "2024-09-01T10:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 45,
      "itemsPerPage": 10,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

**Response Fields:**
- `customers` - Array of customers with pending EMIs
  - `pendingEmis` - Array of EMI months that are overdue (past due date and unpaid)
  - `retailer` - Information about the retailer who registered this customer
- `pagination` - Pagination metadata

**Error Responses:**
- `401` - Unauthorized (missing or invalid admin token)
- `500` - Server error

#### Testing in Postman

**Method:** `GET`  
**URL:** `http://localhost:5000/api/admin/customers/pending-emi?page=1&limit=10`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**No Body Required**

#### Implementation Details

**Controller:** `src/controllers/authController.js` (lines 480-660)  
**Function:** `getPendingEmiCustomersAdmin`  
**Route:** `src/routes/index.js` (line 24-25)

**Logic:**
- Uses MongoDB aggregation pipeline
- Filters EMI months where `paid: false` AND `dueDate < currentDate`
- Includes retailer information via `$lookup`
- Supports pagination and search

---

### Retailer API - Get Pending EMI Customers

**Endpoint:** `GET /api/retailer/customers/pending-emi`  
**Authentication:** Required (Retailer JWT token)  
**Purpose:** Retrieve only the retailer's customers with overdue EMI payments

#### Request

**Headers:**
```
Authorization: Bearer <retailer_jwt_token>
```

**Query Parameters:**
- `page` (optional, default: 1) - Page number for pagination
- `limit` (optional, default: 20) - Number of items per page
- `search` (optional) - Search by customer name, mobile, aadhar, or IMEI

**Example:**
```
GET /api/retailer/customers/pending-emi?page=1&limit=10
```

#### Response

**Success (200):**
```json
{
  "success": true,
  "message": "Pending EMI customers fetched successfully",
  "data": {
    "customers": [
      {
        "id": "6750abcd1234567890123456",
        "fullName": "Sagar Kumar",
        "mobileNumber": "9876543210",
        "aadharNumber": "123456789012",
        "dob": "1995-05-15T00:00:00.000Z",
        "imei1": "123456789012345",
        "imei2": "987654321098765",
        "fatherName": "Rajesh Kumar",
        "address": {
          "village": "Patna",
          "nearbyLocation": "Near Railway Station",
          "post": "Patna City",
          "district": "Patna",
          "pincode": "800001"
        },
        "isLocked": false,
        "emiDetails": {
          "branch": "Patna Main",
          "phoneType": "NEW",
          "model": "iPhone 14",
          "productName": "Apple iPhone 14 128GB",
          "emiPerMonth": 5000,
          "numberOfMonths": 6
        },
        "pendingEmis": [
          {
            "month": 1,
            "dueDate": "2024-10-01T00:00:00.000Z",
            "paid": false,
            "amount": 5000
          },
          {
            "month": 2,
            "dueDate": "2024-11-01T00:00:00.000Z",
            "paid": false,
            "amount": 5000
          }
        ],
        "createdAt": "2024-09-01T10:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalItems": 15,
      "itemsPerPage": 10,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

**Key Differences from Admin API:**
- Only shows customers belonging to the authenticated retailer
- Does NOT include `retailer` field (retailer already knows it's their customer)

**Error Responses:**
- `401` - Unauthorized (missing or invalid retailer token)
- `500` - Server error

#### Testing in Postman

**Method:** `GET`  
**URL:** `http://localhost:5000/api/retailer/customers/pending-emi?page=1&limit=10`

**Headers:**
```
Authorization: Bearer <retailer_token>
```

**No Body Required**

#### Implementation Details

**Controller:** `src/controllers/retailerProductController.js` (lines 410-560)  
**Function:** `getPendingEmiCustomers`  
**Route:** `src/routes/retailerApiRoutes.js` (lines 97-101)

**Logic:**
- Filters by `retailerId` automatically (from JWT token)
- Uses MongoDB aggregation pipeline
- Filters EMI months where `paid: false` AND `dueDate < currentDate`
- Supports pagination and search

---

### EMI Due Date Calculation

When a customer is created, EMI due dates are automatically calculated:

**Logic:**
```javascript
const currentDate = new Date();
for (let i = 1; i <= numberOfMonths; i++) {
  const dueDate = new Date(currentDate);
  dueDate.setMonth(dueDate.getMonth() + i);
  // First EMI due in 1 month, second in 2 months, etc.
}
```

**Example:**
- Customer created: December 20, 2024
- EMI 1 due date: January 20, 2025
- EMI 2 due date: February 20, 2025
- EMI 3 due date: March 20, 2025

---

### Customer Model Updates

**File:** `src/models/Customer.js`

**Added `dueDate` field to `emiMonths` schema:**
```javascript
emiMonths: [{
  month: { type: Number, required: true },
  dueDate: { type: Date, required: true },  // NEW FIELD
  paid: { type: Boolean, default: false },
  paidDate: { type: Date },
  amount: { type: Number, required: true }
}]
```

---

### Use Cases

**Admin:**
- Monitor all overdue EMI payments across the platform
- Identify customers who need follow-up
- Generate reports of pending payments
- Track payment trends by retailer

**Retailer:**
- View their own customers with overdue payments
- Follow up with customers for payment collection
- Prioritize collection efforts
- Monitor their portfolio health

---

## API Summary

| API | Endpoint | Access | Shows |
|-----|----------|--------|-------|
| **Admin Pending EMI** | `GET /api/admin/customers/pending-emi` | Admin only | All customers with pending EMIs + retailer info |
| **Retailer Pending EMI** | `GET /api/retailer/customers/pending-emi` | Retailer only | Only their customers with pending EMIs |

Both APIs support:
- Pagination: `?page=1&limit=10`
- Search: `?search=customer_name`
- Filtering by overdue EMIs automatically

---

## Implementation Status

✅ Customer model updated with `dueDate` field  
✅ EMI due date calculation implemented in customer creation  
✅ Admin pending EMI API created and tested  
✅ Retailer pending EMI API created and tested  
✅ Pagination and search functionality working  
✅ Access control properly enforced  
✅ MongoDB aggregation pipelines optimized  
✅ Documentation completed  

**Status:** Production-ready and fully tested

---

## EMI Statistics Dashboard API (New Feature)

### Overview
This feature provides dashboard/statistics APIs for both admins and retailers to view comprehensive EMI payment metrics including total EMI amounts, paid amounts, pending amounts, and customer counts.

---

### Admin API - Get EMI Statistics

**Endpoint:** `GET /api/admin/emi/statistics`  
**Authentication:** Required (Admin JWT token)  
**Purpose:** Retrieve EMI statistics for ALL customers across all retailers

#### Request

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**No Query Parameters or Body Required**

#### Response

**Success (200):**
```json
{
  "success": true,
  "message": "EMI statistics fetched successfully",
  "data": {
    "totalEmiAmount": 500000.00,
    "totalPaidAmount": 300000.00,
    "totalPendingAmount": 200000.00,
    "totalCustomers": 50,
    "customersWithPending": 30,
    "customersFullyPaid": 20,
    "paymentPercentage": 60.00
  }
}
```

**Response Fields:**
- `totalEmiAmount` - Sum of all EMI amounts (paid + pending) across all customers
- `totalPaidAmount` - Sum of all paid EMI amounts
- `totalPendingAmount` - Sum of all unpaid EMI amounts
- `totalCustomers` - Total number of customers in the system
- `customersWithPending` - Number of customers with at least one unpaid EMI
- `customersFullyPaid` - Number of customers with all EMIs paid
- `paymentPercentage` - Percentage of EMIs paid (totalPaid / totalEmi × 100)

**Error Responses:**
- `401` - Unauthorized (missing or invalid admin token)
- `500` - Server error

#### Testing in Postman

**Method:** `GET`  
**URL:** `http://localhost:5000/api/admin/emi/statistics`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**No Body Required**

#### Implementation Details

**Controller:** `src/controllers/authController.js` (lines 658-760)  
**Function:** `getEmiStatisticsAdmin`  
**Route:** `src/routes/index.js` (line 27-28)

**Logic:**
- Counts total customers
- Uses MongoDB aggregation to sum paid/pending EMI amounts
- Counts customers with pending EMIs vs fully paid
- Calculates payment percentage
- Handles edge cases (no customers, division by zero)

---

### Retailer API - Get EMI Statistics

**Endpoint:** `GET /api/retailer/emi/statistics`  
**Authentication:** Required (Retailer JWT token)  
**Purpose:** Retrieve EMI statistics for only the retailer's customers

#### Request

**Headers:**
```
Authorization: Bearer <retailer_jwt_token>
```

**No Query Parameters or Body Required**

#### Response

**Success (200):**
```json
{
  "success": true,
  "message": "EMI statistics fetched successfully",
  "data": {
    "totalEmiAmount": 100000.00,
    "totalPaidAmount": 60000.00,
    "totalPendingAmount": 40000.00,
    "totalCustomers": 10,
    "customersWithPending": 6,
    "customersFullyPaid": 4,
    "paymentPercentage": 60.00
  }
}
```

**Response Fields:**
- Same as admin API, but filtered to only the retailer's customers
- Does NOT include customers from other retailers

**Key Differences from Admin API:**
- Only shows statistics for customers belonging to the authenticated retailer
- Totals are calculated only from the retailer's customer base

**Error Responses:**
- `401` - Unauthorized (missing or invalid retailer token)
- `500` - Server error

#### Testing in Postman

**Method:** `GET`  
**URL:** `http://localhost:5000/api/retailer/emi/statistics`

**Headers:**
```
Authorization: Bearer <retailer_token>
```

**No Body Required**

#### Implementation Details

**Controller:** `src/controllers/retailerProductController.js` (lines 562-670)  
**Function:** `getEmiStatisticsRetailer`  
**Route:** `src/routes/retailerApiRoutes.js` (lines 108-112)

**Logic:**
- Filters by `retailerId` (from JWT token)
- Counts total customers for this retailer
- Uses MongoDB aggregation to sum paid/pending EMI amounts
- Counts retailer's customers with pending EMIs vs fully paid
- Calculates payment percentage

---

### MongoDB Aggregation Pipeline

Both APIs use efficient MongoDB aggregation:

```javascript
const statistics = await Customer.aggregate([
  // Filter (retailer filters by retailerId, admin has no filter)
  { $match: matchQuery },
  
  // Unwind EMI months to calculate individual payments
  { $unwind: '$emiDetails.emiMonths' },
  
  // Group and calculate totals
  {
    $group: {
      _id: null,
      totalPaid: {
        $sum: {
          $cond: [
            { $eq: ['$emiDetails.emiMonths.paid', true] },
            '$emiDetails.emiMonths.amount',
            0
          ]
        }
      },
      totalPending: {
        $sum: {
          $cond: [
            { $eq: ['$emiDetails.emiMonths.paid', false] },
            '$emiDetails.emiMonths.amount',
            0
          ]
        }
      }
    }
  }
]);
```

---

### Use Cases

**Admin Dashboard:**
- Monitor overall platform EMI collection performance
- Track payment trends across all retailers
- Identify collection efficiency
- Generate financial reports
- Compare retailer performance

**Retailer Dashboard:**
- Monitor their portfolio health
- Track their collection efficiency
- View payment status at a glance
- Plan collection strategies
- Measure business performance

---

### Example Scenarios

#### Scenario 1: Fresh Customer (All Unpaid)
```json
{
  "totalEmiAmount": 30000,
  "totalPaidAmount": 0,
  "totalPendingAmount": 30000,
  "customersWithPending": 1,
  "customersFullyPaid": 0,
  "paymentPercentage": 0
}
```

#### Scenario 2: Partially Paid
```json
{
  "totalEmiAmount": 30000,
  "totalPaidAmount": 10000,
  "totalPendingAmount": 20000,
  "customersWithPending": 1,
  "customersFullyPaid": 0,
  "paymentPercentage": 33.33
}
```

#### Scenario 3: Fully Paid Customer
```json
{
  "totalEmiAmount": 30000,
  "totalPaidAmount": 30000,
  "totalPendingAmount": 0,
  "customersWithPending": 0,
  "customersFullyPaid": 1,
  "paymentPercentage": 100
}
```

---

---

## Customer Count Statistics API (New Feature)

### Overview
This feature provides APIs for both admins and retailers to fetch customer count statistics, including total customers and locked customers (displayed as "locked devices" in the frontend).

---

### Admin API - Get Customer Count

**Endpoint:** `GET /api/admin/customers/count`  
**Authentication:** Required (Admin JWT token)  
**Purpose:** Retrieve customer count statistics for ALL customers across all retailers

#### Request

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**No Query Parameters or Body Required**

#### Response

**Success (200):**
```json
{
  "success": true,
  "message": "Customer count fetched successfully",
  "data": {
    "totalCustomers": 150,
    "lockedCustomers": 12,
    "activeCustomers": 138
  }
}
```

**Response Fields:**
- `totalCustomers` - Total number of customers across all retailers
- `lockedCustomers` - Number of customers with locked devices (isLocked: true)
- `activeCustomers` - Number of customers with active/unlocked devices (totalCustomers - lockedCustomers)

**Error Responses:**
- `401` - Unauthorized (missing or invalid admin token)
- `500` - Server error

#### Testing in Postman

**Method:** `GET`  
**URL:** `http://localhost:5000/api/admin/customers/count`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**No Body Required**

#### Implementation Details

**Controller:** `src/controllers/authController.js` (lines 762-792)  
**Function:** `getCustomerCountAdmin`  
**Route:** `src/routes/index.js` (line 30-31)

**Logic:**
- Counts total customers using `Customer.countDocuments({})`
- Counts locked customers using `Customer.countDocuments({ isLocked: true })`
- Calculates active customers (total - locked)

---

### Retailer API - Get Customer Count

**Endpoint:** `GET /api/retailer/customers/count`  
**Authentication:** Required (Retailer JWT token)  
**Purpose:** Retrieve customer count statistics for only the retailer's customers

#### Request

**Headers:**
```
Authorization: Bearer <retailer_jwt_token>
```

**No Query Parameters or Body Required**

#### Response

**Success (200):**
```json
{
  "success": true,
  "message": "Customer count fetched successfully",
  "data": {
    "totalCustomers": 25,
    "lockedCustomers": 3,
    "activeCustomers": 22
  }
}
```

**Response Fields:**
- `totalCustomers` - Total number of customers registered by this retailer
- `lockedCustomers` - Number of customers with locked devices for this retailer (isLocked: true)
- `activeCustomers` - Number of customers with active/unlocked devices (totalCustomers - lockedCustomers)

**Key Differences from Admin API:**
- Only shows statistics for customers belonging to the authenticated retailer
- Counts are calculated only from the retailer's customer base

**Error Responses:**
- `401` - Unauthorized (missing or invalid retailer token)
- `500` - Server error

#### Testing in Postman

**Method:** `GET`  
**URL:** `http://localhost:5000/api/retailer/customers/count`

**Headers:**
```
Authorization: Bearer <retailer_token>
```

**No Body Required**

#### Implementation Details

**Controller:** `src/controllers/retailerProductController.js` (lines 670-705)  
**Function:** `getCustomerCountRetailer`  
**Route:** `src/routes/retailerApiRoutes.js` (lines 117-125)

**Logic:**
- Filters by `retailerId` (from JWT token)
- Counts total customers for this retailer
- Counts locked customers for this retailer
- Calculates active customers

---

### Use Cases

**Admin Dashboard:**
- Display total customer count across the platform
- Show number of locked devices for monitoring
- Track active vs locked customer ratio
- Generate platform-wide statistics

**Retailer Dashboard:**
- Display their total customer count
- Show number of their locked devices
- Monitor their active customer base
- Track customer status at a glance

---

## Complete API Summary

| Feature | Admin Endpoint | Retailer Endpoint | Access |
|---------|---------------|-------------------|--------|
| **Update Retailer Status** | `PUT /api/admin/retailers/:id/status` | N/A | Admin only |
| **Lock/Unlock Customer** | `PUT /api/admin/customers/:id/lock` | N/A | Admin only |
| **Get Locked Customers IMEI** | `GET /api/admin/customers/locked/imei` | N/A | Admin only |
| **Get Pending EMI Customers** | `GET /api/admin/customers/pending-emi` | `GET /api/retailer/customers/pending-emi` | Both |
| **Get EMI Statistics** | `GET /api/admin/emi/statistics` | `GET /api/retailer/emi/statistics` | Both |
| **Get Customer Count** | `GET /api/admin/customers/count` | `GET /api/retailer/customers/count` | Both |

---

## Final Implementation Status

✅ Retailer status management (ACTIVE, INACTIVE, SUSPENDED)  
✅ Customer lock/unlock functionality  
✅ Locked customers IMEI retrieval  
✅ EMI due date tracking (1-month intervals)  
✅ Pending EMI customers API (admin + retailer)  
✅ EMI statistics dashboard API (admin + retailer)  
✅ Customer count statistics API (admin + retailer)  
✅ Proper access control for all endpoints  
✅ Comprehensive error handling  
✅ MongoDB aggregation optimization  
✅ Complete documentation  

**All features are production-ready and fully tested.**
 
---

## NEW APIS - December 20 2025

# NEW APIS ADDED - December 20, 2025

This document contains all the new APIs added to the existing system.

---

## 1. Accountant Management APIs

### Overview
New module to allow admins to create accountants who can manage customer EMI payments across all retailers.

### Admin APIs - Create & Manage Accountants

#### 1.1 Send OTP for Accountant Creation
```
POST /api/admin/accountants/send-otp
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "mobileNumber": "9876543210"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully to +919876543210"
}
```

---

#### 1.2 Verify OTP
```
POST /api/admin/accountants/verify-otp
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "mobileNumber": "9876543210",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Mobile number verified successfully. You can proceed to create accountant.",
  "data": {
    "mobileNumber": "9876543210",
    "verified": true
  }
}
```

---

#### 1.3 Create Accountant
```
POST /api/admin/accountants
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "fullName": "Ramesh Kumar",
  "aadharNumber": "123456789012",
  "mobileNumber": "9876543210"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Accountant created successfully",
  "data": {
    "accountantId": "6750abcd1234567890123456",
    "fullName": "Ramesh Kumar",
    "aadharNumber": "123456789012",
    "mobileNumber": "9876543210",
    "mobileVerified": true,
    "isActive": true,
    "createdAt": "2025-12-20T14:38:30.000Z"
  }
}
```

---

#### 1.4 Get All Accountants
```
GET /api/admin/accountants?page=1&limit=20&search=name
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Accountants fetched successfully",
  "data": {
    "accountants": [...],
    "pagination": {...}
  }
}
```

---

#### 1.5 Update Accountant Status
```
PUT /api/admin/accountants/:accountantId/status
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "isActive": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Accountant deactivated successfully",
  "data": {
    "accountantId": "6750abcd1234567890123456",
    "fullName": "Ramesh Kumar",
    "previousStatus": true,
    "currentStatus": false,
    "updatedAt": "2025-12-20T14:45:00.000Z"
  }
}
```

---

### Accountant APIs - Login & Operations

#### 2.1 Accountant Login - Send OTP
```
POST /api/accountant/auth/send-otp
Content-Type: application/json

{
  "mobileNumber": "9876543210"
}
```

**Response:**
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

---

#### 2.2 Accountant Login - Verify OTP
```
POST /api/accountant/auth/verify-otp
Content-Type: application/json

{
  "mobileNumber": "9876543210",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "accountant": {
      "id": "6750abcd1234567890123456",
      "fullName": "Ramesh Kumar",
      "mobileNumber": "9876543210",
      "aadharNumber": "123456789012"
    }
  }
}
```

---

#### 2.3 Get All Customers (Accountant)
```
GET /api/accountant/customers?page=1&limit=20&search=name
Authorization: Bearer <accountant_token>
```

**Response:** Same format as admin's get all customers API

---

#### 2.4 Get Pending EMI Customers (Accountant)
```
GET /api/accountant/customers/pending-emi?page=1&limit=20
Authorization: Bearer <accountant_token>
```

**Response:** Same format as admin's pending EMI API

---

#### 2.5 Update EMI Payment Status (Accountant)
```
PUT /api/accountant/customers/:customerId/emi/:monthNumber
Authorization: Bearer <accountant_token>
Content-Type: application/json

{
  "paid": true,
  "paidDate": "2025-12-20T10:00:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "EMI month 1 marked as paid",
  "data": {
    "customerId": "6750xyz1234567890123456",
    "customerName": "Sagar Kumar",
    "monthNumber": 1,
    "paid": true,
    "paidDate": "2025-12-20T10:00:00.000Z",
    "amount": 5000
  }
}
```

---

## 2. Late Fine Management APIs

### 2.1 Get Late Fine (Public)
```
GET /api/admin/late-fine
```

**No authentication required**

**Response:**
```json
{
  "success": true,
  "message": "Late fine fetched successfully",
  "data": {
    "amount": 100
  }
}
```

---

### 2.2 Update Late Fine (Admin Only)
```
PUT /api/admin/late-fine
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "amount": 150
}
```

**Response:**
```json
{
  "success": true,
  "message": "Late fine updated successfully",
  "data": {
    "amount": 150,
    "updatedBy": "admin_id",
    "updatedAt": "2025-12-20T15:07:21.000Z"
  }
}
```

---

## 3. Updated APIs - Pending EMI with Documents

### Changes
The pending EMI APIs now include customer documents in the response.

### Affected Endpoints:
- `GET /api/admin/customers/pending-emi`
- `GET /api/retailer/customers/pending-emi`
- `GET /api/accountant/customers/pending-emi`

### Updated Response Format:
```json
{
  "success": true,
  "message": "Pending EMI customers fetched successfully",
  "data": {
    "customers": [
      {
        "id": "6750xyz1234567890123456",
        "fullName": "Sagar Kumar",
        "mobileNumber": "9123456789",
        "aadharNumber": "987654321098",
        "documents": {
          "customerPhoto": "uploads/customers/photo_123.jpg",
          "aadharFront": "uploads/customers/aadhar_front_123.jpg",
          "aadharBack": "uploads/customers/aadhar_back_123.jpg",
          "signature": "uploads/customers/signature_123.jpg"
        },
        "pendingEmis": [
          {
            "month": 1,
            "dueDate": "2024-10-01T00:00:00.000Z",
            "paid": false,
            "amount": 5000
          }
        ],
        "emiDetails": {...},
        "retailer": {...}
      }
    ],
    "pagination": {...}
  }
}
```

**New Field:** `documents` object containing paths to all customer documents

---

## Complete API Summary (Updated)

| Feature | Admin Endpoint | Retailer Endpoint | Accountant Endpoint | Access |
|---------|---------------|-------------------|---------------------|--------|
| **Update Retailer Status** | `PUT /api/admin/retailers/:id/status` | N/A | N/A | Admin only |
| **Lock/Unlock Customer** | `PUT /api/admin/customers/:id/lock` | N/A | N/A | Admin only |
| **Get Locked Customers IMEI** | `GET /api/admin/customers/locked/imei` | N/A | N/A | Admin only |
| **Get Pending EMI Customers** | `GET /api/admin/customers/pending-emi` | `GET /api/retailer/customers/pending-emi` | `GET /api/accountant/customers/pending-emi` | All |
| **Get EMI Statistics** | `GET /api/admin/emi/statistics` | `GET /api/retailer/emi/statistics` | N/A | Admin + Retailer |
| **Get Customer Count** | `GET /api/admin/customers/count` | `GET /api/retailer/customers/count` | N/A | Admin + Retailer |
| **Create Accountant** | `POST /api/admin/accountants` | N/A | N/A | Admin only |
| **Manage Accountants** | `GET/PUT /api/admin/accountants/*` | N/A | N/A | Admin only |
| **Accountant Login** | N/A | N/A | `POST /api/accountant/auth/*` | Accountant |
| **Update EMI Status** | `PUT /api/admin/customers/:id/emi/:month` | N/A | `PUT /api/accountant/customers/:id/emi/:month` | Admin + Accountant |
| **Get Late Fine** | `GET /api/admin/late-fine` | N/A | N/A | Public |
| **Update Late Fine** | `PUT /api/admin/late-fine` | N/A | N/A | Admin only |

---

## Implementation Status

✅ Accountant module (create, login, manage)  
✅ Accountant EMI management operations  
✅ Late fine management (get & update)  
✅ Pending EMI API updated with documents field  
✅ All routes properly configured  
✅ Authentication & authorization implemented  
✅ Complete documentation  

**All new features are production-ready and fully tested.**


---

## API Response Updates - December 20, 2025

### Updated Customer API Responses

All customer-related APIs have been updated to return complete customer details matching the Customer model structure.

#### Changes Applied:

**1. Get All Customers APIs**
- `GET /api/admin/customers`
- `GET /api/retailer/customers`
- `GET /api/accountant/customers`

**Now includes:**
- âœ… Complete `documents` object (customerPhoto, aadharFrontPhoto, aadharBackPhoto, signaturePhoto)
- âœ… Complete `emiDetails` object (all EMI information including emiMonths array)
- âœ… `mobileVerified` field
- âœ… `updatedAt` timestamp

**2. Pending EMI Customers APIs**
- `GET /api/admin/customers/pending-emi`
- `GET /api/retailer/customers/pending-emi`
- `GET /api/accountant/customers/pending-emi`

**Now includes:**
- âœ… Complete `documents` object
- âœ… `mobileVerified` field
- âœ… `updatedAt` timestamp

---

### Updated Response Structure

#### Get All Customers Response

```json
{
  "success": true,
  "message": "Customers fetched successfully",
  "data": {
    "customers": [
      {
        "id": "6750xyz1234567890123456",
        "fullName": "Sagar Kumar",
        "mobileNumber": "9123456789",
        "mobileVerified": true,
        "aadharNumber": "987654321098",
        "dob": "1995-05-15T00:00:00.000Z",
        "imei1": "123456789012345",
        "imei2": "987654321098765",
        "fatherName": "Rajesh Kumar",
        "address": {
          "village": "Patna",
          "nearbyLocation": "Gandhi Maidan",
          "post": "Patna GPO",
          "district": "Patna",
          "pincode": "800001"
        },
        "documents": {
          "customerPhoto": "uploads/customers/photo_123.jpg",
          "aadharFrontPhoto": "uploads/customers/aadhar_front_123.jpg",
          "aadharBackPhoto": "uploads/customers/aadhar_back_123.jpg",
          "signaturePhoto": "uploads/customers/signature_123.jpg"
        },
        "emiDetails": {
          "branch": "Patna Main",
          "phoneType": "NEW",
          "model": "iPhone 14",
          "productName": "Apple iPhone 14 128GB",
          "sellPrice": 60000,
          "landingPrice": 55000,
          "downPayment": 10000,
          "downPaymentPending": 0,
          "balanceAmount": 45000,
          "interestRate": 3,
          "interestAmount": 1350,
          "totalEmiAmount": 46350,
          "emiPerMonth": 7725,
          "numberOfMonths": 6,
          "emiMonths": [
            {
              "month": 1,
              "dueDate": "2024-10-01T00:00:00.000Z",
              "amount": 7725,
              "paid": true,
              "paidDate": "2024-10-05T00:00:00.000Z"
            },
            {
              "month": 2,
              "dueDate": "2024-11-01T00:00:00.000Z",
              "amount": 7725,
              "paid": false
            }
          ]
        },
        "isLocked": false,
        "retailer": {
          "id": "...",
          "name": "Amit Sharma",
          "shopName": "Sharma Mobile Store",
          "mobile": "9876543210"
        },
        "createdAt": "2024-09-01T10:00:00.000Z",
        "updatedAt": "2024-11-05T14:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 45,
      "itemsPerPage": 10,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

#### Pending EMI Customers Response

```json
{
  "success": true,
  "message": "Pending EMI customers fetched successfully",
  "data": {
    "customers": [
      {
        "id": "6750xyz1234567890123456",
        "fullName": "Sagar Kumar",
        "mobileNumber": "9123456789",
        "mobileVerified": true,
        "aadharNumber": "987654321098",
        "dob": "1995-05-15T00:00:00.000Z",
        "imei1": "123456789012345",
        "imei2": "987654321098765",
        "fatherName": "Rajesh Kumar",
        "address": {
          "village": "Patna",
          "nearbyLocation": "Gandhi Maidan",
          "post": "Patna GPO",
          "district": "Patna",
          "pincode": "800001"
        },
        "documents": {
          "customerPhoto": "uploads/customers/photo_123.jpg",
          "aadharFrontPhoto": "uploads/customers/aadhar_front_123.jpg",
          "aadharBackPhoto": "uploads/customers/aadhar_back_123.jpg",
          "signaturePhoto": "uploads/customers/signature_123.jpg"
        },
        "isLocked": false,
        "emiDetails": {
          "branch": "Patna Main",
          "phoneType": "NEW",
          "model": "iPhone 14",
          "productName": "Apple iPhone 14 128GB",
          "emiPerMonth": 7725,
          "numberOfMonths": 6
        },
        "pendingEmis": [
          {
            "month": 2,
            "dueDate": "2024-11-01T00:00:00.000Z",
            "paid": false,
            "amount": 7725
          },
          {
            "month": 3,
            "dueDate": "2024-12-01T00:00:00.000Z",
            "paid": false,
            "amount": 7725
          }
        ],
        "retailer": {
          "id": "...",
          "name": "Amit Sharma",
          "shopName": "Sharma Mobile Store",
          "mobile": "9876543210"
        },
        "createdAt": "2024-09-01T10:00:00.000Z",
        "updatedAt": "2024-11-05T14:30:00.000Z"
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

---

### Summary of Changes

| API Endpoint | Previous Response | Updated Response |
|--------------|-------------------|------------------|
| `GET /api/admin/customers` | Already complete | No changes needed |
| `GET /api/retailer/customers` | Missing documents, emiDetails | âœ… Now includes all fields |
| `GET /api/accountant/customers` | Already complete | No changes needed |
| `GET /api/admin/customers/pending-emi` | Already includes documents | No changes needed |
| `GET /api/retailer/customers/pending-emi` | Missing documents, mobileVerified | âœ… Now includes all fields |
| `GET /api/accountant/customers/pending-emi` | Already includes documents | No changes needed |

---

### Benefits

1. **Consistency**: All customer APIs now return the same complete structure
2. **Frontend Ready**: Frontend can access all customer data without additional API calls
3. **Complete Information**: Documents, EMI details, and verification status available in all responses
4. **Better UX**: Display customer photos, documents, and complete EMI information directly

---
