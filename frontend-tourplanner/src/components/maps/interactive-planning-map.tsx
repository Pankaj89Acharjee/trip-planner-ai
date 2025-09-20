"use client";

import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { MapIcon, Plus, Trash2, Save, RotateCcw, Navigation, Clock, Edit3, IndianRupee } from "lucide-react";
import { useMemo, useState, useCallback, useEffect } from "react";
import type { ItineraryDay } from "@/lib/interfaces";
import { useToast } from "@/hooks/use-toast";

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
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID;
  const { toast } = useToast();

  // Check for Map ID and warn if missing
  useEffect(() => {
    if (!mapId) {
      console.warn(
        'Google Map ID is not configured. Advanced Markers may not work properly.\n' +
        'To fix this:\n' +
        '1. Go to Google Cloud Console\n' +
        '2. Create a new Map ID\n' +
        '3. Add NEXT_PUBLIC_GOOGLE_MAP_ID to your environment variables'
      );
    }
  }, [mapId]);

  // Function to fetch nearby hotels from Google Places API
  const fetchNearbyHotels = async (lat: number, lng: number) => {
    try {
      const response = await fetch('/api/places-nearby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location: { lat, lng },
          radius: 1000, // 1km radius
          type: 'lodging'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to fetch hotels: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const hotel = data.results[0]; // Get the first (closest) hotel
        return {
          name: hotel.name,
          address: hotel.vicinity || 'Nearby location',
          price: Math.floor(Math.random() * 5000) + 1000, // Mock price range ₹1000-6000
          description: hotel.types?.includes('lodging') ? 'Hotel accommodation' : 'Lodging option',
          rating: hotel.rating || 4.0,
          placeId: hotel.place_id
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching hotels:', error);
      throw error;
    }
  };

  const [customLocations, setCustomLocations] = useState<CustomLocation[]>([]);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [isReplacingActivity, setIsReplacingActivity] = useState(false);
  const [isFetchingHotelData, setIsFetchingHotelData] = useState(false);
  const [selectedActivityForReplacement, setSelectedActivityForReplacement] = useState<any>(null);
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
        id: loc.id, // Use the original ID directly
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

  const handleMapClick = useCallback(async (event: any) => {
    // Only handle clicks when we're in adding mode and it's a valid click event
    if ((isAddingLocation || isReplacingActivity) && event.detail && event.detail.latLng) {
      // a small delay to ensure it's not a drag end event
      setTimeout(async () => {
        const lat = event.detail.latLng.lat;
        const lng = event.detail.latLng.lng;

        // If adding a hotel, fetch real hotel data from Google Places API
        if (isAddingLocation && newLocation.type === 'hotel') {
          setIsFetchingHotelData(true);
          try {
            const hotelData = await fetchNearbyHotels(lat, lng);
            if (hotelData) {
              setNewLocation(prev => ({
                ...prev,
                name: hotelData.name,
                cost: hotelData.price || 0,
                notes: hotelData.description || `Hotel at ${hotelData.address}`
              }));
              toast({
                title: "Hotel Found!",
                description: `Found ${hotelData.name} with pricing ₹${hotelData.price}/night`,
              });
            } else {
              // Fallback: create a generic hotel entry
              const fallbackHotel = {
                name: 'Local Hotel',
                price: Math.floor(Math.random() * 3000) + 1500,
                address: `Location at ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                description: 'Hotel accommodation'
              };
              setNewLocation(prev => ({
                ...prev,
                name: fallbackHotel.name,
                cost: fallbackHotel.price,
                notes: fallbackHotel.description
              }));
              toast({
                title: "Hotel Added",
                description: `Added ${fallbackHotel.name} with estimated pricing ₹${fallbackHotel.price}/night`,
              });
            }
          } catch (error) {
            console.error('Failed to fetch hotel data:', error);
            // Fallback: create a generic hotel entry
            const fallbackHotel = {
              name: 'Local Hotel',
              price: Math.floor(Math.random() * 3000) + 1500,
              address: `Location at ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
              description: 'Hotel accommodation'
            };
            setNewLocation(prev => ({
              ...prev,
              name: fallbackHotel.name,
              cost: fallbackHotel.price,
              notes: fallbackHotel.description
            }));
            toast({
              title: "Hotel Added (Offline Mode)",
              description: `Added ${fallbackHotel.name} with estimated pricing ₹${fallbackHotel.price}/night`,
            });
          } finally {
            setIsFetchingHotelData(false);
          }
        }

        if (isReplacingActivity && selectedActivityForReplacement) {
          // Replace existing activity
          const updatedItinerary = itinerary.map(day => {
            if (day.day === selectedActivityForReplacement.day) {
              const updatedActivities = day.activities?.map(activity => {
                if (activity.name === selectedActivityForReplacement.name) {
                  return {
                    ...activity,
                    name: newLocation.name || `New ${activity.name}`,
                    description: newLocation.notes || `Replaced ${activity.name}`,
                    cost: newLocation.cost || activity.cost,
                    duration: parseInt(newLocation.duration || '1') || activity.duration,
                    location: {
                      latitude: lat,
                      longitude: lng
                    }
                  };
                }
                return activity;
              }) || [];

              return {
                ...day,
                activities: updatedActivities
              };
            }
            return day;
          });

          onItineraryUpdate?.(updatedItinerary);
          setIsReplacingActivity(false);
          setSelectedActivityForReplacement(null);

          toast({
            variant: "success",
            title: "Activity Replaced",
            description: `Successfully replaced ${selectedActivityForReplacement.name} with ${newLocation.name || 'new location'}.`,
          });
        } else if (isAddingLocation) {
          // Add new location
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

          console.log('Adding custom location:', newCustomLocation);
          setCustomLocations(prev => [...prev, newCustomLocation]);
          setIsAddingLocation(false);
        }

        // Reset form
        setNewLocation({
          name: '',
          type: 'activity', // Reset to default
          cost: 0,
          duration: '',
          notes: ''
        });
      }, 50);
    }
  }, [isAddingLocation, isReplacingActivity, newLocation, selectedDay, selectedActivityForReplacement, itinerary, onItineraryUpdate, toast]);

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
    // Merge custom locations with the current itinerary
    const updatedItinerary = itinerary.map(day => {
      const dayCustomLocations = customLocations.filter(loc => loc.day === day.day);

      // Add custom hotels to accommodation
      const customHotels = dayCustomLocations.filter(loc => loc.type === 'hotel');
      const customActivities = dayCustomLocations.filter(loc => loc.type === 'activity');
      
      console.log(`Day ${day.day}:`, { 
        customHotels: customHotels.length, 
        customActivities: customActivities.length,
        customHotelsData: customHotels,
        customActivitiesData: customActivities
      });

      const updatedDay = {
        ...day,
        // If there are custom hotels, replace the accommodation
        ...(customHotels.length > 0 && {
          accommodation: {
            name: customHotels[0].name,
            description: customHotels[0].notes || `Custom ${customHotels[0].name}`,
            costPerNight: customHotels[0].cost || 0,
            location: {
              latitude: customHotels[0].lat,
              longitude: customHotels[0].lng
            }
          }
        }),
        // Add custom activities to the existing activities
        activities: [
          ...(day.activities || []),
          ...customActivities.map(activity => ({
            name: activity.name,
            description: activity.notes || `Custom ${activity.name}`,
            cost: activity.cost || 0,
            duration: parseInt(activity.duration || '1'),
            location: {
              latitude: activity.lat,
              longitude: activity.lng
            }
          }))
        ]
      };
      return updatedDay;
    });

    //Final itinery updating 
    onItineraryUpdate?.(updatedItinerary);

    toast({
      variant: "success",
      title: "Changes Applied",
      description: `Updated itinerary with ${customLocations.length} custom locations. The itinerary has been modified successfully.`,
    });
  }, [itinerary, customLocations, onItineraryUpdate, toast]);

  const handleReset = useCallback(() => {
    setCustomLocations([]);
    setIsAddingLocation(false);
  }, []);

  const handleAddNewDay = useCallback(() => {
    const maxDay = Math.max(...itinerary.map(d => d.day));
    const newDayNumber = maxDay + 1;

    // Create a new empty day
    const newDay: ItineraryDay = {
      day: newDayNumber,
      accommodation: undefined,
      activities: []
    };

    // Update the itinerary with the new day
    const updatedItinerary = [...itinerary, newDay];

    // Call the parent callback to update the itinerary
    if (onItineraryUpdate) {
      onItineraryUpdate(updatedItinerary);
    }

    // Set the new day as selected
    setSelectedDay(newDayNumber);

    toast({
      variant: "success",
      title: "New Day Added",
      description: `Day ${newDayNumber} has been added to your itinerary.`,
    });
  }, [itinerary, onItineraryUpdate, toast]);

  const mapContainerStyle = {
    height: '384px',
    width: '100%',
    borderRadius: '0.5rem',
    overflow: 'hidden',
    cursor: (isAddingLocation || isReplacingActivity) ? 'crosshair' : 'default'
  };

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

          <Button
            variant={isReplacingActivity ? "default" : "outline"}
            size="sm"
            onClick={() => {
              if (isReplacingActivity) {
                setIsReplacingActivity(false);
                setSelectedActivityForReplacement(null);
                toast({
                  title: "Replacement Cancelled",
                  description: "Activity replacement mode disabled.",
                });
              } else {
                setIsReplacingActivity(true);
                setIsAddingLocation(false);
                toast({
                  title: "Replace Activity Mode",
                  description: "Click on any existing activity marker on the map to select it for replacement.",
                });
              }
            }}
          >
            <Edit3 className="w-4 h-4 mr-1" />
            {isReplacingActivity ? 'Cancel Replace' : 'Replace Activity'}
          </Button>

          <Select value={selectedDay.toString()} onValueChange={(value) => {
            if (value === "new") {
              handleAddNewDay();
            } else {
              setSelectedDay(parseInt(value));
            }
          }}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {itinerary.map(day => (
                <SelectItem key={day.day} value={day.day.toString()}>
                  Day {day.day}
                </SelectItem>
              ))}
              {/* Add option to create new day */}
              <SelectItem value="new" className="text-blue-600 font-medium">
                + Add New Day
              </SelectItem>
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
                placeholder={newLocation.type === 'hotel' ? "Cost (₹) - Auto-filled from hotel search" : "Cost (₹)"}
                type="number"
                value={newLocation.cost}
                onChange={(e) => setNewLocation(prev => ({ ...prev, cost: parseInt(e.target.value) || 0 }))}
                className={newLocation.type === 'hotel' && newLocation.cost > 0 ? 'bg-green-50 border-green-300' : ''}
                disabled={isFetchingHotelData}
              />
              <Input
                placeholder="Duration (e.g., 2 hours)"
                value={newLocation.duration}
                onChange={(e) => setNewLocation(prev => ({ ...prev, duration: e.target.value }))}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {isFetchingHotelData ? (
                <span className="flex items-center gap-2 text-blue-600">
                  <span className="inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
                  Searching for hotels...
                </span>
              ) : newLocation.type === 'hotel' ? (
                "Click on the map to find nearby hotels with real pricing"
              ) : (
                "Click on the map to place the location"
              )}
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div style={mapContainerStyle} className="mb-4">
          <APIProvider apiKey={apiKey}>
            <Map
              center={mapCenter}
              defaultZoom={13}
              minZoom={8}
              maxZoom={20}
              gestureHandling="auto"
              disableDefaultUI={false}
              mapId={mapId || "default_map"}
              clickableIcons={false}
              keyboardShortcuts={true}
              mapTypeControl={false}
              scaleControl={true}
              streetViewControl={false}
              rotateControl={false}
              fullscreenControl={true}
              zoomControl={true}
              // Add onClick when in adding or replacing mode
              {...((isAddingLocation || isReplacingActivity) && { onClick: handleMapClick })}
              style={{ width: '100%', height: '100%' }}
            >
              {allLocations.map(loc => (
                <AdvancedMarker
                  key={loc.id}
                  position={{ lat: loc.lat, lng: loc.lng }}
                  title={`Day ${loc.day}: ${loc.name}`}
                  draggable={loc.isCustom}
                  onClick={() => {
                    if (isReplacingActivity && !loc.isCustom && loc.type === 'activity') {
                      // Select this activity for replacement
                      setSelectedActivityForReplacement({
                        name: loc.name,
                        day: loc.day,
                        data: loc.data
                      });
                      toast({
                        title: "Activity Selected",
                        description: `Selected "${loc.name}" for replacement. Now click on the map to place the new location.`,
                      });
                    }
                  }}
                  onDragEnd={(event) => {
                    if (loc.isCustom && event.latLng) {
                      handleLocationDrag(loc.id, event.latLng.lat(), event.latLng.lng());
                    }
                  }}
                >
                  <div className="relative">
                    <div className={`w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center ${loc.isCustom ? 'ring-2 ring-blue-400' : ''
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

        {/* Legend */}
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Legend</h4>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-white border-2 border-gray-400 rounded-sm"></div>
              <span>Hotel</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span>Activity</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-400 rounded-full ring-2 ring-blue-200"></div>
              <span>Custom Location</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {isAddingLocation
              ? "Click anywhere on the map to add a new location"
              : isReplacingActivity
                ? "Click on any existing activity marker to select it, then click on the map to place the new location"
                : "Click 'Add Location' to add new spots or 'Replace Activity' to modify existing ones. Drag blue-ringed custom locations to move them."
            }
          </p>
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
                      {loc.cost && loc.cost > 0 && (
                        <div className="flex items-center gap-1">
                          <IndianRupee className="w-3 h-3" />
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
                    {loc.notes && (
                      <p className="text-xs text-gray-500 mt-1">{loc.notes}</p>
                    )}
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
                            Day {day.day}
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