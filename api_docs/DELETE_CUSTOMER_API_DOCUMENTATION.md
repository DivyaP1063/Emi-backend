# Delete Customer API Documentation

This document describes the API endpoint for completely deleting a customer from the database. This operation performs a cascading deletion, removing the customer record along with all related data including transactions and recovery head assignments.

## Base URL

```
http://localhost:5000/api/admin
```

## Authentication

This endpoint **REQUIRES** JWT authentication. Only admin users can delete customers.

**Request Headers:**
```
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json
```

---

## Endpoint

### Delete Customer Completely

Permanently delete a customer and all associated records from the database.

> [!CAUTION]
> **This is a destructive operation!** Once a customer is deleted, all associated data will be permanently removed from the database. This action cannot be undone.

**Endpoint:** `DELETE /api/admin/customers/:customerId`

**URL Parameters:**
- `customerId` (required) - MongoDB ObjectId of the customer to delete (24-character hexadecimal string)

**What Gets Deleted:**

This endpoint performs a cascading deletion using MongoDB transactions to ensure data integrity:

1. **Customer Record** - The main customer document with all personal information, EMI details, documents, etc.
2. **Transactions** - All transaction records associated with this customer
3. **Recovery Head Assignments** - All assignment records linking this customer to recovery persons

> [!NOTE]
> **Cloudinary Images**: Document images stored on Cloudinary (customer photos, Aadhar photos, signature, device collection images) are **NOT** deleted from Cloudinary. Only the database references are removed.

---

## Success Response

**Status Code:** `200 OK`

**Response Body:**
```json
{
  "success": true,
  "message": "Customer John Doe deleted successfully",
  "data": {
    "customerId": "507f1f77bcf86cd799439011",
    "customerName": "John Doe",
    "mobileNumber": "9876543210",
    "imei1": "123456789012345",
    "deletionSummary": {
      "customerDeleted": true,
      "transactionsDeleted": 3,
      "assignmentsDeleted": 1,
      "totalRecordsDeleted": 5
    },
    "deletedAt": "2025-12-28T07:35:42.123Z"
  }
}
```

**Response Fields:**
- `success` - Boolean indicating operation success
- `message` - Human-readable success message with customer name
- `data.customerId` - ID of the deleted customer
- `data.customerName` - Full name of the deleted customer
- `data.mobileNumber` - Mobile number of the deleted customer
- `data.imei1` - Primary IMEI of the deleted customer's device
- `data.deletionSummary.customerDeleted` - Confirmation that customer was deleted
- `data.deletionSummary.transactionsDeleted` - Number of transaction records deleted
- `data.deletionSummary.assignmentsDeleted` - Number of assignment records deleted
- `data.deletionSummary.totalRecordsDeleted` - Total number of records removed from database
- `data.deletedAt` - ISO timestamp of when deletion occurred

---

## Error Responses

### 400 Bad Request - Invalid Customer ID Format

```json
{
  "success": false,
  "message": "Invalid customer ID format",
  "error": "VALIDATION_ERROR"
}
```

**Cause:** The customerId parameter is not a valid MongoDB ObjectId (must be 24-character hexadecimal string)

---

### 401 Unauthorized - Missing or Invalid Token

```json
{
  "success": false,
  "message": "No token provided" 
}
```

**Cause:** Authorization header is missing or JWT token is invalid/expired

---

### 404 Not Found - Customer Not Found

```json
{
  "success": false,
  "message": "Customer not found",
  "error": "CUSTOMER_NOT_FOUND"
}
```

**Cause:** No customer exists with the provided customerId

---

### 500 Internal Server Error - Server Error

```json
{
  "success": false,
  "message": "Failed to delete customer",
  "error": "SERVER_ERROR",
  "details": "Error message details"
}
```

**Cause:** Database error or unexpected server issue. If this occurs, the transaction is automatically rolled back and no data is deleted.

---

## Transaction Safety

This endpoint uses **MongoDB transactions** to ensure data integrity:

- All deletions (customer, transactions, assignments) happen atomically
- If any deletion fails, the entire operation is rolled back
- Database remains in a consistent state even if errors occur
- No partial deletions can occur

---

## Example Requests

### cURL

```bash
# Delete customer by ID
curl -X DELETE http://localhost:5000/api/admin/customers/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

### JavaScript (Axios)

```javascript
const axios = require('axios');

async function deleteCustomer(customerId, adminToken) {
  try {
    const response = await axios.delete(
      `http://localhost:5000/api/admin/customers/${customerId}`,
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Customer deleted successfully');
    console.log('Deletion summary:', response.data.data.deletionSummary);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error('Error:', error.response.data.message);
      console.error('Error code:', error.response.data.error);
    } else {
      console.error('Network error:', error.message);
    }
    throw error;
  }
}

