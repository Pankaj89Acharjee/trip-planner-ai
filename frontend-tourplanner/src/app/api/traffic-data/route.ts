import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { origin, destination } = await request.json();

    console.log('Traffic API request:', { origin, destination });

    if (!origin || !destination) {
      return NextResponse.json(
        { error: 'Missing required parameters: origin and destination' },
        { status: 400 }
      );
    }

    // Get Google Maps API key from environment variables
    const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Maps API key not configured' },
        { status: 500 }
      );
    }

    // Ensure locations are strings
    const originStr = typeof origin === 'string' ? origin : String(origin);
    const destinationStr = typeof destination === 'string' ? destination : String(destination);

    // Parse coordinates if they're in "lat,lng" format
    const parseCoordinates = (location: string) => {
      const match = location.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
      if (match) {
        return { latitude: parseFloat(match[1]), longitude: parseFloat(match[2]) };
      }
      return null;
    };

    const originCoords = parseCoordinates(originStr);
    const destCoords = parseCoordinates(destinationStr);

    if (!originCoords || !destCoords) {
      return NextResponse.json(
        { error: 'Invalid coordinates format. Use "lat,lng" format for both origin and destination' },
        { status: 400 }
      );
    }

    const routesApiUrl = `https://routes.googleapis.com/directions/v2:computeRoutes?key=${apiKey}`;
    
    const requestBody = {
      origin: {
        location: {
          latLng: originCoords
        }
      },
      destination: {
        location: {
          latLng: destCoords
        }
      },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      computeAlternativeRoutes: false,
      routeModifiers: {
        avoidTolls: false,
        avoidHighways: false,
        avoidFerries: false
      },
      departureTime: new Date().toISOString(),
      languageCode: 'en',
      units: 'METRIC'
    };

    console.log('Fetching traffic data from Routes API');

    const response = await fetch(routesApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline,routes.legs.steps,routes.legs.duration,routes.legs.distanceMeters,routes.legs.staticDuration'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      const errorData = await response.json().catch(() => ({ message: errorText }));
      console.error('Routes API error:', response.status, errorData);
      
      if (response.status === 403 || response.status === 401) {
        return NextResponse.json(
          { error: 'Routes API access denied. Please ensure: 1) Routes API is enabled in Google Cloud Console, 2) API key has Routes API permissions, 3) Application restrictions are set to "IP addresses" or "None" (NOT "HTTP referrers")' },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: `Routes API error: ${response.status}. ${errorData.message || errorData.error?.message || 'Failed to fetch traffic data'}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Traffic data received successfully');

    // Transform Routes API response to include useful route information
    const transformedData = {
      routes: data.routes || [],
      origin_addresses: [originStr],
      destination_addresses: [destinationStr],
      status: 'OK',
      // Extract useful information for display
      routeInfo: data.routes && data.routes.length > 0 ? {
        distance: data.routes[0].distanceMeters,
        distanceText: `${(data.routes[0].distanceMeters / 1000).toFixed(1)} km`,
        duration: data.routes[0].duration,
        durationSeconds: parseInt(data.routes[0].duration?.replace('s', '') || '0'),
        durationText: formatDuration(data.routes[0].duration),
        staticDuration: data.routes[0].legs?.[0]?.staticDuration || '0',
        staticDurationSeconds: parseInt(data.routes[0].legs?.[0]?.staticDuration?.replace('s', '') || '0'),
        delaySeconds: Math.max(0, parseInt(data.routes[0].duration?.replace('s', '') || '0') - parseInt(data.routes[0].staticDuration?.replace('s', '') || '0')),
        delayText: formatDurationDelay(data.routes[0].duration, data.routes[0].staticDuration),
        steps: data.routes[0].legs?.[0]?.steps || [],
        polyline: data.routes[0].polyline?.encodedPolyline
      } : null
    };

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Traffic data API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch traffic data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper function to format duration (e.g., "365s" -> "6 minutes")
function formatDuration(duration: string): string {
  if (!duration) return 'Unknown';
  const seconds = parseInt(duration.replace('s', '') || '0');
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours} hour${hours !== 1 ? 's' : ''} ${mins > 0 ? `${mins} minute${mins !== 1 ? 's' : ''}` : ''}`.trim();
}

// Helper function to format delay
function formatDurationDelay(duration: string, staticDuration: string): string {
  if (!duration || !staticDuration) return 'No delay';
  const durationSeconds = parseInt(duration.replace('s', '') || '0');
  const staticSeconds = parseInt(staticDuration.replace('s', '') || '0');
  const delay = Math.max(0, durationSeconds - staticSeconds);
  if (delay === 0) return 'No delay';
  const delayMinutes = Math.round(delay / 60);
  return `${delayMinutes} minute${delayMinutes !== 1 ? 's' : ''} delay`;
}
