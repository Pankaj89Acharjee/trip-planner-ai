// Service for syncing itinerary data to PostgreSQL via Firebase Functions

import { SavedItinerary, BookingData } from './interfaces';

interface SyncItineraryData {
    userUid: string; // Firebase UID
    title: string;
    destination: string;
    itinerary: any; // FullItinerary object
    status?: 'draft' | 'saved' | 'booked' | 'completed' | 'cancelled';
    isFavorite?: boolean;
    travelDates?: {
        startDate: string;
        endDate: string;
    };
    participants?: number;
    budget?: number;
    preferences?: string[];
    totalDays?: number;
    totalCost?: number;
}

interface SyncBookingData {
    userUid: string; // Firebase UID
    itineraryId?: number;
    bookingType: 'hotel' | 'activity' | 'package';
    itemId: number;
    bookingReference: string;
    bookingDate: string;
    checkInDate?: string;
    checkOutDate?: string;
    quantity?: number;
    unitPrice: number;
    totalAmount: number;
    currency?: string;
    status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    payment_status?: 'pending' | 'paid' | 'refunded' | 'failed';
    specialRequests?: string;
    cancellationPolicy?: string;
}

interface SyncResponse {
    success: boolean;
    data?: any;
    error?: string;
}

class ItinerarySyncService {
    private baseUrl: string;

    constructor() {
        // agentAPI endpoint in Firebase
        this.baseUrl = "https://agentapi-clzbcargga-uc.a.run.app";
    }

    // Save itinerary to PostgreSQL
    async saveItinerary(itineraryData: SyncItineraryData): Promise<SyncResponse> {
        try {
            console.log('Attempting to save itinerary to PostgreSQL:', itineraryData);
            console.log('Using URL:', this.baseUrl);

            const requestBody = {
                action: 'save',
                itineraryData: itineraryData
            };
            console.log('Request body:', requestBody);

            const response = await fetch(`${this.baseUrl}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Response error text:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const result = await response.json();
            //console.log('Save itinerary result:', result);
            return {success: response.ok, data: result};
        } catch (error) {
            console.error('Error saving itinerary to PostgreSQL:', error);
            throw error;
        }
    }

    // Get user's itineraries from PostgreSQL
    async getUserItineraries(userUid: string): Promise<any[]> {
        try {
            console.log('Using URL for getting itinerarirs:', this.baseUrl);
            const response = await fetch(`${this.baseUrl}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'getUserItineraries',
                    userUid: userUid
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result; // Return the array directly
        } catch (error) {
            console.error('Error getting user itineraries from PostgreSQL:', error);
            throw error;
        }
    }

    // Update itinerary status (e.g., mark as booked)
    async updateItineraryStatus(itineraryId: number, status: string): Promise<SyncResponse> {
        try {
            const response = await fetch(`${this.baseUrl}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'updateStatus',
                    itineraryId: itineraryId,
                    status: status
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error updating itinerary status in PostgreSQL:', error);
            throw error;
        }
    }

    // Create booking
    async createBooking(bookingData: SyncBookingData): Promise<SyncResponse> {
        try {
            const response = await fetch(`${this.baseUrl}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'createBooking',
                    bookingData: bookingData
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error creating booking in PostgreSQL:', error);
            throw error;
        }
    }

    // Get user's bookings
    async getUserBookings(userUid: string): Promise<any[]> {
        try {
            const response = await fetch(`${this.baseUrl}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'getUserBookings',
                    userUid: userUid
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result; // Return the array directly
        } catch (error) {
            console.error('Error getting user bookings from PostgreSQL:', error);
            throw error;
        }
    }

    // Get a single booking by ID with its associated itinerary
    async getBookingById(bookingId: string | number): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'getBookingById',
                    bookingId: bookingId
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error getting booking by ID from PostgreSQL:', error);
            throw error;
        }
    }

    // Update booking status (e.g., cancel booking)
    async updateBookingStatus(bookingId: number, status: string, payment_status?: string): Promise<SyncResponse> {
        console.log("payment status received in Itenerary in frontend is:", payment_status);
        try {
            let bodyFormation = JSON.stringify({
                action: 'updateBookingStatus',
                bookingId: bookingId,
                status: status,
                payment_status: payment_status
            });

                        
            const response = await fetch(`${this.baseUrl}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: bodyFormation,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error updating booking status in PostgreSQL:', error);
            throw error;
        }
    }

    // Delete itinerary
    async deleteItinerary(itineraryId: number): Promise<SyncResponse> {
        try {
            const response = await fetch(`${this.baseUrl}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'delete',
                    itineraryId: itineraryId
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error deleting itinerary from PostgreSQL:', error);
            throw error;
        }
    }
}

// Helper function to convert frontend itinerary data to PostgreSQL sync format
export const itineraryDataToSyncInPostgres = (
    userUid: string,
    title: string,
    destination: string,
    itinerary: any,
    additionalData?: any
): SyncItineraryData => {
    return {
        userUid: userUid,
        title: title,
        destination: destination,
        itinerary: itinerary,
        status: additionalData?.status || 'saved',
        isFavorite: additionalData?.isFavorite || false,
        travelDates: additionalData?.travelDates,
        participants: additionalData?.participants || 1,
        budget: additionalData?.budget || 0,
        preferences: additionalData?.preferences || [],
        totalDays: additionalData?.totalDays || 1,
        totalCost: itinerary?.totalCost || 0,
    };
};

// Helper function to create booking data
export const createBookingData = (
    userUid: string,
    itineraryId: number,
    bookingType: 'hotel' | 'activity' | 'package',
    itemId: number,
    unitPrice: number,
    totalAmount: number,
    additionalData?: any
): SyncBookingData => {
    const bookingReference = `BK${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    return {
        userUid: userUid,
        itineraryId: itineraryId,
        bookingType: bookingType,
        itemId: itemId,
        bookingReference: bookingReference,
        bookingDate: new Date().toISOString().split('T')[0],
        checkInDate: additionalData?.checkInDate,
        checkOutDate: additionalData?.checkOutDate,
        quantity: additionalData?.quantity || 1,
        unitPrice: unitPrice,
        totalAmount: totalAmount,
        currency: additionalData?.currency || 'USD',
        status: 'completed',
        payment_status: 'pending',
        specialRequests: additionalData?.specialRequests,
        cancellationPolicy: additionalData?.cancellationPolicy,
    };
};

export const itinerarySyncService = new ItinerarySyncService();
export type { SyncItineraryData, SyncBookingData, SyncResponse };
