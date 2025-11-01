"use client";

import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { itinerarySyncService, createBookingData } from "@/lib/itinerarySyncService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { DestinationOverviewMap } from "./destination-overview-map";
import { ItineraryVisualizationMap } from "./itinerary-visualization-map";
import { InteractivePlanningMap } from "./interactive-planning-map";
import { MapDataService, type MapDataResponse } from "@/lib/mapDataService";
import type { ItineraryDay } from "@/lib/interfaces";

interface ComprehensiveMapProps {
  // For destination overview
  destination?: string;
  interests?: string[];
  budget?: number;
  userUid?: string;

  // For itinerary visualization and planning
  itinerary?: ItineraryDay[];

  // Callbacks
  onLocationSelect?: (location: any) => void;
  onItineraryUpdate?: (updatedItinerary: ItineraryDay[]) => void;
  onDestinationChange?: (destination: string) => void;
}

export function ComprehensiveMap({ destination, interests = [], budget = 0, userUid, itinerary = [], onLocationSelect, onItineraryUpdate, onDestinationChange
}: ComprehensiveMapProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [localDestination, setLocalDestination] = useState(destination || "Delhi");
  const [tempItinerary, setTempItinerary] = useState<ItineraryDay[]>([]);
  const [mapData, setMapData] = useState<MapDataResponse>({
    hotels: [],
    activities: [],
    isLoading: false
  });
  const { toast } = useToast();

  // Keep local destination in sync with prop changes
  useEffect(() => {
    if (destination && destination !== localDestination) {
      setLocalDestination(destination);
    }
  }, [destination]);

  // Fetch dynamic data when destination, interests, or budget changes (with debouncing)
  useEffect(() => {
    if (localDestination && interests.length > 0 && budget > 0 && userUid) {
      setMapData(prev => ({ ...prev, isLoading: true }));

      // Debounce the API call to prevent excessive requests
      const timeoutId = setTimeout(() => {
        MapDataService.fetchLocationData(localDestination, interests, budget, userUid)
          .then(data => {
            setMapData(data);
          })
          .catch(error => {
            console.error('Error fetching map data:', error);
            setMapData({
              hotels: [],
              activities: [],
              isLoading: false,
              error: error.message
            });
          });
      }, 2000); 

      return () => clearTimeout(timeoutId);
    }
  }, [localDestination, interests, budget, userUid]);

  // Derive a default itinerary from fetched map data if none provided
  const effectiveItinerary = useMemo(() => {
    // If we have a base itinerary and also temp additions, merge temp day 1 changes into base
    if ((itinerary && itinerary.length > 0) || (tempItinerary.length > 0)) {
      if (itinerary && itinerary.length > 0 && tempItinerary.length > 0) {
        const tempDay1 = tempItinerary.find(d => d.day === 1);
        if (tempDay1) {
          const merged = itinerary.map(d => {
            if (d.day === 1) {
              return {
                ...d,
                accommodation: tempDay1.accommodation || d.accommodation,
                activities: [...(d.activities || []), ...((tempDay1.activities) || [])]
              };
            }
            return d;
          });
          return merged;
        }
      }
      return (itinerary && itinerary.length > 0) ? itinerary : tempItinerary;
    }
    if (mapData.hotels.length === 0 && mapData.activities.length === 0) return [] as ItineraryDay[];

    const topHotel = mapData.hotels[0];
    const topActivities = mapData.activities.slice(0, 3);
    const day1: ItineraryDay = {
      day: 1,
      accommodation: topHotel
        ? {
            name: topHotel.name,
            description: topHotel.description || 'Suggested hotel',
            costPerNight: topHotel.cost || 0,
            location: { latitude: topHotel.latitude, longitude: topHotel.longitude },
          }
        : undefined,
      activities: topActivities.map((a) => ({
        name: a.name,
        description: a.description || 'Suggested activity',
        cost: a.cost || 0,
        duration: 2,
        location: { latitude: a.latitude, longitude: a.longitude },
      })),
    };
    return [day1];
  }, [itinerary, tempItinerary, mapData.hotels, mapData.activities]);

  
  const showOverview = localDestination && interests.length > 0;
  const showVisualization = true; 
  const showPlanning = true; 

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <div className="flex flex-col w-full gap-2 mb-6 ">
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="border rounded px-3 py-2 text-sm w-64"
            placeholder="Search destination (e.g., Agra, Mumbai)"
            value={localDestination}
            onChange={(e) => setLocalDestination(e.target.value)}
          />
          <button
            className="px-3 py-2 text-sm rounded-md border bg-primary text-primary-foreground"
            onClick={() => {
              if (!localDestination) {
                toast({ title: 'Enter a destination', variant: 'destructive' });
                return;
              }
              onDestinationChange?.(localDestination);
              setActiveTab('overview');
            }}
          >
            Search
          </button>
        </div>
        {showOverview && (
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 text-sm rounded-md border transition-colors ${
              activeTab === "overview" 
                ? "bg-primary text-primary-foreground border-primary" 
                : "bg-background border-border hover:bg-muted"
            }`}
          >
            Destination Overview
          </button>
        )}
        {showVisualization && (
          <button
            onClick={() => setActiveTab("visualization")}
            disabled={effectiveItinerary.length === 0}
            className={`px-4 py-2 text-sm rounded-md border transition-colors ${
              activeTab === "visualization" 
                ? "bg-primary text-primary-foreground border-primary" 
                : "bg-background border-border hover:bg-muted"
            } ${effectiveItinerary.length === 0 ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            Trip Route
          </button>
        )}
        {showPlanning && (
          <button
            onClick={() => setActiveTab("planning")}
            disabled={effectiveItinerary.length === 0}
            className={`px-4 py-2 text-sm rounded-md border transition-colors ${
              activeTab === "planning" 
                ? "bg-primary text-primary-foreground border-primary" 
                : "bg-background border-border hover:bg-muted"
            } ${effectiveItinerary.length === 0 ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            Interactive Planning
          </button>
        )}
      </div>

      {showOverview && (
        <TabsContent value="overview" className="mt-4">
          <DestinationOverviewMap
            destination={localDestination!}
            interests={interests}
            budget={budget}
            hotels={mapData.hotels}
            activities={mapData.activities}
            isLoading={mapData.isLoading}
            onLocationSelect={onLocationSelect}
            onAddToItinerary={(item: any, type: 'hotel' | 'activity') => {
              const price = item.cost || item.cost_per_night || 0;
              const newItem = {
                name: item.name || item.hotel_name || item.activity_name,
                description: item.description || `Added ${type}`,
                cost: price,
                duration: type === 'hotel' ? 'Overnight' : '2-3 hours',
                location: { latitude: item.latitude, longitude: item.longitude }
              };

              setTempItinerary(prev => {
                const existingDay = prev.find(day => day.day === 1) || { day: 1, accommodation: undefined, activities: [] };

                if (type === 'hotel') {
                  const updatedDay = {
                    ...existingDay,
                    accommodation: {
                      name: newItem.name,
                      description: newItem.description,
                      costPerNight: newItem.cost,
                      location: newItem.location
                    }
                  };
                  // Also reflect this into parent itinerary if provided
                  const mergedForParent = (itinerary && itinerary.length > 0)
                    ? itinerary.map(d => d.day === 1 ? {
                        ...d,
                      accommodation: {
                        name: newItem.name,
                        description: newItem.description,
                        costPerNight: newItem.cost,
                        location: newItem.location
                      }
                      } : d)
                    : [updatedDay];
                  onItineraryUpdate?.(mergedForParent);
                    return prev.length > 0 
                      ? prev.map(day => day.day === 1 ? updatedDay : day)
                      : [updatedDay];
                  } else {
                    const updatedDay = {
                      ...existingDay,
                      activities: [...(existingDay.activities || []), {
                        name: newItem.name,
                        description: newItem.description,
                        cost: newItem.cost,
                        duration: 2,
                        location: newItem.location
                      }]
                    };
                  const mergedForParent = (itinerary && itinerary.length > 0)
                    ? itinerary.map(d => d.day === 1 ? {
                        ...d,
                        activities: [
                          ...(d.activities || []),
                          {
                            name: newItem.name,
                            description: newItem.description,
                            cost: newItem.cost,
                            duration: 2,
                            location: newItem.location
                          }
                        ]
                      } : d)
                    : [updatedDay];
                  onItineraryUpdate?.(mergedForParent);
                    return prev.length > 0 
                      ? prev.map(day => day.day === 1 ? updatedDay : day)
                      : [updatedDay];
                  }
                });

                toast({
                  title: 'Added to Itinerary',
                  description: `${newItem.name} added to your temporary itinerary. Use Interactive Planning to finalize and book.`,
                  variant: 'success'
                });
            }}
          />
        </TabsContent>
      )}

      {showVisualization && (
        <TabsContent value="visualization" className="mt-4">
          {effectiveItinerary.length > 0 ? (
            <ItineraryVisualizationMap
              itinerary={effectiveItinerary}
              onLocationClick={(location, day, type) => {
                console.log('Location clicked:', { location, day, type });
              }}
            />
          ) : (
            <div className="text-center text-gray-500 py-8">Fetching route suggestions for {destination || 'destination'}...</div>
          )}
        </TabsContent>
      )}

      {showPlanning && (
        <TabsContent value="planning" className="mt-4">
          {effectiveItinerary.length > 0 ? (
            <InteractivePlanningMap
              itinerary={effectiveItinerary}
              onItineraryUpdate={(updatedItinerary) => {
              setTempItinerary(updatedItinerary);
              onItineraryUpdate?.(updatedItinerary);
            }}
              destination={localDestination}
              userUid={userUid}
              centerOverride={MapDataService.getCityCenter(localDestination)}
            />
          ) : (
            <div className="text-center text-gray-500 py-8">Preparing interactive planning for {destination || 'destination'}...</div>
          )}
        </TabsContent>
      )}

      {!showOverview && !showVisualization && !showPlanning && (
        <div className="mt-8 text-center text-gray-500">
          <p>No map data available. Please generate an itinerary first.</p>
        </div>
      )}
    </Tabs>
  );
}


