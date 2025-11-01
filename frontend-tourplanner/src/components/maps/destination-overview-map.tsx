"use client";

import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { MapIcon, MapPin, Star, Clock, X, IndianRupee } from "lucide-react";
import { useMemo, useState } from "react";
import { MapDataService } from "@/lib/mapDataService";

interface POI {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'heritage' | 'nightlife' | 'adventure' | 'food' | 'culture' | 'shopping';
  rating?: number;
  cost?: 'low' | 'medium' | 'high';
  duration?: string;
}

interface DestinationOverviewMapProps {
  destination: string;
  interests: string[];
  budget: number;
  onLocationSelect?: (poi: POI) => void;
  // New props for dynamic data
  hotels?: any[];
  activities?: any[];
  isLoading?: boolean;
  onAddToItinerary?: (item: any, type: 'hotel' | 'activity') => void;
}

// FALLBACK DATA: Only used when AI agent returns no results or API fails
const SAMPLE_POIS: Record<string, POI[]> = {
  'Delhi': [
    { id: '1', name: 'Red Fort', lat: 28.6562, lng: 77.2410, type: 'heritage', rating: 4.5, cost: 'medium', duration: '2-3 hours' },
    { id: '2', name: 'India Gate', lat: 28.6129, lng: 77.2295, type: 'heritage', rating: 4.3, cost: 'low', duration: '1-2 hours' },
    { id: '3', name: 'Connaught Place', lat: 28.6315, lng: 77.2167, type: 'shopping', rating: 4.2, cost: 'high', duration: '3-4 hours' },
    { id: '4', name: 'Hauz Khas Village', lat: 28.5508, lng: 77.1948, type: 'nightlife', rating: 4.4, cost: 'medium', duration: '2-3 hours' },
    { id: '5', name: 'Lotus Temple', lat: 28.5535, lng: 77.2588, type: 'heritage', rating: 4.6, cost: 'low', duration: '1-2 hours' },
    { id: '6', name: 'Chandni Chowk', lat: 28.6562, lng: 77.2307, type: 'food', rating: 4.7, cost: 'low', duration: '2-3 hours' },
    { id: '7', name: 'Qutub Minar', lat: 28.5245, lng: 77.1855, type: 'heritage', rating: 4.4, cost: 'medium', duration: '2-3 hours' },
    { id: '8', name: 'Akshardham Temple', lat: 28.6127, lng: 77.2773, type: 'heritage', rating: 4.8, cost: 'low', duration: '3-4 hours' }
  ],
  'Mumbai': [
    { id: '1', name: 'Gateway of India', lat: 18.9220, lng: 72.8347, type: 'heritage', rating: 4.3, cost: 'low', duration: '1-2 hours' },
    { id: '2', name: 'Marine Drive', lat: 18.9440, lng: 72.8230, type: 'heritage', rating: 4.5, cost: 'low', duration: '1-2 hours' },
    { id: '3', name: 'Bandra Worli Sea Link', lat: 19.0400, lng: 72.8200, type: 'heritage', rating: 4.2, cost: 'low', duration: '30 mins' },
    { id: '4', name: 'Juhu Beach', lat: 19.1077, lng: 72.8263, type: 'adventure', rating: 4.1, cost: 'low', duration: '2-3 hours' },
    { id: '5', name: 'Crawford Market', lat: 18.9440, lng: 72.8347, type: 'shopping', rating: 4.0, cost: 'medium', duration: '2-3 hours' },
    { id: '6', name: 'Elephanta Caves', lat: 18.9633, lng: 72.9315, type: 'heritage', rating: 4.4, cost: 'medium', duration: '4-5 hours' }
  ],
  'Bangalore': [
    { id: '1', name: 'Lalbagh Botanical Garden', lat: 12.9507, lng: 77.5848, type: 'heritage', rating: 4.3, cost: 'low', duration: '2-3 hours' },
    { id: '2', name: 'Cubbon Park', lat: 12.9716, lng: 77.5946, type: 'heritage', rating: 4.2, cost: 'low', duration: '1-2 hours' },
    { id: '3', name: 'Bangalore Palace', lat: 12.9988, lng: 77.5925, type: 'heritage', rating: 4.1, cost: 'medium', duration: '2-3 hours' },
    { id: '4', name: 'Commercial Street', lat: 12.9716, lng: 77.6101, type: 'shopping', rating: 4.0, cost: 'medium', duration: '3-4 hours' },
    { id: '5', name: 'UB City Mall', lat: 12.9716, lng: 77.6101, type: 'shopping', rating: 4.2, cost: 'high', duration: '2-3 hours' }
  ]
};

