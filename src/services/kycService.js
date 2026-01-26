const axios = require('axios');

/**
 * KYC Service for Aadhaar OTP Verification
 * Integrates with ScoreMe KYC API
 */

const KYC_BASE_URL = process.env.KYC_BASE_URL || 'https://sm-kyc-sync-sandbox.scoreme.in';
const CLIENT_ID = process.env.KYC_CLIENT_ID;
const CLIENT_SECRET = process.env.KYC_CLIENT_SECRET;

// Error code mapping for user-friendly messages
const ERROR_MESSAGES = {
    // Send OTP errors
    'EAS517': 'OTP already sent. Please retry after 120 seconds.',
    'EAN1229': 'This Aadhaar number is not registered with a mobile number. Please contact UIDAI.',
    'EAN1391': 'This Aadhaar number is locked. Please unlock it through UIDAI portal.',
    'EAE168': 'Aadhaar number does not exist. Please verify the number.',

    // Verify OTP errors
    'ETP011': 'Incorrect OTP. Please enter the correct OTP.',
    'EOE082': 'OTP has expired. Please request a new OTP.',
    'EOE794': 'OTP has expired. Please request a new OTP.',
    'EML1916': 'Maximum OTP attempts reached. Please try again later.',

    // Common errors
    'EUP007': 'Technical issue with verification service. Please try again later.',
    'ERT788': 'Request timeout. Please try again.',

    // Rate limiting
    'RATE_LIMIT_SEND': 'Please wait 120 seconds before requesting another OTP.',
    'RATE_LIMIT_VERIFY': 'Please wait 10 minutes before trying again.'
};

/**
 * Send OTP to Aadhaar-linked mobile number
 * @param {string} aadhaarNumber - 12-digit Aadhaar number
 * @returns {Promise<{success: boolean, referenceId?: string, message: string, responseCode?: string}>}
 */
const sendAadhaarOtp = async (aadhaarNumber) => {
    try {
        // Validate Aadhaar number format
        if (!aadhaarNumber || !/^[0-9]{12}$/.test(aadhaarNumber)) {
            return {
                success: false,
                message: 'Aadhaar number must be exactly 12 digits'
            };
        }

        // Validate credentials
        if (!CLIENT_ID || !CLIENT_SECRET) {
            console.error('❌ KYC API credentials not configured');
            return {
                success: false,
                message: 'KYC service not configured. Please contact administrator.'
            };
        }

        console.log('🚀 Making KYC API request:', {
            url: `${KYC_BASE_URL}/kyc/external/aadhaarOtp`,
            aadhaarNumber: aadhaarNumber.slice(0, 4) + '****' + aadhaarNumber.slice(-4),
            hasClientId: !!CLIENT_ID,
            hasClientSecret: !!CLIENT_SECRET
        });

        const response = await axios.post(
            `${KYC_BASE_URL}/kyc/external/aadhaarOtp`,
            {
                aadhaar_number: aadhaarNumber
            },
            {
                headers: {
                    'ClientId': CLIENT_ID,
                    'ClientSecret': CLIENT_SECRET,
                    'Content-Type': 'application/json'
                },
                timeout: 30000 // 30 second timeout
            }
        );

        console.log('📡 KYC API Response:', {
            status: response.status,
            data: response.data
        });

        const { referenceId, responseMessage, responseCode } = response.data;

        // Check for success
        if (responseCode === 'SOS174' || response.data.success) {
            return {
                success: true,
                referenceId,
                message: responseMessage || 'OTP sent successfully to your Aadhaar-linked mobile number.',
                responseCode
            };
        }

        // Handle error response codes
        console.log('❌ KYC API Error Response:', {
            responseCode,
            responseMessage,
            errorMessage: ERROR_MESSAGES[responseCode]
        });

        const errorMessage = ERROR_MESSAGES[responseCode] || responseMessage || 'Failed to send OTP';
        return {
            success: false,
            message: errorMessage,
            responseCode
        };

    } catch (error) {
        console.error('💥 Send Aadhaar OTP catch block error:', {
            message: error.message,
            code: error.code,
            config: {
                url: error.config?.url,
                method: error.config?.method
            }
        });

        // Log full error details for debugging
        if (error.response) {
            console.error('Error status:', error.response.status);
            console.error('Error data:', JSON.stringify(error.response.data, null, 2));
            console.error('Error headers:', error.response.headers);
        }

        // Handle axios errors
        if (error.response) {
            const { responseCode, responseMessage } = error.response.data || {};
            const errorMessage = ERROR_MESSAGES[responseCode] || responseMessage || 'Failed to send OTP';

            return {
                success: false,
                message: errorMessage,
                responseCode,
                debug: error.response.data // Include full error response for debugging
            };
        }

        // Handle network/timeout errors
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            return {
                success: false,
                message: ERROR_MESSAGES['ERT788']
            };
        }

        return {
            success: false,
            message: 'Failed to send OTP. Please try again later.'
        };
    }
};

