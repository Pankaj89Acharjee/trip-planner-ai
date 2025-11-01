"use client";

import { MapView } from "@/components/map-view";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapIcon, Navigation, Target, Edit3 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function MapPage() {
  const auth = useAuth();
  // Defaults for initial preview; real selections will override via UI
  const defaultDestination = "Delhi";
  const defaultInterests = ["heritage", "food", "culture"];
  const defaultBudget = 15000;

  return (
    <ProtectedRoute>
      <LayoutWrapper>
        <div className="container mx-auto p-4 md:p-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl flex items-center gap-3">
              <MapIcon className="w-10 h-10" />
              Interactive Planning with Maps
            </h1>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              Explore destinations, visualize your trip route, and plan interactively with our comprehensive map features.
            </p>
          </div>

          {/* Feature Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-500" />
                  Destination Overview
                </CardTitle>
                <CardDescription>
                  Explore points of interest based on your interests and budget
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Badge variant="outline">Heritage Sites</Badge>
                  <Badge variant="outline">Food Spots</Badge>
                  <Badge variant="outline">Cultural Venues</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-green-500" />
                  Trip Visualization
                </CardTitle>
                <CardDescription>
                  See your complete itinerary with optimized routes and day-by-day planning
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Badge variant="outline">Route Optimization</Badge>
                  <Badge variant="outline">Day Filtering</Badge>
                  <Badge variant="outline">Distance Calculation</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-purple-500" />
                  Interactive Planning
                </CardTitle>
                <CardDescription>
                  Drag, drop, and customize your itinerary with real-time updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Badge variant="outline">Drag & Drop</Badge>
                  <Badge variant="outline">Add Locations</Badge>
                  <Badge variant="outline">Real-time Updates</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Interactive Map Demo */}
          <Card>
            <CardHeader>
              <CardTitle>Customize your trip with our interactive map</CardTitle>
              <CardDescription>
                Try out all three map features with sample data from Delhi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MapView 
                destination={defaultDestination}
                interests={defaultInterests}
                budget={defaultBudget}
                userUid={auth.user?.uid || 'guest'}
                onLocationSelect={(location) => {
                  console.log('Location selected:', location);
                }}
              />
            </CardContent>
          </Card>
        </div>
      </LayoutWrapper>
    </ProtectedRoute>
  );
}
  