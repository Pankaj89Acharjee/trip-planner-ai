// API route to backfill distance data for existing itineraries
import { NextRequest, NextResponse } from 'next/server';
import { calculateTotalItineraryDistance } from '@/lib/distanceCalculator';

export async function POST(request: NextRequest) {
  try {
    const { itineraryId, destination, itineraryData } = await request.json();

    if (!itineraryId || !itineraryData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate distances
    const { calculateDistanceFromUserLocation } = await import('@/lib/distanceCalculator');
    
    const itinerary = typeof itineraryData === 'string' 
      ? JSON.parse(itineraryData) 
      : itineraryData;

    const totalDistance = calculateTotalItineraryDistance(itinerary.itinerary || itinerary.days || []);
    const fromCurrentLocation = destination 
      ? await calculateDistanceFromUserLocation(destination)
      : 'N/A';

    console.log(`Calculated distances for itinerary ${itineraryId}:`, {
      totalDistance,
      fromCurrentLocation
    });

    // Return the calculated distances
    // In a production app, you'd update the database here
    return NextResponse.json({
      success: true,
      data: {
        itineraryId,
        totalDistance,
        fromCurrentLocation
      }
    });

  } catch (error) {
    console.error('Error backfilling distances:', error);
    return NextResponse.json(
      { 
        error: 'Failed to calculate distances',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

