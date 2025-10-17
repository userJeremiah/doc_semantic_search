const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { sampleUsers } = require('../models/sampleData');
const PermitService = require('../services/permit');

const router = express.Router();
const permitService = new PermitService();

// In a real application, you would use a proper database
// For demo purposes, we'll use the sample data with hashed passwords
const users = sampleUsers.map(user => {
  // Keep the User instance to preserve getters
  user.password = bcrypt.hashSync('password123', 10);
  return user;
});

/**
 * @route POST /api/auth/login
 * @desc Authenticate user and return JWT token
 * @access Public
 */
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = users.find(u => u.email === email && u.isActive);
    if (!user) {
      return res.status(401).json({
        error: {
          message: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        }
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: {
          message: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        }
      });
    }

    // Check if access has expired (for temporary staff)
    if (!user.isAccessValid) {
      return res.status(403).json({
        error: {
          message: 'Access has expired',
          code: 'ACCESS_EXPIRED'
        }
      });
    }

    // Generate JWT token
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      department: user.department,
      fullName: user.fullName,
      employeeId: user.employeeId,
      shiftStart: user.shiftStart,
      shiftEnd: user.shiftEnd,
      accessExpiry: user.accessExpiry,
      assignedPatients: user.assignedPatients,
      permissions: user.permissions,
      emergencyAccess: user.emergencyAccess
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    // Update last login
    user.lastLogin = new Date().toISOString();

    // Log successful login
    console.log(`✅ User login: ${user.email} (${user.role}) from ${req.ip}`);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        department: user.department,
        employeeId: user.employeeId,
        specialization: user.specialization,
        shiftStart: user.shiftStart,
        shiftEnd: user.shiftEnd,
        isShiftActive: user.isShiftActive,
        permissions: user.permissions,
        emergencyAccess: user.emergencyAccess
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      error: {
        message: 'Internal server error during login',
        code: 'LOGIN_ERROR'
      }
    });
  }
});

/**
 * @route POST /api/auth/refresh
 * @desc Refresh JWT token
 * @access Private
 */
router.post('/refresh', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: {
          message: 'Refresh token required',
          code: 'TOKEN_REQUIRED'
        }
      });
    }

    // Verify the current token (even if expired)
    jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true }, (err, decoded) => {
      if (err && err.name !== 'TokenExpiredError') {
        return res.status(403).json({
          error: {
            message: 'Invalid token',
            code: 'INVALID_TOKEN'
          }
        });
      }

      // Find the current user
      const user = users.find(u => u.id === decoded.id && u.isActive);
      if (!user || !user.isAccessValid) {
        return res.status(403).json({
          error: {
            message: 'User access revoked',
            code: 'ACCESS_REVOKED'
          }
        });
      }

      // Generate new token
      const newTokenPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        department: user.department,
        fullName: user.fullName,
        employeeId: user.employeeId,
        shiftStart: user.shiftStart,
        shiftEnd: user.shiftEnd,
        accessExpiry: user.accessExpiry,
        assignedPatients: user.assignedPatients,
        permissions: user.permissions,
        emergencyAccess: user.emergencyAccess
      };

      const newToken = jwt.sign(
        newTokenPayload,
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
      );

      res.json({
        message: 'Token refreshed',
        token: newToken
      });
    });

  } catch (error) {
    console.error('❌ Token refresh error:', error);
    res.status(500).json({
      error: {
        message: 'Internal server error during token refresh',
        code: 'REFRESH_ERROR'
      }
    });
  }
});

/**
 * @route GET /api/auth/profile
 * @desc Get current user profile
 * @access Private
 */
router.get('/profile', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: {
          message: 'Access token required',
          code: 'TOKEN_REQUIRED'
        }
      });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({
          error: {
            message: 'Invalid or expired token',
            code: 'TOKEN_INVALID'
          }
        });
      }

      const user = users.find(u => u.id === decoded.id && u.isActive);
      if (!user) {
        return res.status(404).json({
          error: {
            message: 'User not found',
            code: 'USER_NOT_FOUND'
          }
        });
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          department: user.department,
          employeeId: user.employeeId,
          licenseNumber: user.licenseNumber,
          specialization: user.specialization,
          shiftStart: user.shiftStart,
          shiftEnd: user.shiftEnd,
          isShiftActive: user.isShiftActive,
          accessExpiry: user.accessExpiry,
          isAccessValid: user.isAccessValid,
          assignedPatients: user.assignedPatients,
          permissions: user.permissions,
          emergencyAccess: user.emergencyAccess,
          lastLogin: user.lastLogin
        }
      });
    });

  } catch (error) {
    console.error('❌ Profile fetch error:', error);
    res.status(500).json({
      error: {
        message: 'Internal server error fetching profile',
        code: 'PROFILE_ERROR'
      }
    });
  }
});

/**
 * @route POST /api/auth/logout
 * @desc Logout user (in a real app, you'd blacklist the token)
 * @access Private
 */
router.post('/logout', (req, res) => {
  // In a real application, you would:
  // 1. Add the token to a blacklist
  // 2. Clear any session data
  // 3. Log the logout event

  console.log('📝 User logout event');
  
  res.json({
    message: 'Logout successful'
  });
});

/**
 * @route GET /api/auth/verify
 * @desc Verify token validity
 * @access Private
 */
router.get('/verify', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      valid: false,
      error: 'No token provided'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        valid: false,
        error: 'Invalid or expired token'
      });
    }

    const user = users.find(u => u.id === decoded.id && u.isActive);
    if (!user || !user.isAccessValid) {
      return res.status(403).json({
        valid: false,
        error: 'User access revoked'
      });
    }

    res.json({
      valid: true,
      user: {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        department: decoded.department
      }
    });
  });
});

module.exports = router;