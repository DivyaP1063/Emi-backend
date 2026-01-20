# Brand Integration with Customer Creation - Documentation

## Overview

Customer creation has been updated to integrate with the Brand Management System. Instead of manually entering product details, retailers now select from cascading dropdowns (Brand → Model → Variant) with automatic price population.

---

## Changes Made

### Backend Changes

#### Updated: `retailerProductController.js` - `createCustomer` function

**Removed Fields:**
- `model` (text input)
- `productName` (text input)

**Added Fields:**
- `variantId` (required) - Selected from variant dropdown

**Auto-Generated Fields:**
- `brandName` - From `variant.phoneModelId.brandId.name`
- `modelName` - From `variant.phoneModelId.modelName`
- `variantSpec` - From `variant.ram`, `variant.rom`, `variant.color`
- `productName` - Auto-constructed as: `"Brand Model (RAM/ROM - Color)"`

**Example:**
- Input: `variantId: "65a1b2c3d4e5f6789abcdef4"`
- Auto-generated: `productName: "Xiaomi Redmi Note 12 Pro (8GB/128GB - Midnight Black)"`

**Validation Added:**
- ✅ Variant must exist
- ✅ Variant must be active (`isActive: true`)
- ✅ Model must be active
- ✅ Brand must be active

---

## API Integration

### Existing Public APIs (No New APIs Created)

#### 1. Get All Brands
**Endpoint:** `GET /api/brands`

**Response:**
```json
{
  "success": true,
  "data": {
    "brands": [
      {
        "_id": "65a1b2c3d4e5f6789abcdef0",
        "name": "Xiaomi",
        "logo": "https://cloudinary.com/...",
        "description": "Leading smartphone manufacturer"
      }
    ]
  }
}
```

---

#### 2. Get Models by Brand
**Endpoint:** `GET /api/brands/:brandId/models`

**Response:**
```json
{
  "success": true,
  "data": {
    "brand": {
      "id": "65a1b2c3d4e5f6789abcdef0",
      "name": "Xiaomi",
      "logo": "https://cloudinary.com/..."
    },
    "phoneModels": [
      {
        "_id": "65a1b2c3d4e5f6789abcdef2",
        "modelName": "Redmi Note 12 Pro",
        "images": ["https://cloudinary.com/..."]
      }
    ]
  }
}
```

---

#### 3. Get Variants by Model
**Endpoint:** `GET /api/models/:modelId/variants`

**Response:**
```json
{
  "success": true,
  "data": {
    "phoneModel": {
      "id": "65a1b2c3d4e5f6789abcdef2",
      "name": "Redmi Note 12 Pro",
      "brand": {
        "_id": "65a1b2c3d4e5f6789abcdef0",
        "name": "Xiaomi"
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
        "stock": 30
      },
      {
        "_id": "65a1b2c3d4e5f6789abcdef4",
        "ram": 8,
        "rom": 128,
        "color": "Midnight Black",
        "price": 20999,
        "mrp": 24999,
        "stock": 50
      }
    ]
  }
}
```

---

## Frontend Implementation Guide

### Cascading Dropdown Flow

