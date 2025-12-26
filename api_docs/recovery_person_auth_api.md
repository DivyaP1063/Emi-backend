# Recovery Person Authentication API Documentation

## Overview
This API allows recovery persons to authenticate using their mobile number with OTP verification. The system first verifies that the mobile number is registered as an active recovery person before sending the OTP.

## Authentication Flow

```
1. Recovery Person enters mobile number
   ↓
2. System checks if mobile exists in database as ACTIVE recovery person
   ↓
3. If exists → Send OTP | If not → Return error
   ↓
4. Recovery Person enters received OTP
   ↓
5. System verifies OTP
   ↓
6. If valid → Return JWT token + recovery person data
```

---

## 1. Send OTP

**URL:** `/api/recovery-person/auth/send-otp`  
**Method:** `POST`  
**Authentication:** Not Required (Public endpoint)  
**Content-Type:** `application/json`

### Request

#### Headers
```
Content-Type: application/json
```

#### Request Body
```json
{
  "mobileNumber": "9876543210"
}
```

#### Request Body Parameters

| Parameter | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| mobileNumber | String | Yes | Recovery person's 10-digit mobile number | Must be exactly 10 digits |

### Success Response (200 OK)

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

### Error Responses

#### 400 Bad Request - Validation Error
```json
{
  "success": false,
  "message": "Invalid mobile number format",
  "error": "VALIDATION_ERROR",
  "details": [
    {
      "type": "field",
      "value": "12345",
      "msg": "Mobile number must be exactly 10 digits",
      "path": "mobileNumber",
      "location": "body"
    }
  ]
}
```

#### 403 Forbidden - Mobile Not Registered
```json
{
  "success": false,
  "message": "This mobile number is not registered as recovery person",
  "error": "UNAUTHORIZED_ACCESS"
}
```

#### 403 Forbidden - Account Inactive
```json
{
  "success": false,
  "message": "Recovery person account is inactive. Please contact your recovery head.",
  "error": "ACCOUNT_INACTIVE"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to send OTP",
  "error": "SERVER_ERROR"
}
```

---

## 2. Verify OTP

**URL:** `/api/recovery-person/auth/verify-otp`  
**Method:** `POST`  
**Authentication:** Not Required (Public endpoint)  
**Content-Type:** `application/json`

### Request

#### Headers
```
Content-Type: application/json
```

#### Request Body
```json
{
  "mobileNumber": "9876543210",
  "otp": "123456"
}
```

#### Request Body Parameters

| Parameter | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| mobileNumber | String | Yes | Recovery person's 10-digit mobile number | Must be exactly 10 digits |
| otp | String | Yes | 6-digit OTP received via SMS | Must be exactly 6 digits |

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "recoveryPerson": {
      "id": "507f1f77bcf86cd799439011",
      "fullName": "John Doe",
      "mobileNumber": "9876543210",
      "aadharNumber": "123456789012",
      "recoveryHead": {
        "id": "507f1f77bcf86cd799439012",
        "fullName": "Recovery Head Name",
        "mobileNumber": "9123456789"
      }
    }
  }
}
```

### Error Responses

#### 400 Bad Request - Validation Error
```json
{
  "success": false,
  "message": "Validation failed",
  "error": "VALIDATION_ERROR",
  "details": [
    {
      "type": "field",
      "value": "123",
      "msg": "OTP must be exactly 6 digits",
      "path": "otp",
      "location": "body"
    }
  ]
}
```

#### 401 Unauthorized - Invalid OTP
```json
{
  "success": false,
  "message": "Invalid or expired OTP",
  "error": "INVALID_OTP"
}
```

#### 401 Unauthorized - Recovery Person Not Found
```json
{
  "success": false,
  "message": "Recovery person not found",
  "error": "UNAUTHORIZED_ACCESS"
}
```

#### 403 Forbidden - Account Inactive
```json
{
  "success": false,
  "message": "Recovery person account is inactive",
  "error": "ACCOUNT_INACTIVE"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to verify OTP",
  "error": "SERVER_ERROR"
}
```

---

## Usage Examples

### cURL Examples

#### Send OTP
```bash
curl -X POST http://localhost:5000/api/recovery-person/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "mobileNumber": "9876543210"
  }'
```

#### Verify OTP
```bash
curl -X POST http://localhost:5000/api/recovery-person/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "mobileNumber": "9876543210",
    "otp": "123456"
  }'
```

---

### JavaScript (Fetch API) Examples

#### Send OTP
```javascript
const sendOtp = async (mobileNumber) => {
  try {
    const response = await fetch('http://localhost:5000/api/recovery-person/auth/send-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ mobileNumber })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ OTP sent successfully');
      console.log(`OTP expires in ${data.data.expiresIn} seconds`);
      return true;
    } else {
      console.error('❌ Failed to send OTP:', data.message);
      alert(data.message);
      return false;
    }
  } catch (error) {
    console.error('Error sending OTP:', error);
    return false;
  }
};

// Usage
sendOtp('9876543210');
```

#### Verify OTP
```javascript
const verifyOtp = async (mobileNumber, otp) => {
  try {
    const response = await fetch('http://localhost:5000/api/recovery-person/auth/verify-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ mobileNumber, otp })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ Login successful');
      
      // Store token in localStorage
      localStorage.setItem('recoveryPersonToken', data.data.token);
      
      // Store recovery person data
      localStorage.setItem('recoveryPersonData', JSON.stringify(data.data.recoveryPerson));
      
      console.log('Recovery Person:', data.data.recoveryPerson);
      return data.data;
    } else {
      console.error('❌ Verification failed:', data.message);
      alert(data.message);
      return null;
    }
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return null;
  }
};

