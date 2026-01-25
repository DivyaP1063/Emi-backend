# Aadhaar OTP Verification API Documentation

## Overview

The Aadhaar OTP Verification API enables retailers to verify customer identity using Aadhaar-based KYC. This verification is **mandatory** for customers with a landing price greater than ₹20,000.

## Authentication

All endpoints require retailer authentication via JWT token in the Authorization header:
```
Authorization: Bearer <retailer_jwt_token>
```

---

## Endpoints

### 1. Send Aadhaar OTP

Send OTP to the mobile number linked with the customer's Aadhaar.

**Endpoint:** `POST /api/retailer/customers/aadhaar/send-otp`

**Request Body:**
```json
{
  "aadhaarNumber": "123456789012"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "OTP sent successfully to your Aadhaar-linked mobile number.",
  "data": {
    "referenceId": "REF123456789"
  }
}
```

**Error Responses:**

| Status | Error Code | Message |
|--------|------------|---------|
| 400 | VALIDATION_ERROR | Aadhaar number must be exactly 12 digits |
| 400 | EAS517 | OTP already sent. Please retry after 120 seconds. |
| 400 | EAN1229 | This Aadhaar number is not registered with a mobile number. |
| 400 | EAN1391 | This Aadhaar number is locked. Please unlock it through UIDAI portal. |
| 400 | EAE168 | Aadhaar number does not exist. Please verify the number. |
| 500 | SERVER_ERROR | Failed to send Aadhaar OTP |

---

### 2. Verify Aadhaar OTP

Verify the OTP and retrieve KYC data from Aadhaar.

**Endpoint:** `POST /api/retailer/customers/aadhaar/verify-otp`

**Request Body:**
```json
{
  "aadhaarNumber": "123456789012",
  "otp": "123456"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Aadhaar verified successfully.",
  "data": {
    "referenceId": "REF123456789",
    "verified": true,
    "verifiedData": {
      "name": "John Doe",
      "dateOfBirth": "01-01-1990",
      "gender": "M",
      "address": {
        "house": "123",
        "street": "Main Street",
        "landmark": "Near Park",
        "locality": "Sector 1",
        "vtc": "Village Name",
        "district": "District Name",
        "state": "State Name",
        "pincode": "123456",
        "country": "India"
      },
      "photoBase64": "base64_encoded_photo_string"
    }
  }
}
```

**Error Responses:**

| Status | Error Code | Message |
|--------|------------|---------|
| 400 | VALIDATION_ERROR | Aadhaar number must be exactly 12 digits / OTP must be exactly 6 digits |
| 400 | ETP011 | Incorrect OTP. Please enter the correct OTP. |
| 400 | EOE082 / EOE794 | OTP has expired. Please request a new OTP. |
| 400 | EML1916 | Maximum OTP attempts reached. Please try again later. |
| 500 | SERVER_ERROR | Failed to verify Aadhaar OTP |

---

## Customer Creation Flow with Aadhaar Verification

### Workflow

1. **Step 1-2:** Basic customer details and mobile OTP verification (existing flow)
2. **Step 3:** Enter EMI details including landing price
3. **Step 3a (Conditional):** If `landingPrice > 20000`:
   - Call `POST /api/retailer/customers/aadhaar/send-otp`
   - User receives OTP on Aadhaar-linked mobile
4. **Step 3b (Conditional):** If `landingPrice > 20000`:
   - Call `POST /api/retailer/customers/aadhaar/verify-otp`
   - Store the returned `verifiedData` for customer creation
5. **Step 4:** Create customer with all details

### Updated Customer Creation Request

When creating a customer with `landingPrice > 20000`, include the Aadhaar verification data:

**Endpoint:** `POST /api/retailer/customers`

**Additional Field in Request Body:**
```json
{
  "fullName": "John Doe",
  "aadharNumber": "123456789012",
  "landingPrice": 25000,
  "aadhaarVerificationData": {
    "verified": true,
    "aadhaarNumber": "123456789012",
    "referenceId": "REF123456789",
    "verifiedData": {
      "name": "John Doe",
      "dateOfBirth": "01-01-1990",
      "gender": "M",
      "address": { ... },
      "photoBase64": "..."
    }
  },
  ...
}
```

