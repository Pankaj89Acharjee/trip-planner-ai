"use client";

import { useState } from "react";
import type { FullItinerary, AdaptedItinerary, ItineraryDay } from "@/lib/interfaces";
import { ItineraryDayCard } from "./itinery-day-card";
import { CostSummary } from "./cost-summary";
import { MapView } from "./map-view";
import { Button } from "./ui/button";
import { ArrowLeft, Info, TrendingUp, MapPin, Calendar, Save, Edit3, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { itinerarySyncService } from "@/lib/itinerarySyncService";
import { SmartAdjustmentNotifications } from "./smart-adjustment-notifications";
import type { SmartAdjustment } from "@/lib/smartAdjustmentAgent";
import { TrafficMonitoring } from "./traffic-monitoring";

type ItineraryDisplayProps = {
  itinerary: FullItinerary;
  setItinerary: (itinerary: FullItinerary | null) => void;
  adaptedItinerary: AdaptedItinerary | null;
  setAdaptedItinerary: (itinerary: AdaptedItinerary | null) => void;
  formValues?: any;
  setFormValues?: (values: any) => void;
};

export function ItineraryDisplay({
  itinerary,
  setItinerary,
  adaptedItinerary,
  setAdaptedItinerary,
  formValues,
  setFormValues
}: ItineraryDisplayProps) {
  const { userData } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [showAdjustmentForm, setShowAdjustmentForm] = useState(false);
  const [currentItinerary, setCurrentItinerary] = useState<FullItinerary>(itinerary);

  // Handle smart adjustment acceptance
  const handleAdjustmentAccepted = (adjustment: SmartAdjustment, updatedItinerary?: any) => {
    if (updatedItinerary) {
      // Use the pre-calculated updated itinerary from the notification component
      setCurrentItinerary(updatedItinerary);
      setItinerary(updatedItinerary);
    } else {
      // Fallback: Update the itinerary with the accepted adjustment
      const newItinerary = currentItinerary.itinerary.map(day => {
        if (day.day === adjustment.affectedDay) {
          // Find and replace the activity
          const updatedActivities = day.activities?.map(activity => {
            if (activity.name === adjustment.originalActivity) {
              return {
                ...activity,
                name: adjustment.suggestedAlternative,
                cost: activity.cost + adjustment.estimatedCostChange,
                description: `Adjusted due to ${adjustment.reason}`
              };
            }
            return activity;
          });

          return {
            ...day,
            activities: updatedActivities
          };
        }
        return day;
      });

      // Recalculate total cost
      const newTotalCost = calculateTotalCost(newItinerary);

      const updatedFullItinerary = {
        ...currentItinerary,
        itinerary: newItinerary,
        totalCost: newTotalCost
      };

      setCurrentItinerary(updatedFullItinerary);
      setItinerary(updatedFullItinerary);
    }
  };

  // Handle smart adjustment rejection
  const handleAdjustmentRejected = (adjustment: SmartAdjustment) => {
    // Log the rejection for analytics
    console.log('Adjustment rejected:', adjustment);
  };

  // Function to calculate total cost from itinerary data
  const calculateTotalCost = (itineraryDays: ItineraryDay[]): number => {
    return itineraryDays.reduce((total, day) => {
      let dayCost = 0;

      // Add accommodation cost
      if (day.accommodation?.costPerNight) {
        dayCost += day.accommodation.costPerNight;
      }

      // Add activities cost
      if (day.activities) {
        dayCost += day.activities.reduce((activityTotal, activity) =>
          activityTotal + (activity.cost || 0), 0);
      }

      return total + dayCost;
    }, 0);
  };

  const handleStartOver = () => {
    setItinerary(null);
    setAdaptedItinerary(null);
    setShowAdjustmentForm(false);
  };

  const handleSaveItineraryPackage = async () => {
    if (!userData?.uid || !formValues) {
      toast({
        variant: "destructive",
        title: "Cannot Save",
        description: "No user data or form values available.",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Calculate end date from start date and duration
      const startDate = formValues.startDate || new Date().toISOString().split('T')[0];
      const duration = formValues.travelDuration || 1;
      const endDate = new Date(new Date(startDate).getTime() + duration * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const itineraryData = {
        userUid: userData.uid,
        title: `${formValues.destination || 'Generated'} Trip Package`,
        destination: formValues.destination || 'Generated Destination',
        itinerary: currentItinerary,
        status: 'saved' as const,
        participants: formValues.participants || 1,
        isFavorite: formValues.isFavorite || false,
        budget: formValues.budget || 0,
        preferences: formValues.interests || [],
        totalDays: formValues.travelDuration || 1,
        travelDates: {
          startDate: startDate,
          endDate: endDate
        }
      };

      const result = await itinerarySyncService.saveItinerary(itineraryData);

      if (result.success) {
        const hasModifications = JSON.stringify(currentItinerary.itinerary) !== JSON.stringify(itinerary.itinerary);
        toast({
          title: "Itinerary Package Saved!",
          description: hasModifications
            ? "Your complete itinerary with modifications has been saved. You can now book it later or make further adjustments."
            : "Your complete itinerary has been saved. You can now book it later or make adjustments.",
        });
      } else {
        throw new Error(result.error || 'Failed to save itinerary');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save itinerary";
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: errorMessage,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-7xl ml-4 xl:ml-26 mr-4 container p-2 mx-auto animate-in fade-in duration-500 overflow-none">
      <div className="flex gap-4 mb-6">
        <Button variant="ghost" onClick={handleStartOver} className="dark:bg-gray-700 bg-gray-200 hover:bg-gray-300 dark:text-gray-300 text-gray-700">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Start Over
        </Button>
      </div>

      {/* Top Header of the Itinerary Display page */}
      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Save Your Itinerary?</h3>
              <p className="text-gray-600">Save this complete travel package to your account for future booking and modifications.</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleSaveItineraryPackage}
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
              >
                <Package className="h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Package'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Smart Itinerary Insights */}
      {itinerary.metadata && (
        <div className="mb-8 space-y-4 dark:bg-gray-800 dark:border-gray-700">
          <Card className="bg-gradient-accent border-blue-200 dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-gray-200">
                <Info className="h-5 w-5" />
                Smart Itinerary Insights
              </CardTitle>
            </CardHeader>

            {/* Recommendation section */}
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
                <div className="text-center p-4 bg-white rounded-lg border border-blue-100 shadow-sm">
                  <div className="text-md lg:text-3xl font-bold text-blue-600 mb-1 dark:text-gray-400">
                    {itinerary.metadata.searchResults.hotelsFound}
                  </div>
                  <div className="text-sm text-blue-700 font-medium">Hotels Found</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg border border-blue-100 shadow-sm">
                  <div className="text-md lg:text-3xl font-bold text-green-600 mb-1">
                    {itinerary.metadata.searchResults.activitiesFound}
                  </div>
                  <div className="text-sm text-green-700 font-medium">Activities Found</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg border border-blue-100 shadow-sm">
                  <div className="text-md lg:text-3xl font-bold text-purple-600 mb-1">
                    {itinerary.metadata.searchResults.availableRooms}
                  </div>
                  <div className="text-sm text-purple-700 font-medium">Available Rooms</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg border border-blue-100 shadow-sm">
                  <div className="text-md lg:text-3xl font-bold text-orange-600 mb-1">
                    ₹{currentItinerary.totalCost.toLocaleString()}
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

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        <div className="xl:col-span-3 space-y-6">
          {currentItinerary.itinerary.map((day: ItineraryDay) => (
            <ItineraryDayCard
              key={day.day}
              day={day}
              originalDay={itinerary.itinerary.find(d => d.day === day.day)}
            />
          ))}

          <div>
            <MapView
              itinerary={currentItinerary.itinerary}
              destination={formValues?.destination || 'Generated Destination'}
              interests={formValues?.interests || []}
              budget={formValues?.budget || 0}
              userUid={userData?.uid}
            onDestinationChange={(dest) => {
              if (setFormValues) {
                setFormValues({ ...(formValues || {}), destination: dest });
              }
            }}
              onLocationSelect={(location) => {
                console.log('Location selected:', location);
              }}
              onItineraryUpdate={(updatedItinerary) => {
                console.log('Itinerary updated:', updatedItinerary);
                // Recalculating total cost based on updated itinerary
                const newTotalCost = calculateTotalCost(updatedItinerary);

                // Update the current itinerary with user modifications and new total cost
                const updatedFullItinerary = {
                  ...currentItinerary,
                  itinerary: updatedItinerary,
                  totalCost: newTotalCost
                };
                setCurrentItinerary(updatedFullItinerary);
                setItinerary(updatedFullItinerary);

                toast({
                  title: "Itinerary Updated",
                  description: `Your itinerary has been updated. New total cost: ₹${newTotalCost.toLocaleString()}`,
                });
              }}
            />
          </div>
        </div>
        <div className="xl:col-span-1 space-y-6 sticky top-24 mr-2">
          <CostSummary
            totalCost={currentItinerary.totalCost}
            itinerary={currentItinerary.itinerary}
            destination={formValues?.destination}
            budget={formValues?.budget}
            startDate={formValues?.startDate}
          />

          {/* Real-Time Traffic & Weather Monitoring */}
          <TrafficMonitoring
            itinerary={currentItinerary}
            travelDates={formValues?.travelDates || (formValues?.startDate && formValues?.endDate ? {
              startDate: formValues.startDate,
              endDate: formValues.endDate
            } : undefined)}
          />

          {/* Smart Adjustment Notifications with Agent */}
          <SmartAdjustmentNotifications
            itinerary={currentItinerary}
            onAdjustmentAccepted={handleAdjustmentAccepted}
            onAdjustmentRejected={handleAdjustmentRejected}
            userPreferences={formValues}
          />
        </div>
      </div>
    </div>
  );
}
