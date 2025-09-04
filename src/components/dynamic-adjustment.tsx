"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Wand, RefreshCw } from "lucide-react";
import { Textarea } from "./ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { adaptItineraryToChangesAction } from "@/lib/functionCalling";
import type { FullItinerary, AdaptedItinerary } from "@/lib/interfaces";

const formSchema = z.object({
  weatherCondition: z.string().min(1, "Please describe the weather."),
  delayInfo: z.string().optional(),
  lastMinuteBookings: z.string().optional(),
});

type DynamicAdjustmentFormProps = {
  originalItinerary: FullItinerary;
  adaptedItinerary: AdaptedItinerary | null;
  setAdaptedItinerary: (adapted: AdaptedItinerary | null) => void;
};

export function DynamicAdjustmentForm({
  originalItinerary,
  adaptedItinerary,
  setAdaptedItinerary,
}: DynamicAdjustmentFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      weatherCondition: "Heavy rain",
      delayInfo: "",
      lastMinuteBookings: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setAdaptedItinerary(null);
    try {
      const result = await adaptItineraryToChangesAction({
        originalItinerary: JSON.stringify(originalItinerary, null, 2),
        weatherCondition: values.weatherCondition,
        delayInfo: values.delayInfo || "",
        lastMinuteBookings: values.lastMinuteBookings || "",
      });
      setAdaptedItinerary(result);
      toast({
        title: "Itinerary Adapted!",
        description: "Your plan has been updated based on the new conditions.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Adaptation Failed",
        description: "Could not adapt the itinerary. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dynamic Itinerary Adjustment</CardTitle>
        <CardDescription>
          Adapt your plan based on real-time events.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="weatherCondition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Weather Condition</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Sunny, raining..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="delayInfo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transportation Delays</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Flight delayed by 2 hours" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastMinuteBookings"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last-Minute Opportunities</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Tickets available for a concert" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand className="mr-2 h-4 w-4" />
              )}
              Adapt Itinerary
            </Button>
          </form>
        </Form>
        {adaptedItinerary && (
          <div className="mt-6 space-y-4 animate-in fade-in duration-300">
            <div>
              <h4 className="font-semibold mb-2">Reasoning for Changes:</h4>
              <p className="text-sm p-3 bg-muted rounded-md">{adaptedItinerary.reasoning}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">New Itinerary Suggestion:</h4>
              <Textarea
                readOnly
                value={adaptedItinerary.adaptedItinerary}
                className="h-48 text-sm"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
