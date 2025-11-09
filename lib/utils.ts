/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Validate Milton, ON postal code
 * Milton postal codes start with L9T, L9E, or L0P
 */
export function isValidMiltonPostalCode(postalCode: string): boolean {
  const normalized = postalCode.replace(/\s/g, '').toUpperCase();
  const miltonPrefixes = ['L9T', 'L9E', 'L0P'];
  return miltonPrefixes.some(prefix => normalized.startsWith(prefix));
}

/**
 * Simple geocoding stub - returns approximate center of Milton for MVP
 * In production, integrate with Google Maps or Mapbox geocoding API
 */
export async function geocodeAddress(address: {
  line1: string;
  city: string;
  postalCode: string;
}): Promise<{ lat: number; lon: number } | null> {
  // For MVP, return approximate Milton, ON coordinates
  // In production, use actual geocoding service
  if (address.city.toLowerCase() !== 'milton') {
    return null;
  }

  // Milton, ON approximate center coordinates
  // In production, this would call a geocoding API
  return {
    lat: 43.5183,
    lon: -79.8774,
  };
}

/**
 * Format cents to dollar string
 */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
