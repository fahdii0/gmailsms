// Seed script: Creates an admin user in the database
// Usage: MONGODB_URI=... node scripts/seed-admin.mjs

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("Please set MONGODB_URI environment variable");
  process.exit(1);
}

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ["admin", "client"], default: "client" },
    balance: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema);

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  const adminEmail = "admin@gmailsms.com";
  const adminPassword = "admin123456";

  const existingAdmin = await User.findOne({ email: adminEmail });
  if (existingAdmin) {
    console.log("Admin user already exists:", adminEmail);
    await mongoose.disconnect();
    return;
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  await User.create({
    email: adminEmail,
    password: hashedPassword,
    name: "Admin",
    role: "admin",
    balance: 0,
  });

  console.log("Admin user created successfully!");
  console.log(`  Email: ${adminEmail}`);
  console.log(`  Password: ${adminPassword}`);
  console.log("  ⚠️  Please change the password after first login!");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
