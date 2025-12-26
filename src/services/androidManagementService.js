const { google } = require('googleapis');
const path = require('path');

/**
 * Android Management API Service
 * Provides enterprise device management capabilities as a fallback to Firebase SDK
 */

let androidManagement = null;
let enterpriseId = null;
let initialized = false;

/**
 * Initialize Android Management API
 */
const initializeAndroidManagement = () => {
    if (initialized) {
        return;
    }

    try {
        // Check if Android Management is enabled
        if (process.env.ANDROID_MANAGEMENT_ENABLED !== 'true') {
            console.log('⚠️  Android Management API is disabled');
            return;
        }

        // Load service account credentials
        let auth;
        if (process.env.ANDROID_MANAGEMENT_SERVICE_ACCOUNT_PATH) {
            const serviceAccountPath = path.resolve(process.cwd(), process.env.ANDROID_MANAGEMENT_SERVICE_ACCOUNT_PATH);
            auth = new google.auth.GoogleAuth({
                keyFile: serviceAccountPath,
                scopes: ['https://www.googleapis.com/auth/androidmanagement']
            });
            console.log('✅ Android Management API initialized with service account file');
        } else if (process.env.ANDROID_MANAGEMENT_PROJECT_ID && process.env.ANDROID_MANAGEMENT_PRIVATE_KEY && process.env.ANDROID_MANAGEMENT_CLIENT_EMAIL) {
            auth = new google.auth.GoogleAuth({
                credentials: {
                    project_id: process.env.ANDROID_MANAGEMENT_PROJECT_ID,
                    private_key: process.env.ANDROID_MANAGEMENT_PRIVATE_KEY.replace(/\\n/g, '\n'),
                    client_email: process.env.ANDROID_MANAGEMENT_CLIENT_EMAIL
                },
                scopes: ['https://www.googleapis.com/auth/androidmanagement']
            });
            console.log('✅ Android Management API initialized with environment variables');
        } else {
            console.warn('⚠️  Android Management API credentials not found');
            console.warn('Please configure ANDROID_MANAGEMENT_SERVICE_ACCOUNT_PATH or individual env variables');
            return;
        }

        // Initialize Android Management API client
        androidManagement = google.androidmanagement({
            version: 'v1',
            auth
        });

        // Get enterprise ID from environment
        enterpriseId = process.env.ANDROID_MANAGEMENT_ENTERPRISE_ID;
        if (!enterpriseId) {
            console.warn('⚠️  ANDROID_MANAGEMENT_ENTERPRISE_ID not configured');
            console.warn('Please set your enterprise ID in .env file');
            return;
        }

        initialized = true;
        console.log(`✅ Android Management API ready for enterprise: ${enterpriseId}`);

    } catch (error) {
        console.error('❌ Android Management API initialization error:', error.message);
        throw error;
    }
};

/**
 * Find device by IMEI
 * @param {string} imei - Device IMEI number
 * @returns {Promise<object|null>} Device object or null if not found
 */
const findDeviceByImei = async (imei) => {
    if (!initialized || !androidManagement || !enterpriseId) {
        throw new Error('Android Management API is not initialized');
    }

    try {
        console.log(`🔍 Searching for device with IMEI: ${imei}`);

        // List all devices in the enterprise
        const response = await androidManagement.enterprises.devices.list({
            parent: enterpriseId
        });

        const devices = response.data.devices || [];
        console.log(`📱 Found ${devices.length} total devices in enterprise`);

        // Find device by IMEI in hardware info
        for (const device of devices) {
            const hardwareInfo = device.hardwareInfo || {};
            const deviceImei = hardwareInfo.serialNumber || hardwareInfo.imei;

            console.log(`   Checking device: ${device.name} - IMEI: ${deviceImei}`);

            if (deviceImei === imei) {
                console.log(`✅ Device found: ${device.name}`);
                return device;
            }
        }

        console.log(`❌ No device found with IMEI: ${imei}`);
        return null;

    } catch (error) {
        console.error('❌ Error finding device by IMEI:', error.message);
        throw error;
    }
};

/**
 * Lock device via policy update
 * @param {string} deviceName - Full device resource name (enterprises/{enterprise}/devices/{device})
 * @returns {Promise<object>} Result of lock operation
 * 
 */
