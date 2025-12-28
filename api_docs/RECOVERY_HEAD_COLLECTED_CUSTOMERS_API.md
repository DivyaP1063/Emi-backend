# Recovery Head Collected Customers API Documentation

## Overview

This API allows recovery heads to retrieve comprehensive details of all customers whose devices have been collected. The response includes complete customer information, device collection details (images, PIN, payment deadline, notes), EMI details, and information about the recovery person who performed the collection.

All customer IDs are properly linked to actual customer records via MongoDB ObjectIds, ensuring data integrity and relational consistency.

---

## API Endpoint

### Get All Collected Customers

Retrieve all customers whose devices have been collected by recovery persons under the authenticated recovery head.

**Endpoint:** `GET /api/recovery-head/collected-customers`

**Authentication:** Required (Recovery Head JWT token)

**Headers:**
```
Authorization: Bearer <recovery_head_jwt_token>
```

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | Integer | No | 1 | Page number for pagination |
| `limit` | Integer | No | 20 | Number of items per page (max 100) |
| `search` | String | No | "" | Search by customer name, mobile, IMEI1, or IMEI2 |

**Example Request URLs:**
```
GET /api/recovery-head/collected-customers
GET /api/recovery-head/collected-customers?page=1&limit=10
GET /api/recovery-head/collected-customers?search=John
GET /api/recovery-head/collected-customers?page=2&limit=20&search=9876543210
```

---

## Success Response

**Status Code:** `200 OK`

**Response Structure:**
```json
{
  "success": true,
  "message": "Collected customers fetched successfully",
  "data": {
    "customers": [
      {
        "customerId": "507f1f77bcf86cd799439011",
        
        "personalInfo": {
          "fullName": "Rajesh Kumar",
          "mobileNumber": "9876543210",
          "aadharNumber": "123456789012",
          "dob": "1990-05-15T00:00:00.000Z",
          "fatherName": "Ram Kumar"
        },
        
        "address": {
          "village": "Rampur",
          "nearbyLocation": "Near Post Office",
          "post": "Rampur",
          "district": "Varanasi",
          "pincode": "221001"
        },
        
        "deviceInfo": {
          "imei1": "123456789012345",
          "imei2": "543210987654321",
          "phoneType": "NEW",
          "model": "Samsung Galaxy A54",
          "productName": "Samsung Galaxy A54 5G 128GB",
          "isLocked": true
        },
        
        "emiDetails": {
          "branch": "Varanasi Main",
          "sellPrice": 35000,
          "landingPrice": 32000,
          "downPayment": 5000,
          "downPaymentPending": 0,
          "emiRate": 3,
          "numberOfMonths": 12,
          "emiPerMonth": 2500,
          "balanceAmount": 15000,
          "totalEmiAmount": 30000,
          "nextUnpaidEmi": {
            "month": 7,
            "dueDate": "2025-01-15T00:00:00.000Z",
            "amount": 2500
          }
        },
        
        "documents": {
          "customerPhoto": "https://res.cloudinary.com/xxx/image/upload/v123/customer_photo.jpg",
          "aadharFrontPhoto": "https://res.cloudinary.com/xxx/image/upload/v123/aadhar_front.jpg",
          "aadharBackPhoto": "https://res.cloudinary.com/xxx/image/upload/v123/aadhar_back.jpg",
          "signaturePhoto": "https://res.cloudinary.com/xxx/image/upload/v123/signature.jpg"
        },
        
        "retailer": {
          "shopName": "Mobile World",
          "mobileNumber": "9123456789"
        },
        
        "collectionStatus": {
          "isCollected": true,
          "collectedAt": "2025-12-26T10:30:00.000Z"
        },
        
        "deviceCollection": {
          "deviceFrontImage": "https://res.cloudinary.com/xxx/image/upload/v123/device_front.jpg",
          "deviceBackImage": "https://res.cloudinary.com/xxx/image/upload/v123/device_back.jpg",
          "devicePin": "1234",
          "paymentDeadline": "2025-12-31T23:59:59.000Z",
          "notes": "Customer agreed to pay by deadline or device will be sold",
          
          "collectedBy": {
            "recoveryPersonId": "507f1f77bcf86cd799439022",
            "fullName": "Amit Singh",
            "mobileNumber": "9988776655",
            "aadharNumber": "987654321098"
          }
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 45,
      "itemsPerPage": 20
    }
  }
}
```

