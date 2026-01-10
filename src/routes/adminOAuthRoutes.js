const express = require("express");
const router = express.Router();
const {
  initiateAdminOAuth,
  adminOAuthCallback,
} = require("../controllers/adminOAuthController");

// GET /api/admin/oauth/google - Start admin OAuth login
router.get("/google", initiateAdminOAuth);

// GET /api/admin/oauth/google/callback - OAuth callback
router.get("/google/callback", adminOAuthCallback);

module.exports = router;
