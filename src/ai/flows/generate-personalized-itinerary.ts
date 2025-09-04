
// src/ai/flows/generate-personalized-itinerary.ts
'use server';

/**
 * @fileOverview Generates a personalized travel itinerary based on user inputs.
 *
 * - generatePersonalizedItinerary - A function that generates a personalized itinerary.
 * - GeneratePersonalizedItineraryInput - The input type for the generatePersonalizedItinerary function.
 * - GeneratePersonalizedItineraryOutput - The return type for the generatePersonalizedItinerary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const LocationSchema = z.object({
  latitude: z.number().describe('The latitude of the location.'),
  longitude: z.number().describe('The longitude of the location.'),
});

const GeneratePersonalizedItineraryInputSchema = z.object({
  destination: z.string().describe("The user's travel destination."),
  budget: z.number().describe('The user’s budget for the trip.'),
  interests: z.array(z.enum(['heritage', 'nightlife', 'adventure'])).describe('The user’s interests.'),
  travelDuration: z.number().describe('The duration of the trip in days.'),
});
export type GeneratePersonalizedItineraryInput = z.infer<typeof GeneratePersonalizedItineraryInputSchema>;

const ActivitySchema = z.object({
  name: z.string().describe('The name of the activity.'),
  description: z.string().describe('A brief description of the activity.'),
  cost: z.number().describe('The estimated cost of the activity.'),
  duration: z.number().describe('The estimated duration of the activity in hours.'),
  location: LocationSchema.describe('The location of the activity.'),
});

const AccommodationSchema = z.object({
  name: z.string().describe('The name of the accommodation.'),
  description: z.string().describe('A brief description of the accommodation.'),
  costPerNight: z.number().describe('The cost per night of the accommodation.'),
  location: LocationSchema.describe('The location of the accommodation.'),
});

const TransportationSchema = z.object({
  mode: z.string().describe('The mode of transportation (e.g., train, bus, flight).'),
  description: z.string().describe('A brief description of the transportation.'),
  cost: z.number().describe('The cost of the transportation.'),
  duration: z.number().describe('The duration of the transportation in hours.'),
});

const ItineraryItemSchema = z.object({
  day: z.number().describe('The day of the itinerary.'),
  accommodation: AccommodationSchema.optional(),
  transportation: TransportationSchema.optional(),
  activities: z.array(ActivitySchema).optional(),
});

const GeneratePersonalizedItineraryOutputSchema = z.object({
  itinerary: z.array(ItineraryItemSchema).describe('The generated itinerary.'),
  totalCost: z.number().describe('The total cost of the itinerary.'),
});
export type GeneratePersonalizedItineraryOutput = z.infer<typeof GeneratePersonalizedItineraryOutputSchema>;

const selectActivity = ai.defineTool(
  {
    name: 'selectActivity',
    description: 'Selects an activity based on user interests, budget, and available time in a given destination.',
    inputSchema: z.object({
      destination: z.string().describe("The user's travel destination."),
      interests: z.array(z.enum(['heritage', 'nightlife', 'adventure'])).describe('The user’s interests.'),
      budget: z.number().describe('The remaining budget for the trip.'),
      availableTime: z.number().describe('The available time in hours for the day.'),
    }),
    outputSchema: ActivitySchema,
  },
  async input => {
    // This is a placeholder implementation.
    // In a real application, this would involve a database lookup or an API call
    // to find activities matching the criteria. The location would be geocoded.
    const placeholderLocations = {
      "Paris": { latitude: 48.8566, longitude: 2.3522 },
      "New York": { latitude: 40.7128, longitude: -74.0060 },
      "Tokyo": { latitude: 35.6895, longitude: 139.6917 },
    };
    const location = (placeholderLocations as any)[input.destination] || { latitude: 48.8566, longitude: 2.3522 };

    return {
      name: 'Placeholder Activity',
      description: 'This is a placeholder activity.',
      cost: 50,
      duration: 2,
      location: location,
    };
  }
);

export async function generatePersonalizedItinerary(
  input: GeneratePersonalizedItineraryInput
): Promise<GeneratePersonalizedItineraryOutput> {
  return generatePersonalizedItineraryFlow(input);
}

const generatePersonalizedItineraryPrompt = ai.definePrompt({
  name: 'generatePersonalizedItineraryPrompt',
  input: {schema: GeneratePersonalizedItineraryInputSchema},
  output: {schema: GeneratePersonalizedItineraryOutputSchema},
  tools: [selectActivity],
  prompt: `You are a travel expert. Generate a personalized itinerary based on the user's destination, budget, interests, and travel duration.

Destination: {{{destination}}}
Budget: {{{budget}}}
Interests: {{#each interests}}{{{this}}} {{/each}}
Travel Duration: {{{travelDuration}}} days

Your response must be a valid JSON object that conforms to the output schema.
For each activity and accommodation, you must provide a valid location with latitude and longitude.
Use the selectActivity tool to choose activities.
When choosing accommodation, ensure it is within the specified destination.
The total cost should be a sum of all costs including accommodation, transportation, and activities for all days.
`,
});

const generatePersonalizedItineraryFlow = ai.defineFlow(
  {
    name: 'generatePersonalizedItineraryFlow',
    inputSchema: GeneratePersonalizedItineraryInputSchema,
    outputSchema: GeneratePersonalizedItineraryOutputSchema,
  },
  async input => {
    const {output} = await generatePersonalizedItineraryPrompt(input);
    return output!;
  }
);
