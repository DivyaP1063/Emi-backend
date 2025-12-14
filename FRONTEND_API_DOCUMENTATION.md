# Frontend API Integration Documentation
## Admin Backend Server - Complete API Reference

**Version:** 1.0.0  
**Base URL:** `http://your-server-url` (e.g., `http://localhost:5000`)  
**Last Updated:** December 14, 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Admin APIs](#admin-apis)
4. [Retailer APIs](#retailer-apis)
5. [Data Models](#data-models)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)
8. [File Upload Guide](#file-upload-guide)
9. [Environment Configuration](#environment-configuration)

---

## Overview

This backend server provides APIs for:
- **Admin Panel**: Admin authentication, retailer management
- **Retailer App**: Retailer authentication, customer registration with device IMEI tracking

### Tech Stack
- **Runtime**: Node.js v22.12.0
- **Framework**: Express.js v4.18.2
- **Database**: MongoDB (Mongoose v8.0.3)
- **Authentication**: JWT (24-hour expiry)
- **OTP Service**: Twilio Verify API
- **File Storage**: Cloudinary
- **Security**: Helmet, CORS, Rate Limiting

---

## Authentication

### JWT Token Format
All protected routes require a Bearer token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Token Payload Structure
```json
{
  "id": "user_mongodb_id",
  "mobileNumber": "1234567890",
  "role": "ADMIN" | "RETAILER",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Token Expiry
- Default: **24 hours** from issuance
- After expiry, user must re-authenticate

---

## Admin APIs

Base Path: `/api/admin`

### 1. Health Check

**Endpoint:** `GET /api/admin/health`  
**Authentication:** None  
**Purpose:** Check if the admin API is running

**Response:**
```json
{
  "success": true,
  "message": "Admin API is running",
  "timestamp": "2025-12-14T10:30:00.000Z"
}
```

---

### 2. Admin Authentication

#### 2.1 Send OTP to Admin

**Endpoint:** `POST /api/admin/auth/send-otp`  
**Authentication:** None  
**Rate Limit:** 3 requests per 5 minutes per mobile number  
**Purpose:** Send 6-digit OTP to admin's registered mobile number via SMS

**Request Body:**
```json
{
  "mobileNumber": "1234567890"
}
```

**Validation Rules:**
- `mobileNumber`: Required, exactly 10 digits, numeric only

**Success Response (200):**
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

**Error Responses:**

**400 - Validation Error:**
```json
{
  "success": false,
  "message": "Invalid mobile number format",
  "error": "VALIDATION_ERROR",
  "details": [
    {
      "path": "mobileNumber",
      "msg": "Mobile number must be exactly 10 digits"
    }
  ]
}
```

**403 - Unauthorized:**
```json
{
  "success": false,
  "message": "This mobile number is not registered as admin",
  "error": "UNAUTHORIZED_ACCESS"
}
```

**429 - Rate Limit:**
```json
{
  "success": false,
  "message": "Too many OTP requests. Please try again later.",
  "error": "RATE_LIMIT_EXCEEDED"
}
```

---

#### 2.2 Verify OTP and Login

**Endpoint:** `POST /api/admin/auth/verify-otp`  
**Authentication:** None  
**Purpose:** Verify OTP and get JWT token for admin access

**Request Body:**
```json
{
  "mobileNumber": "1234567890",
  "otp": "123456"
}
```

**Validation Rules:**
- `mobileNumber`: Required, exactly 10 digits
- `otp`: Required, exactly 6 digits

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "admin": {
      "id": "6750abcd1234567890123456",
      "name": "Admin Name",
      "mobileNumber": "1234567890",
      "email": "admin@example.com"
    }
  }
}
```

**Error Responses:**

**401 - Invalid OTP:**
```json
{
  "success": false,
  "message": "Invalid or expired OTP",
  "error": "INVALID_OTP"
}
```

---

### 3. Retailer Management

#### 3.1 Create Retailer

**Endpoint:** `POST /api/admin/retailers`  
**Authentication:** Required (Admin only)  
**Purpose:** Create a new retailer account with permissions

**Request Headers:**
```
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "basicInfo": {
    "fullName": "Retailer Full Name",
    "email": "retailer@example.com",
    "mobileNumber": "9876543210",
    "shopName": "My Shop Name"
  },
  "address": {
    "country": "India",
    "state": "Maharashtra",
    "city": "Mumbai",
    "address": "Shop No. 123, Main Street, Area Name"
  },
  "permissions": {
    "canPayEmiDownPayment": true,
    "dpPending": false,
    "autoLockDay": 30,
    "serverAadharVerify": true,
    "allowElectronic": true,
    "allowIPhone": false,
    "allow8Month": true,
    "allow4Month": false
  }
}
```

**Field Descriptions:**

**basicInfo:**
- `fullName`: Retailer's full name (min 2 characters)
- `email`: Valid email address (must be unique)
- `mobileNumber`: Exactly 10 digits (must be unique)
- `shopName`: Shop/business name

**address:**
- `country`: Country name
- `state`: State name
- `city`: City name
- `address`: Complete shop address

**permissions:**
- `canPayEmiDownPayment`: Can retailer pay EMI on behalf of customers? (boolean)
- `dpPending`: Is down payment pending? (boolean)
- `autoLockDay`: Auto-lock account after N days of inactivity (integer, min 1)
- `serverAadharVerify`: Enable server-side Aadhar verification? (boolean)
- `allowElectronic`: Can sell electronic products? (boolean)
- `allowIPhone`: Can sell iPhone products? (boolean)
- `allow8Month`: Allow 8-month EMI plans? (boolean)
- `allow4Month`: Allow 4-month EMI plans? (boolean)

**Success Response (201):**
```json
{
  "success": true,
  "message": "Retailer created successfully",
  "data": {
    "retailerId": "6750abcd1234567890123456",
    "fullName": "Retailer Full Name",
    "email": "retailer@example.com",
    "mobileNumber": "9876543210",
    "shopName": "My Shop Name",
    "status": "ACTIVE",
    "createdAt": "2025-12-14T10:30:00.000Z"
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
  "details": {
    "basicInfo.fullName": "Full name is required",
    "basicInfo.email": "Invalid email format",
    "permissions.autoLockDay": "autoLockDay must be a positive integer"
  }
}
```

**401 - Unauthorized:**
```json
{
  "success": false,
  "message": "Authorization token not found",
  "error": "INVALID_TOKEN"
}
```

**409 - Duplicate Entry:**
```json
{
  "success": false,
  "message": "Retailer with this mobile number already exists",
  "error": "DUPLICATE_MOBILE"
}
```

or

```json
{
  "success": false,
  "message": "Retailer with this email already exists",
  "error": "DUPLICATE_EMAIL"
}
```

---

#### 3.2 Get All Retailers

**Endpoint:** `GET /api/admin/retailers`  
**Authentication:** Required (Admin only)  
**Purpose:** Get paginated list of all retailers with search and filter

**Request Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `search` (optional): Search by name, email, mobile, shop name
- `status` (optional): Filter by status (ACTIVE, INACTIVE, SUSPENDED)

**Example Request:**
```
GET /api/admin/retailers?page=1&limit=20&search=john&status=ACTIVE
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Retailers fetched successfully",
  "data": {
    "retailers": [
      {
        "_id": "6750abcd1234567890123456",
        "fullName": "John Doe",
        "email": "john@example.com",
        "mobileNumber": "9876543210",
        "shopName": "John's Electronics",
        "address": {
          "city": "Mumbai",
          "state": "Maharashtra"
        },
        "status": "ACTIVE",
        "createdAt": "2025-12-14T10:30:00.000Z"
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

## Retailer APIs

Base Path: `/api/retailer`

### 1. Retailer Authentication

#### 1.1 Send OTP to Retailer

**Endpoint:** `POST /api/retailer/auth/send-otp`  
**Authentication:** None  
**Rate Limit:** 3 requests per 5 minutes per mobile number  
**Purpose:** Send 6-digit OTP to retailer's registered mobile number

**Request Body:**
```json
{
  "mobileNumber": "9876543210"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "otpSent": true,
    "expiresIn": 300,
    "retailerExists": true
  }
}
```

**Error Responses:**

**403 - Not Registered:**
```json
{
  "success": false,
  "message": "This mobile number is not registered as retailer",
  "error": "UNAUTHORIZED_ACCESS"
}
```

---

#### 1.2 Verify OTP and Login

**Endpoint:** `POST /api/retailer/auth/verify-otp`  
**Authentication:** None  
**Purpose:** Verify OTP and get JWT token for retailer access

**Request Body:**
```json
{
  "mobileNumber": "9876543210",
  "otp": "123456"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "retailer": {
      "id": "6750abcd1234567890123456",
      "fullName": "Retailer Name",
      "mobileNumber": "9876543210",
      "email": "retailer@example.com",
      "shopName": "Shop Name"
    }
  }
}
```

---

### 2. Get Retailer Permissions

**Endpoint:** `GET /api/retailer/permissions`  
**Authentication:** Required (Retailer only)  
**Purpose:** Get current retailer's permissions and allowed EMI months

**Request Headers:**
```
Authorization: Bearer <retailer_jwt_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Permissions fetched successfully",
  "data": {
    "retailerId": "6750abcd1234567890123456",
    "permissions": {
      "canPayEmiDownPayment": true,
      "dpPending": false,
      "autoLockDay": 30,
      "serverAadharVerify": true,
      "allowElectronic": true,
      "allowIPhone": false,
      "allow8Month": true,
      "allow4Month": false
    },
    "allowedEmiMonths": [8]
  }
}
```

**Usage:**
- Check `allowedEmiMonths` array to show EMI options (e.g., [4, 8])
- Use permission flags to enable/disable features in the app

---

### 3. Customer Registration (4-Step Form, 3 APIs)

This is a **4-step form flow** with 3 API calls. The frontend collects data across 4 steps, validates the mobile number in step 2, and submits everything in the final step.

#### Flow Overview:
- **Step 1 (Frontend)**: Collect basic details (fullName, aadharNumber, dob, pincode, imei1, imei2)
- **Step 2 (API 1 & 2)**: Send OTP → Customer enters OTP → Verify OTP → Proceed if verified
- **Step 3 (Frontend)**: Collect address details (fatherName, village, nearbyLocation, post, district)
- **Step 4 (API 3)**: Upload 4 documents + Submit all data → Customer created

---

#### 3.1 Step 2a: Send OTP to Customer Mobile

**Endpoint:** `POST /api/retailer/customers/send-otp`  
**Authentication:** Required (Retailer only)  
**Rate Limit:** 3 requests per 5 minutes per mobile number  
**Purpose:** Send OTP to customer's mobile number for verification

**Request Headers:**
```
Authorization: Bearer <retailer_jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "mobileNumber": "9876543210"
}
```

**Field Details:**
- `mobileNumber`: Exactly 10 digits (required)

**What This API Does:**
1. Validates mobile number format
2. Sends 6-digit OTP via Twilio SMS to +91{mobileNumber}
3. OTP is valid for 5 minutes (configurable)

**Success Response (200):**
```json
{
  "success": true,
  "message": "OTP sent successfully to +919876543210"
}
```

**Error Responses:**

**429 - Rate Limit:**
```json
{
  "success": false,
  "message": "Too many OTP requests. Please try again later.",
  "error": "RATE_LIMIT_EXCEEDED"
}
```

**Frontend Action:**
- Show OTP input screen
- Start countdown timer (5 minutes)
- Allow resend after 1 minute

---

#### 3.2 Step 2b: Verify Customer Mobile OTP

**Endpoint:** `POST /api/retailer/customers/verify-otp`  
**Authentication:** Required (Retailer only)  
**Purpose:** Verify OTP and mark mobile as verified (MUST succeed before proceeding to Step 3)

**Request Headers:**
```
Authorization: Bearer <retailer_jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "mobileNumber": "9876543210",
  "otp": "123456"
}
```

**Field Details:**
- `mobileNumber`: Exactly 10 digits (required)
- `otp`: Exactly 6 digits (required)

**What This API Does:**
1. Validates mobile number and OTP format
2. Verifies OTP with Twilio Verify service
3. Returns success if OTP is valid and not expired
4. Frontend enables "Next" button to proceed to Step 3

**Success Response (200):**
```json
{
  "success": true,
  "message": "Mobile number verified successfully. You can proceed to next step.",
  "data": {
    "mobileNumber": "9876543210",
    "verified": true
  }
}
```

**Error Response (400 - Invalid OTP):**
```json
{
  "success": false,
  "message": "Invalid or expired OTP",
  "error": "INVALID_OTP"
}
```

**Frontend Action:**
- ✅ If success: Enable "Next" button, proceed to Step 3 (address details)
- ❌ If error: Show error message, allow retry (don't proceed to next step)

---

#### 3.3 Step 4: Create Customer with All Data

**Endpoint:** `POST /api/retailer/customers
{
  "success": false,
  "message": "No files uploaded",
  "error": "NO_FILES"
}
```

**400 - Missing Documents:**
```json
{
  "success": false,
  "message": "All documents are required: customerPhoto, aadharFront, aadharBack, signature",
  "error": "MISSING_DOCUMENTS",
  "debug": {
    "receivedFiles": ["customerPhoto", "aadharFront"]
  }
}
```

**400 - Missing Fields:**
```json
{
  "success": false,
  "message": Create customer with all details, IMEI, OTP verification, and document uploads in a single API call

**Request Headers:**
```
Authorization: Bearer <retailer_jwt_token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**

**Text Fields (17 fields):**
```
fullName: "Customer Full Name"
aadharNumber: "123456789012"
dob: "1995-05-15"
pincode: "400001"
imei1: "123456789012345"
imei2: "987654321098765"
mobileNumber: "9876543210"
otp: "123456step1Data.imei2);
formData.append('mobileNumber', step2Data.mobileNumber);
formData.append('fatherName', step3Data.fatherName);
formData.append('village', step3Data.village);
formData.append('nearbyLocation', step3Data.nearbyLocation);
formData.append('post', step3Data.post);
formData.append('district', step3Data.district);

// Add image files
formData.append('customerPhoto', customerPhotoFile);
formData.append('aadharFront', aadharFrontFile);
formData.append('aadharBack', aadharBackFile);
formData.append('signature', signatureFile);

// Send request
const response = await fetch('http://your-server/api/retailer/products/submit', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${retailerToken}`
    // DO NOT set Content-Type - browser will set it automatically with boundary
  },
  body: formData7 text fields (including OTP)
2. Verifies OTP with Twilio
3. Checks for duplicate IMEI1, IMEI2, and Aadhar
4. Validates all 4 image files are present
5. Uploads images to Cloudinary (4 parallel uploads)
6. Creates customer record in database with:
   - All customer details
   - IMEI1 and IMEI2 (associated with customer)
   - Document URLs from Cloudinary
   - Retailer ID (from JWT token)
   - Mobile verified status (true)
7*Endpoint:** `GET /api/retailer/customers`  
**Authentication:** Required (Retailer only)  
**Purpose:** Get paginated list of all customers registered by the retailer

**Request Headers:**
```
Authorization: Bearer <retailer_jwt_token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `search` (optional): Search by name, mobile, Aadhar, IMEI

**Example Request:**
```
GET /api/retailer/customers?page=1&limit=20&search=john
```

**What This API Does:**
1. Fetches all customers registered by the logged-in retailer
2. Supports pagination (20 customers per page by default)
3. Supports search across name, mobile, Aadhar, IMEI fields
4. Excludes document URLs for faster response (use customer detail API for documents)
5. Sorted by most recent first

**Success Response (200):**
```json
{
  "success": true,
  "message": "Customers fetched successfully",
  "data": {
    "customers": [
      {
        "id": "6750abcd1234567890123456",
        "fullName": "John Doe",
        "mobileNumber": "9876543210",
        "aadharNumber": "123456789012",
        "dob": "1995-05-15T00:00:00.000Z",
        "imei1": "123456789012345",
        "imei2": "987654321098765",
        "fatherName": "Father Name",
        "address": {
          "village": "Village Name",
          "nearbyLocation": "Nearby Location",
          "post": "Post Office",
          "district": "District Name",
          "pincode": "400001"
        },
        "mobileVerified": true,
        "createdAt": "2025-12-14T10:30:00.000Z"
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

**Usage:**
- Error Responses:**

**400 - Validation Error:**
```json
{
  "success": false,
  "message": "Validation failed",
  "error": "VALIDATION_ERROR",
  "details": {
    "fullName": "Full name is required",
    "imei1": "IMEI 1 must be exactly 15 digits",
    "otp": "OTP must be exactly 6 digits"
  }
}
```

**400 - Invalid OTP:**
```json
{
  "success": false,
  "message": "Invalid or expired OTP",
  "error": "INVALID_OTP"
}
```

**400 - Duplicate IMEI/Aadhar:**
```json
{
  "success": false,
  "message": "IMEI 1 already exists in the system",
  "error": "DUPLICATE_IMEI1"
}
```

**Frontend Implementation Guide:**

```javascript
// Step 1: Send OTP first
const sendOTP = async () => {
  const response = await fetch('http://your-server/api/retailer/customers/send-otp', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${retailerToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      mobileNumber: customerData.mobileNumber
    })
  });
};

