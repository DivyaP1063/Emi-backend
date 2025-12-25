const express = require('express');
const router = express.Router();
const {
    sendOtpController,
    verifyOtpController,
    sendOtpValidation,
    verifyOtpValidation
} = require('../controllers/recoveryHeadAuthController');
const { getAssignedCustomers, getCustomerLocationByRecoveryHead, assignCustomerToRecoveryPerson, assignCustomerToRecoveryPersonValidation, getRecoveryPersonsWithCustomers, getAssignmentDetails, unassignCustomerFromRecoveryPerson } = require('../controllers/recoveryHeadController');
const { authenticateRecoveryHead } = require('../middleware/auth');

// POST /api/recovery-head/send-otp - Send OTP to recovery head mobile
router.post('/send-otp', sendOtpValidation, sendOtpController);

// POST /api/recovery-head/verify-otp - Verify OTP and login
router.post('/verify-otp', verifyOtpValidation, verifyOtpController);

// GET /api/recovery-head/assigned-customers - Get all assigned customers (Protected)
router.get('/assigned-customers', authenticateRecoveryHead, getAssignedCustomers);

// GET /api/recovery-head/customers/:customerId/location - Get customer location (Protected)
router.get('/customers/:customerId/location', authenticateRecoveryHead, getCustomerLocationByRecoveryHead);

// POST /api/recovery-head/assign-customer - Assign customer to recovery person (Protected)
router.post('/assign-customer', authenticateRecoveryHead, assignCustomerToRecoveryPersonValidation, assignCustomerToRecoveryPerson);

// GET /api/recovery-head/recovery-persons-with-customers - Get all recovery persons with customers (Protected)
router.get('/recovery-persons-with-customers', authenticateRecoveryHead, getRecoveryPersonsWithCustomers);

// GET /api/recovery-head/assignments/:assignmentId - Get assignment details (Protected)
router.get('/assignments/:assignmentId', authenticateRecoveryHead, getAssignmentDetails);

// DELETE /api/recovery-head/assignments/:assignmentId - Unassign customer from recovery person (Protected)
router.delete('/assignments/:assignmentId', authenticateRecoveryHead, unassignCustomerFromRecoveryPerson);

// Mount recovery person routes
const recoveryPersonRoutes = require('./recoveryPersonRoutes');
router.use('/recovery-persons', recoveryPersonRoutes);

module.exports = router;