---

## Error Responses

### 401 Unauthorized - Invalid or Missing Token

```json
{
  "success": false,
  "message": "Authentication required",
  "error": "UNAUTHORIZED"
}
```

### 401 Unauthorized - Token Expired

```json
{
  "success": false,
  "message": "Token expired",
  "error": "TOKEN_EXPIRED"
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Failed to fetch collected customers",
  "error": "SERVER_ERROR"
}
```

---

## Response Fields Description

### Customer Object Structure

| Field | Type | Description |
|-------|------|-------------|
| `customerId` | String | MongoDB ObjectId of the customer |
| `personalInfo` | Object | Customer's personal information |
| `personalInfo.fullName` | String | Full name of the customer |
| `personalInfo.mobileNumber` | String | 10-digit mobile number |
| `personalInfo.aadharNumber` | String | 12-digit Aadhar number |
| `personalInfo.dob` | Date | Date of birth (ISO 8601) |
| `personalInfo.fatherName` | String | Father's name |
| `address` | Object | Customer's address details |
| `address.village` | String | Village name |
| `address.nearbyLocation` | String | Nearby landmark |
| `address.post` | String | Post office |
| `address.district` | String | District name |
| `address.pincode` | String | 6-digit pincode |
| `deviceInfo` | Object | Device information |
| `deviceInfo.imei1` | String | Primary IMEI (15 digits) |
| `deviceInfo.imei2` | String/null | Secondary IMEI (15 digits) or null |
| `deviceInfo.phoneType` | String | "NEW" or "OLD" |
| `deviceInfo.model` | String | Device model |
| `deviceInfo.productName` | String | Full product name |
| `deviceInfo.isLocked` | Boolean | Device lock status |
| `emiDetails` | Object | EMI and payment details |
| `emiDetails.branch` | String | Branch name |
| `emiDetails.sellPrice` | Number | Selling price |
| `emiDetails.landingPrice` | Number | Landing price |
| `emiDetails.downPayment` | Number | Down payment amount |
| `emiDetails.downPaymentPending` | Number | Pending down payment |
| `emiDetails.emiRate` | Number | EMI interest rate (%) |
| `emiDetails.numberOfMonths` | Number | Total EMI months |
| `emiDetails.emiPerMonth` | Number | Monthly EMI amount |
| `emiDetails.balanceAmount` | Number | Remaining balance |
| `emiDetails.totalEmiAmount` | Number | Total EMI amount |
| `emiDetails.nextUnpaidEmi` | Object/null | Next unpaid EMI details or null |
| `documents` | Object | Customer document URLs (Cloudinary) |
| `retailer` | Object/null | Retailer information or null |
| `collectionStatus` | Object | Device collection status |
| `collectionStatus.isCollected` | Boolean | Always true for this API |
| `collectionStatus.collectedAt` | Date | Collection timestamp (ISO 8601) |
| `deviceCollection` | Object | Device collection details |
| `deviceCollection.deviceFrontImage` | String | Cloudinary URL of device front image |
| `deviceCollection.deviceBackImage` | String | Cloudinary URL of device back image |
| `deviceCollection.devicePin` | String | Device unlock PIN |
| `deviceCollection.paymentDeadline` | Date | Payment deadline (ISO 8601) |
| `deviceCollection.notes` | String/null | Additional notes or null |
| `deviceCollection.collectedBy` | Object | Recovery person who collected |
| `deviceCollection.collectedBy.recoveryPersonId` | String | MongoDB ObjectId of recovery person |
| `deviceCollection.collectedBy.fullName` | String | Recovery person's full name |
| `deviceCollection.collectedBy.mobileNumber` | String | Recovery person's mobile number |
| `deviceCollection.collectedBy.aadharNumber` | String | Recovery person's Aadhar number |

