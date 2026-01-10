# Private App Uploader - Implementation Guide

## Overview

A web-based interface for uploading private APKs to Managed Google Play using AMAPI web tokens and iframe embedding.

---

## Files Added/Modified

### 1. `public/index.html` (NEW)
Modern styled webpage with:
- Dark gradient theme
- Token input field
- Embedded Google Play iframe
- Step-by-step instructions
- Auto token generation button

### 2. `src/server.js` (MODIFIED)
```javascript
// Added static file serving
const path = require('path');
app.use(express.static(path.join(__dirname, '../public')));

// Updated helmet CSP to allow Google Play iframe
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      frameSrc: ["'self'", "https://play.google.com"],
    },
  },
}));
```

### 3. `src/services/androidManagementService.js` (MODIFIED)
Added `generateWebToken()` function:
```javascript
const generateWebToken = async (parentFrameUrl, enabledFeatures = ['PRIVATE_APPS']) => {
    const response = await androidManagement.enterprises.webTokens.create({
        parent: enterpriseId,
        requestBody: {
            parentFrameUrl,
            enabledFeatures
        }
    });
    return { success: true, token: response.data.value };
};
```

### 4. `src/controllers/amapiAdminController.js` (MODIFIED)
Added `createWebToken` endpoint handler.

### 5. `src/routes/amapiAdminRoutes.js` (MODIFIED)
Added route:
```javascript
router.post("/web-token", authenticate, createWebToken);
```

---

## API Endpoint

```
POST /api/admin/amapi/web-token
Authorization: Bearer <admin_token>
Content-Type: application/json

Body (optional):
{
  "parentFrameUrl": "https://your-domain.com"
}

Response:
{
  "success": true,
  "token": "ABC123...",
  "iframeUrl": "https://play.google.com/work/embedded/privateapps?token=ABC123..."
}
```

---

## How to Use

### Local Development
1. Start server: `npm run dev`
2. Open: `http://localhost:5000`
3. Click "Generate New Token" or paste token manually
4. Click "Load Private Apps Manager"
5. Use (+) button in iframe to upload APK

### Production (Render)
1. Deploy to Render
2. Open: `https://your-app.onrender.com`
3. Same workflow as above

---

## Upload Flow

```
1. Admin opens webpage
   ↓
2. Generates/enters web token
   ↓
3. Iframe loads Google Play interface
   ↓
4. Admin clicks (+) → Uploads APK
   ↓
5. Google processes APK (2-5 min)
   ↓
6. App appears in Managed Google Play
   ↓
7. Add package to AMAPI policy
```

---

## AMAPI Policy Integration

After uploading, add the app to your policy:

```json
{
  "applications": [
    {
      "packageName": "com.yourapp.package",
      "installType": "FORCE_INSTALLED",
      "defaultPermissionPolicy": "GRANT"
    }
  ]
}
```

---

## Requirements

- HTTPS hosting (required by Google)
- Valid AMAPI service account
- Enterprise ID configured
- Admin authentication token
