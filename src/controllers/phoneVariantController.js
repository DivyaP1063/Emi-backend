const { body, param, query, validationResult } = require('express-validator');
const PhoneVariant = require('../models/PhoneVariant');
const PhoneModel = require('../models/PhoneModel');
const Brand = require('../models/Brand');

/**
 * Validation rules for creating a phone variant
 */
const createPhoneVariantValidation = [
    param('modelId')
        .notEmpty()
        .withMessage('Model ID is required')
        .isMongoId()
        .withMessage('Invalid model ID format'),
    body('ram')
        .notEmpty()
        .withMessage('RAM is required')
        .isInt({ min: 1 })
        .withMessage('RAM must be a positive integer (in GB)'),
    body('rom')
        .notEmpty()
        .withMessage('ROM is required')
        .isInt({ min: 1 })
        .withMessage('ROM must be a positive integer (in GB)'),
    body('price')
        .notEmpty()
        .withMessage('Price is required')
        .isFloat({ min: 0 })
        .withMessage('Price must be a positive number'),
    body('mrp')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('MRP must be a positive number'),
    body('color')
        .optional()
        .trim(),
    body('stock')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Stock must be a non-negative integer'),
    body('sku')
        .optional()
        .trim()
];

/**
 * Create a new phone variant
 */
