export interface Location {
  latitude: number;
  longitude: number;
}

export interface Activity {
  name: string;
  description: string;
  cost: number;
  duration: number;
  location: Location;
}

export interface Accommodation {
  name: string;
  description: string;
  costPerNight: number;
  location: Location;
}

export interface ItineraryDay {
  day: number;
  accommodation?: Accommodation;
  activities?: Activity[];
}

// NEW: Add metadata interfaces
export interface SearchResults {
  hotelsFound: number;
  activitiesFound: number;
  availableRooms: number;
  searchLocation?: string;
  searchDate?: string;
}

export interface Recommendations {
  bestValueHotel?: string;
  mustDoActivity?: string;
  budgetTip?: string;
}

export interface ItineraryMetadata {
  searchResults: SearchResults;
  recommendations: Recommendations;
}

// UPDATED: Enhanced FullItinerary
export interface FullItinerary {
  itinerary: ItineraryDay[];
  totalCost: number;
  metadata: ItineraryMetadata; // NEW FIELD
}

export interface AdaptedItinerary {
  adaptedItinerary: string;
  reasoning: string;
}