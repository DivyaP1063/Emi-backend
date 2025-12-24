# Admin Recovery Head API Documentation

## Overview
This API allows admins to create and manage recovery heads (personnel who manage phone collection in specific regions identified by pin codes). Recovery heads are assigned specific pin code regions for phone recovery operations.

## Endpoint Details

### 1. Create Recovery Head

**URL:** `/api/admin/recovery-heads`  
**Method:** `POST`  
**Authentication:** Required (Admin JWT Token)  
**Content-Type:** `application/json`

---

## Request

### Headers
```
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json
```

### Request Body
```json
{
  "fullName": "John Doe",
  "mobileNumber": "9876543210",
  "pinCodes": ["110001", "110002", "110003"]
}
```

### Request Body Parameters

| Parameter | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| fullName | String | Yes | Recovery head's full name | Minimum 2 characters |
| mobileNumber | String | Yes | 10-digit mobile number | Must be exactly 10 digits, unique |
| pinCodes | Array of Strings | Yes | Array of pin codes assigned to this recovery head | Each pin code must be exactly 6 digits, at least 1 pin code required |

---

## Response

### Success Response (201 Created)

```json
{
  "success": true,
  "message": "Recovery head created successfully",
  "data": {
    "recoveryHeadId": "507f1f77bcf86cd799439011",
    "fullName": "John Doe",
    "mobileNumber": "9876543210",
    "pinCodes": ["110001", "110002", "110003"],
    "status": "ACTIVE",
    "createdAt": "2024-12-24T18:15:30.000Z"
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
  "details": {
    "mobileNumber": "Mobile number must be exactly 10 digits",
    "pinCodes.0": "Each pin code must be exactly 6 digits"
  }
}
```

### 409 Conflict - Duplicate Mobile Number

```json
{
  "success": false,
  "message": "Recovery head with this mobile number already exists",
  "error": "DUPLICATE_MOBILE"
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

### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Failed to create recovery head",
  "error": "SERVER_ERROR"
}
```

---

## 2. Get All Recovery Heads

**URL:** `/api/admin/recovery-heads`  
**Method:** `GET`  
**Authentication:** Required (Admin JWT Token)

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | Number | No | 1 | Page number for pagination |
| limit | Number | No | 20 | Number of items per page |
| search | String | No | - | Search by name or mobile number |
| status | String | No | - | Filter by status (ACTIVE or INACTIVE) |

### Request Example

```bash
GET /api/admin/recovery-heads?page=1&limit=10&search=John&status=ACTIVE
```

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Recovery heads fetched successfully",
  "data": {
    "recoveryHeads": [
      {
        "recoveryHeadId": "507f1f77bcf86cd799439011",
        "fullName": "John Doe",
        "mobileNumber": "9876543210",
        "pinCodes": ["110001", "110002", "110003"],
        "pinCodesCount": 3,
        "status": "ACTIVE",
        "createdAt": "2024-12-24T18:15:30.000Z"
      },
      {
        "recoveryHeadId": "507f1f77bcf86cd799439012",
        "fullName": "Jane Smith",
        "mobileNumber": "9876543211",
        "pinCodes": ["110004", "110005"],
        "pinCodesCount": 2,
        "status": "ACTIVE",
        "createdAt": "2024-12-24T18:20:30.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 50,
      "itemsPerPage": 10
    }
  }
}
```

---

## 3. Update Recovery Head Status

**URL:** `/api/admin/recovery-heads/:recoveryHeadId/status`  
**Method:** `PUT`  
**Authentication:** Required (Admin JWT Token)  
**Content-Type:** `application/json`

### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| recoveryHeadId | String | Yes | MongoDB ObjectId of the recovery head |

### Request Body

```json
{
  "status": "INACTIVE"
}
```

### Request Body Parameters

| Parameter | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| status | String | Yes | New status for the recovery head | Must be one of: ACTIVE, INACTIVE |

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Recovery head status updated from ACTIVE to INACTIVE",
  "data": {
    "recoveryHeadId": "507f1f77bcf86cd799439011",
    "fullName": "John Doe",
    "mobileNumber": "9876543210",
    "previousStatus": "ACTIVE",
    "currentStatus": "INACTIVE",
    "updatedAt": "2024-12-24T18:30:30.000Z"
  }
}
```

### Error Responses

#### 400 Bad Request - Invalid Recovery Head ID

```json
{
  "success": false,
  "message": "Invalid recovery head ID format",
  "error": "VALIDATION_ERROR"
}
```

#### 404 Not Found - Recovery Head Not Found

```json
{
  "success": false,
  "message": "Recovery head not found",
  "error": "RECOVERY_HEAD_NOT_FOUND"
}
```

---

## Usage Examples

### cURL Examples

#### Create Recovery Head

```bash
curl -X POST http://localhost:5000/api/admin/recovery-heads \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "mobileNumber": "9876543210",
    "pinCodes": ["110001", "110002", "110003"]
  }'
```

#### Get All Recovery Heads

```bash
curl -X GET "http://localhost:5000/api/admin/recovery-heads?page=1&limit=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Update Recovery Head Status

```bash
curl -X PUT http://localhost:5000/api/admin/recovery-heads/507f1f77bcf86cd799439011/status \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "status": "INACTIVE"
  }'
