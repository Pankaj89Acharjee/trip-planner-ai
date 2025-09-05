"use client";

import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { MapIcon, Terminal } from "lucide-react";
import type { ItineraryDay } from "@/lib/interfaces";
import { useMemo } from "react";

type MapViewProps = {
  itinerary?: ItineraryDay[];
};

export function MapView({ itinerary }: MapViewProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const locations = useMemo(() => {
    if (!itinerary) return [];
    const allLocations: {key: string, name: string, lat: number, lng: number}[] = [];
    itinerary.forEach(day => {
      if (day.accommodation?.location) {
        allLocations.push({
          key: `day${day.day}-accom`,
          name: day.accommodation.name,
          lat: day.accommodation.location.latitude,
          lng: day.accommodation.location.longitude
        });
      }
      day.activities?.forEach((activity, index) => {
        if (activity.location) {
          allLocations.push({
            key: `day${day.day}-activity-${index}`,
            name: activity.name,
            lat: activity.location.latitude,
            lng: activity.location.longitude
          });
        }
      });
    });
    return allLocations;
  }, [itinerary]);

  const mapCenter = useMemo(() => {
    if (locations.length > 0) {
      return { lat: locations[0].lat, lng: locations[0].lng };
    }
    return { lat: 28.6139, lng: 77.209 }; // Default to Delhi if no locations
  }, [locations]);

  if (!apiKey) {
    return (
      <Alert>
        <Terminal className="h-4 w-4" />
        <AlertTitle>Map Configuration Needed</AlertTitle>
        <AlertDescription>
          Please add your Google Maps API key to a `.env.local` file as{" "}
          <code className="font-semibold">
            NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
          </code>{" "}
          to enable the map view.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapIcon className="w-5 h-5" />
          Map View
        </CardTitle>
        <CardDescription>
          Your itinerary at a glance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full rounded-lg overflow-hidden">
          <APIProvider apiKey={apiKey}>
            <Map
              center={mapCenter}
              defaultZoom={itinerary ? 12 : 11}
              gestureHandling={"greedy"}
              disableDefaultUI={true}
              mapId="wanderwise_map"
            >
              {locations.map(loc => (
                <AdvancedMarker key={loc.key} position={{lat: loc.lat, lng: loc.lng}} title={loc.name}>
                    <Pin />
                </AdvancedMarker>
              ))}
            </Map>
          </APIProvider>
        </div>
      </CardContent>
    </Card>
  );
}
