const Customer = require('../models/Customer');
const Retailer = require('../models/Retailer');
const RecoveryPerson = require('../models/RecoveryPerson');
const RecoveryHead = require('../models/RecoveryHead');
const excelService = require('../services/excelService');

/**
 * Report Controller
 * Handles all report generation and export functionality
 */

/**
 * Get all users report with filters
 * Query params: search, retailerId, isLocked, isActive, appInstallStatus, date, export
 */
exports.getAllUsersReport = async (req, res) => {
    try {
        const { search, retailerId, isLocked, isActive, appInstallStatus, startDate, endDate, export: exportFormat } = req.query;

        // Build filter query
        const filter = {};
        if (retailerId) filter.retailerId = retailerId;
        if (isLocked !== undefined && isLocked !== '') filter.isLocked = isLocked === 'true';

        // Track if user explicitly set isActive
        const userSetIsActive = isActive !== undefined && isActive !== '';
        if (userSetIsActive) filter.isActive = isActive === 'true';

        // Date range filter - filter by creation date
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                filter.createdAt.$lte = new Date(endDate);
            }
        }

        // App installation status filter
        // This filter overrides isActive if set
        if (appInstallStatus) {
            if (appInstallStatus === 'installed') {
                // FCM token exists and isActive is true
                filter.fcmToken = { $ne: null };
                filter.isActive = true;
            } else if (appInstallStatus === 'uninstalled') {
                // FCM token exists but isActive is false
                filter.fcmToken = { $ne: null };
                filter.isActive = false;
            } else if (appInstallStatus === 'not_installed') {
                // FCM token is null
                filter.fcmToken = null;
            }
        }

        console.log('=== USER REPORT FILTER DEBUG ===');
        console.log('Query params:', { search, retailerId, isLocked, isActive, appInstallStatus, startDate, endDate });
        console.log('Built filter:', JSON.stringify(filter, null, 2));
        console.log('================================');

        // Fetch users with retailer details
        let users = await Customer.find(filter)
            .populate('retailerId', 'fullName shopName')
            .sort({ createdAt: -1 })
            .lean();

        // Apply search filter on retailer name or shop name (post-query filtering)
        if (search && search.trim()) {
            const searchLower = search.toLowerCase().trim();
            users = users.filter(user => {
                const retailerName = user.retailerId?.fullName?.toLowerCase() || '';
                const shopName = user.retailerId?.shopName?.toLowerCase() || '';
                return retailerName.includes(searchLower) || shopName.includes(searchLower);
            });
        }

        // Export to Excel if requested
        if (exportFormat === 'excel') {
            const workbook = await excelService.generateUsersReport(users);
            const buffer = await excelService.writeToBuffer(workbook);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=users-report-${Date.now()}.xlsx`);
            return res.send(buffer);
        }

        // Return JSON data
        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        console.error('Error generating users report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate users report',
            error: error.message
        });
    }
};

/**
 * Get individual user report
 * Params: id (customer ID)
 * Query params: export
 */
exports.getIndividualUserReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { export: exportFormat } = req.query;

        const user = await Customer.findById(id)
            .populate('retailerId', 'fullName shopName email mobileNumber')
            .lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Export to Excel if requested
        if (exportFormat === 'excel') {
            const workbook = await excelService.generateIndividualUserReport(user);
            const buffer = await excelService.writeToBuffer(workbook);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=user-${user.fullName.replace(/\s+/g, '-')}-${Date.now()}.xlsx`);
            return res.send(buffer);
        }

        // Return JSON data
        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Error generating individual user report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate user report',
            error: error.message
        });
    }
};

/**
 * Get all retailers report with filters
 * Query params: status, city, state, export
 */