const CITY_CENTERS: Record<string, { lat: number; lng: number }> = {
  'Delhi': { lat: 28.6139, lng: 77.2090 },
  'Mumbai': { lat: 19.0760, lng: 72.8777 },
  'Bangalore': { lat: 12.9716, lng: 77.5946 },
  'Kolkata': { lat: 22.5726, lng: 88.3639 },
  'Chennai': { lat: 13.0827, lng: 80.2707 },
  'Hyderabad': { lat: 17.3850, lng: 78.4867 },
  'Pune': { lat: 18.5204, lng: 73.8567 },
  'Jaipur': { lat: 26.9124, lng: 75.7873 }
};

// Utility Function to create unique index for each POI
const createUniqueId = (prefix: string, index: number): string => {
  return `${prefix}-${index}-${Math.random().toString(36).substring(2, 9)}`;
};

const deduplicateByName = <T extends { name?: string; id?: string }>(items: T[]): T[] => {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = item.id || item.name || '';
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const convertToPOIs = (
  hotels: any[],
  activities: any[],
  interests: string[],
  budget: number
): POI[] => {
  const pois: POI[] = [];
 

  // Process hotels - simple and clean
  const uniqueHotels = deduplicateByName(hotels);
  uniqueHotels.forEach((hotel, index) => {
    if (!hotel.latitude || !hotel.longitude) return;

    const lat = parseFloat(hotel.latitude);
    const lng = parseFloat(hotel.longitude);
    

    pois.push({
      id: hotel.id || createUniqueId('hotel', index),
      name: hotel.name || hotel.hotel_name || `Hotel ${index + 1}`,
      lat: lat,
      lng: lng,
      type: 'culture', // Simple default
      rating: hotel.rating || 4.0,
      cost: hotel.cost <= budget * 0.3 ? 'low' :
        hotel.cost <= budget * 0.6 ? 'medium' : 'high',
      duration: 'Overnight'
    });
  });

  // Process activities - simple mapping
  const uniqueActivities = deduplicateByName(activities);
  uniqueActivities.forEach((activity, index) => {
    if (!activity.latitude || !activity.longitude) return;

    const lat = parseFloat(activity.latitude);
    const lng = parseFloat(activity.longitude);
    
    const typeMap: Record<string, POI['type']> = {
      'heritage': 'heritage',
      'adventure': 'adventure',
      'food': 'food',
      'nightlife': 'nightlife',
      'shopping': 'shopping',
      'culture': 'culture'
    };

    pois.push({
      id: activity.id || createUniqueId('activity', index),
      name: activity.name || activity.activity_name || `Activity ${index + 1}`,
      lat: lat,
      lng: lng,
      type: typeMap[activity.type] || 'heritage',
      rating: activity.rating || 4.0,
      cost: activity.cost <= budget * 0.1 ? 'low' :
        activity.cost <= budget * 0.2 ? 'medium' : 'high',
      duration: activity.duration || '2-3 hours'
    });
  });
  return pois;
};

const getTypeColor = (type: string) => {
  const colors = {
    heritage: 'bg-amber-100 text-amber-800 border-amber-200',
    nightlife: 'bg-purple-100 text-purple-800 border-purple-200',
    adventure: 'bg-green-100 text-green-800 border-green-200',
    food: 'bg-orange-100 text-orange-800 border-orange-200',
    culture: 'bg-blue-100 text-blue-800 border-blue-200',
    shopping: 'bg-pink-100 text-pink-800 border-pink-200'
  };
  return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
};

const getCostColor = (cost: string) => {
  const colors = {
    low: 'text-green-600',
    medium: 'text-yellow-600',
    high: 'text-red-600'
  };
  return colors[cost as keyof typeof colors] || 'text-gray-600';
};

const getPinColor = (type: string): string => {
  const colors = {
    heritage: '#f59e0b',
    nightlife: '#8b5cf6',
    adventure: '#10b981',
    food: '#f97316',
    culture: '#3b82f6',
    shopping: '#ec4899'
  };
  return colors[type as keyof typeof colors] || '#6b7280';
};

export function DestinationOverviewMap({
  destination,
  interests,
  budget,
  onLocationSelect,
  hotels = [],
  activities = [],
  isLoading = false,
  onAddToItinerary
}: DestinationOverviewMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);

  // Clean and simple POI filtering logic
  const filteredPOIs = useMemo(() => {
    // Convert dynamic data to POIs
    const dynamicPOIs = convertToPOIs(hotels, activities, interests, budget);

    // Use static data only as absolute fallback
    if (dynamicPOIs.length === 0 && !isLoading) {
      const cityPOIs = SAMPLE_POIS[destination] || [];
      return interests.length > 0
        ? cityPOIs.filter(poi => interests.includes(poi.type))
        : cityPOIs;
    }

    // Filter by interests if specified
    return interests.length > 0
      ? dynamicPOIs.filter(poi => interests.includes(poi.type))
      : dynamicPOIs;
  }, [destination, interests, budget, hotels, activities, isLoading]);

  const mapCenter = useMemo(() => {
    // If a POI is selected, center on it; otherwise use city center
    if (selectedPOI) {
      return { lat: selectedPOI.lat, lng: selectedPOI.lng };
    }
    return MapDataService.getCityCenter(destination);
  }, [destination, selectedPOI]);

  const handleLocationSelect = (poi: POI) => {
    setSelectedPOI(poi);
    console.log('Location selected:', poi);
    onLocationSelect?.(poi);
  };

  if (!apiKey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapIcon className="w-5 h-5" />
            Destination Overview
          </CardTitle>
          <CardDescription>
            Please configure your Google Maps API key to view the map.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapIcon className="w-5 h-5" />
          {destination} - Points of Interest
        </CardTitle>
        <CardDescription>
          {isLoading ? 'Loading locations...' : `Explore ${destination} based on your interests: ${interests.join(', ')}`}
        </CardDescription>
        <div className="flex flex-wrap gap-2 mt-2">
          {interests.map(interest => (
            <Badge key={interest} className={getTypeColor(interest)}>
              {interest}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-96 w-full rounded-lg overflow-hidden mb-4">
          <APIProvider apiKey={apiKey}>
            <Map
              center={mapCenter}
              defaultZoom={13}
              minZoom={8}
              maxZoom={20}
              gestureHandling="greedy"
              disableDefaultUI={false}
              mapId="destination_overview_map"
              clickableIcons={false}
              keyboardShortcuts={true}
              mapTypeControl={true}
              scaleControl={true}
              streetViewControl={false}
              rotateControl={false}
              fullscreenControl={true}
              zoomControl={true}
              panControl={true}
              draggable={true}
              scrollwheel={true}
            >
              {filteredPOIs.map(poi => (
                <AdvancedMarker
                  key={poi.id}
                  position={{ lat: poi.lat, lng: poi.lng }}
                  title={poi.name}
                  onClick={() => handleLocationSelect(poi)}
                  clickable={true}
                >
                  <div className="relative">
                    <Pin
                      background={getPinColor(poi.type)}
                      borderColor="#ffffff"
                      glyphColor="#ffffff"
                    />
                  </div>
                </AdvancedMarker>
              ))}
            </Map>
          </APIProvider>
        </div>

        {/* Selected Location Details */}
        {selectedPOI && (
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-blue-900 dark:text-blue-100">
                  {selectedPOI.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={`text-xs ${getTypeColor(selectedPOI.type)}`}>
                    {selectedPOI.type}
                  </Badge>
                  {selectedPOI.rating && (
                    <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span>{selectedPOI.rating}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {selectedPOI.duration && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{selectedPOI.duration}</span>
                    </div>
                  )}
                  {selectedPOI.cost && (
                    <div className="flex items-center gap-1">
                      <IndianRupee className={`w-3 h-3 ${getCostColor(selectedPOI.cost)}`} />
                      <span className={getCostColor(selectedPOI.cost)}>
                        {selectedPOI.cost === 'low' ? 'Budget-friendly' : 
                         selectedPOI.cost === 'medium' ? 'Moderate' : 'Premium'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedPOI(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* POI List */}
        {/* <div className="space-y-3">
          <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">
            Available Locations ({filteredPOIs.length})
          </h4>

          {isLoading ? (
            <div className="flex items-center justify-center p-8 text-gray-500">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p className="text-sm">Loading locations...</p>
              </div>
            </div>
          ) : filteredPOIs.length === 0 ? (
            <div className="flex items-center justify-center p-8 text-gray-500">
              <div className="text-center">
                <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm font-medium">No locations found</p>
                <p className="text-xs text-gray-400 mt-1">
                  Try adjusting your interests or budget
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-2 max-h-48 overflow-y-auto">
              {filteredPOIs.map(poi => (
                <div
                  key={poi.id}
                  className={`flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors ${
                    selectedPOI?.id === poi.id ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                  onClick={() => handleLocationSelect(poi)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h5 className="font-medium text-sm">{poi.name}</h5>
                      <Badge variant="outline" className={`text-xs ${getTypeColor(poi.type)}`}>
                        {poi.type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      {poi.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span>{poi.rating}</span>
                        </div>
                      )}
                      {poi.duration && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{poi.duration}</span>
                        </div>
                      )}
                      {poi.cost && (
                        <div className="flex items-center gap-1">
                          <IndianRupee className={`w-3 h-3 ${getCostColor(poi.cost)}`} />
                          <span className={getCostColor(poi.cost)}>{poi.cost}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <MapPin className="w-4 h-4 text-gray-400" />
                </div>
              ))}
            </div>
          )}
        </div> */}

        {/* Quick Book Sections */}
        {(hotels.length > 0 || activities.length > 0) && (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {/* Hotels */}
            <div>
              <h5 className="font-semibold text-sm mb-2">Hotels</h5>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {hotels.slice(0, 8).map((h, idx) => (
                  <div key={`${h.id || h.name || 'hotel'}-${idx}`} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium text-sm">{h.name || h.hotel_name}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <IndianRupee className="w-3 h-3" />
                        <span>{(h.cost || h.cost_per_night || 0).toLocaleString()} /-</span>
                      </div>
                    </div>
                    <button
                      className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
                      onClick={() => onAddToItinerary?.(h, 'hotel')}
                    >
                      Add to Itinerary
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Activities */}
            <div>
              <h5 className="font-semibold text-sm mb-2">Activities</h5>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {activities.slice(0, 10).map((a, idx) => (
                  <div key={`${a.id || a.name || 'activity'}-${idx}`} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium text-sm">{a.name || a.activity_name}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <IndianRupee className="w-3 h-3" />
                        <span>{(a.cost || 0).toLocaleString()} /-</span>
                      </div>
                    </div>
                    <button
                      className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
                      onClick={() => onAddToItinerary?.(a, 'activity')}
                    >
                      Add to Itinerary
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}