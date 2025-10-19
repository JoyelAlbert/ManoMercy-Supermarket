import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { 
  connectDB, 
  Grossory, Snacks, Soap, Beauty,  
  SliderImage, Order, User, Cart 
} from "./db.js";

// Import security module
import security from "./security.js";

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";

// ================== BASIC MIDDLEWARE SETUP ==================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ================== MANUAL SECURITY MIDDLEWARE (TEMPORARY FIX) ==================
app.use((req, res, next) => {
  // Basic security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// CORS
app.use(cors({
  origin: ['http://localhost:5173','http://localhost:5001','https://manomercysupermarket.netlify.app/'],
  credentials: true
}));

// Rate limiting
import rateLimit from 'express-rate-limit';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// Connect to MongoDB
connectDB();

// ================== AUTHENTICATION MIDDLEWARE ==================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Admin middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// ================== API VERSIONING ==================
app.use('/api/v1', (req, res, next) => {
  res.setHeader('X-API-Version', '1.0');
  next();
});

// ================== SECURE FILE UPLOAD ==================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const secureName = `secure_${uniqueSuffix}${ext}`;
    cb(null, secureName);
  },
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      console.log('Invalid file upload attempt:', file.mimetype);
      cb(new Error('Invalid file type. Only images are allowed.'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1
  }
});

// ================== UTILITY FUNCTIONS ==================
const deleteFile = (filePath) => {
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      console.log('File deletion failed:', error.message);
    }
  }
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim();
};

// ================== AUTHENTICATION ROUTES ==================

// USER REGISTRATION
 
app.post("/api/v1/signup", async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
      address,
      isAdmin: false, // user signup
    });

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: "user" },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(201).json({
      message: "Signup successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: "user",
        phone: user.phone,
        address: user.address,
      },
    });
  } catch (error) {
    console.error("❌ Signup error:", error.message);
    res.status(500).json({ message: "Signup failed", error: error.message });
  }
});


// USER LOGIN (for both users and admins)
app.post("/api/v1/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Enhanced validation
    if (!email || !password) {
      return res.status(400).json({ 
        message: "Email and password are required",
        field: !email ? "email" : "password"
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Find user with projection to exclude unnecessary fields
    const user = await User.findOne({ 
      email: email.toLowerCase().trim() 
    }).select('+password'); // Explicitly include password if it's excluded by default

    if (!user) {
      // Use consistent timing to prevent user enumeration
      await bcrypt.compare(password, '$2b$10$fakeHashForTimingConsistency');
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Check if user is active/verified if you have such fields
    if (user.status && user.status !== 'active') {
      return res.status(403).json({ 
        message: "Account is suspended or not verified" 
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const role = user.isAdmin ? "admin" : "user";

    // Enhanced token payload
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role,
        iss: 'your-app-name',
        aud: 'your-app-domain'
      },
      JWT_SECRET,
      { 
        expiresIn: "24h",
        algorithm: "HS256" // Explicitly specify algorithm
      }
    );

    // Update last login timestamp if you track this
    await User.findByIdAndUpdate(user._id, { 
      lastLogin: new Date() 
    });

    console.log(`✅ ${role.toUpperCase()} logged in:`, user.email, user._id);

    // Response without sensitive data
    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role,
        phone: user.phone,
        address: user.address,
        // Include any other non-sensitive user data
      },
      expiresIn: "24h"
    });

  } catch (error) {
    console.error("❌ Login error:", {
      message: error.message,
      email: req.body.email,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({ 
      message: "Login failed", 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});



// GET USER PROFILE
app.get('/api/v1/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('❌ Profile fetch error:', error.message);
    res.status(500).json({ 
      message: 'Failed to fetch profile',
      error: error.message 
    });
  }
});

// UPDATE USER PROFILE
app.put('/api/v1/profile', authenticateToken, async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { 
        name: sanitizeInput(name),
        phone,
        address 
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('✅ Profile updated:', updatedUser.email);
    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('❌ Profile update error:', error.message);
    res.status(500).json({ 
      message: 'Profile update failed',
      error: error.message 
    });
  }
});

// ================== USER MANAGEMENT ROUTES ==================

// GET ALL USERS (Admin only)
app.get('/api/v1/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('❌ Users fetch error:', error.message);
    res.status(500).json({ 
      message: 'Failed to fetch users',
      error: error.message 
    });
  }
});

