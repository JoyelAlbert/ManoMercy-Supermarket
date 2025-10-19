import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import xss from 'xss-clean';
import hpp from 'hpp';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import winston from 'winston';
import crypto from 'crypto';
import multer from 'multer';

// ==================== ENVIRONMENT CONFIGURATION ====================
const isProduction = process.env.NODE_ENV === 'production';

// Dynamic CORS origins configuration
const getCorsOrigins = () => {
  const defaultOrigins = [
    'http://localhost:3000',
    'http://localhost:5001',
    'http://localhost:5173',
    'https://localhost:5173',
    'http://127.0.0.1:5173'
  ];

  if (process.env.CORS_ORIGINS) {
    return [...defaultOrigins, ...process.env.CORS_ORIGINS.split(',')];
  }

  if (process.env.FRONTEND_URL) {
    return [...defaultOrigins, process.env.FRONTEND_URL];
  }

  return defaultOrigins;
};

// Security configuration
const securityConfig = {
  isProduction,
  jwt: {
    secret: process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex'),
    expiresIn: isProduction ? '1h' : '7d',
    issuer: 'manomercy-supermarket'
  },
  rateLimit: {
    windowMs: isProduction ? 15 * 60 * 1000 : 60 * 1000,
    max: isProduction ? 100 : 1000
  },
  cors: {
    origins: getCorsOrigins()
  },
  password: {
    minLength: parseInt(process.env.PASSWORD_MIN_LENGTH) || 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true
  },
  bruteForce: {
    maxAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
    lockoutTime: parseInt(process.env.LOCKOUT_TIME) || 15 * 60 * 1000
  },
  session: {
    cookie: {
      secure: isProduction,
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    }
  }
};

// Logger for security events
const securityLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'warn' : 'info'),
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: process.env.LOG_FILE || 'logs/security.log',
      level: 'warn',
      maxsize: 10485760,
      maxFiles: 5
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// ==================== ENCRYPTION SERVICE ====================
class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.key = crypto.scryptSync(
      process.env.ENCRYPTION_KEY || securityConfig.jwt.secret,
      'salt',
      32
    );
  }

  encrypt(text) {
    try {
      if (typeof text !== 'string') {
        text = JSON.stringify(text);
      }

      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      return {
        iv: iv.toString('hex'),
        data: encrypted,
        authTag: authTag.toString('hex'),
        timestamp: Date.now()
      };
    } catch (error) {
      securityLogger.error('Encryption failed', { error: error.message });
      throw new Error('Encryption failed');
    }
  }

  decrypt(encryptedData) {
    try {
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.key,
        Buffer.from(encryptedData.iv, 'hex')
      );
      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

      let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (error) {
      securityLogger.error('Decryption failed', { error: error.message });
      throw new Error('Decryption failed');
    }
  }
}

const encryptionService = new EncryptionService();

// ==================== BRUTE FORCE PROTECTION ====================
const loginAttempts = new Map();

const checkBruteForce = (ip) => {
  const now = Date.now();
  const attempts = loginAttempts.get(ip) || [];
  const recentAttempts = attempts.filter(time => now - time < securityConfig.bruteForce.lockoutTime);

  if (recentAttempts.length >= securityConfig.bruteForce.maxAttempts) {
    securityLogger.warn('Brute force lockout active', { ip, attempts: recentAttempts.length });
    return true;
  }

  loginAttempts.set(ip, recentAttempts);
  return false;
};

const recordLoginAttempt = (ip, success) => {
  const now = Date.now();
  const attempts = loginAttempts.get(ip) || [];

  if (success) {
    loginAttempts.delete(ip);
    securityLogger.info('Login successful, reset attempts', { ip });
  } else {
    attempts.push(now);
    loginAttempts.set(ip, attempts);

    securityLogger.warn('Login attempt failed', { ip, attemptCount: attempts.length });

    if (attempts.length >= securityConfig.bruteForce.maxAttempts) {
      securityLogger.warn('BRUTE_FORCE_LOCKOUT_TRIGGERED', { ip, attempts: attempts.length });
    }
  }
};

// ==================== CORS ====================
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (!isProduction) {
      const localhostRegex = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
      if (localhostRegex.test(origin)) return callback(null, true);
    }

    if (securityConfig.cors.origins.includes(origin)) return callback(null, true);

    securityLogger.warn('CORS violation attempt', { origin });
    callback(new Error(`Origin ${origin} not allowed by CORS policy`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-API-Key',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400,
  optionsSuccessStatus: 204
};

// ==================== MIDDLEWARE SETUP ====================
const applySecurityMiddleware = (app) => {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        connectSrc: ["'self'", "http://localhost:5173", "ws://localhost:5173"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"]
      }
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    crossOriginEmbedderPolicy: false
  }));

  app.use(cors(corsOptions));
  app.use(rateLimit({
    windowMs: securityConfig.rateLimit.windowMs,
    max: securityConfig.rateLimit.max,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
  }));

  // ✅ REMOVED: customSanitize - this was causing the 500 errors
  app.use(xss());
  app.use(hpp());

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
  });
};

// ==================== AUTH ====================
const generateToken = (payload) => jwt.sign(payload, securityConfig.jwt.secret, {
  expiresIn: securityConfig.jwt.expiresIn,
  issuer: securityConfig.jwt.issuer
});

const verifyToken = (token) => {
  try {
    return jwt.verify(token, securityConfig.jwt.secret);
  } catch (err) {
    throw new Error('Invalid or expired token');
  }
};

const authenticate = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
  const role = req.user.role || (req.user.isAdmin ? 'admin' : 'user');
  if (!roles.includes(role)) return res.status(403).json({ error: 'Insufficient permissions.' });
  next();
};

// ==================== VALIDATION SCHEMAS ====================
const validationSchemas = {
  auth: Joi.object({
    email: Joi.string().email().required().normalize(),
    password: Joi.string().min(securityConfig.password.minLength).required()
  }),
  product: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    price: Joi.number().min(0).required(),
    description: Joi.string().max(500).optional(),
    category: Joi.string().valid('grocery', 'beauty', 'soap', 'snacks').required(),
    inStock: Joi.boolean().default(true),
    discount: Joi.number().min(0).max(100).default(0)
  })
};

// ==================== PASSWORD UTILITIES ====================
const hashPassword = async (password) => {
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  return await bcrypt.hash(password, saltRounds);
};

const verifyPassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// ==================== SECURITY UTILITIES ====================
const logSecurityEvent = (event, details = {}) => {
  securityLogger.warn(`Security Event: ${event}`, {
    ...details,
    timestamp: new Date().toISOString(),
    ip: details.ip || 'unknown'
  });
};

// ==================== EXPORT ====================
export {
  securityConfig,
  applySecurityMiddleware,
  authenticate,
  authorize,
  validationSchemas,
  hashPassword,
  verifyPassword,
  logSecurityEvent,
  encryptionService,
  checkBruteForce,
  recordLoginAttempt,
  isProduction
};

export default {
  securityConfig,
  applySecurityMiddleware,
  authenticate,
  authorize,
  validationSchemas,
  hashPassword,
  verifyPassword,
  logSecurityEvent,
  encryptionService,
  checkBruteForce,
  recordLoginAttempt,
  isProduction
};