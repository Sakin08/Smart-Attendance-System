const express = require("express");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const { verifyToken } = require("../middleware/auth");
const {
  parseStudentEmail,
  isValidSUSTEmail,
} = require("../utils/registrationParser");

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function generateToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User with this email already exists" });
    }

    const userRole = role || "student";
    let studentData = {};

    if (userRole === "student") {
      // Validate SUST email format
      if (!isValidSUSTEmail(email)) {
        return res.status(400).json({
          message:
            "Students must use a valid SUST university email (e.g., 2019331008@student.sust.edu)",
        });
      }

      // Parse student information from email
      const parsed = parseStudentEmail(email);
      if (!parsed.isValid) {
        return res.status(400).json({
          message: parsed.error || "Invalid student email format",
        });
      }

      studentData = {
        registrationNumber: parsed.fullRegNumber,
        year: parsed.year,
        batch: parsed.batch,
        departmentCode: parsed.departmentCode,
        department: parsed.department,
        rollNumber: parsed.rollNumber,
      };
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      phone: phone || "",
      role: userRole,
      ...studentData,
    });

    const token = generateToken(user);

    res.status(201).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        registrationNumber: user.registrationNumber,
        year: user.year,
        batch: user.batch,
        departmentCode: user.departmentCode,
        department: user.department,
        rollNumber: user.rollNumber,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        registrationNumber: user.registrationNumber,
        year: user.year,
        batch: user.batch,
        departmentCode: user.departmentCode,
        department: user.department,
        rollNumber: user.rollNumber,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
});

// GET /api/auth/me
router.get("/me", verifyToken, async (req, res) => {
  res.json({
    user: {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      role: req.user.role,
      registrationNumber: req.user.registrationNumber,
      year: req.user.year,
      batch: req.user.batch,
      departmentCode: req.user.departmentCode,
      department: req.user.department,
      rollNumber: req.user.rollNumber,
    },
  });
});

// POST /api/auth/google - Google Sign-In for students only
router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: "Google credential is required" });
    }

    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email.toLowerCase();
    const name = payload.name;
    const googleId = payload.sub;

    // Validate that email is @student.sust.edu
    if (!email.endsWith("@student.sust.edu")) {
      return res.status(403).json({
        message: "Only @student.sust.edu emails are allowed for Google Sign-In",
      });
    }

    // Validate SUST email format
    if (!isValidSUSTEmail(email)) {
      return res.status(400).json({
        message: "Invalid SUST student email format",
      });
    }

    // Parse student information from email
    const parsed = parseStudentEmail(email);
    if (!parsed.isValid) {
      return res.status(400).json({
        message: parsed.error || "Invalid student email format",
      });
    }

    // Check if user exists
    let user = await User.findOne({ email });

    if (user) {
      // User exists - just login
      const token = generateToken(user);
      return res.json({
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          registrationNumber: user.registrationNumber,
          year: user.year,
          batch: user.batch,
          departmentCode: user.departmentCode,
          department: user.department,
          rollNumber: user.rollNumber,
        },
      });
    }

    // User doesn't exist - create new student account
    user = await User.create({
      name,
      email,
      password: googleId, // Use Google ID as password (they won't use it)
      role: "student",
      registrationNumber: parsed.fullRegNumber,
      year: parsed.year,
      batch: parsed.batch,
      departmentCode: parsed.departmentCode,
      department: parsed.department,
      rollNumber: parsed.rollNumber,
    });

    const token = generateToken(user);

    res.status(201).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        registrationNumber: user.registrationNumber,
        year: user.year,
        batch: user.batch,
        departmentCode: user.departmentCode,
        department: user.department,
        rollNumber: user.rollNumber,
      },
    });
  } catch (error) {
    console.error("Google Sign-In error:", error);
    res.status(500).json({ message: "Google Sign-In failed" });
  }
});

module.exports = router;

// GET /api/auth/departments - Get list of all departments
router.get("/departments", (req, res) => {
  const { getDepartmentList } = require("../utils/registrationParser");
  res.json({ departments: getDepartmentList() });
});
