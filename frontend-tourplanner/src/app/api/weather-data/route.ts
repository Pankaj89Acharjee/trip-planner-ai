import { NextRequest, NextResponse } from 'next/server';

// Check if a string looks like an activity description rather than a location
function looksLikeActivityDescription(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  // Activity keywords that indicate this is not a location
  const activityKeywords = [
    'explore', 'visit', 'tour', 'experience', 'enjoy', 'discover',
    'adventure', 'activity', 'attraction', 'excursion', 'outing',
    'market', 'cuisine', 'food', 'shopping', 'sightseeing'
  ];
  // If it contains multiple words and activity keywords, likely a description
  const words = lower.split(/\s+/);
  const hasActivityKeyword = activityKeywords.some(keyword => lower.includes(keyword));
  // If it's a long description-like text (3+ words) with activity keywords, it's probably not a location
  return hasActivityKeyword && words.length >= 3;
}

export async function POST(request: NextRequest) {
  try {
    const { location } = await request.json();

    console.log('Weather API request for location:', location);

    if (!location) {
      return NextResponse.json(
        { error: 'Location parameter is required' },
        { status: 400 }
      );
    }


    const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!googleApiKey) {
      console.error('Google Maps API key is not set in environment variables');
      return NextResponse.json(
        { error: 'Google Maps API key not configured. Please set GOOGLE_MAPS_SERVER_API_KEY or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your .env file.' },
        { status: 500 }
      );
    }

    // Ensure location is a string
    const locationStr = typeof location === 'string' ? location : String(location);

    // Handle coordinates format (lat,lng) or location name
    const latLngMatch = locationStr.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    let lat: number;
    let lng: number;

    if (latLngMatch) {
      lat = parseFloat(latLngMatch[1]);
      lng = parseFloat(latLngMatch[2]);
    } else {
      if (looksLikeActivityDescription(locationStr)) {
        return NextResponse.json(
          { error: `Invalid location: "${locationStr}" appears to be an activity description rather than a location. Please provide coordinates (lat,lng) or a valid location name/city.` },
          { status: 400 }
        );
      }

      // If location is a name/city, geocode it first to get coordinates
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(locationStr)}&key=${googleApiKey}`;
      console.log('Geocoding location:', locationStr);
      
      const geocodeResponse = await fetch(geocodeUrl);
      if (!geocodeResponse.ok) {
        throw new Error(`Geocoding API error: ${geocodeResponse.status}`);
      }
      
      const geocodeData = await geocodeResponse.json();
      if (!geocodeData.results || geocodeData.results.length === 0) {
        return NextResponse.json(
          { error: `Location "${locationStr}" not found. Please check the location name or use coordinates in format "lat,lng".` },
          { status: 404 }
        );
      }
      
      const coordinates = geocodeData.results[0].geometry.location;
      lat = coordinates.lat;
      lng = coordinates.lng;
      console.log('Geocoded to coordinates:', lat, lng);
    }

    
    const weatherUrl = `https://weather.googleapis.com/v1/currentConditions:lookup?key=${googleApiKey}&location.latitude=${lat}&location.longitude=${lng}`;

    console.log('Fetching weather data from Google Cloud Weather API for coordinates:', lat, lng);

    const weatherResponse = await fetch(weatherUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!weatherResponse.ok) {
      const errorText = await weatherResponse.text();
      const errorData = await weatherResponse.json().catch(() => ({ message: errorText }));
      console.error('Google Cloud Weather API error:', weatherResponse.status, errorData);
      
      // Return proper error based on status
      if (weatherResponse.status === 404) {
        return NextResponse.json(
          { error: `Weather data not found for location. Please check coordinates: ${lat},${lng}` },
          { status: 404 }
        );
      }
      
      if (weatherResponse.status === 403 || weatherResponse.status === 401) {       
        let errorMessage = 'Google Cloud Weather API access denied.';
        
        return NextResponse.json(
          { error: errorMessage },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: `Weather API error: ${weatherResponse.status}. ${errorData.message || errorData.error?.message || 'Failed to fetch weather data'}` },
        { status: weatherResponse.status }
      );
    }

    const weatherData = await weatherResponse.json();
    //console.log('Weather data received successfully for:', locationStr);

    
    const transformedData = {
      main: {
        temp: weatherData.temperature?.degrees || null,
        feels_like: weatherData.feelsLikeTemperature?.degrees || null,
        humidity: weatherData.relativeHumidity || null,
        pressure: weatherData.airPressure?.meanSeaLevelMillibars || null
      },
      weather: [{
        main: weatherData.weatherCondition?.type || 'Unknown',
        description: weatherData.weatherCondition?.description?.text || 'Unknown condition'
      }],
      wind: {
        speed: weatherData.wind?.speed?.value ? weatherData.wind.speed.value * 0.277778 : 0, // Convert km/h to m/s (divide by 3.6)
        deg: weatherData.wind?.direction?.degrees || 0
      },
      visibility: weatherData.visibility?.distance ? weatherData.visibility.distance : 10, // Already in km
      rain: weatherData.precipitation?.qpf?.quantity && weatherData.precipitation.qpf.quantity > 0 
        ? { '1h': weatherData.precipitation.qpf.quantity } 
        : undefined,
      snow: weatherData.precipitation?.snowQpf?.quantity && weatherData.precipitation.snowQpf.quantity > 0 
        ? { '1h': weatherData.precipitation.snowQpf.quantity } 
        : undefined,
      precipitationProbability: weatherData.precipitation?.probability?.percent || 0, // Probability of precipitation (0-100%)
      coord: { lat, lon: lng },
      name: locationStr,
      // Include raw data for reference
      raw: weatherData
    };

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Weather data API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weather data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
