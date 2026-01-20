# Brand Management API Documentation

## Overview

This document provides complete API documentation for the Brand Management System. Admins can manage phone brands, models, and variants (RAM/ROM configurations) with pricing and images.

**System Structure:**
```
Brand (e.g., Xiaomi) + Logo
  └── Phone Model (e.g., Redmi Note 12 Pro) + Images
       ├── Variant 1: 6GB/128GB - ₹18,999
       ├── Variant 2: 8GB/128GB - ₹20,999
       └── Variant 3: 8GB/256GB - ₹22,999
```

---

## Table of Contents

1. [Admin APIs](#admin-apis)
   - [Brand Management](#brand-management)
   - [Phone Model Management](#phone-model-management)
   - [Phone Variant Management](#phone-variant-management)
2. [Public/Retailer APIs](#publicretailer-apis)
3. [Complete Business Flow](#complete-business-flow)
4. [Error Codes Reference](#error-codes-reference)

---

## Admin APIs

All admin APIs require authentication. Include the admin JWT token in the Authorization header:

```
Authorization: Bearer <admin_jwt_token>
```

### Brand Management

#### 1. Create Brand

**Endpoint:** `POST /api/admin/brands`

**Request Body:**
```json
{
  "name": "Xiaomi",
  "description": "Leading smartphone manufacturer from China"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Brand created successfully",
  "data": {
    "brandId": "65a1b2c3d4e5f6789abcdef0",
    "name": "Xiaomi",
    "description": "Leading smartphone manufacturer from China",
    "logo": null,
    "isActive": true,
    "createdAt": "2026-01-20T15:30:00.000Z"
  }
}
```

---

#### 2. Get All Brands

**Endpoint:** `GET /api/admin/brands`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `search` (optional): Search by brand name
- `isActive` (optional): Filter by active status (true/false)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Brands fetched successfully",
  "data": {
    "brands": [
      {
        "_id": "65a1b2c3d4e5f6789abcdef0",
        "name": "Xiaomi",
        "logo": "https://res.cloudinary.com/xxx/brands/xiaomi.jpg",
        "description": "Leading smartphone manufacturer",
        "isActive": true,
        "createdAt": "2026-01-20T15:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 1,
      "itemsPerPage": 20,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

---

#### 3. Get Brand by ID

**Endpoint:** `GET /api/admin/brands/:brandId`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Brand fetched successfully",
  "data": {
    "brand": {
      "id": "65a1b2c3d4e5f6789abcdef0",
      "name": "Xiaomi",
      "logo": "https://res.cloudinary.com/xxx/brands/xiaomi.jpg",
      "description": "Leading smartphone manufacturer",
      "isActive": true,
      "modelCount": 15,
      "createdAt": "2026-01-20T15:30:00.000Z"
    }
  }
}
```

---

#### 4. Update Brand

**Endpoint:** `PUT /api/admin/brands/:brandId`

**Request Body:**
```json
{
  "name": "Xiaomi India",
  "description": "Updated description",
  "isActive": true
}
```

**Note:** All fields are optional.

---

#### 5. Delete Brand (Soft Delete)

**Endpoint:** `DELETE /api/admin/brands/:brandId`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Brand deactivated successfully",
  "data": {
    "brandId": "65a1b2c3d4e5f6789abcdef0",
    "name": "Xiaomi",
    "isActive": false
  }
}
```

---

#### 6. Upload Brand Logo

**Endpoint:** `POST /api/admin/brands/:brandId/logo`

**Content-Type:** `multipart/form-data`

**Form Data:**
- `logo`: Image file (JPEG, PNG, max 5MB)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Brand logo uploaded successfully",
  "data": {
    "brandId": "65a1b2c3d4e5f6789abcdef0",
    "logo": "https://res.cloudinary.com/xxx/brands/xiaomi_abc123.jpg"
  }
}
```

**Example cURL:**
```bash
curl -X POST http://localhost:5000/api/admin/brands/65a1b2c3d4e5f6789abcdef0/logo \
  -H "Authorization: Bearer <admin_token>" \
  -F "logo=@/path/to/xiaomi-logo.jpg"
```

---

### Phone Model Management

#### 1. Create Phone Model

**Endpoint:** `POST /api/admin/brands/:brandId/models`

**Request Body:**
```json
{
  "modelName": "Redmi Note 12 Pro"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Phone model created successfully",
  "data": {
    "modelId": "65a1b2c3d4e5f6789abcdef2",
    "brandId": "65a1b2c3d4e5f6789abcdef0",
    "brandName": "Xiaomi",
    "modelName": "Redmi Note 12 Pro",
    "images": [],
    "isActive": true,
    "createdAt": "2026-01-20T16:00:00.000Z"
  }
}
```

---

#### 2. Get Phone Models by Brand

**Endpoint:** `GET /api/admin/brands/:brandId/models`

**Query Parameters:**
- `page`, `limit`, `search`, `isActive`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Phone models fetched successfully",
  "data": {
    "brand": {
      "id": "65a1b2c3d4e5f6789abcdef0",
      "name": "Xiaomi",
      "logo": "https://res.cloudinary.com/xxx/brands/xiaomi.jpg"
    },
    "phoneModels": [
      {
        "_id": "65a1b2c3d4e5f6789abcdef2",
        "modelName": "Redmi Note 12 Pro",
        "images": [
          "https://res.cloudinary.com/xxx/phone-models/redmi_1.jpg"
        ],
        "isActive": true,
        "variantCount": 3,
        "createdAt": "2026-01-20T16:00:00.000Z"
      }
    ],
    "pagination": { ... }
  }
}
```

---

#### 3. Get Phone Model by ID

**Endpoint:** `GET /api/admin/models/:modelId`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Phone model fetched successfully",
  "data": {
    "phoneModel": {
      "id": "65a1b2c3d4e5f6789abcdef2",
      "brand": {
        "_id": "65a1b2c3d4e5f6789abcdef0",
        "name": "Xiaomi",
        "logo": "https://res.cloudinary.com/xxx/brands/xiaomi.jpg"
      },
      "modelName": "Redmi Note 12 Pro",
      "images": [
        "https://res.cloudinary.com/xxx/phone-models/redmi_1.jpg"
      ],
      "isActive": true,
      "variantCount": 3,
      "createdAt": "2026-01-20T16:00:00.000Z"
    }
  }
}
```

---

#### 4. Update Phone Model

**Endpoint:** `PUT /api/admin/models/:modelId`

**Request Body:**
```json
{
  "modelName": "Redmi Note 12 Pro+",
  "isActive": true
}
```

---

#### 5. Delete Phone Model

**Endpoint:** `DELETE /api/admin/models/:modelId`

---

#### 6. Upload Phone Model Images

**Endpoint:** `POST /api/admin/models/:modelId/images`

**Content-Type:** `multipart/form-data`

**Form Data:**
- `images`: Array of image files (max 5 total per model)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Phone model images uploaded successfully",
  "data": {
    "modelId": "65a1b2c3d4e5f6789abcdef2",
    "images": [
      "https://res.cloudinary.com/xxx/phone-models/redmi_1.jpg",
      "https://res.cloudinary.com/xxx/phone-models/redmi_2.jpg"
    ],
    "uploadedCount": 2
  }
}
```

**Example cURL:**
```bash
curl -X POST http://localhost:5000/api/admin/models/65a1b2c3d4e5f6789abcdef2/images \
  -H "Authorization: Bearer <admin_token>" \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg"
```

---

#### 7. Delete Phone Model Image

**Endpoint:** `DELETE /api/admin/models/:modelId/images/:imageIndex`

**URL Parameters:**
- `imageIndex`: Index of the image to delete (0-based)

---

### Phone Variant Management

#### 1. Create Phone Variant

**Endpoint:** `POST /api/admin/models/:modelId/variants`

**Request Body:**
```json
{
  "ram": 8,
  "rom": 128,
  "color": "Midnight Black",
  "price": 20999,
  "mrp": 24999,
  "stock": 50,
  "sku": "XM-RN12P-8-128-BLK"
}
```

**Field Validations:**
- `ram`: Required, positive integer (GB)
- `rom`: Required, positive integer (GB)
- `price`: Required, positive number
- `mrp`: Optional (Maximum Retail Price)
- `color`: Optional
- `stock`: Optional, default 0
- `sku`: Optional, unique

**Success Response (201):**
```json
{
  "success": true,
  "message": "Phone variant created successfully",
  "data": {
    "variantId": "65a1b2c3d4e5f6789abcdef3",
    "phoneModel": {
      "id": "65a1b2c3d4e5f6789abcdef2",
      "name": "Redmi Note 12 Pro",
      "brand": "Xiaomi"
    },
    "ram": 8,
    "rom": 128,
    "color": "Midnight Black",
    "price": 20999,
    "mrp": 24999,
    "stock": 50,
    "sku": "XM-RN12P-8-128-BLK",
    "isActive": true,
    "createdAt": "2026-01-20T17:00:00.000Z"
  }
}
```

---

#### 2. Get Phone Variants by Model

**Endpoint:** `GET /api/admin/models/:modelId/variants`

**Query Parameters:**
- `page`, `limit`, `isActive`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Phone variants fetched successfully",
  "data": {
    "phoneModel": {
      "id": "65a1b2c3d4e5f6789abcdef2",
      "name": "Redmi Note 12 Pro",
      "brand": {
        "_id": "65a1b2c3d4e5f6789abcdef0",
        "name": "Xiaomi",
        "logo": "https://res.cloudinary.com/xxx/brands/xiaomi.jpg"
      }
    },
    "phoneVariants": [
      {
        "_id": "65a1b2c3d4e5f6789abcdef3",
        "ram": 6,
        "rom": 128,
        "color": "Midnight Black",
        "price": 18999,
        "mrp": 22999,
        "stock": 30,
        "sku": "XM-RN12P-6-128-BLK",
        "isActive": true
      },
      {
        "_id": "65a1b2c3d4e5f6789abcdef4",
        "ram": 8,
        "rom": 128,
        "color": "Midnight Black",
        "price": 20999,
        "mrp": 24999,
        "stock": 50,
        "sku": "XM-RN12P-8-128-BLK",
        "isActive": true
      }
    ],
    "pagination": { ... }
  }
}
```

---

#### 3. Get Phone Variant by ID

**Endpoint:** `GET /api/admin/variants/:variantId`

---

#### 4. Update Phone Variant

**Endpoint:** `PUT /api/admin/variants/:variantId`

**Request Body:**
```json
{
  "price": 19999,
  "stock": 75,
  "isActive": true
}
```

**Note:** All fields are optional.

---

#### 5. Delete Phone Variant

**Endpoint:** `DELETE /api/admin/variants/:variantId`

---

## Public/Retailer APIs

These APIs are accessible without admin authentication.

### 1. Get All Active Brands

**Endpoint:** `GET /api/brands`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Brands fetched successfully",
  "data": {
    "brands": [
      {
        "_id": "65a1b2c3d4e5f6789abcdef0",
        "name": "Xiaomi",
        "logo": "https://res.cloudinary.com/xxx/brands/xiaomi.jpg",
        "description": "Leading smartphone manufacturer"
      }
    ]
  }
}
```

---

### 2. Get Active Models by Brand

**Endpoint:** `GET /api/brands/:brandId/models`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Phone models fetched successfully",
  "data": {
    "brand": {
      "id": "65a1b2c3d4e5f6789abcdef0",
      "name": "Xiaomi",
      "logo": "https://res.cloudinary.com/xxx/brands/xiaomi.jpg"
    },
    "phoneModels": [
      {
        "_id": "65a1b2c3d4e5f6789abcdef2",
        "modelName": "Redmi Note 12 Pro",
        "images": [
          "https://res.cloudinary.com/xxx/phone-models/redmi_1.jpg"
        ]
      }
    ]
  }
}
```

---

### 3. Get Active Variants by Model

**Endpoint:** `GET /api/models/:modelId/variants`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Phone variants fetched successfully",
  "data": {
    "phoneModel": {
      "id": "65a1b2c3d4e5f6789abcdef2",
      "name": "Redmi Note 12 Pro",
      "brand": {
        "_id": "65a1b2c3d4e5f6789abcdef0",
        "name": "Xiaomi",
        "logo": "https://res.cloudinary.com/xxx/brands/xiaomi.jpg"
      },
      "images": [
        "https://res.cloudinary.com/xxx/phone-models/redmi_1.jpg"
      ]
    },
    "phoneVariants": [
      {
        "_id": "65a1b2c3d4e5f6789abcdef3",
        "ram": 6,
        "rom": 128,
        "color": "Midnight Black",
        "price": 18999,
        "mrp": 22999,
        "stock": 30,
        "sku": "XM-RN12P-6-128-BLK"
      },
      {
        "_id": "65a1b2c3d4e5f6789abcdef4",
        "ram": 8,
        "rom": 128,
        "color": "Midnight Black",
        "price": 20999,
        "mrp": 24999,
        "stock": 50,
        "sku": "XM-RN12P-8-128-BLK"
      }
    ]
  }
}
```

---

### 4. Get Variant by ID

**Endpoint:** `GET /api/variants/:variantId`

---

## Complete Business Flow

### Admin Workflow

```javascript
// 1. Create brand
const brandResponse = await fetch('http://localhost:5000/api/admin/brands', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Xiaomi',
    description: 'Leading smartphone manufacturer'
  })
});
const { data: { brandId } } = await brandResponse.json();

// 2. Upload brand logo
const logoFormData = new FormData();
logoFormData.append('logo', logoFile);

await fetch(`http://localhost:5000/api/admin/brands/${brandId}/logo`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${adminToken}` },
  body: logoFormData
});

// 3. Create phone model
const modelResponse = await fetch(`http://localhost:5000/api/admin/brands/${brandId}/models`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    modelName: 'Redmi Note 12 Pro'
  })
});
const { data: { modelId } } = await modelResponse.json();

