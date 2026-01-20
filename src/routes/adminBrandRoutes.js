const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// Import controllers
const brandController = require('../controllers/brandController');
const phoneModelController = require('../controllers/phoneModelController');
const phoneVariantController = require('../controllers/phoneVariantController');

// ============================================
// BRAND ROUTES
// ============================================

/**
 * @route   POST /api/admin/brands
 * @desc    Create a new brand
 * @access  Admin
 */
router.post(
    '/brands',
    authenticate,
    brandController.createBrandValidation,
    brandController.createBrand
);

/**
 * @route   GET /api/admin/brands
 * @desc    Get all brands with pagination and search
 * @access  Admin
 */
router.get(
    '/brands',
    authenticate,
    brandController.getAllBrands
);

/**
 * @route   GET /api/admin/brands/:brandId
 * @desc    Get single brand by ID
 * @access  Admin
 */
router.get(
    '/brands/:brandId',
    authenticate,
    brandController.getBrandById
);

/**
 * @route   PUT /api/admin/brands/:brandId
 * @desc    Update brand details
 * @access  Admin
 */
router.put(
    '/brands/:brandId',
    authenticate,
    brandController.updateBrand
);

/**
 * @route   DELETE /api/admin/brands/:brandId
 * @desc    Delete brand (soft delete)
 * @access  Admin
 */
router.delete(
    '/brands/:brandId',
    authenticate,
    brandController.deleteBrand
);

/**
 * @route   POST /api/admin/brands/:brandId/logo
 * @desc    Upload brand logo
 * @access  Admin
 */
router.post(
    '/brands/:brandId/logo',
    authenticate,
    upload.single('logo'),
    brandController.uploadBrandLogo
);

// ============================================
// PHONE MODEL ROUTES
// ============================================

/**
 * @route   POST /api/admin/brands/:brandId/models
 * @desc    Create a new phone model under a brand
 * @access  Admin
 */
router.post(
    '/brands/:brandId/models',
    authenticate,
    phoneModelController.createPhoneModelValidation,
    phoneModelController.createPhoneModel
);

/**
 * @route   GET /api/admin/brands/:brandId/models
 * @desc    Get all models for a brand
 * @access  Admin
 */
router.get(
    '/brands/:brandId/models',
    authenticate,
    phoneModelController.getPhoneModelsByBrand
);

/**
 * @route   GET /api/admin/models/:modelId
 * @desc    Get single model by ID
 * @access  Admin
 */
router.get(
    '/models/:modelId',
    authenticate,
    phoneModelController.getPhoneModelById
);

/**
 * @route   PUT /api/admin/models/:modelId
 * @desc    Update model details
 * @access  Admin
 */
router.put(
    '/models/:modelId',
    authenticate,
    phoneModelController.updatePhoneModel
);

/**
 * @route   DELETE /api/admin/models/:modelId
 * @desc    Delete model (soft delete)
 * @access  Admin
 */
router.delete(
    '/models/:modelId',
    authenticate,
    phoneModelController.deletePhoneModel
);

/**
 * @route   POST /api/admin/models/:modelId/images
 * @desc    Upload model images (multiple)
 * @access  Admin
 */
router.post(
    '/models/:modelId/images',
    authenticate,
    upload.array('images', 5),
    phoneModelController.uploadPhoneModelImages
);

/**
 * @route   DELETE /api/admin/models/:modelId/images/:imageIndex
 * @desc    Delete a specific model image
 * @access  Admin
 */
router.delete(
    '/models/:modelId/images/:imageIndex',
    authenticate,
    phoneModelController.deletePhoneModelImage
);

// ============================================
// PHONE VARIANT ROUTES
// ============================================

/**
 * @route   POST /api/admin/models/:modelId/variants
 * @desc    Create a new variant (RAM/ROM/Price)
 * @access  Admin
 */
router.post(
    '/models/:modelId/variants',
    authenticate,
    phoneVariantController.createPhoneVariantValidation,
    phoneVariantController.createPhoneVariant
);

/**
 * @route   GET /api/admin/models/:modelId/variants
 * @desc    Get all variants for a model
 * @access  Admin
 */
router.get(
    '/models/:modelId/variants',
    authenticate,
    phoneVariantController.getPhoneVariantsByModel
);

/**
 * @route   GET /api/admin/variants/:variantId
 * @desc    Get single variant by ID
 * @access  Admin
 */
router.get(
    '/variants/:variantId',
    authenticate,
    phoneVariantController.getPhoneVariantById
);

/**
 * @route   PUT /api/admin/variants/:variantId
 * @desc    Update variant (price, stock, etc.)
 * @access  Admin
 */
router.put(
    '/variants/:variantId',
    authenticate,
    phoneVariantController.updatePhoneVariant
);

/**
 * @route   DELETE /api/admin/variants/:variantId
 * @desc    Delete variant (soft delete)
 * @access  Admin
 */
router.delete(
    '/variants/:variantId',
    authenticate,
    phoneVariantController.deletePhoneVariant
);

module.exports = router;
