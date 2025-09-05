"use client";

import { useState } from "react";
import type { FullItinerary, AdaptedItinerary } from "@/lib/interfaces";
import { ItineraryForm } from "@/components/itinery-form";
import { ItineraryDisplay } from "@/components/itinery-display";
import { ItinerarySkeleton } from "@/components/itinery-skeleton";
import AppSidebar from "@/components/sidebar";

export default function Home() {
  const [itinerary, setItinerary] = useState<FullItinerary | null>(null);
  const [adaptedItinerary, setAdaptedItinerary] =
    useState<AdaptedItinerary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      {/* Sidebar */}
      <AppSidebar />

      {/* Main Content - Independent Scrolling */}
      <div className="flex-1 overflow-y-auto bg-gradient-secondary">
        <div className="container mx-auto p-4 md:p-8">
          {!itinerary && !isLoading && (
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl text-purple-500/90">
                  Plan Your Favourite Trip
                </h2>
                <p className="mt-4 text-lg leading-8 text-muted-foreground">
                  Tell us your travel preferences and let our AI design a
                  personalized itinerary for you.
                </p>
              </div>
              <ItineraryForm
                setItinerary={setItinerary}
                setIsLoading={setIsLoading}
                setError={setError}
              />
            </div>
          )}

          {isLoading && <ItinerarySkeleton />}
          {itinerary && (
            <ItineraryDisplay
              itinerary={itinerary}
              setItinerary={setItinerary}
              adaptedItinerary={adaptedItinerary}
              setAdaptedItinerary={setAdaptedItinerary}
            />
          )}
          {/* Error handling is done via toasts, triggered from form components */}
        </div>
      </div>
    </>
  );
}
