import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  import type { ItineraryDay } from "@/lib/interfaces";
  import { ItineraryItemCard } from "./itinery-item-card";
  
  type ItineraryDayCardProps = {
    day: ItineraryDay;
    bookedItems: Set<string>;
    onBookItem: (itemId: string) => void;
  };
  
  export function ItineraryDayCard({
    day,
    bookedItems,
    onBookItem,
  }: ItineraryDayCardProps) {
    return (
      <Card className="transition-all hover:shadow-lg hover:shadow-primary/10">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary">
            Day {day.day}
          </CardTitle>
          <CardDescription>
            Your schedule for day {day.day} of the trip.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {day.transportation && (
            <ItineraryItemCard
              item={day.transportation}
              type="transportation"
              day={day.day}
              isBooked={bookedItems.has(`day${day.day}-transportation`)}
              onBook={() => onBookItem(`day${day.day}-transportation`)}
            />
          )}
          {day.accommodation && (
            <ItineraryItemCard
              item={day.accommodation}
              type="accommodation"
              day={day.day}
              isBooked={bookedItems.has(`day${day.day}-accommodation`)}
              onBook={() => onBookItem(`day${day.day}-accommodation`)}
            />
          )}
          {day.activities &&
            day.activities.map((activity, index) => (
              <ItineraryItemCard
                key={index}
                item={activity}
                type="activity"
                day={day.day}
                index={index}
                isBooked={bookedItems.has(`day${day.day}-activity-${index}`)}
                onBook={() => onBookItem(`day${day.day}-activity-${index}`)}
              />
            ))}
        </CardContent>
      </Card>
    );
  }
  