exports.getAllRetailersReport = async (req, res) => {
    try {
        const { status, city, state, export: exportFormat } = req.query;

        // Build filter query
        const filter = {};
        if (status) filter.status = status;
        if (city) filter['address.city'] = new RegExp(city, 'i');
        if (state) filter['address.state'] = new RegExp(state, 'i');

        const retailers = await Retailer.find(filter)
            .sort({ createdAt: -1 })
            .lean();

        // Export to Excel if requested
        if (exportFormat === 'excel') {
            const workbook = await excelService.generateRetailersReport(retailers);
            const buffer = await excelService.writeToBuffer(workbook);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=retailers-report-${Date.now()}.xlsx`);
            return res.send(buffer);
        }

        // Return JSON data
        res.status(200).json({
            success: true,
            count: retailers.length,
            data: retailers
        });
    } catch (error) {
        console.error('Error generating retailers report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate retailers report',
            error: error.message
        });
    }
};

/**
 * Get individual retailer report
 * Params: id (retailer ID)
 * Query params: export
 */
exports.getIndividualRetailerReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { export: exportFormat } = req.query;

        const retailer = await Retailer.findById(id).lean();

        if (!retailer) {
            return res.status(404).json({
                success: false,
                message: 'Retailer not found'
            });
        }

        // Get customer count for this retailer
        const customerCount = await Customer.countDocuments({ retailerId: id });
        retailer.customerCount = customerCount;

        // Export to Excel if requested
        if (exportFormat === 'excel') {
            const workbook = await excelService.generateRetailersReport([retailer]);
            const buffer = await excelService.writeToBuffer(workbook);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=retailer-${retailer.fullName.replace(/\s+/g, '-')}-${Date.now()}.xlsx`);
            return res.send(buffer);
        }

        // Return JSON data
        res.status(200).json({
            success: true,
            data: retailer
        });
    } catch (error) {
        console.error('Error generating individual retailer report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate retailer report',
            error: error.message
        });
    }
};

/**
 * Get overdue EMI report
 * Query params: retailerId, isLocked, minDaysOverdue, maxDaysOverdue, minAmount, maxAmount, export
 */
exports.getOverdueEmiReport = async (req, res) => {
    try {
        const { retailerId, isLocked, minDaysOverdue, maxDaysOverdue, minAmount, maxAmount, export: exportFormat } = req.query;

        // Build filter query
        const filter = {};
        if (retailerId) filter.retailerId = retailerId;
        if (isLocked !== undefined) filter.isLocked = isLocked === 'true';

        // Fetch all customers with their EMI details
        const customers = await Customer.find(filter)
            .populate('retailerId', 'fullName shopName')
            .lean();

        // Filter customers with overdue EMIs
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const overdueCustomers = [];

        customers.forEach(customer => {
            const overdueEmis = customer.emiDetails.emiMonths.filter(emi => {
                if (emi.paid) return false;

                const dueDate = new Date(emi.dueDate);
                dueDate.setHours(0, 0, 0, 0);

                if (dueDate >= today) return false;

                const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

                // Apply filters
                if (minDaysOverdue && daysOverdue < parseInt(minDaysOverdue)) return false;
                if (maxDaysOverdue && daysOverdue > parseInt(maxDaysOverdue)) return false;
                if (minAmount && emi.amount < parseFloat(minAmount)) return false;
                if (maxAmount && emi.amount > parseFloat(maxAmount)) return false;

                emi.daysOverdue = daysOverdue;
                return true;
            });

            if (overdueEmis.length > 0) {
                const totalOverdueAmount = overdueEmis.reduce((sum, emi) => sum + emi.amount, 0);
                overdueCustomers.push({
                    ...customer,
                    overdueEmis,
                    totalOverdueEmis: overdueEmis.length,
                    totalOverdueAmount
                });
            }
        });

        // Export to Excel if requested
        if (exportFormat === 'excel') {
            const workbook = await excelService.generateOverdueEmiReport(overdueCustomers);
            const buffer = await excelService.writeToBuffer(workbook);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=overdue-emi-report-${Date.now()}.xlsx`);
            return res.send(buffer);
        }

        // Return JSON data
        res.status(200).json({
            success: true,
            count: overdueCustomers.length,
            data: overdueCustomers
        });
    } catch (error) {
        console.error('Error generating overdue EMI report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate overdue EMI report',
            error: error.message
        });
    }
};

/**
 * Get individual customer overdue EMI report
 * Params: customerId
 * Query params: export
 */
exports.getIndividualOverdueEmiReport = async (req, res) => {
    try {
        const { customerId } = req.params;
        const { export: exportFormat } = req.query;

        const customer = await Customer.findById(customerId)
            .populate('retailerId', 'fullName shopName')
            .lean();

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        // Calculate overdue EMIs
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const overdueEmis = customer.emiDetails.emiMonths.filter(emi => {
            if (emi.paid) return false;

            const dueDate = new Date(emi.dueDate);
            dueDate.setHours(0, 0, 0, 0);

            if (dueDate >= today) return false;

            const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
            emi.daysOverdue = daysOverdue;
            return true;
        });

        const totalOverdueAmount = overdueEmis.reduce((sum, emi) => sum + emi.amount, 0);

        const result = {
            ...customer,
            overdueEmis,
            totalOverdueEmis: overdueEmis.length,
            totalOverdueAmount
        };

        // Export to Excel if requested
        if (exportFormat === 'excel') {
            const workbook = await excelService.generateOverdueEmiReport([result]);
            const buffer = await excelService.writeToBuffer(workbook);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=overdue-emi-${customer.fullName.replace(/\s+/g, '-')}-${Date.now()}.xlsx`);
            return res.send(buffer);
        }

        // Return JSON data
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error generating individual overdue EMI report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate overdue EMI report',
            error: error.message
        });
    }
};

