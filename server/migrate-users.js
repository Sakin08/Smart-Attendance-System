require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const { parseStudentEmail } = require("./utils/registrationParser");
const connectDB = require("./config/db");

async function migrateUsers() {
  await connectDB();

  console.log("Starting user migration...\n");

  // Find all student users
  const students = await User.find({ role: "student" });

  console.log(`Found ${students.length} student users to migrate`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const student of students) {
    try {
      // Skip if already has new fields
      if (student.registrationNumber && student.department) {
        console.log(`✓ Skipping ${student.email} - already migrated`);
        skipped++;
        continue;
      }

      // Parse email to get new fields
      const parsed = parseStudentEmail(student.email);

      if (!parsed.isValid) {
        console.log(`✗ Failed to parse ${student.email}: ${parsed.error}`);
        failed++;
        continue;
      }

      // Update user with new fields
      student.registrationNumber = parsed.fullRegNumber;
      student.year = parsed.year;
      student.batch = parsed.batch;
      student.departmentCode = parsed.departmentCode;
      student.department = parsed.department;
      student.rollNumber = parsed.rollNumber;

      await student.save();

      console.log(
        `✓ Updated ${student.email} - ${parsed.department} (${parsed.batch})`,
      );
      updated++;
    } catch (error) {
      console.log(`✗ Error updating ${student.email}:`, error.message);
      failed++;
    }
  }

  console.log("\n=== Migration Complete ===");
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);

  process.exit(0);
}

migrateUsers().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
