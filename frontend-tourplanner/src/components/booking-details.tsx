'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  MapPin, 
  DollarSign, 
  Clock, 
  Users, 
  Hotel, 
  Mountain,
  Navigation,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  Cloud,
  Car
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ItineraryShareExport } from './itinerary-share-export';
import type { ItineraryData } from '@/lib/itineraryExport';
import { SmartAdjustmentNotifications } from './smart-adjustment-notifications';
import { TrafficMonitoring } from './traffic-monitoring';

interface BookingDetailsProps {
  bookingId?: string;
  onBack?: () => void;
}

export function BookingDetails({ bookingId, onBack }: BookingDetailsProps) {
  const { userData } = useAuth();
  const { toast } = useToast();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showWeatherMonitoring, setShowWeatherMonitoring] = useState(false);
  const [itineraryForMonitoring, setItineraryForMonitoring] = useState<any>(null);

  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails();
    }
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      
      if (!userData?.uid || !bookingId) {
        console.warn('Missing user data or booking ID');
        setLoading(false);
        return;
      }

      // Fetch booking details from API
      const { itinerarySyncService } = await import('@/lib/itinerarySyncService');
      const result = await itinerarySyncService.getBookingById(bookingId);

      // Parse result if it's a string
      let parsedResult = result;
      if (typeof result === 'string') {
        try {
          parsedResult = JSON.parse(result);
        } catch (parseError) {
          console.error('Failed to parse booking result:', parseError);
          throw new Error('Invalid response format');
        }
      }

      console.log('Parsed result:', parsedResult);

      // Handle array response from SQL query
      let bookingData, itineraryData;
      if (Array.isArray(parsedResult) && parsedResult.length > 0) {
        // Response is an array with result object
        const resultObj = parsedResult[0].result;
        bookingData = resultObj.booking;
        itineraryData = resultObj.itinerary;
      } else if (parsedResult.booking) {
        // Direct object response
        bookingData = parsedResult.booking;
        itineraryData = parsedResult.itinerary;
      } else {
        console.error('Unexpected response format:', parsedResult);
        throw new Error('Booking not found');
      }

      if (!bookingData) {
        throw new Error('Booking not found');
      }

      // Parse itinerary_data if it's a string
      let itineraryDetails = itineraryData?.itinerary_data;
      if (typeof itineraryDetails === 'string') {
        try {
          itineraryDetails = JSON.parse(itineraryDetails);
        } catch (error) {
          console.error('Failed to parse itinerary_data:', error);
        }
      }

      // Extract itinerary array (support both .itinerary and .days format)
      const itineraryArray = itineraryDetails?.itinerary || itineraryDetails?.days || [];

      // Get accommodation (first day or any day with accommodation)
      let accommodation = null;
      for (const day of itineraryArray) {
        if (day.accommodation) {
          accommodation = day.accommodation;
          break;
        }
      }

      // Extract all activities from all days
      const activities = itineraryArray.flatMap((day: any) => {
        const dayActivities = day.activities || [];
        return dayActivities.map((activity: any) => ({
          ...activity,
          // Format location to string
          location: typeof activity.location === 'string'
            ? activity.location
            : activity.location?.address || activity.location?.city ||
              (activity.location?.latitude && activity.location?.longitude
                ? `${activity.location.latitude}, ${activity.location.longitude}`
                : 'Location not available'),
          date: day.date || bookingData.check_in_date,
          time: activity.time || 'Time not specified',
          duration: activity.duration ? `${activity.duration} hours` : 'Duration varies',
          status: 'confirmed'
        }));
      });

      // Format accommodation data
      const formattedAccommodation = accommodation ? {
        name: accommodation.name,
        location: typeof accommodation.location === 'string' 
          ? accommodation.location 
          : `${accommodation.location?.latitude || ''}, ${accommodation.location?.longitude || ''}`,
        address: accommodation.location?.address || accommodation.location?.city || 
                (typeof accommodation.location === 'string' ? accommodation.location : 'Address not available'),
        rating: accommodation.rating || 0,
        costPerNight: accommodation.costPerNight || accommodation.cost || 0,
        totalNights: bookingData.check_in_date && bookingData.check_out_date
          ? Math.ceil((new Date(bookingData.check_out_date).getTime() - new Date(bookingData.check_in_date).getTime()) / (1000 * 60 * 60 * 24))
          : 1,
        roomType: accommodation.roomType || 'Standard Room',
        amenities: accommodation.amenities || []
      } : null;

      // Extract distance information from various possible locations
      let totalDistance = 'N/A';
      let fromCurrentLocation = 'N/A';
      
      // Check in itineraryDetails first (parsed itinerary_data JSON)
      if (itineraryDetails?.totalDistance) {
        totalDistance = itineraryDetails.totalDistance;
      }
      if (itineraryDetails?.fromCurrentLocation) {
        fromCurrentLocation = itineraryDetails.fromCurrentLocation;
      }
      
      // Check in itineraryData object (direct database fields)
      if (itineraryData?.total_distance) {
        totalDistance = itineraryData.total_distance;
      }
      if (itineraryData?.from_current_location) {
        fromCurrentLocation = itineraryData.from_current_location;
      }
      
      // Also check if distance is stored at the root level of itineraryDetails
      // (new format: distance is added to the itinerary object before saving)
      if (typeof itineraryDetails === 'object' && itineraryDetails !== null) {
        if (('totalDistance' in itineraryDetails) && (totalDistance === 'N/A' || !totalDistance)) {
          totalDistance = (itineraryDetails as any).totalDistance || totalDistance;
        }
        if (('fromCurrentLocation' in itineraryDetails) && (fromCurrentLocation === 'N/A' || !fromCurrentLocation)) {
          fromCurrentLocation = (itineraryDetails as any).fromCurrentLocation || fromCurrentLocation;
        }
      }

      console.log('Distance data:', { totalDistance, fromCurrentLocation, itineraryDetails, itineraryData });

      // Transform the data for the UI
      const transformedBooking = {
        id: bookingData.id,
        bookingReference: bookingData.booking_reference,
        status: bookingData.status,
        paymentStatus: bookingData.payment_status,
        bookingDate: bookingData.booking_date,
        destination: itineraryData?.destination || 'Unknown',
        totalAmount: bookingData.total_amount,
        participants: bookingData.quantity || 1,
        travelDates: {
          checkIn: bookingData.check_in_date,
          checkOut: bookingData.check_out_date,
          duration: bookingData.check_in_date && bookingData.check_out_date
            ? Math.ceil((new Date(bookingData.check_out_date).getTime() - new Date(bookingData.check_in_date).getTime()) / (1000 * 60 * 60 * 24))
            : 0
        },
        accommodation: formattedAccommodation,
        activities: activities,
        distance: {
          totalDistance,
          fromCurrentLocation
        },
        specialRequests: bookingData.special_requests || null,
        cancellationPolicy: bookingData.cancellation_policy || 'Standard cancellation policy applies'
      };

      setBooking(transformedBooking);

      // Prepare itinerary structure for monitoring services
      const monitoringItinerary = {
        itinerary: itineraryArray.map((day: any, index: number) => ({
          ...day,
          day: index + 1
        })),
        totalCost: bookingData.total_amount,
        destination: itineraryData?.destination || 'Unknown'
      };
      setItineraryForMonitoring(monitoringItinerary);

    } catch (error) {
      console.error('Error fetching booking details:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load booking details'
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleWeatherMonitoring = () => {
    setShowWeatherMonitoring(!showWeatherMonitoring);
    if (!showWeatherMonitoring) {
      toast({
        title: 'Weather Monitoring Activated',
        description: 'Real-time weather and traffic monitoring is now active for your booking.'
      });
    }
  };

  const handleAdjustmentAccepted = (adjustment: any, updatedItinerary?: any) => {
    toast({
      title: 'Adjustment Applied',
      description: 'Your booking has been updated based on current conditions.',
      variant: 'default'
    });
    // In a real app, you would update the booking in the database here
  };

  const handleAdjustmentRejected = (adjustment: any) => {
    toast({
      title: 'Adjustment Dismissed',
      description: 'The suggested adjustment has been dismissed.'
    });
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="w-full h-full flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Booking Not Found</h3>
              <p className="text-gray-600 mb-4">We couldn't find the booking you're looking for.</p>
              {onBack && (
                <Button onClick={onBack}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Bookings
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
        {onBack && (
          <Button variant="ghost" onClick={onBack} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Bookings
          </Button>
        )}
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Booking Details
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Reference: {booking.bookingReference}
            </p>
          </div>
          
          <div className="flex gap-3">
            <ItineraryShareExport
              itineraryData={{
                destination: booking.destination,
                totalDays: booking.travelDates.duration,
                totalCost: booking.totalAmount,
                itinerary: [{
                  day: 1,
                  accommodation: booking.accommodation,
                  activities: booking.activities
                }] as any,
                travelDates: {
                  startDate: booking.travelDates.checkIn,
                  endDate: booking.travelDates.checkOut
                }
              }}
              variant="outline"
              size="default"
            />
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Booking Status</p>
                <p className="text-lg font-semibold capitalize">{booking.status}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Payment Status</p>
                <p className="text-lg font-semibold capitalize">{booking.paymentStatus}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-full">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-lg font-semibold">₹{booking.totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-Time Weather & Traffic Monitoring */}
      {showWeatherMonitoring && itineraryForMonitoring && (
        <div className="mb-6 grid grid-cols-1 gap-4">
          <TrafficMonitoring
            itinerary={itineraryForMonitoring}
            travelDates={{
              startDate: booking.travelDates.checkIn,
              endDate: booking.travelDates.checkOut
            }}
          />
          <SmartAdjustmentNotifications
            itinerary={itineraryForMonitoring}
            onAdjustmentAccepted={handleAdjustmentAccepted}
            onAdjustmentRejected={handleAdjustmentRejected}
            userPreferences={{
              budget: booking.totalAmount,
              destination: booking.destination,
              participants: booking.participants
            }}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Travel Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Travel Dates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Check-in</p>
                  <p className="text-lg font-semibold">
                    {new Date(booking.travelDates.checkIn).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Check-out</p>
                  <p className="text-lg font-semibold">
                    {new Date(booking.travelDates.checkOut).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Duration</span>
                <span className="font-semibold">{booking.travelDates.duration} nights</span>
              </div>
            </CardContent>
          </Card>

          {/* Accommodation Details */}
          {booking.accommodation && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hotel className="h-5 w-5" />
                  Accommodation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2 wrap-break-word">{booking.accommodation.name}</h3>
                  <div className="flex items-start gap-2 text-gray-600 mb-2">
                    <MapPin className="h-4 w-4 mt-1 shrink-0" />
                    <span className="text-sm wrap-break-word">{booking.accommodation.address}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      ★ {booking.accommodation.rating}/5
                    </Badge>
                    <Badge variant="outline">{booking.accommodation.roomType}</Badge>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Cost per night</p>
                    <p className="text-lg font-semibold">₹{booking.accommodation.costPerNight.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total nights</p>
                    <p className="text-lg font-semibold">{booking.accommodation.totalNights}</p>
                  </div>
                </div>

                {booking.accommodation.amenities.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Amenities</p>
                    <div className="flex flex-wrap gap-2">
                      {booking.accommodation.amenities.map((amenity: string, index: number) => (
                        <Badge key={index} variant="secondary" className="wrap-break-word">
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mountain className="h-5 w-5" />
                Activities ({booking.activities.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {booking.activities.map((activity: any, index: number) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-lg mb-1 wrap-break-word">{activity.name}</h4>
                      <p className="text-sm text-gray-600 mb-2 wrap-break-word">{activity.description}</p>
                    </div>
                    <Badge variant={activity.status === 'confirmed' ? 'default' : 'secondary'} className="shrink-0">
                      {activity.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="h-4 w-4 shrink-0" />
                      <span>{new Date(activity.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="h-4 w-4 shrink-0" />
                      <span className="wrap-break-word">{activity.time} ({activity.duration})</span>
                    </div>
                    <div className="flex items-start gap-2 text-gray-600 sm:col-span-2">
                      <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                      <span className="wrap-break-word">{activity.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <DollarSign className="h-4 w-4 shrink-0" />
                      <span className="font-semibold">₹{activity.cost}</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Distance Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="h-5 w-5" />
                Distance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Total Travel Distance</p>
                <p className="text-lg font-semibold">{booking.distance.totalDistance}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-gray-600">From Your Location</p>
                <p className="text-lg font-semibold">{booking.distance.fromCurrentLocation}</p>
              </div>
            </CardContent>
          </Card>

          {/* Participants */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Participants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-center">{booking.participants}</p>
              <p className="text-sm text-gray-600 text-center mt-1">
                {booking.participants === 1 ? 'person' : 'people'}
              </p>
            </CardContent>
          </Card>

          {/* Cost Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Cost Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Accommodation</span>
                <span className="font-semibold">
                  ₹{(booking.accommodation.costPerNight * booking.accommodation.totalNights).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Activities</span>
                <span className="font-semibold">
                  ₹{booking.activities.reduce((sum: number, act: any) => sum + act.cost, 0).toLocaleString()}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-blue-600">₹{booking.totalAmount.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Additional Info */}
          {booking.specialRequests && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Special Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{booking.specialRequests}</p>
              </CardContent>
            </Card>
          )}

          {/* Cancellation Policy */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cancellation Policy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">{booking.cancellationPolicy}</p>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              className="w-full" 
              variant={showWeatherMonitoring ? "default" : "outline"}
              onClick={toggleWeatherMonitoring}
            >
              <Cloud className="mr-2 h-4 w-4" />
              {showWeatherMonitoring ? 'Hide Weather Monitoring' : 'Check Weather Conditions'}
            </Button>
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => {
                const destination = `${booking.accommodation?.address || booking.destination}`;
                const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
                window.open(mapsUrl, '_blank');
              }}
            >
              <Car className="mr-2 h-4 w-4" />
              Get Directions
            </Button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

