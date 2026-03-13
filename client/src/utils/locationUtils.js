// Location utilities for web-based GPS functionality

/**
 * Request location permission and get current position
 * @param {Object} options - Geolocation options
 * @returns {Promise<{lat: number, lng: number}>}
 */
export const getCurrentLocation = (options = {}) => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser"));
      return;
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 15000, // Increased timeout for better reliability
      maximumAge: 300000, // Cache for 5 minutes
      ...options,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        let message = "Location access failed";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message =
              "Location permission denied. Please enable location access in your browser settings.";
            break;
          case error.POSITION_UNAVAILABLE:
            message =
              "Location information is unavailable. This may happen in development mode or if GPS is disabled.";
            break;
          case error.TIMEOUT:
            message =
              "Location request timed out. Please try again or check your GPS settings.";
            break;
        }
        reject(new Error(message));
      },
      defaultOptions,
    );
  });
};

/**
 * Check if geolocation is supported
 * @returns {boolean}
 */
export const isGeolocationSupported = () => {
  return "geolocation" in navigator;
};

/**
 * Request location permission (for browsers that support it)
 * @returns {Promise<string>} - 'granted', 'denied', or 'prompt'
 */
export const requestLocationPermission = async () => {
  if (!navigator.permissions) {
    // Fallback for browsers without Permissions API
    try {
      await getCurrentLocation({ timeout: 1000 });
      return "granted";
    } catch {
      return "denied";
    }
  }

  try {
    const result = await navigator.permissions.query({ name: "geolocation" });
    return result.state; // 'granted', 'denied', or 'prompt'
  } catch {
    // Fallback
    return "prompt";
  }
};

/**
 * Haversine distance calculation (same as backend)
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} Distance in meters
 */
export const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Format coordinates for display
 * @param {number} lat
 * @param {number} lng
 * @returns {string}
 */
export const formatCoordinates = (lat, lng) => {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
};

/**
 * Open device location settings (where possible)
 */
export const openLocationSettings = () => {
  // This is limited in web browsers, but we can provide helpful instructions
  const userAgent = navigator.userAgent.toLowerCase();

  if (userAgent.includes("chrome")) {
    alert(
      'To enable location:\n1. Click the location icon in the address bar\n2. Select "Always allow" for this site\n3. Refresh the page',
    );
  } else if (userAgent.includes("firefox")) {
    alert(
      'To enable location:\n1. Click the shield icon in the address bar\n2. Turn off "Enhanced Tracking Protection" for this site\n3. Refresh the page',
    );
  } else if (userAgent.includes("safari")) {
    alert(
      'To enable location:\n1. Go to Safari > Preferences > Websites > Location\n2. Set this website to "Allow"\n3. Refresh the page',
    );
  } else {
    alert(
      "Please enable location access in your browser settings and refresh the page.",
    );
  }
};

/**
 * Get current location with development fallback
 * @param {Object} options - Geolocation options
 * @returns {Promise<{lat: number, lng: number}>}
 */
export const getCurrentLocationWithFallback = async (options = {}) => {
  try {
    return await getCurrentLocation(options);
  } catch (error) {
    // In development mode or when GPS fails, offer fallback
    if (
      process.env.NODE_ENV === "development" ||
      error.message.includes("unavailable")
    ) {
      console.warn(
        "GPS unavailable, using development fallback location (SUST CSE Department)",
      );
      return {
        lat: 24.918095, // SUST CSE Department
        lng: 91.8309352,
        accuracy: 100,
        isDevelopmentFallback: true,
      };
    }
    throw error;
  }
};

// Development coordinates (SUST CSE Department)
export const DEVELOPMENT_COORDINATES = {
  lat: 24.918095,
  lng: 91.8309352,
};