/**
 * Verify OTP and retrieve Aadhaar details
 * @param {string} aadhaarNumber - 12-digit Aadhaar number
 * @param {string} otp - 6-digit OTP
 * @returns {Promise<{success: boolean, data?: object, referenceId?: string, message: string, responseCode?: string}>}
 */
const verifyAadhaarOtp = async (aadhaarNumber, otp) => {
    try {
        // Validate inputs
        if (!aadhaarNumber || !/^[0-9]{12}$/.test(aadhaarNumber)) {
            return {
                success: false,
                message: 'Aadhaar number must be exactly 12 digits'
            };
        }

        if (!otp || !/^[0-9]{6}$/.test(otp)) {
            return {
                success: false,
                message: 'OTP must be exactly 6 digits'
            };
        }

        // Validate credentials
        if (!CLIENT_ID || !CLIENT_SECRET) {
            console.error('KYC API credentials not configured');
            return {
                success: false,
                message: 'KYC service not configured. Please contact administrator.'
            };
        }

        const response = await axios.post(
            `${KYC_BASE_URL}/kyc/external/aadhaarDetail`,
            {
                otp: otp,
                aadhaar_number: aadhaarNumber,
                consent: 'Y'
            },
            {
                headers: {
                    'ClientId': CLIENT_ID,
                    'ClientSecret': CLIENT_SECRET,
                    'Content-Type': 'application/json'
                },
                timeout: 30000 // 30 second timeout
            }
        );

        const { data, referenceId, responseMessage, responseCode } = response.data;

        // Check for success
        if (responseCode === 'SRC001' || response.data.success) {
            // Extract and structure the verified data
            const verifiedData = {
                name: data.name || '',
                dateOfBirth: data.dateOfBirth || data.dob || '',
                gender: data.gender || '',
                address: {
                    house: data.house || '',
                    street: data.street || '',
                    landmark: data.landmark || '',
                    locality: data.locality || data.loc || '',
                    vtc: data.vtc || '',
                    district: data.district || data.dist || '',
                    state: data.state || '',
                    pincode: data.pincode || data.zip || '',
                    country: data.country || 'India'
                },
                photoBase64: data.photoBase64 || data.photo || null,
                xmlBase64: data.xmlBase64 || null
            };

            return {
                success: true,
                data: verifiedData,
                referenceId,
                message: responseMessage || 'Aadhaar verified successfully.',
                responseCode
            };
        }

        // Handle error response codes
        const errorMessage = ERROR_MESSAGES[responseCode] || responseMessage || 'Failed to verify OTP';
        return {
            success: false,
            message: errorMessage,
            responseCode
        };

    } catch (error) {
        console.error('Verify Aadhaar OTP error:', error.message);

        // Handle axios errors
        if (error.response) {
            const { responseCode, responseMessage } = error.response.data || {};
            const errorMessage = ERROR_MESSAGES[responseCode] || responseMessage || 'Failed to verify OTP';

            return {
                success: false,
                message: errorMessage,
                responseCode
            };
        }

        // Handle network/timeout errors
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            return {
                success: false,
                message: ERROR_MESSAGES['ERT788']
            };
        }

        return {
            success: false,
            message: 'Failed to verify OTP. Please try again later.'
        };
    }
};

module.exports = {
    sendAadhaarOtp,
    verifyAadhaarOtp
};
