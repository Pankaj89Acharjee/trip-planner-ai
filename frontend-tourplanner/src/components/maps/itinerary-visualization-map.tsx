"use client";

import { APIProvider, Map, AdvancedMarker, Pin, useMap } from "@vis.gl/react-google-maps";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { MapIcon, Hotel, MapPin, Clock, Route, Navigation, Car } from "lucide-react";
import { useMemo, useState, useEffect, useRef } from "react";
import type { ItineraryDay } from "@/lib/interfaces";

// Extend window to include Google Maps
declare global {
  interface Window {
    google: typeof google;
  }
}

interface ItineraryVisualizationMapProps {
  itinerary: ItineraryDay[];
  onLocationClick?: (location: any, day: number, type: 'hotel' | 'activity') => void;
}

interface RouteInfo {
  distance: string;
  duration: string;
  waypoints: Array<{ lat: number; lng: number }>;
}

interface DayRoute {
  day: number;
  route: RouteInfo | null;
  locations: Array<{
    id: string;
    name: string;
    lat: number;
    lng: number;
    type: 'hotel' | 'activity';
    data: any;
  }>;
}

const getDayColor = (day: number) => {
  const colors = [
    'bg-red-500',
    'bg-blue-500', 
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-orange-500'
  ];
  return colors[day % colors.length];
};

const getDayColorHex = (day: number) => {
  const colors = [
    '#ef4444', // red-500
    '#3b82f6', // blue-500
    '#10b981', // green-500
    '#eab308', // yellow-500
    '#8b5cf6', // purple-500
    '#ec4899', // pink-500
    '#6366f1', // indigo-500
    '#f97316'  // orange-500
  ];
  return colors[day % colors.length];
};

const getTypeIcon = (type: 'hotel' | 'activity') => {
  return type === 'hotel' ? Hotel : MapPin;
};


const getDirectionsFromService = async (origin: string, destination: string, waypoints?: Array<{ lat: number; lng: number }>): Promise<RouteInfo | null> => {
  return new Promise((resolve) => {
    if (!window.google || !window.google.maps) {
      console.error('Google Maps API not loaded');
      resolve(null);
      return;
    }

    const directionsService = new window.google.maps.DirectionsService();
    const directionsRenderer = new window.google.maps.DirectionsRenderer();

    const request: google.maps.DirectionsRequest = {
      origin: origin,
      destination: destination,
      travelMode: google.maps.TravelMode.DRIVING,
      optimizeWaypoints: true,
    };

    if (waypoints && waypoints.length > 0) {
      request.waypoints = waypoints.map(wp => ({
        location: new google.maps.LatLng(wp.lat, wp.lng),
        stopover: true
      }));
    }

    directionsService.route(request, (result, status) => {
      if (status === google.maps.DirectionsStatus.OK && result) {
        const route = result.routes[0];
        const leg = route.legs[0];
        
        if (leg.distance && leg.duration) {
          resolve({
            distance: leg.distance.text,
            duration: leg.duration.text,
            waypoints: route.overview_path.map((point) => ({
              lat: point.lat(),
              lng: point.lng()
            }))
          });
        } else {
          console.error('Route leg missing distance or duration');
          resolve(null);
        }
      } else if (status === google.maps.DirectionsStatus.ZERO_RESULTS) {
        console.warn('No route found between locations, using straight-line distance');
        // Fallback to straight-line calculation
        const waypointsList = waypoints || [];
        const totalDistance = waypointsList.length > 0 ? 
          getDistance({ lat: parseFloat(origin.split(',')[0]), lng: parseFloat(origin.split(',')[1]) }, 
                     { lat: parseFloat(destination.split(',')[0]), lng: parseFloat(destination.split(',')[1]) }) : 0;
        const estimatedDuration = Math.round((totalDistance / 30) * 60);
        
        resolve({
          distance: `${totalDistance.toFixed(1)} km`,
          duration: `${estimatedDuration} min`,
          waypoints: waypointsList.map(wp => ({ lat: wp.lat, lng: wp.lng }))
        });
      } else {
        console.error('Directions request failed:', status);
        resolve(null);
      }
    });
  });
};

