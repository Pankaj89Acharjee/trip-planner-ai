"use client";

import { ComprehensiveMap } from "./maps/comprehensive-map";
import type { ItineraryDay } from "@/lib/interfaces";

type MapViewProps = {
  itinerary?: ItineraryDay[];
  destination?: string;
  interests?: string[];
  budget?: number;
  userUid?: string;
  onLocationSelect?: (location: any) => void;
  onItineraryUpdate?: (updatedItinerary: ItineraryDay[]) => void;
};

export function MapView({ itinerary, destination, interests = [], budget = 0, userUid, onLocationSelect, onItineraryUpdate
}: MapViewProps) {
  return (
    <ComprehensiveMap
      destination={destination}
      interests={interests}
      budget={budget}
      userUid={userUid}
      itinerary={itinerary}
      onLocationSelect={onLocationSelect}
      onItineraryUpdate={onItineraryUpdate}
    />
  );
}
