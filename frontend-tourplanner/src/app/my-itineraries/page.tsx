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
import { Calendar, MapPin, Users, DollarSign, BookOpen, Trash2, Star } from 'lucide-react';

export default function MyItinerariesPage() {
  const [itineraries, setItineraries] = useState<SavedItinerary[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState<number | null>(null);
  
  const { userData } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadItineraries();
  }, []);

  const loadItineraries = async () => {
    try {
      setLoading(true);
      // Use Firebase UID directly - no mapping needed!
      if (!userData?.uid) {
        throw new Error('User not authenticated');
      }
      
      const result = await itinerarySyncService.getUserItineraries(userData.uid);
      
      if (result.success && result.data) {
        setItineraries(result.data);
      } else {
        console.error('Failed to load itineraries:', result.error);
        toast({
          variant: "destructive",
          title: "Failed to Load Itineraries",
          description: result.error || "Could not load your itineraries.",
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
      
      if (updateResult.success) {
        // Create a booking record for the entire itinerary
        const bookingData = createBookingData(
          userData?.uid || '', // Use Firebase UID directly
          itinerary.id,
          'package',
          1, // Placeholder item ID for package booking
          itinerary.itinerary.totalCost,
          itinerary.itinerary.totalCost,
          {
            checkInDate: itinerary.travelDates?.startDate,
            checkOutDate: itinerary.travelDates?.endDate,
            quantity: itinerary.participants,
            currency: 'USD',
            specialRequests: `Complete itinerary booking for ${itinerary.destination}`,
            cancellationPolicy: 'Standard cancellation policy applies'
          }
        );

        const bookingResult = await itinerarySyncService.createBooking(bookingData);
        
        if (bookingResult.success) {
          toast({
            title: "Trip Booked!",
            description: `Your ${itinerary.destination} trip has been booked successfully.`,
          });
          loadItineraries(); // Refresh the list
        } else {
          throw new Error(bookingResult.error || "Failed to create booking");
        }
      } else {
        throw new Error(updateResult.error || "Failed to update itinerary status");
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
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'saved': return 'bg-blue-100 text-blue-800';
      case 'booked': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-purple-100 text-purple-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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
            <div className="text-center py-12">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No itineraries yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Create your first itinerary to get started with your travel planning.
              </p>
              <Button asChild>
                <a href="/">Create Itinerary</a>
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
                        <DollarSign className="h-4 w-4" />
                        <span className="font-medium">${itinerary.itinerary.totalCost.toLocaleString()}</span>
                      </div>
                      
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <span>{itinerary.itinerary.itinerary.length} day{itinerary.itinerary.itinerary.length > 1 ? 's' : ''} itinerary</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-6">
                      {itinerary.status === 'saved' && (
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
