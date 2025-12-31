const express = require('express');
const router = express.Router();
const {
    initiateGoogleAuth,
    googleAuthCallback,
    getAdminGoogleUserId
} = require('../controllers/googleController');

// GET /auth/google?adminId=xxx - Start OAuth flow
router.get('/google', initiateGoogleAuth);

// GET /auth/google/callback - OAuth callback
router.get('/google/callback', googleAuthCallback);

// GET /auth/google/userid/:adminId - Get stored userId
router.get('/google/userid/:adminId', getAdminGoogleUserId);

module.exports = router;