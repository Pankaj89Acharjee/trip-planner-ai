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
  originalDay?: ItineraryDay;
};
  
export function ItineraryDayCard({
  day,
  originalDay,
}: ItineraryDayCardProps) {
  // Checking if user has made modifications to this day
  const hasModifications = originalDay && (
    JSON.stringify(day.accommodation) !== JSON.stringify(originalDay.accommodation) ||
    JSON.stringify(day.activities) !== JSON.stringify(originalDay.activities)
  );

  return (
    <Card className={`transition-all hover:shadow-lg hover:shadow-primary/10 ${hasModifications ? 'ring-2 ring-blue-500 bg-blue-50/30' : ''}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold text-primary">
              Day {day.day}
            </CardTitle>
            <CardDescription>
              Your schedule for day {day.day} of the trip.
            </CardDescription>
          </div>
          {hasModifications && (
            <div className="flex items-center gap-1 text-blue-600 text-sm font-medium">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Modified
            </div>
          )}
        </div>
      </CardHeader>
        <CardContent className="space-y-4">
          {day.accommodation && (
            <ItineraryItemCard
              item={day.accommodation}
              type="accommodation"
              day={day.day}
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
              />
            ))}
        </CardContent>
      </Card>
    );
  }
  