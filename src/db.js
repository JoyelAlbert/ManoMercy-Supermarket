import mongoose from "mongoose";

import dotenv from "dotenv";

dotenv.config(); // Load .env variables

const mongoURI = process.env.MONGODB_URI

// MongoDB connection
// const mongoURI = process.env.MONGODB_URI || 
//   "mongodb+srv://2k22cse170:albert1812@cluster0.bgaad74.mongodb.net/e-commerce?retryWrites=true&w=majority";

if (!mongoURI) {
  console.error("❌ MongoDB URI is not defined! Check your .env file.");
  process.exit(1);
}

// MongoDB connection
export const connectDB = async () => {
  try {
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
  }
};
// ================== Schemas ==================

// General Product Schema
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  discount: { type: Number, default: 0 },          // ✅ Discount %
  finalPrice: { type: Number, required: true },    // ✅ Price after discount
  image: String,
  showOnHome: { type: Boolean, default: false },
   inStock: { type: Boolean, default: true },
});

// Slider Schema
const sliderSchema = new mongoose.Schema({
  title: String,
  image: String,
});

// Order Schema
const OrderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    sparse: true // This allows multiple null values but ensures uniqueness for actual values
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  items: [
    {
      name: String,
      qty: Number,
      price: Number,
      productId: mongoose.Schema.Types.ObjectId, // Add this for consistency
      image: String, // Add this for better UX
      discount: { type: Number, default: 0 }, // Add this
      finalPrice: Number // Add this
    },
  ],
  total: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["Draft", "Pending", "Accepted", "Rejected", "Waiting", "Confirmed"],
    default: "Draft",
  },
  paymentMode: String,
  deliveryMode: String,
  collectBy: String,
  date: {
    type: String,
    default: () => new Date().toLocaleDateString(),
  },
  time: {
    type: String,
    default: () => new Date().toLocaleTimeString(),
  },
  confirmedAt: Date // Add this for tracking confirmation time
}, {
  timestamps: true
});
// Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  phone: String,
  address: String,
  isAdmin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// Cart Schema
const cartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, required: true },
      name: String,
      price: Number,
      discount: { type: Number, default: 0 },
      finalPrice: Number,
      quantity: { type: Number, default: 1 },
      total: Number,
      image: String,
    },
  ],
}, { timestamps: true });

// ================== Models ==================

// Product Models
export const Grossory = mongoose.model("Grossory", productSchema);
export const Snacks = mongoose.model("Snacks", productSchema);
export const Soap = mongoose.model("Soap", productSchema);
export const Beauty = mongoose.model("Beauty", productSchema);

// Home page collections
export const GrossoryHome = mongoose.model("GrossoryHome", productSchema);
export const SnacksHome = mongoose.model("SnacksHome", productSchema);
export const SoapHome = mongoose.model("SoapHome", productSchema);
export const BeautyHome = mongoose.model("BeautyHome", productSchema);

// Slider
export const SliderImage = mongoose.model("SliderImage", sliderSchema);

// Orders
export const Order = mongoose.model("Order", OrderSchema);

// Users
export const User = mongoose.model("User", userSchema);

// Cart
export const Cart = mongoose.model("Cart", cartSchema);
