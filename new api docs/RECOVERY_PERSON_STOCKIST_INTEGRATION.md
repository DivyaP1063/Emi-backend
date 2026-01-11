# Recovery Person App - Stockist Integration APIs

## Overview

This document covers the **new and updated APIs** that need to be integrated into the Recovery Person app for the stockist workflow feature.

---

## What's New

1. **Submit Device to Stockist** - New API to submit collected devices
2. **Updated Dashboard Stats** - Now includes submitted devices count

---

## 1. Submit Device to Stockist (NEW)

**Endpoint**: `POST /api/recovery-person/submit-to-stockist`

**When to Use**: After a device is collected, show a "Submit to Stockist" button/option

**Authentication**: Required (Recovery Person JWT)

### Request

**Headers**:
```
Authorization: Bearer <recovery-person-jwt-token>
Content-Type: application/json
```

**Body**:
```json
{
  "customerId": "6952d1151709de3521e201cb",
  "notes": "Device in good condition, customer promised to come within 5 days"
}
```

**Parameters**:
- `customerId` (required): The customer ID whose device is being submitted
- `notes` (optional): Any additional notes about the device/customer

> **Note**: You don't need to provide `stockistId`. The system automatically submits to the active stockist.

### Response

**Success (200 OK)**:
```json
{
  "success": true,
  "message": "Device submitted to stockist successfully",
  "data": {
    "submissionId": "6952d1151709de3521e201cd",
    "customerId": "6952d1151709de3521e201cb",
    "customerName": "Ravi Tiwari",
    "deviceInfo": {
      "productName": "Samsung Galaxy A14",
      "imei1": "123456789012345"
    },
    "stockist": {
      "stockistId": "6952d1151709de3521e201cc",
      "shopName": "Mobile Point",
      "mobileNumber": "9876543210"
    },
    "submittedAt": "2026-01-11T15:30:00.000Z",
    "paymentDeadline": "2026-01-16T00:00:00.000Z"
  }
}
```

### Error Responses

**Device Not Collected (400)**:
```json
{
  "success": false,
  "message": "Device has not been collected yet",
  "error": "DEVICE_NOT_COLLECTED"
}
```

**Already Submitted (400)**:
```json
{
  "success": false,
  "message": "Device has already been submitted to stockist",
  "error": "ALREADY_SUBMITTED",
  "data": {
    "submittedAt": "2026-01-11T15:30:00.000Z"
  }
}
```

**Not Authorized (403)**:
```json
{
  "success": false,
  "message": "This customer is not assigned to you",
  "error": "NOT_AUTHORIZED"
}
```

**No Stockist Found (404)**:
```json
{
  "success": false,
  "message": "No active stockist found in the system",
  "error": "STOCKIST_NOT_FOUND"
}
```

---

## 2. Get Dashboard Stats (UPDATED)

**Endpoint**: `GET /api/recovery-person/dashboard`

**What Changed**: Added `totalSubmittedToStockist` field

**Authentication**: Required (Recovery Person JWT)

### Request

**Headers**:
```
Authorization: Bearer <recovery-person-jwt-token>
```

### Response

**Success (200 OK)**:
```json
{
  "success": true,
  "message": "Dashboard statistics fetched successfully",
  "data": {
    "totalAssigned": 15,
    "totalCollected": 8,
    "totalReturned": 3,
    "totalSubmittedToStockist": 5
  }
}
```

**Fields**:
- `totalAssigned`: Total customers currently assigned
- `totalCollected`: Total devices collected
- `totalReturned`: Total devices returned (customer paid and took device)
- `totalSubmittedToStockist`: **NEW** - Total devices submitted to stockist

---

## UI/UX Integration Guide

### 1. Customer Detail Screen

**Add "Submit to Stockist" Button**:
- Show this button only if:
  - `isCollected === true`
  - `submittedToStockist === false`
- Button should be prominent (e.g., primary color)
- Label: "Submit to Stockist" or "Send to Stockist"

