const admin = require('firebase-admin');

/**
 * Firebase Admin SDK Service
 * Handles Firebase Cloud Messaging (FCM) operations
 */

let firebaseInitialized = false;

/**
 * Initialize Firebase Admin SDK
 */
const initializeFirebase = () => {
    if (firebaseInitialized) {
        return;
    }

    try {
        // Check if service account file path is provided
        if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
            const serviceAccount = require(`../../${process.env.FIREBASE_SERVICE_ACCOUNT_PATH}`);

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });

            console.log('✅ Firebase initialized with service account file');
        }
        // Otherwise use individual environment variables
        else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL
                })
            });

            console.log('✅ Firebase initialized with environment variables');
        }
        else {
            console.warn('⚠️  Firebase credentials not found. FCM notifications will not work.');
            console.warn('Please configure FIREBASE_SERVICE_ACCOUNT_PATH or individual Firebase env variables.');
            return;
        }

        firebaseInitialized = true;
    } catch (error) {
        console.error('❌ Firebase initialization error:', error.message);
        throw error;
    }
};

/**
 * Send a lock/unlock notification to a customer's device
 * @param {string} fcmToken - The FCM token of the device
 * @param {boolean} isLocked - Whether to lock (true) or unlock (false) the device
 * @returns {Promise<object>} - Result of the notification send
 */
const sendLockNotification = async (fcmToken, isLocked) => {
    if (!firebaseInitialized) {
        throw new Error("Firebase is not initialized");
    }

    if (!fcmToken) {
        throw new Error("FCM token is required");
    }

    const message = {
        token: fcmToken,
        data: {
            type: "DEVICE_LOCK_STATUS",
            action: isLocked ? "LOCK_DEVICE" : "UNLOCK_DEVICE",
            timestamp: new Date().toISOString(),
        },
        android: {
            priority: "high",
        },
    };

    try {
        const response = await admin.messaging().send(message);
        console.log(`✅ FCM notification sent successfully: ${response}`);
        return {
            success: true,
            messageId: response,
            action: isLocked ? "LOCK_DEVICE" : "UNLOCK_DEVICE",
        };
    } catch (error) {
        console.error("❌ FCM notification error:", error);

        // Handle specific error cases
        if (
            error.code === "messaging/invalid-registration-token" ||
            error.code === "messaging/registration-token-not-registered"
        ) {
            return {
                success: false,
                error: "INVALID_TOKEN",
                message: "FCM token is invalid or expired",
            };
        }

        return {
            success: false,
            error: error.code || "UNKNOWN_ERROR",
            message: error.message,
        };
    }
};

/**
 * Send a generic notification to a device
 * @param {string} fcmToken - The FCM token of the device
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data payload
 * @returns {Promise<object>} - Result of the notification send
 */
const sendNotification = async (fcmToken, title, body, data = {}) => {
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
        console.log(`✅ Generic FCM notification sent: ${response}`);
        return {
            success: true,
            messageId: response
        };
    } catch (error) {
        console.error('❌ Generic FCM notification error:', error);
        return {
            success: false,
            error: error.code || 'UNKNOWN_ERROR',
            message: error.message
        };
    }
};

/**
 * Validate if an FCM token is valid
 * @param {string} fcmToken - The FCM token to validate
 * @returns {Promise<boolean>} - Whether the token is valid
 */
const validateFcmToken = async (fcmToken) => {
    if (!firebaseInitialized || !fcmToken) {
        return false;
    }

    try {
        // Try to send a dry-run message
        await admin.messaging().send({
            token: fcmToken,
            data: { test: 'validation' }
        }, true); // dry run

        return true;
    } catch (error) {
        console.error('FCM token validation failed:', error.code);
        return false;
    }
};

module.exports = {
    initializeFirebase,
    sendLockNotification,
    sendNotification,
    validateFcmToken
};
