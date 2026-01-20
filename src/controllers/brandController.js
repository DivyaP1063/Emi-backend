const { body, param, query, validationResult } = require('express-validator');
const Brand = require('../models/Brand');
const PhoneModel = require('../models/PhoneModel');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

/**
 * Validation rules for creating a brand
 */
const createBrandValidation = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Brand name is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('Brand name must be between 2 and 50 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description must not exceed 500 characters')
];

/**
 * Create a new brand
 */
const createBrand = async (req, res) => {
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

        const { name, description } = req.body;

        // Check if brand already exists
        const existingBrand = await Brand.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        if (existingBrand) {
            return res.status(400).json({
                success: false,
                message: 'Brand with this name already exists',
                error: 'DUPLICATE_BRAND'
            });
        }

        // Create brand
        const brand = new Brand({
            name,
            description: description || null,
            createdBy: req.admin.id
        });

        await brand.save();

        return res.status(201).json({
            success: true,
            message: 'Brand created successfully',
            data: {
                brandId: brand._id,
                name: brand.name,
                description: brand.description,
                logo: brand.logo,
                isActive: brand.isActive,
                createdAt: brand.createdAt
            }
        });
    } catch (error) {
        console.error('Create brand error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create brand',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Get all brands with pagination and search
 */
const getAllBrands = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';
        const isActive = req.query.isActive; // Optional filter

        const skip = (page - 1) * limit;

        // Build query
        const query = {};
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }
        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        // Get brands with pagination
        const brands = await Brand.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('name logo description isActive createdAt updatedAt');

        const totalBrands = await Brand.countDocuments(query);
        const totalPages = Math.ceil(totalBrands / limit);

        return res.status(200).json({
            success: true,
            message: 'Brands fetched successfully',
            data: {
                brands,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems: totalBrands,
                    itemsPerPage: limit,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            }
        });
    } catch (error) {
        console.error('Get brands error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch brands',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Get single brand by ID
 */
const getBrandById = async (req, res) => {
    try {
        const { brandId } = req.params;

        const brand = await Brand.findById(brandId);

        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found',
                error: 'BRAND_NOT_FOUND'
            });
        }

        // Get model count for this brand
        const modelCount = await PhoneModel.countDocuments({ brandId: brand._id, isActive: true });

        return res.status(200).json({
            success: true,
            message: 'Brand fetched successfully',
            data: {
                brand: {
                    id: brand._id,
                    name: brand.name,
                    logo: brand.logo,
                    description: brand.description,
                    isActive: brand.isActive,
                    modelCount,
                    createdAt: brand.createdAt,
                    updatedAt: brand.updatedAt
                }
            }
        });
    } catch (error) {
        console.error('Get brand error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch brand',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Update brand details
 */
const updateBrand = async (req, res) => {
    try {
        const { brandId } = req.params;
        const { name, description, isActive } = req.body;

        const brand = await Brand.findById(brandId);

        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found',
                error: 'BRAND_NOT_FOUND'
            });
        }

        // Check if new name conflicts with existing brand
        if (name && name !== brand.name) {
            const existingBrand = await Brand.findOne({
                name: { $regex: new RegExp(`^${name}$`, 'i') },
                _id: { $ne: brandId }
            });
            if (existingBrand) {
                return res.status(400).json({
                    success: false,
                    message: 'Brand with this name already exists',
                    error: 'DUPLICATE_BRAND'
                });
            }
            brand.name = name;
        }

        if (description !== undefined) brand.description = description;
        if (isActive !== undefined) brand.isActive = isActive;

        await brand.save();

        return res.status(200).json({
            success: true,
            message: 'Brand updated successfully',
            data: {
                brandId: brand._id,
                name: brand.name,
                description: brand.description,
                logo: brand.logo,
                isActive: brand.isActive,
                updatedAt: brand.updatedAt
            }
        });
    } catch (error) {
        console.error('Update brand error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update brand',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Delete brand (soft delete)
 */
const deleteBrand = async (req, res) => {
    try {
        const { brandId } = req.params;

        const brand = await Brand.findById(brandId);

        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found',
                error: 'BRAND_NOT_FOUND'
            });
        }

        // Soft delete
        brand.isActive = false;
        await brand.save();

        // Also deactivate all models under this brand
        await PhoneModel.updateMany(
            { brandId: brand._id },
            { $set: { isActive: false } }
        );

        return res.status(200).json({
            success: true,
            message: 'Brand deactivated successfully',
            data: {
                brandId: brand._id,
                name: brand.name,
                isActive: brand.isActive
            }
        });
    } catch (error) {
        console.error('Delete brand error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete brand',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Upload brand logo
 */
const uploadBrandLogo = async (req, res) => {
    try {
        const { brandId } = req.params;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided',
                error: 'NO_FILE'
            });
        }

        const brand = await Brand.findById(brandId);

        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found',
                error: 'BRAND_NOT_FOUND'
            });
        }

        // Delete old logo if exists
        if (brand.logo) {
            try {
                // Extract public_id from cloudinary URL
                const urlParts = brand.logo.split('/');
                const publicIdWithExt = urlParts[urlParts.length - 1];
                const publicId = `brands/${publicIdWithExt.split('.')[0]}`;
                await deleteFromCloudinary(publicId);
            } catch (err) {
                console.error('Error deleting old logo:', err);
            }
        }

        // Upload new logo
        const uploadResult = await uploadToCloudinary(req.file.buffer, 'brands');
        brand.logo = uploadResult.secure_url;
        await brand.save();

        return res.status(200).json({
            success: true,
            message: 'Brand logo uploaded successfully',
            data: {
                brandId: brand._id,
                logo: brand.logo
            }
        });
    } catch (error) {
        console.error('Upload brand logo error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to upload brand logo',
            error: 'SERVER_ERROR'
        });
    }
};

module.exports = {
    createBrandValidation,
    createBrand,
    getAllBrands,
    getBrandById,
    updateBrand,
    deleteBrand,
    uploadBrandLogo
};
