// Real-time monitoring service for weather, traffic, and travel disruptions
export interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  precipitation: number;
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

class RealTimeMonitoringService {
  private apiKey: string;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private subscribers: Array<(disruptions: TravelDisruption[]) => void> = [];

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
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

    await this.checkForDisruptions(itinerary, travelDates);
    
    this.monitoringInterval = setInterval(async () => {
      await this.checkForDisruptions(itinerary, travelDates);
    }, 6 * 60 * 60 * 1000); // Check every 6 hours
  }

  // Stop monitoring
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  // Main method to check for disruptions
  private async checkForDisruptions(itinerary: any, travelDates: { startDate: string; endDate: string }) {
    const disruptions: TravelDisruption[] = [];

    try {
      const locations = this.extractLocations(itinerary);

      // Check weather for each location
      for (const location of locations) {
        const weatherDisruptions = await this.checkWeatherConditions(location, travelDates);
        disruptions.push(...weatherDisruptions);
      }

      // Check traffic conditions
      const trafficDisruptions = await this.checkTrafficConditions(itinerary, travelDates);
      disruptions.push(...trafficDisruptions);

      this.notifySubscribers(disruptions);
    } catch (error) {
      console.error('Error checking for disruptions:', error);
    }
  }




  // Extract unique locations from itinerary
  private extractLocations(itinerary: any): string[] {
    const locations = new Set<string>();

    if (itinerary?.itinerary) {
      itinerary.itinerary.forEach((day: any) => {
        if (day.accommodation?.location) {
          // Locations in string is req
          let location = day.accommodation.location;
          if (typeof location !== 'string') {
            location = location?.name || location?.address || location?.city ||
              day.accommodation.name || day.accommodation.address || 'Delhi, India';
          }
          if (location && location !== 'Unknown Location') {
            locations.add(location);
          }
        }
        if (day.activities) {
          day.activities.forEach((activity: any) => {
            if (activity.location) {              
              let location = activity.location;
              if (typeof location !== 'string') {
                location = location?.name || location?.address || location?.city ||
                  activity.name || activity.address || 'Delhi, India';
              }
              if (location && location !== 'Unknown Location') {
                locations.add(location);
              }
            }
          });
        }
      });
    }

    return Array.from(locations);
  }




  // Checking weather conditions using Google Weather API
  private async checkWeatherConditions(location: string, travelDates: { startDate: string; endDate: string }) {
    const disruptions: TravelDisruption[] = [];

    try {
      const weatherData = await this.fetchWeatherData(location);
      const weatherAlerts = this.analyzeWeatherConditions(weatherData);

      // Convert weather alerts to travel disruptions
      weatherAlerts.forEach(alert => {
        if (alert.impact === 'moderate' || alert.impact === 'significant' || alert.impact === 'severe') {
          const disruption = {
            id: `weather_${location}_${Date.now()}`,
            type: 'weather' as const,
            severity: (alert.severity === 'high' || alert.severity === 'extreme' ? 'high' : 'moderate') as 'high' | 'moderate',
            title: `Weather Alert: ${alert.type.toUpperCase()}`,
            description: alert.message,
            affected_locations: [location],
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




  // Fetching real weather data API cxall
  private async fetchWeatherData(location: string): Promise<WeatherData> {
    try {   
      const response = await fetch('/api/weather-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location,
          apiKey: this.apiKey
        })
      });

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        location,
        temperature: data.main?.temp || 20,
        condition: data.weather?.[0]?.main?.toLowerCase() || 'unknown',
        precipitation: data.rain?.['1h'] || data.rain?.['3h'] || 0,
        windSpeed: data.wind?.speed || 0,
        visibility: (data.visibility || 10000) / 1000, // Convert to km
        timestamp: new Date().toISOString(),
        alerts: this.generateWeatherAlerts(data)
      };
    } catch (error) {
      console.error(`Error fetching weather for ${location}:`, error);
      // Fallback to basic data structure
      return {
        location,
        temperature: 20,
        condition: 'unknown',
        precipitation: 0,
        windSpeed: 0,
        visibility: 10,
        timestamp: new Date().toISOString(),
        alerts: []
      };
    }
  }

  // Analyzing weather conditions and generating alerts
  private analyzeWeatherConditions(weatherData: WeatherData): WeatherAlert[] {
    const alerts: WeatherAlert[] = [];

    // Check for heavy rain
    if (weatherData.precipitation > 0) {
      const severity = weatherData.precipitation > 20 ? 'high' : 'moderate';
      const impact = weatherData.precipitation > 20 ? 'significant' : 'moderate';
      alerts.push({
        type: 'rain' as const,
        severity: severity as 'high' | 'moderate',
        message: `Heavy rain (${weatherData.precipitation.toFixed(2)}mm) expected`,
        impact: impact as 'significant' | 'moderate'
      });
    }

    // Check for storms
    if (weatherData.windSpeed > 25) {
      alerts.push({
        type: 'storm',
        severity: weatherData.windSpeed > 40 ? 'extreme' : 'high',
        message: `Strong winds (${weatherData.windSpeed} km/h) expected`,
        impact: weatherData.windSpeed > 40 ? 'severe' : 'significant'
      });
    }

    // Check for fog
    if (weatherData.visibility < 1) {
      alerts.push({
        type: 'fog',
        severity: 'moderate',
        message: 'Dense fog reducing visibility',
        impact: 'moderate'
      });
    }

    return alerts;
  }

  // Checking traffic conditions
  private async checkTrafficConditions(itinerary: any, travelDates: { startDate: string; endDate: string }) {
    const disruptions: TravelDisruption[] = [];

    try {      
      const trafficData = await this.fetchTrafficData(itinerary);

      trafficData.forEach(traffic => {
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

      for (const route of routes) {
        try {

          const response = await fetch('/api/traffic-data', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              origin: route.origin,
              destination: route.destination,
              apiKey: this.apiKey
            })
          });

          if (!response.ok) {
            throw new Error(`Traffic API error: ${response.status}`);
          }

          const data = await response.json();

          if (data.status === 'OK' && data.rows?.[0]?.elements?.[0]?.status === 'OK') {
            const element = data.rows[0].elements[0];
            const durationInTraffic = element.duration_in_traffic?.value || element.duration.value;
            const normalDuration = element.duration.value;
            const delay = Math.max(0, (durationInTraffic - normalDuration) / 60); // Convert to minutes

            trafficData.push({
              route: `${route.origin} to ${route.destination}`,
              delay: delay,
              condition: this.getTrafficCondition(delay),
              incidents: [], // Simplified for now
              timestamp: new Date().toISOString()
            });
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


  // Generate weather alerts from OpenWeatherMap data
  private generateWeatherAlerts(data: any): WeatherAlert[] {
    const alerts: WeatherAlert[] = [];

    // Check for heavy rain
    if (data.rain && (data.rain['1h'] > 5 || data.rain['3h'] > 10)) {
      alerts.push({
        type: 'rain',
        severity: data.rain['1h'] > 15 || data.rain['3h'] > 25 ? 'high' : 'moderate',
        message: `Heavy rain (${data.rain['1h'] || data.rain['3h']}mm) detected`,
        impact: data.rain['1h'] > 15 || data.rain['3h'] > 25 ? 'significant' : 'moderate'
      });
    }

    // Check for storms
    if (data.wind.speed > 10) {
      alerts.push({
        type: 'storm',
        severity: data.wind.speed > 20 ? 'extreme' : 'high',
        message: `Strong winds (${data.wind.speed} m/s) detected`,
        impact: data.wind.speed > 20 ? 'severe' : 'significant'
      });
    }

    // Check for extreme temperatures
    if (data.main.temp > 35) {
      alerts.push({
        type: 'extreme_heat',
        severity: 'high',
        message: `Extreme heat (${data.main.temp}°C) detected`,
        impact: 'significant'
      });
    }

    if (data.main.temp < 0) {
      alerts.push({
        type: 'extreme_cold',
        severity: 'moderate',
        message: `Extreme cold (${data.main.temp}°C) detected`,
        impact: 'moderate'
      });
    }

    // Check for fog
    if (data.visibility < 1000) {
      alerts.push({
        type: 'fog',
        severity: 'moderate',
        message: `Reduced visibility (${data.visibility}m) due to fog`,
        impact: 'moderate'
      });
    }

    return alerts;
  }

  // Get routes between itinerary locations
  private getRoutesBetweenLocations(itinerary: any): { origin: string; destination: string }[] {
    const routes: { origin: string; destination: string }[] = [];
    const locations = this.extractLocations(itinerary);

    for (let i = 0; i < locations.length - 1; i++) {
      routes.push({
        origin: locations[i],
        destination: locations[i + 1]
      });
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
