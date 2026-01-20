# Postman Testing Guide - EMI Plan System

## Prerequisites

1. **Start your server:** `npm start` or `node src/server.js`
2. **Get Admin Token:** Login as admin first to get your authentication token
3. **Base URL:** `http://localhost:5000` (or your server URL)

---

## Step 1: Admin Login (Get Token)

**Request:**
- **Method:** POST
- **URL:** `http://localhost:5000/api/admin/auth/send-otp`
- **Headers:** `Content-Type: application/json`
- **Body (raw JSON):**
```json
{
  "mobileNumber": "YOUR_ADMIN_MOBILE"
}
```

**Then verify OTP:**
- **Method:** POST
- **URL:** `http://localhost:5000/api/admin/auth/verify-otp`
- **Body:**
```json
{
  "mobileNumber": "YOUR_ADMIN_MOBILE",
  "otp": "123456"
}
```

**Save the `token` from response!** You'll need it for all admin requests.

---

## Step 2: Create an EMI Plan

**Request:**
- **Method:** POST
- **URL:** `http://localhost:5000/api/admin/plans`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer YOUR_ADMIN_TOKEN`
- **Body (raw JSON):**
```json
{
  "planName": "Standard 8-Month Plan",
  "monthlyRates": [
    { "month": 1, "rate": 3 },
    { "month": 2, "rate": 3 },
    { "month": 3, "rate": 3.5 },
    { "month": 4, "rate": 3.5 },
    { "month": 5, "rate": 4 },
    { "month": 6, "rate": 4 },
    { "month": 7, "rate": 4.5 },
    { "month": 8, "rate": 4.5 }
  ]
}
```

**Response Example:**
```json
{
  "success": true,
  "message": "EMI plan created successfully",
  "data": {
    "planId": "679abc123def456789012345",
    "planName": "Standard 8-Month Plan",
    "monthlyRates": [...],
    "maxMonths": 8,
    "isActive": true,
    "createdAt": "2026-01-20T15:45:00.000Z"
  }
}
```

**📝 Copy the `planId` - you'll need it to assign to retailers!**

---

## Step 3: View All Plans (Admin)

**Request:**
- **Method:** GET
- **URL:** `http://localhost:5000/api/admin/plans`
- **Headers:**
  - `Authorization: Bearer YOUR_ADMIN_TOKEN`

**Optional Query Parameters:**
- `?page=1` - Page number (default: 1)
- `?limit=10` - Items per page (default: 10)
- `?isActive=true` - Filter by active status
- `?search=Standard` - Search by plan name

**Example URLs:**
```
http://localhost:5000/api/admin/plans
http://localhost:5000/api/admin/plans?page=1&limit=20
http://localhost:5000/api/admin/plans?isActive=true
http://localhost:5000/api/admin/plans?search=Standard
```

**Response Example:**
```json
{
  "success": true,
  "message": "EMI plans fetched successfully",
  "data": {
    "plans": [
      {
        "planId": "679abc123def456789012345",
        "planName": "Standard 8-Month Plan",
        "monthlyRates": [
          { "month": 1, "rate": 3 },
          { "month": 2, "rate": 3 },
          ...
        ],
        "maxMonths": 8,
        "isActive": true,
        "createdAt": "2026-01-20T15:45:00.000Z",
        "updatedAt": "2026-01-20T15:45:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalPlans": 1,
      "limit": 10
    }
  }
}
```

---

## Step 4: View Single Plan Details

**Request:**
- **Method:** GET
- **URL:** `http://localhost:5000/api/admin/plans/PLAN_ID`
- **Headers:**
  - `Authorization: Bearer YOUR_ADMIN_TOKEN`

**Example:**
```
http://localhost:5000/api/admin/plans/679abc123def456789012345
```

---

## Step 5: Create Retailer with Plan Assignment

**Option A: Assign Plan During Retailer Creation**

