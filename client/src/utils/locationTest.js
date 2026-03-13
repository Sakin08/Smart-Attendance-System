// Simple test utility for location features
import {
  getCurrentLocation,
  haversineDistance,
  formatCoordinates,
} from "./locationUtils";

export const testLocationFeatures = async () => {
  console.log("🧪 Testing Location Features...");

  try {
    // Test 1: Get current location
    console.log("📍 Testing location access...");
    const location = await getCurrentLocation();
    console.log(
      "✅ Location obtained:",
      formatCoordinates(location.lat, location.lng),
    );

    // Test 2: Distance calculation
    console.log("📏 Testing distance calculation...");
    const testLat = location.lat + 0.001; // ~111m away
    const testLng = location.lng + 0.001;
    const distance = haversineDistance(
      location.lat,
      location.lng,
      testLat,
      testLng,
    );
    console.log(`✅ Distance calculation: ${Math.round(distance)}m`);

    // Test 3: Radius validation
    console.log("🎯 Testing radius validation...");
    const withinRadius = distance <= 100;
    console.log(`✅ Within 100m radius: ${withinRadius}`);

    return {
      success: true,
      location,
      distance: Math.round(distance),
      withinRadius,
    };
  } catch (error) {
    console.error("❌ Location test failed:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Test coordinates for development (SUST CSE Department)
export const TEST_COORDINATES = {
  lat: 24.918095,
  lng: 91.8309352,
};
