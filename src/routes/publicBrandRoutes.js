const express = require('express');
const router = express.Router();
const Brand = require('../models/Brand');
const PhoneModel = require('../models/PhoneModel');
const PhoneVariant = require('../models/PhoneVariant');

/**
 * @route   GET /api/brands
 * @desc    Get all active brands
 * @access  Public
 */
router.get('/brands', async (req, res) => {
    try {
        const brands = await Brand.find({ isActive: true })
            .sort({ name: 1 })
            .select('name logo description');

        return res.status(200).json({
            success: true,
            message: 'Brands fetched successfully',
            data: { brands }
        });
    } catch (error) {
        console.error('Get brands error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch brands',
            error: 'SERVER_ERROR'
        });
    }
});

/**
 * @route   GET /api/brands/:brandId/models
 * @desc    Get all active models for a brand
 * @access  Public
 */
router.get('/brands/:brandId/models', async (req, res) => {
    try {
        const { brandId } = req.params;

        const brand = await Brand.findOne({ _id: brandId, isActive: true });
        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found',
                error: 'BRAND_NOT_FOUND'
            });
        }

        const phoneModels = await PhoneModel.find({
            brandId,
            isActive: true
        })
            .sort({ modelName: 1 })
            .select('modelName images');

        return res.status(200).json({
            success: true,
            message: 'Phone models fetched successfully',
            data: {
                brand: {
                    id: brand._id,
                    name: brand.name,
                    logo: brand.logo
                },
                phoneModels
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
});

/**
 * @route   GET /api/models/:modelId/variants
 * @desc    Get all active variants for a model
 * @access  Public
 */
router.get('/models/:modelId/variants', async (req, res) => {
    try {
        const { modelId } = req.params;

        const phoneModel = await PhoneModel.findOne({
            _id: modelId,
            isActive: true
        }).populate('brandId', 'name logo');

        if (!phoneModel) {
            return res.status(404).json({
                success: false,
                message: 'Phone model not found',
                error: 'MODEL_NOT_FOUND'
            });
        }

        const phoneVariants = await PhoneVariant.find({
            phoneModelId: modelId,
            isActive: true
        })
            .sort({ ram: 1, rom: 1 })
            .select('ram rom color price mrp stock sku');

        return res.status(200).json({
            success: true,
            message: 'Phone variants fetched successfully',
            data: {
                phoneModel: {
                    id: phoneModel._id,
                    name: phoneModel.modelName,
                    brand: phoneModel.brandId,
                    images: phoneModel.images
                },
                phoneVariants
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
});

/**
 * @route   GET /api/variants/:variantId
 * @desc    Get single variant details
 * @access  Public
 */
router.get('/variants/:variantId', async (req, res) => {
    try {
        const { variantId } = req.params;

        const phoneVariant = await PhoneVariant.findOne({
            _id: variantId,
            isActive: true
        }).populate({
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
                    sku: phoneVariant.sku
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
});

module.exports = router;
