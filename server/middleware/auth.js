const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'cardio_hiit_secret_key_2026';
const COOKIE_NAME = 'auth_token';

// 30 days in milliseconds (1 month)
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

const COOKIE_OPTIONS = {
  httpOnly: true,
  maxAge: COOKIE_MAX_AGE,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production'
};

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role || 'user'
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

function setAuthCookie(res, user) {
  const token = generateToken(user);
  res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
  return token;
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });
  // Clear legacy connect.sid if present
  res.clearCookie('connect.sid');
}

function authMiddleware(req, res, next) {
  req.session = req.session || {};
  const token = req.cookies ? req.cookies[COOKIE_NAME] : null;

  if (token) {
    const payload = verifyToken(token);
    if (payload && payload.id) {
      const user = {
        id: payload.id,
        username: payload.username,
        email: payload.email,
        role: payload.role || 'user'
      };
      req.user = user;
      req.session.user = user;
    } else {
      req.user = null;
      req.session.user = null;
    }
  } else {
    req.user = null;
    req.session.user = null;
  }

  next();
}

module.exports = {
  JWT_SECRET,
  COOKIE_NAME,
  COOKIE_OPTIONS,
  generateToken,
  verifyToken,
  setAuthCookie,
  clearAuthCookie,
  authMiddleware
};
