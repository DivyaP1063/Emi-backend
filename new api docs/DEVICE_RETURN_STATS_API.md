# Device Return Statistics and Details API Documentation

## Overview

This document describes the updated dashboard statistics API and the new endpoint for fetching returned devices details.

---

## 1. Get Dashboard Statistics (Updated)

**Endpoint**: `GET /api/recovery-person/dashboard`

**Description**: Get dashboard statistics for the authenticated recovery person, including total assigned, collected, and returned devices.

**Authentication**: Required (Recovery Person JWT token)

### Request

**Headers**:
```
Authorization: Bearer <recovery-person-jwt-token>
```

**Query Parameters**: None

### Response

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Dashboard statistics fetched successfully",
  "data": {
    "totalAssigned": 15,
    "totalCollected": 8,
    "totalReturned": 3
  }
}
```

**Field Descriptions**:
- `totalAssigned`: Number of customers currently assigned to this recovery person
- `totalCollected`: Number of devices collected from customers
- `totalReturned`: Number of devices returned (payment received)

**Error Responses**:

401 Unauthorized:
```json
{
  "success": false,
  "message": "No token provided",
  "error": "UNAUTHORIZED"
}
```

500 Server Error:
```json
{
  "success": false,
  "message": "Failed to fetch dashboard statistics",
  "error": "SERVER_ERROR"
}
```

---

## 2. Get Returned Devices (New)

**Endpoint**: `GET /api/recovery-person/returned-devices`

**Description**: Get detailed list of all devices that have been returned (payment received) with customer information, device details, collection info, and payment details. Supports pagination.

**Authentication**: Required (Recovery Person JWT token)

### Request

**Headers**:
```
Authorization: Bearer <recovery-person-jwt-token>
```

**Query Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | integer | No | 1 | Page number for pagination |
| limit | integer | No | 20 | Number of items per page |

**Example Request**:
```
GET /api/recovery-person/returned-devices?page=1&limit=10
```

### Response

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Returned devices fetched successfully",
  "data": {
    "returnedDevices": [
      {
        "id": "6952d1151709de3521e201cb",
        "customerInfo": {
          "fullName": "Ravi Tiwari",
          "fatherName": "Ram Tiwari",
          "mobileNumber": "9876543210",
          "aadharNumber": "123456789012",
          "address": {
            "village": "Rampur",
            "nearbyLocation": "Near Post Office",
            "post": "Rampur",
            "district": "Varanasi",
            "pincode": "221001"
          }
        },
        "deviceInfo": {
          "imei1": "123456789012345",
          "imei2": "987654321098765",
          "productName": "Samsung Galaxy A14",
          "model": "SM-A145F",
          "phoneType": "ANDROID"
        },
        "collectionInfo": {
          "isCollected": true,
          "collectedAt": "2026-01-05T10:30:00.000Z",
          "collectedBy": "Sahil Recovery 2",
          "deviceFrontImage": "https://cloudinary.com/device-front-123.jpg",
          "deviceBackImage": "https://cloudinary.com/device-back-123.jpg",
          "devicePin": "1234",
          "paymentDeadline": "2026-01-15T00:00:00.000Z",
          "notes": "Customer agreed to pay within 10 days"
        },
        "emiDetails": {
          "sellPrice": 15000,
          "downPayment": 3000,
          "downPaymentPending": 0,
          "emiPerMonth": 1200,
          "totalEmiAmount": 14400,
          "balanceAmount": 0
        },
        "returnedAt": "2026-01-10T09:15:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 3,
      "itemsPerPage": 10,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

**Field Descriptions**:

**returnedDevices** (array):
- `id`: Customer ID
- `customerInfo`: Customer personal details
  - `fullName`: Customer's full name
  - `fatherName`: Father's name
  - `mobileNumber`: Contact number
  - `aadharNumber`: Aadhar card number
  - `address`: Complete address details
- `deviceInfo`: Device specifications
  - `imei1`: Primary IMEI number
  - `imei2`: Secondary IMEI (null if not available)
  - `productName`: Device product name
  - `model`: Device model number
  - `phoneType`: Phone type (ANDROID/IOS/FEATURE_PHONE)
- `collectionInfo`: Collection details
  - `isCollected`: Whether device was collected
  - `collectedAt`: Collection timestamp
  - `collectedBy`: Name of recovery person who collected
  - `deviceFrontImage`: URL of device front image
  - `deviceBackImage`: URL of device back image
  - `devicePin`: Device unlock PIN
  - `paymentDeadline`: Payment deadline date
  - `notes`: Additional notes
- `emiDetails`: EMI and payment information
  - `sellPrice`: Original selling price
  - `downPayment`: Down payment amount
  - `downPaymentPending`: Pending down payment
  - `emiPerMonth`: Monthly EMI amount
  - `totalEmiAmount`: Total EMI amount
  - `balanceAmount`: Remaining balance
- `returnedAt`: Timestamp when payment was marked as received

**pagination**:
- `currentPage`: Current page number
- `totalPages`: Total number of pages
- `totalItems`: Total number of returned devices
- `itemsPerPage`: Items per page
- `hasNextPage`: Whether next page exists
- `hasPrevPage`: Whether previous page exists

**Error Responses**:

401 Unauthorized:
```json
{
  "success": false,
  "message": "No token provided",
  "error": "UNAUTHORIZED"
}
```

500 Server Error:
```json
{
  "success": false,
  "message": "Failed to fetch returned devices",
  "error": "SERVER_ERROR"
}
```

---

## Usage Examples

### Example 1: Get Dashboard Stats

```bash
curl -X GET \
  'https://your-api.com/api/recovery-person/dashboard' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### Example 2: Get First Page of Returned Devices

