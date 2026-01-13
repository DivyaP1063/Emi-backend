const Customer = require('../models/Customer');
const Retailer = require('../models/Retailer');
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
 * Query params: retailerId, isLocked, minAmount, maxAmount, paymentStatus, startDate, endDate, export
 */
exports.getDownPaymentPendingReport = async (req, res) => {
    try {
        const { retailerId, isLocked, minAmount, maxAmount, paymentStatus, startDate, endDate, export: exportFormat } = req.query;

        // Build filter query
        const filter = {};

        // Payment status filter
        if (paymentStatus === 'pending') {
            filter['emiDetails.downPaymentPending'] = { $gt: 0 };
        } else if (paymentStatus === 'paid') {
            filter['emiDetails.downPaymentPending'] = 0;
        }
        // If 'all', don't filter by payment status

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

        const customers = await Customer.find(filter)
            .populate('retailerId', 'fullName shopName')
            .sort({ 'emiDetails.downPaymentPending': -1 })
            .lean();

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
