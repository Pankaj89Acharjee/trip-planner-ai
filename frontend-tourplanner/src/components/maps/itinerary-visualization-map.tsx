"use client";

import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { MapIcon, Hotel, MapPin, Clock, Route, Navigation } from "lucide-react";
import { useMemo, useState } from "react";
import type { ItineraryDay } from "@/lib/interfaces";

interface ItineraryVisualizationMapProps {
  itinerary: ItineraryDay[];
  onLocationClick?: (location: any, day: number, type: 'hotel' | 'activity') => void;
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

const getTypeIcon = (type: 'hotel' | 'activity') => {
  return type === 'hotel' ? Hotel : MapPin;
};

export function ItineraryVisualizationMap({ itinerary, onLocationClick }: ItineraryVisualizationMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

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

  const getRouteOptimization = () => {
    // Simple route optimization - group by day and sort by proximity
    const dayGroups: Record<number, typeof allLocations> = {};
    
    allLocations.forEach(loc => {
      if (!dayGroups[loc.day]) {
        dayGroups[loc.day] = [];
      }
      dayGroups[loc.day].push(loc);
    });

    // For each day, sort locations by proximity to create an optimal route
    Object.keys(dayGroups).forEach(day => {
      const dayNum = parseInt(day);
      const locations = dayGroups[dayNum];
      
      if (locations.length > 1) {
        // Simple nearest neighbor algorithm
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
        
        dayGroups[dayNum] = sorted;
      }
    });

    return dayGroups;
  };

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapIcon className="w-5 h-5" />
          Your Trip Route
        </CardTitle>
        <CardDescription>
          Visualize your {itinerary.length}-day itinerary with optimized routes
        </CardDescription>
        
        {/* Day Filter */}
        <div className="flex flex-wrap gap-2 mt-3">
          <Button
            variant={selectedDay === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedDay(null)}
          >
            All Days
          </Button>
          {itinerary.map(day => (
            <Button
              key={day.day}
              variant={selectedDay === day.day ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDay(day.day)}
              className={selectedDay === day.day ? getDayColor(day.day) : ""}
            >
              Day {day.day}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-96 w-full rounded-lg overflow-hidden mb-4">
          <APIProvider apiKey={apiKey}>
            <Map
              center={mapCenter}
              defaultZoom={selectedDay !== null ? 14 : 12}
              gestureHandling="greedy"
              disableDefaultUI={false}
              mapId="itinerary_visualization_map"
            >
              {filteredLocations.map(loc => {
                const IconComponent = getTypeIcon(loc.type);
                return (
                  <AdvancedMarker 
                    key={loc.id} 
                    position={{ lat: loc.lat, lng: loc.lng }}
                    title={`Day ${loc.day}: ${loc.name}`}
                    onClick={() => onLocationClick?.(loc.data, loc.day, loc.type)}
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
            </Map>
          </APIProvider>
        </div>

        {/* Route Information */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Route className="w-4 h-4 text-blue-500" />
            <h4 className="font-semibold text-sm">Route Information</h4>
          </div>
          
          {selectedDay !== null ? (
            <div className="space-y-2">
              <Badge variant="outline" className={getDayColor(selectedDay)}>
                Day {selectedDay} - {filteredLocations.length} locations
              </Badge>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {filteredLocations.map((loc, index) => (
                  <div key={loc.id} className="flex items-center gap-2 py-1">
                    <span className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </span>
                    <span>{loc.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {loc.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-green-500" />
                <span>Total Locations: {allLocations.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span>Duration: {itinerary.length} days</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

