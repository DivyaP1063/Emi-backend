# Recovery Person Device Collection API Documentation

## Overview

This document describes the Device Collection API for recovery persons. When a recovery person collects a device from a customer, they must record the collection details including device images, PIN, and payment deadline.

---

## API Endpoint

### Collect Device from Customer

Record device collection with images, PIN, and payment deadline.

**Endpoint:** `POST /api/recovery-person/collect-device`

**Authentication:** Required (Recovery Person JWT token)

**Headers:**
```json
{
  "Authorization": "Bearer <recovery_person_jwt_token>",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "customerId": "507f1f77bcf86cd799439022",
  "deviceFrontImage": "https://res.cloudinary.com/xxx/image/upload/v123/device_front.jpg",
  "deviceBackImage": "https://res.cloudinary.com/xxx/image/upload/v123/device_back.jpg",
  "devicePin": "1234",
  "paymentDeadline": "2025-12-31T23:59:59.000Z",
  "notes": "Customer agreed to pay by end of month or device will be sold"
}
```

**Field Validations:**
- `customerId`: Required, valid MongoDB ObjectId (24 hex characters)
- `deviceFrontImage`: Required, valid URL (Cloudinary or other image hosting)
- `deviceBackImage`: Required, valid URL (Cloudinary or other image hosting)
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

**400 Bad Request - Validation Error:**
```json
{
  "success": false,
  "message": "Validation failed",
  "error": "VALIDATION_ERROR",
  "details": [
    {
      "msg": "Device front image is required",
      "param": "deviceFrontImage",
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
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "507f1f77bcf86cd799439022",
    "deviceFrontImage": "https://res.cloudinary.com/xxx/image/upload/v123/device_front.jpg",
    "deviceBackImage": "https://res.cloudinary.com/xxx/image/upload/v123/device_back.jpg",
    "devicePin": "1234",
    "paymentDeadline": "2025-12-31T23:59:59.000Z",
    "notes": "Customer agreed to pay by end of month"
  }'
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

```javascript
// Step 1: Recovery person logs in
const recoveryPersonToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

// Step 2: Recovery person visits customer and collects device
// They take photos of device front and back
// Upload images to Cloudinary (or other image hosting)
const deviceFrontImageUrl = "https://res.cloudinary.com/xxx/device_front.jpg";
const deviceBackImageUrl = "https://res.cloudinary.com/xxx/device_back.jpg";

// Step 3: Get device PIN from customer
const devicePin = "1234";

// Step 4: Discuss payment deadline with customer
const paymentDeadline = "2025-12-31T23:59:59.000Z";

// Step 5: Record device collection
const collectResponse = await fetch(
  'http://localhost:5000/api/recovery-person/collect-device',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${recoveryPersonToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      customerId: "507f1f77bcf86cd799439022",
      deviceFrontImage: deviceFrontImageUrl,
      deviceBackImage: deviceBackImageUrl,
      devicePin: devicePin,
      paymentDeadline: paymentDeadline,
      notes: "Customer agreed to pay by deadline or device will be sold as second-hand"
    })
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
4. **Image Upload**: Images must be uploaded to Cloudinary (or similar) before API call
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
  deviceFrontImage: String,      // Cloudinary URL
  deviceBackImage: String,       // Cloudinary URL
  devicePin: String,             // Device unlock PIN
  paymentDeadline: Date,         // Deadline for customer to pay
  collectedBy: ObjectId,         // Recovery person who collected
  collectedByName: String,       // Recovery person name
  notes: String                  // Additional notes
}
```

---

## Image Upload Flow

### Recommended Approach

1. **Frontend**: Use Cloudinary widget or direct upload
2. **Get URL**: Receive Cloudinary URL after upload
3. **API Call**: Send URL to collect-device API

### Example with Cloudinary

```javascript
// Frontend code (example)
const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'your_upload_preset');
  
  const response = await fetch(
    'https://api.cloudinary.com/v1_1/your_cloud_name/image/upload',
    {
      method: 'POST',
      body: formData
    }
  );
  
  const data = await response.json();
  return data.secure_url;
};

// Upload both images
const frontImageUrl = await uploadImage(frontImageFile);
const backImageUrl = await uploadImage(backImageFile);

// Then call collect-device API
const collectResponse = await fetch('/api/recovery-person/collect-device', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    customerId: customerId,
    deviceFrontImage: frontImageUrl,
    deviceBackImage: backImageUrl,
    devicePin: devicePin,
    paymentDeadline: paymentDeadline,
    notes: notes
  })
});
```

---

## Error Codes Reference

| Error Code | Description |
|------------|-------------|
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

2. **Upload Images to Cloudinary**:
   - Use Cloudinary dashboard or API
   - Get secure URLs for both images

3. **Collect Device**:
   - Method: POST
   - URL: `http://localhost:5000/api/recovery-person/collect-device`
   - Headers: `Authorization: Bearer <recovery_person_token>`
   - Body (JSON):
     ```json
     {
       "customerId": "507f1f77bcf86cd799439022",
       "deviceFrontImage": "https://res.cloudinary.com/xxx/device_front.jpg",
       "deviceBackImage": "https://res.cloudinary.com/xxx/device_back.jpg",
       "devicePin": "1234",
       "paymentDeadline": "2025-12-31T23:59:59.000Z",
       "notes": "Customer agreed to pay by deadline"
     }
     ```

4. **Verify Collection Status** (as Recovery Head):
   - Method: GET
   - URL: `http://localhost:5000/api/recovery-head/recovery-persons-with-customers`
   - Headers: `Authorization: Bearer <recovery_head_token>`
   - Check `isRecoveryTaskDone` and `collectedCount` fields

---

## Notes

1. **Image Storage**: Images should be stored on Cloudinary or similar service
2. **Payment Deadline**: Used to track when device should be sold if unpaid
3. **Device PIN**: Stored securely for device unlock if needed
4. **Collection Proof**: Front and back images serve as proof of collection
5. **Task Tracking**: Recovery head can monitor completion via `isRecoveryTaskDone`
6. **One Collection**: Device can only be collected once to prevent errors

---

## Support

For issues or questions, please contact the development team.
