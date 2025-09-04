"use server";

import {
  generatePersonalizedItinerary,
  type GeneratePersonalizedItineraryInput,
} from "@/ai/flows/generate-personalized-itinerary";

import {
  adaptItineraryToChanges,
  type AdaptItineraryToChangesInput,
} from "@/ai/flows/adapt-itinerary-to-changes";

export async function generatePersonalizedItineraryAction(
  input: GeneratePersonalizedItineraryInput
) {
  try {
    const result = await generatePersonalizedItinerary(input);
    return result;
  } catch (error) {
    console.error("Error generating itinerary:", error);
    throw new Error("Failed to generate itinerary. The AI model may be unavailable or the request was invalid.");
  }
}

export async function adaptItineraryToChangesAction(
  input: AdaptItineraryToChangesInput
) {
    try {
        const result = await adaptItineraryToChanges(input);
        return result;
    } catch (error) {
        console.error("Error adapting itinerary:", error);
        throw new Error("Failed to adapt itinerary. The AI model may be unavailable or the request was invalid.");
    }
}
