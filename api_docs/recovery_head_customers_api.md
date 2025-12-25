# Recovery Head - Get Assigned Customers API Documentation

## Overview

This API allows authenticated recovery heads to fetch all customers assigned to them with comprehensive details including IMEI numbers, contact information, address, product details, and next EMI due date.

---

## Endpoint Details

**URL:** `/api/recovery-head/assigned-customers`  
**Method:** `GET`  
**Authentication:** Required (Recovery Head JWT token)  
**Content-Type:** `application/json`

---

## Authentication

This endpoint requires a valid JWT token obtained from the recovery head login process. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

---

## Request

### Headers

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | Number | No | 1 | Page number for pagination |
| limit | Number | No | 20 | Number of items per page (max: 100) |
| search | String | No | - | Search term to filter customers by name, mobile, or IMEI |

### Example Request URLs

```
GET /api/recovery-head/assigned-customers
GET /api/recovery-head/assigned-customers?page=1&limit=20
GET /api/recovery-head/assigned-customers?search=John
GET /api/recovery-head/assigned-customers?page=2&limit=10&search=9876543210
```

---

## Success Response (200 OK)

```json
{
  "success": true,
  "message": "Assigned customers fetched successfully",
  "data": {
    "customers": [
      {
        "customerId": "507f1f77bcf86cd799439011",
        "fullName": "Rajesh Kumar",
        "mobileNumber": "9876543210",
        "aadharNumber": "123456789012",
        "dob": "1990-05-15T00:00:00.000Z",
        "fatherName": "Ram Kumar",
        "address": {
          "village": "Rampur",
          "nearbyLocation": "Near Bus Stand",
          "post": "Rampur",
          "district": "Varanasi",
          "pincode": "221001"
        },
        "productDetails": {
          "imei1": "123456789012345",
          "imei2": "987654321098765",
          "phoneType": "NEW",
          "model": "Samsung Galaxy A14",
          "productName": "Samsung Galaxy A14 5G"
        },
        "emiInfo": {
          "nextDueDate": "2025-01-15T00:00:00.000Z",
          "nextDueAmount": 2500,
          "emiPerMonth": 2500,
          "balanceAmount": 15000
        },
        "deviceStatus": {
          "isLocked": true
        },
        "documents": {
          "customerPhoto": "https://res.cloudinary.com/xxx/customer_photo.jpg",
          "aadharFrontPhoto": "https://res.cloudinary.com/xxx/aadhar_front.jpg",
          "aadharBackPhoto": "https://res.cloudinary.com/xxx/aadhar_back.jpg",
          "signaturePhoto": "https://res.cloudinary.com/xxx/signature.jpg"
        },
        "assignedAt": "2025-12-20T10:30:00.000Z"
      },
      {
        "customerId": "507f1f77bcf86cd799439012",
        "fullName": "Priya Sharma",
        "mobileNumber": "9123456789",
        "aadharNumber": "987654321098",
        "dob": "1995-08-20T00:00:00.000Z",
        "fatherName": "Vijay Sharma",
        "address": {
          "village": "Sarnath",
          "nearbyLocation": "Temple Road",
          "post": "Sarnath",
          "district": "Varanasi",
          "pincode": "221007"
        },
        "productDetails": {
          "imei1": "111222333444555",
          "imei2": null,
          "phoneType": "OLD",
          "model": "Redmi Note 10",
          "productName": "Redmi Note 10 Pro"
        },
        "emiInfo": {
          "nextDueDate": "2025-01-10T00:00:00.000Z",
          "nextDueAmount": 1800,
          "emiPerMonth": 1800,
          "balanceAmount": 7200
        },
        "deviceStatus": {
          "isLocked": false
        },
        "documents": {
          "customerPhoto": "https://res.cloudinary.com/xxx/customer_photo2.jpg",
          "aadharFrontPhoto": "https://res.cloudinary.com/xxx/aadhar_front2.jpg",
          "aadharBackPhoto": "https://res.cloudinary.com/xxx/aadhar_back2.jpg",
          "signaturePhoto": "https://res.cloudinary.com/xxx/signature2.jpg"
        },
        "assignedAt": "2025-12-19T14:20:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 87,
      "itemsPerPage": 20
    }
  }
}
```

### Response Fields Description

#### Customer Object

| Field | Type | Description |
|-------|------|-------------|
| customerId | String | Unique customer ID |
| fullName | String | Customer's full name |
| mobileNumber | String | Customer's 10-digit mobile number |
| aadharNumber | String | Customer's 12-digit Aadhar number |
| dob | Date | Customer's date of birth |
| fatherName | String | Customer's father's name |