---

## Example cURL Commands

### Basic Request

```bash
curl -X GET http://localhost:5000/api/recovery-head/collected-customers \
  -H "Authorization: Bearer <recovery_head_token>"
```

### With Pagination

```bash
curl -X GET "http://localhost:5000/api/recovery-head/collected-customers?page=1&limit=10" \
  -H "Authorization: Bearer <recovery_head_token>"
```

### With Search

```bash
curl -X GET "http://localhost:5000/api/recovery-head/collected-customers?search=Rajesh" \
  -H "Authorization: Bearer <recovery_head_token>"
```

### Combined Parameters

```bash
curl -X GET "http://localhost:5000/api/recovery-head/collected-customers?page=2&limit=15&search=9876" \
  -H "Authorization: Bearer <recovery_head_token>"
```

---

## Frontend Integration Examples

### JavaScript/Fetch Example

```javascript
// Get recovery head token from login
const recoveryHeadToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

// Fetch collected customers
async function getCollectedCustomers(page = 1, limit = 20, search = '') {
  try {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search })
    });

    const response = await fetch(
      `http://localhost:5000/api/recovery-head/collected-customers?${queryParams}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${recoveryHeadToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const result = await response.json();

    if (result.success) {
      console.log('Total collected customers:', result.data.pagination.totalItems);
      
      result.data.customers.forEach(customer => {
        console.log(`Customer: ${customer.personalInfo.fullName}`);
        console.log(`Device: ${customer.deviceInfo.productName}`);
        console.log(`Collected by: ${customer.deviceCollection.collectedBy.fullName}`);
        console.log(`Collection date: ${customer.collectionStatus.collectedAt}`);
        console.log(`Payment deadline: ${customer.deviceCollection.paymentDeadline}`);
        console.log('---');
      });
    } else {
      console.error('Error:', result.message);
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
}

// Usage
getCollectedCustomers(1, 10, 'Rajesh');
```

### Flutter/Dart Example

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class CollectedCustomer {
  final String customerId;
  final PersonalInfo personalInfo;
  final Address address;
  final DeviceInfo deviceInfo;
  final EmiDetails emiDetails;
  final Documents documents;
  final Retailer? retailer;
  final CollectionStatus collectionStatus;
  final DeviceCollection deviceCollection;

  CollectedCustomer({
    required this.customerId,
    required this.personalInfo,
    required this.address,
    required this.deviceInfo,
    required this.emiDetails,
    required this.documents,
    this.retailer,
    required this.collectionStatus,
    required this.deviceCollection,
  });

  factory CollectedCustomer.fromJson(Map<String, dynamic> json) {
    return CollectedCustomer(
      customerId: json['customerId'],
      personalInfo: PersonalInfo.fromJson(json['personalInfo']),
      address: Address.fromJson(json['address']),
      deviceInfo: DeviceInfo.fromJson(json['deviceInfo']),
      emiDetails: EmiDetails.fromJson(json['emiDetails']),
      documents: Documents.fromJson(json['documents']),
      retailer: json['retailer'] != null 
          ? Retailer.fromJson(json['retailer']) 
          : null,
      collectionStatus: CollectionStatus.fromJson(json['collectionStatus']),
      deviceCollection: DeviceCollection.fromJson(json['deviceCollection']),
    );
  }
}

class ApiService {
  final String baseUrl = 'http://localhost:5000/api/recovery-head';
  final String token;

  ApiService(this.token);

  Future<Map<String, dynamic>> getCollectedCustomers({
    int page = 1,
    int limit = 20,
    String search = '',
  }) async {
    try {
      final queryParams = {
        'page': page.toString(),
        'limit': limit.toString(),
        if (search.isNotEmpty) 'search': search,
      };

      final uri = Uri.parse('$baseUrl/collected-customers')
          .replace(queryParameters: queryParams);

      final response = await http.get(
        uri,
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      final data = json.decode(response.body);

      if (response.statusCode == 200 && data['success']) {
        final customers = (data['data']['customers'] as List)
            .map((json) => CollectedCustomer.fromJson(json))
            .toList();

        return {
          'success': true,
          'customers': customers,
          'pagination': data['data']['pagination'],
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to fetch collected customers',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Network error: $e',
      };
    }
  }
}

// Usage
void main() async {
  final apiService = ApiService('your_recovery_head_token');
  
  final result = await apiService.getCollectedCustomers(
    page: 1,
    limit: 10,
    search: 'Rajesh',
  );

  if (result['success']) {
    final customers = result['customers'] as List<CollectedCustomer>;
    print('Total: ${result['pagination']['totalItems']}');
    
    for (var customer in customers) {
      print('Customer: ${customer.personalInfo.fullName}');
      print('Device: ${customer.deviceInfo.productName}');
      print('Collected by: ${customer.deviceCollection.collectedBy.fullName}');
    }
  } else {
    print('Error: ${result['message']}');
  }
}
```