// Step 2: After customer enters OTP, create customer with all data
const createCustomer = async (otp) => {
  const formData = new FormData();

  // Add all text fields
  formData.append('fullName', customerData.fullName);
  formData.append('aadharNumber', customerData.aadharNumber);
  formData.append('dob', customerData.dob);
  formData.append('pincode', customerData.pincode);
  formData.append('imei1', customerData.imei1);
  formData.append('imei2', customerData.imei2);
  formData.append('mobileNumber', customerData.mobileNumber);
  formData.append('otp', otp); // Customer's OTP input
  formData.append('fatherName', customerData.fatherName);
  formData.append('village', customerData.village);
  formData.append('nearbyLocation', customerData.nearbyLocation);
  formData.append('post', customerData.post);
  formData.append('district', customerData.district);

  // Add image files
  formData.append('customerPhoto', customerPhotoFile);
  formData.append('aadharFront', aadharFrontFile);
  formData.append('aadharBack', aadharBackFile);
  formData.append('signature', signatureFile);

  // Send request
  const response = await fetch('http://your-server/api/retailer/customers', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${retailerToken}`
      // DO NOT set Content-Type - browser will set it automatically with boundary
    },
    body: formData
  });

  const data = await response.json();
  
  if (data.success) {
    // Customer created successfully
    console.log('Customer ID:', data.data.customerId);
  } else {
    // Handle error
    alert(data.message);
  }
} Data Models

### Customer Model
```javascript
{
  _id: ObjectId,
  fullName: String,              // Customer's full name
  aadharNumber: String,          // 12 digits, unique
  dob: Date,                     // Date of birth
  mobileNumber: String,          // 10 digits
  mobileVerified: Boolean,       // OTP verification status
  imei1: String,                 // 15 digits, unique, required
  imei2: String,                 // 15 digits, unique, optional
  fatherName: String,            // Father's name
  address: {
    village: String,
    nearbyLocation: String,
    post: String,
    district: String,
    pincode: String              // 6 digits
  },
  documents: {
    customerPhoto: String,       // Cloudinary URL
    aadharFrontPhoto: String,    // Cloudinary URL
    aadharBackPhoto: String,     // Cloudinary URL
    signaturePhoto: String       // Cloudinary URL
  },
  retailerId: ObjectId,          // Reference to Retailer
  createdAt: Date,
  updatedAt: Date
}
```

### Retailer Model
```javascript
{
  _id: ObjectId,
  fullName: String,
  email: String,                 // Unique
  mobileNumber: String,          // 10 digits, unique
  shopName: String,
  address: {
    country: String,
    state: String,
    city: String,
    address: String
  },
  permissions: {
    canPayEmiDownPayment: Boolean,
    dpPending: Boolean,
    autoLockDay: Number,
    serverAadharVerify: Boolean,
    allowElectronic: Boolean,
    allowIPhone: Boolean,
    allow8Month: Boolean,
    allow4Month: Boolean
  },
  status: String,                // ACTIVE, INACTIVE, SUSPENDED
  createdAt: Date,
  updatedAt: Date
}
```

### Admin Model
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,                 // Unique
  mobileNumber: String,          // 10 digits, unique
  isActive: Boolean,
  role: String,                  // ADMIN
  createdAt: Date,
  updatedAt: Date
}
```

---

## Error Handling

### Standard Error Response Format
```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "ERROR_CODE",
  "details": {} // Optional additional details
}
```

### Common Error Codes

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `INVALID_TOKEN` | 401 | JWT token missing, invalid, or expired |
| `UNAUTHORIZED_ACCESS` | 401/403 | User not authorized for this action |
| `FORBIDDEN` | 403 | Role mismatch (e.g., retailer trying admin endpoint) |
| `NOT_FOUND` | 404 | Resource not found |
| `DUPLICATE_MOBILE` | 409 | Mobile number already exists |
| `DUPLICATE_EMAIL` | 409 | Email already exists |
| `DUPLICATE_AADHAR` | 400 | Aadhar number already exists |
| `DUPLICATE_IMEI1` | 400 | IMEI 1 already exists |
| `DUPLICATE_IMEI2` | 400 | IMEI 2 already exists |
| `INVALID_OTP` | 401 | OTP is incorrect or expired |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `NO_FILES` | 400 | No files uploaded |
| `MISSING_DOCUMENTS` | 400 | Required documents missing |
| `SERVER_ERROR` | 500 | Internal server error |

### Frontend Error Handling Pattern

```javascript
try {
  const response = await fetch(url, options);
  const data = await response.json();
  
  if (!response.ok) {
    // Handle specific error codes
    switch(data.error) {
      case 'INVALID_TOKEN':
        // Redirect to login
        break;
      case 'DUPLICATE_MOBILE':
        // Show "Mobile already registered" message
        break;
      case 'RATE_LIMIT_EXCEEDED':
        // Show "Too many attempts, try later" message
        break;
      default:
        // Show generic error
        alert(data.message);
    }
    return;
  }
  
  // Success handling
  console.log(data.data);
} catch (error) {
  // Network error
  alert('Network error. Please check your connection.');
}
```

---

## Rate Limiting

### OTP Rate Limiting
- **Limit**: 3 requests per 5 minutes
- **Applied to**:
  - `POST /api/admin/auth/send-otp`
  - `POST /api/retailer/auth/send-otp`
  - `POST /api/retailer/products/step2/send-otp`
- **Key**: Mobile number (not IP)
- **Response**: 429 status with `RATE_LIMIT_EXCEEDED` error

### General API Rate Limiting
- **Limit**: 100 requests per 15 minutes
- **Applied to**: All API endpoints
- **Key**: IP address
- **Response**: 429 status with `RATE_LIMIT_EXCEEDED` error

### Frontend Handling
```javascript
// Store last OTP request time
const lastOtpTime = localStorage.getItem('lastOtpTime');
const now = Date.now();

if (lastOtpTime && (now - lastOtpTime) < 60000) {
  // Less than 1 minute since last request
  const waitTime = 60 - Math.floor((now - lastOtpTime) / 1000);
  alert(`Please wait ${waitTime} seconds before requesting OTP again`);
  return;
}

// Send OTP request
await sendOtp();
localStorage.setItem('lastOtpTime', now);
```

---

## File Upload Guide

### Supported Formats
- **Images**: JPG, JPEG, PNG
- **Max Size**: 5MB per file
- **Storage**: Cloudinary

### Upload Process

1. **User selects image** (camera or gallery)
2. **Frontend validates** file size and format
3. **Create FormData** and append file
4. **Send multipart/form-data** request
5. **Backend validates** file type and size
6. **Multer processes** file to memory buffer
7. **Cloudinary uploads** from buffer
8. **URL returned** and saved in database

### Frontend Example (React Native)

```javascript
import * as ImagePicker from 'expo-image-picker';

// Pick image
const pickImage = async (fieldName) => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.8,
    base64: false
  });

  if (!result.canceled) {
    // Validate size
    const fileSize = result.assets[0].fileSize;
    if (fileSize > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    // Store for upload
    setImages(prev => ({
      ...prev,
      [fieldName]: result.assets[0]
    }));
  }
};

// Submit with all images
const submitCustomer = async () => {
  const formData = new FormData();
  
  // Add text fields
  formData.append('fullName', customerData.fullName);
  // ... add all other fields
  
  // Add images
  formData.append('customerPhoto', {
    uri: images.customerPhoto.uri,
    type: 'image/jpeg',
    name: 'customer_photo.jpg'
  });
  
  formData.append('aadharFront', {
    uri: images.aadharFront.uri,
    type: 'image/jpeg',
    name: 'aadhar_front.jpg'
  });
  
  formData.append('aadharBack', {
    uri: images.aadharBack.uri,
    type: 'image/jpeg',
    name: 'aadhar_back.jpg'
  });
  
  formData.append('signature', {
    uri: images.signature.uri,
    type: 'image/jpeg',
    name: 'signature.jpg'
  });

  const response = await fetch('http://your-server/api/retailer/products/submit', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      // No Content-Type header - FormData sets it automatically
    },
    body: formData
  });
  
  const data = await response.json();
  // Handle response
};
```

### Image Compression Recommendations

Before uploading, compress images to reduce upload time:

```javascript
import * as ImageManipulator from 'expo-image-manipulator';

const compressImage = async (uri) => {
  const manipResult = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1024 } }], // Resize to max width 1024px
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  );
  return manipResult.uri;
};
```END_OTP: '/api/retailer/customers/send-otp',
    CUSTOMER_CREATE: '/api/retailer/customers',
    CUSTOMER_LIST: '/api/retailer/customers

### Required Environment Variables

Create a `.env` file in your backend:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# JWT
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
JWT_EXPIRES_IN=24h

# Twilio (for OTP)
SMS_ENABLED=true
SMS_PROVIDER=TWILIO_VERIFY
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_VERIFY_SERVICE_SID=your_verify_service_sid

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# OTP Settings
OTP_EXPIRY_MINUTES=5
OTP_MAX_ATTEMPTS=3

# Rate Limiting
RATE_LIMIT_WINDOW_MS=300000
RATE_LIMIT_MAX_REQUESTS=3
```

### Frontend Configuration

Store these in your frontend config:

```javascript
// config.js
export const API_CONFIG = {
  BASE_URL: 'http://your-server-url:5000',
  ENDPOINTS: {
    // Admin
    ADMIN_SEND_OTP: '/api/admin/auth/send-otp',
    ADMIN_VERIFY_OTP: '/api/admin/auth/verify-otp',
    CREATE_RETAILER: '/api/admin/retailers',
    GET_RETAILERS: '/api/admin/retailers',
    
    // Retailer
    RETAILER_SEND_OTP: '/api/retailer/auth/send-otp',
1. Retailer collects all customer data in the app:
   - fullName, aadharNumber, dob, pincode
   - imei1, imei2 (device IMEI numbers)
   - fatherName, village, nearbyLocation, post, district
   - 4 document photos (customer, aadhar front/back, signature)
   ↓
2. Retailer enters customer's mobile number
   ↓
3. POST /api/retailer/customers/send-otp
   ↓
4. Customer receives SMS with 6-digit OTP
   ↓
5. Customer tells OTP to retailer
   ↓
6. Retailer enters OTP in the app
   ↓
7. POST /api/retailer/customers (with all data + OTP + 4 files)
   ↓
8. Backend verifies OTP with Twilio
   ↓
9. Backend checks duplicate IMEI/Aadhar
   ↓
10. Backend uploads 4 images to Cloudinary
    ↓
11. Backend creates customer record with IMEI
    ↓
12. Success - customer registered with device
   ↓
2. POST /api/retailer/auth/send-otp
   ↓
3. Retailer receives SMS with OTP
   ↓
4. Retailer enters OTP
   ↓
5. POST /api/retailer/auth/verify-otp
   ↓
6. Store JWT token
   ↓
7. GET /api/retailer/permissions (optional)
   ↓
8. Start customer registration
```

### Customer Registration Flow (Retailer App)

```
STEP 1: Basic Details
--------------------
1. Collect: fullName, aadharNumber, dob, pincode, imei1, imei2
   ↓
2. POST /api/retailer/products/step1
   ↓
3. If validation passes, store data and proceed
   ↓

STEP 2: Mobile Verification
---------------------------
4. Collect: mobileNumber
   ↓
5. POST /api/retailer/products/step2/send-otp
   ↓
6. Customer receives SMS with OTP
   ↓
7. Collect: OTP
   ↓
8. POST /api/retailer/products/step2/verify-otp
   ↓
9. If OTP valid, store mobile and proceed
   ↓

STEP 3: Address Details
-----------------------
10. Collect: fatherName, village, nearbyLocation, post, district
    ↓
11. POST /api/retailer/products/step3
    ↓
12. If validation passes, store data and proceed
    ↓

STEP 4: Document Upload
-----------------------
13. Collect: customerPhoto, aadharFront, aadharBack, signature
    ↓
14. Create FormData with ALL data from steps 1-4
    ↓
15. POST /api/retailer/products/submit
    ↓end OTP: POST `{{base_url}}/api/retailer/customers/send-otp`
     - Body (JSON): `{ "mobileNumber": "9876543210" }`
   - Create Customer: POST `{{base_url}}/api/retailer/customers`
     - Use form-data (not JSON)
     - Add all 17 text fields (including otp)
     - Add 4 image files
   - List Customers: GET `{{base_url}}/api/retailer/customers?page=1&limit=20`
---

## Testing Guide

### Using Postman

1. **Import Environment**
   ```json
   {
     "name": "Admin Backend",
     "values": [
       { "key": "base_url", "value": "http://localhost:5000" },
       { "key": "admin_token", "value": "" },
       { "key": "retailer_token", "value": "" }
     ]
   }
   ```

2. **Test Admin Login**
   - Send OTP: POST `{{base_url}}/api/admin/auth/send-otp`
   - Verify OTP: POST `{{base_url}}/api/admin/auth/verify-otp`
   - Copy token from response
   - Set `admin_token` variable

3. **Test Retailer Creation**
   - POST `{{base_url}}/api/admin/retailers`
   - Header: `Authorization: Bearer {{admin_token}}`
   - Body: JSON with retailer data

4. **Test Retailer Login**
   - Send OTP: POST `{{base_url}}/api/retailer/auth/send-otp`
   - Verify OTP: POST `{{base_url}}/api/retailer/auth/verify-otp`
   - Copy token and set `retailer_token`

5. **Test Customer Registration**
   - Step 1: POST `{{base_url}}/api/retailer/products/step1`
   - Step 2a: POST `{{base_url}}/api/retailer/products/step2/send-otp`
   - Step 2b: POST `{{base_url}}/api/retailer/products/step2/verify-otp`
   - Step 3: POST `{{base_url}}/api/retailer/products/step3`
   - Step 4: POST `{{base_url}}/api/retailer/products/submit`
     - Use form-data (not JSON)
     - Add all text fields
     - Add 4 image files

---

## Support & Contact

For backend issues or questions:
- Check error codes and messages first
- Verify JWT token is valid and not expired
- Ensure all required fields are sent
- Check file sizes and formats for uploads
- Verify mobile numbers are exactly 10 digits
- Ensure Aadhar numbers are exactly 12 digits
- Ensure IMEI numbers are exactly 15 digits

**Common Issues:**

1. **401 Unauthorized**: Token expired or invalid - user must re-login
2. **429 Too Many Requests**: Wait 5 minutes before retrying OTP
3. **400 Validation Error**: Check request body matches documentation exactly
4. **500 Server Error**: Check server logs, contact backend team

---

**End of Documentation**