// GET USER BY ID (Admin only)
app.get('/api/v1/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('❌ User fetch error:', error.message);
    res.status(500).json({ 
      message: 'Failed to fetch user',
      error: error.message 
    });
  }
});

// UPDATE USER ROLE (Admin only)
app.patch('/api/v1/users/:id/role', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('✅ User role updated:', updatedUser.email, 'New role:', updatedUser.role);
    res.json({
      message: 'User role updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('❌ User role update error:', error.message);
    res.status(500).json({ 
      message: 'Failed to update user role',
      error: error.message 
    });
  }
});

// ================== SLIDER IMAGE ROUTES ==================

// GET ALL SLIDER IMAGES
app.get('/api/v1/slider', async (req, res) => {
  try {
    const sliderImages = await SliderImage.find().sort({ order: 1 });
    res.json(sliderImages);
  } catch (error) {
    console.error('❌ Slider images fetch error:', error.message);
    res.status(500).json({ 
      message: 'Failed to fetch slider images',
      error: error.message 
    });
  }
});

// CREATE SLIDER IMAGE (Admin only)
app.post('/api/v1/slider', authenticateToken, requireAdmin, upload.single("image"), async (req, res) => {
  try {
    const { title, description, order = 0, active = true } = req.body;

    const sliderImage = await SliderImage.create({
      title: sanitizeInput(title),
      description: sanitizeInput(description),
      order,
      active,
      image: req.file ? `/uploads/${req.file.filename}` : null,
    });

    console.log('✅ Slider image created:', sliderImage.title);
    res.status(201).json(sliderImage);
  } catch (error) {
    console.error('❌ Slider image creation error:', error.message);
    res.status(500).json({ 
      message: 'Failed to create slider image',
      error: error.message 
    });
  }
});

// UPDATE SLIDER IMAGE (Admin only)
app.put('/api/v1/slider/:id', authenticateToken, requireAdmin, upload.single("image"), async (req, res) => {
  try {
    const updateFields = { ...req.body };

    // Sanitize inputs
    if (updateFields.title) updateFields.title = sanitizeInput(updateFields.title);
    if (updateFields.description) updateFields.description = sanitizeInput(updateFields.description);

    if (req.file) {
      updateFields.image = `/uploads/${req.file.filename}`;
    }

    const updatedSlider = await SliderImage.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    );

    if (!updatedSlider) {
      return res.status(404).json({ message: 'Slider image not found' });
    }

    console.log('✅ Slider image updated:', updatedSlider.title);
    res.json(updatedSlider);
  } catch (error) {
    console.error('❌ Slider image update error:', error.message);
    res.status(500).json({ 
      message: 'Failed to update slider image',
      error: error.message 
    });
  }
});

// DELETE SLIDER IMAGE (Admin only)
app.delete('/api/v1/slider/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const sliderImage = await SliderImage.findById(req.params.id);
    if (!sliderImage) {
      return res.status(404).json({ message: 'Slider image not found' });
    }

    if (sliderImage.image) deleteFile(path.join(".", sliderImage.image));
    await SliderImage.findByIdAndDelete(req.params.id);

    console.log('✅ Slider image deleted:', sliderImage.title);
    res.json({ message: 'Slider image deleted successfully' });
  } catch (error) {
    console.error('❌ Slider image deletion error:', error.message);
    res.status(500).json({ 
      message: 'Failed to delete slider image',
      error: error.message 
    });
  }
});

