# Customer Location API Documentation

This document describes the API endpoints for accessing customer device location data. These endpoints allow authorized users (Admin and Recovery Head) to fetch the real-time location of customer devices.

## Table of Contents
- [Overview](#overview)
- [Admin Endpoints](#admin-endpoints)
- [Recovery Head Endpoints](#recovery-head-endpoints)
- [Response Formats](#response-formats)
- [Error Handling](#error-handling)

---

## Overview

The Customer Location API provides secure access to customer device location data. Location data is automatically updated by the customer's mobile device every 15 minutes.

**Access Control:**
- **Admin**: Can access location data for any customer
- **Recovery Head**: Can only access location data for customers assigned to them

**Location Data:**
- Latitude and longitude coordinates
- Last updated timestamp
- Customer identification details

---

## Admin Endpoints

### Get Customer Location (Admin)

Fetch the current location of any customer device.

**Endpoint:** `GET /api/admin/customers/:customerId/location`

**Authentication:** Required (Admin JWT token)

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| customerId | String | Yes | MongoDB ObjectId of the customer (24 hex characters) |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Customer location fetched successfully",
  "data": {
    "customerId": "507f1f77bcf86cd799439011",
    "customerName": "John Doe",
    "mobileNumber": "9876543210",
    "location": {
      "latitude": 28.7041,
      "longitude": 77.1025,
      "lastUpdated": "2025-12-25T10:15:30.000Z"
    }
  }
}
```

**Error Responses:**

**400 Bad Request** - Invalid customer ID format
```json
{
  "success": false,
  "message": "Invalid customer ID format",
  "error": "VALIDATION_ERROR"
}
```

**401 Unauthorized** - Missing or invalid authentication token
```json
{
  "success": false,
  "message": "Authorization token not found",
  "error": "INVALID_TOKEN"
}
```

**404 Not Found** - Customer not found
```json
{
  "success": false,
  "message": "Customer not found",
  "error": "CUSTOMER_NOT_FOUND"
}
```

**404 Not Found** - Location data not available
```json
{
  "success": false,
  "message": "Location data not available for this customer",
  "error": "LOCATION_NOT_FOUND"
}
```

**500 Internal Server Error** - Server error
```json
{
  "success": false,
  "message": "Failed to fetch customer location",
  "error": "SERVER_ERROR"
}
```

**Example Request (cURL):**
```bash
curl -X GET "http://localhost:5000/api/admin/customers/507f1f77bcf86cd799439011/location" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Example Request (JavaScript):**
```javascript
const response = await fetch(
  'http://localhost:5000/api/admin/customers/507f1f77bcf86cd799439011/location',
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    }
  }
);

const data = await response.json();
console.log(data);
```

---

## Recovery Head Endpoints

### Get Customer Location (Recovery Head)

Fetch the current location of a customer device assigned to the authenticated recovery head.

**Endpoint:** `GET /api/recovery-head/customers/:customerId/location`

**Authentication:** Required (Recovery Head JWT token)

**Headers:**
```
Authorization: Bearer <recovery_head_jwt_token>
```

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| customerId | String | Yes | MongoDB ObjectId of the customer (24 hex characters) |

**Access Control:**
- Recovery heads can ONLY access location data for customers assigned to them
- Attempting to access a non-assigned customer will return a 404 error

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Customer location fetched successfully",
  "data": {
    "customerId": "507f1f77bcf86cd799439011",
    "customerName": "John Doe",
    "mobileNumber": "9876543210",
    "location": {
      "latitude": 28.7041,
      "longitude": 77.1025,
      "lastUpdated": "2025-12-25T10:15:30.000Z"
    }
  }
}
```

**Error Responses:**

**400 Bad Request** - Invalid customer ID format
```json
{
  "success": false,
  "message": "Invalid customer ID format",
  "error": "VALIDATION_ERROR"
}
```

**401 Unauthorized** - Missing or invalid authentication token
```json
{
  "success": false,
  "message": "Authorization token not found",
  "error": "INVALID_TOKEN"
}
```

**403 Forbidden** - Recovery head account not active
```json
{
  "success": false,
  "message": "Recovery head account is inactive",
  "error": "ACCOUNT_NOT_ACTIVE"
}
```

**404 Not Found** - Customer not found or not assigned to this recovery head
```json
{
  "success": false,
  "message": "Customer not found or not assigned to you",
  "error": "CUSTOMER_NOT_FOUND"
}
```

**404 Not Found** - Location data not available
```json
{
  "success": false,
  "message": "Location data not available for this customer",
  "error": "LOCATION_NOT_FOUND"
}
```

**500 Internal Server Error** - Server error
```json
{
  "success": false,
  "message": "Failed to fetch customer location",
  "error": "SERVER_ERROR"
}
```

**Example Request (cURL):**
```bash
curl -X GET "http://localhost:5000/api/recovery-head/customers/507f1f77bcf86cd799439011/location" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Example Request (JavaScript):**
```javascript
const response = await fetch(
  'http://localhost:5000/api/recovery-head/customers/507f1f77bcf86cd799439011/location',
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${recoveryHeadToken}`,
      'Content-Type': 'application/json'
    }
  }
);

