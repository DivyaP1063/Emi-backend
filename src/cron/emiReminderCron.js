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
 * 
 * NOTE: This cron job is self-contained and does not depend on external services.
 * All Firebase initialization and notification logic is embedded directly.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const admin = require('firebase-admin');

// Import models only
const Customer = require('../models/Customer');
const RecoveryHead = require('../models/RecoveryHead');

// ============================================================================
// FIREBASE INITIALIZATION (Self-contained)
// ============================================================================

let firebaseInitialized = false;

/**
 * Initialize Firebase Admin SDK
 * This is a self-contained version that doesn't depend on external services
 */
function initializeFirebase() {
    if (firebaseInitialized) {
        console.log('✅ Firebase already initialized');
        return;
    }

    try {
        // Method 1: Base64-encoded service account JSON (RECOMMENDED for CI/CD)
        if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
            console.log('🔧 Initializing Firebase with base64-encoded service account...');

            try {
                const serviceAccountJson = Buffer.from(
                    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
                    'base64'
                ).toString('utf-8');

                const serviceAccount = JSON.parse(serviceAccountJson);

                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });

                console.log('✅ Firebase initialized with base64-encoded service account');
                firebaseInitialized = true;
                return;
            } catch (base64Error) {
                console.error('❌ Failed to parse base64 service account:', base64Error.message);
                throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_BASE64 format');
            }
        }

        // Method 2: Service account file path (for local development)
        if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
            console.log('🔧 Initializing Firebase with service account file...');

            try {
                const serviceAccount = require(`../../${process.env.FIREBASE_SERVICE_ACCOUNT_PATH}`);

                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });

                console.log('✅ Firebase initialized with service account file');
                firebaseInitialized = true;
                return;
            } catch (fileError) {
                console.error('❌ Failed to load service account file:', fileError.message);
                throw fileError;
            }
        }

        // Method 3: Individual environment variables (fallback)
        if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
            console.log('🔧 Initializing Firebase with individual environment variables...');
            console.warn('⚠️  Using individual env variables. Consider using FIREBASE_SERVICE_ACCOUNT_BASE64 for CI/CD.');

            try {
                let privateKey = process.env.FIREBASE_PRIVATE_KEY;
                privateKey = privateKey.replace(/\\n/g, '\n');

                if (!privateKey.includes('BEGIN PRIVATE KEY') || !privateKey.includes('END PRIVATE KEY')) {
                    throw new Error('FIREBASE_PRIVATE_KEY does not appear to be a valid private key format');
                }

                admin.initializeApp({
                    credential: admin.credential.cert({
                        projectId: process.env.FIREBASE_PROJECT_ID,
                        privateKey: privateKey,
                        clientEmail: process.env.FIREBASE_CLIENT_EMAIL
                    })
                });

                console.log('✅ Firebase initialized with environment variables');
                firebaseInitialized = true;
                return;
            } catch (envError) {
                console.error('❌ Failed to initialize with environment variables:', envError.message);
                throw envError;
            }
        }

        // No credentials found
        throw new Error('Firebase credentials not found. Please configure FIREBASE_SERVICE_ACCOUNT_BASE64 or other Firebase env variables.');

    } catch (error) {
        console.error('❌ Firebase initialization error:', error.message);
        throw error;
    }
}

/**
 * Send a lock/unlock notification to a customer's device
 * @param {string} fcmToken - The FCM token of the device
 * @param {boolean} isLocked - Whether to lock (true) or unlock (false) the device
 * @returns {Promise<object>} - Result of the notification send
 */
async function sendLockNotification(fcmToken, isLocked) {
    if (!firebaseInitialized) {
        throw new Error('Firebase is not initialized');
    }

    if (!fcmToken) {
        throw new Error('FCM token is required');
    }

    const message = {
        token: fcmToken,
        data: {
            type: 'DEVICE_LOCK_STATUS',
            action: isLocked ? 'LOCK_DEVICE' : 'UNLOCK_DEVICE',
            timestamp: new Date().toISOString(),
        },
        android: {
            priority: 'high',
        },
    };

    try {
        const response = await admin.messaging().send(message);
        console.log(`   ✅ Lock notification sent: ${response}`);
        return {
            success: true,
            messageId: response,
            action: isLocked ? 'LOCK_DEVICE' : 'UNLOCK_DEVICE',
        };
    } catch (error) {
        console.error('   ❌ Lock notification error:', error.message);

        if (
            error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered'
        ) {
            return {
                success: false,
                error: 'INVALID_TOKEN',
                message: 'FCM token is invalid or expired',
            };
        }

        return {
            success: false,
            error: error.code || 'UNKNOWN_ERROR',
            message: error.message,
        };
    }
}

/**
 * Send a generic notification to a device
 * @param {string} fcmToken - The FCM token of the device
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data payload
 * @returns {Promise<object>} - Result of the notification send
 */
async function sendNotification(fcmToken, title, body, data = {}) {
    if (!firebaseInitialized) {
        throw new Error('Firebase is not initialized');
    }

    if (!fcmToken) {
        throw new Error('FCM token is required');
    }

    const message = {
        token: fcmToken,
        notification: {
            title,
            body
        },
        data: {
            ...data,
            timestamp: new Date().toISOString()
        },
        android: {
            priority: 'high',
            notification: {
                sound: 'default'
            }
        }
    };

    try {
        const response = await admin.messaging().send(message);
        console.log(`   ✅ Reminder notification sent: ${response}`);
        return {
            success: true,
            messageId: response
        };
    } catch (error) {
        console.error('   ❌ Reminder notification error:', error.message);
        return {
            success: false,
            error: error.code || 'UNKNOWN_ERROR',
            message: error.message
        };
    }
}

// ============================================================================
// CRON JOB LOGIC
// ============================================================================

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
