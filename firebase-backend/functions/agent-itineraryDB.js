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
                booking_date: data.bookingData.bookingDate,
                check_in_date: data.bookingData.checkInDate,
                check_out_date: data.bookingData.checkOutDate,
                quantity: data.bookingData.quantity || 1,
                unit_price: data.bookingData.unitPrice,
                total_amount: data.bookingData.totalAmount,
                currency: data.bookingData.currency || 'INR',
                status: data.bookingData.status || 'pending',
                payment_status: data.bookingData.payment_status || 'pending',
                special_requests: data.bookingData.specialRequests || null,
                cancellation_policy: data.bookingData.cancellationPolicy || null
            });



            // Parse the result if it's a string
            let parsedBookingResult = createBookingResult;
            if (typeof createBookingResult === 'string') {
                try {
                    parsedBookingResult = JSON.parse(createBookingResult);
                } catch (error) {
                    console.error('Failed to parse booking result:', error);
                    return { success: false, error: "Invalid booking response format" };
                }
            }


            // Wrap the result in a proper response object
            if (parsedBookingResult && Array.isArray(parsedBookingResult) && parsedBookingResult.length > 0) {
                return { success: true, data: parsedBookingResult[0] };
            } else if (parsedBookingResult && typeof parsedBookingResult === 'object' && parsedBookingResult.id) {
                // Handle case where tool returns a single object instead of array
                return { success: true, data: parsedBookingResult };
            } else {
                return { success: false, error: "Failed to create booking" };
            }

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

        case 'getBookingById':
            // Get a single booking by ID with its associated itinerary
            const getBookingByIdTool = toolMap.get('get-booking-by-id');
            if (!getBookingByIdTool) {
                return { success: false, error: "MISSING_AGENT" };
            }

            const getBookingByIdResult = await getBookingByIdTool({
                booking_id: parseInt(data.bookingId, 10)
            });
            
            // Parse result if it's a string
            let parsedBookingById = getBookingByIdResult;
            if (typeof getBookingByIdResult === 'string') {
                try {
                    parsedBookingById = JSON.parse(getBookingByIdResult);
                } catch (error) {
                    console.error('Failed to parse getBookingById result:', error);
                    return { success: false, error: "Invalid response format" };
                }
            }
            
            return parsedBookingById;

        case 'delete':
            const deleteItineraryTool = toolMap.get('delete-itinerary');
            if (!deleteItineraryTool) {
                return { success: false, error: "MISSING_AGENT" };
            }

            const deleteResult = await deleteItineraryTool({
                itinerary_id: data.itineraryId
            });

            let parsedDeleteResp = JSON.parse(deleteResult);

            if (parsedDeleteResp && Array.isArray(parsedDeleteResp) && parsedDeleteResp.length > 0) {
                return { success: true, data: parsedDeleteResp[0] };
            } else {
                return { success: false, error: "Failed to delete itinerary" };
            }

        case 'updateBookingStatus':
            const updateBookingStatusTool = toolMap.get('update-booking-status');
            if (!updateBookingStatusTool) {
                return { success: false, error: "MISSING_AGENT" };
            }

            const updateBookingStatusParams = {
                booking_id: data.bookingId,
                status: data.status,
                payment_status: data.payment_status ?? 'KEEP_CURRENT'
            };


            console.log("Raw data received:", JSON.stringify(data, null, 2));           

            const updateBookingStatusResult = await updateBookingStatusTool(updateBookingStatusParams);

            let parsedUpdateBookingStatusResp = JSON.parse(updateBookingStatusResult);

            // Wrap the result in a proper response object
            if (parsedUpdateBookingStatusResp && Array.isArray(parsedUpdateBookingStatusResp) && parsedUpdateBookingStatusResp.length > 0) {
                return { success: true, data: parsedUpdateBookingStatusResp[0] };
            } else {
                return { success: false, error: "Failed to update booking status" };
            }

        default:
            return { success: false, error: "INVALID_ACTION" };
    }
}
