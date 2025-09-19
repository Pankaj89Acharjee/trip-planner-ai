import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { origin, destination, apiKey } = await request.json();

    console.log('Traffic API request:', { origin, destination, apiKey: apiKey ? 'provided' : 'missing' });

    if (!origin || !destination || !apiKey) {
      console.error('Missing parameters:', { origin, destination, hasApiKey: !!apiKey });
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Ensure locations are strings
    const originStr = typeof origin === 'string' ? origin : String(origin);
    const destinationStr = typeof destination === 'string' ? destination : String(destination);

    // Make the Google Maps API call from the server side
    const apiUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(originStr)}&destinations=${encodeURIComponent(destinationStr)}&departure_time=now&traffic_model=best_guess&key=${apiKey}`;
    console.log('Making request to:', apiUrl.replace(apiKey, 'API_KEY_HIDDEN'));

    const response = await fetch(apiUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Maps API error:', response.status, errorText);
      throw new Error(`Google Maps API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Traffic data received for:', originStr, 'to', destinationStr);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Traffic data API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch traffic data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