// Usage
deleteCustomer('507f1f77bcf86cd799439011', 'your-admin-jwt-token');
```

### JavaScript (Fetch)

```javascript
async function deleteCustomer(customerId, adminToken) {
  try {
    const response = await fetch(
      `http://localhost:5000/api/admin/customers/${customerId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete customer');
    }
    
    console.log('Customer deleted:', data.data.customerName);
    console.log('Total records deleted:', data.data.deletionSummary.totalRecordsDeleted);
    return data;
  } catch (error) {
    console.error('Delete customer error:', error.message);
    throw error;
  }
}

// Usage
deleteCustomer('507f1f77bcf86cd799439011', 'your-admin-jwt-token')
  .then(result => console.log('Success:', result))
  .catch(error => console.error('Failed:', error));
```

### Postman

1. **Method:** DELETE
2. **URL:** `http://localhost:5000/api/admin/customers/507f1f77bcf86cd799439011`
3. **Headers:**
   - `Authorization`: `Bearer <your-admin-jwt-token>`
   - `Content-Type`: `application/json`
4. **Body:** None required
5. **Send Request**

---

## Frontend Integration (React/Next.js)

```typescript
// api/customers.ts
import axios from 'axios';

interface DeleteCustomerResponse {
  success: boolean;
  message: string;
  data: {
    customerId: string;
    customerName: string;
    mobileNumber: string;
    imei1: string;
    deletionSummary: {
      customerDeleted: boolean;
      transactionsDeleted: number;
      assignmentsDeleted: number;
      totalRecordsDeleted: number;
    };
    deletedAt: string;
  };
}

export async function deleteCustomer(
  customerId: string,
  token: string
): Promise<DeleteCustomerResponse> {
  const response = await axios.delete<DeleteCustomerResponse>(
    `${process.env.NEXT_PUBLIC_API_URL}/api/admin/customers/${customerId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  
  return response.data;
}

// Usage in component
import { deleteCustomer } from '@/api/customers';
import { useAuth } from '@/hooks/useAuth';

function CustomerList() {
  const { token } = useAuth();
  
  const handleDelete = async (customerId: string, customerName: string) => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete ${customerName}? This action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    try {
      const result = await deleteCustomer(customerId, token);
      
      alert(`Successfully deleted ${result.data.customerName}`);
      console.log('Deletion summary:', result.data.deletionSummary);
      
      // Refresh customer list or remove from state
      // refreshCustomers();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete customer';
      alert(`Error: ${errorMessage}`);
      console.error('Delete error:', error);
    }
  };
  
  return (
    // Your component JSX
  );
}
```

---

## Flutter/Dart Integration

```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

class CustomerService {
  final String baseUrl = 'http://localhost:5000/api/admin';
  
  Future<Map<String, dynamic>> deleteCustomer(
    String customerId,
    String adminToken,
  ) async {
    try {
      final response = await http.delete(
        Uri.parse('$baseUrl/customers/$customerId'),
        headers: {
          'Authorization': 'Bearer $adminToken',
          'Content-Type': 'application/json',
        },
      );
      
      final data = json.decode(response.body);
      
      if (response.statusCode == 200) {
        print('Customer deleted: ${data['data']['customerName']}');
        print('Total records deleted: ${data['data']['deletionSummary']['totalRecordsDeleted']}');
        return data;
      } else {
        throw Exception(data['message'] ?? 'Failed to delete customer');
      }
    } catch (e) {
      print('Error deleting customer: $e');
      rethrow;
    }
  }
}

// Usage
final customerService = CustomerService();

void deleteCustomerWithConfirmation(String customerId, String customerName) async {
  // Show confirmation dialog
  final confirmed = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text('Delete Customer'),
      content: Text('Are you sure you want to delete $customerName? This cannot be undone.'),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context, false),
          child: Text('Cancel'),
        ),
        TextButton(
          onPressed: () => Navigator.pop(context, true),
          child: Text('Delete', style: TextStyle(color: Colors.red)),
        ),
      ],
    ),
  );
  
  if (confirmed == true) {
    try {
      final result = await customerService.deleteCustomer(
        customerId,
        'your-admin-token',
      );
      
      // Show success message
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Customer deleted successfully')),
      );
      
      // Refresh list or navigate back
    } catch (e) {
      // Show error message
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    }
  }
}
```

---

## Important Notes

> [!WARNING]
> **Data Loss**: This operation permanently deletes customer data. Ensure you have proper backups and confirmation flows in your application.

> [!IMPORTANT]
> **Authorization**: Only authenticated admin users can access this endpoint. The JWT token must be valid and belong to an admin account.

> [!NOTE]
> **Related Data**: The endpoint automatically handles deletion of related records (transactions, assignments). You don't need to manually delete these.

> [!TIP]
> **Audit Trail**: Consider logging deletion operations in your application for audit purposes. The API returns detailed information about what was deleted.

---

## Testing

### Test Successful Deletion

1. Get a valid admin JWT token by logging in
2. Get a customer ID from the customer list
3. Send DELETE request with the customer ID
4. Verify response shows successful deletion with summary
5. Verify customer no longer appears in customer list
6. Verify related transactions and assignments are also deleted

### Test Error Scenarios

**Invalid Customer ID:**
```bash
curl -X DELETE http://localhost:5000/api/admin/customers/invalid-id \
  -H "Authorization: Bearer <admin-token>"
```

**Non-existent Customer:**
```bash
curl -X DELETE http://localhost:5000/api/admin/customers/507f1f77bcf86cd799439999 \
  -H "Authorization: Bearer <admin-token>"
```

**Unauthorized Access:**
```bash
curl -X DELETE http://localhost:5000/api/admin/customers/507f1f77bcf86cd799439011
# No Authorization header
```

---

## Database Impact

When a customer is deleted, the following collections are affected:

| Collection | Action | Query |
|------------|--------|-------|
| `customers` | DELETE | `{ _id: customerId }` |
| `transactions` | DELETE ALL | `{ customerId: customerId }` |
| `recoveryheadassignments` | DELETE ALL | `{ customerId: customerId }` |

**Collections NOT Affected:**
- `retailers` - Retailer who created the customer remains unchanged
- `recoveryheads` - Recovery heads remain unchanged
- `recoverypersons` - Recovery persons remain unchanged
- Cloudinary storage - Images remain in Cloudinary

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-28 | Initial release of customer deletion API |

---

## Support

For issues or questions regarding this API:
- Check server logs for detailed error messages
- Verify JWT token is valid and belongs to admin user
- Ensure customer ID is a valid MongoDB ObjectId format
- Contact backend team for assistance
