// Real-time monitoring service for weather, traffic, and travel disruptions
export interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  precipitation: number; // Current precipitation amount in mm
  precipitationProbability: number; // Probability of precipitation (0-100%)
  windSpeed: number;
  visibility: number;
  timestamp: string;
  alerts: WeatherAlert[];
}

export interface WeatherAlert {
  type: 'rain' | 'storm' | 'snow' | 'fog' | 'extreme_heat' | 'extreme_cold';
  severity: 'low' | 'moderate' | 'high' | 'extreme';
  message: string;
  impact: 'minimal' | 'moderate' | 'significant' | 'severe';
}

export interface TrafficData {
  route: string;
  delay: number; // in minutes
  condition: 'clear' | 'slow' | 'congested' | 'blocked';
  incidents: TrafficIncident[];
  timestamp: string;
}

export interface TrafficIncident {
  type: 'accident' | 'construction' | 'road_closed' | 'landslide' | 'flooding';
  severity: 'minor' | 'moderate' | 'major' | 'severe';
  description: string;
  estimated_duration: number; // in minutes
  alternate_routes: string[];
}

export interface TravelDisruption {
  id: string;
  type: 'weather' | 'traffic' | 'transportation' | 'venue_closed';
  severity: 'low' | 'moderate' | 'high' | 'critical';
  title: string;
  description: string;
  affected_locations: string[];
  estimated_duration: number;
  suggested_alternatives: string[];
  timestamp: string;
}

export interface ItineraryImpact {
  day: number;
  affected_activities: string[];
  impact_level: 'none' | 'minor' | 'moderate' | 'major';
  suggestions: string[];
  alternative_activities: string[];
}

export interface MonitoringStatus {
  isActive: boolean;
  lastCheckTime: string | null;
  nextCheckTime: string | null;
  checkedLocations: string[]; // Coordinates or location strings
  locationNames: Map<string, string> | Record<string, string>; // Map of coordinate -> location name
  checkInterval: number; // in minutes
  totalChecks: number;
  weatherChecks: number;
  trafficChecks: number;
  trafficData: TrafficData[]; // Current traffic conditions
}

