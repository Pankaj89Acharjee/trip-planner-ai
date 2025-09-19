// Weather API service for real-time weather monitoring
export interface WeatherApiResponse {
  location: string;
  current: {
    temp_c: number;
    condition: {
      text: string;
      code: number;
    };
    humidity: number;
    wind_kph: number;
    precip_mm: number;
    vis_km: number;
  };
  forecast: {
    forecastday: Array<{
      date: string;
      day: {
        maxtemp_c: number;
        mintemp_c: number;
        condition: {
          text: string;
          code: number;
        };
        totalprecip_mm: number;
        maxwind_kph: number;
        daily_chance_of_rain: number;
      };
      hour: Array<{
        time: string;
        temp_c: number;
        condition: {
          text: string;
        };
        precip_mm: number;
        wind_kph: number;
      }>;
    }>;
  };
}

class WeatherService {
  private apiKey: string;
  private baseUrl = 'https://api.weatherapi.com/v1';

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  }

  // Get current weather and forecast for a location
  async getWeatherData(location: string, days: number = 3): Promise<WeatherApiResponse> {
    if (!this.apiKey) {
      // Return mock data if no API key is provided
      return this.getMockWeatherData(location);
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/forecast.json?key=${this.apiKey}&q=${encodeURIComponent(location)}&days=${days}&aqi=no&alerts=yes`
      );

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching weather data:', error);
      // Fallback to mock data
      return this.getMockWeatherData(location);
    }
  }

  // Get weather alerts for a location
  async getWeatherAlerts(location: string): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/forecast.json?key=${this.apiKey}&q=${encodeURIComponent(location)}&days=1&aqi=no&alerts=yes`
      );

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();
      return data.alerts?.alert || [];
    } catch (error) {
      console.error('Error fetching weather alerts:', error);
      return [];
    }
  }

  // Analyze weather conditions and generate alerts
  analyzeWeatherConditions(weatherData: WeatherApiResponse): Array<{
    type: 'rain' | 'storm' | 'snow' | 'fog' | 'extreme_heat' | 'extreme_cold';
    severity: 'low' | 'moderate' | 'high' | 'extreme';
    message: string;
    impact: 'minimal' | 'moderate' | 'significant' | 'severe';
  }> {
    const alerts = [];
    const current = weatherData.current;

    // Check for heavy precipitation
    if (current.precip_mm > 10) {
      alerts.push({
        type: 'rain' as const,
        severity: current.precip_mm > 25 ? 'high' as const : 'moderate' as const,
        message: `Heavy rain (${current.precip_mm}mm) expected`,
        impact: current.precip_mm > 25 ? 'significant' as const : 'moderate' as const
      });
    }

    // Check for strong winds
    if (current.wind_kph > 25) {
      alerts.push({
        type: 'storm' as const,
        severity: current.wind_kph > 40 ? 'extreme' as const : 'high' as const,
        message: `Strong winds (${current.wind_kph} km/h) expected`,
        impact: current.wind_kph > 40 ? 'severe' as const : 'significant' as const
      });
    }

    // Check for fog
    if (current.vis_km < 1) {
      alerts.push({
        type: 'fog' as const,
        severity: 'moderate' as const,
        message: 'Dense fog reducing visibility',
        impact: 'moderate' as const
      });
    }

    // Check for extreme temperatures
    if (current.temp_c > 35) {
      alerts.push({
        type: 'extreme_heat' as const,
        severity: 'high' as const,
        message: `Extreme heat (${current.temp_c}°C)`,
        impact: 'significant' as const
      });
    }

    if (current.temp_c < 0) {
      alerts.push({
        type: 'extreme_cold' as const,
        severity: 'moderate' as const,
        message: `Freezing temperatures (${current.temp_c}°C)`,
        impact: 'moderate' as const
      });
    }

    return alerts;
  }

  // Mock weather data for development/testing
  private getMockWeatherData(location: string): WeatherApiResponse {
    const conditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain', 'Heavy Rain', 'Thunderstorm'];
    const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
    
    return {
      location,
      current: {
        temp_c: Math.random() * 30 + 10,
        condition: {
          text: randomCondition,
          code: Math.floor(Math.random() * 1000)
        },
        humidity: Math.random() * 100,
        wind_kph: Math.random() * 30,
        precip_mm: Math.random() * 20,
        vis_km: Math.random() * 10
      },
      forecast: {
        forecastday: [
          {
            date: new Date().toISOString().split('T')[0],
            day: {
              maxtemp_c: Math.random() * 30 + 15,
              mintemp_c: Math.random() * 15 + 5,
              condition: {
                text: randomCondition,
                code: Math.floor(Math.random() * 1000)
              },
              totalprecip_mm: Math.random() * 15,
              maxwind_kph: Math.random() * 25,
              daily_chance_of_rain: Math.random() * 100
            },
            hour: Array.from({ length: 24 }, (_, i) => ({
              time: `${i.toString().padStart(2, '0')}:00`,
              temp_c: Math.random() * 25 + 10,
              condition: {
                text: randomCondition
              },
              precip_mm: Math.random() * 5,
              wind_kph: Math.random() * 20
            }))
          }
        ]
      }
    };
  }
}

// Export singleton instance
export const weatherService = new WeatherService();

