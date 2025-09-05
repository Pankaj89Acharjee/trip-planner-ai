// 'use server'

/**
 * @fileOverview Dynamically adapts a travel itinerary based on real-time events like weather changes or delays.
 *
 * - adaptItineraryToChanges - A function that takes an itinerary and real-time event data and returns an adapted itinerary.
 * - AdaptItineraryToChangesInput - The input type for the adaptItineraryToChanges function.
 * - AdaptItineraryToChangesOutput - The return type for the adaptItineraryToChanges function.
 */

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AdaptItineraryToChangesInputSchema = z.object({
  originalItinerary: z.string().describe('The original travel itinerary as a text string.'),
  weatherCondition: z.string().describe('The current weather conditions at the destination.'),
  delayInfo: z.string().describe('Information about any delays in transportation.'),
  lastMinuteBookings: z.string().describe('Information about any last-minute bookings.'),
});
export type AdaptItineraryToChangesInput = z.infer<
  typeof AdaptItineraryToChangesInputSchema
>;

const AdaptItineraryToChangesOutputSchema = z.object({
  adaptedItinerary: z.string().describe('The adapted travel itinerary as a text string.'),
  reasoning: z
    .string()
    .describe('Explanation of changes made to the itinerary and why.'),
});
export type AdaptItineraryToChangesOutput = z.infer<
  typeof AdaptItineraryToChangesOutputSchema
>;

export async function adaptItineraryToChanges(
  input: AdaptItineraryToChangesInput
): Promise<AdaptItineraryToChangesOutput> {
  return adaptItineraryToChangesFlow(input);
}

const adaptItineraryToChangesPrompt = ai.definePrompt({
  name: 'adaptItineraryToChangesPrompt',
  input: {schema: AdaptItineraryToChangesInputSchema},
  output: {schema: AdaptItineraryToChangesOutputSchema},
  prompt: `You are a travel expert that dynamically adjusts travel itineraries in real-time.

  Given the original itinerary, current weather conditions, delay information, and last-minute booking opportunities, revise the itinerary to provide an up-to-date and optimized travel plan.
  Explain the changes made and the reasons for those changes.

  Original Itinerary: {{{originalItinerary}}}
  Weather Conditions: {{{weatherCondition}}}
  Delay Information: {{{delayInfo}}}
  Last-Minute Bookings: {{{lastMinuteBookings}}}

  Adapted Itinerary:`,
});

const adaptItineraryToChangesFlow = ai.defineFlow(
  {
    name: 'adaptItineraryToChangesFlow',
    inputSchema: AdaptItineraryToChangesInputSchema,
    outputSchema: AdaptItineraryToChangesOutputSchema,
  },
  async input => {
    const {output} = await adaptItineraryToChangesPrompt(input);
    return output!;
  }
);
