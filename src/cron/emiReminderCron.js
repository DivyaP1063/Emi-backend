/**
 * EMI Reminder and Device Lock Cron Job
 * 
 * This script runs daily to:
 * 1. Check all customers with pending EMIs
 * 2. Send EMI reminder notifications to customers with overdue payments
 * 3. Lock devices if payment is 5+ days past due date
 * 4. Assign locked customers to recovery heads after 15 minutes
 * 
 * Scheduled to run daily at 12:00 PM via GitHub Actions
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Import models and services
const Customer = require('../models/Customer');
const RecoveryHead = require('../models/RecoveryHead');
const { initializeFirebase, sendNotification, sendLockNotification } = require('../services/firebaseService');

/**
 * Connect to MongoDB
 */
async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ MongoDB connected successfully');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        throw error;
    }
}

/**
 * Disconnect from MongoDB
 */
async function disconnectDB() {
    try {
        await mongoose.disconnect();
        console.log('✅ MongoDB disconnected successfully');
    } catch (error) {
        console.error('❌ MongoDB disconnection error:', error);
    }
}

/**
 * Assign locked customers to recovery heads based on pincode matching
 */
async function assignCustomersToRecoveryHeads() {
    console.log('\n🔍 ===== RECOVERY HEAD ASSIGNMENT STARTED =====');
    console.log('Timestamp:', new Date().toISOString());

    try {
        // Find all locked customers that are not yet assigned
        const customersToAssign = await Customer.find({
            isLocked: true,
            assigned: false
        });

        console.log(`Found ${customersToAssign.length} locked customers to assign`);

        if (customersToAssign.length === 0) {
            console.log('No customers to assign');
            return { assignedCount: 0, noMatchCount: 0 };
        }

        let assignedCount = 0;
        let noMatchCount = 0;

        for (const customer of customersToAssign) {
            const customerPincode = customer.address.pincode;

            // Find active recovery head with matching pincode
            const recoveryHead = await RecoveryHead.findOne({
                status: 'ACTIVE',
                pinCodes: customerPincode
            });

            if (recoveryHead) {
                // Assign customer to recovery head
                await Customer.findByIdAndUpdate(customer._id, {
                    assigned: true,
                    assignedTo: recoveryHead.fullName,
                    assignedToRecoveryHeadId: recoveryHead._id,
                    assignedAt: new Date()
                });

                console.log(`✅ Assigned ${customer.fullName} (${customerPincode}) to ${recoveryHead.fullName}`);
                assignedCount++;
            } else {
                console.log(`⚠️  No recovery head found for ${customer.fullName} (pincode: ${customerPincode})`);
                noMatchCount++;
            }
        }

        console.log(`\n📊 Assignment Summary: ${assignedCount} assigned, ${noMatchCount} no match`);
        console.log('=====================================\n');

        return { assignedCount, noMatchCount };
    } catch (error) {
        console.error('❌ Assignment error:', error);
        return { assignedCount: 0, noMatchCount: 0, error: error.message };
    }
}

/**
 * Main cron job function
 */
