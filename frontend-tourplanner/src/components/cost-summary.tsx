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
import { Button } from "./ui/button";
import { Share2, BedDouble, Plane, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type CostSummaryProps = {
  totalCost: number;
  itinerary: ItineraryDay[];
};

export function CostSummary({ totalCost, itinerary }: CostSummaryProps) {
  const { toast } = useToast();

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

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link Copied!",
      description: "Your itinerary link has been copied to the clipboard.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost Breakdown</CardTitle>
        <CardDescription>Estimated costs for your trip.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-baseline">
          <span className="text-muted-foreground">Total Estimated Cost</span>
          <span className="text-2xl font-bold text-primary">
            ${totalCost.toLocaleString()}
          </span>
        </div>
        <Separator />
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-2 text-muted-foreground">
              <BedDouble className="h-4 w-4" /> Accommodation
            </span>
            <span>${costBreakdown.accommodation.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Plane className="h-4 w-4" /> Transportation
            </span>
            <span>${costBreakdown.transportation.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Sparkles className="h-4 w-4" /> Activities
            </span>
            <span>${costBreakdown.activities.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" variant="outline" onClick={handleShare}>
          <Share2 className="mr-2 h-4 w-4" /> Share Itinerary
        </Button>
      </CardFooter>
    </Card>
  );
}