/**
 * Get down payment pending report
 * Query params: customerName, retailerName, retailerId, isLocked, minAmount, maxAmount, paymentStatus, startDate, endDate, export
 */
exports.getDownPaymentPendingReport = async (req, res) => {
    try {
        const { customerName, retailerName, retailerId, isLocked, minAmount, maxAmount, paymentStatus, startDate, endDate, export: exportFormat } = req.query;

        // Build filter query
        const filter = {};

        // Payment status filter
        if (paymentStatus === 'pending') {
            filter['emiDetails.downPaymentPending'] = { $gt: 0 };
        } else if (paymentStatus === 'paid') {
            filter['emiDetails.downPaymentPending'] = 0;
        }
        // If 'all', don't filter by payment status

        // Customer name search (case-insensitive)
        if (customerName && customerName.trim()) {
            filter.fullName = new RegExp(customerName.trim(), 'i');
        }

        if (retailerId) filter.retailerId = retailerId;
        if (isLocked !== undefined) filter.isLocked = isLocked === 'true';

        // Amount range filter (only for pending payments)
        if (minAmount && paymentStatus !== 'paid') {
            if (!filter['emiDetails.downPaymentPending']) {
                filter['emiDetails.downPaymentPending'] = {};
            }
            filter['emiDetails.downPaymentPending'].$gte = parseFloat(minAmount);
        }
        if (maxAmount && paymentStatus !== 'paid') {
            if (!filter['emiDetails.downPaymentPending']) {
                filter['emiDetails.downPaymentPending'] = {};
            }
            filter['emiDetails.downPaymentPending'].$lte = parseFloat(maxAmount);
        }

        // Date range filter - filter by creation date
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                filter.createdAt.$lte = new Date(endDate);
            }
        }

        let customers = await Customer.find(filter)
            .populate('retailerId', 'fullName shopName')
            .sort({ 'emiDetails.downPaymentPending': -1 })
            .lean();

        // Apply retailer name search filter (post-query filtering since it's on populated field)
        if (retailerName && retailerName.trim()) {
            const searchLower = retailerName.toLowerCase().trim();
            customers = customers.filter(customer => {
                const retailerFullName = customer.retailerId?.fullName?.toLowerCase() || '';
                const shopName = customer.retailerId?.shopName?.toLowerCase() || '';
                return retailerFullName.includes(searchLower) || shopName.includes(searchLower);
            });
        }

        // Export to Excel if requested
        if (exportFormat === 'excel') {
            const workbook = await excelService.generateDownPaymentPendingReport(customers);
            const buffer = await excelService.writeToBuffer(workbook);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=down-payment-pending-${Date.now()}.xlsx`);
            return res.send(buffer);
        }

        // Return JSON data
        res.status(200).json({
            success: true,
            count: customers.length,
            data: customers
        });
    } catch (error) {
        console.error('Error generating down payment pending report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate down payment pending report',
            error: error.message
        });
    }
};

/**
 * Get individual customer down payment pending report
 * Params: customerId
 * Query params: export
 */
exports.getIndividualDownPaymentPendingReport = async (req, res) => {
    try {
        const { customerId } = req.params;
        const { export: exportFormat } = req.query;

        const customer = await Customer.findById(customerId)
            .populate('retailerId', 'fullName shopName')
            .lean();

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        if (customer.emiDetails.downPaymentPending <= 0) {
            return res.status(404).json({
                success: false,
                message: 'No down payment pending for this customer'
            });
        }

        // Export to Excel if requested
        if (exportFormat === 'excel') {
            const workbook = await excelService.generateDownPaymentPendingReport([customer]);
            const buffer = await excelService.writeToBuffer(workbook);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=down-payment-${customer.fullName.replace(/\s+/g, '-')}-${Date.now()}.xlsx`);
            return res.send(buffer);
        }

        // Return JSON data
        res.status(200).json({
            success: true,
            data: customer
        });
    } catch (error) {
        console.error('Error generating individual down payment pending report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate down payment pending report',
            error: error.message
        });
    }
};
/**
 * Get EMI Details Report
 * Shows all customers with month-by-month EMI breakdown
 * Query params: retailerId, customerId, emiStatus, startDate, endDate, export
 */
