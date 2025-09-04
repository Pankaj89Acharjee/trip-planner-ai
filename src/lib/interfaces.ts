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
    name:string;
    description: string;
    costPerNight: number;
    location: Location;
  }
  
  export interface Transportation {
    mode: string;
    description: string;
    cost: number;
    duration: number;
  }
  
  export interface ItineraryDay {
    day: number;
    accommodation?: Accommodation;
    transportation?: Transportation;
    activities?: Activity[];
  }
  
  export interface FullItinerary {
    itinerary: ItineraryDay[];
    totalCost: number;
  }
  
  export interface AdaptedItinerary {
    adaptedItinerary: string;
    reasoning: string;
  }
  