```

---

### JavaScript (Fetch API) Examples

#### Create Recovery Head

```javascript
const createRecoveryHead = async (fullName, mobileNumber, pinCodes) => {
  try {
    const response = await fetch('http://localhost:5000/api/admin/recovery-heads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fullName,
        mobileNumber,
        pinCodes
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ Recovery head created:', data.data);
      return data.data;
    } else {
      console.error('❌ Failed to create recovery head:', data.message);
      return null;
    }
  } catch (error) {
    console.error('Error creating recovery head:', error);
    return null;
  }
};

// Usage
createRecoveryHead('John Doe', '9876543210', ['110001', '110002', '110003']);
```

#### Get All Recovery Heads

```javascript
const getAllRecoveryHeads = async (page = 1, limit = 10, search = '', status = '') => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    if (search) params.append('search', search);
    if (status) params.append('status', status);

    const response = await fetch(
      `http://localhost:5000/api/admin/recovery-heads?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      }
    );

    const data = await response.json();

    if (data.success) {
      console.log('✅ Recovery heads fetched:', data.data);
      return data.data;
    } else {
      console.error('❌ Failed to fetch recovery heads:', data.message);
      return null;
    }
  } catch (error) {
    console.error('Error fetching recovery heads:', error);
    return null;
  }
};

// Usage
getAllRecoveryHeads(1, 10, 'John', 'ACTIVE');
```

#### Update Recovery Head Status

```javascript
const updateRecoveryHeadStatus = async (recoveryHeadId, status) => {
  try {
    const response = await fetch(
      `http://localhost:5000/api/admin/recovery-heads/${recoveryHeadId}/status`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      }
    );

    const data = await response.json();

    if (data.success) {
      console.log('✅ Status updated:', data.message);
      return data.data;
    } else {
      console.error('❌ Failed to update status:', data.message);
      return null;
    }
  } catch (error) {
    console.error('Error updating status:', error);
    return null;
  }
};

// Usage
updateRecoveryHeadStatus('507f1f77bcf86cd799439011', 'INACTIVE');
```

---

### Axios Examples

```javascript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/admin';

// Create axios instance with auth header
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
  }
});

// Create Recovery Head
const createRecoveryHead = async (fullName, mobileNumber, pinCodes) => {
  try {
    const response = await api.post('/recovery-heads', {
      fullName,
      mobileNumber,
      pinCodes
    });
    
    console.log('✅ Recovery head created:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    return null;
  }
};

// Get All Recovery Heads
const getAllRecoveryHeads = async (page = 1, limit = 10, search = '', status = '') => {
  try {
    const response = await api.get('/recovery-heads', {
      params: { page, limit, search, status }
    });
    
    console.log('✅ Recovery heads fetched:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    return null;
  }
};

// Update Recovery Head Status
const updateRecoveryHeadStatus = async (recoveryHeadId, status) => {
  try {
    const response = await api.put(`/recovery-heads/${recoveryHeadId}/status`, {
      status
    });
    
    console.log('✅ Status updated:', response.data.message);
    return response.data.data;
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    return null;
  }
};
```

---

## Frontend Integration Guide

### Step-by-Step Integration

1. **Create Recovery Head Form**
   - Add form fields for full name, mobile number, and pin codes
   - Validate mobile number (10 digits)
   - Validate each pin code (6 digits)
   - Allow adding/removing pin codes dynamically

2. **Display Recovery Heads List**
   - Implement pagination
   - Add search functionality
   - Add status filter dropdown
   - Display pin codes count for each recovery head

3. **Status Management**
   - Add toggle/button to change status
   - Show confirmation dialog before changing status
   - Update UI after successful status change

### Recommended UI Flow

```
Admin Dashboard
    ↓
Recovery Heads Management
    ↓
[Create New] [Search] [Filter by Status]
    ↓
Recovery Heads List (with pagination)
    ↓
[View Details] [Change Status]
```

---

## Important Notes

1. **Authentication**: All endpoints require admin JWT token in the Authorization header.

2. **Pin Code Format**: Each pin code must be exactly 6 digits (e.g., "110001", "560001").

3. **Mobile Number Uniqueness**: Each recovery head must have a unique mobile number.

4. **Status Management**: Recovery heads can be ACTIVE or INACTIVE. Only active recovery heads should be assigned to phone collection tasks.

5. **Pin Code Assignment**: A recovery head can be assigned multiple pin codes, representing different regions they manage.

6. **Search Functionality**: Search works on both full name and mobile number fields.

---

## Testing Checklist

- [ ] Test creating recovery head with valid data
- [ ] Test creating recovery head with duplicate mobile number (should fail)
- [ ] Test creating recovery head with invalid mobile number format (should fail)
- [ ] Test creating recovery head with invalid pin code format (should fail)
- [ ] Test creating recovery head with empty pin codes array (should fail)
- [ ] Test fetching all recovery heads with pagination
- [ ] Test search functionality by name
- [ ] Test search functionality by mobile number
- [ ] Test status filter (ACTIVE/INACTIVE)
- [ ] Test updating recovery head status from ACTIVE to INACTIVE
- [ ] Test updating recovery head status from INACTIVE to ACTIVE
- [ ] Test updating non-existent recovery head (should return 404)
- [ ] Test all endpoints without authentication token (should return 401)

---

## Support

For any issues or questions regarding this API, please contact the backend development team.
