# Recovery Head Statistics API Documentation

## Overview
This API allows authenticated recovery heads to retrieve their statistics, including total assigned customers, total recovery persons, and total devices collected.

---

## Endpoint

### Get Recovery Head Statistics

**GET** `/api/recovery-head/statistics`

Retrieves statistics for the authenticated recovery head.

#### Authentication
- **Required**: Yes
- **Type**: Bearer Token (JWT)
- **Role**: RECOVERY_HEAD

#### Request Headers
```
Authorization: Bearer <jwt_token>
```

#### Query Parameters
None

#### Request Body
None

---

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Statistics fetched successfully",
  "data": {
    "totalAssignedCustomers": 25,
    "totalRecoveryPersons": 5,
    "totalDevicesCollected": 12
  }
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | Boolean | Indicates if the request was successful |
| `message` | String | Human-readable message |
| `data` | Object | Statistics data object |
| `data.totalAssignedCustomers` | Number | Total number of customers assigned to this recovery head |
| `data.totalRecoveryPersons` | Number | Total number of active recovery persons under this recovery head |
| `data.totalDevicesCollected` | Number | Total number of devices collected from assigned customers |

---

## Error Responses

### 401 Unauthorized - Missing Token
```json
{
  "success": false,
  "message": "Authorization token not found",
  "error": "INVALID_TOKEN"
}
```

### 401 Unauthorized - Invalid Token
```json
{
  "success": false,
  "message": "Invalid or expired token",
  "error": "INVALID_TOKEN"
}
```

### 403 Forbidden - Wrong Role
```json
{
  "success": false,
  "message": "Access denied: Recovery Head role required",
  "error": "FORBIDDEN"
}
```

### 403 Forbidden - Inactive Account
```json
{
  "success": false,
  "message": "Recovery head account is inactive",
  "error": "ACCOUNT_NOT_ACTIVE"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to fetch statistics",
  "error": "SERVER_ERROR"
}
```

---

## Usage Example

### Using cURL

```bash
curl -X GET \
  'http://localhost:3000/api/recovery-head/statistics' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### Using JavaScript (Fetch API)

```javascript
const token = 'your_jwt_token_here';

fetch('http://localhost:3000/api/recovery-head/statistics', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
  .then(response => response.json())
  .then(data => {
    console.log('Statistics:', data.data);
    console.log('Total Assigned Customers:', data.data.totalAssignedCustomers);
    console.log('Total Recovery Persons:', data.data.totalRecoveryPersons);
    console.log('Total Devices Collected:', data.data.totalDevicesCollected);
  })
  .catch(error => console.error('Error:', error));
```

### Using Axios

```javascript
const axios = require('axios');

const getStatistics = async () => {
  try {
    const response = await axios.get(
      'http://localhost:3000/api/recovery-head/statistics',
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('Statistics:', response.data.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
};

getStatistics();
```

---

## Statistics Breakdown

### Total Assigned Customers
- Counts all customers where:
  - `assignedToRecoveryHeadId` matches the authenticated recovery head's ID
  - `assigned` is `true`

### Total Recovery Persons
- Counts all recovery persons where:
  - `recoveryHeadId` matches the authenticated recovery head's ID
  - `isActive` is `true`

### Total Devices Collected
- Counts all customers where:
  - `assignedToRecoveryHeadId` matches the authenticated recovery head's ID
  - `assigned` is `true`
  - `isCollected` is `true`

---

## Notes

1. **Authentication Required**: This endpoint requires a valid JWT token with the RECOVERY_HEAD role.
2. **Real-time Data**: Statistics are calculated in real-time from the database.
3. **Scope**: Statistics are limited to the authenticated recovery head's data only.
4. **Performance**: Uses MongoDB's `countDocuments()` for efficient counting.

---

## Related Endpoints

- `POST /api/recovery-head/send-otp` - Send OTP for authentication
- `POST /api/recovery-head/verify-otp` - Verify OTP and get JWT token
- `GET /api/recovery-head/assigned-customers` - Get detailed list of assigned customers
- `GET /api/recovery-head/recovery-persons-with-customers` - Get recovery persons with their assigned customers
