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
        // Method 1: Base64-encoded service account JSON (RECOMMENDED for CI/CD)
        if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
            console.log('🔧 Attempting Firebase initialization with base64-encoded service account...');
            
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
                throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_BASE64 format. Please ensure it is a valid base64-encoded JSON.');
            }
        }
        
        // Method 2: Service account file path (for local development)
        if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
            console.log('🔧 Attempting Firebase initialization with service account file...');
            
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
        
        // Method 3: Individual environment variables (fallback, prone to newline issues)
        if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
            console.log('🔧 Attempting Firebase initialization with individual environment variables...');
            console.warn('⚠️  Using individual env variables. Consider using FIREBASE_SERVICE_ACCOUNT_BASE64 for CI/CD.');
            
            try {
                // Handle multiple private key formats
                let privateKey = process.env.FIREBASE_PRIVATE_KEY;
                
                // Replace escaped newlines (handles both \n and \\n)
                privateKey = privateKey.replace(/\\n/g, '\n');
                
                // Validate private key format
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
                console.error('💡 Tip: Use FIREBASE_SERVICE_ACCOUNT_BASE64 instead to avoid newline issues');
                throw envError;
            }
        }
        
        // No credentials found
        console.warn('⚠️  Firebase credentials not found. FCM notifications will not work.');
        console.warn('Please configure one of the following:');
        console.warn('  1. FIREBASE_SERVICE_ACCOUNT_BASE64 (recommended for CI/CD)');
        console.warn('  2. FIREBASE_SERVICE_ACCOUNT_PATH (for local development)');
        console.warn('  3. FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL');
        return;

    } catch (error) {
        console.error('❌ Firebase initialization error:', error.message);
        console.error('Stack trace:', error.stack);
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