#### Address Object

| Field | Type | Description |
|-------|------|-------------|
| village | String | Village name |
| nearbyLocation | String | Nearby landmark or location |
| post | String | Post office name |
| district | String | District name |
| pincode | String | 6-digit pincode |

#### Product Details Object

| Field | Type | Description |
|-------|------|-------------|
| imei1 | String | Primary IMEI number (15 digits) |
| imei2 | String/null | Secondary IMEI number (15 digits) or null |
| phoneType | String | Phone type: "NEW" or "OLD" |
| model | String | Phone model name |
| productName | String | Full product name |

#### EMI Info Object

| Field | Type | Description |
|-------|------|-------------|
| nextDueDate | Date/null | Next unpaid EMI due date, null if all paid |
| nextDueAmount | Number/null | Next unpaid EMI amount, null if all paid |
| emiPerMonth | Number | Monthly EMI amount |
| balanceAmount | Number | Remaining balance to be paid |

#### Device Status Object

| Field | Type | Description |
|-------|------|-------------|
| isLocked | Boolean | Whether the device is currently locked |

#### Documents Object

| Field | Type | Description |
|-------|------|-------------|
| customerPhoto | String | Cloudinary URL for customer photo |
| aadharFrontPhoto | String | Cloudinary URL for Aadhar front photo |
| aadharBackPhoto | String | Cloudinary URL for Aadhar back photo |
| signaturePhoto | String | Cloudinary URL for signature photo |

#### Pagination Object

| Field | Type | Description |
|-------|------|-------------|
| currentPage | Number | Current page number |
| totalPages | Number | Total number of pages |
| totalItems | Number | Total number of customers |
| itemsPerPage | Number | Number of items per page |

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
  "message": "Failed to fetch assigned customers",
  "error": "SERVER_ERROR"
}
```

---

## Usage Examples

### cURL Example

```bash
# Get first page of assigned customers
curl -X GET "http://localhost:5000/api/recovery-head/assigned-customers" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Get second page with 10 items per page
curl -X GET "http://localhost:5000/api/recovery-head/assigned-customers?page=2&limit=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Search for customers
curl -X GET "http://localhost:5000/api/recovery-head/assigned-customers?search=Rajesh" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### JavaScript (Fetch API) Example

```javascript
const getAssignedCustomers = async (page = 1, limit = 20, search = '') => {
  try {
    // Get token from localStorage
    const token = localStorage.getItem('recoveryHeadToken');
    
    if (!token) {
      console.error('No authentication token found');
      return null;
    }

    // Build query parameters
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    if (search) {
      params.append('search', search);
    }

    const response = await fetch(
      `http://localhost:5000/api/recovery-head/assigned-customers?${params}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    if (data.success) {
      console.log('✅ Customers fetched successfully');
      console.log(`Total customers: ${data.data.pagination.totalItems}`);
      console.log(`Current page: ${data.data.pagination.currentPage}/${data.data.pagination.totalPages}`);
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

// Usage examples
// Get first page
getAssignedCustomers();

// Get second page with 10 items
getAssignedCustomers(2, 10);

// Search for customers
getAssignedCustomers(1, 20, 'Rajesh');
```

---

### Axios Example

```javascript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/recovery-head';

// Create axios instance with auth header
const createAuthAxios = () => {
  const token = localStorage.getItem('recoveryHeadToken');
  
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
};

// Get assigned customers
const getAssignedCustomers = async (page = 1, limit = 20, search = '') => {
  try {
    const api = createAuthAxios();
    
    const response = await api.get('/assigned-customers', {
      params: { page, limit, search }
    });

    console.log('✅ Customers fetched successfully');
    console.log(`Total: ${response.data.data.pagination.totalItems} customers`);
    
    return response.data.data;
  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
    throw error;
  }
};

// Usage examples
// Get all customers (first page)
const fetchCustomers = async () => {
  const data = await getAssignedCustomers();
  console.log('Customers:', data.customers);
  console.log('Pagination:', data.pagination);
};

// Search customers
const searchCustomers = async (searchTerm) => {
  const data = await getAssignedCustomers(1, 20, searchTerm);
  console.log('Search results:', data.customers);
};

