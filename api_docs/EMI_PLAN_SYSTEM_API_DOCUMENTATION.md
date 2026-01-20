# EMI Plan System API Documentation

## Admin APIs - Plan Management

### Create EMI Plan
**POST** `/api/admin/plans`

**Headers:**
- `Authorization: Bearer <admin_token>`

**Request Body:**
```json
{
  "planName": "Standard Plan",
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

**Response:**
```json
{
  "success": true,
  "message": "EMI plan created successfully",
  "data": {
    "planId": "plan_id",
    "planName": "Standard Plan",
    "monthlyRates": [...],
    "maxMonths": 8,
    "isActive": true,
    "createdAt": "2026-01-20T..."
  }
}
```

---

### Get All Plans
**GET** `/api/admin/plans`

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 10)
- `isActive` (filter by active status)
- `search` (search by plan name)

**Response:**
```json
{
  "success": true,
  "message": "EMI plans fetched successfully",
  "data": {
    "plans": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalPlans": 5,
      "limit": 10
    }
  }
}
```

---

### Get Plan by ID
**GET** `/api/admin/plans/:planId`

---

### Update Plan
**PUT** `/api/admin/plans/:planId`

**Request Body:** Same as Create Plan

---

### Delete Plan
**DELETE** `/api/admin/plans/:planId`

**Note:** Cannot delete if assigned to active retailers

---

## Admin APIs - Retailer Plan Assignment

### Assign Plan to Retailer
**PUT** `/api/admin/retailers/:retailerId/assign-plan`

**Request Body:**
```json
{
  "planId": "plan_object_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Plan assigned to retailer successfully",
  "data": {
    "retailerId": "retailer_id",
    "retailerName": "Retailer Name",
    "assignedPlan": {
      "planId": "plan_id",
      "planName": "Standard Plan",
      "monthlyRates": [...],
      "maxMonths": 8
    }
  }
}
```

---

### Create Retailer with Plan
**POST** `/api/admin/retailers`

**Request Body:**
```json
{
  "basicInfo": { ... },
  "address": { ... },
  "permissions": { ... },
  "assignedPlanId": "plan_object_id"  // Optional
}
```

---

### Get All Retailers
**GET** `/api/admin/retailers`

**Response includes assigned plan details:**
```json
{
  "retailers": [{
    ...
    "assignedPlan": {
      "planId": "plan_id",
      "planName": "Standard Plan",
      "maxMonths": 8,
      "isActive": true
    }
  }]
}
```

---

## Retailer APIs

### Get Permissions
**GET** `/api/retailer/permissions`

**Response:**
```json
{
  "success": true,
  "message": "Permissions fetched successfully",
  "data": {
    "retailerId": "retailer_id",
    "permissions": { ... },
    "assignedPlan": {
      "planId": "plan_id",
      "planName": "Standard Plan",
      "monthlyRates": [
        { "month": 1, "rate": 3 },
        { "month": 2, "rate": 3 },
        ...
      ],
      "maxMonths": 8,
      "isActive": true
    }
  }
}
```

---

### Create Customer
**POST** `/api/retailer/customers`

**Changes:**
- `numberOfMonths` is validated against the retailer's assigned plan
- EMI calculation uses plan's summed rates instead of fixed 3%
- All EMI months have equal amounts

**EMI Calculation Logic:**
1. Get retailer's assigned plan
2. Validate `numberOfMonths` ≤ plan's max months
3. Sum rates for months 1 to `numberOfMonths`
4. Calculate: `totalEmiAmount = balanceAmount × (1 + summedRate/100)`
5. Calculate: `emiPerMonth = totalEmiAmount / numberOfMonths`
6. All EMI months get equal `emiPerMonth` amount

**Example:**
- Plan rates: [3%, 3%, 3.5%, 3.5%, 4%, 4%, 4.5%, 4.5%]
- Selected: 6 months
- Summed rate: 3 + 3 + 3.5 + 3.5 + 4 + 4 = 21%
- Balance: ₹8,000
- Total EMI: ₹8,000 × 1.21 = ₹9,680
- Per month: ₹9,680 / 6 = ₹1,613.33

---

## Database Schema Changes

### EmiPlan Model (NEW)
```javascript
{
  planName: String,
  monthlyRates: [{
    month: Number,
    rate: Number
  }],
  isActive: Boolean
}
```

### Retailer Model (UPDATED)
```javascript
{
  // Removed: permissions.allow4Month, permissions.allow8Month
  // Added:
  assignedPlanId: ObjectId (ref: 'EmiPlan')
}
```

### Customer Model (UPDATED)
```javascript
{
  emiDetails: {
    // Removed: emiRate
    // Added:
    selectedMonthCount: Number,
    appliedPlanId: ObjectId (ref: 'EmiPlan'),
    // emiMonths[].amount is now equal for all months
  }
}
```

---

## Migration Notes

Existing customers need to be migrated:
1. Create default plans based on old `allow4Month` and `allow8Month` settings
2. Assign plans to retailers
3. Update existing customers to reference the plan used

Migration script: `scripts/migratePlans.js` (to be created)