// 4. Upload model images
const imagesFormData = new FormData();
imagesFormData.append('images', imageFile1);
imagesFormData.append('images', imageFile2);

await fetch(`http://localhost:5000/api/admin/models/${modelId}/images`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${adminToken}` },
  body: imagesFormData
});

// 5. Create variants
const variants = [
  { ram: 6, rom: 128, color: 'Midnight Black', price: 18999, mrp: 22999, stock: 30 },
  { ram: 8, rom: 128, color: 'Midnight Black', price: 20999, mrp: 24999, stock: 50 },
  { ram: 8, rom: 256, color: 'Ocean Blue', price: 22999, mrp: 26999, stock: 25 }
];

for (const variant of variants) {
  await fetch(`http://localhost:5000/api/admin/models/${modelId}/variants`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(variant)
  });
}
```

### Retailer/Public Workflow

```javascript
// 1. Get all brands
const brandsResponse = await fetch('http://localhost:5000/api/brands');
const { data: { brands } } = await brandsResponse.json();

// 2. Get models for selected brand
const brandId = brands[0]._id;
const modelsResponse = await fetch(`http://localhost:5000/api/brands/${brandId}/models`);
const { data: { phoneModels } } = await modelsResponse.json();

// 3. Get variants for selected model
const modelId = phoneModels[0]._id;
const variantsResponse = await fetch(`http://localhost:5000/api/models/${modelId}/variants`);
const { data: { phoneVariants } } = await variantsResponse.json();