// ================== CART ROUTES ==================

// GET USER CART
app.get('/api/v1/cart', authenticateToken, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.userId }).populate('items.productId');
    
    if (!cart) {
      // Create empty cart if doesn't exist
      cart = await Cart.create({
        user: req.user.userId,
        items: []
      });
    }

    res.json(cart);
  } catch (error) {
    console.error('❌ Cart fetch error:', error.message);
    res.status(500).json({ 
      message: 'Failed to fetch cart',
      error: error.message 
    });
  }
});

// ADD ITEM TO CART
app.post('/api/v1/cart/items', authenticateToken, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    let cart = await Cart.findOne({ user: req.user.userId });

    if (!cart) {
      cart = await Cart.create({
        user: req.user.userId,
        items: []
      });
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.productId.toString() === productId
    );

    if (existingItemIndex > -1) {
      // Update quantity if item exists
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      // Add new item
      cart.items.push({
        productId,
        quantity
      });
    }

    await cart.save();
    await cart.populate('items.productId');

    console.log('✅ Item added to cart for user:', req.user.email);
    res.json(cart);
  } catch (error) {
    console.error('❌ Add to cart error:', error.message);
    res.status(500).json({ 
      message: 'Failed to add item to cart',
      error: error.message 
    });
  }
});

// UPDATE CART ITEM QUANTITY
app.patch('/api/v1/cart/items/:productId', authenticateToken, async (req, res) => {
  try {
    const { quantity } = req.body;

    const cart = await Cart.findOne({ user: req.user.userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(
      item => item.productId.toString() === req.params.productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    if (quantity <= 0) {
      // Remove item if quantity is 0 or less
      cart.items.splice(itemIndex, 1);
    } else {
      // Update quantity
      cart.items[itemIndex].quantity = quantity;
    }

    await cart.save();
    await cart.populate('items.productId');

    res.json(cart);
  } catch (error) {
    console.error('❌ Cart update error:', error.message);
    res.status(500).json({ 
      message: 'Failed to update cart',
      error: error.message 
    });
  }
});

// CLEAR CART
app.delete('/api/v1/cart', authenticateToken, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    cart.items = [];
    await cart.save();

    console.log('✅ Cart cleared for user:', req.user.email);
    res.json({ message: 'Cart cleared successfully' });
  } catch (error) {
    console.error('❌ Clear cart error:', error.message);
    res.status(500).json({ 
      message: 'Failed to clear cart',
      error: error.message 
    });
  }
});

// ================== ORDER ROUTES ==================

// CREATE DRAFT ORDER
app.post('/api/v1/orders/draft', authenticateToken, async (req, res) => {
  try {
    const draftOrder = await Order.create({
      user: req.user.userId,
      status: 'Draft',
      items: [],
      totalAmount: 0
    });

    console.log('✅ Draft order created:', draftOrder._id);
    res.status(201).json(draftOrder);
  } catch (error) {
    console.error('❌ Draft order creation error:', error.message);
    res.status(500).json({ 
      message: 'Failed to create draft order',
      error: error.message 
    });
  }
});

// GET USER ORDERS
app.get('/api/v1/orders', authenticateToken, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.userId })
      .sort({ createdAt: -1 })
      .populate('items.productId');

    res.json(orders);
  } catch (error) {
    console.error('❌ Orders fetch error:', error.message);
    res.status(500).json({ 
      message: 'Failed to fetch orders',
      error: error.message 
    });
  }
});

// GET ALL ORDERS (Admin only)
app.get('/api/v1/admin/orders', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate('items.productId')
      .populate('user', 'name email');

    res.json(orders);
  } catch (error) {
    console.error('❌ Admin orders fetch error:', error.message);
    res.status(500).json({ 
      message: 'Failed to fetch orders',
      error: error.message 
    });
  }
});

