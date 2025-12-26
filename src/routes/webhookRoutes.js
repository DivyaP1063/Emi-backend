const express = require('express');
const router = express.Router();
const { handleAMAPIWebhook } = require('../controllers/amapiWebhookController');

/**
 * AMAPI Webhook Routes
 * Public endpoint - Google sends webhook events here
 */

// POST /api/webhooks/amapi - Receive AMAPI webhook events
router.post('/amapi', handleAMAPIWebhook);

module.exports = router;
