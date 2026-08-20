import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "./db.js"; // ✅ ensure correct path

// ✅ Connect to MongoDB Atlas
const mongoURI = process.env.MONGODB_URI;
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
    console.log("Mongo URI:", process.env.MONGODB_URI);
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
    console.log("Mongo URI:", process.env.MONGODB_URI);
    process.exit(1);
  }
};
const createAdmin = async () => {
  try {
    const email = "Albert18@gmail.com";
    const password = "albert1516";

    // Check for existing admin
    const existingAdmin = await User.findOne({ email: email.toLowerCase() });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(password, 10);

      await User.create({
        name: "Admin",
        email: email.toLowerCase(),
        password: hashedPassword,
        role: "admin", // ✅ make sure this field exists in your User schema
      });

      console.log("✅ Admin user created successfully!");
    } else {
      console.log("ℹ️ Admin already exists — updating role...");
      await User.updateOne(
        { email: email.toLowerCase() },
        { $set: { role: "admin" } }
      );
      console.log("✅ Admin role updated!");
    }
  } catch (error) {
    console.error("❌ Error creating admin:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 MongoDB connection closed.");
  }
};

createAdmin();