const createPhoneVariant = async (req, res) => {
    try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                error: 'VALIDATION_ERROR',
                details: errors.array()
            });
        }

        const { modelId } = req.params;
        const { ram, rom, price, mrp, color, stock, sku } = req.body;

        // Check if phone model exists and is active
        const phoneModel = await PhoneModel.findById(modelId).populate('brandId', 'name');
        if (!phoneModel) {
            return res.status(404).json({
                success: false,
                message: 'Phone model not found',
                error: 'MODEL_NOT_FOUND'
            });
        }

        if (!phoneModel.isActive) {
            return res.status(400).json({
                success: false,
                message: 'Cannot add variant to inactive phone model',
                error: 'MODEL_INACTIVE'
            });
        }

        // Check if SKU already exists (if provided)
        if (sku) {
            const existingVariant = await PhoneVariant.findOne({ sku });
            if (existingVariant) {
                return res.status(400).json({
                    success: false,
                    message: 'SKU already exists',
                    error: 'DUPLICATE_SKU'
                });
            }
        }

        // Create phone variant
        const phoneVariant = new PhoneVariant({
            phoneModelId: modelId,
            ram,
            rom,
            price,
            mrp: mrp || null,
            color: color || null,
            stock: stock || 0,
            sku: sku || null,
            createdBy: req.admin.id
        });

        await phoneVariant.save();

        return res.status(201).json({
            success: true,
            message: 'Phone variant created successfully',
            data: {
                variantId: phoneVariant._id,
                phoneModel: {
                    id: phoneModel._id,
                    name: phoneModel.modelName,
                    brand: phoneModel.brandId.name
                },
                ram: phoneVariant.ram,
                rom: phoneVariant.rom,
                color: phoneVariant.color,
                price: phoneVariant.price,
                mrp: phoneVariant.mrp,
                stock: phoneVariant.stock,
                sku: phoneVariant.sku,
                isActive: phoneVariant.isActive,
                createdAt: phoneVariant.createdAt
            }
        });
    } catch (error) {
        console.error('Create phone variant error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create phone variant',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Get all phone variants for a model
 */
const getPhoneVariantsByModel = async (req, res) => {
    try {
        const { modelId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const isActive = req.query.isActive;

        const skip = (page - 1) * limit;

        // Check if phone model exists
        const phoneModel = await PhoneModel.findById(modelId).populate('brandId', 'name logo');
        if (!phoneModel) {
            return res.status(404).json({
                success: false,
                message: 'Phone model not found',
                error: 'MODEL_NOT_FOUND'
            });
        }

        // Build query
        const query = { phoneModelId: modelId };
        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        // Get phone variants with pagination
        const phoneVariants = await PhoneVariant.find(query)
            .sort({ ram: 1, rom: 1 }) // Sort by RAM then ROM
            .skip(skip)
            .limit(limit)
            .select('ram rom color price mrp stock sku isActive createdAt updatedAt');

        const totalVariants = await PhoneVariant.countDocuments(query);
        const totalPages = Math.ceil(totalVariants / limit);

        return res.status(200).json({
            success: true,
            message: 'Phone variants fetched successfully',
            data: {
                phoneModel: {
                    id: phoneModel._id,
                    name: phoneModel.modelName,
                    brand: phoneModel.brandId
                },
                phoneVariants,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems: totalVariants,
                    itemsPerPage: limit,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            }
        });
    } catch (error) {
        console.error('Get phone variants error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch phone variants',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Get single phone variant by ID
 */
const getPhoneVariantById = async (req, res) => {
    try {
        const { variantId } = req.params;

        const phoneVariant = await PhoneVariant.findById(variantId)
            .populate({
                path: 'phoneModelId',
                select: 'modelName images',
                populate: {
                    path: 'brandId',
                    select: 'name logo'
                }
            });

        if (!phoneVariant) {
            return res.status(404).json({
                success: false,
                message: 'Phone variant not found',
                error: 'VARIANT_NOT_FOUND'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Phone variant fetched successfully',
            data: {
                phoneVariant: {
                    id: phoneVariant._id,
                    phoneModel: phoneVariant.phoneModelId,
                    ram: phoneVariant.ram,
                    rom: phoneVariant.rom,
                    color: phoneVariant.color,
                    price: phoneVariant.price,
                    mrp: phoneVariant.mrp,
                    stock: phoneVariant.stock,
                    sku: phoneVariant.sku,
                    isActive: phoneVariant.isActive,
                    createdAt: phoneVariant.createdAt,
                    updatedAt: phoneVariant.updatedAt
                }
            }
        });
    } catch (error) {
        console.error('Get phone variant error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch phone variant',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Update phone variant details
 */
const updatePhoneVariant = async (req, res) => {
    try {
        const { variantId } = req.params;
        const { ram, rom, price, mrp, color, stock, sku, isActive } = req.body;

        const phoneVariant = await PhoneVariant.findById(variantId);

        if (!phoneVariant) {
            return res.status(404).json({
                success: false,
                message: 'Phone variant not found',
                error: 'VARIANT_NOT_FOUND'
            });
        }

        // Check if SKU already exists (if updating SKU)
        if (sku && sku !== phoneVariant.sku) {
            const existingVariant = await PhoneVariant.findOne({
                sku,
                _id: { $ne: variantId }
            });
            if (existingVariant) {
                return res.status(400).json({
                    success: false,
                    message: 'SKU already exists',
                    error: 'DUPLICATE_SKU'
                });
            }
        }

        if (ram !== undefined) phoneVariant.ram = ram;
        if (rom !== undefined) phoneVariant.rom = rom;
        if (price !== undefined) phoneVariant.price = price;
        if (mrp !== undefined) phoneVariant.mrp = mrp;
        if (color !== undefined) phoneVariant.color = color;
        if (stock !== undefined) phoneVariant.stock = stock;
        if (sku !== undefined) phoneVariant.sku = sku;
        if (isActive !== undefined) phoneVariant.isActive = isActive;

        await phoneVariant.save();

        return res.status(200).json({
            success: true,
            message: 'Phone variant updated successfully',
            data: {
                variantId: phoneVariant._id,
                ram: phoneVariant.ram,
                rom: phoneVariant.rom,
                color: phoneVariant.color,
                price: phoneVariant.price,
                mrp: phoneVariant.mrp,
                stock: phoneVariant.stock,
                sku: phoneVariant.sku,
                isActive: phoneVariant.isActive,
                updatedAt: phoneVariant.updatedAt
            }
        });
    } catch (error) {
        console.error('Update phone variant error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update phone variant',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Delete phone variant (soft delete)
 */
const deletePhoneVariant = async (req, res) => {
    try {
        const { variantId } = req.params;

        const phoneVariant = await PhoneVariant.findById(variantId);

        if (!phoneVariant) {
            return res.status(404).json({
                success: false,
                message: 'Phone variant not found',
                error: 'VARIANT_NOT_FOUND'
            });
        }

        // Soft delete
        phoneVariant.isActive = false;
        await phoneVariant.save();

        return res.status(200).json({
            success: true,
            message: 'Phone variant deactivated successfully',
            data: {
                variantId: phoneVariant._id,
                ram: phoneVariant.ram,
                rom: phoneVariant.rom,
                isActive: phoneVariant.isActive
            }
        });
    } catch (error) {
        console.error('Delete phone variant error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete phone variant',
            error: 'SERVER_ERROR'
        });
    }
};

module.exports = {
    createPhoneVariantValidation,
    createPhoneVariant,
    getPhoneVariantsByModel,
    getPhoneVariantById,
    updatePhoneVariant,
    deletePhoneVariant
};
