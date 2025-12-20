const OTP = require('../models/OTP');
const axios = require('axios');

/**
 * Generate 6-digit OTP
 */
const generateOTP = () => {
  // In production, use a secure random number generator
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Save OTP to database
 */
const saveOTP = async (mobileNumber, otp) => {
  const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 5;
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  // Delete any existing OTP for this mobile number
  await OTP.deleteMany({ mobileNumber });

  // Create new OTP record
  const otpRecord = await OTP.create({
    mobileNumber,
    otp,
    expiresAt
  });

  return otpRecord;
};

/**
 * Verify OTP using database
 */
const verifyOTP = async (mobileNumber, otp) => {
  try {
    // Database verification
    const otpRecord = await OTP.findOne({ 
      mobileNumber, 
      verified: false 
    });

    if (!otpRecord) {
      return { success: false, message: 'OTP not found or already used' };
    }

    // Check if OTP is expired
    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return { success: false, message: 'OTP has expired' };
    }

    // Check maximum attempts
    const maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS) || 3;
    if (otpRecord.attempts >= maxAttempts) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return { success: false, message: 'Maximum OTP attempts exceeded' };
    }

    // Check if OTP matches
    if (otpRecord.otp !== otp) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return { 
        success: false, 
        message: 'Invalid OTP',
        attemptsLeft: maxAttempts - otpRecord.attempts
      };
    }

    // Mark OTP as verified and delete
    await OTP.deleteOne({ _id: otpRecord._id });
    
    return { success: true, message: 'OTP verified successfully' };
  } catch (error) {
    console.error('❌ OTP verification error:', error.message);
    return { success: false, message: 'Failed to verify OTP' };
  }
};

/**
 * Send OTP via BulkSMS HTTP API
 */
const sendOTP = async (mobileNumber, otp) => {
  try {
    // Check if SMS is enabled
    const smsEnabled = process.env.SMS_ENABLED === 'true';
    
    if (!smsEnabled) {
      // In development/testing mode, just log the OTP
      console.log(`📱 [TEST MODE] OTP for ${mobileNumber}: ${otp}`);
      return true;
    }

    console.log(`📤 Sending OTP to ${mobileNumber} via BulkSMS...`);

    // BulkSMS HTTP API configuration
    const bulkSmsUser = process.env.BULKSMS_USER || 'kistkart';
    const bulkSmsKey = process.env.BULKSMS_KEY || '9ded48cbeaXX';
    const senderId = process.env.BULKSMS_SENDER_ID || 'OTPSSS';
    const entityId = process.env.BULKSMS_ENTITY_ID || '1201159543060917386';
    const tempId = process.env.BULKSMS_TEMPLATE_ID || '1207161729866691748';

    // Construct the message
    const message = `Dear Customer, Your OTP is ${otp} for kistkart, Please do not share this OTP. Regards`;

    // Build the API URL with all parameters
    const apiUrl = 'http://sms.bulkssms.com/submitsms.jsp';
    const params = {
      user: bulkSmsUser,
      key: bulkSmsKey,
      mobile: mobileNumber,
      message: message,
      senderid: senderId,
      accusage: '1',
      entityid: entityId,
      tempid: tempId
    };

    // Make HTTP GET request to BulkSMS API
    const response = await axios.get(apiUrl, { params });

    console.log('📥 BulkSMS Response:', {
      status: response.status,
      data: response.data
    });

    if (response.status === 200) {
      console.log(`✅ OTP sent successfully to ${mobileNumber}!`);
      console.log(`📱 Check your phone for SMS!`);
      return true;
    } else {
      console.error('❌ BulkSMS Error:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ SMS sending error:', error.message);
    if (error.response) {
      console.error('❌ Response data:', error.response.data);
    }
    return false;
  }
};

module.exports = {
  generateOTP,
  saveOTP,
  verifyOTP,
  sendOTP
};
