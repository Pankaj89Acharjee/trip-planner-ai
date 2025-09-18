import { askAgent, askAgentDebounced } from './agentFunctionCall';

export interface MapLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type: string;
  cost?: number;
  rating?: number;
  description?: string;
}

export interface MapDataResponse {
  hotels: MapLocation[];
  activities: MapLocation[];
  isLoading: boolean;
  error?: string;
}

export class MapDataService {
  /**
   * Fetch hotels and activities for a destination based on interests and budget
   */
  static async fetchLocationData(
    destination: string,
    interests: string[],
    budget: number,
    userUid: string
  ): Promise<MapDataResponse> {
    try {
      const question = `Search for hotels and activities in ${destination} for interests: ${interests.join(', ')} with budget ${budget}. Return only the search results.`;
      
      const formData = {
        destination,
        interests,
        budget,
        searchType: 'map_data'
      };

      const response = await askAgentDebounced(question, 5000);
      
      // Parse the response to extract hotels and activities
      let parsedResponse;
      try {
        // Handle different response formats
        if (typeof response === 'string') {
          const responseStr = response as string;
          // Check if it's wrapped in markdown code blocks
          if (responseStr.includes('```json')) {
            const jsonMatch = responseStr.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch) {
              parsedResponse = JSON.parse(jsonMatch[1]);
            } else {
              parsedResponse = JSON.parse(responseStr);
            }
          } else {
            parsedResponse = JSON.parse(responseStr);
          }
        } else if (response && typeof response === 'object' && 'answer' in response && typeof response.answer === 'string') {
          const answerStr = response.answer as string;
          // Handle response.answer format
          if (answerStr.includes('```json')) {
            const jsonMatch = answerStr.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch) {
              parsedResponse = JSON.parse(jsonMatch[1]);
            } else {
              parsedResponse = JSON.parse(answerStr);
            }
          } else {
            parsedResponse = JSON.parse(answerStr);
          }
        } else {
          parsedResponse = response;
        }
      } catch (parseError) {
        console.error('Failed to parse map data response:', parseError);
        console.error('Raw response:', response);
        return { hotels: [], activities: [], isLoading: false, error: 'Failed to parse response' };
      }

      // Extract hotels and activities from the response
      const hotels: MapLocation[] = [];
      const activities: MapLocation[] = [];

      console.log('Raw response:', response);
      console.log('Parsed response for map data:', parsedResponse);

      // Check if we have invoke_toolbox_response format (latest format)
      if (parsedResponse.invoke_toolbox_response?.content && Array.isArray(parsedResponse.invoke_toolbox_response.content)) {
        const content = parsedResponse.invoke_toolbox_response.content;
        
        content.forEach((item: any, index: number) => {
          if (item.latitude && item.longitude) {
            if (item.type === 'hotel') {
              hotels.push({
                id: `hotel-${item.id || index}`,
                name: item.name,
                latitude: parseFloat(item.latitude),
                longitude: parseFloat(item.longitude),
                type: 'accommodation',
                cost: item.cost_per_night,
                rating: item.rating,
                description: item.description
              });
            } else if (item.type === 'activity') {
              activities.push({
                id: `activity-${item.id || index}`,
                name: item.name,
                latitude: parseFloat(item.latitude),
                longitude: parseFloat(item.longitude),
                type: 'attraction',
                cost: item.cost_per_night || 0, // Activities might not have cost_per_night
                rating: item.rating,
                description: item.description
              });
            }
          }
        });
      }
      // Check if we have itinerary data (previous format)
      else if (parsedResponse.itinerary && Array.isArray(parsedResponse.itinerary)) {
        parsedResponse.itinerary.forEach((day: any) => {
          // Extract accommodation/hotel data
          if (day.accommodation && day.accommodation.location) {
            hotels.push({
              id: `hotel-${day.accommodation.name?.replace(/\s+/g, '-').toLowerCase() || 'unknown'}`,
              name: day.accommodation.name,
              latitude: day.accommodation.location.latitude,
              longitude: day.accommodation.location.longitude,
              type: 'accommodation',
              cost: day.accommodation.costPerNight,
              rating: 4.0, // Default rating
              description: day.accommodation.description
            });
          }

          // Extract activities data
          if (day.activities && Array.isArray(day.activities)) {
            day.activities.forEach((activity: any, index: number) => {
              if (activity.location) {
                activities.push({
                  id: `activity-${activity.name?.replace(/\s+/g, '-').toLowerCase() || index}`,
                  name: activity.name,
                  latitude: activity.location.latitude,
                  longitude: activity.location.longitude,
                  type: 'attraction',
                  cost: activity.cost,
                  rating: 4.0, // Default rating
                  description: activity.description
                });
              }
            });
          }
        });
      }
      // Fallback to old format (metadata.searchResults)
      else if (parsedResponse.metadata?.searchResults) {
        const searchResults = parsedResponse.metadata.searchResults;
        
        // Process hotels if available
        if (searchResults.hotels && Array.isArray(searchResults.hotels)) {
          searchResults.hotels.forEach((hotel: any, index: number) => {
            if (hotel.latitude && hotel.longitude) {
              hotels.push({
                id: hotel.id || `hotel-${index}`,
                name: hotel.name || hotel.hotel_name,
                latitude: parseFloat(hotel.latitude),
                longitude: parseFloat(hotel.longitude),
                type: 'accommodation',
                cost: hotel.cost_per_night,
                rating: hotel.rating,
                description: hotel.description
              });
            }
          });
        }

        // Process activities if available
        if (searchResults.activities && Array.isArray(searchResults.activities)) {
          searchResults.activities.forEach((activity: any, index: number) => {
            if (activity.latitude && activity.longitude) {
              activities.push({
                id: activity.id || `activity-${index}`,
                name: activity.name || activity.activity_name,
                latitude: parseFloat(activity.latitude),
                longitude: parseFloat(activity.longitude),
                type: activity.type || 'attraction',
                cost: activity.cost,
                rating: activity.rating,
                description: activity.description
              });
            }
          });
        }
      }

