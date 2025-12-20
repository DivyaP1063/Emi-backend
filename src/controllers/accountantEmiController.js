const Customer = require('../models/Customer');

/**
 * Update EMI Payment Status (Accountant only)
 */
const updateEmiPaymentStatus = async (req, res) => {
    try {
        const { customerId, monthNumber } = req.params;
        const { paid, paidDate } = req.body;

        // Validate required fields
        if (typeof paid !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'Paid status is required and must be a boolean',
                error: 'VALIDATION_ERROR'
            });
        }

        // Validate customerId format
        if (!customerId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid customer ID format',
                error: 'VALIDATION_ERROR'
            });
        }

        // Get customer
        const customer = await Customer.findById(customerId);

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found',
                error: 'CUSTOMER_NOT_FOUND'
            });
        }

        // Validate month number
        const month = parseInt(monthNumber);
        if (isNaN(month) || month < 1 || month > customer.emiDetails.numberOfMonths) {
            return res.status(400).json({
                success: false,
                message: `Invalid month number. Must be between 1 and ${customer.emiDetails.numberOfMonths}`,
                error: 'INVALID_MONTH_NUMBER'
            });
        }

        // Find the EMI month
        const emiMonth = customer.emiDetails.emiMonths.find(m => m.month === month);

        if (!emiMonth) {
            return res.status(404).json({
                success: false,
                message: `EMI month ${month} not found`,
                error: 'EMI_MONTH_NOT_FOUND'
            });
        }

        // Update payment status
        emiMonth.paid = paid;

        if (paid) {
            // If marking as paid, set paidDate (use provided date or current date)
            emiMonth.paidDate = paidDate ? new Date(paidDate) : new Date();
        } else {
            // If marking as pending, remove paidDate
            emiMonth.paidDate = undefined;
        }

        // Save customer
        await customer.save();

        return res.status(200).json({
            success: true,
            message: `EMI month ${month} marked as ${paid ? 'paid' : 'pending'}`,
            data: {
                customerId: customer._id.toString(),
                customerName: customer.fullName,
                monthNumber: month,
                paid: emiMonth.paid,
                paidDate: emiMonth.paidDate,
                amount: emiMonth.amount,
                emiDetails: customer.emiDetails
            }
        });
    } catch (error) {
        console.error('Update EMI payment status error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update EMI payment status',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Get all customers (Accountant only)
 */
const getCustomers = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '' } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Build search query
        let searchQuery = {};
        if (search) {
            searchQuery = {
                $or: [
                    { fullName: { $regex: search, $options: 'i' } },
                    { mobileNumber: { $regex: search, $options: 'i' } },
                    { aadharNumber: { $regex: search, $options: 'i' } },
                    { imei1: { $regex: search, $options: 'i' } },
                    { imei2: { $regex: search, $options: 'i' } }
                ]
            };
        }

        // Get total count
        const totalCustomers = await Customer.countDocuments(searchQuery);

        // Fetch customers with pagination
        const customers = await Customer.find(searchQuery)
            .populate('retailerId', 'fullName shopName mobileNumber')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean();

        // Format response
        const formattedCustomers = customers.map(customer => ({
            id: customer._id.toString(),
            fullName: customer.fullName,
            mobileNumber: customer.mobileNumber,
            mobileVerified: customer.mobileVerified,
            aadharNumber: customer.aadharNumber,
            dob: customer.dob,
            imei1: customer.imei1,
            imei2: customer.imei2,
            fatherName: customer.fatherName,
            address: customer.address,
            documents: customer.documents,
            emiDetails: customer.emiDetails,
            isLocked: customer.isLocked,
            retailer: customer.retailerId ? {
                id: customer.retailerId._id?.toString(),
                name: customer.retailerId.fullName,
                shopName: customer.retailerId.shopName,
                mobile: customer.retailerId.mobileNumber
            } : null,
            createdAt: customer.createdAt,
            updatedAt: customer.updatedAt
        }));

        const totalPages = Math.ceil(totalCustomers / limitNum);

        return res.status(200).json({
            success: true,
            message: 'Customers fetched successfully',
            data: {
                customers: formattedCustomers,
                pagination: {
                    currentPage: pageNum,
                    totalPages,
                    totalItems: totalCustomers,
                    itemsPerPage: limitNum,
                    hasNextPage: pageNum < totalPages,
                    hasPrevPage: pageNum > 1
                }
            }
        });
    } catch (error) {
        console.error('Get customers error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch customers',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Get customers with pending EMI payments (Accountant only)
 */
const getPendingEmiCustomers = async (req, res) => {
    try {
        const mongoose = require('mongoose');
        const { page = 1, limit = 20, search = '' } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Build base query
        let matchQuery = {};

        // Add search filter if provided
        if (search) {
            matchQuery.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { mobileNumber: { $regex: search, $options: 'i' } },
                { aadharNumber: { $regex: search, $options: 'i' } },
                { imei1: { $regex: search, $options: 'i' } },
                { imei2: { $regex: search, $options: 'i' } }
            ];
        }

        const currentDate = new Date();

        // Aggregate to find customers with pending EMIs
        const customers = await Customer.aggregate([
            { $match: matchQuery },
            {
                $addFields: {
                    pendingEmis: {
                        $filter: {
                            input: '$emiDetails.emiMonths',
                            as: 'emi',
                            cond: {
                                $and: [
                                    { $eq: ['$$emi.paid', false] },
                                    { $lt: ['$$emi.dueDate', currentDate] }
                                ]
                            }
                        }
                    }
                }
            },
            {
                $match: {
                    'pendingEmis.0': { $exists: true } // Only customers with at least one pending EMI
                }
            },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limitNum },
            {
                $lookup: {
                    from: 'retailers',
                    localField: 'retailerId',
                    foreignField: '_id',
                    as: 'retailer'
                }
            },
            { $unwind: { path: '$retailer', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    fullName: 1,
                    mobileNumber: 1,
                    aadharNumber: 1,
                    dob: 1,
                    imei1: 1,
                    imei2: 1,
                    fatherName: 1,
                    address: 1,
                    documents: 1,
                    isLocked: 1,
                    'emiDetails.branch': 1,
                    'emiDetails.phoneType': 1,
                    'emiDetails.model': 1,
                    'emiDetails.productName': 1,
                    'emiDetails.emiPerMonth': 1,
                    'emiDetails.numberOfMonths': 1,
                    pendingEmis: 1,
                    retailer: {
                        id: '$retailer._id',
                        fullName: '$retailer.fullName',
                        shopName: '$retailer.shopName',
                        mobileNumber: '$retailer.mobileNumber'
                    },
                    createdAt: 1
                }
            }
        ]);

        // Get total count
        const totalCountResult = await Customer.aggregate([
            { $match: matchQuery },
            {
                $addFields: {
                    pendingEmis: {
                        $filter: {
                            input: '$emiDetails.emiMonths',
                            as: 'emi',
                            cond: {
                                $and: [
                                    { $eq: ['$$emi.paid', false] },
                                    { $lt: ['$$emi.dueDate', currentDate] }
                                ]
                            }
                        }
                    }
                }
            },
            {
                $match: {
                    'pendingEmis.0': { $exists: true }
                }
            },
            { $count: 'total' }
        ]);

        const totalItems = totalCountResult.length > 0 ? totalCountResult[0].total : 0;
        const totalPages = Math.ceil(totalItems / limitNum);

        return res.status(200).json({
            success: true,
            message: 'Pending EMI customers fetched successfully',
            data: {
                customers: customers.map(c => ({
                    id: c._id.toString(),
                    fullName: c.fullName,
                    mobileNumber: c.mobileNumber,
                    aadharNumber: c.aadharNumber,
                    dob: c.dob,
                    imei1: c.imei1,
                    imei2: c.imei2,
                    fatherName: c.fatherName,
                    address: c.address,
                    documents: c.documents,
                    isLocked: c.isLocked,
                    emiDetails: {
                        branch: c.emiDetails.branch,
                        phoneType: c.emiDetails.phoneType,
                        model: c.emiDetails.model,
                        productName: c.emiDetails.productName,
                        emiPerMonth: c.emiDetails.emiPerMonth,
                        numberOfMonths: c.emiDetails.numberOfMonths
                    },
                    pendingEmis: c.pendingEmis,
                    retailer: c.retailer.id ? {
                        id: c.retailer.id.toString(),
                        fullName: c.retailer.fullName,
                        shopName: c.retailer.shopName,
                        mobileNumber: c.retailer.mobileNumber
                    } : null,
                    createdAt: c.createdAt
                })),
                pagination: {
                    currentPage: pageNum,
                    totalPages,
                    totalItems,
                    itemsPerPage: limitNum,
                    hasNextPage: pageNum < totalPages,
                    hasPrevPage: pageNum > 1
                }
            }
        });
    } catch (error) {
        console.error('Get pending EMI customers error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch pending EMI customers',
            error: 'SERVER_ERROR'
        });
    }
};

module.exports = {
    updateEmiPaymentStatus,
    getCustomers,
    getPendingEmiCustomers
};