exports.getEMIDetailsReport = async (req, res) => {
    try {
        const { retailerId, customerId, customerSearch, emiStatus, startDate, endDate, export: exportFormat } = req.query;

        // Build filter query
        const filter = {};
        if (retailerId) filter.retailerId = retailerId;
        if (customerId) filter._id = customerId;

        // Fetch customers with populated retailer
        let customers = await Customer.find(filter)
            .populate('retailerId', 'fullName shopName')
            .sort({ createdAt: -1 })
            .lean();

        // Apply customer search filter (by name, mobile, or IMEI)
        if (customerSearch && customerSearch.trim()) {
            const searchLower = customerSearch.toLowerCase().trim();
            customers = customers.filter(customer => {
                const fullName = customer.fullName?.toLowerCase() || '';
                const mobile = customer.mobileNumber?.toLowerCase() || '';
                const imei = customer.imei1?.toLowerCase() || '';
                return fullName.includes(searchLower) ||
                    mobile.includes(searchLower) ||
                    imei.includes(searchLower);
            });
        }

        // Apply EMI status filter if specified (date-range aware)
        if (emiStatus) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Parse date range for EMI filtering
            let filterStartDate = null;
            let filterEndDate = null;
            if (startDate) {
                filterStartDate = new Date(startDate);
                filterStartDate.setHours(0, 0, 0, 0);
            }
            if (endDate) {
                filterEndDate = new Date(endDate);
                filterEndDate.setHours(23, 59, 59, 999);
            }

            customers = customers.filter(customer => {
                // Check if customer has at least one EMI matching the status within the date range
                return customer.emiDetails.emiMonths.some(emi => {
                    const dueDate = new Date(emi.dueDate);
                    dueDate.setHours(0, 0, 0, 0);

                    // If date range is specified, only check EMIs within that range
                    if (filterStartDate && dueDate < filterStartDate) return false;
                    if (filterEndDate && dueDate > filterEndDate) return false;

                    if (emiStatus === 'paid') {
                        return emi.paid === true;
                    } else if (emiStatus === 'pending') {
                        // Pending means not paid and not overdue (due date is today or in the future)
                        if (emi.paid) return false;
                        return dueDate >= today;
                    } else if (emiStatus === 'overdue') {
                        // Overdue means not paid and due date is in the past
                        if (emi.paid) return false;
                        return dueDate < today;
                    }
                    return false;
                });
            });
        }

        // Keep customers as is, just add EMI month data as properties
        const emiDetails = customers.map(customer => {
            const customerData = {
                _id: customer._id,
                fullName: customer.fullName,
                fatherName: customer.fatherName,
                mobileNumber: customer.mobileNumber,
                aadharNumber: customer.aadharNumber,
                imei1: customer.imei1,
                productName: customer.emiDetails.productName,
                model: customer.emiDetails.model,
                sellPrice: customer.emiDetails.sellPrice,
                downPayment: customer.emiDetails.downPayment,
                downPaymentPending: customer.emiDetails.downPaymentPending,
                totalEmiAmount: customer.emiDetails.totalEmiAmount,
                balanceAmount: customer.emiDetails.balanceAmount,
                retailerId: customer.retailerId,
                address: customer.address,
                emiMonths: customer.emiDetails.emiMonths // Keep all EMI months
            };

            return customerData;
        });

        // Export to Excel if requested
        if (exportFormat === 'excel') {
            const workbook = await excelService.generateEMIDetailsReport(emiDetails);
            const buffer = await excelService.writeToBuffer(workbook);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=emi-details-report-${Date.now()}.xlsx`);
            return res.send(buffer);
        }

        // Return JSON data
        res.status(200).json({
            success: true,
            data: emiDetails,
            count: emiDetails.length
        });
    } catch (error) {
        console.error('Error generating EMI details report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate EMI details report',
            error: error.message
        });
    }
};

/**
 * Get Recovery Report
 * Shows recovery persons with their assigned customers and collection status
 * Query params: recoveryPersonId, recoveryHeadId, collectionStatus, paymentStatus, startDate, endDate, export
 */
exports.getRecoveryReport = async (req, res) => {
    try {
        const { recoveryPersonId, recoveryHeadId, collectionStatus, paymentStatus, startDate, endDate, export: exportFormat } = req.query;

        // Build filter for recovery persons
        const filter = {};
        if (recoveryPersonId) filter._id = recoveryPersonId;

        // Fetch recovery persons with their customers
        let recoveryPersons = await RecoveryPerson.find(filter)
            .populate({
                path: 'customers.customerId',
                select: 'fullName fatherName mobileNumber imei1 emiDetails address isCollected collectionDate devicePin paymentDeadline assigned assignedTo assignedToRecoveryHeadId'
            })
            .lean();

        // Flatten data - create one row per customer assignment
        const recoveryData = [];
        for (const person of recoveryPersons) {
            for (const customerAssignment of person.customers) {
                const customer = customerAssignment.customerId;
                if (!customer) continue;

                // Get recovery head info if customer is assigned
                let recoveryHead = null;
                if (customer.assignedToRecoveryHeadId) {
                    recoveryHead = await RecoveryHead.findById(customer.assignedToRecoveryHeadId).select('fullName').lean();
                }

                // Filter by recovery head if specified
                if (recoveryHeadId && (!recoveryHead || recoveryHead._id.toString() !== recoveryHeadId)) {
                    continue;
                }

                // Filter by collection status
                if (collectionStatus) {
                    if (collectionStatus === 'collected' && !customer.isCollected) continue;
                    if (collectionStatus === 'pending' && customer.isCollected) continue;
                }

                // Filter by payment status
                if (paymentStatus) {
                    if (paymentStatus === 'paid' && !customerAssignment.moneyReceived) continue;
                    if (paymentStatus === 'pending' && customerAssignment.moneyReceived) continue;
                }

                // Filter by date range (assignment date)
                if (startDate || endDate) {
                    const assignedDate = customer.assignedAt ? new Date(customer.assignedAt) : null;
                    if (!assignedDate) continue;

                    if (startDate && assignedDate < new Date(startDate)) continue;
                    if (endDate && assignedDate > new Date(endDate)) continue;
                }

                recoveryData.push({
                    recoveryPersonName: person.fullName,
                    recoveryPersonMobile: person.mobileNumber,
                    recoveryHeadName: recoveryHead ? recoveryHead.fullName : 'N/A',
                    customerId: customer._id,
                    customerName: customer.fullName,
                    fatherName: customer.fatherName,
                    mobile: customer.mobileNumber,
                    imei: customer.imei1,
                    product: customer.emiDetails.productName,
                    isCollected: customer.isCollected,
                    collectionDate: customer.collectionDate,
                    devicePin: customer.devicePin,
                    paymentDeadline: customer.paymentDeadline,
                    moneyReceived: customerAssignment.moneyReceived,
                    balanceAmount: customer.emiDetails.balanceAmount,
                    district: customer.address.district,
                    pincode: customer.address.pincode,
                    assignedDate: customer.assignedAt
                });
            }
        }

        // Export to Excel if requested
        if (exportFormat === 'excel') {
            const workbook = await excelService.generateRecoveryReport(recoveryData);
            const buffer = await excelService.writeToBuffer(workbook);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=recovery-report-${Date.now()}.xlsx`);
            return res.send(buffer);
        }

        // Return JSON data
        res.status(200).json({
            success: true,
            data: recoveryData,
            count: recoveryData.length
        });
    } catch (error) {
        console.error('Error generating recovery report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate recovery report',
            error: error.message
        });
    }
};

