# Recovery Person Device Collection API Documentation

## Overview

This document describes the Device Collection API for recovery persons. When a recovery person collects a device from a customer, they must record the collection details including device images, PIN, and payment deadline.

---

## API Endpoint

### Collect Device from Customer

Record device collection with images, PIN, and payment deadline.

**Endpoint:** `POST /api/recovery-person/collect-device`

**Authentication:** Required (Recovery Person JWT token)

**Content-Type:** `multipart/form-data`

**Headers:**
```
Authorization: Bearer <recovery_person_jwt_token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `customerId` | String | Yes | Customer MongoDB ObjectId (24 hex characters) |
| `deviceFrontImage` | File | Yes | Image file of device front (JPEG, PNG, etc.) |
| `deviceBackImage` | File | Yes | Image file of device back (JPEG, PNG, etc.) |
| `devicePin` | String | Yes | Device unlock PIN |
| `paymentDeadline` | String | Yes | ISO 8601 date format (e.g., "2025-12-31T23:59:59.000Z") |
| `notes` | String | No | Additional notes about collection |

**Field Validations:**
- `customerId`: Required, valid MongoDB ObjectId (24 hex characters)
- `deviceFrontImage`: Required, image file (max 5MB)
- `deviceBackImage`: Required, image file (max 5MB)
- `devicePin`: Required, string (device unlock PIN)
- `paymentDeadline`: Required, ISO 8601 date format
- `notes`: Optional, string (additional notes about collection)

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Device collected successfully",
  "data": {
    "customerId": "507f1f77bcf86cd799439022",
    "customerName": "Jane Smith",
    "isCollected": true,
    "collectedAt": "2025-12-26T01:00:00.000Z",
    "deviceCollection": {
      "deviceFrontImage": "https://res.cloudinary.com/xxx/image/upload/v123/device_front.jpg",
      "deviceBackImage": "https://res.cloudinary.com/xxx/image/upload/v123/device_back.jpg",
      "devicePin": "1234",
      "paymentDeadline": "2025-12-31T23:59:59.000Z",
      "collectedBy": "507f1f77bcf86cd799439011",
      "collectedByName": "John Doe",
      "notes": "Customer agreed to pay by end of month or device will be sold"
    }
  }
}
```

**Error Responses:**

**400 Bad Request - No Files Uploaded:**
```json
{
  "success": false,
  "message": "No files uploaded",
  "error": "NO_FILES"
}
```

**400 Bad Request - Missing Images:**
```json
{
  "success": false,
  "message": "Both device front and back images are required",
  "error": "MISSING_IMAGES",
  "debug": {
    "receivedFiles": ["deviceFrontImage"]
  }
}
```

**400 Bad Request - Validation Error:**
```json
{
  "success": false,
  "message": "Validation failed",
  "error": "VALIDATION_ERROR",
  "details": [
    {
      "msg": "Device PIN is required",
      "param": "devicePin",
      "location": "body"
    }
  ]
}
```

**404 Not Found - Customer Not Assigned:**
```json
{
  "success": false,
  "message": "Customer not found or not assigned to you",
  "error": "CUSTOMER_NOT_FOUND"
}
```

**409 Conflict - Device Already Collected:**
```json
{
  "success": false,
  "message": "Device has already been collected",
  "error": "DEVICE_ALREADY_COLLECTED",
  "data": {
    "collectedAt": "2025-12-25T10:00:00.000Z",
    "collectedBy": "Another Person"
  }
}
```

**Example cURL:**
```bash
curl -X POST http://localhost:5000/api/recovery-person/collect-device \
  -H "Authorization: Bearer <recovery_person_token>" \
  -F "customerId=507f1f77bcf86cd799439022" \
  -F "deviceFrontImage=@/path/to/front_image.jpg" \
  -F "deviceBackImage=@/path/to/back_image.jpg" \
  -F "devicePin=1234" \
  -F "paymentDeadline=2025-12-31T23:59:59.000Z" \
  -F "notes=Customer agreed to pay by end of month"
```

---

## Updated Recovery Head API

### Get Recovery Persons with Customers (Updated)

The existing endpoint now includes recovery task completion status.

**Endpoint:** `GET /api/recovery-head/recovery-persons-with-customers`

**New Response Fields:**
- `collectedCount`: Number of customers whose devices have been collected
- `isRecoveryTaskDone`: Boolean indicating if all assigned customers' devices are collected
- `customers[].isCollected`: Boolean for each customer's collection status

