import { ToolboxClient } from '@toolbox-sdk/core'

const TOOLBOX_URL = 'https://toolbox-153773761918.us-central1.run.app';
const client = new ToolboxClient(TOOLBOX_URL);

export async function itineraryDatabaseAgent(action, data) {
    const toolset = await client.loadToolset();
    const toolMap = new Map(toolset.map(t => [t.getName(), t]));

    switch (action) {
        case 'save':
            // Save itinerary to PostgreSQL
            const saveItineraryTool = toolMap.get('save-itinerary');
            if (!saveItineraryTool) {
                return { success: false, error: "MISSING_AGENT" };
            }

            const result = await saveItineraryTool({
                user_uid: data.itineraryData.userUid,
                title: data.itineraryData.title,
                destination: data.itineraryData.destination,
                total_days: data.itineraryData.totalDays || data.itineraryData.itinerary?.days?.length || 1,
                total_cost: data.itineraryData.totalCost || data.itineraryData.itinerary?.totalCost || 0,
                budget: data.itineraryData.budget || 0,
                preferences: data.itineraryData.preferences ? JSON.stringify(data.itineraryData.preferences) : null,
                itinerary_data: JSON.stringify(data.itineraryData.itinerary),
                status: data.itineraryData.status || 'saved',
                is_favorite: data.itineraryData.isFavorite || false,
                participants: data.itineraryData.participants || 1,
                travel_dates: data.itineraryData.travelDates ? JSON.stringify(data.itineraryData.travelDates) : null
            });
            return result;

        case 'getUserItineraries':
            // Get user's itineraries from PostgreSQL
            const getUserItinerariesTool = toolMap.get('get-user-itineraries');
            if (!getUserItinerariesTool) {
                return { success: false, error: "MISSING_AGENT" };
            }

            const getUserItinerariesResult = await getUserItinerariesTool({
                user_uid: data.userUid
            });
            return getUserItinerariesResult;

        case 'updateStatus':
            // Update itinerary status
            const updateStatusTool = toolMap.get('update-itinerary-status');
            if (!updateStatusTool) {
                return { success: false, error: "MISSING_AGENT" };
            }

            const updateStatusResult = await updateStatusTool({
                itinerary_id: data.itineraryId,
                status: data.status
            });
            return updateStatusResult;

        case 'createBooking':
            // Create booking
            const createBookingTool = toolMap.get('create-booking');
            if (!createBookingTool) {
                return { success: false, error: "MISSING_AGENT" };
            }

            const createBookingResult = await createBookingTool({
                user_uid: data.bookingData.userUid,
                itinerary_id: data.bookingData.itineraryId,
                booking_type: data.bookingData.bookingType,
                item_id: data.bookingData.itemId,
                booking_reference: data.bookingData.bookingReference,
                booking_date: data.bookingData.bookingDate,
                check_in_date: data.bookingData.checkInDate,
                check_out_date: data.bookingData.checkOutDate,
                quantity: data.bookingData.quantity || 1,
                unit_price: data.bookingData.unitPrice,
                total_amount: data.bookingData.totalAmount,
                currency: data.bookingData.currency || 'USD',
                status: data.bookingData.status || 'pending',
                payment_status: data.bookingData.paymentStatus || 'pending',
                special_requests: data.bookingData.specialRequests,
                cancellation_policy: data.bookingData.cancellationPolicy
            });
            return createBookingResult;

        case 'getUserBookings':
            // Get user's bookings
            const getUserBookingsTool = toolMap.get('get-user-bookings');
            if (!getUserBookingsTool) {
                return { success: false, error: "MISSING_AGENT" };
            }

            const getUserBookingsResult = await getUserBookingsTool({
                user_uid: data.userUid
            });
            return getUserBookingsResult;

        case 'delete':
            // Delete itinerary
            const deleteItineraryTool = toolMap.get('delete-itinerary');
            if (!deleteItineraryTool) {
                return { success: false, error: "MISSING_AGENT" };
            }

            const deleteResult = await deleteItineraryTool({
                itinerary_id: data.itineraryId
            });
            return deleteResult;

        case 'updateBookingStatus':
            const updateBookingStatusTool = toolMap.get('update-booking-status');
            if (!updateBookingStatusTool) {
                return { success: false, error: "MISSING_AGENT" };
            }

            const updateBookingStatusResult = await updateBookingStatusTool({
                booking_id: data.bookingId,
                status: data.status
            });
            return updateBookingStatusResult;

        default:
            return { success: false, error: "INVALID_ACTION" };
    }
}