**Request:**
- **Method:** POST
- **URL:** `http://localhost:5000/api/admin/retailers`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer YOUR_ADMIN_TOKEN`
- **Body (raw JSON):**
```json
{
  "basicInfo": {
    "fullName": "John Doe",
    "email": "john@example.com",
    "mobileNumber": "9876543210",
    "shopName": "John Mobile Shop"
  },
  "address": {
    "country": "India",
    "state": "Maharashtra",
    "city": "Mumbai",
    "address": "123 Main Street"
  },
  "permissions": {
    "canPayEmiDownPayment": true,
    "dpPending": false,
    "autoLockDay": 30,
    "serverAadharVerify": true,
    "allowElectronic": true,
    "allowIPhone": false
  },
  "assignedPlanId": "679abc123def456789012345"
}
```

**📝 Replace `assignedPlanId` with your actual plan ID from Step 2!**

---

## Step 6: Assign Plan to Existing Retailer

**Option B: Assign Plan to Retailer Later**

**Request:**
- **Method:** PUT
- **URL:** `http://localhost:5000/api/admin/retailers/RETAILER_ID/assign-plan`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer YOUR_ADMIN_TOKEN`
- **Body (raw JSON):**
```json
{
  "planId": "679abc123def456789012345"
}
```

**Example URL:**
```
http://localhost:5000/api/admin/retailers/679def456abc789012345678/assign-plan
```

**Response Example:**
```json
{
  "success": true,
  "message": "Plan assigned to retailer successfully",
  "data": {
    "retailerId": "679def456abc789012345678",
    "retailerName": "John Doe",
    "assignedPlan": {
      "planId": "679abc123def456789012345",
      "planName": "Standard 8-Month Plan",
      "monthlyRates": [...],
      "maxMonths": 8
    }
  }
}
```

---

## Step 7: View All Retailers (with Plan Info)

**Request:**
- **Method:** GET
- **URL:** `http://localhost:5000/api/admin/retailers`
- **Headers:**
  - `Authorization: Bearer YOUR_ADMIN_TOKEN`

**Response will include assigned plan for each retailer:**
```json
{
  "success": true,
  "data": {
    "retailers": [
      {
        "retailerId": "679def456abc789012345678",
        "fullName": "John Doe",
        "email": "john@example.com",
        "mobileNumber": "9876543210",
        "shopName": "John Mobile Shop",
        "city": "Mumbai",
        "state": "Maharashtra",
        "status": "ACTIVE",
        "assignedPlan": {
          "planId": "679abc123def456789012345",
          "planName": "Standard 8-Month Plan",
          "maxMonths": 8,
          "isActive": true
        },
        "createdAt": "2026-01-20T15:50:00.000Z"
      }
    ]
  }
}
```

---

## Step 8: Retailer Login and Check Plan

**Retailer sends OTP:**
- **Method:** POST
- **URL:** `http://localhost:5000/api/retailer/auth/send-otp`
- **Body:**
```json
{
  "mobileNumber": "9876543210"
}
```

**Retailer verifies OTP:**
- **Method:** POST
- **URL:** `http://localhost:5000/api/retailer/auth/verify-otp`
- **Body:**
```json
{
  "mobileNumber": "9876543210",
  "otp": "123456"
}
```

**Save the retailer token!**

---

## Step 9: Retailer Views Assigned Plan

**Request:**
- **Method:** GET
- **URL:** `http://localhost:5000/api/retailer/permissions`
- **Headers:**
  - `Authorization: Bearer RETAILER_TOKEN`

**Response:**
```json
{
  "success": true,
  "message": "Permissions fetched successfully",
  "data": {
    "retailerId": "679def456abc789012345678",
    "permissions": {
      "canPayEmiDownPayment": true,
      "dpPending": false,
      "autoLockDay": 30,
      "serverAadharVerify": true,
      "allowElectronic": true,
      "allowIPhone": false
    },
    "assignedPlan": {
      "planId": "679abc123def456789012345",
      "planName": "Standard 8-Month Plan",
      "monthlyRates": [
        { "month": 1, "rate": 3 },
        { "month": 2, "rate": 3 },
        { "month": 3, "rate": 3.5 },
        { "month": 4, "rate": 3.5 },
        { "month": 5, "rate": 4 },
        { "month": 6, "rate": 4 },
        { "month": 7, "rate": 4.5 },
        { "month": 8, "rate": 4.5 }
      ],
      "maxMonths": 8,
      "isActive": true
    }
  }
}
```

