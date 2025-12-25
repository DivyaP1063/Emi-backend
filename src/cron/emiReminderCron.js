/**
 * EMI Reminder and Device Lock Cron Job
 * 
 * This script runs every 15 seconds as part of the server to:
 * 1. Check all customers with pending EMIs
 * 2. Send EMI reminder notifications to customers with overdue payments
 * 3. Lock devices if payment is 5+ days past due date
 * 4. Assign locked customers to recovery heads (30 seconds after locking)
 * 
 * Executed by: cronService.js (interval-based)
 * Frequency: Every 15 seconds
 * 
 * NOTE: This job uses the existing MongoDB connection and Firebase service.
 * It does not initialize its own connections.
 * Recovery head assignment happens via the existing API with a 30-second delay.
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Import models
const Customer = require('../models/Customer');
const RecoveryHead = require('../models/RecoveryHead');

// Import Firebase service (uses existing initialization)
const { sendLockNotification, sendNotification } = require('../services/firebaseService');

// ============================================================================
// CRON JOB LOGIC
// ============================================================================

/**
 * Call the recovery head assignment API
 * This uses the existing API endpoint to assign customers
 */
async function callAssignmentAPI() {
    try {
        const { assignCustomersToRecoveryHeads } = require('../controllers/recoveryHeadController');

        // Create a mock request/response object for the controller
        const mockReq = {};
        const mockRes = {
            status: (code) => ({
                json: (data) => {
                    if (data.success) {
                        console.log(`   ✅ Assignment API: ${data.data.assignedCount} assigned, ${data.data.noMatchCount} no match`);
                    }
                    return data;
                }
            })
        };

        await assignCustomersToRecoveryHeads(mockReq, mockRes);
    } catch (error) {
        console.error('   ❌ Assignment API error:', error.message);
    }
}

/**
 * Main cron job function
 * Runs every 15 seconds to process pending EMIs
 */
async function runEmiReminderCron() {
    try {
        const currentDate = new Date();

        // Find all customers with pending EMIs
        const customers = await Customer.aggregate([
            {
                $addFields: {
                    pendingEmis: {
                        $filter: {
                            input: '$emiDetails.emiMonths',
                            as: 'emi',
                            cond: {
                                $and: [
                                    { $eq: ['$$emi.paid', false] },
                                    { $lt: ['$$emi.dueDate', currentDate] }
                                ]
                            }
                        }
                    }
                }
            },
            {
                $match: {
                    'pendingEmis.0': { $exists: true } // Only customers with at least one pending EMI
                }
            },
            {
                $project: {
                    fullName: 1,
                    mobileNumber: 1,
                    imei1: 1,
                    fcmToken: 1,
                    isLocked: 1,
                    assigned: 1,
                    deviceLockedAt: 1,
                    pendingEmis: 1,
                    'emiDetails.emiPerMonth': 1,
                    'address.pincode': 1
                }
            }
        ]);

        if (customers.length === 0) {
            return; // No customers to process
        }

        console.log(`   📊 Processing ${customers.length} customers with pending EMIs`);

        let remindersSent = 0;
        let devicesLocked = 0;
        let errors = 0;

        // Process each customer
        for (const customer of customers) {
            // Skip if no FCM token
            if (!customer.fcmToken) {
                continue;
            }

            // Calculate days overdue for the oldest pending EMI
            const oldestPendingEmi = customer.pendingEmis.reduce((oldest, current) => {
                return new Date(current.dueDate) < new Date(oldest.dueDate) ? current : oldest;
            });

            const daysOverdue = Math.floor(
                (currentDate - new Date(oldestPendingEmi.dueDate)) / (1000 * 60 * 60 * 24)
            );

            // Calculate total pending amount
            const totalPendingAmount = customer.pendingEmis.reduce(
                (sum, emi) => sum + emi.amount,
                0
            );

            try {
                // Check if device should be locked (5+ days overdue and not already locked)
                if (daysOverdue >= 5 && !customer.isLocked) {
                    console.log(`   🔒 Locking device: ${customer.fullName} (${daysOverdue} days overdue)`);

                    // Send lock notification
                    const lockResult = await sendLockNotification(customer.fcmToken, true);

                    if (lockResult.success) {
                        // Update lock status in database with timestamp
                        await Customer.findByIdAndUpdate(customer._id, {
                            isLocked: true,
                            deviceLockedAt: new Date()
                        });
                        console.log(`   ✅ Device locked: ${customer.fullName}`);
                        devicesLocked++;

                        // Schedule assignment API call after 30 seconds
                        console.log(`   ⏰ Scheduling assignment API call in 30 seconds...`);
                        setTimeout(() => {
                            callAssignmentAPI();
                        }, 30000); // 30 seconds delay
                    } else {
                        console.log(`   ❌ Failed to lock device: ${lockResult.error}`);

                        // Clear invalid FCM token
                        if (lockResult.error === 'INVALID_TOKEN') {
                            await Customer.findByIdAndUpdate(customer._id, { fcmToken: null });
                        }
                        errors++;
                    }
                }
                // Send reminder notification (for all pending EMIs, not locked yet)
                else if (!customer.isLocked) {
                    const notificationTitle = 'EMI Payment Reminder';
                    const notificationBody = `Dear ${customer.fullName}, you have ${customer.pendingEmis.length} pending EMI payment(s) totaling ₹${totalPendingAmount}. Please pay at the earliest to avoid device lock.`;

                    const reminderResult = await sendNotification(
                        customer.fcmToken,
                        notificationTitle,
                        notificationBody,
                        {
                            type: 'EMI_REMINDER',
                            pendingCount: customer.pendingEmis.length.toString(),
                            totalPendingAmount: totalPendingAmount.toString(),
                            daysOverdue: daysOverdue.toString(),
                            customerId: customer._id.toString()
                        }
                    );

                    if (reminderResult.success) {
                        remindersSent++;
                    } else {
                        // Clear invalid FCM token
                        if (reminderResult.error === 'INVALID_TOKEN') {
                            await Customer.findByIdAndUpdate(customer._id, { fcmToken: null });
                        }
                        errors++;
                    }
                }
            } catch (error) {
                console.error(`   ❌ Error processing customer ${customer.fullName}:`, error.message);
                errors++;
            }
        }

        // Log summary if there was activity
        if (remindersSent > 0 || devicesLocked > 0 || errors > 0) {
            console.log(`   📊 Summary: ${remindersSent} reminders, ${devicesLocked} locked, ${errors} errors`);
        }

    } catch (error) {
        console.error('   ❌ Cron job error:', error.message);
        throw error;
    }
}

module.exports = { runEmiReminderCron };
