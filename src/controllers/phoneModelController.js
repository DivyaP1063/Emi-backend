const { body, param, query, validationResult } = require('express-validator');
const PhoneModel = require('../models/PhoneModel');
const Brand = require('../models/Brand');
const PhoneVariant = require('../models/PhoneVariant');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

/**
 * Validation rules for creating a phone model
 */
const createPhoneModelValidation = [
    param('brandId')
        .notEmpty()
        .withMessage('Brand ID is required')
        .isMongoId()
        .withMessage('Invalid brand ID format'),
    body('modelName')
        .trim()
        .notEmpty()
        .withMessage('Model name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Model name must be between 2 and 100 characters')
];

/**
 * Create a new phone model
 */
const createPhoneModel = async (req, res) => {
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

        const { brandId } = req.params;
        const { modelName } = req.body;

        // Check if brand exists and is active
        const brand = await Brand.findById(brandId);
        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found',
                error: 'BRAND_NOT_FOUND'
            });
        }

        if (!brand.isActive) {
            return res.status(400).json({
                success: false,
                message: 'Cannot add model to inactive brand',
                error: 'BRAND_INACTIVE'
            });
        }

        // Create phone model
        const phoneModel = new PhoneModel({
            brandId,
            modelName,
            createdBy: req.admin.id
        });

        await phoneModel.save();

        return res.status(201).json({
            success: true,
            message: 'Phone model created successfully',
            data: {
                modelId: phoneModel._id,
                brandId: phoneModel.brandId,
                brandName: brand.name,
                modelName: phoneModel.modelName,
                images: phoneModel.images,
                isActive: phoneModel.isActive,
                createdAt: phoneModel.createdAt
            }
        });
    } catch (error) {
        console.error('Create phone model error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create phone model',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Get all phone models for a brand
 */
const getPhoneModelsByBrand = async (req, res) => {
    try {
        const { brandId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';
        const isActive = req.query.isActive;

        const skip = (page - 1) * limit;

        // Check if brand exists
        const brand = await Brand.findById(brandId);
        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found',
                error: 'BRAND_NOT_FOUND'
            });
        }

        // Build query
        const query = { brandId };
        if (search) {
            query.modelName = { $regex: search, $options: 'i' };
        }
        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        // Get phone models with pagination
        const phoneModels = await PhoneModel.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('modelName images isActive createdAt updatedAt');

        // Get variant count for each model
        const modelsWithVariantCount = await Promise.all(
            phoneModels.map(async (model) => {
                const variantCount = await PhoneVariant.countDocuments({
                    phoneModelId: model._id,
                    isActive: true
                });
                return {
                    ...model.toObject(),
                    variantCount
                };
            })
        );

        const totalModels = await PhoneModel.countDocuments(query);
        const totalPages = Math.ceil(totalModels / limit);

        return res.status(200).json({
            success: true,
            message: 'Phone models fetched successfully',
            data: {
                brand: {
                    id: brand._id,
                    name: brand.name,
                    logo: brand.logo
                },
                phoneModels: modelsWithVariantCount,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems: totalModels,
                    itemsPerPage: limit,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            }
        });
    } catch (error) {
        console.error('Get phone models error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch phone models',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Get single phone model by ID
 */
const getPhoneModelById = async (req, res) => {
    try {
        const { modelId } = req.params;

        const phoneModel = await PhoneModel.findById(modelId).populate('brandId', 'name logo');

        if (!phoneModel) {
            return res.status(404).json({
                success: false,
                message: 'Phone model not found',
                error: 'MODEL_NOT_FOUND'
            });
        }

        // Get variant count
        const variantCount = await PhoneVariant.countDocuments({
            phoneModelId: phoneModel._id,
            isActive: true
        });

        return res.status(200).json({
            success: true,
            message: 'Phone model fetched successfully',
            data: {
                phoneModel: {
                    id: phoneModel._id,
                    brand: phoneModel.brandId,
                    modelName: phoneModel.modelName,
                    images: phoneModel.images,
                    isActive: phoneModel.isActive,
                    variantCount,
                    createdAt: phoneModel.createdAt,
                    updatedAt: phoneModel.updatedAt
                }
            }
        });
    } catch (error) {
        console.error('Get phone model error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch phone model',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Update phone model details
 */
const updatePhoneModel = async (req, res) => {
    try {
        const { modelId } = req.params;
        const { modelName, isActive } = req.body;

        const phoneModel = await PhoneModel.findById(modelId);

        if (!phoneModel) {
            return res.status(404).json({
                success: false,
                message: 'Phone model not found',
                error: 'MODEL_NOT_FOUND'
            });
        }

        if (modelName) phoneModel.modelName = modelName;
        if (isActive !== undefined) phoneModel.isActive = isActive;

        await phoneModel.save();

        return res.status(200).json({
            success: true,
            message: 'Phone model updated successfully',
            data: {
                modelId: phoneModel._id,
                modelName: phoneModel.modelName,
                images: phoneModel.images,
                isActive: phoneModel.isActive,
                updatedAt: phoneModel.updatedAt
            }
        });
    } catch (error) {
        console.error('Update phone model error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update phone model',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Delete phone model (soft delete)
 */
const deletePhoneModel = async (req, res) => {
    try {
        const { modelId } = req.params;

        const phoneModel = await PhoneModel.findById(modelId);

        if (!phoneModel) {
            return res.status(404).json({
                success: false,
                message: 'Phone model not found',
                error: 'MODEL_NOT_FOUND'
            });
        }

        // Soft delete
        phoneModel.isActive = false;
        await phoneModel.save();

        // Also deactivate all variants under this model
        await PhoneVariant.updateMany(
            { phoneModelId: phoneModel._id },
            { $set: { isActive: false } }
        );

        return res.status(200).json({
            success: true,
            message: 'Phone model deactivated successfully',
            data: {
                modelId: phoneModel._id,
                modelName: phoneModel.modelName,
                isActive: phoneModel.isActive
            }
        });
    } catch (error) {
        console.error('Delete phone model error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete phone model',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Upload phone model images
 */
const uploadPhoneModelImages = async (req, res) => {
    try {
        const { modelId } = req.params;

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No image files provided',
                error: 'NO_FILES'
            });
        }

        const phoneModel = await PhoneModel.findById(modelId);

        if (!phoneModel) {
            return res.status(404).json({
                success: false,
                message: 'Phone model not found',
                error: 'MODEL_NOT_FOUND'
            });
        }

        // Check if adding these images would exceed the limit
        const totalImages = phoneModel.images.length + req.files.length;
        if (totalImages > 5) {
            return res.status(400).json({
                success: false,
                message: `Cannot upload ${req.files.length} images. Maximum 5 images allowed. Current: ${phoneModel.images.length}`,
                error: 'IMAGE_LIMIT_EXCEEDED'
            });
        }

        // Upload all images
        const uploadPromises = req.files.map(file =>
            uploadToCloudinary(file.buffer, 'phone-models')
        );
        const imageUrls = await Promise.all(uploadPromises);

        // Add to phone model
        phoneModel.images.push(...imageUrls);
        await phoneModel.save();

        return res.status(200).json({
            success: true,
            message: 'Phone model images uploaded successfully',
            data: {
                modelId: phoneModel._id,
                images: phoneModel.images,
                uploadedCount: imageUrls.length
            }
        });
    } catch (error) {
        console.error('Upload phone model images error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to upload phone model images',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Delete a specific phone model image
 */
const deletePhoneModelImage = async (req, res) => {
    try {
        const { modelId, imageIndex } = req.params;
        const index = parseInt(imageIndex);

        const phoneModel = await PhoneModel.findById(modelId);

        if (!phoneModel) {
            return res.status(404).json({
                success: false,
                message: 'Phone model not found',
                error: 'MODEL_NOT_FOUND'
            });
        }

        if (index < 0 || index >= phoneModel.images.length) {
            return res.status(400).json({
                success: false,
                message: 'Invalid image index',
                error: 'INVALID_INDEX'
            });
        }

        const imageUrl = phoneModel.images[index];

        // Delete from cloudinary
        try {
            const urlParts = imageUrl.split('/');
            const publicIdWithExt = urlParts[urlParts.length - 1];
            const publicId = `phone-models/${publicIdWithExt.split('.')[0]}`;
            await deleteFromCloudinary(publicId);
        } catch (err) {
            console.error('Error deleting image from cloudinary:', err);
        }

        // Remove from array
        phoneModel.images.splice(index, 1);
        await phoneModel.save();

        return res.status(200).json({
            success: true,
            message: 'Phone model image deleted successfully',
            data: {
                modelId: phoneModel._id,
                images: phoneModel.images
            }
        });
    } catch (error) {
        console.error('Delete phone model image error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete phone model image',
            error: 'SERVER_ERROR'
        });
    }
};

module.exports = {
    createPhoneModelValidation,
    createPhoneModel,
    getPhoneModelsByBrand,
    getPhoneModelById,
    updatePhoneModel,
    deletePhoneModel,
    uploadPhoneModelImages,
    deletePhoneModelImage
};
