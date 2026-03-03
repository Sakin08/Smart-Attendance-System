// SUST Registration Number Parser
// Format: YYYY-DDD-NNN (e.g., 2019331008)
// YYYY = Year, DDD = Department Code, NNN = Roll Number

const DEPARTMENT_CODES = {
  // Engineering
  331: "CSE",
  338: "EEE",
  339: "Mechanical Engineering",
  333: "Civil Engineering",
  332: "Chemical Engineering",
  334: "IPE",
  336: "PME",
  337: "Food Engineering",
  345: "Architecture",
  831: "Software Engineering",

  // Physical Sciences
  132: "Physics",
  310: "Chemistry",
  134: "Statistics",
  136: "Oceanography",
  135: "Geography and Environmental Studies",

  // Life Sciences
  433: "Bio-Chemistry and Molecular Biology",
  431: "Genetic Engineering and Biotechnology",
  631: "Forestry and Environmental Science",

  // Business & Social Sciences
  731: "Business Administration",
  231: "Economics",
  234: "Anthropology",
  235: "Political Studies",
  237: "Public Administration",
  233: "Social Work",
  232: "Sociology",

  // Arts & Humanities
  236: "English",
  238: "Bangla",

  // Math
  333: "Mathematics", // Note: Same code as Civil, context needed
};

/**
 * Parse SUST registration number
 * @param {string} regNumber - Registration number (e.g., "2019331008")
 * @returns {object} - { year, batch, departmentCode, department, rollNumber, isValid }
 */
export const parseRegistrationNumber = (regNumber) => {
  // Remove any spaces, dashes, or special characters
  const cleaned = regNumber.toString().replace(/[^0-9]/g, "");

  // Check if it's 10 digits
  if (cleaned.length !== 10) {
    return {
      isValid: false,
      error: "Registration number must be 10 digits",
    };
  }

  // Extract parts
  const year = cleaned.substring(0, 4);
  const departmentCode = cleaned.substring(4, 7);
  const rollNumber = cleaned.substring(7, 10);

  // Validate year (should be between 2000 and current year + 1)
  const yearNum = parseInt(year);
  const currentYear = new Date().getFullYear();
  if (yearNum < 2000 || yearNum > currentYear + 1) {
    return {
      isValid: false,
      error: "Invalid admission year",
    };
  }

  // Get department name
  const department = DEPARTMENT_CODES[departmentCode];
  if (!department) {
    return {
      isValid: false,
      error: "Unknown department code",
    };
  }

  return {
    isValid: true,
    year: yearNum,
    batch: year, // Batch is same as admission year
    departmentCode,
    department,
    rollNumber: parseInt(rollNumber),
    fullRegNumber: cleaned,
  };
};

/**
 * Extract registration number from email
 * @param {string} email - Email address (e.g., "2019331008@student.sust.edu")
 * @returns {string|null} - Registration number or null
 */
export const extractRegNumberFromEmail = (email) => {
  if (!email) return null;

  // Extract the part before @
  const username = email.split("@")[0];

  // Check if it's a 10-digit number
  const regNumber = username.replace(/[^0-9]/g, "");
  if (regNumber.length === 10) {
    return regNumber;
  }

  return null;
};

/**
 * Parse SUST email and extract student info
 * @param {string} email - Email address
 * @returns {object} - Parsed student information
 */
export const parseStudentEmail = (email) => {
  const regNumber = extractRegNumberFromEmail(email);
  if (!regNumber) {
    return {
      isValid: false,
      error: "Could not extract registration number from email",
    };
  }

  return parseRegistrationNumber(regNumber);
};

/**
 * Validate if email is a valid SUST student email
 * @param {string} email - Email address
 * @returns {boolean}
 */
export const isValidSUSTEmail = (email) => {
  if (!email) return false;

  // Check domain
  const domain = email.split("@")[1];
  if (!domain || !domain.toLowerCase().includes("sust.edu")) {
    return false;
  }

  // Check if registration number can be extracted
  const regNumber = extractRegNumberFromEmail(email);
  if (!regNumber) return false;

  // Validate registration number
  const parsed = parseRegistrationNumber(regNumber);
  return parsed.isValid;
};

/**
 * Get department list
 * @returns {array} - Array of { code, name }
 */
export const getDepartmentList = () => {
  return Object.entries(DEPARTMENT_CODES).map(([code, name]) => ({
    code,
    name,
  }));
};

/**
 * Get department name by code
 * @param {string} code - Department code
 * @returns {string|null}
 */
export const getDepartmentName = (code) => {
  return DEPARTMENT_CODES[code] || null;
};

export default {
  parseRegistrationNumber,
  extractRegNumberFromEmail,
  parseStudentEmail,
  isValidSUSTEmail,
  getDepartmentList,
  getDepartmentName,
  DEPARTMENT_CODES,
};
