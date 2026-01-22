# Pincode Management API Documentation

## Overview

This API allows administrators to manage pincodes and retailers to fetch active pincodes for customer creation. The system supports:
- **Admin**: Full CRUD operations on pincodes
- **Retailer**: Fetch active pincodes for dropdown selection during customer creation

---

## Admin APIs

### 1. Create Pincode

**Endpoint:** `POST /api/admin/pincodes`

**Authentication:** Required (Admin only)

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "pincode": "110001"
}
```

**Validation Rules:**
- `pincode` must be exactly 6 digits
- `pincode` must be unique

**Success Response (201):**
```json
{
  "success": true,
  "message": "Pincode created successfully",
  "data": {
    "id": "65abc123def456789",
    "pincode": "110001",
    "isActive": true,
    "createdAt": "2026-01-22T13:25:30.123Z"
  }
}
```

**Error Responses:**

**400 - Validation Error:**
```json
{
  "success": false,
  "message": "Validation failed",
  "error": "VALIDATION_ERROR",
  "details": [
    {
      "msg": "Pincode must be exactly 6 digits",
      "param": "pincode",
      "location": "body"
    }
  ]
}
```

**400 - Duplicate Pincode:**
```json
{
  "success": false,
  "message": "Pincode already exists",
  "error": "DUPLICATE_PINCODE"
}
```

---

### 2. Get All Pincodes

**Endpoint:** `GET /api/admin/pincodes`

**Authentication:** Required (Admin only)

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 20) - Items per page
- `search` (optional) - Search by pincode
- `isActive` (optional, true/false) - Filter by active status

**Example Request:**
```
GET /api/admin/pincodes?page=1&limit=20&search=110&isActive=true
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Pincodes fetched successfully",
  "data": {
    "pincodes": [
      {
        "id": "65abc123def456789",
        "pincode": "110001",
        "isActive": true,
        "createdAt": "2026-01-22T13:25:30.123Z",
        "updatedAt": "2026-01-22T13:25:30.123Z"
      },
      {
        "id": "65abc123def456790",
        "pincode": "110002",
        "isActive": true,
        "createdAt": "2026-01-22T13:26:15.456Z",
        "updatedAt": "2026-01-22T13:26:15.456Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 100,
      "itemsPerPage": 20,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

---

### 3. Get Pincode by ID

**Endpoint:** `GET /api/admin/pincodes/:pincodeId`

**Authentication:** Required (Admin only)

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Pincode fetched successfully",
  "data": {
    "id": "65abc123def456789",
    "pincode": "110001",
    "isActive": true,
    "createdAt": "2026-01-22T13:25:30.123Z",
    "updatedAt": "2026-01-22T13:25:30.123Z"
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "Pincode not found",
  "error": "PINCODE_NOT_FOUND"
}
```

---

### 4. Update Pincode

**Endpoint:** `PUT /api/admin/pincodes/:pincodeId`

**Authentication:** Required (Admin only)

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "pincode": "110003",
  "isActive": false
}
```

**Note:** Both fields are optional. You can update either or both.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Pincode updated successfully",
  "data": {
    "id": "65abc123def456789",
    "pincode": "110003",
    "isActive": false,
    "updatedAt": "2026-01-22T14:30:45.789Z"
  }
}
```

**Error Responses:**

**404 - Not Found:**
```json
{
  "success": false,
  "message": "Pincode not found",
  "error": "PINCODE_NOT_FOUND"
}
```

**400 - Duplicate Pincode:**
```json
{
  "success": false,
  "message": "Pincode already exists",
  "error": "DUPLICATE_PINCODE"
}
```

---

### 5. Delete Pincode (Soft Delete)

**Endpoint:** `DELETE /api/admin/pincodes/:pincodeId`

**Authentication:** Required (Admin only)

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Note:** This performs a soft delete by setting `isActive` to `false`. The pincode record is not removed from the database.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Pincode deleted successfully",
  "data": {
    "id": "65abc123def456789",
    "pincode": "110001",
    "isActive": false
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "Pincode not found",
  "error": "PINCODE_NOT_FOUND"
}
```

---

## Retailer APIs

### 6. Get Active Pincodes (Dropdown)

**Endpoint:** `GET /api/retailer/pincodes`

**Authentication:** Required (Retailer only)

**Headers:**
```
Authorization: Bearer <retailer_token>
```

**Description:** Returns all active pincodes sorted by pincode number. This endpoint is designed for dropdown selection during customer creation.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Active pincodes fetched successfully",
  "data": {
    "pincodes": [
      "110001",
      "110002",
      "110003",
      "110004",
      "110005"
    ],
    "count": 5
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Authentication required",
  "error": "UNAUTHORIZED"
}
```

---

## Integration Guide

### Customer Creation Flow with Pincode Dropdown

**Step-by-Step Integration:**

1. **Retailer enters customer basic details** (name, DOB, etc.)

2. **Retailer sends OTP to customer mobile**
   ```
   POST /api/retailer/customers/send-otp
   ```

3. **Customer verifies OTP**
   ```
   POST /api/retailer/customers/verify-otp
   ```

4. **Retailer fetches pincode dropdown** ✨ NEW
   ```
   GET /api/retailer/pincodes
   ```
   
   Response:
   ```json
   {
     "success": true,
     "data": {
       "pincodes": ["110001", "110002", "110003", ...],
       "count": 150
     }
   }
   ```

5. **Retailer selects pincode from dropdown**
   - Display pincodes in a searchable dropdown
   - User selects the appropriate pincode

6. **Retailer enters other address details**
   - Village
   - Nearby Location
   - Post
   - District

7. **Retailer uploads documents and creates customer**
   ```
   POST /api/retailer/customers
   ```
   
   Include the selected pincode in the request body:
   ```json
   {
     "fullName": "John Doe",
     "pincode": "110001",
     ...
   }
   ```

---

## Frontend Implementation Example

### React/React Native Example

```javascript
// Fetch pincodes after OTP verification
const fetchPincodes = async () => {
  try {
    const response = await fetch('https://api.example.com/api/retailer/pincodes', {
      headers: {
        'Authorization': `Bearer ${retailerToken}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      setPincodes(data.data.pincodes);
    }
  } catch (error) {
    console.error('Failed to fetch pincodes:', error);
  }
};

// Render dropdown
<Select
  placeholder="Select Pincode"
  options={pincodes.map(pin => ({ label: pin, value: pin }))}
  onChange={(value) => setSelectedPincode(value)}
  searchable
/>
```

---

## Database Schema

### Pincode Model

```javascript
{
  pincode: {
    type: String,
    required: true,
    unique: true,
    match: /^[0-9]{6}$/
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `pincode` (unique)
- `isActive`

---

## Error Codes Reference

| Error Code | Description |
|------------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `DUPLICATE_PINCODE` | Pincode already exists in database |
| `PINCODE_NOT_FOUND` | Pincode ID not found |
| `UNAUTHORIZED` | Authentication required or invalid token |
| `SERVER_ERROR` | Internal server error |

---

## Testing with Postman

### 1. Create Pincode (Admin)

```
POST {{baseUrl}}/api/admin/pincodes
Headers:
  Authorization: Bearer {{adminToken}}
  Content-Type: application/json
Body:
{
  "pincode": "110001"
}
```

### 2. Get All Pincodes (Admin)

```
GET {{baseUrl}}/api/admin/pincodes?page=1&limit=20&isActive=true
Headers:
  Authorization: Bearer {{adminToken}}
```

### 3. Update Pincode (Admin)

```
PUT {{baseUrl}}/api/admin/pincodes/{{pincodeId}}
Headers:
  Authorization: Bearer {{adminToken}}
  Content-Type: application/json
Body:
{
  "isActive": false
}
```

### 4. Get Active Pincodes (Retailer)

```
GET {{baseUrl}}/api/retailer/pincodes
Headers:
  Authorization: Bearer {{retailerToken}}
```

---

## Best Practices

1. **Admin Management:**
   - Add pincodes in bulk during initial setup
   - Use soft delete to maintain data integrity
   - Regularly audit active pincodes

2. **Retailer Usage:**
   - Cache pincode list on the client side
   - Implement search/filter for large pincode lists
   - Validate pincode format before submission

3. **Performance:**
   - Pincodes are indexed for fast queries
   - Retailer endpoint returns minimal data (just pincode strings)
   - No pagination needed for retailer endpoint (typically < 1000 pincodes)

---

## Change Log

### Version 1.0.0 (2026-01-22)
- Initial release
- Admin CRUD operations for pincodes
- Retailer dropdown endpoint
- Integration with customer creation flow
