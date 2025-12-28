# Recovery System - Complete Guide (Updated)

## Overview

The recovery system manages device recovery for customers with overdue EMI payments. The system uses a hierarchical structure where **Recovery Persons** (assigned by pincodes) handle actual device collection under **Recovery Heads**.

---

## System Hierarchy

```
Admin
  ↓
Recovery Head (created by Admin)
  ↓
Recovery Person (created by Recovery Head, has pincodes)
  ↓
Customer (auto-assigned by cron job based on pincode matching)
```

---

## Data Models

### 1. RecoveryHead

**Purpose**: Manages a team of recovery persons

```javascript
{
  fullName: String,
  mobileNumber: String (10 digits, unique),
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED',
  createdAt: Date,
  updatedAt: Date
}
```

**Key Changes**: 
- ❌ Removed `pinCodes` field
- ✅ Now only has basic info (name, mobile, status)

---

### 2. RecoveryPerson

**Purpose**: Assigned to specific pincodes, collects devices from customers

```javascript
{
  fullName: String,
  mobileNumber: String (10 digits, unique),
  pinCodes: [String], // Array of 6-digit pincodes (min 1 required)
  recoveryHeadId: ObjectId (ref: RecoveryHead),
  customers: [ObjectId], // Array of assigned customer IDs
  mobileVerified: Boolean,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

**Key Changes**:
- ✅ Added `pinCodes` field (array of 6-digit strings)
- ❌ Removed `aadharNumber` field
- ✅ Maintains `customers` array for quick lookup

---

### 3. Customer

**Purpose**: Customer with EMI details and device information

```javascript
{
  fullName: String,
  mobileNumber: String,
  address: {
    pincode: String (6 digits) // Used for assignment matching
  },
  isLocked: Boolean,
  isCollected: Boolean,
  assigned: Boolean, // Quick flag to check if assigned
  emiDetails: {
    emiMonths: [{
      month: Number,
      dueDate: Date,
      paid: Boolean
    }]
  },
  deviceCollection: {
    deviceFrontImage: String,
    deviceBackImage: String,
    devicePin: String,
    paymentDeadline: Date,
    collectedBy: ObjectId (ref: RecoveryPerson)
  }
}
```

**Key Changes**:
- ✅ Added back `assigned` boolean flag (for quick queries)
- ❌ Removed `assignedTo`, `assignedToRecoveryHeadId`, `assignedAt`
- ✅ Assignment details now in RecoveryHeadAssignment collection

---

### 4. RecoveryHeadAssignment

**Purpose**: Tracks customer assignments to recovery persons

```javascript
{
  recoveryHeadId: ObjectId (ref: RecoveryHead),
  recoveryHeadName: String,
  recoveryPersonId: ObjectId (ref: RecoveryPerson),
  recoveryPersonName: String,
  customerId: ObjectId (ref: Customer),
  customerName: String,
  status: 'ACTIVE' | 'INACTIVE',
  assignedAt: Date,
  unassignedAt: Date
}
```

**Purpose**: Central source of truth for all assignments

---

## Complete Flow

### Step 1: Admin Creates Recovery Head

**API**: `POST /api/admin/recovery-heads`

**Request**:
```json
{
  "fullName": "Rajesh Kumar",
  "mobileNumber": "9876543210"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "recoveryHeadId": "...",
    "fullName": "Rajesh Kumar",
    "mobileNumber": "9876543210",
    "status": "ACTIVE"
  }
}
```

---

### Step 2: Recovery Head Logs In

**API**: `POST /api/recovery-head/send-otp`

**Request**:
```json
{
  "mobileNumber": "9876543210"
}
```

**API**: `POST /api/recovery-head/verify-otp`

**Request**:
```json
{
  "mobileNumber": "9876543210",
  "otp": "123456"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "token": "jwt_token_here",
    "recoveryHead": {
      "recoveryHeadId": "...",
      "fullName": "Rajesh Kumar",
      "mobileNumber": "9876543210"
    }
  }
}
```

---

### Step 3: Recovery Head Creates Recovery Person

**API**: `POST /api/recovery-head/recovery-persons`

**Headers**: `Authorization: Bearer <token>`

**Request**:
```json
{
  "fullName": "Amit Singh",
  "mobileNumber": "9988776655",
  "pinCodes": ["221001", "221002", "221005"]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "recoveryPersonId": "...",
    "fullName": "Amit Singh",
    "mobileNumber": "9988776655",
    "pinCodes": ["221001", "221002", "221005"],
    "mobileVerified": true,
    "isActive": true,
    "recoveryHead": {
      "recoveryHeadId": "...",
      "fullName": "Rajesh Kumar",
      "mobileNumber": "9876543210"
    },
    "assignedCustomersCount": 0
  }
}
```

---

### Step 4: Cron Job Auto-Assigns Customers

**Trigger**: Runs every 12 hours

**Logic**:
1. Find eligible customers:
   - `isLocked: true`
   - `isCollected: false`
   - `assigned: false`
   - EMI overdue by 5+ days

2. For each customer:
   - Match customer's pincode with recovery person's pincodes
   - If multiple matches, select recovery person with **least customers** (load balancing)
   - Create `RecoveryHeadAssignment` record
   - Set `Customer.assigned = true`
   - Add customer to `RecoveryPerson.customers` array

**Example Assignment**:
```
Customer: Suresh (pincode: 221001, 8 days overdue)
↓
Matching Recovery Persons:
- Amit Singh (pincode: 221001, 10 customers)
- Vikram Sharma (pincode: 221001, 15 customers)
↓
Selected: Amit Singh (least customers)
↓
Actions:
1. Create RecoveryHeadAssignment
2. Set Customer.assigned = true
3. Add to Amit's customers array
```

---

### Step 5: Recovery Person Collects Device

**API**: `POST /api/recovery-person/collect-device/:customerId`

**Headers**: `Authorization: Bearer <recovery_person_token>`

**Request** (multipart/form-data):
```
deviceFrontImage: <file>
deviceBackImage: <file>
devicePin: "1234"
paymentDeadline: "2025-01-15"
notes: "Device collected from home"
```

**Response**:
```json
{
  "success": true,
  "message": "Device collected successfully",
  "data": {
    "customerId": "...",
    "isCollected": true,
    "collectedAt": "2025-12-29T00:00:00Z"
  }
}
```

---

## All API Endpoints

### Admin APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/recovery-heads` | Create recovery head |
| GET | `/api/admin/recovery-heads` | Get all recovery heads |
| POST | `/api/admin/recovery-heads/assign-customers` | Manually trigger assignment |

