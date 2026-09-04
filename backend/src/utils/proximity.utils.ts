// Haversine Earth radius in meters
const EARTH_RADIUS_METERS = 6371000;

export interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface ProximityConfig {
  collegeLatitude: number;
  collegeLongitude: number;
  maxRadiusMeters: number;
  maxAccuracyMeters: number;
  maxAgeSeconds: number;
}

export interface ProximityResult {
  isValid: boolean;
  reason?: "MISSING_LOCATION" | "INVALID_LOCATION" | "STALE_LOCATION" | "LOW_ACCURACY" | "OUTSIDE_GEOFENCE" | "UNCONFIGURED_LOCATION";
  effectiveDistanceMeters?: number;
}

/**
 * Calculates Haversine distance in meters between two lat/lon points
 */
export const calculateHaversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
};

/**
 * Reads and validates proximity configuration from environment variables
 */
export const getProximityConfig = (): ProximityConfig | null => {
  const lat = parseFloat(process.env.COLLEGE_LATITUDE || "");
  const lon = parseFloat(process.env.COLLEGE_LONGITUDE || "");
  const radius = parseFloat(process.env.COLLEGE_MAX_RADIUS_METERS || "100");
  const maxAccuracy = parseFloat(process.env.GEOLOCATION_MAX_ACCURACY_METERS || "50");
  const maxAge = parseFloat(process.env.GEOLOCATION_MAX_AGE_SECONDS || "30");

  if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return null; // Signals unconfigured/missing college location
  }

  return {
    collegeLatitude: lat,
    collegeLongitude: lon,
    maxRadiusMeters: isNaN(radius) || radius <= 0 ? 100 : radius,
    maxAccuracyMeters: isNaN(maxAccuracy) || maxAccuracy <= 0 ? 50 : maxAccuracy,
    maxAgeSeconds: isNaN(maxAge) || maxAge <= 0 ? 30 : maxAge,
  };
};

/**
 * Server-side physical presence / geofence verification
 */
export const verifyProximity = (
  location: GeolocationData | null | undefined,
  config: ProximityConfig | null,
  serverTimeMs: number = Date.now()
): ProximityResult => {
  if (!config) {
    return { isValid: false, reason: "UNCONFIGURED_LOCATION" };
  }

  if (!location) {
    return { isValid: false, reason: "MISSING_LOCATION" };
  }

  const { latitude, longitude, accuracy, timestamp } = location;

  // 1. Numeric Range & Validity Check
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    typeof accuracy !== "number" ||
    typeof timestamp !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(accuracy) ||
    !Number.isFinite(timestamp) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180 ||
    accuracy <= 0 ||
    timestamp <= 0
  ) {
    return { isValid: false, reason: "INVALID_LOCATION" };
  }

  // 2. Freshness Check (Age <= maxAgeSeconds & Future Clock Skew <= 5000ms)
  const ageSeconds = Math.abs(serverTimeMs - timestamp) / 1000;
  if (ageSeconds > config.maxAgeSeconds || timestamp > serverTimeMs + 5000) {
    return { isValid: false, reason: "STALE_LOCATION" };
  }

  // 3. Accuracy Threshold Check
  if (accuracy > config.maxAccuracyMeters) {
    return { isValid: false, reason: "LOW_ACCURACY" };
  }

  // 4. Server-Side Haversine Distance Calculation
  const rawDistance = calculateHaversineDistance(
    config.collegeLatitude,
    config.collegeLongitude,
    latitude,
    longitude
  );

  // 5. Uncertainty-Aware Geofence Decision Rule
  const effectiveDistance = Math.max(0, rawDistance - accuracy);

  if (effectiveDistance > config.maxRadiusMeters) {
    return {
      isValid: false,
      reason: "OUTSIDE_GEOFENCE",
      effectiveDistanceMeters: Math.round(effectiveDistance),
    };
  }

  return {
    isValid: true,
    effectiveDistanceMeters: Math.round(effectiveDistance),
  };
};
