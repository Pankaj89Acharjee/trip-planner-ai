'use client';

import { useParams, useRouter } from 'next/navigation';
import { BookingDetails } from '@/components/booking-details';

export default function BookingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  const handleBack = () => {
    router.push('/my-itineraries');
  };

  return (
    <BookingDetails 
      bookingId={bookingId} 
      onBack={handleBack}
    />
  );
}