**Updated Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Recovery persons with customers fetched successfully",
  "data": {
    "recoveryPersons": [
      {
        "recoveryPersonId": "507f1f77bcf86cd799439011",
        "fullName": "John Doe",
        "mobileNumber": "9876543210",
        "aadharNumber": "123456789012",
        "isActive": true,
        "customersCount": 3,
        "collectedCount": 2,
        "isRecoveryTaskDone": false,
        "customers": [
          {
            "customerId": "507f1f77bcf86cd799439022",
            "fullName": "Jane Smith",
            "mobileNumber": "9123456789",
            "pincode": "123456",
            "balanceAmount": 15000,
            "isLocked": true,
            "isCollected": true
          },
          {
            "customerId": "507f1f77bcf86cd799439023",
            "fullName": "Bob Johnson",
            "mobileNumber": "9234567890",
            "pincode": "123456",
            "balanceAmount": 8000,
            "isLocked": false,
            "isCollected": true
          },
          {
            "customerId": "507f1f77bcf86cd799439024",
            "fullName": "Alice Brown",
            "mobileNumber": "9345678901",
            "pincode": "654321",
            "balanceAmount": 12000,
            "isLocked": true,
            "isCollected": false
          }
        ]
      },
      {
        "recoveryPersonId": "507f1f77bcf86cd799439012",
        "fullName": "Alice Brown",
        "mobileNumber": "9345678901",
        "aadharNumber": "987654321098",
        "isActive": true,
        "customersCount": 2,
        "collectedCount": 2,
        "isRecoveryTaskDone": true,
        "customers": [
          {
            "customerId": "507f1f77bcf86cd799439025",
            "fullName": "Charlie Wilson",
            "mobileNumber": "9456789012",
            "pincode": "111111",
            "balanceAmount": 10000,
            "isLocked": true,
            "isCollected": true
          },
          {
            "customerId": "507f1f77bcf86cd799439026",
            "fullName": "David Lee",
            "mobileNumber": "9567890123",
            "pincode": "222222",
            "balanceAmount": 5000,
            "isLocked": false,
            "isCollected": true
          }
        ]
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 2,
      "itemsPerPage": 10
    }
  }
}
```

---

## Complete Workflow

### Device Collection Process

**Frontend Implementation (Flutter/Dart Example):**

```dart
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

Future<void> collectDevice({
  required String token,
  required String customerId,
  required File frontImageFile,
  required File backImageFile,
  required String devicePin,
  required DateTime paymentDeadline,
  String? notes,
}) async {
  // Create multipart request
  var request = http.MultipartRequest(
    'POST',
    Uri.parse('http://localhost:5000/api/recovery-person/collect-device'),
  );

  // Add headers
  request.headers['Authorization'] = 'Bearer $token';

  // Add form fields
  request.fields['customerId'] = customerId;
  request.fields['devicePin'] = devicePin;
  request.fields['paymentDeadline'] = paymentDeadline.toIso8601String();
  if (notes != null) {
    request.fields['notes'] = notes;
  }

  // Add image files
  request.files.add(
    await http.MultipartFile.fromPath(
      'deviceFrontImage',
      frontImageFile.path,
      contentType: MediaType('image', 'jpeg'),
    ),
  );

  request.files.add(
    await http.MultipartFile.fromPath(
      'deviceBackImage',
      backImageFile.path,
      contentType: MediaType('image', 'jpeg'),
    ),
  );

  // Send request
  var response = await request.send();
  var responseBody = await response.stream.bytesToString();

  if (response.statusCode == 200) {
    print('Device collected successfully');
    print(responseBody);
  } else {
    print('Error: ${response.statusCode}');
    print(responseBody);
  }
}
```

**JavaScript Example:**

```javascript
// Step 1: Recovery person logs in
const recoveryPersonToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

// Step 2: Recovery person visits customer and collects device
// They take photos of device front and back using camera
const frontImageFile = document.getElementById('frontImage').files[0];
const backImageFile = document.getElementById('backImage').files[0];

// Step 3: Get device PIN from customer
const devicePin = "1234";

// Step 4: Discuss payment deadline with customer
const paymentDeadline = "2025-12-31T23:59:59.000Z";

// Step 5: Record device collection
const formData = new FormData();
formData.append('customerId', '507f1f77bcf86cd799439022');
formData.append('deviceFrontImage', frontImageFile);
formData.append('deviceBackImage', backImageFile);
formData.append('devicePin', devicePin);
formData.append('paymentDeadline', paymentDeadline);
formData.append('notes', 'Customer agreed to pay by deadline or device will be sold');

const collectResponse = await fetch(
  'http://localhost:5000/api/recovery-person/collect-device',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${recoveryPersonToken}`
    },
    body: formData
  }
);

const collectResult = await collectResponse.json();
console.log(collectResult);
// Device collected successfully

// Step 6: Recovery head can now see updated status
const recoveryHeadToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
const statusResponse = await fetch(
  'http://localhost:5000/api/recovery-head/recovery-persons-with-customers',
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${recoveryHeadToken}`
    }
  }
);