const getDistance = (loc1: { lat: number; lng: number }, loc2: { lat: number; lng: number }) => {
  const R = 6371; // Earth's radius in km
  const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
  const dLng = (loc2.lng - loc1.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

function MapContent({ itinerary, onLocationClick, selectedDay, dayRoutes, filteredLocations }: {
  itinerary: ItineraryDay[];
  onLocationClick?: (location: any, day: number, type: 'hotel' | 'activity') => void;
  selectedDay: number | null;
  dayRoutes: DayRoute[];
  filteredLocations: any[];
}) {
  const map = useMap();
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  // Draw polylines on map
  useEffect(() => {
    if (!map || dayRoutes.length === 0) return;

    // Clear existing polylines
    polylinesRef.current.forEach(polyline => polyline.setMap(null));
    polylinesRef.current = [];

    // Draw new polylines
    dayRoutes.forEach(dayRoute => {
      if (dayRoute.route?.waypoints) {
        const polyline = new google.maps.Polyline({
          path: dayRoute.route.waypoints,
          strokeColor: getDayColorHex(dayRoute.day),
          strokeOpacity: selectedDay === null ? 0.6 : (selectedDay === dayRoute.day ? 0.8 : 0.3),
          strokeWeight: selectedDay === null ? 3 : (selectedDay === dayRoute.day ? 4 : 2),
          map: map
        });
        polylinesRef.current.push(polyline);
      }
    });
  }, [map, dayRoutes, selectedDay]);

  return (
    <>
      {filteredLocations.map(loc => {
        const IconComponent = getTypeIcon(loc.type);
        return (
          <AdvancedMarker 
            key={loc.id} 
            position={{ lat: loc.lat, lng: loc.lng }}
            title={`Day ${loc.day}: ${loc.name}`}
            onClick={() => onLocationClick?.(loc.data, loc.day, loc.type)}
            clickable={true}
          >
            <div className="relative">
              <div className={`w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center ${getDayColor(loc.day)}`}>
                <IconComponent className="w-4 h-4 text-white" />
              </div>
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                Day {loc.day}
              </div>
            </div>
          </AdvancedMarker>
        );
      })}
    </>
  );
}

export function ItineraryVisualizationMap({ itinerary, onLocationClick }: ItineraryVisualizationMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [dayRoutes, setDayRoutes] = useState<DayRoute[]>([]);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);

  const allLocations = useMemo(() => {
    const locations: Array<{
      id: string;
      name: string;
      lat: number;
      lng: number;
      day: number;
      type: 'hotel' | 'activity';
      data: any;
    }> = [];

    itinerary.forEach(day => {
      // Add hotel/accommodation
      if (day.accommodation?.location) {
        locations.push({
          id: `day${day.day}-hotel`,
          name: day.accommodation.name,
          lat: day.accommodation.location.latitude,
          lng: day.accommodation.location.longitude,
          day: day.day,
          type: 'hotel',
          data: day.accommodation
        });
      }

      // Add activities
      day.activities?.forEach((activity, index) => {
        if (activity.location) {
          locations.push({
            id: `day${day.day}-activity-${index}`,
            name: activity.name,
            lat: activity.location.latitude,
            lng: activity.location.longitude,
            day: day.day,
            type: 'activity',
            data: activity
          });
        }
      });
    });

    return locations;
  }, [itinerary]);

  const mapCenter = useMemo(() => {
    if (allLocations.length > 0) {
      const avgLat = allLocations.reduce((sum, loc) => sum + loc.lat, 0) / allLocations.length;
      const avgLng = allLocations.reduce((sum, loc) => sum + loc.lng, 0) / allLocations.length;
      return { lat: avgLat, lng: avgLng };
    }
    return { lat: 28.6139, lng: 77.2090 };
  }, [allLocations]);

  const filteredLocations = useMemo(() => {
    if (selectedDay === null) return allLocations;
    return allLocations.filter(loc => loc.day === selectedDay);
  }, [allLocations, selectedDay]);

  // Optimize routes for each day using Google Directions API
  const optimizeRoutes = async () => {
    if (!apiKey || allLocations.length === 0) return;
    
    setIsLoadingRoutes(true);
    const optimizedRoutes: DayRoute[] = [];
    
    // Group locations by day
    const dayGroups: Record<number, typeof allLocations> = {};
    allLocations.forEach(loc => {
      if (!dayGroups[loc.day]) {
        dayGroups[loc.day] = [];
      }
      dayGroups[loc.day].push(loc);
    });

    // Process each day
    for (const [dayStr, locations] of Object.entries(dayGroups)) {
      const day = parseInt(dayStr);
      
      if (locations.length === 0) {
        optimizedRoutes.push({ day, route: null, locations: [] });
        continue;
      }
      
      if (locations.length === 1) {
        optimizedRoutes.push({ day, route: null, locations });
        continue;
      }

      // Sort locations by proximity (nearest neighbor)
      const sorted = [locations[0]];
      const remaining = locations.slice(1);
      
      while (remaining.length > 0) {
        const lastLocation = sorted[sorted.length - 1];
        const nearestIndex = remaining.reduce((minIndex, loc, index) => {
          const minDistance = getDistance(lastLocation, remaining[minIndex]);
          const currentDistance = getDistance(lastLocation, loc);
          return currentDistance < minDistance ? index : minIndex;
        }, 0);
        
        sorted.push(remaining[nearestIndex]);
        remaining.splice(nearestIndex, 1);
      }

      // Get directions for optimized route
      const origin = `${sorted[0].lat},${sorted[0].lng}`;
      const destination = `${sorted[sorted.length - 1].lat},${sorted[sorted.length - 1].lng}`;
      const waypoints = sorted.slice(1, -1).map(loc => ({ lat: loc.lat, lng: loc.lng }));
      
      const route = await getDirectionsFromService(origin, destination, waypoints);
      optimizedRoutes.push({ day, route, locations: sorted });
    }
    
    setDayRoutes(optimizedRoutes);
    setIsLoadingRoutes(false);
  };

  // Fetch routes when itinerary changes
  useEffect(() => {
    optimizeRoutes();
  }, [itinerary, apiKey]);


  const getDistance = (loc1: any, loc2: any) => {
    const R = 6371; // Earth's radius in km
    const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
    const dLng = (loc2.lng - loc1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  if (!apiKey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapIcon className="w-5 h-5" />
            Itinerary Map
          </CardTitle>
          <CardDescription>
            Please configure your Google Maps API key to view the map.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapIcon className="w-5 h-5" />
          Your Trip Route
        </CardTitle>
        <CardDescription className="text-sm">
          Visualize your {itinerary.length}-day itinerary with optimized routes
          {isLoadingRoutes && (
            <span className="ml-2 text-blue-500 text-sm">🔄 Optimizing routes...</span>
          )}
        </CardDescription>
        
        {/* Day Filter */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            variant={selectedDay === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedDay(null)}
            className="text-xs"
          >
            All Days
          </Button>
          {itinerary.map(day => (
            <Button
              key={day.day}
              variant={selectedDay === day.day ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDay(day.day)}
              className={`text-xs ${selectedDay === day.day ? getDayColor(day.day) : ""}`}
            >
              Day {day.day}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-96 w-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 mb-4">
          <APIProvider apiKey={apiKey}>
            <Map
              center={mapCenter}
              defaultZoom={selectedDay !== null ? 15 : 13}
              minZoom={8}
              maxZoom={20}
              gestureHandling="greedy"
              disableDefaultUI={false}
              mapId="itinerary_visualization_map"
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
              <MapContent
                itinerary={itinerary}
                onLocationClick={onLocationClick}
                selectedDay={selectedDay}
                dayRoutes={dayRoutes}
                filteredLocations={filteredLocations}
              />
            </Map>
          </APIProvider>
        </div>

        {/* Route Information */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Route className="w-4 h-4 text-blue-500" />
            <h4 className="font-semibold text-sm">Route Information</h4>
          </div>
          
          {selectedDay !== null ? (
            <div className="space-y-3">
              {(() => {
                const dayRoute = dayRoutes.find(route => route.day === selectedDay);
                return (
                  <>
                    <Badge variant="outline" className={`${getDayColor(selectedDay)} text-xs`}>
                      Day {selectedDay} - {filteredLocations.length} locations
                    </Badge>
                    
                    {dayRoute?.route && (
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Car className="w-4 h-4 text-green-500" />
                          <span className="text-xs">{dayRoute.route.distance}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-blue-500" />
                          <span className="text-xs">{dayRoute.route.duration}</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {dayRoute?.locations.map((loc, index) => (
                        <div key={loc.id} className="flex items-center gap-2 py-1 text-xs">
                          <span className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium flex-shrink-0">
                            {index + 1}
                          </span>
                          <span className="truncate flex-1">{loc.name}</span>
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            {loc.type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-green-500" />
                  <span className="text-xs">Total Locations: {allLocations.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span className="text-xs">Duration: {itinerary.length} days</span>
                </div>
              </div>
              
              {dayRoutes.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300">Daily Routes:</div>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {dayRoutes.map(dayRoute => (
                      <div key={dayRoute.day} className="flex items-center justify-between text-xs py-1">
                        <span className="font-medium">Day {dayRoute.day}:</span>
                        {dayRoute.route ? (
                          <span className="text-green-600 dark:text-green-400 text-xs">
                            {dayRoute.route.distance} • {dayRoute.route.duration}
                          </span>
                        ) : (
                          <span className="text-gray-500 text-xs">Single location</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

