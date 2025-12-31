/**
 * Google OAuth Controller
 * Used to get admin's Google UserId for FRP (Factory Reset Protection)
 */

const Admin = require("../models/Admin");

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

/**
 * Redirect admin to Google OAuth consent screen
 */
const initiateGoogleAuth = (req, res) => {
    const { adminId } = req.query;

    if (!adminId) {
        return res.status(400).json({
            success: false,
            message: 'adminId query parameter is required'
        });
    }

    // Store adminId in state parameter to retrieve after OAuth
    const state = Buffer.from(JSON.stringify({ adminId })).toString('base64');

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${GOOGLE_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&response_type=code` +
        `&scope=https://www.googleapis.com/auth/userinfo.profile` +
        `&state=${state}` +
        `&access_type=offline`;

    res.redirect(authUrl);
};

/**
 * Handle Google OAuth callback and extract userId
 */
const googleAuthCallback = async (req, res) => {
    try {
        const { code, state } = req.query;

        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'Authorization code not received'
            });
        }

        // Decode state to get adminId
        let adminId;
        try {
            const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
            adminId = decoded.adminId;
        } catch (e) {
            return res.status(400).json({
                success: false,
                message: 'Invalid state parameter'
            });
        }

        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: REDIRECT_URI,
                grant_type: 'authorization_code'
            })
        });

        const tokens = await tokenResponse.json();

        if (tokens.error) {
            console.error('Token exchange error:', tokens);
            return res.status(400).json({
                success: false,
                message: 'Failed to exchange authorization code',
                error: tokens.error_description
            });
        }

        // Get userId from People API
        const peopleResponse = await fetch(
            process.env.GOOGLE_PEOPLE_API_URL,
            { headers: { Authorization: `Bearer ${tokens.access_token}` } }
        );

        const userData = await peopleResponse.json();
        const googleUserId = userData.resourceName.replace('people/', '');

        console.log('✅ Google UserId extracted:', googleUserId);

        // Save userId to admin in database
        const admin = await Admin.findByIdAndUpdate(
            adminId,
            { googleUserId },
            { new: true }
        );

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        // Return success page or JSON
        res.send("Google Account Linked Successfully");

    } catch (error) {
        console.error('❌ Google OAuth callback error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process Google OAuth callback',
            error: error.message
        });
    }
};

/**
 * Get admin's Google UserId from database
 */
const getAdminGoogleUserId = async (req, res) => {
    try {
        const { adminId } = req.params;

        const admin = await Admin.findById(adminId).select('name googleUserId').lean();

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        if (!admin.googleUserId) {
            return res.status(404).json({
                success: false,
                message: 'Google UserId not linked yet. Please complete OAuth first.',
                error: 'GOOGLE_USERID_NOT_FOUND'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Google UserId fetched successfully',
            data: {
                adminId,
                adminName: admin.name,
                googleUserId: admin.googleUserId
            }
        });

    } catch (error) {
        console.error('❌ Get Google UserId error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch Google UserId',
            error: error.message
        });
    }
};

module.exports = {
    initiateGoogleAuth,
    googleAuthCallback,
    getAdminGoogleUserId
};