const statusData = await statusResponse.json();
console.log(statusData);
// Shows isRecoveryTaskDone status for each recovery person
```

---

## Business Logic

### Device Collection Rules

1. **Assignment Verification**: Recovery person can only collect devices from customers assigned to them
2. **One-Time Collection**: Device can only be collected once (prevents duplicate collections)
3. **Required Information**: All fields except notes are mandatory
4. **Image Upload**: Images are uploaded as files and automatically stored in Cloudinary
5. **Payment Deadline**: Date when customer must pay or device will be sold
6. **Automatic Status Update**: Customer's `isCollected` flag is set to true automatically

### Recovery Task Completion

**isRecoveryTaskDone Logic:**
- `true`: All assigned customers' devices have been collected
- `false`: At least one customer's device is not yet collected
- Helps recovery head track progress of recovery persons

### Data Stored

**Customer Model - deviceCollection Object:**
```javascript
{
  deviceFrontImage: String,      // Cloudinary URL (auto-uploaded)
  deviceBackImage: String,       // Cloudinary URL (auto-uploaded)
  devicePin: String,             // Device unlock PIN
  paymentDeadline: Date,         // Deadline for customer to pay
  collectedBy: ObjectId,         // Recovery person who collected
  collectedByName: String,       // Recovery person name
  notes: String                  // Additional notes
}
```

---

## Image Upload Details

### Server-Side Processing

1. **Frontend**: Sends actual image files via multipart/form-data
2. **Backend**: Receives files, validates them, uploads to Cloudinary
3. **Storage**: Cloudinary URLs are stored in database
4. **Response**: Returns complete collection data with Cloudinary URLs

### File Specifications

- **Allowed Formats**: JPEG, PNG, GIF, WebP (any image format)
- **Max File Size**: 5MB per image
- **Total Files**: 2 images required (front and back)
- **Storage Location**: Cloudinary folders:
  - Front images: `device-collection/front/`
  - Back images: `device-collection/back/`

### Benefits of Server-Side Upload

1. **Security**: No Cloudinary credentials exposed to frontend
2. **Validation**: Server validates files before upload
3. **Consistency**: Centralized upload logic
4. **Error Handling**: Better error messages and logging
5. **Simplicity**: Frontend just sends files, no Cloudinary SDK needed

---

## Error Codes Reference

| Error Code | Description |
|------------|-------------|
| `NO_FILES` | No files were uploaded in the request |
| `MISSING_IMAGES` | One or both device images are missing |
| `VALIDATION_ERROR` | Request validation failed |
| `INVALID_TOKEN` | JWT token is invalid or expired |
| `CUSTOMER_NOT_FOUND` | Customer not found or not assigned to recovery person |
| `DEVICE_ALREADY_COLLECTED` | Device has already been collected |
| `SERVER_ERROR` | Internal server error |

---

## Testing

### Using Postman

1. **Login as Recovery Person**:
   - POST `/api/recovery-person/auth/send-otp`
   - POST `/api/recovery-person/auth/verify-otp`
   - Save the token

2. **Collect Device**:
   - Method: POST
   - URL: `http://localhost:5000/api/recovery-person/collect-device`
   - Headers: `Authorization: Bearer <recovery_person_token>`
   - Body Type: `form-data`
   - Form Fields:
     - `customerId`: `507f1f77bcf86cd799439022` (text)
     - `deviceFrontImage`: Select file (file)
     - `deviceBackImage`: Select file (file)
     - `devicePin`: `1234` (text)
     - `paymentDeadline`: `2025-12-31T23:59:59.000Z` (text)
     - `notes`: `Customer agreed to pay by deadline` (text)

3. **Verify Collection Status** (as Recovery Head):
   - Method: GET
   - URL: `http://localhost:5000/api/recovery-head/recovery-persons-with-customers`
   - Headers: `Authorization: Bearer <recovery_head_token>`
   - Check `isRecoveryTaskDone` and `collectedCount` fields

---

## Notes

1. **Image Storage**: Images are automatically uploaded to Cloudinary server-side
2. **No Frontend Config**: Frontend doesn't need Cloudinary credentials
3. **Payment Deadline**: Used to track when device should be sold if unpaid
4. **Device PIN**: Stored securely for device unlock if needed
5. **Collection Proof**: Front and back images serve as proof of collection
6. **Task Tracking**: Recovery head can monitor completion via `isRecoveryTaskDone`
7. **One Collection**: Device can only be collected once to prevent errors
8. **File Validation**: Only image files up to 5MB are accepted

---

## Support

For issues or questions, please contact the development team.