**Validation Rules:**

- If `landingPrice > 20000` and `aadhaarVerificationData` is missing or `verified: false`:
  - **Error:** `AADHAAR_VERIFICATION_REQUIRED`
  - **Message:** "Aadhaar OTP verification is mandatory for landing price greater than ₹20,000"

- If `aadhaarVerificationData.aadhaarNumber` doesn't match `aadharNumber`:
  - **Error:** `AADHAAR_MISMATCH`
  - **Message:** "Aadhaar number mismatch. Please verify with the same Aadhaar number."

- If `landingPrice <= 20000`:
  - Aadhaar verification is **optional** (customer will be created with `aadhaarVerification.verified: false`)

---

## Customer Model Updates

The Customer model now includes an `aadhaarVerification` field:

```javascript
{
  aadhaarVerification: {
    verified: Boolean,        // true if Aadhaar was verified
    verifiedAt: Date,         // timestamp of verification
    referenceId: String,      // KYC API reference ID
    verifiedData: {
      name: String,
      dateOfBirth: String,
      gender: String,
      address: {
        house: String,
        street: String,
        landmark: String,
        locality: String,
        vtc: String,
        district: String,
        state: String,
        pincode: String,
        country: String
      },
      photoBase64: String     // base64 encoded Aadhaar photo
    }
  }
}
```

---

## Environment Configuration

Add these variables to your `.env` file:

```env
# KYC API Configuration (Aadhaar OTP Verification)
KYC_BASE_URL=https://sm-kyc-sync-sandbox.scoreme.in
KYC_CLIENT_ID=your_client_id_here
KYC_CLIENT_SECRET=your_client_secret_here
```

**Environments:**
- **Sandbox (UAT):** `https://sm-kyc-sync-sandbox.scoreme.in` - Use for development/testing
- **Production:** `https://sm-kyc-sync-prod.scoreme.in` - Use when going live

---

## Error Handling

All KYC API errors are mapped to user-friendly messages. Common error codes:

| Code | Meaning | Action |
|------|---------|--------|
| EAS517 | Rate limit - OTP already sent | Wait 120 seconds before retry |
| ETP011 | Incorrect OTP | Ask user to enter correct OTP |
| EOE082/EOE794 | OTP expired | Request new OTP |
| EML1916 | Max attempts reached | Wait before trying again |
| EAN1229 | Aadhaar not linked to mobile | Contact UIDAI |
| EAN1391 | Aadhaar locked | Unlock via UIDAI portal |
| EAE168 | Invalid Aadhaar number | Verify the number |
| EUP007 | Technical issue | Retry later |
| ERT788 | Request timeout | Retry the request |

---

## Testing with Postman

### 1. Test Send OTP
```bash
POST {{base_url}}/api/retailer/customers/aadhaar/send-otp
Authorization: Bearer {{retailer_token}}
Content-Type: application/json

{
  "aadhaarNumber": "123456789012"
}
```

### 2. Test Verify OTP
```bash
POST {{base_url}}/api/retailer/customers/aadhaar/verify-otp
Authorization: Bearer {{retailer_token}}
Content-Type: application/json

{
  "aadhaarNumber": "123456789012",
  "otp": "123456"
}
```

### 3. Test Customer Creation (Landing Price > 20000)
```bash
POST {{base_url}}/api/retailer/customers
Authorization: Bearer {{retailer_token}}
Content-Type: multipart/form-data

# Include all customer fields plus:
landingPrice: 25000
aadhaarVerificationData: {
  "verified": true,
  "aadhaarNumber": "123456789012",
  "referenceId": "REF123456789",
  "verifiedData": { ... }
}
```

---

## Notes

- Aadhaar verification is **mandatory** only when `landingPrice > 20000`
- The verification data is stored in the customer document for compliance
- The Aadhaar photo is stored as base64 string in the database
- Rate limiting applies: 120 seconds between OTP requests
- OTP is valid for 10 minutes
- Maximum 3 OTP verification attempts before lockout