**Button Action**:
```javascript
async function submitToStockist(customerId, notes) {
  try {
    const response = await fetch('/api/recovery-person/submit-to-stockist', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customerId,
        notes
      })
    });

    const result = await response.json();
    
    if (result.success) {
      // Show success message
      showSuccess(`Device submitted to ${result.data.stockist.shopName}`);
      
      // Refresh customer list or navigate back
      navigateToCustomerList();
    } else {
      // Show error message
      showError(result.message);
    }
  } catch (error) {
    showError('Failed to submit device. Please try again.');
  }
}
```

**Optional: Add Notes Dialog**:
Before submitting, show a dialog to collect optional notes:
```
┌─────────────────────────────────────┐
│ Submit to Stockist                  │
├─────────────────────────────────────┤
│                                     │
│ Customer: Ravi Tiwari               │
│ Device: Samsung Galaxy A14          │
│                                     │
│ Notes (optional):                   │
│ ┌─────────────────────────────────┐ │
│ │ Device in good condition        │ │
│ └─────────────────────────────────┘ │
│                                     │
│  [Cancel]  [Submit to Stockist]    │
└─────────────────────────────────────┘
```

### 2. Dashboard Screen

**Update Statistics Cards**:

Add a new card for submitted devices:

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Total Assigned   │  │ Total Collected  │  │ Total Returned   │
│       15         │  │        8         │  │        3         │
└──────────────────┘  └──────────────────┘  └──────────────────┘

┌──────────────────┐
│ Submitted to     │  ← NEW CARD
│   Stockist       │
│        5         │
└──────────────────┘
```

**Update Dashboard API Call**:
```javascript
async function fetchDashboardStats() {
  const response = await fetch('/api/recovery-person/dashboard', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const { data } = await response.json();
  
  // Update UI
  updateStatCard('assigned', data.totalAssigned);
  updateStatCard('collected', data.totalCollected);
  updateStatCard('returned', data.totalReturned);
  updateStatCard('submitted', data.totalSubmittedToStockist); // NEW
}
```

### 3. Customer List Screen

**Visual Indicator for Submitted Devices**:

Add a badge/chip to show submission status:

```
┌─────────────────────────────────────────────┐
│ Ravi Tiwari                                 │
│ Samsung Galaxy A14 • 9876543210             │
│ [Collected ✓] [Submitted to Stockist ✓]    │ ← NEW BADGE
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Suresh Kumar                                │
│ Redmi Note 10 • 9123456789                  │
│ [Collected ✓]                               │ ← Not submitted yet
└─────────────────────────────────────────────┘
```

**Filter Options** (Optional):
Add filter to show only submitted/not submitted devices:
- All Collected Devices
- Submitted to Stockist
- Not Yet Submitted

---

## Testing Checklist

- [ ] Submit button appears only for collected devices
- [ ] Submit button hidden for already submitted devices
- [ ] Submission shows success message with stockist details
- [ ] Dashboard shows updated submitted count after submission
- [ ] Error messages display correctly
- [ ] Customer list updates after submission
- [ ] Notes field works correctly (optional)
- [ ] Network errors handled gracefully

---

## Example Flow

1. **Recovery Person collects device**
   - Uses existing collect device API
   - Device marked as `isCollected: true`

2. **Submit to Stockist button appears**
   - Recovery person clicks "Submit to Stockist"
   - Optional: Enters notes in dialog
   - Confirms submission

3. **API Call**
   - POST to `/api/recovery-person/submit-to-stockist`
   - System automatically finds stockist
   - Creates submission record

4. **Success Response**
   - Show success message: "Device submitted to Mobile Point"
   - Update customer status
   - Refresh dashboard stats

5. **Dashboard Updates**
   - `totalSubmittedToStockist` count increases
   - Customer shows "Submitted" badge

---

## API Constants (for your API service)

```javascript
// Add these to your API constants file
export const API_ENDPOINTS = {
  // ... existing endpoints
  
  // NEW: Stockist submission
  SUBMIT_TO_STOCKIST: '/api/recovery-person/submit-to-stockist',
  
  // EXISTING: Dashboard (no change to endpoint, just response)
  DASHBOARD_STATS: '/api/recovery-person/dashboard'
};
```

---

## Questions?

If you need clarification on any endpoint or have integration questions, please reach out!
