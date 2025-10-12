const jwt = require('jsonwebtoken');

/**
 * JWT Authentication Middleware
 * Verifies JWT tokens and extracts user information
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: {
        message: 'Access token required',
        code: 'TOKEN_MISSING'
      }
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error('JWT verification error:', err);
      return res.status(403).json({
        error: {
          message: 'Invalid or expired token',
          code: 'TOKEN_INVALID'
        }
      });
    }

    // Add user information to request object
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      department: user.department,
      permissions: user.permissions || [],
      shiftStart: user.shiftStart,
      shiftEnd: user.shiftEnd,
      accessExpiry: user.accessExpiry
    };

    next();
  });
};

/**
 * Role-based access control middleware
 * @param {Array} allowedRoles - Array of roles that can access the endpoint
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        }
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          message: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: allowedRoles,
          current: req.user.role
        }
      });
    }

    next();
  };
};

/**
 * Check if user access has expired
 */
const checkAccessExpiry = (req, res, next) => {
  if (!req.user) {
    return next();
  }

  const now = new Date();
  
  // Check if access has expired
  if (req.user.accessExpiry && new Date(req.user.accessExpiry) < now) {
    return res.status(403).json({
      error: {
        message: 'Access has expired',
        code: 'ACCESS_EXPIRED',
        expiredAt: req.user.accessExpiry
      }
    });
  }

  // Check if within shift hours (if applicable)
  if (req.user.shiftStart && req.user.shiftEnd) {
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    
    if (currentTime < req.user.shiftStart || currentTime > req.user.shiftEnd) {
      return res.status(403).json({
        error: {
          message: 'Outside shift hours',
          code: 'OUTSIDE_SHIFT_HOURS',
          shiftStart: req.user.shiftStart,
          shiftEnd: req.user.shiftEnd,
          currentTime: currentTime
        }
      });
    }
  }

  next();
};

module.exports = {
  authenticateToken,
  requireRole,
  checkAccessExpiry
};