// 4. User selects variant
const selectedVariant = phoneVariants[1]; // 8GB/128GB
console.log(`${selectedVariant.ram}GB/${selectedVariant.rom}GB - ₹${selectedVariant.price}`);
```

---

## Error Codes Reference

| Error Code | Description | HTTP Status |
|------------|-------------|-------------|
| `VALIDATION_ERROR` | Request validation failed | 400 |
| `DUPLICATE_BRAND` | Brand name already exists | 400 |
| `DUPLICATE_SKU` | SKU already exists | 400 |
| `BRAND_NOT_FOUND` | Brand not found | 404 |
| `MODEL_NOT_FOUND` | Phone model not found | 404 |
| `VARIANT_NOT_FOUND` | Phone variant not found | 404 |
| `BRAND_INACTIVE` | Cannot add model to inactive brand | 400 |
| `MODEL_INACTIVE` | Cannot add variant to inactive model | 400 |
| `NO_FILE` | No image file provided | 400 |
| `IMAGE_LIMIT_EXCEEDED` | Maximum 5 images allowed | 400 |
| `INVALID_TOKEN` | JWT token invalid or expired | 401 |
| `SERVER_ERROR` | Internal server error | 500 |

---

## Notes

1. **Authentication**: All admin APIs require JWT token
2. **Soft Delete**: Delete operations set `isActive: false`
3. **Image Limits**: Brand logo (1), Phone models (max 5), Max 5MB per file
4. **Cascading Deactivation**: Deleting brand deactivates all models; deleting model deactivates all variants
5. **Pagination**: Default 20 items per page
6. **Stock Management**: Update stock via variant update API

---

## Testing with Postman

1. **Create Brand**: POST `/api/admin/brands` with JSON body `{"name": "Xiaomi"}`
2. **Upload Logo**: POST `/api/admin/brands/:brandId/logo` with form-data `logo` file
3. **Create Model**: POST `/api/admin/brands/:brandId/models` with JSON `{"modelName": "Redmi Note 12 Pro"}`
4. **Create Variant**: POST `/api/admin/models/:modelId/variants` with JSON `{"ram": 8, "rom": 128, "price": 20999}`
5. **Get Brands (Public)**: GET `/api/brands` (no auth required)
