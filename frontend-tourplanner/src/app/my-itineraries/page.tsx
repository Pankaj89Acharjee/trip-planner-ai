"use client";

import { useEffect, useState } from 'react';
import { itinerarySyncService, createBookingData } from '@/lib/itinerarySyncService';
import { SavedItinerary } from '@/lib/interfaces';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LayoutWrapper } from '@/components/layout-wrapper';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Calendar, MapPin, Users, BookOpen, Trash2, Star, IndianRupee } from 'lucide-react';

export default function MyItinerariesPage() {
  const [itineraries, setItineraries] = useState<SavedItinerary[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState<number | null>(null);

  const { userData } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadItineraries();
  }, []);

  // Transforming data for frontend display compatible
  const transformItineraryData = (dbData: any[]): SavedItinerary[] => {
    return dbData.map(item => ({
      id: item.id,
      userUid: item.user_uid,
      title: item.title,
      destination: item.destination,
      itinerary: item.itinerary_data || { itinerary: [], totalCost: 0, metadata: { searchResults: {}, recommendations: {} } },
      status: item.status,
      isFavorite: item.is_favorite,
      travelDates: item.travel_dates,
      participants: item.participants,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));
  };

  const loadItineraries = async () => {
    try {
      setLoading(true);
      if (!userData?.uid) {
        throw new Error('User not authenticated');
      }

      const result = await itinerarySyncService.getUserItineraries(userData.uid);

      // Parsinf the result if it's a string
      let parsedResult = result;
      if (typeof result === 'string') {
        try {
          parsedResult = JSON.parse(result);
        } catch (parseError) {
          console.error('Failed to parse result:', parseError);
          toast({
            variant: "destructive",
            title: "Failed to Load Itineraries",
            description: "Invalid JSON format received from server.",
          });
          return;
        }
      }

      if (parsedResult && Array.isArray(parsedResult)) {
        const transformedData = transformItineraryData(parsedResult);
        setItineraries(transformedData);
      } else {
        console.error('Failed to load itineraries - invalid data format:', parsedResult);
        toast({
          variant: "destructive",
          title: "Failed to Load Itineraries",
          description: "Invalid data format received from server.",
        });
      }
    } catch (error) {
      console.error('Failed to load itineraries:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load itineraries. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async (itinerary: SavedItinerary) => {
    if (!itinerary.id) return;

    setBookingLoading(itinerary.id);
    try {
      // First, update the itinerary status to 'booked'
      const updateResult = await itinerarySyncService.updateItineraryStatus(itinerary.id, 'booked');

      
      // Parsing the response if it's a string
      let parsedResult = updateResult;
      if (typeof updateResult === 'string') {
        try {
          parsedResult = JSON.parse(updateResult);
        } catch (error) {
          console.error('Failed to parse update result:', error);
          throw new Error("Invalid response format from server");
        }
      }
      
      // Handle both array response and object response
      const isUpdateSuccessful = Array.isArray(parsedResult) && parsedResult.length > 0 && parsedResult[0].status === 'booked';
            

      if (isUpdateSuccessful) {
        // Create a booking record for the entire itinerary
        const bookingData = createBookingData(
          userData?.uid || '', // Firebase UID
          itinerary.id,
          'package',
          1, // Placeholder item ID for package booking
          itinerary.itinerary.totalCost,
          itinerary.itinerary.totalCost,
          {
            checkInDate: itinerary.travelDates?.startDate,
            checkOutDate: itinerary.travelDates?.endDate,
            quantity: itinerary.participants,
            currency: 'INR',
            specialRequests: `Complete itinerary booking for ${itinerary.destination}`,
            cancellationPolicy: 'Standard cancellation policy applies',            
          }
        );

        const bookingResult = await itinerarySyncService.createBooking(bookingData);
                
        // Parse the booking response if it's a string
        let parsedBookingResult = bookingResult;
        if (typeof bookingResult === 'string') {
          try {
            parsedBookingResult = JSON.parse(bookingResult);
          } catch (error) {
            console.error('Failed to parse booking result:', error);
            throw new Error("Invalid booking response format from server");
          }
        }
                
        if (parsedBookingResult.success) {
          toast({
            title: "Trip Booked!",
            description: `Your ${itinerary.destination} trip has been booked successfully.`,
          });
          loadItineraries(); // Refresh the list
        } else {
          throw new Error(parsedBookingResult.error || "Failed to create booking");
        }
      } else {
        throw new Error("Failed to update itinerary status - invalid response format");
      }
    } catch (error) {
      console.error('Failed to book itinerary:', error);
      toast({
        variant: "destructive",
        title: "Booking Failed",
        description: error instanceof Error ? error.message : "Failed to book itinerary. Please try again.",
      });
    } finally {
      setBookingLoading(null);
    }
  };

  const handleDelete = async (itineraryId: number) => {
    try {
      const result = await itinerarySyncService.deleteItinerary(itineraryId);

      if (result.success) {
        toast({
          title: "Itinerary Deleted",
          description: "Your itinerary has been deleted successfully.",
        });
        loadItineraries(); // Refresh the list
      } else {
        throw new Error(result.error || "Failed to delete itinerary");
      }
    } catch (error) {
      console.error('Failed to delete itinerary:', error);
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete itinerary. Please try again.",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800 capitalize';
      case 'saved': return 'bg-blue-100 text-blue-800 capitalize';
      case 'booked': return 'bg-green-100 text-green-800 capitalize';
      case 'completed': return 'bg-purple-100 text-purple-800 capitalize';
      case 'cancelled': return 'bg-red-100 text-red-800 capitalize';
      default: return 'bg-gray-100 text-gray-800 capitalize';
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <LayoutWrapper>
          <div className="container mx-auto p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading your itineraries...</p>
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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Itineraries</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Manage and book your saved travel plans
              </p>
            </div>
          </div>

          {itineraries.length === 0 ? (
            <div className="text-center py-20">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full blur-3xl opacity-20 scale-150"></div>
                <div className="relative bg-white dark:bg-gray-800 rounded-full p-8 mx-auto w-32 h-32 flex items-center justify-center shadow-lg">
                  <BookOpen className="h-16 w-16 text-blue-500" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 mt-8">
                No itineraries yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto text-lg">
                Start your travel journey by creating your first personalized itinerary.
                Our AI will help you plan the perfect trip!
              </p>
              <Button asChild size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3">
                <a href="/">Create Your First Itinerary</a>
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {itineraries.map((itinerary) => (
                <Card key={itinerary.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{itinerary.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {itinerary.destination}
                          </span>
                        </div>
                      </div>
                      <Badge className={getStatusColor(itinerary.status)}>
                        {itinerary.status}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {itinerary.travelDates ?
                            `${new Date(itinerary.travelDates.startDate).toLocaleDateString()} - ${new Date(itinerary.travelDates.endDate).toLocaleDateString()}` :
                            'Dates not set'
                          }
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Users className="h-4 w-4" />
                        <span>{itinerary.participants} participant{itinerary.participants > 1 ? 's' : ''}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <IndianRupee className="h-4 w-4" />
                        <span className="font-medium">{itinerary.itinerary.totalCost.toLocaleString()} /-</span>
                      </div>

                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <span>{itinerary.itinerary.itinerary.length} day{itinerary.itinerary.itinerary.length > 1 ? 's' : ''} itinerary</span>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-6">
                      {(itinerary.status === 'saved' || itinerary.status === 'draft') && (
                        <Button
                          onClick={() => handleBook(itinerary)}
                          disabled={bookingLoading === itinerary.id}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          {bookingLoading === itinerary.id ? "Booking..." : "Book Trip"}
                        </Button>
                      )}

                   
                      {itinerary.status === 'booked' && (
                        <div className="flex-1 p-2 bg-green-100 text-green-800 rounded text-center text-sm font-medium">
                          ✅ Booked
                        </div>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => itinerary.id && handleDelete(itinerary.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