---

### Recovery Head APIs

#### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/recovery-head/send-otp` | Send OTP to mobile |
| POST | `/api/recovery-head/verify-otp` | Verify OTP and login |

#### Recovery Person Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/recovery-head/recovery-persons` | Create recovery person |
| GET | `/api/recovery-head/recovery-persons` | Get all recovery persons |

#### Dashboard & Statistics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/recovery-head/statistics` | Get statistics |
| GET | `/api/recovery-head/assigned-customers` | Get all assigned customers |
| GET | `/api/recovery-head/collected-customers` | Get collected customers |
| GET | `/api/recovery-head/recovery-persons-with-customers` | Get recovery persons with customer details |

**Statistics Response**:
```json
{
  "totalRecoveryPersons": 5,
  "totalAssignedCustomers": 45,
  "pendingCollections": 28,
  "totalDevicesCollected": 17,
  "collectionRate": "37.78"
}
```

---

### Recovery Person APIs

#### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/recovery-person/send-otp` | Send OTP to mobile |
| POST | `/api/recovery-person/verify-otp` | Verify OTP and login |

#### Device Collection
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/recovery-person/assigned-customers` | Get assigned customers |
| POST | `/api/recovery-person/collect-device/:customerId` | Collect device |
| GET | `/api/recovery-person/dashboard-stats` | Get dashboard statistics |
| GET | `/api/recovery-person/customer/:customerId` | Get customer details |
| GET | `/api/recovery-person/customer/:customerId/location` | Get customer location |

---

## Cron Job Details

**File**: `src/cron/emiReminderCron.js`

**Schedule**: Every 12 hours

**Function**: `assignCustomersToRecoveryPersons`

**Process**:

1. **Find Eligible Customers**:
   ```javascript
   - isLocked: true
   - isCollected: false
   - assigned: false
   - EMI overdue by 5+ days
   ```

2. **Pincode Matching**:
   ```javascript
   const matchingRecoveryPersons = await RecoveryPerson.find({
     isActive: true,
     pinCodes: customerPincode
   });
   ```

3. **Load Balancing**:
   ```javascript
   // Select recovery person with least customers
   let minCustomerCount = Infinity;
   for (const rp of matchingRecoveryPersons) {
     if (rp.customers.length < minCustomerCount) {
       selectedRecoveryPerson = rp;
       minCustomerCount = rp.customers.length;
     }
   }
   ```

4. **Create Assignment**:
   ```javascript
   // Create RecoveryHeadAssignment
   await RecoveryHeadAssignment.create({...});
   
   // Set customer.assigned = true
   await Customer.findByIdAndUpdate(customerId, { assigned: true });
   
   // Add to recovery person's customers array
   await RecoveryPerson.findByIdAndUpdate(rpId, {
     $addToSet: { customers: customerId }
   });
   ```

---

## Business Rules

### Assignment Rules

1. **Eligibility**: Customer must be:
   - Device locked (`isLocked: true`)
   - Not collected (`isCollected: false`)
   - Not already assigned (`assigned: false`)
   - EMI overdue by 5+ days

2. **Pincode Matching**: Customer's pincode must match at least one of recovery person's pincodes

3. **Load Balancing**: If multiple recovery persons match, assign to the one with fewest customers

4. **No Match**: If no recovery person matches the pincode, customer remains unassigned

### Collection Rules

1. Only assigned recovery person can collect device
2. Must upload device images (front & back)
3. Must provide device PIN
4. Must set payment deadline
5. Once collected, `isCollected` set to true

---

## Query Examples

### Find Unassigned Locked Customers
```javascript
const unassigned = await Customer.find({
  isLocked: true,
  assigned: false,
  isCollected: false
});
```

### Find Which Recovery Person Has a Customer
```javascript
const assignment = await RecoveryHeadAssignment.findOne({
  customerId: customerId,
  status: 'ACTIVE'
}).populate('recoveryPersonId');
```

### Find All Customers for a Recovery Person
```javascript
const recoveryPerson = await RecoveryPerson.findById(rpId)
  .populate('customers');
