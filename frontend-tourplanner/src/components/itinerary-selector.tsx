"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import { Hotel, MapPin, Clock, IndianRupee, Star } from "lucide-react";
import type { ItineraryDay } from "@/lib/interfaces";

interface ItinerarySelectorProps {
  itinerary: ItineraryDay[];
  onSelectionComplete: (selectedItinerary: ItineraryDay[]) => void;
  onCancel: () => void;
}

interface SelectionState {
  [dayNumber: number]: {
    accommodation: boolean;
    activities: { [index: number]: boolean };
  };
}

export function ItinerarySelector({ itinerary, onSelectionComplete, onCancel }: ItinerarySelectorProps) {
  const [selections, setSelections] = useState<SelectionState>(() => {
    const initialSelections: SelectionState = {};
    itinerary.forEach(day => {
      initialSelections[day.day] = {
        accommodation: true, // Default to selected
        activities: day.activities?.reduce((acc, _, index) => {
          acc[index] = true; // Default to selected
          return acc;
        }, {} as { [index: number]: boolean }) || {}
      };
    });
    return initialSelections;
  });

  const handleAccommodationToggle = (dayNumber: number) => {
    setSelections(prev => ({
      ...prev,
      [dayNumber]: {
        ...prev[dayNumber],
        accommodation: !prev[dayNumber].accommodation
      }
    }));
  };

  const handleActivityToggle = (dayNumber: number, activityIndex: number) => {
    setSelections(prev => ({
      ...prev,
      [dayNumber]: {
        ...prev[dayNumber],
        activities: {
          ...prev[dayNumber].activities,
          [activityIndex]: !prev[dayNumber].activities[activityIndex]
        }
      }
    }));
  };

  const handleSelectAll = (dayNumber: number) => {
    const day = itinerary.find(d => d.day === dayNumber);
    if (!day) return;

    setSelections(prev => ({
      ...prev,
      [dayNumber]: {
        accommodation: true,
        activities: day.activities?.reduce((acc, _, index) => {
          acc[index] = true;
          return acc;
        }, {} as { [index: number]: boolean }) || {}
      }
    }));
  };

  const handleDeselectAll = (dayNumber: number) => {
    setSelections(prev => ({
      ...prev,
      [dayNumber]: {
        accommodation: false,
        activities: {}
      }
    }));
  };

  const handleConfirm = () => {
    const selectedItinerary = itinerary.map(day => {
      const daySelections = selections[day.day];
      if (!daySelections) return day;

      return {
        ...day,
        accommodation: daySelections.accommodation ? day.accommodation : undefined,
        activities: day.activities?.filter((_, index) => daySelections.activities[index]) || []
      };
    }).filter(day => 
      day.accommodation || (day.activities && day.activities.length > 0)
    );

    onSelectionComplete(selectedItinerary);
  };

  const getTotalCost = () => {
    let total = 0;
    itinerary.forEach(day => {
      const daySelections = selections[day.day];
      if (!daySelections) return;

      if (daySelections.accommodation && day.accommodation?.costPerNight) {
        total += day.accommodation.costPerNight;
      }

      day.activities?.forEach((activity, index) => {
        if (daySelections.activities[index] && activity.cost) {
          total += activity.cost;
        }
      });
    });
    return total;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Customize Your Itinerary</h2>
        <p className="text-gray-600">Select the hotels and activities you want to include in your final itinerary.</p>
      </div>

      {itinerary.map(day => {
        const daySelections = selections[day.day];
        if (!daySelections) return null;

        return (
          <Card key={day.day}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <span className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {day.day}
                  </span>
                  Day {day.day}
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleSelectAll(day.day)}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDeselectAll(day.day)}>
                    Deselect All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Accommodation */}
              {day.accommodation && (
                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <Checkbox
                    checked={daySelections.accommodation}
                    onCheckedChange={() => handleAccommodationToggle(day.day)}
                  />
                  <Hotel className="w-5 h-5 text-blue-500" />
                  <div className="flex-1">
                    <h4 className="font-medium">{day.accommodation.name}</h4>
                    <p className="text-sm text-gray-600">{day.accommodation.description}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <IndianRupee className="w-4 h-4" />
                        <span>{day.accommodation.costPerNight?.toLocaleString()}/night</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline">Hotel</Badge>
                </div>
              )}

              {/* Activities */}
              {day.activities?.map((activity, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <Checkbox
                    checked={daySelections.activities[index] || false}
                    onCheckedChange={() => handleActivityToggle(day.day, index)}
                  />
                  <MapPin className="w-5 h-5 text-green-500" />
                  <div className="flex-1">
                    <h4 className="font-medium">{activity.name}</h4>
                    <p className="text-sm text-gray-600">{activity.description}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      {activity.cost && activity.cost > 0 && (
                        <div className="flex items-center gap-1">
                          <IndianRupee className="w-4 h-4" />
                          <span>{activity.cost.toLocaleString()}</span>
                        </div>
                      )}
                      {activity.duration && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{activity.duration} hours</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline">Activity</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}

      {/* Total Cost */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-green-800">Total Selected Cost</h3>
              <p className="text-sm text-green-600">Based on your selections</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-800 flex items-center gap-1">
                <IndianRupee className="w-6 h-6" />
                {getTotalCost().toLocaleString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} className="bg-green-600 hover:bg-green-700">
          Confirm Selection & Save Itinerary
        </Button>
      </div>
    </div>
  );
}
