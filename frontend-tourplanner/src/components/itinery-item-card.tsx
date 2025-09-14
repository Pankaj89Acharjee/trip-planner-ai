"use client";

import type { Activity, Accommodation, Transportation } from "@/lib/interfaces";
import {
  BedDouble,
  Bike,
  Bus,
  Car,
  CheckCircle2,
  Clock,
  Landmark,
  PartyPopper,
  Plane,
  Sparkles,
  Train,
  Wallet,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

type ItemType = "activity" | "accommodation" | "transportation";

type ItineraryItemCardProps = {
  item: Activity | Accommodation | Transportation;
  type: ItemType;
  day: number;
  index?: number;
  isBooked: boolean;
  onBook: () => void;
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
  isBooked,
  onBook,
}: ItineraryItemCardProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const cost =
    "cost" in item
      ? item.cost
      : "costPerNight" in item
      ? item.costPerNight
      : 0;
  const duration = "duration" in item ? item.duration : null;

  const handlePayment = () => {
    onBook();
    setOpen(false);
    toast({
      title: "Booking Confirmed!",
      description: `${'name' in item ? item.name : item.mode || 'Item'} has been successfully booked.`,
    });
  };

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
      <div className="ml-auto flex-shrink-0">
        {isBooked ? (
          <Button variant="ghost" disabled className="text-green-500">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Booked
          </Button>
        ) : (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Book Now</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Your Booking</DialogTitle>
                <DialogDescription>
                  You are about to book "{'name' in item ? item.name : item.mode}" for $
                  {cost.toLocaleString()}.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handlePayment}>Pay Now</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
