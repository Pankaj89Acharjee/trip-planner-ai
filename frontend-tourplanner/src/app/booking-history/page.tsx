"use client";

import { useEffect, useState } from 'react';
import { itinerarySyncService } from '@/lib/itinerarySyncService';
import { BookingData } from '@/lib/interfaces';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LayoutWrapper } from '@/components/layout-wrapper';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Calendar, MapPin, Users, DollarSign, CreditCard, Clock, CheckCircle2, XCircle, Receipt, Trash2, Eye } from 'lucide-react';

export default function BookingHistoryPage() {
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingBooking, setCancellingBooking] = useState<number | null>(null);
  const [payingBooking, setPayingBooking] = useState<number | null>(null);

  const { userData } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadBookings();
  }, []);

  // Transform database data to frontend interface
  const transformBookingData = (dbData: any[]): BookingData[] => {
    return dbData.map(item => ({
      id: item.id,
      userUid: item.user_uid,
      itineraryId: item.itinerary_id,
      bookingType: item.booking_type,
      itemId: item.item_id,
      bookingReference: item.booking_reference,
      bookingDate: item.booking_date,
      checkInDate: item.check_in_date,
      checkOutDate: item.check_out_date,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      totalAmount: item.total_amount,
      currency: item.currency,
      status: item.status,
      paymentStatus: item.payment_status,
      specialRequests: item.special_requests,
      cancellationPolicy: item.cancellation_policy,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));
  };

  const loadBookings = async () => {
    try {
      setLoading(true);
      if (!userData?.uid) {
        throw new Error('User not authenticated');
      }

      const result = await itinerarySyncService.getUserBookings(userData.uid);

      // Parse the result if it's a string
      let parsedResult = result;
      if (typeof result === 'string') {
        try {
          parsedResult = JSON.parse(result);
        } catch (parseError) {
          console.error('Failed to parse result:', parseError);
          toast({
            variant: "destructive",
            title: "Failed to Load Bookings",
            description: "Invalid JSON format received from server.",
          });
          return;
        }
      }

      if (parsedResult && Array.isArray(parsedResult)) {
        const transformedData = transformBookingData(parsedResult);
        setBookings(transformedData);
      } else {
        console.error('Failed to load bookings - invalid data format:', parsedResult);
        toast({
          variant: "destructive",
          title: "Failed to Load Bookings",
          description: "Invalid data format received from server.",
        });
      }
    } catch (error) {
      console.error('Failed to load bookings:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load bookings. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: number) => {
    setCancellingBooking(bookingId);
    try {
      // Update booking status to cancelled
      const result = await itinerarySyncService.updateBookingStatus(bookingId, 'cancelled');

      if (result.success) {
        toast({
          title: "Booking Cancelled",
          description: "Your booking has been cancelled successfully.",
        });
        loadBookings(); // Refresh the list
      } else {
        throw new Error(result.error || "Failed to cancel booking");
      }
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      toast({
        variant: "destructive",
        title: "Cancellation Failed",
        description: error instanceof Error ? error.message : "Failed to cancel booking. Please try again.",
      });
    } finally {
      setCancellingBooking(null);
    }
  };

  const handlePayNow = async (bookingId: number) => {
    setPayingBooking(bookingId);
    try {
      // Update booking status to confirmed and payment status to paid
      const result = await itinerarySyncService.updateBookingStatus(bookingId, 'confirmed', 'paid');

      if (result.success) {
        toast({
          title: "Payment Successful!",
          description: "Your booking has been confirmed and payment processed.",
        });
        loadBookings(); // Refresh the list
      } else {
        throw new Error(result.error || "Failed to process payment");
      }
    } catch (error) {
      console.error('Failed to process payment:', error);
      toast({
        variant: "destructive",
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Failed to process payment. Please try again.",
      });
    } finally {
      setPayingBooking(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'refunded': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getBookingTypeIcon = (type: string) => {
    switch (type) {
      case 'hotel': return <MapPin className="h-5 w-5" />;
      case 'activity': return <Eye className="h-5 w-5" />;
      case 'package': return <Receipt className="h-5 w-5" />;
      default: return <CreditCard className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <LayoutWrapper>
          <div className="container mx-auto p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading your bookings...</p>
            </div>
          </div>
        </LayoutWrapper>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <LayoutWrapper>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Booking History</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                View and manage your travel bookings
              </p>
            </div>
          </div>

          {bookings.length === 0 ? (
            <div className="text-center py-20">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full blur-3xl opacity-20 scale-150"></div>
                <div className="relative bg-white dark:bg-gray-800 rounded-full p-8 mx-auto w-32 h-32 flex items-center justify-center shadow-lg">
                  <Receipt className="h-16 w-16 text-blue-500" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 mt-8">
                No bookings yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto text-lg">
                Book your first itinerary to see your booking history here.
                Start planning your perfect trip!
              </p>
              <Button asChild size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3">
                <a href="/my-itineraries">View My Itineraries</a>
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {bookings.map((booking) => (
                <Card key={booking.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getBookingTypeIcon(booking.bookingType)}
                        <div>
                          <CardTitle className="text-lg capitalize">{booking.bookingType} Booking</CardTitle>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Ref No: {booking.bookingReference}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Badge className={`capitalize ${getStatusColor(booking.status)}`}>
                          Booking: {booking.status}
                        </Badge>
                        <Badge className={`capitalize ${getPaymentStatusColor(booking.paymentStatus)}`}>
                          Payment: {booking.paymentStatus}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Booked: {new Date(booking.bookingDate).toLocaleDateString()}
                        </span>
                      </div>

                      {booking.checkInDate && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Clock className="h-4 w-4" />
                          <span>
                            Check-in: {new Date(booking.checkInDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}

                      {booking.checkOutDate && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Clock className="h-4 w-4" />
                          <span>
                            Check-out: {new Date(booking.checkOutDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Users className="h-4 w-4" />
                        <span>Quantity: {booking.quantity}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-medium">
                          {booking.currency || 'INR'} {booking.totalAmount.toLocaleString()}
                        </span>
                      </div>

                      {booking.specialRequests && (
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Special Requests:</span>
                          <p className="mt-1">{booking.specialRequests}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 mt-6">
                      {booking.status === 'confirmed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => booking.id && handleCancelBooking(booking.id)}
                          disabled={cancellingBooking === booking.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {cancellingBooking === booking.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                              Cancelling...
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancel
                            </>
                          )}
                        </Button>
                      )}

                      {booking.status === 'cancelled' && (
                        <div className="flex-1 p-2 bg-red-100 text-red-800 rounded text-center text-sm font-medium">
                          <XCircle className="h-4 w-4 inline mr-1" />
                          Cancelled
                        </div>
                      )}

                      {booking.paymentStatus === 'paid' && (
                        <div className="flex-1 p-2 bg-green-100 text-green-800 rounded text-center text-sm font-medium">
                          <CheckCircle2 className="h-4 w-4 inline mr-1" />
                          Completed
                        </div>
                      )}

                      {booking.paymentStatus === 'pending' && (
                        <Button
                          variant="outline" size="sm"
                          onClick={() => booking.id && handlePayNow(booking.id)}
                          disabled={payingBooking === booking.id}
                          className="flex-1 p-2 dark:bg-purple-800/90 bg-purple-800/
                        90 dark:text-white-800 text-white rounded text-center text-sm 
                        font-medium"
                        >
                          {payingBooking === booking.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Processing...
                            </>
                          ) : (
                            <>
                              <CreditCard className="h-4 w-4 inline mr-1" />
                              Pay Now
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </LayoutWrapper>
    </ProtectedRoute>
  );
}