const data = await response.json();
console.log(data);
```

---

## Response Formats

### Location Object

The location object contains GPS coordinates and timestamp information:

```json
{
  "latitude": 28.7041,      // Decimal degrees, range: -90 to 90
  "longitude": 77.1025,     // Decimal degrees, range: -180 to 180
  "lastUpdated": "2025-12-25T10:15:30.000Z"  // ISO 8601 timestamp
}
```

**Field Descriptions:**

| Field | Type | Description |
|-------|------|-------------|
| latitude | Number | Latitude coordinate in decimal degrees (-90 to 90) |
| longitude | Number | Longitude coordinate in decimal degrees (-180 to 180) |
| lastUpdated | String | ISO 8601 timestamp of when the location was last updated by the device |

### Customer Data Object

```json
{
  "customerId": "507f1f77bcf86cd799439011",
  "customerName": "John Doe",
  "mobileNumber": "9876543210",
  "location": { /* Location Object */ }
}
```

---

## Error Handling

### Error Response Structure

All error responses follow this structure:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "ERROR_CODE"
}
```

### Common Error Codes

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| VALIDATION_ERROR | 400 | Invalid request parameters or format |
| INVALID_TOKEN | 401 | Missing or invalid authentication token |
| UNAUTHORIZED_ACCESS | 401 | User not found or inactive |
| FORBIDDEN | 403 | Access denied (wrong role or inactive account) |
| CUSTOMER_NOT_FOUND | 404 | Customer not found or not assigned to recovery head |
| LOCATION_NOT_FOUND | 404 | Customer exists but location data is not available |
| SERVER_ERROR | 500 | Internal server error |

### Location Data Availability

**When is location data NOT available?**
1. Customer device has not registered with the server
2. Customer device has not sent location updates
3. Location permissions are disabled on the device
4. Device is offline or not connected to the internet

**Location Update Frequency:**
- Customer devices automatically send location updates every 15 minutes
- The `lastUpdated` field indicates when the last update was received

---

## Authentication

### Admin Authentication

1. **Login:** Send OTP to admin mobile number
   - Endpoint: `POST /api/admin/auth/send-otp`
   
2. **Verify OTP:** Verify OTP and receive JWT token
   - Endpoint: `POST /api/admin/auth/verify-otp`
   
3. **Use Token:** Include JWT token in Authorization header for all subsequent requests

### Recovery Head Authentication

1. **Login:** Send OTP to recovery head mobile number
   - Endpoint: `POST /api/recovery-head/send-otp`
   
2. **Verify OTP:** Verify OTP and receive JWT token
   - Endpoint: `POST /api/recovery-head/verify-otp`
   
3. **Use Token:** Include JWT token in Authorization header for all subsequent requests

---

## Best Practices

### 1. Token Management
- Store JWT tokens securely (e.g., in secure storage, not localStorage)
- Refresh tokens before they expire
- Clear tokens on logout

### 2. Error Handling
- Always check the `success` field in responses
- Handle all possible error codes appropriately
- Display user-friendly error messages

### 3. Location Data
- Check if `location` object exists before accessing coordinates
- Verify `lastUpdated` timestamp to ensure data freshness
- Consider location data older than 30 minutes as potentially stale

### 4. Rate Limiting
- Implement client-side rate limiting to avoid excessive API calls
- Cache location data when appropriate
- Use polling intervals of at least 1 minute for location updates

### 5. Privacy and Security
- Only request location data when necessary
- Inform users about location tracking
- Comply with data protection regulations

---

## Testing

### Test Scenarios

#### Admin Access
1. ✅ Admin can fetch location for any customer
2. ✅ Admin receives 404 for non-existent customer
3. ✅ Admin receives 404 when location data is unavailable
4. ✅ Admin receives 401 without valid token

#### Recovery Head Access
1. ✅ Recovery head can fetch location for assigned customers
2. ✅ Recovery head receives 404 for non-assigned customers
3. ✅ Recovery head receives 404 when location data is unavailable
4. ✅ Recovery head receives 401 without valid token
5. ✅ Recovery head receives 403 when account is inactive

### Sample Test Data

**Valid Customer ID with Location:**
```
customerId: "507f1f77bcf86cd799439011"
```

**Invalid Customer ID Format:**
```
customerId: "invalid-id"
customerId: "123"
```

---

## Support

For issues or questions regarding the Customer Location API:
- Check error codes and messages in the response
- Verify authentication token is valid and not expired
- Ensure customer ID format is correct (24 hex characters)
- Confirm customer has registered their device and sent location updates

---

## Changelog

### Version 1.0.0 (2025-12-25)
- Initial release
- Added admin endpoint for customer location
- Added recovery head endpoint for customer location
- Implemented role-based access control
- Added comprehensive error handling
