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

export interface Transportation {
  mode: string;
  description: string;
  cost: number;
  duration: number;
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


export interface FullItinerary {
  itinerary: ItineraryDay[];
  totalCost: number;
  metadata: ItineraryMetadata; // NEW FIELD
}

export interface AdaptedItinerary {
  adaptedItinerary: string;
  reasoning: string;
}


export interface SavedItinerary {
  id?: number;
  userUid: string; // Firebase UID
  title: string;
  destination: string;
  itinerary: FullItinerary;
  status: 'draft' | 'saved' | 'booked' | 'completed' | 'cancelled';
  isFavorite: boolean;
  travelDates?: {
    startDate: string;
    endDate: string;
  };
  participants: number;
  createdAt: string;
  updatedAt: string;
}


export interface BookingData {
  id?: number;
  userUid: string; // Firebase UID
  itineraryId?: number;
  bookingType: 'hotel' | 'activity' | 'package';
  itemId: number;
  bookingReference: string;
  bookingDate: string;
  checkInDate?: string;
  checkOutDate?: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed';
  specialRequests?: string;
  cancellationPolicy?: string;
  createdAt: string;
  updatedAt: string;
}