      console.log('Extracted data:', { hotels: hotels.length, activities: activities.length });
      console.log('Hotels:', hotels);
      console.log('Activities:', activities);

      return {
        hotels,
        activities,
        isLoading: false
      };

    } catch (error) {
      console.error('Error fetching map data:', error);
      return {
        hotels: [],
        activities: [],
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get city center coordinates for map positioning
   */
  static getCityCenter(destination: string): { lat: number; lng: number } {
    const cityCenters: Record<string, { lat: number; lng: number }> = {
      'Delhi': { lat: 28.6139, lng: 77.2090 },
      'Mumbai': { lat: 19.0760, lng: 72.8777 },
      'Bangalore': { lat: 12.9716, lng: 77.5946 },
      'Kolkata': { lat: 22.5726, lng: 88.3639 },
      'Chennai': { lat: 13.0827, lng: 80.2707 },
      'Hyderabad': { lat: 17.3850, lng: 78.4867 },
      'Pune': { lat: 18.5204, lng: 73.8567 },
      'Jaipur': { lat: 26.9124, lng: 75.7873 },
      'Goa': { lat: 15.2993, lng: 74.1240 },
      'Kerala': { lat: 10.8505, lng: 76.2711 },
      'Shimla': { lat: 31.1048, lng: 77.1734 },
      'Manali': { lat: 32.2396, lng: 77.1887 },
      'Agra': { lat: 27.1767, lng: 78.0081 },
      'Varanasi': { lat: 25.3176, lng: 82.9739 },
      'Udaipur': { lat: 24.5854, lng: 73.7125 },
      'Darjeeling': { lat: 27.0389, lng: 88.2639 },
      'Kashmir': { lat: 34.0837, lng: 74.7973 },
      'Rishikesh': { lat: 30.0869, lng: 78.2676 },
      'Mysore': { lat: 12.2958, lng: 76.6394 },
      'Kochi': { lat: 9.9312, lng: 76.2673 }
    };

    return cityCenters[destination] || { lat: 28.6139, lng: 77.2090 };
  }

  /**
   * Calculate map bounds to fit all locations
   */
  static calculateMapBounds(locations: MapLocation[]): {
    north: number;
    south: number;
    east: number;
    west: number;
  } | null {
    if (locations.length === 0) return null;

    const latitudes = locations.map(loc => loc.latitude);
    const longitudes = locations.map(loc => loc.longitude);

    return {
      north: Math.max(...latitudes),
      south: Math.min(...latitudes),
      east: Math.max(...longitudes),
      west: Math.min(...longitudes)
    };
  }
}
