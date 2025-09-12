-- =====================================================
-- COMPLETE DATABASE SCHEMA FOR TOUR PLANNER APPLICATION
-- =====================================================

-- 1. LOCATIONS TABLE (Reference table for all locations)
CREATE TABLE IF NOT EXISTS hachathonschema.locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    country VARCHAR(100) NOT NULL,
    state_province VARCHAR(100),
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    timezone VARCHAR(50),
    currency VARCHAR(3) DEFAULT 'USD',
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. ENHANCED USERS TABLE (Your existing table - adding missing fields)
ALTER TABLE hachathonschema.users ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES hachathonschema.locations(id);


-- 3. ENHANCED ACTIVITIES TABLE (Your existing table - adding location relationship)
ALTER TABLE hachathonschema.activities ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES hachathonschema.locations(id);
ALTER TABLE hachathonschema.activities ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE hachathonschema.activities ADD COLUMN IF NOT EXISTS max_participants INTEGER DEFAULT 10;


-- 4. ENHANCED HOTELS TABLE (Your existing table - adding location relationship)
ALTER TABLE hachathonschema.hotels ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES hachathonschema.locations(id);


-- 5. ENHANCED USER_ITINERARIES TABLE (Your existing table - adding missing fields)
ALTER TABLE hachathonschema.user_itineraries ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE hachathonschema.user_itineraries ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'saved', 'booked', 'completed', 'cancelled'));
ALTER TABLE hachathonschema.user_itineraries ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;
ALTER TABLE hachathonschema.user_itineraries ADD COLUMN IF NOT EXISTS travel_dates JSON; -- {"start_date": "2024-01-01", "end_date": "2024-01-05"}
ALTER TABLE hachathonschema.user_itineraries ADD COLUMN IF NOT EXISTS participants INTEGER DEFAULT 1;
ALTER TABLE hachathonschema.user_itineraries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 6. BOOKINGS TABLE (New table for actual bookings)
CREATE TABLE IF NOT EXISTS hachathonschema.bookings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES hachathonschema.users(id) ON DELETE CASCADE,
    itinerary_id INTEGER REFERENCES hachathonschema.user_itineraries(id) ON DELETE SET NULL,
    booking_type VARCHAR(20) NOT NULL CHECK (booking_type IN ('hotel', 'activity', 'package')),
    item_id INTEGER NOT NULL, -- References hotels.id or activities.id
    booking_reference VARCHAR(100) UNIQUE NOT NULL,
    booking_date DATE NOT NULL,
    check_in_date DATE,
    check_out_date DATE,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
    special_requests TEXT,
    cancellation_policy TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. BOOKING_PAYMENTS TABLE (Payment tracking)