/**
 * Get Retailer Full Report
 * Shows complete details of a specific retailer and all their customers
 * Path param: retailerId
 * Query params: export
 */
exports.getRetailerFullReport = async (req, res) => {
    try {
        const { retailerId } = req.params;
        const { export: exportFormat } = req.query;

        // Fetch retailer
        const retailer = await Retailer.findById(retailerId).lean();
        if (!retailer) {
            return res.status(404).json({
                success: false,
                message: 'Retailer not found'
            });
        }

        // Fetch all customers under this retailer
        const customers = await Customer.find({ retailerId })
            .sort({ createdAt: -1 })
            .lean();

        // Calculate summary statistics
        const totalCustomers = customers.length;
        const totalEMIAmount = customers.reduce((sum, c) => sum + c.emiDetails.totalEmiAmount, 0);
        const totalPendingAmount = customers.reduce((sum, c) => sum + c.emiDetails.balanceAmount, 0);
        const totalDownPaymentPending = customers.reduce((sum, c) => sum + c.emiDetails.downPaymentPending, 0);
        const lockedCustomers = customers.filter(c => c.isLocked).length;
        const activeCustomers = customers.filter(c => c.isActive).length;

        const summary = {
            totalCustomers,
            totalEMIAmount,
            totalPendingAmount,
            totalDownPaymentPending,
            lockedCustomers,
            activeCustomers
        };

        // Export to Excel if requested
        if (exportFormat === 'excel') {
            const workbook = await excelService.generateRetailerFullReport(retailer, customers, summary);
            const buffer = await excelService.writeToBuffer(workbook);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=retailer-${retailer.fullName.replace(/\s+/g, '-')}-${Date.now()}.xlsx`);
            return res.send(buffer);
        }

        // Return JSON data
        res.status(200).json({
            success: true,
            data: {
                retailer,
                customers,
                summary
            }
        });
    } catch (error) {
        console.error('Error generating retailer full report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate retailer full report',
            error: error.message
        });
    }
};