const lockDevice = async (deviceName) => {
    if (!initialized || !androidManagement) {
        throw new Error('Android Management API is not initialized');
    }

    try {
        console.log(`🔒 Locking device: ${deviceName}`);

        // Issue device lock command
        const response = await androidManagement.enterprises.devices.issueCommand({
            name: deviceName,
            requestBody: {
                type: 'LOCK',
                // Creates a lock command that locks the device immediately
                duration: '0s'
            }
        });

        console.log(`✅ Lock command issued successfully`);
        return {
            success: true,
            command: response.data,
            deviceName
        };

    } catch (error) {
        console.error('❌ Error locking device:', error.message);
        return {
            success: false,
            error: error.message,
            deviceName
        };
    }
};

/**
 * Unlock device by resetting password
 * @param {string} deviceName - Full device resource name
 * @returns {Promise<object>} Result of unlock operation
 */
const unlockDevice = async (deviceName) => {
    if (!initialized || !androidManagement) {
        throw new Error('Android Management API is not initialized');
    }

    try {
        console.log(`🔓 Unlocking device: ${deviceName}`);

        // Issue device unlock/reset password command
        const response = await androidManagement.enterprises.devices.issueCommand({
            name: deviceName,
            requestBody: {
                type: 'RESET_PASSWORD',
                // Generate a new password to unlock the device
                resetPasswordFlags: ['REQUIRE_ENTRY']
            }
        });

        console.log(`✅ Unlock command issued successfully`);
        return {
            success: true,
            command: response.data,
            deviceName,
            newPassword: response.data.newPassword
        };

    } catch (error) {
        console.error('❌ Error unlocking device:', error.message);
        return {
            success: false,
            error: error.message,
            deviceName
        };
    }
};

/**
 * Factory reset device (DANGEROUS - wipes all data)
 * @param {string} deviceName - Full device resource name
 * @returns {Promise<object>} Result of factory reset operation
 */
const factoryResetDevice = async (deviceName) => {
    if (!initialized || !androidManagement) {
        throw new Error('Android Management API is not initialized');
    }

    try {
        console.log(`🔴 FACTORY RESET DEVICE: ${deviceName}`);
        console.warn('⚠️  WARNING: This will ERASE ALL DATA on the device!');

        // Issue factory reset command
        const response = await androidManagement.enterprises.devices.issueCommand({
            name: deviceName,
            requestBody: {
                type: 'REBOOT',
                // Factory reset on next reboot
                createTime: new Date().toISOString()
            }
        });

        // Note: For full factory reset, use device.delete()
        // But this requires re-enrollment, so we use wipe data command instead
        await androidManagement.enterprises.devices.delete({
            name: deviceName,
            wipeDataFlags: ['WIPE_EXTERNAL_STORAGE', 'PRESERVE_RESET_PROTECTION_DATA']
        });

        console.log(`✅ Factory reset command issued successfully`);
        console.warn(`⚠️  Device will be wiped and removed from enterprise`);

        return {
            success: true,
            message: 'Factory reset initiated. Device will be wiped.',
            deviceName
        };

    } catch (error) {
        console.error('❌ Error issuing factory reset:', error.message);
        return {
            success: false,
            error: error.message,
            deviceName
        };
    }
};

/**
 * Get device status
 * @param {string} deviceName - Full device resource name
 * @returns {Promise<object>} Device status
 */
