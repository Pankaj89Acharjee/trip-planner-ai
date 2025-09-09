"use client";

import { useState } from "react";
import type { FullItinerary, AdaptedItinerary } from "@/lib/interfaces";
import { ItineraryForm } from "@/components/itinery-form";
import { ItineraryDisplay } from "@/components/itinery-display";
import { ItinerarySkeleton } from "@/components/itinery-skeleton";
import { LayoutWrapper } from "@/components/layout-wrapper";

export default function Home() {
  const [itinerary, setItinerary] = useState<FullItinerary | null>(null);
  const [adaptedItinerary, setAdaptedItinerary] =
    useState<AdaptedItinerary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <LayoutWrapper>
      <div className="container mx-auto p-4 md:p-8">
        {!itinerary && !isLoading && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl dark:text-purple-500/90 text-gray-700 font-mono">
                Plan Your Favourite Trip
              </h2>
              <p className="mt-4 text-lg leading-8 text-muted-foreground text-gray-500 dark:text-gray-300">
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
        {error && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center p-8 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="text-lg font-semibold text-red-800 mb-2">Error</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <button 
                onClick={() => setError(null)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
        {itinerary && (
          <ItineraryDisplay
            itinerary={itinerary}
            setItinerary={setItinerary}
            adaptedItinerary={adaptedItinerary}
            setAdaptedItinerary={setAdaptedItinerary}
          />
        )}
      </div>
    </LayoutWrapper>
  );
}
