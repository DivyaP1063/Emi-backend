const cron = require('node-cron');
const Customer = require('../models/Customer');

/**
 * Device Activity Monitor
 * Automatically marks devices as inactive based on location update timestamps
 * If location hasn't been updated in 15 minutes, device is considered inactive
 */

const ACTIVITY_TIMEOUT_MINUTES = 15; // Device is considered inactive after 15 minutes without location update

/**
 * Check and mark inactive devices based on location updates
 * Runs periodically to set isActive = false for devices that haven't updated location recently
 */
const checkInactiveDevices = async () => {
    try {
        const timeoutDate = new Date(Date.now() - ACTIVITY_TIMEOUT_MINUTES * 60 * 1000);
        
        // Mark devices as inactive if location.lastUpdated is older than timeout
        const inactiveResult = await Customer.updateMany(
            {
                isActive: true,
                'location.lastUpdated': { $lt: timeoutDate }
            },
            {
                $set: { isActive: false }
            }
        );

        // Mark devices as active if location.lastUpdated is recent
        const activeResult = await Customer.updateMany(
            {
                isActive: false,
                'location.lastUpdated': { $gte: timeoutDate }
            },
            {
                $set: { isActive: true }
            }
        );

        if (inactiveResult.modifiedCount > 0) {
            console.log(`🔴 Marked ${inactiveResult.modifiedCount} device(s) as inactive (no location update in ${ACTIVITY_TIMEOUT_MINUTES}min)`);
        }

        if (activeResult.modifiedCount > 0) {
            console.log(`🟢 Marked ${activeResult.modifiedCount} device(s) as active (location updated recently)`);
        }

    } catch (error) {
        console.error('❌ Error checking inactive devices:', error);
    }
};

/**
 * Initialize device activity monitoring based on location updates
 * Starts a cron job that checks for inactive devices every minute
 */
const initializeActivityMonitor = () => {
    console.log(`🟢 Device Activity Monitor initialized (Location-based)`);
    console.log(`⏱️  Checking for inactive devices every minute`);
    console.log(`⚠️  Timeout: ${ACTIVITY_TIMEOUT_MINUTES} minutes without location update`);

    // Run every minute
    cron.schedule('* * * * *', async () => {
        await checkInactiveDevices();
    });

    // Also run immediately on startup
    checkInactiveDevices();
};

module.exports = {
    initializeActivityMonitor,
    checkInactiveDevices,
    ACTIVITY_TIMEOUT_MINUTES
};