```bash
curl -X GET \
  'https://your-api.com/api/recovery-person/returned-devices?page=1&limit=10' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### Example 3: Get All Returned Devices (No Pagination)

```bash
curl -X GET \
  'https://your-api.com/api/recovery-person/returned-devices?limit=1000' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

---

## Notes

1. **Authentication**: All endpoints require a valid Recovery Person JWT token in the Authorization header
2. **Pagination**: The returned devices endpoint supports pagination with default values of page=1 and limit=20
3. **Sorting**: Returned devices are sorted by `updatedAt` in descending order (most recent first)
4. **Data Consistency**: The `totalReturned` count in dashboard stats matches the total number of devices in the returned devices list
5. **Schema Compatibility**: The backend handles both old and new schema formats for the `customers` array in `RecoveryPerson` model

---

## Frontend Integration

### Dashboard Stats Display

```javascript
// Fetch dashboard stats
const response = await fetch('/api/recovery-person/dashboard', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { data } = await response.json();

// Display stats
console.log(`Total Assigned: ${data.totalAssigned}`);
console.log(`Total Collected: ${data.totalCollected}`);
console.log(`Total Returned: ${data.totalReturned}`);
```

### Returned Devices List with Pagination

```javascript
// Fetch returned devices
const page = 1;
const limit = 10;

const response = await fetch(
  `/api/recovery-person/returned-devices?page=${page}&limit=${limit}`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

const { data } = await response.json();

// Display devices
data.returnedDevices.forEach(device => {
  console.log(`Customer: ${device.customerInfo.fullName}`);
  console.log(`Device: ${device.deviceInfo.productName}`);
  console.log(`Returned: ${new Date(device.returnedAt).toLocaleDateString()}`);
});

// Handle pagination
if (data.pagination.hasNextPage) {
  console.log('Load next page...');
}
```

---

## Testing Checklist

- [ ] Dashboard stats shows correct `totalReturned` count
- [ ] Returned devices list shows only devices with `moneyReceived: true`
- [ ] Pagination works correctly
- [ ] Customer details are complete and accurate
- [ ] Device info is displayed correctly
- [ ] Collection info includes all fields
- [ ] EMI details are accurate
- [ ] `returnedAt` timestamp is correct
- [ ] Empty list handled gracefully when no devices returned
- [ ] Authentication errors handled properly
