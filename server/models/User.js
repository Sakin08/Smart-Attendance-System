const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["student", "teacher", "admin"],
      default: "student",
    },
    // Student-specific fields (extracted from registration number)
    registrationNumber: {
      type: String,
      default: "",
    },
    year: {
      type: Number,
      default: null,
    },
    batch: {
      type: String,
      default: "",
    },
    departmentCode: {
      type: String,
      default: "",
    },
    department: {
      type: String,
      default: "",
    },
    rollNumber: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Hash password before save
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