---

## Business Logic

### Data Relationships

All data is properly linked via MongoDB ObjectIds:

1. **Customer → Recovery Head**: `assignedToRecoveryHeadId` links customer to recovery head
2. **Customer → Recovery Person**: `deviceCollection.collectedBy` links to the recovery person who collected the device
3. **Customer → Retailer**: `retailerId` links to the retailer who registered the customer

### Query Logic

The API returns customers that meet ALL of the following criteria:

1. `assignedToRecoveryHeadId` matches the authenticated recovery head's ID
2. `assigned` is `true` (customer is assigned to recovery head)
3. `isCollected` is `true` (device has been collected)

### Sorting

Results are sorted by `collectedAt` in descending order (most recently collected first).

### Pagination

- Default: 20 items per page
- Maximum: 100 items per page
- Returns pagination metadata including current page, total pages, and total items

### Search Functionality

Search is case-insensitive and matches against:
- Customer full name
- Mobile number
- IMEI1
- IMEI2

---

## Use Cases

### 1. View All Collected Devices

Recovery heads can view all devices that have been collected by their recovery persons, including:
- Device images (front and back)
- Device PIN for unlocking
- Payment deadline
- Collection notes

### 2. Track Recovery Person Performance

See which recovery persons have collected devices and when, helping to:
- Monitor recovery person productivity
- Track collection timelines
- Identify top performers

### 3. Manage Payment Deadlines

View payment deadlines for all collected devices to:
- Follow up with customers before deadline
- Prepare devices for sale after deadline expires
- Track pending payments

### 4. Customer Follow-up

Access complete customer information for follow-up:
- Contact details (mobile number)
- Address for physical visits
- EMI details for payment discussions
- Next unpaid EMI information

### 5. Device Inventory Management

Track collected devices with:
- Device specifications (model, IMEI)
- Device condition (via images)
- Device unlock PIN
- Customer ownership details

---

## Notes

1. **Authentication Required**: All requests must include a valid Recovery Head JWT token
2. **Data Privacy**: Only returns customers assigned to the authenticated recovery head
3. **Complete Information**: Response includes all customer, device, EMI, and collection details
4. **Linked Data**: All IDs are MongoDB ObjectIds linking to actual records
5. **Image URLs**: All images are Cloudinary URLs (customer documents and device images)
6. **Recovery Person Details**: Populated from the RecoveryPerson collection via ObjectId reference
7. **Retailer Information**: Populated from the Retailer collection via ObjectId reference
8. **Pagination Support**: Efficient handling of large datasets
9. **Search Capability**: Quick filtering by customer name, mobile, or IMEI

---

## Related APIs

- **Device Collection API**: `/api/recovery-person/collect-device` - Used by recovery persons to collect devices
- **Recovery Persons API**: `/api/recovery-head/recovery-persons-with-customers` - View all recovery persons and their assigned customers
- **Statistics API**: `/api/recovery-head/statistics` - Get overall statistics including total collected devices

---

## Support

For issues or questions, please contact the development team.