async function runEmiReminderCron() {
    console.log('\n🔔 ===== EMI REMINDER CRON JOB STARTED =====');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);

    try {
        // Initialize Firebase
        initializeFirebase();

        // Connect to database
        await connectDB();

        const currentDate = new Date();
        console.log('Current Date:', currentDate.toISOString());

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
                    pendingEmis: 1,
                    'emiDetails.emiPerMonth': 1
                }
            }
        ]);

        console.log(`\n📊 Found ${customers.length} customers with pending EMIs`);

        if (customers.length === 0) {
            console.log('✅ No customers with pending EMIs. Exiting...');
            await disconnectDB();
            return;
        }

        let remindersSent = 0;
        let devicesLocked = 0;
        let customersAssigned = 0;
        let errors = 0;

        // Process each customer
        for (const customer of customers) {
            console.log(`\n👤 Processing customer: ${customer.fullName} (${customer.mobileNumber})`);
            console.log(`   IMEI: ${customer.imei1}`);
            console.log(`   FCM Token: ${customer.fcmToken ? 'Present' : 'Missing'}`);
            console.log(`   Current Lock Status: ${customer.isLocked ? 'LOCKED' : 'UNLOCKED'}`);
            console.log(`   Pending EMIs: ${customer.pendingEmis.length}`);

            // Skip if no FCM token
            if (!customer.fcmToken) {
                console.log('   ⚠️  Skipping - No FCM token registered');
                continue;
            }

            // Calculate days overdue for the oldest pending EMI
            const oldestPendingEmi = customer.pendingEmis.reduce((oldest, current) => {
                return new Date(current.dueDate) < new Date(oldest.dueDate) ? current : oldest;
            });

            const daysOverdue = Math.floor(
                (currentDate - new Date(oldestPendingEmi.dueDate)) / (1000 * 60 * 60 * 24)
            );

            console.log(`   📅 Oldest EMI due date: ${new Date(oldestPendingEmi.dueDate).toISOString()}`);
            console.log(`   ⏰ Days overdue: ${daysOverdue}`);

            // Calculate total pending amount
            const totalPendingAmount = customer.pendingEmis.reduce(
                (sum, emi) => sum + emi.amount,
                0
            );

            try {
                // Check if device should be locked (5+ days overdue and not already locked)
                if (daysOverdue >= 5 && !customer.isLocked) {
                    console.log(`   🔒 LOCKING DEVICE - ${daysOverdue} days overdue`);

                    // Send lock notification
                    const lockResult = await sendLockNotification(customer.fcmToken, true);

                    if (lockResult.success) {
                        console.log(`   ✅ Lock notification sent successfully`);
                        console.log(`   📱 Message ID: ${lockResult.messageId}`);

                        // Update lock status in database
                        // Note: In production, this should be confirmed by device callback
                        // But for cron job, we update it directly
                        await Customer.findByIdAndUpdate(customer._id, { isLocked: true });
                        console.log(`   ✅ Device lock status updated in database`);

                        devicesLocked++;
                    } else {
                        console.log(`   ❌ Failed to send lock notification: ${lockResult.error}`);

                        // Clear invalid FCM token
                        if (lockResult.error === 'INVALID_TOKEN') {
                            await Customer.findByIdAndUpdate(customer._id, { fcmToken: null });
                            console.log(`   🗑️  Cleared invalid FCM token`);
                        }
                        errors++;
                    }
                }
                // Send reminder notification (for all pending EMIs)
                else {
                    console.log(`   📧 Sending EMI reminder notification`);

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
                        console.log(`   ✅ Reminder sent successfully`);
                        console.log(`   📱 Message ID: ${reminderResult.messageId}`);
                        remindersSent++;
                    } else {
                        console.log(`   ❌ Failed to send reminder: ${reminderResult.error}`);

                        // Clear invalid FCM token
                        if (reminderResult.error === 'INVALID_TOKEN') {
                            await Customer.findByIdAndUpdate(customer._id, { fcmToken: null });
                            console.log(`   🗑️  Cleared invalid FCM token`);
                        }
                        errors++;
                    }
                }
            } catch (error) {
                console.error(`   ❌ Error processing customer ${customer.fullName}:`, error.message);
                errors++;
            }
        }

        // After device locking is complete, wait 15 minutes then assign to recovery heads
        if (devicesLocked > 0) {
            console.log(`\n⏰ Waiting 15 minutes before assigning customers to recovery heads...`);
            console.log(`${devicesLocked} customers will be assigned after delay`);

            // Wait 15 minutes (900000 milliseconds)
            // For testing, you can reduce this to 1-2 minutes: 1 * 60 * 1000
            await new Promise(resolve => setTimeout(resolve, 15 * 60 * 1000));

            console.log(`\n📋 Starting customer assignment...`);

            // Call assignment function directly
            const assignmentResult = await assignCustomersToRecoveryHeads();

            if (assignmentResult.error) {
                console.error(`❌ Assignment failed: ${assignmentResult.error}`);
            } else {
                customersAssigned = assignmentResult.assignedCount;
                console.log(`✅ Assignment completed: ${assignmentResult.assignedCount} assigned, ${assignmentResult.noMatchCount} no match`);
            }
        }

        // Summary
        console.log('\n📊 ===== CRON JOB SUMMARY =====');
        console.log(`Total customers processed: ${customers.length}`);
        console.log(`Reminders sent: ${remindersSent}`);
        console.log(`Devices locked: ${devicesLocked}`);
        console.log(`Customers assigned to recovery heads: ${customersAssigned}`);
        console.log(`Errors: ${errors}`);
        console.log('=====================================\n');

    } catch (error) {
        console.error('❌ Cron job error:', error);
        throw error;
    } finally {
        // Disconnect from database
        await disconnectDB();
    }
}

// Run the cron job
if (require.main === module) {
    runEmiReminderCron()
        .then(() => {
            console.log('✅ Cron job completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Cron job failed:', error);
            process.exit(1);
        });
}

module.exports = { runEmiReminderCron };