const getDeviceStatus = async (deviceName) => {
    if (!initialized || !androidManagement) {
        throw new Error('Android Management API is not initialized');
    }

    try {
        const response = await androidManagement.enterprises.devices.get({
            name: deviceName
        });

        const device = response.data;
        return {
            success: true,
            device: {
                name: device.name,
                state: device.state,
                appliedState: device.appliedState,
                memoryInfo: device.memoryInfo,
                networkInfo: device.networkInfo,
                hardwareInfo: device.hardwareInfo,
                lastStatusReportTime: device.lastStatusReportTime,
                lastPolicySyncTime: device.lastPolicySyncTime
            }
        };

    } catch (error) {
        console.error('❌ Error getting device status:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Send lock/unlock command with fallback handling
 * @param {string} imei - Device IMEI
 * @param {boolean} shouldLock - True to lock, false to unlock
 * @returns {Promise<object>} Result of operation
 */
const sendLockCommand = async (imei, shouldLock) => {
    if (!initialized || !androidManagement || !enterpriseId) {
        return {
            success: false,
            error: 'ANDROID_MANAGEMENT_NOT_INITIALIZED',
            message: 'Android Management API is not initialized'
        };
    }

    try {
        console.log(`\n🔧 ===== ANDROID MANAGEMENT API LOCK COMMAND =====`);
        console.log(`IMEI: ${imei}`);
        console.log(`Action: ${shouldLock ? 'LOCK' : 'UNLOCK'}`);
        console.log(`Timestamp: ${new Date().toISOString()}`);

        // Find device by IMEI
        const device = await findDeviceByImei(imei);

        if (!device) {
            console.log('❌ Device not found in Android Management');
            return {
                success: false,
                error: 'DEVICE_NOT_FOUND',
                message: 'Device not enrolled in Android Management enterprise'
            };
        }

        // Execute lock/unlock command
        let result;
        if (shouldLock) {
            result = await lockDevice(device.name);
        } else {
            result = await unlockDevice(device.name);
        }

        console.log(`Result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
        console.log(`================================================\n`);

        return result;

    } catch (error) {
        console.error('❌ Android Management lock command error:', error);
        return {
            success: false,
            error: error.code || 'UNKNOWN_ERROR',
            message: error.message
        };
    }
};

/**
 * Default EMI Device Policy Template
 * Defines baseline security and control settings for EMI devices
 */
const getDefaultPolicyTemplate = () => {
    return {
        applications: [
            {
                packageName: 'com.androidmanager',
                installType: 'FORCE_INSTALLED',
                defaultPermissionPolicy: 'GRANT',
                lockTaskAllowed: true
            }
        ],
        // Location tracking required for EMI compliance
        locationMode: 'LOCATION_USER_CHOICE',
        minimumApiLevel: 21,
        // Factory reset protection
        factoryResetDisabled: false,
        // Status reporting
        statusReportingSettings: {
            displayInfoEnabled: true,
            deviceSettingsEnabled: true,
            softwareInfoEnabled: true,
            memoryInfoEnabled: true,
            networkInfoEnabled: true,
            hardwareStatusEnabled: true,
            applicationReportsEnabled: true
        },
        // System update policy
        systemUpdate: {
            type: 'AUTOMATIC',
            startMinutes: 120,
            endMinutes: 180
        },
        // Kiosk mode - disabled by default, can be enabled for lockdown
        kioskCustomLauncherEnabled: false,
        // Open network configuration (not restricted)
        openNetworkConfiguration: {},
        // Ensure device stays compliant
        complianceRules: [
            {
                nonComplianceDetailCondition: {
                    settingName: 'LOCATION_MODE',
                    nonComplianceReason: 'LOCATION_MODE_DISABLED'
                },
                apiLevelCondition: {
                    minApiLevel: 21
                }
            }
        ]
    };
};

/**
 * Create a new policy in AMAPI
 * @param {string} policyId - Unique policy identifier (e.g., 'policy_emi_default')
 * @param {object} policyConfig - Policy configuration (optional, uses default if not provided)
 * @returns {Promise<object>} Created policy
 */
const createPolicy = async (policyId, policyConfig = null) => {
    if (!initialized || !androidManagement || !enterpriseId) {
        throw new Error('Android Management API is not initialized');
    }

    try {
        console.log(`\n📋 ===== CREATING POLICY =====`);
        console.log(`Policy ID: ${policyId}`);
        console.log(`Enterprise: ${enterpriseId}`);

        const policyName = `${enterpriseId}/policies/${policyId}`;
        const config = policyConfig || getDefaultPolicyTemplate();

        const response = await androidManagement.enterprises.policies.patch({
            name: policyName,
            requestBody: config
        });

        console.log(`✅ Policy created successfully: ${policyName}`);
        console.log(`===========================\n`);

        return {
            success: true,
            policy: response.data,
            policyId,
            policyName
        };

    } catch (error) {
        console.error('❌ Error creating policy:', error.message);
        return {
            success: false,
            error: error.message,
            policyId
        };
    }
};

/**
 * Update an existing policy
 * @param {string} policyId - Policy identifier
 * @param {object} updates - Policy updates to apply
 * @returns {Promise<object>} Updated policy
 */
const updatePolicy = async (policyId, updates) => {
    if (!initialized || !androidManagement || !enterpriseId) {
        throw new Error('Android Management API is not initialized');
    }

    try {
        console.log(`\n🔄 ===== UPDATING POLICY =====`);
        console.log(`Policy ID: ${policyId}`);
        console.log(`Updates:`, JSON.stringify(updates, null, 2));

        const policyName = `${enterpriseId}/policies/${policyId}`;

        const response = await androidManagement.enterprises.policies.patch({
            name: policyName,
            updateMask: Object.keys(updates).join(','),
            requestBody: updates
        });

        console.log(`✅ Policy updated successfully`);
        console.log(`===========================\n`);

        return {
            success: true,
            policy: response.data,
            policyId,
            policyName
        };

    } catch (error) {
        console.error('❌ Error updating policy:', error.message);
        return {
            success: false,
            error: error.message,
            policyId
        };
    }
};

/**
 * Get policy details
 * @param {string} policyId - Policy identifier
 * @returns {Promise<object>} Policy details
 */
const getPolicy = async (policyId) => {
    if (!initialized || !androidManagement || !enterpriseId) {
        throw new Error('Android Management API is not initialized');
    }

    try {
        console.log(`\n📖 ===== RETRIEVING POLICY =====`);
        console.log(`Policy ID: ${policyId}`);

        const policyName = `${enterpriseId}/policies/${policyId}`;

        const response = await androidManagement.enterprises.policies.get({
            name: policyName
        });

        console.log(`✅ Policy retrieved successfully`);
        console.log(`===========================\n`);

        return {
            success: true,
            policy: response.data,
            policyId,
            policyName
        };

    } catch (error) {
        console.error('❌ Error retrieving policy:', error.message);
        return {
            success: false,
            error: error.message,
            policyId
        };
    }
};

/**
 * Generate enrollment token for device provisioning
 * @param {string} customerId - Customer ID to link device
 * @param {string} policyId - Policy to apply to enrolled device
 * @param {number} durationSeconds - Token validity duration (default: 1 hour)
 * @returns {Promise<object>} Enrollment token and details
 */
const generateEnrollmentToken = async (customerId, policyId = 'policy_emi_default', durationSeconds = 3600) => {
    if (!initialized || !androidManagement || !enterpriseId) {
        throw new Error('Android Management API is not initialized');
    }

    try {
        console.log(`\n🎫 ===== GENERATING ENROLLMENT TOKEN =====`);
        console.log(`Customer ID: ${customerId}`);
        console.log(`Policy ID: ${policyId}`);
        console.log(`Duration: ${durationSeconds}s (${durationSeconds / 3600}h)`);

        const policyName = `${enterpriseId}/policies/${policyId}`;

        const response = await androidManagement.enterprises.enrollmentTokens.create({
            parent: enterpriseId,
            requestBody: {
                policyName,
                duration: `${durationSeconds}s`,
                additionalData: customerId // Store customer ID in token
            }
        });

        const token = response.data;
        const expirationTime = new Date(token.expirationTimestamp);

        console.log(`✅ Enrollment token generated`);
        console.log(`Token: ${token.value.substring(0, 20)}...`);
        console.log(`Expires: ${expirationTime.toISOString()}`);
        console.log(`=========================================\n`);

        return {
            success: true,
            token: token.value,
            qrCode: token.qrCode,
            expirationTime: expirationTime,
            policyName,
            customerId
        };

    } catch (error) {
        console.error('❌ Error generating enrollment token:', error.message);
        return {
            success: false,
            error: error.message,
            customerId
        };
    }
};

/**
 * Build provisioning payload for QR code
 * @param {string} customerId - Customer ID
 * @param {string} enrollmentToken - Enrollment token from AMAPI
 * @param {string} backendUrl - Backend API URL
 * @returns {object} QR code payload
 */
const buildProvisioningPayload = (customerId, enrollmentToken, backendUrl = process.env.BACKEND_URL) => {
    return {
        "android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME": "com.androidmanager/.receiver.EMIDeviceAdminReceiver",
        "android.app.extra.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM": process.env.APP_SIGNATURE_CHECKSUM || "",
        "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION": "https://play.google.com/store/apps/details?id=com.androidmanager",
        "android.app.extra.PROVISIONING_SKIP_ENCRYPTION": false,
        "android.app.extra.PROVISIONING_LEAVE_ALL_SYSTEM_APPS_ENABLED": true,
        "android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE": {
            "backend_url": backendUrl || "https://emi-backend-2wts.onrender.com",
            "enrollment_token": enrollmentToken,
            "customer_id": customerId,
            "enterprise_id": enterpriseId
        }
    };
};

module.exports = {
    initializeAndroidManagement,
    findDeviceByImei,
    lockDevice,
    unlockDevice,
    factoryResetDevice,
    getDeviceStatus,
    sendLockCommand,
    createPolicy,
    updatePolicy,
    getPolicy,
    getDefaultPolicyTemplate,
    generateEnrollmentToken,
    buildProvisioningPayload
};
