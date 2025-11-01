"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ItineraryDay } from "@/lib/interfaces";
import { BedDouble, Plane, Sparkles } from "lucide-react";
import { ItineraryShareExport } from "./itinerary-share-export";
import type { ItineraryData } from "@/lib/itineraryExport";

type CostSummaryProps = {
  totalCost: number;
  itinerary: ItineraryDay[];
  destination?: string;
  budget?: number;
  startDate?: string;
};

export function CostSummary({ totalCost, itinerary, destination, budget, startDate }: CostSummaryProps) {

  const costBreakdown = useMemo(() => {
    let accommodation = 0;
    let transportation = 0;
    let activities = 0;

    itinerary.forEach((day) => {
      if (day.accommodation) {
        accommodation += day.accommodation.costPerNight;
      }
      // if (day.transportation) {
      //   transportation += day.transportation.cost;
      // }
      if (day.activities) {
        activities += day.activities.reduce((sum, act) => sum + act.cost, 0);
      }
    });

    return { accommodation, transportation, activities };
  }, [itinerary]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Cost Breakdown</CardTitle>
            <CardDescription>Estimated costs for your trip.</CardDescription>
          </div>
          <ItineraryShareExport 
            itineraryData={{
              destination: destination || 'Trip',
              totalDays: itinerary.length,
              totalCost: totalCost,
              budget: budget,
              itinerary: itinerary,
              travelDates: startDate ? {
                startDate: startDate,
                endDate: new Date(new Date(startDate).getTime() + itinerary.length * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
              } : undefined
            }}
            variant="outline"
            size="sm"
            showLabel={false}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-baseline">
          <span className="text-muted-foreground">Total Estimated Cost</span>
          <span className="text-2xl font-bold text-primary">
            ₹{totalCost.toLocaleString()}
          </span>
        </div>
        <Separator />
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-2 text-muted-foreground">
              <BedDouble className="h-4 w-4" /> Accommodation
            </span>
            <span>₹{costBreakdown.accommodation.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Plane className="h-4 w-4" /> Transportation
            </span>
            <span>₹{costBreakdown.transportation.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Sparkles className="h-4 w-4" /> Activities
            </span>
            <span>₹{costBreakdown.activities.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
