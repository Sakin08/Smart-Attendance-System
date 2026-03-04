// Bangladesh Standard Time utilities (UTC+6)

const BD_TIMEZONE = "Asia/Dhaka";

/**
 * Format date to Bangladesh time string
 */
export const toBDTime = (date) => {
  return new Date(date).toLocaleString("en-US", {
    timeZone: BD_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

/**
 * Format date to Bangladesh date only
 */
export const toBDDate = (date) => {
  return new Date(date).toLocaleDateString("en-US", {
    timeZone: BD_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/**
 * Format time only in Bangladesh timezone
 */
export const toBDTimeOnly = (date) => {
  return new Date(date).toLocaleTimeString("en-US", {
    timeZone: BD_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

/**
 * Get current time in Bangladesh timezone for datetime-local input
 */
export const getBDDateTimeLocal = (date = new Date()) => {
  // Convert to BD timezone
  const bdTime = new Date(
    date.toLocaleString("en-US", { timeZone: BD_TIMEZONE }),
  );

  // Format for datetime-local input (YYYY-MM-DDTHH:mm)
  const year = bdTime.getFullYear();
  const month = String(bdTime.getMonth() + 1).padStart(2, "0");
  const day = String(bdTime.getDate()).padStart(2, "0");
  const hours = String(bdTime.getHours()).padStart(2, "0");
  const minutes = String(bdTime.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Convert datetime-local input to ISO string (treating input as BD time)
 */
export const bdDateTimeLocalToISO = (dateTimeLocal) => {
  // Parse the datetime-local value as BD time
  const [datePart, timePart] = dateTimeLocal.split("T");
  const [year, month, day] = datePart.split("-");
  const [hours, minutes] = timePart.split(":");

  // Create date string in BD timezone format
  const bdDateString = `${year}-${month}-${day}T${hours}:${minutes}:00`;

  // Create a date object and adjust for BD timezone offset
  const date = new Date(bdDateString);
  const bdOffset = 6 * 60; // BD is UTC+6
  const localOffset = date.getTimezoneOffset();
  const totalOffset = bdOffset + localOffset;

  // Adjust the date
  date.setMinutes(date.getMinutes() - totalOffset);

  return date.toISOString();
};
