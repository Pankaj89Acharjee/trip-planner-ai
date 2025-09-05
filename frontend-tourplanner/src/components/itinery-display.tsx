"use client";

import { useState } from "react";
import type {
  FullItinerary,
  AdaptedItinerary,
  ItineraryDay,
} from "@/lib/interfaces";
import { ItineraryDayCard } from "./itinery-day-card";
import { CostSummary } from "./cost-summary";
import { MapView } from "./map-view";
import { DynamicAdjustmentForm } from "./dynamic-adjustment";
import { Button } from "./ui/button";
import { ArrowLeft } from "lucide-react";

type ItineraryDisplayProps = {
  itinerary: FullItinerary;
  setItinerary: (itinerary: FullItinerary | null) => void;
  adaptedItinerary: AdaptedItinerary | null;
  setAdaptedItinerary: (itinerary: AdaptedItinerary | null) => void;
};

export function ItineraryDisplay({
  itinerary,
  setItinerary,
  adaptedItinerary,
  setAdaptedItinerary,
}: ItineraryDisplayProps) {
  const [bookedItems, setBookedItems] = useState<Set<string>>(new Set());

  const handleBookItem = (itemId: string) => {
    setBookedItems((prev) => new Set(prev).add(itemId));
  };

  const handleStartOver = () => {
    setItinerary(null);
    setAdaptedItinerary(null);
  };

  return (
    <div className="animate-in fade-in duration-500">
      <Button variant="ghost" onClick={handleStartOver} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Start Over
      </Button>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          {itinerary.itinerary.map((day: ItineraryDay) => (
            <ItineraryDayCard
              key={day.day}
              day={day}
              bookedItems={bookedItems}
              onBookItem={handleBookItem}
            />
          ))}
        </div>
        <div className="lg:col-span-1 space-y-6 sticky top-24">
          <CostSummary
            totalCost={itinerary.totalCost}
            itinerary={itinerary.itinerary}
          />
          <MapView itinerary={itinerary.itinerary} />
          <DynamicAdjustmentForm
            originalItinerary={itinerary}
            setAdaptedItinerary={setAdaptedItinerary}
            adaptedItinerary={adaptedItinerary}
          />
        </div>
      </div>
    </div>
  );
}
