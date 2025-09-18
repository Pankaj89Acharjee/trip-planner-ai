"use client";

import { useState, useEffect } from "react";
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
}

export function ComprehensiveMap({ destination, interests = [], budget = 0, userUid, itinerary = [], onLocationSelect, onItineraryUpdate
}: ComprehensiveMapProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [mapData, setMapData] = useState<MapDataResponse>({
    hotels: [],
    activities: [],
    isLoading: false
  });

  // Fetch dynamic data when destination, interests, or budget changes (with debouncing)
  useEffect(() => {
    if (destination && interests.length > 0 && budget > 0 && userUid) {
      setMapData(prev => ({ ...prev, isLoading: true }));

      // Debounce the API call to prevent excessive requests
      const timeoutId = setTimeout(() => {
        MapDataService.fetchLocationData(destination, interests, budget, userUid)
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
  }, [destination, interests, budget, userUid]);

  // Determine which tabs to show based on available data
  const showOverview = destination && interests.length > 0;
  const showVisualization = itinerary.length > 0;
  const showPlanning = itinerary.length > 0;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <div className="flex flex-col w-full gap-2 mb-6 ">
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
            className={`px-4 py-2 text-sm rounded-md border transition-colors ${
              activeTab === "visualization" 
                ? "bg-primary text-primary-foreground border-primary" 
                : "bg-background border-border hover:bg-muted"
            }`}
          >
            Trip Route
          </button>
        )}
        {showPlanning && (
          <button
            onClick={() => setActiveTab("planning")}
            className={`px-4 py-2 text-sm rounded-md border transition-colors ${
              activeTab === "planning" 
                ? "bg-primary text-primary-foreground border-primary" 
                : "bg-background border-border hover:bg-muted"
            }`}
          >
            Interactive Planning
          </button>
        )}
      </div>

      {showOverview && (
        <TabsContent value="overview" className="mt-4">
          <DestinationOverviewMap
            destination={destination!}
            interests={interests}
            budget={budget}
            hotels={mapData.hotels}
            activities={mapData.activities}
            isLoading={mapData.isLoading}
            onLocationSelect={onLocationSelect}
          />
        </TabsContent>
      )}

      {showVisualization && (
        <TabsContent value="visualization" className="mt-4">
          <ItineraryVisualizationMap
            itinerary={itinerary}
            onLocationClick={(location, day, type) => {
              console.log('Location clicked:', { location, day, type });
            }}
          />
        </TabsContent>
      )}

      {showPlanning && (
        <TabsContent value="planning" className="mt-4">
          <InteractivePlanningMap
            itinerary={itinerary}
            onItineraryUpdate={onItineraryUpdate}
          />
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