---

## Step 10: Create Customer with Plan-Based EMI

**Request:**
- **Method:** POST
- **URL:** `http://localhost:5000/api/retailer/customers`
- **Headers:**
  - `Authorization: Bearer RETAILER_TOKEN`
  - `Content-Type: multipart/form-data`

**Form Data:**
```
fullName: Rajesh Kumar
aadharNumber: 123456789012
dob: 1990-01-15
mobileNumber: 9123456789
pincode: 400001
imei1: 123456789012345
fatherName: Suresh Kumar
village: Andheri
nearbyLocation: Near Railway Station
post: Andheri West
district: Mumbai
branch: Mumbai Branch
phoneType: NEW
model: Samsung Galaxy A54
productName: Samsung Galaxy A54 5G
sellPrice: 35000
landingPrice: 32000
downPayment: 5000
downPaymentPending: 0
numberOfMonths: 6

customerPhoto: [file]
aadharFront: [file]
aadharBack: [file]
signature: [file]
```

**📝 Important:** `numberOfMonths: 6` means selecting 6 months from the 8-month plan

**EMI Calculation (Automatic):**
- Plan rates for months 1-6: 3% + 3% + 3.5% + 3.5% + 4% + 4% = **21%**
- Balance: ₹32,000 - ₹5,000 = **₹27,000**
- Total EMI: ₹27,000 × 1.21 = **₹32,670**
- Per month: ₹32,670 / 6 = **₹5,445**

All 6 EMI months will have equal amount of ₹5,445

---

## Common Postman Tips

### Setting Up Authorization Header
1. Go to the **Headers** tab
2. Add key: `Authorization`
3. Add value: `Bearer YOUR_TOKEN_HERE`

### Using Environment Variables (Recommended)
1. Create a new environment in Postman
2. Add variables:
   - `baseUrl`: `http://localhost:5000`
   - `adminToken`: (paste your admin token)
   - `retailerToken`: (paste your retailer token)
   - `planId`: (paste your plan ID)
   - `retailerId`: (paste your retailer ID)
3. Use in requests: `{{baseUrl}}/api/admin/plans`

### Saving Responses
After each request, copy important IDs:
- Plan ID from Step 2
- Retailer ID from Step 5
- Tokens from login steps

---

## Testing Checklist

- [ ] Admin login and get token
- [ ] Create EMI plan
- [ ] View all plans
- [ ] View single plan details
- [ ] Create retailer with plan assignment
- [ ] OR assign plan to existing retailer
- [ ] View all retailers (verify plan is shown)
- [ ] Retailer login
- [ ] Retailer views permissions (verify plan details)
- [ ] Create customer with 4 months
- [ ] Create customer with 6 months
- [ ] Create customer with 8 months
- [ ] Try creating customer with 10 months (should fail)

---

## Error Testing

### Test 1: Create customer without plan assigned
- Remove plan from retailer
- Try creating customer
- **Expected:** Error "No EMI plan assigned to this retailer"

### Test 2: Exceed plan months
- Retailer has 8-month plan
- Try `numberOfMonths: 10`
- **Expected:** Error "Selected 10 months exceeds plan's maximum of 8 months"

### Test 3: Assign inactive plan
- Delete a plan (makes it inactive)
- Try assigning to retailer
- **Expected:** Error "Cannot assign inactive plan"

### Test 4: Delete plan in use
- Assign plan to active retailer
- Try deleting the plan
- **Expected:** Error "Cannot delete plan. It is assigned to X active retailer(s)"