CREATE TABLE IF NOT EXISTS hachathonschema.booking_payments (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER NOT NULL REFERENCES hachathonschema.bookings(id) ON DELETE CASCADE,
    payment_method VARCHAR(50) NOT NULL,
    payment_reference VARCHAR(100) UNIQUE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_status VARCHAR(20) DEFAULT 'pending',
    transaction_id VARCHAR(255),
    payment_date TIMESTAMP,
    refund_amount DECIMAL(10,2) DEFAULT 0,
    refund_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. USER_REVIEWS TABLE (Reviews for hotels and activities)
CREATE TABLE IF NOT EXISTS hachathonschema.user_reviews (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES hachathonschema.users(id) ON DELETE CASCADE,
    booking_id INTEGER REFERENCES hachathonschema.bookings(id) ON DELETE SET NULL,
    review_type VARCHAR(20) NOT NULL CHECK (review_type IN ('hotel', 'activity')),
    item_id INTEGER NOT NULL, -- References hotels.id or activities.id
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    comment TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    helpful_votes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. USER_FAVORITES TABLE (User's favorite items)
CREATE TABLE IF NOT EXISTS hachathonschema.user_favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES hachathonschema.users(id) ON DELETE CASCADE,
    favorite_type VARCHAR(20) NOT NULL CHECK (favorite_type IN ('hotel', 'activity', 'location', 'itinerary')),
    item_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, favorite_type, item_id)
);

-- 10. NOTIFICATIONS TABLE (User notifications)
CREATE TABLE IF NOT EXISTS hachathonschema.notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES hachathonschema.users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    action_url VARCHAR(500),
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Locations indexes
CREATE INDEX IF NOT EXISTS idx_locations_name ON hachathonschema.locations(name);
CREATE INDEX IF NOT EXISTS idx_locations_country ON hachathonschema.locations(country);

-- Activities indexes
CREATE INDEX IF NOT EXISTS idx_activities_location_id ON hachathonschema.activities(location_id);
CREATE INDEX IF NOT EXISTS idx_activities_category ON hachathonschema.activities(category);
CREATE INDEX IF NOT EXISTS idx_activities_city ON hachathonschema.activities(city);
CREATE INDEX IF NOT EXISTS idx_activities_cost ON hachathonschema.activities(cost);
CREATE INDEX IF NOT EXISTS idx_activities_rating ON hachathonschema.activities(rating DESC);

-- Hotels indexes
CREATE INDEX IF NOT EXISTS idx_hotels_location_id ON hachathonschema.hotels(location_id);
CREATE INDEX IF NOT EXISTS idx_hotels_location ON hachathonschema.hotels(location);
CREATE INDEX IF NOT EXISTS idx_hotels_price_tier ON hachathonschema.hotels(price_tier);
CREATE INDEX IF NOT EXISTS idx_hotels_cost_per_night ON hachathonschema.hotels(cost_per_night);

-- User itineraries indexes
CREATE INDEX IF NOT EXISTS idx_user_itineraries_user_id ON hachathonschema.user_itineraries(user_id);
CREATE INDEX IF NOT EXISTS idx_user_itineraries_destination ON hachathonschema.user_itineraries(destination);
CREATE INDEX IF NOT EXISTS idx_user_itineraries_status ON hachathonschema.user_itineraries(status);
CREATE INDEX IF NOT EXISTS idx_user_itineraries_created_at ON hachathonschema.user_itineraries(created_at DESC);

-- Bookings indexes
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON hachathonschema.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_itinerary_id ON hachathonschema.bookings(itinerary_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_reference ON hachathonschema.bookings(booking_reference);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON hachathonschema.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON hachathonschema.bookings(booking_date);

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_user_reviews_user_id ON hachathonschema.user_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_user_reviews_item_id ON hachathonschema.user_reviews(item_id);
CREATE INDEX IF NOT EXISTS idx_user_reviews_review_type ON hachathonschema.user_reviews(review_type);

-- Favorites indexes
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON hachathonschema.user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_type_item ON hachathonschema.user_favorites(favorite_type, item_id);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON hachathonschema.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON hachathonschema.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON hachathonschema.notifications(created_at DESC);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON hachathonschema.locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON hachathonschema.activities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_hotels_updated_at BEFORE UPDATE ON hachathonschema.hotels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_itineraries_updated_at BEFORE UPDATE ON hachathonschema.user_itineraries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON hachathonschema.bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_reviews_updated_at BEFORE UPDATE ON hachathonschema.user_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SAMPLE DATA INSERTION (Optional)
-- =====================================================

-- Insert some sample locations
INSERT INTO hachathonschema.locations (name, country, latitude, longitude, currency) VALUES
('London', 'United Kingdom', 51.5074, -0.1278, 'GBP'),
('Paris', 'France', 48.8566, 2.3522, 'EUR'),
('Tokyo', 'Japan', 35.6762, 139.6503, 'JPY'),
('New York', 'United States', 40.7128, -74.0060, 'USD'),
('Sydney', 'Australia', -33.8688, 151.2093, 'AUD')
ON CONFLICT (name) DO NOTHING;
