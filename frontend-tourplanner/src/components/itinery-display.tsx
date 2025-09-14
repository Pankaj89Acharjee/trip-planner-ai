"use client";

import { useState } from "react";
import type { FullItinerary, AdaptedItinerary, ItineraryDay } from "@/lib/interfaces";
import { ItineraryDayCard } from "./itinery-day-card";
import { CostSummary } from "./cost-summary";
import { MapView } from "./map-view";
import { DynamicAdjustmentForm } from "./dynamic-adjustment";
import { Button } from "./ui/button";
import { ArrowLeft, Info, TrendingUp, MapPin, Calendar, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

type ItineraryDisplayProps = {
  itinerary: FullItinerary;
  setItinerary: (itinerary: FullItinerary | null) => void;
  adaptedItinerary: AdaptedItinerary | null;
  setAdaptedItinerary: (itinerary: AdaptedItinerary | null) => void;
  onSaveItinerary?: (itinerary: FullItinerary) => void;
  isSaving?: boolean;
};

export function ItineraryDisplay({ itinerary, setItinerary, adaptedItinerary, setAdaptedItinerary, onSaveItinerary, isSaving }: ItineraryDisplayProps) {
  const [bookedItems, setBookedItems] = useState<Set<string>>(new Set());

  const handleBookItem = (itemId: string) => {
    setBookedItems((prev) => new Set(prev).add(itemId));
  };

  const handleStartOver = () => {
    setItinerary(null);
    setAdaptedItinerary(null);
  };

  return (
    <div className="w-full max-w-7xl ml-14 container p-2 mx-auto animate-in fade-in duration-500 overflow-auto">
      <div className="flex gap-4 mb-6">
        <Button variant="ghost" onClick={handleStartOver} className="dark:bg-gray-700 bg-gray-200 hover:bg-gray-300 dark:text-gray-300 text-gray-700">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Start Over
        </Button>
        {onSaveItinerary && (
          <Button 
            onClick={() => onSaveItinerary(itinerary)} 
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save Itinerary"}
          </Button>
        )}
      </div>

      {/* Search Results & Recommendations */}
      {itinerary.metadata && (
        <div className="mb-8 space-y-4 dark:bg-gray-800 dark:border-gray-700">
          <Card className="bg-gradient-accent border-blue-200 dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-gray-200">
                <Info className="h-5 w-5" />
                Search Results & Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-white rounded-lg border border-blue-100 shadow-sm">
                  <div className="text-3xl font-bold text-blue-600 mb-1 dark:text-gray-400">
                    {itinerary.metadata.searchResults.hotelsFound}
                  </div>
                  <div className="text-sm text-blue-700 font-medium">Hotels Found</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg border border-blue-100 shadow-sm">
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    {itinerary.metadata.searchResults.activitiesFound}
                  </div>
                  <div className="text-sm text-green-700 font-medium">Activities Found</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg border border-blue-100 shadow-sm">
                  <div className="text-3xl font-bold text-purple-600 mb-1">
                    {itinerary.metadata.searchResults.availableRooms}
                  </div>
                  <div className="text-sm text-purple-700 font-medium">Available Rooms</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg border border-blue-100 shadow-sm">
                  <div className="text-3xl font-bold text-orange-600 mb-1">
                    ₹{itinerary.totalCost}
                  </div>
                  <div className="text-sm text-orange-700 font-medium">Total Cost</div>
                </div>
              </div>

              {itinerary.metadata.recommendations && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-blue-900 dark:text-gray-200 flex items-center gap-2 text-lg">
                    <TrendingUp className="h-5 w-5" />
                    Recommendations
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {itinerary.metadata.recommendations.bestValueHotel && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 px-3 py-1 text-sm">
                        Best Value: {itinerary.metadata.recommendations.bestValueHotel}
                      </Badge>
                    )}
                    {itinerary.metadata.recommendations.mustDoActivity && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 px-3 py-1 text-sm">
                        Must Do: {itinerary.metadata.recommendations.mustDoActivity}
                      </Badge>
                    )}
                  </div>
                  {itinerary.metadata.recommendations.budgetTip && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        💡 {itinerary.metadata.recommendations.budgetTip}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 items-start">
        <div className="xl:col-span-3 space-y-6">
          {itinerary.itinerary.map((day: ItineraryDay) => (
            <ItineraryDayCard
              key={day.day}
              day={day}
              bookedItems={bookedItems}
              onBookItem={handleBookItem}
            />
          ))}
        </div>
        <div className="xl:col-span-1 space-y-6 sticky top-24">
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
