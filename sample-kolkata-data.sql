-- Sample data for Kolkata to test the itinerary generation
-- Insert into locations table
INSERT INTO hachathonschema.locations (name, country, currency) 
VALUES ('Kolkata', 'India', 'INR') 
ON CONFLICT (name) DO NOTHING;

-- Get the location ID for Kolkata
-- Insert sample hotels for Kolkata
INSERT INTO hachathonschema.hotels (
    name, location, cost_per_night, rating, latitude, longitude, 
    description, amenities, room_type, max_occupancy, image_url, 
    price_tier, is_active, location_id
) VALUES 
(
    'The Oberoi Grand Kolkata', 
    'Kolkata', 
    4500, 
    4.5, 
    22.5726, 
    88.3639, 
    'Luxury heritage hotel in the heart of Kolkata', 
    'WiFi, Pool, Spa, Restaurant', 
    'Deluxe', 
    2, 
    'https://example.com/oberoi.jpg', 
    'luxury', 
    true,
    (SELECT id FROM hachathonschema.locations WHERE name = 'Kolkata')
),
(
    'Hotel Hindusthan International', 
    'Kolkata', 
    2500, 
    4.0, 
    22.5726, 
    88.3639, 
    'Comfortable business hotel in Kolkata', 
    'WiFi, Restaurant, Gym', 
    'Standard', 
    2, 
    'https://example.com/hindusthan.jpg', 
    'mid-range', 
    true,
    (SELECT id FROM hachathonschema.locations WHERE name = 'Kolkata')
),
(
    'Budget Inn Kolkata', 
    'Kolkata', 
    1200, 
    3.5, 
    22.5726, 
    88.3639, 
    'Affordable accommodation in Kolkata', 
    'WiFi, Basic amenities', 
    'Economy', 
    2, 
    'https://example.com/budget.jpg', 
    'budget', 
    true,
    (SELECT id FROM hachathonschema.locations WHERE name = 'Kolkata')
);

-- Insert sample activities for Kolkata
INSERT INTO hachathonschema.activities (
    name, city, cost, rating, latitude, longitude, 
    description, category, duration_hours, is_active, location_id
) VALUES 
(
    'Victoria Memorial', 
    'Kolkata', 
    200, 
    4.5, 
    22.5448, 
    88.3426, 
    'Historic monument and museum', 
    'heritage', 
    3, 
    true,
    (SELECT id FROM hachathonschema.locations WHERE name = 'Kolkata')
),
(
    'Howrah Bridge', 
    'Kolkata', 
    0, 
    4.7, 
    22.5851, 
    88.3468, 
    'Iconic cantilever bridge over Hooghly River', 
    'heritage', 
    1, 
    true,
    (SELECT id FROM hachathonschema.locations WHERE name = 'Kolkata')
),
(
    'Indian Museum', 
    'Kolkata', 
    150, 
    4.2, 
    22.5586, 
    88.3509, 
    'Largest and oldest museum in India', 
    'culture', 
    4, 
    true,
    (SELECT id FROM hachathonschema.locations WHERE name = 'Kolkata')
),
(
    'Kolkata Street Food Tour', 
    'Kolkata', 
    800, 
    4.6, 
    22.5726, 
    88.3639, 
    'Guided tour of famous street food locations', 
    'food', 
    3, 
    true,
    (SELECT id FROM hachathonschema.locations WHERE name = 'Kolkata')
),
(
    'Dakshineswar Kali Temple', 
    'Kolkata', 
    50, 
    4.4, 
    22.6558, 
    88.3575, 
    'Famous Hindu temple dedicated to Goddess Kali', 
    'heritage', 
    2, 
    true,
    (SELECT id FROM hachathonschema.locations WHERE name = 'Kolkata')
);

