📌 Features & Deliverables
✅ Phase 1: Core Setup

 Firebase project created & configured

 Next.js frontend deployed with Firebase Hosting + CI/CD

 Firestore rules & structure set up

✅ Phase 2: User Flow

Authentication (Google Sign-In, Email/Password)

Store profiles, preferred languages, budgets.

Input Preferences Form

Trip duration, budget, themes (heritage, nightlife, adventure).

Destination location(s).

AI Itinerary Generator (Gemini / Vertex AI)

Generate a day-by-day itinerary with places, food, activities.

Include cost breakdown (estimates).

Maps Integration

Display places and routes with Google Maps API.

Dynamic Adjustments

If budget exceeded → suggest cheaper alternatives.

If bad weather → suggest indoor alternatives.

✅ Phase 3: Booking & Payments

Integrate Razorpay for one-click payment.

Call EMT Inventory API for booking accommodation/transport/events.

Generate final PDF itinerary + booking confirmations.

✅ Phase 4: Multilingual Support

Use Google Translate API / Gemini multilingual capabilities.

Provide interface in Hindi, Bengali, English.

✅ Phase 5: Demo Polish

Interactive UI → “Generate My Trip” button.

Shareable itinerary (link / QR code).

Smooth loading animations & skeleton screens.

Admin dashboard (optional) to view bookings.

⚡ Challenges You Faced & Resolutions

Firebase Functions not appearing in console

Resolved by ensuring gcloud project was correctly set with projectId.

Forbidden (Unauthenticated) errors in Cloud Run

Fixed by allowing unauthenticated access or attaching Firebase Hosting rewrites.

CI/CD failing with "Unable to detect web framework"

Solved by copying .next, package.json, and config files into firebase-backend.

Added FIREBASE_CLI_EXPERIMENTS=webframeworks in GitHub Actions.

Large build size

Optimized by only copying required Next.js artifacts (.next/standalone, .next/static).

🎤 Hackathon Demo Plan

Step 1: User logs in & enters preferences (budget, duration, themes).

Step 2: AI generates itinerary in real time (with cost estimates).

Step 3: User views interactive map of trip.

Step 4: User books & pays (Razorpay + EMT API).

Step 5: Final itinerary (PDF + shareable link) is generated.

🌟 Future Enhancements

Live weather API integration.

Group travel planning (multiple users in same trip).

Smart reminders & push notifications.

Integration with WhatsApp for trip updates.