// Load more (pagination)
const loadMoreCustomers = async (currentPage) => {
  const nextPage = currentPage + 1;
  const data = await getAssignedCustomers(nextPage, 20);
  return data.customers;
};
```

---

## Frontend Integration Guide

### Step 1: Store Authentication Token

After successful login, store the JWT token:

```javascript
// After successful OTP verification
const handleLoginSuccess = (loginData) => {
  localStorage.setItem('recoveryHeadToken', loginData.token);
  localStorage.setItem('recoveryHeadData', JSON.stringify(loginData.recoveryHead));
};
```

### Step 2: Create API Service

Create a dedicated service for recovery head API calls:

```javascript
// services/recoveryHeadApi.js
class RecoveryHeadAPI {
  constructor() {
    this.baseURL = 'http://localhost:5000/api/recovery-head';
  }

  getAuthHeaders() {
    const token = localStorage.getItem('recoveryHeadToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  async getAssignedCustomers(page = 1, limit = 20, search = '') {
    const params = new URLSearchParams({ page, limit });
    if (search) params.append('search', search);

    const response = await fetch(
      `${this.baseURL}/assigned-customers?${params}`,
      { headers: this.getAuthHeaders() }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return await response.json();
  }
}

export default new RecoveryHeadAPI();
```

### Step 3: Use in Components

```javascript
import recoveryHeadAPI from './services/recoveryHeadApi';

// In your component
const CustomerListComponent = () => {
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const loadCustomers = async (page = 1, search = '') => {
    setLoading(true);
    try {
      const result = await recoveryHeadAPI.getAssignedCustomers(page, 20, search);
      setCustomers(result.data.customers);
      setPagination(result.data.pagination);
    } catch (error) {
      console.error('Failed to load customers:', error);
      alert('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  // Load customers on component mount
  useEffect(() => {
    loadCustomers();
  }, []);

  // Handle search
  const handleSearch = (term) => {
    setSearchTerm(term);
    setCurrentPage(1);
    loadCustomers(1, term);
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    loadCustomers(newPage, searchTerm);
  };

  return (
    <div>
      {/* Search bar */}
      <input
        type="text"
        placeholder="Search by name, mobile, or IMEI..."
        value={searchTerm}
        onChange={(e) => handleSearch(e.target.value)}
      />

      {/* Customer list */}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div>
          {customers.map(customer => (
            <div key={customer.customerId}>
              <h3>{customer.fullName}</h3>
              <p>Mobile: {customer.mobileNumber}</p>
              <p>IMEI: {customer.productDetails.imei1}</p>
              <p>Next Due: {customer.emiInfo.nextDueDate}</p>
              <p>Status: {customer.deviceStatus.isLocked ? 'Locked' : 'Unlocked'}</p>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div>
        <button 
          disabled={currentPage === 1}
          onClick={() => handlePageChange(currentPage - 1)}
        >
          Previous
        </button>
        <span>Page {pagination.currentPage} of {pagination.totalPages}</span>
        <button 
          disabled={currentPage === pagination.totalPages}
          onClick={() => handlePageChange(currentPage + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
};
```

---

## Important Notes

1. **Authentication Required**: All requests must include a valid JWT token in the Authorization header.

2. **Token Storage**: Store the JWT token securely (localStorage for web, secure storage for mobile apps).

3. **Pagination**: Default page size is 20. Maximum allowed is 100 items per page.

4. **Search**: Search works across customer name, mobile number, IMEI1, and IMEI2 fields.

5. **Date Format**: All dates are returned in ISO 8601 format (e.g., "2025-01-15T00:00:00.000Z").

6. **IMEI2**: Can be null if the device has only one IMEI number.

7. **Next Due Date**: Will be null if all EMIs are paid.

8. **Sorting**: Customers are sorted by assignment date (newest first).

9. **Document URLs**: All document URLs are Cloudinary URLs and can be directly used in `<img>` tags.

10. **Error Handling**: Always implement proper error handling for network failures and API errors.

---

## Testing Checklist

- [ ] Test with valid recovery head token
- [ ] Test with invalid/expired token (should return 401)
- [ ] Test with admin/retailer token (should return 403)
- [ ] Test pagination (first page, middle page, last page)
- [ ] Test with different page sizes (10, 20, 50)
- [ ] Test search functionality with various terms
- [ ] Test with recovery head that has no assigned customers
- [ ] Verify all customer fields are returned correctly
- [ ] Verify IMEI numbers are displayed properly
- [ ] Verify next due date calculation is correct
- [ ] Verify document URLs are accessible
- [ ] Test with inactive recovery head account (should return 403)

---

## Support

For any issues or questions regarding this API, please contact the backend development team.
