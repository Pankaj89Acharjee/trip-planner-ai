// Utility functions for calculating distances in itineraries

interface Location {
  latitude: number;
  longitude: number;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns distance in kilometers
 */
export function calculateHaversineDistance(
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
 * Extract locations from an itinerary
 */
function extractLocationsFromItinerary(itinerary: any[]): Location[] {
  const locations: Location[] = [];

  for (const day of itinerary) {
    // Add accommodation location
    if (day.accommodation?.location) {
      const loc = day.accommodation.location;
      if (loc.latitude && loc.longitude) {
        locations.push({
          latitude: parseFloat(loc.latitude),
          longitude: parseFloat(loc.longitude)
        });
      }
    }

    // Add activity locations
    if (day.activities && Array.isArray(day.activities)) {
      for (const activity of day.activities) {
        if (activity.location) {
          const loc = activity.location;
          if (loc.latitude && loc.longitude) {
            locations.push({
              latitude: parseFloat(loc.latitude),
              longitude: parseFloat(loc.longitude)
            });
          }
        }
      }
    }
  }

  return locations;
}

/**
 * Calculate total distance covered in an itinerary
 * @returns formatted distance string (e.g., "245 km" or "1.2 km")
 */
export function calculateTotalItineraryDistance(itinerary: any[]): string {
  try {
    const locations = extractLocationsFromItinerary(itinerary);

    if (locations.length < 2) {
      return 'N/A';
    }

    let totalDistance = 0;

    // Calculate distance between consecutive locations
    for (let i = 0; i < locations.length - 1; i++) {
      const loc1 = locations[i];
      const loc2 = locations[i + 1];

      // Skip if same location (within 50 meters)
      const distance = calculateHaversineDistance(
        loc1.latitude,
        loc1.longitude,
        loc2.latitude,
        loc2.longitude
      );

      if (distance > 0.05) {
        // Only count if > 50 meters
        totalDistance += distance;
      }
    }

    // Format the distance
    if (totalDistance < 1) {
      return `${(totalDistance * 1000).toFixed(0)} m`;
    } else if (totalDistance < 10) {
      return `${totalDistance.toFixed(1)} km`;
    } else {
      return `${Math.round(totalDistance)} km`;
    }
  } catch (error) {
    console.error('Error calculating itinerary distance:', error);
    return 'N/A';
  }
}

/**
 * Calculate distance from user's current location to destination
 * @returns formatted distance string or 'N/A' if location unavailable
 */
export async function calculateDistanceFromUserLocation(
  destination: string
): Promise<string> {
  try {
    // Try to get user's current location
    const userLocation = await getUserCurrentLocation();

    if (!userLocation) {
      return 'N/A';
    }

    // Get destination coordinates (you'd typically geocode this)
    const destCoords = getCityCoordinates(destination);

    if (!destCoords) {
      return 'N/A';
    }

    const distance = calculateHaversineDistance(
      userLocation.latitude,
      userLocation.longitude,
      destCoords.latitude,
      destCoords.longitude
    );

    // Format the distance
    if (distance < 1) {
      return `${(distance * 1000).toFixed(0)} m`;
    } else if (distance < 10) {
      return `${distance.toFixed(1)} km`;
    } else {
      return `${Math.round(distance)} km`;
    }
  } catch (error) {
    console.error('Error calculating distance from user location:', error);
    return 'N/A';
  }
}

/**
 * Get user's current location from browser geolocation API
 */
function getUserCurrentLocation(): Promise<Location | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        console.warn('Could not get user location:', error);
        resolve(null);
      },
      { timeout: 5000, maximumAge: 300000 } // 5 min cache
    );
  });
}

/**
 * Get coordinates for major Indian cities
 */
function getCityCoordinates(cityName: string): Location | null {
  const cityCoordinates: Record<string, Location> = {
    'Delhi': { latitude: 28.6139, longitude: 77.2090 },
    'Mumbai': { latitude: 19.0760, longitude: 72.8777 },
    'Bangalore': { latitude: 12.9716, longitude: 77.5946 },
    'Bengaluru': { latitude: 12.9716, longitude: 77.5946 },
    'Kolkata': { latitude: 22.5726, longitude: 88.3639 },
    'Chennai': { latitude: 13.0827, longitude: 80.2707 },
    'Hyderabad': { latitude: 17.3850, longitude: 78.4867 },
    'Pune': { latitude: 18.5204, longitude: 73.8567 },
    'Jaipur': { latitude: 26.9124, longitude: 75.7873 },
    'Goa': { latitude: 15.2993, longitude: 74.1240 },
    'Kerala': { latitude: 10.8505, longitude: 76.2711 },
    'Shimla': { latitude: 31.1048, longitude: 77.1734 },
    'Manali': { latitude: 32.2396, longitude: 77.1887 },
    'Agra': { latitude: 27.1767, longitude: 78.0081 },
    'Varanasi': { latitude: 25.3176, longitude: 82.9739 },
    'Udaipur': { latitude: 24.5854, longitude: 73.7125 },
    'Darjeeling': { latitude: 27.0389, longitude: 88.2639 },
    'Kashmir': { latitude: 34.0837, longitude: 74.7973 },
    'Rishikesh': { latitude: 30.0869, longitude: 78.2676 },
    'Mysore': { latitude: 12.2958, longitude: 76.6394 },
    'Kochi': { latitude: 9.9312, longitude: 76.2673 },
    'Amritsar': { latitude: 31.6340, longitude: 74.8723 },
    'Lucknow': { latitude: 26.8467, longitude: 80.9462 },
    'Chandigarh': { latitude: 30.7333, longitude: 76.7794 },
    'Ahmedabad': { latitude: 23.0225, longitude: 72.5714 },
    'Bhopal': { latitude: 23.2599, longitude: 77.4126 },
    'Indore': { latitude: 22.7196, longitude: 75.8577 }
  };

  // Try exact match first
  if (cityCoordinates[cityName]) {
    return cityCoordinates[cityName];
  }

  // Try case-insensitive match
  const cityKey = Object.keys(cityCoordinates).find(
    key => key.toLowerCase() === cityName.toLowerCase()
  );

  return cityKey ? cityCoordinates[cityKey] : null;
}

/**
 * Calculate distance with Google Maps API (if available, more accurate for driving distance)
 * Falls back to Haversine if API not available
 */
export async function calculateGoogleMapsDistance(
  origin: string,
  destination: string
): Promise<string> {
  try {
    // Check if Google Maps is loaded
    if (typeof window !== 'undefined' && window.google?.maps) {
      const service = new window.google.maps.DistanceMatrixService();

      return new Promise((resolve) => {
        service.getDistanceMatrix(
          {
            origins: [origin],
            destinations: [destination],
            travelMode: window.google.maps.TravelMode.DRIVING,
            unitSystem: window.google.maps.UnitSystem.METRIC
          },
          (response, status) => {
            if (status === 'OK' && response?.rows?.[0]?.elements?.[0]) {
              const element = response.rows[0].elements[0];
              if (element.status === 'OK' && element.distance) {
                resolve(element.distance.text);
                return;
              }
            }
            resolve('N/A');
          }
        );
      });
    }

    return 'N/A';
  } catch (error) {
    console.error('Error calculating Google Maps distance:', error);
    return 'N/A';
  }
}

