import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { location, weatherType, activityType, originalActivity, budget } = await request.json();


    const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      throw new Error('Google Maps API key not found');
    }

    const alternatives = await getWeatherAppropriateAlternatives(
      location, 
      weatherType, 
      activityType, 
      originalActivity, 
      budget, 
      apiKey
    );

    return NextResponse.json({
      alternatives,
      location,
      weatherType,
      originalActivity
    });

  } catch (error) {
    console.error('Weather alternatives API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weather alternatives' },
      { status: 500 }
    );
  }
}

async function getWeatherAppropriateAlternatives(
  location: string, 
  weatherType: string, 
  activityType: string, 
  originalActivity: string, 
  budget: number, 
  apiKey: string
) {
  try {
    // Define search terms based on weather condition
    const searchTerms = getSearchTermsForWeather(weatherType, activityType);
    
    const alternatives = [];

    // Search for multiple types of indoor alternatives
    for (const searchTerm of searchTerms) {
      try {
        const places = await searchNearbyPlaces(location, searchTerm, apiKey);
        const processedPlaces = places.map((place: any) => ({
          name: place.name,
          cost: estimateCostForPlace(place, budget),
          description: place.vicinity || place.formatted_address || 'Indoor activity',
          duration: estimateDurationForActivity(searchTerm),
          location: place.vicinity || location,
          rating: place.rating,
          place_id: place.place_id,
          types: place.types
        }));

        alternatives.push(...processedPlaces);
      } catch (error) {
        console.error(`Error searching for ${searchTerm}:`, error);
      }
    }

    // Remove duplicates and sort by relevance
    const uniqueAlternatives = removeDuplicates(alternatives);
    const sortedAlternatives = uniqueAlternatives
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 3); // Return top 3 alternatives

           return sortedAlternatives;

  } catch (error) {
    console.error('Error getting weather alternatives:', error);
    return getFallbackAlternatives(weatherType, activityType, budget);
  }
}

function getSearchTermsForWeather(weatherType: string, activityType: string): string[] {
  const indoorTerms = [
    'museum',
    'art gallery',
    'shopping mall',
    'indoor entertainment',
    'cinema',
    'library',
    'cultural center',
    'aquarium',
    'planetarium',
    'indoor market'
  ];

  const weatherSpecificTerms = {
    'rain': ['museum', 'shopping mall', 'indoor entertainment', 'cinema', 'library'],
    'storm': ['shopping mall', 'cinema', 'indoor entertainment', 'museum'],
    'snow': ['shopping mall', 'indoor entertainment', 'museum', 'cultural center'],
    'heat': ['shopping mall', 'museum', 'library', 'cultural center', 'aquarium'],
    'cold': ['shopping mall', 'indoor entertainment', 'museum', 'cinema']
  };

  return weatherSpecificTerms[weatherType as keyof typeof weatherSpecificTerms] || indoorTerms;
}

async function searchNearbyPlaces(location: string, searchTerm: string, apiKey: string) {
  // Determine coordinates: if `location` is "lat,lng" use directly; otherwise geocode
  const latLngMatch = location.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  let lat: string;
  let lng: string;

  if (latLngMatch) {
    lat = latLngMatch[1];
    lng = latLngMatch[2];
  } else {
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${apiKey}`;
    const geocodeResponse = await fetch(geocodeUrl);
    if (!geocodeResponse.ok) {
      throw new Error(`Geocoding failed: ${geocodeResponse.status}`);
    }
    const geocodeData = await geocodeResponse.json();
    if (!geocodeData.results || geocodeData.results.length === 0) {
      throw new Error('Location not found');
    }
    const coordinates = geocodeData.results[0].geometry.location;
    lat = String(coordinates.lat);
    lng = String(coordinates.lng);
  }

  // Search for nearby places. Use keyword for free-text, and a generic type for POIs
  const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=5000&keyword=${encodeURIComponent(searchTerm)}&type=point_of_interest&key=${apiKey}`;
  const placesResponse = await fetch(placesUrl);
  
  if (!placesResponse.ok) {
    throw new Error(`Places search failed: ${placesResponse.status}`);
  }
  
  const placesData = await placesResponse.json();
  
  return placesData.results || [];
}

function estimateCostForPlace(place: any, originalBudget: number): number {
  // Estimate cost based on place type and original budget
  const placeTypes = place.types || [];
  
  if (placeTypes.includes('museum') || placeTypes.includes('art_gallery')) {
    return Math.round(originalBudget * 0.7); 
  }
  
  if (placeTypes.includes('shopping_mall') || placeTypes.includes('store')) {
    return Math.round(originalBudget * 1.2); 
  }
  
  if (placeTypes.includes('movie_theater') || placeTypes.includes('amusement_park')) {
    return Math.round(originalBudget * 0.8); 
  }
  
  if (placeTypes.includes('restaurant') || placeTypes.includes('food')) {
    return Math.round(originalBudget * 0.9); 
  }
  
  // Default to original budget with some variation
  return Math.round(originalBudget * (0.8 + Math.random() * 0.4));
}

function estimateDurationForActivity(activityType: string): number {
  const durationMap = {
    'museum': 2,
    'art gallery': 1.5,
    'shopping mall': 3,
    'cinema': 2,
    'library': 1,
    'cultural center': 2,
    'aquarium': 2,
    'planetarium': 1.5,
    'indoor market': 2
  };
  
  return durationMap[activityType as keyof typeof durationMap] || 2;
}

function removeDuplicates(alternatives: any[]): any[] {
  const seen = new Set();
  return alternatives.filter(alternative => {
    const key = alternative.name.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function getFallbackAlternatives(weatherType: string, activityType: string, budget: number) {
  // Fallback alternatives when API calls fail
  const fallbacks = {
    'rain': [
      {
        name: 'National Museum',
        cost: Math.round(budget * 0.8),
        description: 'Educational indoor museum experience',
        duration: 2,
        location: 'City Center',
        rating: 4.2
      },
      {
        name: 'Shopping Mall',
        cost: Math.round(budget * 1.1),
        description: 'Indoor shopping and entertainment',
        duration: 3,
        location: 'City Center',
        rating: 4.0
      }
    ],
    'storm': [
      {
        name: 'Cinema Complex',
        cost: Math.round(budget * 0.7),
        description: 'Indoor entertainment venue',
        duration: 2,
        location: 'City Center',
        rating: 4.1
      }
    ]
  };

  return fallbacks[weatherType as keyof typeof fallbacks] || fallbacks.rain;
}
