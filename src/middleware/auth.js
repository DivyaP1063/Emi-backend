const { verifyToken } = require('../utils/jwt');
const Admin = require('../models/Admin');
const Retailer = require('../models/Retailer');

/**
 * Middleware to verify JWT token and authenticate admin
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token not found',
        error: 'INVALID_TOKEN'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        error: 'INVALID_TOKEN'
      });
    }

    // Check if admin exists and is active
    const admin = await Admin.findById(decoded.id);

    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Admin not found or inactive',
        error: 'UNAUTHORIZED_ACCESS'
      });
    }

    // Attach admin to request object
    req.admin = {
      id: admin._id.toString(),
      name: admin.name,
      email: admin.email,
      mobileNumber: admin.mobileNumber
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: 'SERVER_ERROR'
    });
  }
};

/**
 * Middleware to verify JWT token and authenticate retailer
 */
const authenticateRetailer = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token not found',
        error: 'INVALID_TOKEN'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        error: 'INVALID_TOKEN'
      });
    }

    // Check if token is for retailer
    if (decoded.role !== 'RETAILER') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Retailer role required',
        error: 'FORBIDDEN'
      });
    }

    // Check if retailer exists and is active
    const retailer = await Retailer.findById(decoded.id);

    if (!retailer) {
      return res.status(401).json({
        success: false,
        message: 'Retailer not found',
        error: 'UNAUTHORIZED_ACCESS'
      });
    }

    if (retailer.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: `Retailer account is ${retailer.status.toLowerCase()}`,
        error: 'ACCOUNT_NOT_ACTIVE'
      });
    }

    // Attach retailer to request object
    req.retailer = {
      id: retailer._id.toString(),
      shopName: retailer.basicInfo?.shopName || 'N/A',
      mobileNumber: retailer.basicInfo?.mobileNumber || '',
      email: retailer.basicInfo?.email || '',
      status: retailer.status
    };

    next();
  } catch (error) {
    console.error('Retailer authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: 'SERVER_ERROR'
    });
  }
};

/**
 * Middleware to verify JWT token and authenticate accountant
 */
const authenticateAccountant = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token not found',
        error: 'INVALID_TOKEN'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        error: 'INVALID_TOKEN'
      });
    }

    // Check if token is for accountant
    if (decoded.role !== 'accountant') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Accountant role required',
        error: 'FORBIDDEN'
      });
    }

    // Check if accountant exists and is active
    const Accountant = require('../models/Accountant');
    const accountant = await Accountant.findById(decoded.id);

    if (!accountant) {
      return res.status(401).json({
        success: false,
        message: 'Accountant not found',
        error: 'UNAUTHORIZED_ACCESS'
      });
    }

    if (!accountant.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Accountant account is inactive',
        error: 'ACCOUNT_INACTIVE'
      });
    }

    // Attach accountant to request object
    req.accountant = {
      id: accountant._id.toString(),
      fullName: accountant.fullName,
      mobileNumber: accountant.mobileNumber,
      aadharNumber: accountant.aadharNumber
    };

    next();
  } catch (error) {
    console.error('Accountant authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: 'SERVER_ERROR'
    });
  }
};

/**
 * Middleware to verify JWT token and authenticate recovery head
 */
const authenticateRecoveryHead = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token not found',
        error: 'INVALID_TOKEN'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        error: 'INVALID_TOKEN'
      });
    }

    // Check if token is for recovery head
    if (decoded.role !== 'RECOVERY_HEAD') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Recovery Head role required',
        error: 'FORBIDDEN'
      });
    }

    // Check if recovery head exists and is active
    const RecoveryHead = require('../models/RecoveryHead');
    const recoveryHead = await RecoveryHead.findById(decoded.id);

    if (!recoveryHead) {
      return res.status(401).json({
        success: false,
        message: 'Recovery head not found',
        error: 'UNAUTHORIZED_ACCESS'
      });
    }

    if (recoveryHead.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: `Recovery head account is ${recoveryHead.status.toLowerCase()}`,
        error: 'ACCOUNT_NOT_ACTIVE'
      });
    }

    // Attach recovery head to request object
    req.recoveryHead = {
      id: recoveryHead._id.toString(),
      fullName: recoveryHead.fullName,
      mobileNumber: recoveryHead.mobileNumber,
      pinCodes: recoveryHead.pinCodes,
      status: recoveryHead.status
    };

    next();
  } catch (error) {
    console.error('Recovery head authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: 'SERVER_ERROR'
    });
  }
};

/**
 * Middleware to verify JWT token and authenticate recovery person
 */
const authenticateRecoveryPerson = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token not found',
        error: 'INVALID_TOKEN'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        error: 'INVALID_TOKEN'
      });
    }

    // Check if token is for recovery person
    if (decoded.role !== 'RECOVERY_PERSON') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Recovery Person role required',
        error: 'FORBIDDEN'
      });
    }

    // Check if recovery person exists and is active
    const RecoveryPerson = require('../models/RecoveryPerson');
    const recoveryPerson = await RecoveryPerson.findById(decoded.id);

    if (!recoveryPerson) {
      return res.status(401).json({
        success: false,
        message: 'Recovery person not found',
        error: 'UNAUTHORIZED_ACCESS'
      });
    }

    if (!recoveryPerson.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Recovery person account is inactive',
        error: 'ACCOUNT_INACTIVE'
      });
    }

    // Attach recovery person to request object
    req.recoveryPerson = {
      id: recoveryPerson._id.toString(),
      fullName: recoveryPerson.fullName,
      mobileNumber: recoveryPerson.mobileNumber,
      aadharNumber: recoveryPerson.aadharNumber,
      recoveryHeadId: recoveryPerson.recoveryHeadId.toString()
    };

    next();
  } catch (error) {
    console.error('Recovery person authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: 'SERVER_ERROR'
    });
  }
};

module.exports = {
  authenticate,
  authenticateRetailer,
  authenticateAccountant,
  authenticateRecoveryHead,
  authenticateRecoveryPerson
};