class RealTimeMonitoringService {
  private apiKey: string;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private subscribers: Array<(disruptions: TravelDisruption[]) => void> = [];
  private statusSubscribers: Array<(status: MonitoringStatus) => void> = [];
  private locationNameCache: Map<string, string> = new Map(); // Cache coordinate -> location name
  private monitoringStatus: MonitoringStatus = {
    isActive: false,
    lastCheckTime: null,
    nextCheckTime: null,
    checkedLocations: [],
    locationNames: {},
    checkInterval: 60, // 1 hour
    totalChecks: 0,
    weatherChecks: 0,
    trafficChecks: 0,
    trafficData: []
  };

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  }

  // Subscribe to status updates
  subscribeToStatus(callback: (status: MonitoringStatus) => void) {
    this.statusSubscribers.push(callback);
    // Immediately send current status
    if (this.monitoringStatus.isActive) {
      callback({ ...this.monitoringStatus });
    } else {
      // Send initial inactive status so component knows we're ready
      callback({ ...this.monitoringStatus });
    }
    return () => {
      this.statusSubscribers = this.statusSubscribers.filter(cb => cb !== callback);
    };
  }

  // Get current monitoring status
  getStatus(): MonitoringStatus {
    return { ...this.monitoringStatus };
  }

  private notifyStatusSubscribers() {
    this.statusSubscribers.forEach(callback => callback({ ...this.monitoringStatus }));
  }

  // Subscribing to real-time updates
  subscribe(callback: (disruptions: TravelDisruption[]) => void) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  // Monitoring for specific itinerary
  async startMonitoring(itinerary: any, travelDates: { startDate: string; endDate: string }) {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    const locations = this.extractLocations(itinerary);
    //console.log(`[Monitoring] Starting monitoring for ${locations.length} locations`);
    
    // Initialize location names immediately (use coordinates as fallback, will update in background)
    const locationNames: Record<string, string> = {};
    locations.forEach(location => {
      // Use cached name if available, otherwise use coordinate temporarily
      if (this.locationNameCache.has(location)) {
        locationNames[location] = this.locationNameCache.get(location)!;
      } else {
        locationNames[location] = location; // Temporary - will update when geocoded
      }
    });
    
    // Set status to active IMMEDIATELY (don't wait for reverse geocoding)
    this.monitoringStatus = {
      isActive: true,
      lastCheckTime: null,
      nextCheckTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
      checkedLocations: locations,
      locationNames: locationNames,
      checkInterval: 60, // 1 hour
      totalChecks: 0,
      weatherChecks: 0,
      trafficChecks: 0,
      trafficData: []
    };
    this.notifyStatusSubscribers();
    //console.log(`[Monitoring] Status set to active, notifying subscribers`);

    // Start reverse geocoding in background (don't block - use Promise.allSettled to not fail on errors)
    this.reverseGeocodeLocationsBackground(locations, locationNames).catch(error => {
      console.error('[Monitoring] Error in background reverse geocoding:', error);
    });

    // Start first check immediately (don't wait for geocoding)
    try {
      await this.checkForDisruptions(itinerary, travelDates);
    } catch (error) {
      console.error('[Monitoring] Error in initial check:', error);
    }
    
    // Set up interval for periodic checks
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkForDisruptions(itinerary, travelDates);
      } catch (error) {
        console.error('[Monitoring] Error in periodic check:', error);
      }
    }, 60 * 60 * 1000); // Check every 1 hour
  }

  // Reverse geocode locations in background and update status (non-blocking)
  private async reverseGeocodeLocationsBackground(locations: string[], locationNames: Record<string, string>) {
    const seenNames = new Set<string>(); // Track resolved names to detect duplicates
    
    const reverseGeocodePromises = locations.map(async (location) => {
      // Check if it's coordinates
      if (/^\s*-?\d+(?:\.\d+)?\s*,\s*(-?\d+(?:\.\d+)?)\s*$/.test(location)) {
        // Skip if already cached
        if (this.locationNameCache.has(location)) {
          const cachedName = this.locationNameCache.get(location)!;
          locationNames[location] = cachedName;
          seenNames.add(cachedName.toLowerCase());
          return;
        }
        
        // Reverse geocode
        try {
          const name = await this.reverseGeocode(location);
          this.locationNameCache.set(location, name);
          locationNames[location] = name;
          seenNames.add(name.toLowerCase());
          
          // Update status with new location name
          this.monitoringStatus.locationNames = { ...this.monitoringStatus.locationNames, ...locationNames };
          this.notifyStatusSubscribers();
        } catch (error) {
          console.error(`Failed to reverse geocode ${location}:`, error);
          // Keep the coordinate as fallback
        }
      } else {
        // Already a location name - check if we've seen this name from coordinates
        const nameLower = location.toLowerCase();
        if (seenNames.has(nameLower)) {
          console.log(`[Monitoring] Skipping duplicate location name: ${location} (already resolved from coordinates)`);
          return;
        }
        locationNames[location] = location;
        seenNames.add(nameLower);
      }
    });
    
    // Wait for all reverse geocoding (but don't block main flow - use allSettled so one failure doesn't stop others)
    await Promise.allSettled(reverseGeocodePromises);
  }

  // Stop monitoring
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.monitoringStatus.isActive = false;
    this.notifyStatusSubscribers();
  }

  // Main method to check for disruptions
  private async checkForDisruptions(itinerary: any, travelDates: { startDate: string; endDate: string }) {
    const disruptions: TravelDisruption[] = [];

    try {
      const locations = this.extractLocations(itinerary);
      const checkStartTime = new Date();

      console.log(`[Monitoring] Starting check at ${checkStartTime.toISOString()} for ${locations.length} locations`);

      // Check weather for each location
      for (const location of locations) {
        try {
          const weatherDisruptions = await this.checkWeatherConditions(location, travelDates);
          disruptions.push(...weatherDisruptions);
          this.monitoringStatus.weatherChecks++;
        } catch (error) {
          console.error(`[Monitoring] Error checking weather for ${location}:`, error);
        }
      }

      // Check traffic conditions
      try {
        // Get current traffic data for display (do this first so we have data even if disruptions check fails)
        const currentTrafficData = await this.fetchTrafficData(itinerary);
        console.log(`[Monitoring] Traffic data fetched:`, currentTrafficData.length, 'routes');
        if (currentTrafficData.length > 0) {
          console.log(`[Monitoring] Sample traffic data:`, currentTrafficData[0]);
        }
        this.monitoringStatus.trafficData = currentTrafficData;
        
        // Pass trafficData to avoid re-fetching
        const trafficDisruptions = await this.checkTrafficConditions(itinerary, travelDates, currentTrafficData);
        disruptions.push(...trafficDisruptions);
        this.monitoringStatus.trafficChecks++;
      } catch (error) {
        console.error(`[Monitoring] Error checking traffic:`, error);
        this.monitoringStatus.trafficData = []; // Clear on error
      }

      // Update location names if any new locations are found
      const currentLocationNames = this.monitoringStatus.locationNames;
      const locationNames: Record<string, string> = currentLocationNames instanceof Map 
        ? Object.fromEntries(currentLocationNames)
        : { ...currentLocationNames };
      for (const location of locations) {
        if (!locationNames[location]) {
          // Check if it's coordinates
          if (/^\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*$/.test(location)) {
            // Check cache first
            if (this.locationNameCache.has(location)) {
              locationNames[location] = this.locationNameCache.get(location)!;
            } else {
              // Reverse geocode in background (don't wait)
              this.reverseGeocode(location).then((name) => {
                this.locationNameCache.set(location, name);
                locationNames[location] = name;
                this.monitoringStatus.locationNames = locationNames;
                this.notifyStatusSubscribers();
              }).catch(() => {
                locationNames[location] = location; // Fallback to coordinates
              });
              locationNames[location] = location; // Temporary fallback
            }
          } else {
            locationNames[location] = location;
          }
        }
      }

      // Update status
      this.monitoringStatus.lastCheckTime = checkStartTime.toISOString();
      this.monitoringStatus.nextCheckTime = new Date(checkStartTime.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour
      this.monitoringStatus.totalChecks++;
      this.monitoringStatus.checkedLocations = locations;
      this.monitoringStatus.locationNames = locationNames;
      this.monitoringStatus.isActive = true; // Ensure it's marked as active
      
      console.log(`[Monitoring] Check complete. Status:`, {
        totalChecks: this.monitoringStatus.totalChecks,
        weatherChecks: this.monitoringStatus.weatherChecks,
        trafficChecks: this.monitoringStatus.trafficChecks,
        disruptionsFound: disruptions.length
      });
      
      this.notifyStatusSubscribers();

      this.notifySubscribers(disruptions);
    } catch (error) {
      console.error('[Monitoring] Error checking for disruptions:', error);
      // Even on error, update status to show we tried
      this.notifyStatusSubscribers();
    }
  }




  // Extract unique locations from itinerary
  private extractLocations(itinerary: any): string[] {
    const locations = new Set<string>();
    const coordinateMap = new Map<string, string>(); // Map normalized coords to original

    if (itinerary?.itinerary) {
      itinerary.itinerary.forEach((day: any) => {
        if (day.accommodation?.location) {
          let location = this.extractLocationString(day.accommodation.location, day.accommodation);
          if (location && location !== 'Unknown Location' && !this.looksLikeActivityDescription(location)) {
            // Normalize coordinates to prevent duplicates
            const normalized = this.normalizeLocation(location, coordinateMap);
            locations.add(normalized);
          }
        }
        if (day.activities) {
          day.activities.forEach((activity: any) => {
            if (activity.location) {
              let location = this.extractLocationString(activity.location, activity);
              if (location && location !== 'Unknown Location' && !this.looksLikeActivityDescription(location)) {
                // Normalize coordinates to prevent duplicates
                const normalized = this.normalizeLocation(location, coordinateMap);
                locations.add(normalized);
              }
            }
          });
        }
      });
    }

    const uniqueLocations = Array.from(locations);
    console.log(`[Monitoring] Extracted ${uniqueLocations.length} unique locations:`, uniqueLocations);
    return uniqueLocations;
  }

  // Normalize location to prevent duplicates (round coordinates, dedupe nearby locations)
  private normalizeLocation(location: string, coordinateMap: Map<string, string>): string {
    // Check if it's coordinates
    const coordMatch = location.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      
      // Round to 4 decimal places (~11 meter precision)
      const normalizedLat = Math.round(lat * 10000) / 10000;
      const normalizedLng = Math.round(lng * 10000) / 10000;
      const normalizedKey = `${normalizedLat},${normalizedLng}`;
      
      // Check if we already have a very similar coordinate
      for (const [existingKey, existingValue] of coordinateMap.entries()) {
        const [existingLat, existingLng] = existingKey.split(',').map(Number);
        const distance = this.calculateDistance(normalizedLat, normalizedLng, existingLat, existingLng);
        
        // If within 50 meters, treat as duplicate
        if (distance < 0.05) {
          console.log(`[Monitoring] Deduplicating location: ${location} -> ${existingValue} (${(distance * 1000).toFixed(0)}m apart)`);
          return existingValue;
        }
      }
      
      // Store this normalized coordinate
      coordinateMap.set(normalizedKey, normalizedKey);
      return normalizedKey;
    }
    
    // Not coordinates, return as-is
    return location;
  }

  // Extract location string from location object or string
  private extractLocationString(location: any, item: any): string | null {
    // If location is a string, check if it's coordinates or a valid location
    if (typeof location === 'string') {
      // If it's coordinates format, return as-is
      if (/^\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*$/.test(location)) {
        return location;
      }
      // If it doesn't look like an activity description, return it
      if (!this.looksLikeActivityDescription(location)) {
        return location;
      }
    }

    // If location is an object, extract coordinates or address
    if (typeof location === 'object' && location !== null) {
      // Prioritize coordinates (most reliable)
      if (location.latitude !== undefined && location.longitude !== undefined) {
        return `${location.latitude},${location.longitude}`;
      }
      if (location.lat !== undefined && location.lng !== undefined) {
        return `${location.lat},${location.lng}`;
      }
      // Then try address/city/name
      const address = location.address || location.city || location.name || location.address;
      if (address && typeof address === 'string' && !this.looksLikeActivityDescription(address)) {
        return address;
      }
    }

   
    if (item?.address && typeof item.address === 'string' && !this.looksLikeActivityDescription(item.address)) {
      return item.address;
    }
    if (item?.city && typeof item.city === 'string' && !this.looksLikeActivityDescription(item.city)) {
      return item.city;
    }

   
    return null;
  }

  // Check if a string looks like an activity description rather than a location
  private looksLikeActivityDescription(text: string): boolean {
    if (!text) return false;
    const lower = text.toLowerCase();
    // Activity keywords that indicate this is not a location
    const activityKeywords = [
      'explore', 'visit', 'tour', 'experience', 'enjoy', 'discover',
      'adventure', 'activity', 'attraction', 'excursion', 'outing',
      'market', 'cuisine', 'food', 'shopping', 'sightseeing'
    ];
    // If it contains multiple words and activity keywords, likely a description
    const words = lower.split(/\s+/);
    const hasActivityKeyword = activityKeywords.some(keyword => lower.includes(keyword));
    // If it's a long description-like text (3+ words) with activity keywords, it's probably not a location
    return hasActivityKeyword && words.length >= 3;
  }




  // Reverse geocode coordinates to get place name
  private async reverseGeocode(coordinates: string): Promise<string> {
    try {
      const match = coordinates.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
      if (!match) {
        return coordinates; // Return as-is if not coordinates
      }

      const lat = match[1];
      const lng = match[2];
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.apiKey}`;
      
      const response = await fetch(geocodeUrl);
      if (!response.ok) {
        return coordinates; // Return coordinates if geocoding fails
      }

      const data = await response.json();
      if (data.results && data.results.length > 0) {
        // Get the most specific address component
        const result = data.results[0];
        // Try to get locality, sublocality, or formatted address
        const locality = result.address_components?.find((comp: any) => 
          comp.types.includes('locality') || comp.types.includes('sublocality')
        );
        
        if (locality) {
          return locality.long_name;
        }
        
        // Fallback to formatted address without country
        const formatted = result.formatted_address || coordinates;
        // Remove country and postal code for cleaner display
        return formatted.split(',').slice(0, -2).join(',').trim() || coordinates;
      }
      
      return coordinates;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return coordinates;
    }
  }

  // Checking weather conditions using Google Weather API
  private async checkWeatherConditions(location: string, travelDates: { startDate: string; endDate: string }) {
    const disruptions: TravelDisruption[] = [];

    try {
      const weatherData = await this.fetchWeatherData(location);
      const weatherAlerts = this.analyzeWeatherConditions(weatherData);

      // Get place name from coordinates if needed
      let displayLocation = location;
      const isCoordinates = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/.test(location);
      if (isCoordinates) {
        displayLocation = await this.reverseGeocode(location);
      }

      // Convert weather alerts to travel disruptions
      weatherAlerts.forEach(alert => {
        if (alert.impact === 'moderate' || alert.impact === 'significant' || alert.impact === 'severe') {
          const disruption = {
            id: `weather_${location}_${Date.now()}`,
            type: 'weather' as const,
            severity: (alert.severity === 'high' || alert.severity === 'extreme' ? 'high' : 'moderate') as 'high' | 'moderate',
            title: `Weather Alert: ${alert.type.toUpperCase()}`,
            description: alert.message,
            affected_locations: [displayLocation], // Use place name instead of coordinates
            estimated_duration: this.getWeatherDuration(alert.type),
            suggested_alternatives: this.getWeatherAlternatives(alert.type),
            timestamp: new Date().toISOString()
          };
          disruptions.push(disruption);
        }
      });
    } catch (error) {
      console.error(`Error checking weather for ${location}:`, error);
    }

    return disruptions;
  }




  // Fetching real weather data API call
  private async fetchWeatherData(location: string): Promise<WeatherData> {
    const response = await fetch('/api/weather-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        location
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Weather API error: ${response.status}`);
    }

    const data = await response.json();

    // Validate that we got real weather data
    if (!data.main || !data.weather || !data.weather[0]) {
      throw new Error('Invalid weather data received from API');
    }

    // API returns: visibility in km, wind speed in m/s, precipitation in mm
    return {
      location,
      temperature: data.main.temp,
      condition: data.weather[0].main.toLowerCase(),
      precipitation: data.rain?.['1h'] || data.rain?.['3h'] || data.snow?.['1h'] || data.snow?.['3h'] || 0,
      precipitationProbability: data.precipitationProbability || 0, // Probability of precipitation (0-100%)
      windSpeed: data.wind?.speed || 0, // Already in m/s from API
      visibility: data.visibility || 10, // Already in km from API
      timestamp: new Date().toISOString(),
      alerts: []
    };
  }

  // Analyzing weather conditions and generating alerts
  // Only alerts for actual travel disruptions - uses API condition directly
  private analyzeWeatherConditions(weatherData: WeatherData): WeatherAlert[] {
    const alerts: WeatherAlert[] = [];
    const condition = weatherData.condition.toLowerCase();

    // Fog/Mist/Haze - use API condition directly
    if (condition === 'fog' || condition === 'mist' || condition === 'haze') {
      alerts.push({
        type: 'fog',
        severity: 'moderate',
        message: `Weather condition: ${weatherData.condition}`,
        impact: 'moderate'
      });
    }

    // Rain - use API condition directly or check precipitation
    if (condition.includes('rain') || condition.includes('drizzle') || condition.includes('shower') || condition === 'thunderstorm') {
      if (weatherData.precipitation > 0) {
        const severity = weatherData.precipitation > 20 ? 'high' : 'moderate';
        alerts.push({
          type: 'rain' as const,
          severity: severity as 'high' | 'moderate',
          message: `${weatherData.condition} - ${weatherData.precipitation.toFixed(2)}mm precipitation`,
          impact: weatherData.precipitation > 20 ? 'significant' : 'moderate'
        });
      } else if (weatherData.precipitationProbability > 60) {
        alerts.push({
          type: 'rain' as const,
          severity: weatherData.precipitationProbability > 80 ? 'high' : 'moderate',
          message: `${weatherData.condition} - ${weatherData.precipitationProbability}% chance of rain`,
          impact: weatherData.precipitationProbability > 80 ? 'significant' : 'moderate'
        });
      } else {
        // Weather condition indicates rain even without precipitation data
        alerts.push({
          type: 'rain' as const,
          severity: 'moderate',
          message: `Weather condition: ${weatherData.condition}`,
          impact: 'moderate'
        });
      }
    }

    // Snow - use API condition directly
    if (condition.includes('snow') || condition.includes('sleet')) {
      alerts.push({
        type: 'snow',
        severity: 'moderate',
        message: `Weather condition: ${weatherData.condition}`,
        impact: 'moderate'
      });
    }

    // Strong winds (independent of condition - based on actual wind speed)
    if (weatherData.windSpeed > 10) {
      const windKmh = weatherData.windSpeed * 3.6; // Convert m/s to km/h for display
      alerts.push({
        type: 'storm',
        severity: weatherData.windSpeed > 20 ? 'extreme' : 'high',
        message: `Strong winds (${windKmh.toFixed(1)} km/h)`,
        impact: weatherData.windSpeed > 20 ? 'severe' : 'significant'
      });
    }

    // Extreme temperatures
    if (weatherData.temperature > 35) {
      alerts.push({
        type: 'extreme_heat',
        severity: 'high',
        message: `Extreme heat (${weatherData.temperature.toFixed(1)}°C)`,
        impact: 'significant'
      });
    }

    if (weatherData.temperature < 0) {
      alerts.push({
        type: 'extreme_cold',
        severity: 'moderate',
        message: `Extreme cold (${weatherData.temperature.toFixed(1)}°C)`,
        impact: 'moderate'
      });
    }

    return alerts;
  }

  // Checking traffic conditions
  // NOTE: This now uses the trafficData passed from checkForDisruptions to avoid double-fetching
  private async checkTrafficConditions(itinerary: any, travelDates: { startDate: string; endDate: string }, trafficData?: TrafficData[]) {
    const disruptions: TravelDisruption[] = [];

    try {
      // Use provided trafficData if available, otherwise fetch it
      const dataToCheck = trafficData || await this.fetchTrafficData(itinerary);

      dataToCheck.forEach(traffic => {
        if (traffic.condition === 'blocked' || traffic.delay > 60) {
          disruptions.push({
            id: `traffic_${traffic.route}_${Date.now()}`,
            type: 'traffic',
            severity: traffic.condition === 'blocked' ? 'high' : 'moderate',
            title: `Traffic Disruption: ${traffic.route}`,
            description: `Major delay of ${traffic.delay} minutes due to ${traffic.incidents[0]?.type || 'traffic congestion'}`,
            affected_locations: [traffic.route],
            estimated_duration: traffic.delay,
            suggested_alternatives: traffic.incidents[0]?.alternate_routes || [],
            timestamp: new Date().toISOString()
          });
        }
      });

    } catch (error) {
      console.error('Error checking traffic conditions:', error);
    }

    return disruptions;
  }

  
  private async fetchTrafficData(itinerary: any): Promise<TrafficData[]> {
    try {
      const trafficData: TrafficData[] = [];

      // Get routes between itinerary locations
      const routes = this.getRoutesBetweenLocations(itinerary);
      console.log(`[Monitoring] Found ${routes.length} routes to check for traffic`);

      for (const route of routes) {
        try {
          const response = await fetch('/api/traffic-data', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              origin: route.origin,
              destination: route.destination
            })
          });

          if (!response.ok) {
            // Handle 400 errors gracefully - usually means invalid route or same location
            if (response.status === 400) {
              console.warn(`Skipping traffic check for route ${route.origin} to ${route.destination}: Invalid route or locations too close`);
              continue;
            }
            throw new Error(`Traffic API error: ${response.status}`);
          }

          const data = await response.json();

          // Handle new Routes API response format
          if (data.status === 'OK' && data.routes && data.routes.length > 0) {
            const routeData = data.routes[0];
            const leg = routeData.legs?.[0];
            
            if (leg) {
              // According to API response:
              // - duration is at route level: routes[0].duration = "469s"
              // - staticDuration is at leg level: routes[0].legs[0].staticDuration = "587s"
              // Parse duration strings (e.g., "469s" -> 469 seconds)
              const durationString = routeData.duration || '0';
              const staticDurationString = leg.staticDuration || '0';
              
              const durationInSeconds = parseInt(durationString.replace('s', '') || '0');
              const staticDurationInSeconds = parseInt(staticDurationString.replace('s', '') || '0');
              
              // Calculate delay (difference between traffic duration and static duration)
              // If duration < staticDuration, traffic is actually better (negative delay = 0)
              // Example: 469s actual vs 587s static = -118s = 0 delay (traffic is good!)
              const delayInSeconds = Math.max(0, durationInSeconds - staticDurationInSeconds);
              const delay = delayInSeconds / 60; // Convert to minutes

              console.log(`[Monitoring] Route ${route.origin} → ${route.destination}: duration=${durationInSeconds}s (${(durationInSeconds/60).toFixed(1)}min), static=${staticDurationInSeconds}s (${(staticDurationInSeconds/60).toFixed(1)}min), delay=${delay.toFixed(1)}min`);

              trafficData.push({
                route: `${route.origin} to ${route.destination}`,
                delay: delay,
                condition: this.getTrafficCondition(delay),
                incidents: [], // Simplified for now
                timestamp: new Date().toISOString()
              });
            } else {
              console.warn(`[Monitoring] No leg data found for route ${route.origin} to ${route.destination}`);
            }
          } else {
            console.warn(`[Monitoring] Invalid route data for ${route.origin} to ${route.destination}:`, data.status);
          }
        } catch (routeError) {
          console.error(`Error fetching traffic for route ${route.origin} to ${route.destination}:`, routeError);
        }
      }

      return trafficData;
    } catch (error) {
      console.error('Error fetching traffic data:', error);
      return [];
    }
  }



  // Calculate distance between two coordinates in kilometers (Haversine formula)
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Parse coordinates from string format "lat,lng"
  private parseCoordinates(location: string): { lat: number; lng: number } | null {
    const match = location.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (match) {
      return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
    }
    return null;
  }

  // Get routes between itinerary locations, filtering out routes that are too close
  private getRoutesBetweenLocations(itinerary: any): { origin: string; destination: string }[] {
    const routes: { origin: string; destination: string }[] = [];
    const locations = this.extractLocations(itinerary);

    for (let i = 0; i < locations.length - 1; i++) {
      const origin = locations[i];
      const destination = locations[i + 1];
      
      // Skip if origin and destination are the same
      if (origin === destination) {
        continue;
      }

      // Check if both are coordinates and if they're too close
      const originCoords = this.parseCoordinates(origin);
      const destCoords = this.parseCoordinates(destination);
      
      if (originCoords && destCoords) {
        const distance = this.calculateDistance(originCoords.lat, originCoords.lng, destCoords.lat, destCoords.lng);
        // Skip routes less than 100 meters (0.1 km) apart - not meaningful for traffic
        if (distance < 0.1) {
          console.log(`Skipping route: ${origin} to ${destination} (too close: ${(distance * 1000).toFixed(0)}m)`);
          continue;
        }
      }

      routes.push({ origin, destination });
    }

    return routes;
  }

  // Get traffic condition based on delay
  private getTrafficCondition(delay: number): 'clear' | 'slow' | 'congested' | 'blocked' {
    if (delay === 0) return 'clear';
    if (delay < 15) return 'slow';
    if (delay < 60) return 'congested';
    return 'blocked';
  }

 

  // Helper methods
  private getWeatherDuration(weatherType: string): number {
    const durations = {
      'rain': 360, // 6 hours
      'storm': 180, // 3 hours
      'snow': 720, // 12 hours
      'fog': 120, // 2 hours
      'extreme_heat': 480, // 8 hours
      'extreme_cold': 480 // 8 hours
    };
    return durations[weatherType as keyof typeof durations] || 180;
  }

  private getWeatherAlternatives(weatherType: string): string[] {
    const alternatives = {
      'rain': ['Indoor activities', 'Museum visits', 'Shopping centers', 'Restaurants'],
      'storm': ['Indoor attractions', 'Hotel activities', 'Spa services'],
      'snow': ['Winter sports', 'Indoor activities', 'Hot springs'],
      'fog': ['Indoor activities', 'Delayed outdoor activities'],
      'extreme_heat': ['Air-conditioned venues', 'Early morning activities', 'Evening activities'],
      'extreme_cold': ['Indoor activities', 'Warm clothing recommendations']
    };
    return alternatives[weatherType as keyof typeof alternatives] || ['Indoor alternatives'];
  }

  // Notify subscribers
  private notifySubscribers(disruptions: TravelDisruption[]) {
    if (disruptions.length > 0) {
      this.subscribers.forEach(callback => callback(disruptions));
    }
  }

  // Get impact analysis for itinerary
  async analyzeItineraryImpact(disruptions: TravelDisruption[], itinerary: any): Promise<ItineraryImpact[]> {
    const impacts: ItineraryImpact[] = [];

    if (itinerary?.itinerary) {
      itinerary.itinerary.forEach((day: any, index: number) => {
        const dayImpacts = disruptions.filter(d =>
          day.accommodation?.location && d.affected_locations.includes(day.accommodation.location) ||
          day.activities?.some((activity: any) =>
            activity.location && d.affected_locations.includes(activity.location)
          )
        );

        if (dayImpacts.length > 0) {
          const maxSeverity = dayImpacts.reduce((max, d) =>
            ['low', 'moderate', 'high', 'critical'].indexOf(d.severity) >
              ['low', 'moderate', 'high', 'critical'].indexOf(max) ? d.severity : max, 'low');

          impacts.push({
            day: day.day,
            affected_activities: day.activities?.map((a: any) => a.name) || [],
            impact_level: this.mapSeverityToImpact(maxSeverity),
            suggestions: dayImpacts.flatMap(d => d.suggested_alternatives),
            alternative_activities: this.getAlternativeActivities(dayImpacts)
          });
        }
      });
    }

    return impacts;
  }

  private mapSeverityToImpact(severity: string): 'none' | 'minor' | 'moderate' | 'major' {
    const mapping = {
      'low': 'minor' as const,
      'moderate': 'moderate' as const,
      'high': 'major' as const,
      'critical': 'major' as const
    };
    return mapping[severity as keyof typeof mapping] || 'minor';
  }

  private getAlternativeActivities(disruptions: TravelDisruption[]): string[] {
    const alternatives = new Set<string>();
    disruptions.forEach(d => {
      d.suggested_alternatives.forEach(alt => alternatives.add(alt));
    });
    return Array.from(alternatives);
  }
}


export const realTimeMonitoringService = new RealTimeMonitoringService();
