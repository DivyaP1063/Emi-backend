const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const reportController = require('../controllers/reportController');

/**
 * Report Routes
 * All routes are protected with admin authentication
 */

// Users Reports
router.get('/users', authenticate, reportController.getAllUsersReport);
router.get('/users/:id', authenticate, reportController.getIndividualUserReport);

// Retailers Reports
router.get('/retailers', authenticate, reportController.getAllRetailersReport);
router.get('/retailers/:id', authenticate, reportController.getIndividualRetailerReport);

// Overdue EMI Reports
router.get('/overdue-emi', authenticate, reportController.getOverdueEmiReport);
router.get('/overdue-emi/:customerId', authenticate, reportController.getIndividualOverdueEmiReport);

// Down Payment Pending Reports
router.get('/down-payment-pending', authenticate, reportController.getDownPaymentPendingReport);
router.get('/down-payment-pending/:customerId', authenticate, reportController.getIndividualDownPaymentPendingReport);

// EMI Details Report
router.get('/emi-details', authenticate, reportController.getEMIDetailsReport);

// Recovery Report
router.get('/recovery', authenticate, reportController.getRecoveryReport);

// Retailer Full Report
router.get('/retailer-full/:retailerId', authenticate, reportController.getRetailerFullReport);

module.exports = router;
