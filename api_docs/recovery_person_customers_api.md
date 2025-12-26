# Recovery Person Customers API Documentation

## Overview
This API allows authenticated recovery persons to view their assigned customers and dashboard statistics. Recovery persons can see which customers are assigned to them and track their collection progress.

---

## Table of Contents

1. [Get Assigned Customers](#1-get-assigned-customers)
2. [Get Dashboard Statistics](#2-get-dashboard-statistics)

---

## 1. Get Assigned Customers

Retrieve all customers assigned to the authenticated recovery person with pagination and search support.

**URL:** `/api/recovery-person/customers`  
**Method:** `GET`  
**Authentication:** Required (Recovery Person JWT token)

### Request

#### Headers
```
Authorization: Bearer <recovery_person_jwt_token>
```

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | Number | No | 1 | Page number for pagination |
| limit | Number | No | 20 | Number of items per page |
| search | String | No | "" | Search by customer name, mobile, or aadhar |

#### Example Request URLs
```
GET /api/recovery-person/customers
GET /api/recovery-person/customers?page=1&limit=10
GET /api/recovery-person/customers?search=John
GET /api/recovery-person/customers?page=2&limit=15&search=9876
```

### Success Response (200 OK)

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
        "aadharNumber": "123456789012",
        "address": {
          "village": "Sample Village",
          "nearbyLocation": "Near Temple",
          "post": "Sample Post",
          "district": "Sample District",
          "pincode": "110001"
        },
        "imei": "123456789012345",
        "productName": "Samsung Galaxy A14",
        "model": "A14",
        "isCollected": false,
        "collectedAt": null
      },
      {
        "id": "507f1f77bcf86cd799439012",
        "fullName": "Jane Smith",
        "mobileNumber": "9123456789",
        "aadharNumber": "987654321098",
        "address": {
          "village": "Another Village",
          "nearbyLocation": "Near School",
          "post": "Another Post",
          "district": "Another District",
          "pincode": "110002"
        },
        "imei": "987654321098765",
        "productName": "Redmi Note 12",
        "model": "Note 12",
        "isCollected": true,
        "collectedAt": "2025-12-26T10:30:00.000Z"
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

### Error Responses

#### 401 Unauthorized - Missing Token
```json
{
  "success": false,
  "message": "Authorization token not found",
  "error": "INVALID_TOKEN"
}
```

#### 401 Unauthorized - Invalid Token
```json
{
  "success": false,
  "message": "Invalid or expired token",
  "error": "INVALID_TOKEN"
}
```

#### 403 Forbidden - Wrong Role
```json
{
  "success": false,
  "message": "Access denied. Recovery person role required.",
  "error": "FORBIDDEN"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to fetch customers",
  "error": "SERVER_ERROR"
}
```

---

## 2. Get Dashboard Statistics

Get dashboard statistics showing total assigned customers and total collected devices.

**URL:** `/api/recovery-person/dashboard`  
**Method:** `GET`  
**Authentication:** Required (Recovery Person JWT token)

### Request

#### Headers
```
Authorization: Bearer <recovery_person_jwt_token>
```

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Dashboard statistics fetched successfully",
  "data": {
    "totalAssigned": 25,
    "totalCollected": 8
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| totalAssigned | Number | Total number of customers assigned to this recovery person |
| totalCollected | Number | Total number of devices collected by this recovery person |

### Error Responses

#### 401 Unauthorized - Missing Token
```json
{
  "success": false,
  "message": "Authorization token not found",
  "error": "INVALID_TOKEN"
}
```

#### 401 Unauthorized - Invalid Token
```json
{
  "success": false,
  "message": "Invalid or expired token",
  "error": "INVALID_TOKEN"
}
```

#### 403 Forbidden - Wrong Role
```json
{
  "success": false,
  "message": "Access denied. Recovery person role required.",
  "error": "FORBIDDEN"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to fetch dashboard statistics",
  "error": "SERVER_ERROR"
}
```

---

## Usage Examples

### cURL Examples

#### Get Customers List
```bash
curl -X GET "http://localhost:5000/api/recovery-person/customers?page=1&limit=10" \
  -H "Authorization: Bearer <recovery_person_token>"
```

#### Get Customers with Search
```bash
curl -X GET "http://localhost:5000/api/recovery-person/customers?search=John" \
  -H "Authorization: Bearer <recovery_person_token>"
```

#### Get Dashboard Statistics
```bash
curl -X GET http://localhost:5000/api/recovery-person/dashboard \
  -H "Authorization: Bearer <recovery_person_token>"
```

---

### JavaScript (Fetch API) Examples

#### Get Customers List
```javascript
const getCustomers = async (page = 1, limit = 20, search = '') => {
  try {
    const token = localStorage.getItem('recoveryPersonToken');
    
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search })
    });
    
    const response = await fetch(
      `http://localhost:5000/api/recovery-person/customers?${queryParams}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const data = await response.json();

    if (data.success) {
      console.log('✅ Customers fetched:', data.data.customers.length);
      console.log('Pagination:', data.data.pagination);
      return data.data;
    } else {
      console.error('❌ Failed to fetch customers:', data.message);
      return null;
    }
  } catch (error) {
    console.error('Error fetching customers:', error);
    return null;
  }
};

// Usage
getCustomers(1, 10, 'John');
```

#### Get Dashboard Statistics
```javascript
const getDashboardStats = async () => {
  try {
    const token = localStorage.getItem('recoveryPersonToken');
    
    const response = await fetch('http://localhost:5000/api/recovery-person/dashboard', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ Dashboard stats fetched');
      console.log(`Total Assigned: ${data.data.totalAssigned}`);
      console.log(`Total Collected: ${data.data.totalCollected}`);
      return data.data;
    } else {
      console.error('❌ Failed to fetch stats:', data.message);
      return null;
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return null;
  }
};

// Usage
getDashboardStats();
```

---

### Axios Examples

```javascript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/recovery-person';

// Create axios instance with auth header
const createAuthAxios = () => {
  const token = localStorage.getItem('recoveryPersonToken');
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
};

// Get customers list
const getCustomers = async (page = 1, limit = 20, search = '') => {
  try {
    const api = createAuthAxios();
    const response = await api.get('/customers', {
      params: { page, limit, search }
    });
    
    console.log('✅ Customers fetched:', response.data.data.customers.length);
    return response.data.data;
  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
    throw error;
  }
};

// Get dashboard statistics
const getDashboardStats = async () => {
  try {
    const api = createAuthAxios();
    const response = await api.get('/dashboard');
    
    console.log('✅ Dashboard stats:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
    throw error;
  }
};

// Example usage
const loadDashboard = async () => {
  try {
    // Load dashboard stats
    const stats = await getDashboardStats();
    console.log(`Assigned: ${stats.totalAssigned}, Collected: ${stats.totalCollected}`);
    
    // Load first page of customers
    const customersData = await getCustomers(1, 10);
    console.log('Customers:', customersData.customers);
    console.log('Pagination:', customersData.pagination);
  } catch (error) {
    console.error('Failed to load dashboard:', error);
  }
};
```

---

## Frontend Integration Guide

### Step-by-Step Integration

#### 1. Dashboard Screen Setup
Create a dashboard screen with:
- Statistics cards showing total assigned and total collected
- Customer list with collection status indicators
- Search functionality
- Pagination controls

#### 2. Load Dashboard Statistics
```javascript
// On dashboard mount
useEffect(() => {
  const loadStats = async () => {
    setLoading(true);
    const stats = await getDashboardStats();
    if (stats) {
      setTotalAssigned(stats.totalAssigned);
      setTotalCollected(stats.totalCollected);
    }
    setLoading(false);
  };
  
  loadStats();
}, []);
```

#### 3. Load Customers List
```javascript
// Load customers with pagination
const loadCustomers = async (page = 1) => {
  setLoading(true);
  const data = await getCustomers(page, 10, searchQuery);
  if (data) {
    setCustomers(data.customers);
    setPagination(data.pagination);
  }
  setLoading(false);
};

// On component mount and when page/search changes
useEffect(() => {
  loadCustomers(currentPage);
}, [currentPage, searchQuery]);
```

#### 4. Display Customer Collection Status
```javascript
// In customer list item
const CustomerCard = ({ customer }) => {
  return (
    <div className="customer-card">
      <h3>{customer.fullName}</h3>
      <p>Mobile: {customer.mobileNumber}</p>
      <p>Product: {customer.productName} ({customer.model})</p>
      <p>IMEI: {customer.imei}</p>
      
      {/* Collection status badge */}
      {customer.isCollected ? (
        <span className="badge badge-success">
          ✅ Collected on {new Date(customer.collectedAt).toLocaleDateString()}
        </span>
      ) : (
        <span className="badge badge-warning">
          ⏳ Pending Collection
        </span>
      )}
    </div>
  );
};
```

---

## Important Notes

1. **Authentication Required**: Both endpoints require a valid Recovery Person JWT token in the Authorization header.

2. **Pagination**: The customer list endpoint supports pagination. Use `page` and `limit` query parameters to control the results.

3. **Search Functionality**: Search works across customer name, mobile number, and aadhar number (case-insensitive).

4. **Collection Status**: 
   - `isCollected: true` means the device has been collected
   - `isCollected: false` means the device is pending collection
   - `collectedAt` contains the timestamp when the device was collected (null if not collected)

5. **Only Active Assignments**: The API only returns customers with active assignments to the recovery person.

6. **Real-time Updates**: After collecting a device, refresh the customer list and dashboard to see updated statistics.

---

## Testing Checklist

- [ ] Test get customers with default pagination
- [ ] Test get customers with custom page and limit
- [ ] Test get customers with search query
- [ ] Test get customers with invalid token (should fail)
- [ ] Test get customers without token (should fail)
- [ ] Test dashboard statistics endpoint
- [ ] Verify collection status is correctly displayed
- [ ] Verify pagination works correctly
- [ ] Verify search filters results properly
- [ ] Test with recovery person who has no assignments
- [ ] Test with recovery person who has collected some devices

---

## Related APIs

- **Recovery Person Authentication**: See [recovery_person_auth_api.md](recovery_person_auth_api.md)
- **Device Collection**: See [DEVICE_COLLECTION_API_DOCUMENTATION.md](DEVICE_COLLECTION_API_DOCUMENTATION.md)
- **Recovery Person Management**: See [RECOVERY_PERSON_API_DOCUMENTATION.md](../RECOVERY_PERSON_API_DOCUMENTATION.md)

---

## Support

For any issues or questions regarding this API, please contact the backend development team.