// ADD ITEM TO ORDER
app.patch('/api/v1/orders/:orderId/add-item', authenticateToken, async (req, res) => {
  try {
    const { productId, name, price, qty, image, discount } = req.body;
    
    const order = await Order.findOne({ 
      _id: req.params.orderId, 
      user: req.user.userId 
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if item already exists
    const existingItemIndex = order.items.findIndex(
      item => item.productId.toString() === productId
    );

    if (existingItemIndex > -1) {
      // Update quantity if item exists
      order.items[existingItemIndex].qty += qty;
    } else {
      // Add new item
      order.items.push({
        productId,
        name,
        price,
        qty,
        image,
        discount
      });
    }

    // Recalculate total
    order.totalAmount = order.items.reduce((total, item) => {
      return total + (item.price * item.qty);
    }, 0);

    await order.save();
    await order.populate('items.productId');

    console.log('✅ Item added to order:', order._id);
    res.json(order);
  } catch (error) {
    console.error('❌ Add item error:', error.message);
    res.status(500).json({ 
      message: 'Failed to add item to order',
      error: error.message 
    });
  }
});

// ================== GENERIC CRUD OPERATIONS ==================
function createCRUDRoutes(model, route) {
  // READ ALL
  app.get(`/api/v1/${route}`, async (req, res) => {
    try {
      console.log(`📦 Fetching ${route}...`);
      const docs = await model.find();
      console.log(`✅ Found ${docs.length} ${route}`);
      res.json(docs);
    } catch (error) {
      console.error(`❌ Error fetching ${route}:`, error.message);
      res.status(500).json({ message: `Failed to fetch ${route}` });
    }
  });

  // READ SINGLE
  app.get(`/api/v1/${route}/:id`, async (req, res) => {
    try {
      const doc = await model.findById(req.params.id);
      if (!doc) return res.status(404).json({ message: `${route} not found` });
      res.json(doc);
    } catch (error) {
      console.error(`Error fetching ${route}:`, error.message);
      res.status(500).json({ message: `Failed to fetch ${route}` });
    }
  });

  // CREATE
  app.post(`/api/v1/${route}`, upload.single("image"), async (req, res) => {
    try {
      const { price, discount = 0 } = req.body;
      const finalPrice = price - (price * discount / 100);

      const doc = await model.create({
        ...req.body,
        name: sanitizeInput(req.body.name),
        description: sanitizeInput(req.body.description),
        finalPrice,
        image: req.file ? `/uploads/${req.file.filename}` : null,
      });
      
      console.log(`✅ ${route} created:`, doc.name);
      res.status(201).json(doc);
    } catch (error) {
      console.error(`Error creating ${route}:`, error.message);
      res.status(500).json({ message: `Failed to create ${route}` });
    }
  });

  // UPDATE
  app.put(`/api/v1/${route}/:id`, upload.single("image"), async (req, res) => {
    try {
      const updateFields = { ...req.body };

      // Sanitize inputs
      if (updateFields.name) updateFields.name = sanitizeInput(updateFields.name);
      if (updateFields.description) updateFields.description = sanitizeInput(updateFields.description);

      // Handle inStock conversion
      if (updateFields.inStock !== undefined) {
        updateFields.inStock = (updateFields.inStock === true || updateFields.inStock === "true");
      }

      // Calculate final price
      if (req.body.price !== undefined) {
        const price = parseFloat(req.body.price) || 0;
        const discount = parseFloat(req.body.discount || 0) || 0;
        updateFields.finalPrice = price - (price * discount / 100);
      }

      if (req.file) {
        updateFields.image = `/uploads/${req.file.filename}`;
      }

      const updated = await model.findByIdAndUpdate(
        req.params.id,
        { $set: updateFields },
        { new: true }
      );

      if (!updated) return res.status(404).json({ message: `${route} not found` });
      
      console.log(`✅ ${route} updated:`, updated.name);
      res.json(updated);
    } catch (error) {
      console.error(`Error updating ${route}:`, error.message);
      res.status(500).json({ message: `Failed to update ${route}` });
    }
  });

  // DELETE
  app.delete(`/api/v1/${route}/:id`, async (req, res) => {
    try {
      const doc = await model.findById(req.params.id);
      if (!doc) return res.status(404).json({ message: `${route} not found` });

      if (doc.image) deleteFile(path.join(".", doc.image));
      await model.findByIdAndDelete(req.params.id);
      
      console.log(`✅ ${route} deleted:`, doc.name);
      res.json({ message: `${route} deleted successfully` });
    } catch (error) {
      console.error(`Error deleting ${route}:`, error.message);
      res.status(500).json({ message: `Failed to delete ${route}` });
    }
  });
}

// ================== PRODUCT ROUTES ==================
console.log("🛒 Setting up product routes...");
createCRUDRoutes(Grossory, "grossory_products");
createCRUDRoutes(Snacks, "snacks_products");
createCRUDRoutes(Soap, "soap_products");
createCRUDRoutes(Beauty, "beauty_products");

// ================== TEST ROUTE ==================
app.get("/api/v1/test", (req, res) => {
  res.json({ message: "✅ Server is working!", timestamp: new Date().toISOString() });
});

// ================== 404 HANDLER ==================
app.use((req, res) => {
  console.log('404 Not Found:', req.method, req.url);
  res.status(404).json({ 
    message: "Endpoint not found",
    code: "ENDPOINT_NOT_FOUND"
  });
});

// ================== ERROR HANDLER ==================
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message
  });
});