```javascript
// 1. Load brands on page load
const loadBrands = async () => {
  const response = await fetch('/api/brands');
  const { data: { brands } } = await response.json();
  
  // Populate brand dropdown
  brandDropdown.innerHTML = brands.map(brand => 
    `<option value="${brand._id}">${brand.name}</option>`
  ).join('');
};

// 2. When brand is selected, load models
const onBrandChange = async (brandId) => {
  const response = await fetch(`/api/brands/${brandId}/models`);
  const { data: { phoneModels } } = await response.json();
  
  // Populate model dropdown
  modelDropdown.innerHTML = phoneModels.map(model => 
    `<option value="${model._id}">${model.modelName}</option>`
  ).join('');
  
  // Clear variant dropdown
  variantDropdown.innerHTML = '<option value="">Select Variant</option>';
};

// 3. When model is selected, load variants
const onModelChange = async (modelId) => {
  const response = await fetch(`/api/models/${modelId}/variants`);
  const { data: { phoneVariants } } = await response.json();
  
  // Populate variant dropdown with RAM/ROM and price
  variantDropdown.innerHTML = phoneVariants.map(variant => 
    `<option value="${variant._id}" data-price="${variant.price}">
      ${variant.ram}GB/${variant.rom}GB${variant.color ? ` - ${variant.color}` : ''} - ₹${variant.price}
    </option>`
  ).join('');
};

// 4. When variant is selected, auto-fill price
const onVariantChange = (event) => {
  const selectedOption = event.target.selectedOptions[0];
  const price = selectedOption.dataset.price;
  
  // Auto-fill price but keep it editable
  sellPriceInput.value = price;
  landingPriceInput.value = price; // Or calculate based on your logic
};

// 5. On form submit
const onSubmit = async (event) => {
  event.preventDefault();
  
  const formData = new FormData();
  
  // Customer details
  formData.append('fullName', fullNameInput.value);
  formData.append('aadharNumber', aadharInput.value);
  // ... other customer fields
  
  // EMI details - NEW
  formData.append('variantId', variantDropdown.value); // NEW - replaces model & productName
  formData.append('sellPrice', sellPriceInput.value); // Auto-filled but editable
  formData.append('landingPrice', landingPriceInput.value);
  formData.append('downPayment', downPaymentInput.value);
  formData.append('numberOfMonths', monthsInput.value);
  
  // Documents
  formData.append('customerPhoto', customerPhotoFile);
  formData.append('aadharFront', aadharFrontFile);
  formData.append('aadharBack', aadharBackFile);
  formData.append('signature', signatureFile);
  
  const response = await fetch('/api/retailer/customers', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${retailerToken}`
    },
    body: formData
  });
  
  const result = await response.json();
  if (result.success) {
    alert('Customer created successfully!');
  }
};
```

---

## Updated Customer Creation Request

### Before (Old Format):
```javascript
formData.append('model', 'Redmi Note 12 Pro'); // Manual text input
formData.append('productName', 'Xiaomi Redmi Note 12 Pro'); // Manual text input
formData.append('sellPrice', '20999');
```

### After (New Format):
```javascript
formData.append('variantId', '65a1b2c3d4e5f6789abcdef4'); // Selected from dropdown
formData.append('sellPrice', '20999'); // Auto-filled from variant.price but editable
// model and productName are auto-generated by backend
```

---

## Example: Complete Flow

1. **User opens customer creation form**
   - Brand dropdown loads with: Xiaomi, Samsung, Apple, etc.

2. **User selects "Xiaomi"**
   - Model dropdown loads with: Redmi Note 12 Pro, Redmi Note 13, etc.

3. **User selects "Redmi Note 12 Pro"**
   - Variant dropdown loads with:
     - 6GB/128GB - Midnight Black - ₹18,999
     - 8GB/128GB - Midnight Black - ₹20,999
     - 8GB/256GB - Ocean Blue - ₹22,999

4. **User selects "8GB/128GB - Midnight Black - ₹20,999"**
   - Sell price input auto-fills with: 20,999 (but remains editable)
   - Landing price input auto-fills with: 20,999 (or calculated value)

5. **User can edit the price if needed**
   - Changes sell price to: 19,999 (discounted price)

6. **User submits form**
   - Backend receives `variantId`
   - Backend fetches variant details
   - Backend auto-generates: `productName: "Xiaomi Redmi Note 12 Pro (8GB/128GB - Midnight Black)"`
   - Customer is created with complete product information

---

## Error Handling

### Variant Not Found
```json
{
  "success": false,
  "message": "Product variant not found",
  "error": "VARIANT_NOT_FOUND"
}
```

### Variant Inactive
```json
{
  "success": false,
  "message": "Selected product variant is not available",
  "error": "VARIANT_INACTIVE"
}
```

### Model Inactive
```json
{
  "success": false,
  "message": "Selected product model is not available",
  "error": "MODEL_INACTIVE"
}
```

### Brand Inactive
```json
{
  "success": false,
  "message": "Selected product brand is not available",
  "error": "BRAND_INACTIVE"
}
```

---

## Benefits

✅ **Consistency** - Product names are standardized across all customers
✅ **Accuracy** - No typos in brand/model names
✅ **Price Management** - Centralized price updates via brand system
✅ **Validation** - Ensures only active products can be sold
✅ **Reporting** - Easy to filter/group customers by brand/model/variant
✅ **Stock Tracking** - Can integrate with variant stock levels

---

## Migration Notes

**Existing Customers:**
- Old customers with manual `model` and `productName` will continue to work
- No migration needed for existing data
- New customers will use the variant-based system

**Backward Compatibility:**
- The `model` and `productName` fields are still stored in the database
- They are now auto-generated from variant details instead of manual input

---

## Testing Checklist

- [ ] Brand dropdown loads all active brands
- [ ] Model dropdown loads when brand is selected
- [ ] Variant dropdown loads when model is selected
- [ ] Price auto-fills when variant is selected
- [ ] Price can be edited after auto-fill
- [ ] Customer creation works with variantId
- [ ] Product name is auto-generated correctly
- [ ] Error handling for inactive variant/model/brand
- [ ] Error handling for non-existent variantId
