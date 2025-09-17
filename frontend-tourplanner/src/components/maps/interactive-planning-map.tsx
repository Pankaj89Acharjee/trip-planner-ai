"use client";

import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { MapIcon, Plus, Trash2, Save, RotateCcw, Navigation, Clock, DollarSign } from "lucide-react";
import { useMemo, useState, useCallback } from "react";
import type { ItineraryDay } from "@/lib/interfaces";

interface CustomLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  day: number;
  type: 'hotel' | 'activity';
  cost?: number;
  duration?: string;
  notes?: string;
}

interface InteractivePlanningMapProps {
  itinerary: ItineraryDay[];
  onItineraryUpdate?: (updatedItinerary: ItineraryDay[]) => void;
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

export function InteractivePlanningMap({ itinerary, onItineraryUpdate }: InteractivePlanningMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [customLocations, setCustomLocations] = useState<CustomLocation[]>([]);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [newLocation, setNewLocation] = useState({
    name: '',
    type: 'activity' as 'hotel' | 'activity',
    cost: 0,
    duration: '',
    notes: ''
  });

  const allLocations = useMemo(() => {
    const locations: Array<{
      id: string;
      name: string;
      lat: number;
      lng: number;
      day: number;
      type: 'hotel' | 'activity';
      data: any;
      isCustom: boolean;
    }> = [];

    // Add original itinerary locations
    itinerary.forEach(day => {
      if (day.accommodation?.location) {
        locations.push({
          id: `original-day${day.day}-hotel`,
          name: day.accommodation.name,
          lat: day.accommodation.location.latitude,
          lng: day.accommodation.location.longitude,
          day: day.day,
          type: 'hotel',
          data: day.accommodation,
          isCustom: false
        });
      }

      day.activities?.forEach((activity, index) => {
        if (activity.location) {
          locations.push({
            id: `original-day${day.day}-activity-${index}`,
            name: activity.name,
            lat: activity.location.latitude,
            lng: activity.location.longitude,
            day: day.day,
            type: 'activity',
            data: activity,
            isCustom: false
          });
        }
      });
    });

    // Add custom locations
    customLocations.forEach(loc => {
      locations.push({
        id: `custom-${loc.id}`,
        name: loc.name,
        lat: loc.lat,
        lng: loc.lng,
        day: loc.day,
        type: loc.type,
        data: loc,
        isCustom: true
      });
    });

    return locations;
  }, [itinerary, customLocations]);

  const mapCenter = useMemo(() => {
    if (allLocations.length > 0) {
      const avgLat = allLocations.reduce((sum, loc) => sum + loc.lat, 0) / allLocations.length;
      const avgLng = allLocations.reduce((sum, loc) => sum + loc.lng, 0) / allLocations.length;
      return { lat: avgLat, lng: avgLng };
    }
    return { lat: 28.6139, lng: 77.2090 };
  }, [allLocations]);

  const handleMapClick = useCallback((event: any) => {
    if (isAddingLocation) {
      const lat = event.detail.latLng.lat;
      const lng = event.detail.latLng.lng;
      
      const newCustomLocation: CustomLocation = {
        id: `custom-${Date.now()}`,
        name: newLocation.name || `Custom ${newLocation.type}`,
        lat,
        lng,
        day: selectedDay,
        type: newLocation.type,
        cost: newLocation.cost,
        duration: newLocation.duration,
        notes: newLocation.notes
      };

      setCustomLocations(prev => [...prev, newCustomLocation]);
      setIsAddingLocation(false);
      setNewLocation({
        name: '',
        type: 'activity',
        cost: 0,
        duration: '',
        notes: ''
      });
    }
  }, [isAddingLocation, newLocation, selectedDay]);

  const handleLocationDrag = useCallback((locationId: string, newLat: number, newLng: number) => {
    setCustomLocations(prev => 
      prev.map(loc => 
        loc.id === locationId 
          ? { ...loc, lat: newLat, lng: newLng }
          : loc
      )
    );
  }, []);

  const handleDeleteLocation = useCallback((locationId: string) => {
    setCustomLocations(prev => prev.filter(loc => loc.id !== locationId));
  }, []);

  const handleMoveToDay = useCallback((locationId: string, newDay: number) => {
    setCustomLocations(prev => 
      prev.map(loc => 
        loc.id === locationId 
          ? { ...loc, day: newDay }
          : loc
      )
    );
  }, []);

  const handleSaveChanges = useCallback(() => {
    // Here you would typically send the updated itinerary to your backend
    // For now, we'll just call the callback with the current state
    onItineraryUpdate?.(itinerary);
  }, [itinerary, onItineraryUpdate]);

  const handleReset = useCallback(() => {
    setCustomLocations([]);
    setIsAddingLocation(false);
  }, []);

  if (!apiKey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapIcon className="w-5 h-5" />
            Interactive Planning
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
          Interactive Trip Planning
        </CardTitle>
        <CardDescription>
          Drag locations, add new spots, and customize your itinerary
        </CardDescription>
        
        {/* Controls */}
        <div className="flex flex-wrap gap-2 mt-3">
          <Button
            variant={isAddingLocation ? "default" : "outline"}
            size="sm"
            onClick={() => setIsAddingLocation(!isAddingLocation)}
          >
            <Plus className="w-4 h-4 mr-1" />
            {isAddingLocation ? 'Cancel' : 'Add Location'}
          </Button>
          
          <Select value={selectedDay.toString()} onValueChange={(value) => setSelectedDay(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {itinerary.map(day => (
                <SelectItem key={day.day} value={day.day.toString()}>
                  Day {day.day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={handleSaveChanges}>
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>
          
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset
          </Button>
        </div>

        {/* Add Location Form */}
        {isAddingLocation && (
          <div className="mt-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
            <h4 className="font-semibold mb-3">Add New Location</h4>
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Location name"
                value={newLocation.name}
                onChange={(e) => setNewLocation(prev => ({ ...prev, name: e.target.value }))}
              />
              <Select value={newLocation.type} onValueChange={(value: 'hotel' | 'activity') => 
                setNewLocation(prev => ({ ...prev, type: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activity">Activity</SelectItem>
                  <SelectItem value="hotel">Hotel</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Cost (₹)"
                type="number"
                value={newLocation.cost}
                onChange={(e) => setNewLocation(prev => ({ ...prev, cost: parseInt(e.target.value) || 0 }))}
              />
              <Input
                placeholder="Duration (e.g., 2 hours)"
                value={newLocation.duration}
                onChange={(e) => setNewLocation(prev => ({ ...prev, duration: e.target.value }))}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Click on the map to place the location
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-96 w-full rounded-lg overflow-hidden mb-4">
          <APIProvider apiKey={apiKey}>
            <Map
              center={mapCenter}
              defaultZoom={13}
              gestureHandling="greedy"
              disableDefaultUI={false}
              mapId="interactive_planning_map"
              onClick={handleMapClick}
            >
              {allLocations.map(loc => (
                <AdvancedMarker 
                  key={loc.id} 
                  position={{ lat: loc.lat, lng: loc.lng }}
                  title={`Day ${loc.day}: ${loc.name}`}
                  draggable={loc.isCustom}
                  onDragEnd={(event) => {
                    if (loc.isCustom && event.detail.latLng) {
                      handleLocationDrag(loc.id, event.detail.latLng.lat, event.detail.latLng.lng);
                    }
                  }}
                >
                  <div className="relative">
                    <div className={`w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center ${
                      loc.isCustom ? 'ring-2 ring-blue-400' : ''
                    } ${getDayColor(loc.day)}`}>
                      {loc.type === 'hotel' ? (
                        <div className="w-4 h-4 bg-white rounded-sm"></div>
                      ) : (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                    {loc.isCustom && (
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                        Custom
                      </div>
                    )}
                  </div>
                </AdvancedMarker>
              ))}
            </Map>
          </APIProvider>
        </div>

        {/* Custom Locations List */}
        {customLocations.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Custom Locations ({customLocations.length})</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {customLocations.map(loc => (
                <div key={loc.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h5 className="font-medium text-sm">{loc.name}</h5>
                      <Badge variant="outline" className={getDayColor(loc.day)}>
                        Day {loc.day}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {loc.type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      {loc.cost > 0 && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          <span>₹{loc.cost}</span>
                        </div>
                      )}
                      {loc.duration && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{loc.duration}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Select value={loc.day.toString()} onValueChange={(value) => 
                      handleMoveToDay(loc.id, parseInt(value))
                    }>
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {itinerary.map(day => (
                          <SelectItem key={day.day} value={day.day.toString()}>
                            {day.day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteLocation(loc.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