// ================== PASSWORD RESET ROUTES ==================

// Temporary storage for reset codes (in production, use Redis or database)
const resetCodes = new Map();

// Generate random 6-digit code
const generateResetCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// FORGOT PASSWORD - Send reset code
import crypto from "crypto";

const resetTokens = {}; // In-memory store for simplicity (use DB in production)

app.post("/api/v1/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: "Email not found" });

    const code = crypto.randomInt(100000, 999999).toString();
    resetTokens[email] = code;

    console.log(`🔑 Reset code for ${email}:`, code); // In real app, send via email

    res.json({ message: "Reset code sent to your email" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to send reset code", error: error.message });
  }
});


// RESET PASSWORD
app.post("/api/v1/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!resetTokens[email]) return res.status(400).json({ message: "Invalid or expired reset code" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findOneAndUpdate({ email: email.toLowerCase() }, { password: hashedPassword });

    delete resetTokens[email]; // Remove used token
    res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Password reset failed", error: error.message });
  }
});


// ================== START SERVER ==================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Test endpoint: http://localhost:${PORT}/api/v1/test`);
  console.log(`🔐 Auth endpoints:`);
  console.log(`   POST http://localhost:${PORT}/api/v1/register`);
  console.log(`   POST http://localhost:${PORT}/api/v1/login`);
  console.log(`   POST http://localhost:${PORT}/api/v1/admin/login`);
  console.log(`👥 User endpoints:`);
  console.log(`   GET http://localhost:${PORT}/api/v1/users (Admin only)`);
  console.log(`🛒 Product endpoints:`);
  console.log(`   GET http://localhost:${PORT}/api/v1/grossory_products`);
  console.log(`   GET http://localhost:${PORT}/api/v1/beauty_products`);
  console.log(`🛍️ Cart endpoints:`);
  console.log(`   GET http://localhost:${PORT}/api/v1/cart`);
  console.log(`   POST http://localhost:${PORT}/api/v1/cart/items`);
  console.log(`📦 Order endpoints:`);
  console.log(`   GET http://localhost:${PORT}/api/v1/orders`);
  console.log(`   POST http://localhost:${PORT}/api/v1/orders/draft`);
  console.log(`🖼️ Slider endpoints:`);
  console.log(`   GET http://localhost:${PORT}/api/v1/slider`);

});

