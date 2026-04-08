/**
 * Authentication Middleware
 * JWT verification + role-based access control
 */

const passport = require('passport');

// ─── Protect Route (JWT) ──────────────────────────────────────────────────────
exports.protect = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
    }
    req.user = user;
    next();
  })(req, res, next);
};

// ─── Role-Based Access Control ────────────────────────────────────────────────
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized for this action`,
      });
    }
    next();
  };
};

// ─── Optional Auth (attach user if token present) ─────────────────────────────
exports.optionalAuth = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (user) req.user = user;
    next();
  })(req, res, next);
};