// Usage
verifyOtp('9876543210', '123456');
```

---

### Axios Examples

```javascript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/recovery-person/auth';

// Send OTP
const sendOtp = async (mobileNumber) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/send-otp`, {
      mobileNumber
    });
    
    console.log('✅ OTP sent:', response.data.message);
    return response.data;
  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
    throw error;
  }
};

// Verify OTP
const verifyOtp = async (mobileNumber, otp) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/verify-otp`, {
      mobileNumber,
      otp
    });
    
    console.log('✅ Login successful');
    
    // Store token
    localStorage.setItem('recoveryPersonToken', response.data.data.token);
    localStorage.setItem('recoveryPersonData', JSON.stringify(response.data.data.recoveryPerson));
    
    return response.data.data;
  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
    throw error;
  }
};

// Complete login flow
const loginRecoveryPerson = async (mobileNumber, otp) => {
  try {
    // Step 1: Send OTP
    await sendOtp(mobileNumber);
    console.log('OTP sent to mobile number');
    
    // Step 2: User enters OTP (in real app, this would be from user input)
    // await verifyOtp(mobileNumber, otp);
    
  } catch (error) {
    console.error('Login failed:', error);
  }
};
```

---

## Frontend Integration Guide

### Step-by-Step Integration

#### 1. Login Screen Setup
Create a login screen with:
- Mobile number input field (10 digits)
- OTP input field (6 digits, initially hidden)
- Send OTP button
- Verify OTP button (shown after OTP is sent)

#### 2. Send OTP Flow
```javascript
// When user clicks "Send OTP"
const handleSendOtp = async () => {
  // Validate mobile number
  if (!/^[0-9]{10}$/.test(mobileNumber)) {
    showError('Please enter a valid 10-digit mobile number');
    return;
  }
  
  // Show loading
  setLoading(true);
  
  // Call send OTP API
  const result = await sendOtp(mobileNumber);
  
  setLoading(false);
  
  if (result) {
    // Show OTP input field
    setOtpSent(true);
    showSuccess('OTP sent successfully');
    
    // Start countdown timer (5 minutes)
    startCountdown(300);
  }
};
```

#### 3. Verify OTP Flow
```javascript
// When user clicks "Verify OTP"
const handleVerifyOtp = async () => {
  // Validate OTP
  if (!/^[0-9]{6}$/.test(otp)) {
    showError('Please enter a valid 6-digit OTP');
    return;
  }
  
  // Show loading
  setLoading(true);
  
  // Call verify OTP API
  const result = await verifyOtp(mobileNumber, otp);
  
  setLoading(false);
  
  if (result) {
    showSuccess('Login successful');
    
    // Navigate to recovery person dashboard
    navigateToDashboard();
  }
};
```

#### 4. Using JWT Token
After successful login, use the token for authenticated requests:

```javascript
// Example: Fetch recovery person profile
const fetchProfile = async () => {
  const token = localStorage.getItem('recoveryPersonToken');
  
  const response = await fetch('http://localhost:5000/api/recovery-person/profile', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  return data;
};
```

---

## Important Notes

1. **Database Verification**: The mobile number must exist in the `RecoveryPerson` collection with `mobileVerified: true` and `isActive: true` to receive OTP.

2. **OTP Expiry**: OTP expires in 5 minutes (300 seconds) by default. This can be configured via `OTP_EXPIRY_MINUTES` environment variable.

3. **Security**: 
   - OTPs are 6-digit random numbers
   - Each OTP can only be used once
   - Expired OTPs are automatically deleted from database
   - Recovery persons must be created by a Recovery Head
   - Only active recovery persons can login

4. **JWT Token**: 
   - Store the JWT token securely (localStorage or secure storage)
   - Include token in Authorization header for all authenticated requests
   - Token contains: recovery person ID, mobile number, role ('RECOVERY_PERSON'), and recovery head ID

5. **Error Handling**: Always handle errors gracefully and show user-friendly messages.

6. **Recovery Person Creation**: Recovery persons are created by Recovery Heads through the `/api/recovery-head/recovery-persons` endpoint. They cannot self-register.

---

## Testing Checklist

- [ ] Test send OTP with valid mobile number (registered recovery person)
- [ ] Test send OTP with unregistered mobile number (should fail)
- [ ] Test send OTP with invalid mobile number format (should fail)
- [ ] Test send OTP with inactive recovery person (should fail)
- [ ] Test verify OTP with correct OTP
- [ ] Test verify OTP with incorrect OTP (should fail)
- [ ] Test verify OTP with expired OTP (should fail)
- [ ] Test verify OTP with invalid OTP format (should fail)
- [ ] Verify JWT token is returned on successful login
- [ ] Verify recovery person data is returned correctly
- [ ] Verify recovery head information is included in response

---

## Related APIs

- **Recovery Head Authentication**: See [recovery_head_auth_api.md](recovery_head_auth_api.md)
- **Recovery Person Management**: See [RECOVERY_PERSON_API_DOCUMENTATION.md](../RECOVERY_PERSON_API_DOCUMENTATION.md)
- **Device Collection**: See [DEVICE_COLLECTION_API_DOCUMENTATION.md](DEVICE_COLLECTION_API_DOCUMENTATION.md)

---

## Support

For any issues or questions regarding this API, please contact the backend development team.