```

### Get Recovery Head's Statistics
```javascript
const assignments = await RecoveryHeadAssignment.find({
  recoveryHeadId: rhId,
  status: 'ACTIVE'
});

const customerIds = assignments.map(a => a.customerId);
const collected = await Customer.countDocuments({
  _id: { $in: customerIds },
  isCollected: true
});
```

---

## Key Differences from Old System

| Aspect | Old System | New System |
|--------|-----------|------------|
| **Pincode Assignment** | Recovery Head had pincodes | Recovery Person has pincodes |
| **Assignment Target** | Customers assigned to Recovery Head | Customers assigned to Recovery Person |
| **Assignment Storage** | Customer model fields | RecoveryHeadAssignment collection |
| **Load Balancing** | None | Assigns to person with least customers |
| **Quick Queries** | Used Customer.assigned field | Still uses Customer.assigned field |
| **Detailed Info** | Stored in Customer | Stored in RecoveryHeadAssignment |

---

## Summary

The updated recovery system provides:

✅ **Better Hierarchy**: Recovery persons (not heads) handle actual recovery  
✅ **Geographic Assignment**: Pincode-based matching  
✅ **Load Balancing**: Even distribution of customers  
✅ **Efficient Queries**: Simple `assigned` flag + detailed RecoveryHeadAssignment  
✅ **Scalability**: Easy to add more recovery persons per area  
✅ **Tracking**: Complete assignment history in dedicated collection
