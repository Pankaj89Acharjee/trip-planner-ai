"use client";

import type { Activity, Accommodation, Transportation } from "@/lib/interfaces";
import { BedDouble, Bike, Bus, Car, Clock, Landmark, PartyPopper, Plane, Sparkles, Train, Wallet } from "lucide-react";

type ItemType = "activity" | "accommodation" | "transportation";

type ItineraryItemCardProps = {
  item: Activity | Accommodation | Transportation;
  type: ItemType;
  day: number;
  index?: number;
};

const getIcon = (type: ItemType, item: any) => {
  if (type === "accommodation") return <BedDouble className="h-6 w-6 text-primary" />;
  if (type === "transportation") {
    switch (item.mode?.toLowerCase()) {
      case "flight":
        return <Plane className="h-6 w-6 text-primary" />;
      case "train":
        return <Train className="h-6 w-6 text-primary" />;
      case "bus":
        return <Bus className="h-6 w-6 text-primary" />;
      case "car":
        return <Car className="h-6 w-6 text-primary" />;
      default:
        return <Sparkles className="h-6 w-6 text-primary" />;
    }
  }
  // For activity, you could extend this with more logic if the AI provides categories
  return <Sparkles className="h-6 w-6 text-primary" />;
};

export function ItineraryItemCard({
  item,
  type,
}: ItineraryItemCardProps) {
  const cost =
    "cost" in item
      ? item.cost
      : "costPerNight" in item
        ? item.costPerNight
        : 0;
  const duration = "duration" in item ? item.duration : null;

  return (
    <div className="flex items-start gap-4 p-4 rounded-lg bg-card/50 border">
      <div className="w-10 h-10 flex-shrink-0 bg-primary/10 rounded-full flex items-center justify-center mt-1">
        {getIcon(type, item)}
      </div>
      <div className="flex-grow">
        <h4 className="font-semibold">{'name' in item ? item.name : item.mode}</h4>
        <p className="text-sm text-muted-foreground">{item.description}</p>
        <div className="flex items-center gap-4 mt-2 text-sm">
          {cost > 0 && (
            <div className="flex items-center gap-1.5">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <span>₹{cost.toLocaleString()}</span>
            </div>
          )}
          {duration && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{duration} hours</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
