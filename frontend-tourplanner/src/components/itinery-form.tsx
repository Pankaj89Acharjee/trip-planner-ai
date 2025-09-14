"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { generatePersonalizedItineraryAction } from "@/lib/functionCalling";
import { useToast } from "@/hooks/use-toast";
import type { FullItinerary } from "@/lib/interfaces";
import { Card, CardContent } from "@/components/ui/card";
import { Bike, Landmark, PartyPopper, Sparkles, MapPin, Utensils, ShoppingBag, Book } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { askAgent } from "@/lib/agentFunctionCall";
import { ItineraryDisplay } from "./itinery-display";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

const interests = [
  { id: "heritage", label: "Heritage", icon: Landmark },
  { id: "nightlife", label: "Nightlife", icon: PartyPopper },
  { id: "adventure", label: "Adventure", icon: Bike },
  { id: "food", label: "Food", icon: Utensils },
  { id: "shopping", label: "Shopping", icon: ShoppingBag },
  { id: "culture", label: "Culture", icon: Book },
] as const;

const formSchema = z.object({
  destination: z.string().min(2, "Please enter a destination."),
  budget: z.number().min(100, "Budget must be at least $100."),
  interests: z
    .array(z.string())
    .refine((value) => value.some((item) => item), {
      message: "Please select at least one interest.",
    }),
  travelDuration: z
    .number()
    .min(1, "Duration must be at least 1 day.")
    .max(14, "Duration cannot exceed 14 days."),
  startDate: z.string().min(1, "Please select a start date."),
  participants: z.number().min(1, "At least 1 participant required.").max(10, "Maximum 10 participants."),
  isFavorite: z.boolean(),
});

type ItineraryFormProps = {
  setItinerary: (itinerary: FullItinerary | null) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFormValues?: (values: any) => void;
  setAdaptedItinerary?: (itinerary: any) => void;
};

export function ItineraryForm({ setItinerary, setIsLoading, setError, setFormValues }: ItineraryFormProps) {
  const { toast } = useToast();
  const { userData } = useAuth();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      destination: "Paris",
      budget: 1000,
      interests: [],
      travelDuration: 3,
      startDate: new Date().toISOString().split('T')[0],
      participants: 1,
      isFavorite: false,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);
    setItinerary(null);
    console.log("Values submitted", values);
    try {


      // Question passing to the AI agent
      const question = `Generate a personalized travel itinerary for ${values.destination} with a total budget of ₹${values.budget} for ${values.travelDuration} days for ${values.participants} participants. This is the TOTAL budget for the entire trip, not per day. Interests: ${values.interests.join(', ')}. Start date: ${values.startDate}. Please find accommodation and activities within this total budget.`;

      // Use Firebase UID directly - no mapping needed!
      const result = await askAgent(question, userData?.uid, values);

      console.log("Receive Itenery from Agent", result.answer)
     
      //Removing markdown if any at the beginning
      let jsonString = result.answer;
      if (jsonString?.includes('```json')) {
        jsonString = jsonString.replace(/```json\s*/, '').replace(/\s*```/, '');
      } else if (jsonString?.includes('```')) {
        jsonString = jsonString.replace(/```\s*/, '').replace(/\s*```/, '');
      }


      if (!result || !result.answer) {
        throw new Error("The AI could not generate an itinerary. Please try again with different options.");
      }

      //Parsing the Itinerydata
      let itineraryData
      try {
        itineraryData = JSON.parse(jsonString || '{}');
      } catch (error) {
        console.error('JSON Parse Error:', error);
        console.error('Raw response:', result.answer);
        throw new Error("Invalid itinerary format received from AI.");
      }


      // Validate the structure
      if (!itineraryData.itinerary || !itineraryData.totalCost) {
        throw new Error("Invalid itinerary format received from AI.");
      }

      // Set loading to false first, then set itinerary
      setIsLoading(false);
      setItinerary(itineraryData);

      // Save form values for saving itinerary
      if (setFormValues) {
        setFormValues(values);
      }

    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred.";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: errorMessage,
      });
      setIsLoading(false);
    }
  }


  return (
    <Card className="shadow-2xl shadow-primary/10">
      <CardContent className="p-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Where are you willing to go?</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="e.g., Paris, Tokyo..." className="pl-10" {...field} />
                    </div>
                  </FormControl>
                  <FormDescription className="text-gray-600">
                    Plan what are you looking for
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="budget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What's your budget?</FormLabel>
                  <FormControl>
                    <div>
                      <div className="text-2xl font-bold text-primary mb-2 text-purple-500/90">
                        ₹{field.value.toLocaleString()}
                      </div>
                      <Slider
                        min={100}
                        max={10000}
                        step={50}
                        value={[field.value]}
                        onValueChange={(vals) => field.onChange(vals[0])}
                      />
                    </div>
                  </FormControl>
                  <FormDescription className="text-gray-600">
                    The total budget for your trip.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="interests"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What are your interests?</FormLabel>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {interests.map((item) => {
                      const Icon = item.icon;
                      return (
                        <FormItem key={item.id} className="w-full h-full">
                          <div
                            className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 h-full hover:shadow-md ${field.value?.includes(item.id)
                              ? 'border-purple-500 bg-purple-800/20 text-white shadow-lg'
                              : 'border-gray-300 bg-gray-800 hover:border-purple-300 hover:bg-gray-700/90 text-gray-400'
                              }`}
                            onClick={() => {
                              const currentValues = field.value || [];
                              const isSelected = currentValues.includes(item.id);

                              if (isSelected) {
                                // Remove item
                                field.onChange(currentValues.filter((value) => value !== item.id));
                              } else {
                                // Add item
                                field.onChange([...currentValues, item.id]);
                              }
                            }}
                          >
                            <Icon className={`w-8 h-8 mb-2 transition-colors ${field.value?.includes(item.id) ? 'text-white' : 'text-purple-500/90'
                              }`} />
                            <span className={`font-semibold transition-colors ${field.value?.includes(item.id) ? 'text-white' : 'text-gray-400'
                              }`}>{item.label}</span>
                          </div>
                        </FormItem>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="travelDuration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How many days will you be traveling?</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(Number(val))}
                    defaultValue={String(field.value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select travel duration" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {[...Array(14)].map((_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>
                          {i + 1} day{i > 0 ? "s" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>When do you want to start your trip?</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormDescription className="text-gray-600">
                    Select your preferred start date.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="participants"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How many people are traveling?</FormLabel>
                  <FormControl>
                    <div>
                      <div className="text-2xl font-bold text-primary mb-2 text-purple-500/90">
                        {field.value} {field.value === 1 ? 'Person' : 'People'}
                      </div>
                      <Slider
                        min={1}
                        max={10}
                        step={1}
                        value={[field.value]}
                        onValueChange={(vals) => field.onChange(vals[0])}
                      />
                    </div>
                  </FormControl>
                  <FormDescription className="text-gray-600">
                    Number of travelers for this trip.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isFavorite"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Mark as favorite
                    </FormLabel>
                    <FormDescription className="text-gray-600">
                      Save this itinerary to your favorites for easy access.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <Button type="submit" size="lg" className="w-full bg-purple-400/90">
              <Sparkles className="mr-2 h-4 w-4 text-gray-800" />
              <span className="text-black space-x-2 text-base">Generate My Itinerary</span>
            </Button>
          </form>
        </Form>

        {/* Displaying the Contents when Data received from the MCP server through the Agent */}

      </CardContent>
    </Card>
  );
}
