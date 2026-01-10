/**
 * Admin OAuth Controller
 * Google OAuth for admin login on Private App Uploader page
 */

const Admin = require("../models/Admin");
const jwt = require("jsonwebtoken");

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const ADMIN_OAUTH_REDIRECT_URI = process.env.ADMIN_OAUTH_REDIRECT_URI || process.env.BACKEND_URL + '/api/admin/oauth/google/callback';

/**
 * Redirect to Google OAuth consent screen for admin login
 * GET /api/admin/oauth/google
 */
const initiateAdminOAuth = (req, res) => {
    const { redirect } = req.query;
    
    // Store redirect URL in state to return after OAuth
    const state = Buffer.from(JSON.stringify({ 
        redirect: redirect || '/',
        type: 'admin_login'
    })).toString('base64');

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${GOOGLE_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(ADMIN_OAUTH_REDIRECT_URI)}` +
        `&response_type=code` +
        `&scope=https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile` +
        `&state=${state}` +
        `&access_type=offline` +
        `&prompt=select_account`;

    res.redirect(authUrl);
};

/**
 * Handle Google OAuth callback for admin login
 * GET /api/admin/oauth/google/callback
 */
const adminOAuthCallback = async (req, res) => {
    try {
        const { code, state, error } = req.query;

        if (error) {
            console.error('OAuth error:', error);
            return res.redirect('/?error=oauth_denied');
        }

        if (!code) {
            return res.redirect('/?error=no_code');
        }

        // Decode state to get redirect URL
        let redirectUrl = '/';
        try {
            const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
            redirectUrl = decoded.redirect || '/';
        } catch (e) {
            console.warn('Could not decode state:', e.message);
        }

        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: ADMIN_OAUTH_REDIRECT_URI,
                grant_type: 'authorization_code'
            })
        });

        const tokens = await tokenResponse.json();

        if (tokens.error) {
            console.error('Token exchange error:', tokens);
            return res.redirect('/?error=token_exchange_failed');
        }

        // Get user info from Google
        const userInfoResponse = await fetch(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            { headers: { Authorization: `Bearer ${tokens.access_token}` } }
        );

        const userInfo = await userInfoResponse.json();
        const email = userInfo.email;
        const name = userInfo.name || email;

        console.log('🔐 Admin OAuth login attempt:', email);

        // TESTING MODE: Accept any Google login
        // TODO: For production, uncomment the admin check below
        /*
        const admin = await Admin.findOne({ 
            email: email.toLowerCase(),
            isActive: true 
        });

        if (!admin) {
            console.warn('❌ OAuth login failed - not an admin:', email);
            return res.redirect('/?error=not_admin');
        }
        */

        // For testing: Try to find admin by email, otherwise create temp session
        let admin = await Admin.findOne({ email: email.toLowerCase() });
        
        // Generate JWT token (for testing - allows any Google account)
        const jwtToken = jwt.sign(
            { 
                id: admin?._id || 'google_' + userInfo.id, 
                email: email, 
                role: 'admin',
                name: name
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        console.log('✅ Admin OAuth login successful:', email);

        // Redirect back to the app with token
        const separator = redirectUrl.includes('?') ? '&' : '?';
        res.redirect(`${redirectUrl}${separator}token=${jwtToken}`);

    } catch (error) {
        console.error('❌ Admin OAuth callback error:', error);
        res.redirect('/?error=server_error');
    }
};

module.exports = {
    initiateAdminOAuth,
    adminOAuthCallback
};
