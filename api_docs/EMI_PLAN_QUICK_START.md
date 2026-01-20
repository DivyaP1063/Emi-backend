# Quick Start Guide - EMI Plan System

## Step 1: Create an EMI Plan

**Endpoint:** `POST /api/admin/plans`

**Example Request:**
```bash
curl -X POST http://localhost:5000/api/admin/plans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
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
  }'
```

**Save the `planId` from the response!**

---

## Step 2: Create a Retailer with Assigned Plan

**Endpoint:** `POST /api/admin/retailers`

**Example Request:**
```bash
curl -X POST http://localhost:5000/api/admin/retailers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
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
    "assignedPlanId": "PLAN_ID_FROM_STEP_1"
  }'
```

**Or assign plan later:**
```bash
curl -X PUT http://localhost:5000/api/admin/retailers/RETAILER_ID/assign-plan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "planId": "PLAN_ID_FROM_STEP_1"
  }'
```

---

## Step 3: Retailer Creates Customer

**Endpoint:** `POST /api/retailer/customers`

**Key Points:**
- Retailer must have an assigned plan
- `numberOfMonths` must be ≤ plan's max months
- EMI is calculated automatically based on plan rates

**Example Calculation:**
- Plan has 8 months with rates: [3%, 3%, 3.5%, 3.5%, 4%, 4%, 4.5%, 4.5%]
- Retailer selects **6 months**
- Summed rate for months 1-6: 3 + 3 + 3.5 + 3.5 + 4 + 4 = **21%**
- Landing price: ₹10,000
- Down payment: ₹2,000
- Balance: ₹8,000
- Total EMI: ₹8,000 × (1 + 21/100) = ₹8,000 × 1.21 = **₹9,680**
- EMI per month: ₹9,680 / 6 = **₹1,613.33**

All 6 EMI months will have equal amount of ₹1,613.33

---

## Step 4: Verify Retailer's Plan

**Endpoint:** `GET /api/retailer/permissions`

**Response will include:**
```json
{
  "assignedPlan": {
    "planId": "...",
    "planName": "Standard 8-Month Plan",
    "monthlyRates": [...],
    "maxMonths": 8,
    "isActive": true
  }
}
```

---

## Testing Checklist

- [ ] Create at least one EMI plan
- [ ] Create a retailer and assign the plan
- [ ] Login as retailer and check permissions endpoint
- [ ] Create a customer with different month selections (e.g., 4, 6, 8 months)
- [ ] Verify EMI calculations are correct
- [ ] Test validation: try creating customer with months > plan's max months
- [ ] Test validation: try creating customer when retailer has no plan assigned

---

## Common Errors

### "No EMI plan assigned to this retailer"
**Solution:** Assign a plan to the retailer using the assign-plan API

### "Selected X months exceeds plan's maximum of Y months"
**Solution:** Reduce `numberOfMonths` to be within the plan's limit

### "EMI plan not found" or "PLAN_NOT_FOUND"
**Solution:** Verify the planId is correct and the plan exists

### "Cannot assign inactive plan"
**Solution:** Ensure the plan's `isActive` is `true`

---

## Sample Plans

### Conservative Plan (Lower Rates)
```json
{
  "planName": "Conservative 6-Month Plan",
  "monthlyRates": [
    { "month": 1, "rate": 2.5 },
    { "month": 2, "rate": 2.5 },
    { "month": 3, "rate": 3 },
    { "month": 4, "rate": 3 },
    { "month": 5, "rate": 3.5 },
    { "month": 6, "rate": 3.5 }
  ]
}
```

### Aggressive Plan (Higher Rates)
```json
{
  "planName": "Premium 12-Month Plan",
  "monthlyRates": [
    { "month": 1, "rate": 3 },
    { "month": 2, "rate": 3 },
    { "month": 3, "rate": 3.5 },
    { "month": 4, "rate": 3.5 },
    { "month": 5, "rate": 4 },
    { "month": 6, "rate": 4 },
    { "month": 7, "rate": 4.5 },
    { "month": 8, "rate": 4.5 },
    { "month": 9, "rate": 5 },
    { "month": 10, "rate": 5 },
    { "month": 11, "rate": 5.5 },
    { "month": 12, "rate": 5.5 }
  ]
}
```

### Flat Rate Plan
```json
{
  "planName": "Flat 3% - 8 Months",
  "monthlyRates": [
    { "month": 1, "rate": 3 },
    { "month": 2, "rate": 3 },
    { "month": 3, "rate": 3 },
    { "month": 4, "rate": 3 },
    { "month": 5, "rate": 3 },
    { "month": 6, "rate": 3 },
    { "month": 7, "rate": 3 },
    { "month": 8, "rate": 3 }
  ]
}
```
