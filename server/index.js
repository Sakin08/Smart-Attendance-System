require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const connectDB = require("./config/db");
const User = require("./models/User");

const authRoutes = require("./routes/authRoutes");
const studentRoutes = require("./routes/studentRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

// Default admin credentials
const ADMIN_EMAIL = "admin@smartattendance.edu";
const ADMIN_PASSWORD = "admin123";
const ADMIN_NAME = "System Administrator";

// Create default admin if not exists
async function ensureAdminExists() {
  try {
    const existingAdmin = await User.findOne({
      email: ADMIN_EMAIL,
      role: "admin",
    });

    if (!existingAdmin) {
      // Don't hash password here - let the User model do it
      await User.create({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD, // Plain password - model will hash it
        role: "admin",
      });
      console.log("✅ Default admin account created");
      console.log(`   Email: ${ADMIN_EMAIL}`);
      console.log(`   Password: ${ADMIN_PASSWORD}`);
    }
  } catch (error) {
    console.error("Error creating admin:", error);
  }
}

// Middleware
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:5174",
  "https://smart-attendance-system-u5hv.vercel.app",
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Content-Disposition"],
  }),
);
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", studentRoutes);
app.use("/api", teacherRoutes);
app.use("/api/admin", adminRoutes);

// Root route - API information
app.get("/", (req, res) => {
  res.json({
    name: "Smart Attendance System API",
    version: "1.0.0",
    status: "running",
    endpoints: {
      health: "/api/health",
      auth: "/api/auth/*",
      student: "/api/student/*",
      teacher: "/api/courses, /api/attendance-sessions/*",
      admin: "/api/admin/*",
    },
    documentation: "See README.md for full API documentation",
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Cannot ${req.method} ${req.path}`,
    availableEndpoints: {
      root: "/",
      health: "/api/health",
      auth: "/api/auth/*",
      student: "/api/student/*, /api/attendance-sessions/*",
      teacher: "/api/courses/*, /api/attendance-sessions/*",
      admin: "/api/admin/*",
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal server error" });
});

// Start server
const PORT = process.env.PORT || 5001;

connectDB().then(async () => {
  await ensureAdminExists();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
