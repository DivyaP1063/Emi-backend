const OTP = require('../models/OTP');

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
 * Verify OTP (Uses Twilio Verify if enabled, otherwise database)
 */
const verifyOTP = async (mobileNumber, otp) => {
  try {
    const smsEnabled = process.env.SMS_ENABLED === 'true';
    const provider = process.env.SMS_PROVIDER || 'TWILIO_VERIFY';

    if (smsEnabled && provider === 'TWILIO_VERIFY') {
      // Verify with Twilio Verify Service
      const twilio = require('twilio');
      
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      const verificationCheck = await client.verify.v2
        .services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verificationChecks
        .create({
          to: `+91${mobileNumber}`,
          code: otp
        });

      console.log('📥 Twilio Verify Check:', {
        status: verificationCheck.status,
        valid: verificationCheck.valid
      });

      if (verificationCheck.status === 'approved') {
        return { success: true, message: 'OTP verified successfully' };
      } else {
        return { success: false, message: 'Invalid or expired OTP' };
      }
    } else {
      // Fallback to database verification
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
    }
  } catch (error) {
    console.error('❌ OTP verification error:', error.message);
    return { success: false, message: 'Failed to verify OTP' };
  }
};

/**
 * Send OTP via Twilio Verify (Twilio generates and manages OTP)
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

    const provider = process.env.SMS_PROVIDER || 'TWILIO_VERIFY';

    console.log(`📤 Sending OTP to +91${mobileNumber} via ${provider}...`);

    if (provider === 'TWILIO_VERIFY') {
      // Twilio Verify - Twilio generates OTP automatically
      const twilio = require('twilio');
      
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      const verification = await client.verify.v2
        .services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verifications
        .create({
          to: `+91${mobileNumber}`,
          channel: 'sms'
        });

      console.log('📥 Twilio Verify Response:', {
        sid: verification.sid,
        status: verification.status,
        to: verification.to
      });

      if (verification.status === 'pending') {
        console.log(`✅ OTP sent successfully to +91${mobileNumber}!`);
        console.log(`📱 Check your phone for SMS from Twilio!`);
        console.log(`⚠️ Use the 6-digit code from SMS to verify`);
        return true;
      } else {
        console.error('❌ Twilio Verify Error:', verification);
        return false;
      }
    } else {
      console.log(`📱 [TEST MODE] OTP for ${mobileNumber}: ${otp}`);
      return true;
    }
  } catch (error) {
    console.error('❌ SMS sending error:', error.message);
    return false;
  }
};

module.exports = {
  generateOTP,
  saveOTP,
  verifyOTP,
  sendOTP
};
