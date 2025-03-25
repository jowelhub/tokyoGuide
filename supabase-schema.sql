-- Drop dependent tables first
DROP TABLE IF EXISTS itinerary_locations;
DROP TABLE IF EXISTS itinerary_days;
DROP TABLE IF EXISTS user_itineraries;
DROP TABLE IF EXISTS user_favorites;

-- Then drop the tables they depend on
DROP TABLE IF EXISTS locations;
DROP TABLE IF EXISTS categories;

-- Create categories table
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

-- Create locations table with foreign key to categories
CREATE TABLE locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(id),
  latitude FLOAT NOT NULL,
  longitude FLOAT NOT NULL,
  images JSONB NOT NULL
);

-- Create user favorites table to store user's favorite locations
CREATE TABLE user_favorites (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, location_id)
);

-- Create user itineraries table to store user's planned trips
CREATE TABLE user_itineraries (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create itinerary days table to store days within an itinerary
CREATE TABLE itinerary_days (
  id SERIAL PRIMARY KEY,
  itinerary_id INTEGER NOT NULL REFERENCES user_itineraries(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(itinerary_id, day_number)
);

-- Create itinerary locations table to store locations within a day
CREATE TABLE itinerary_locations (
  id SERIAL PRIMARY KEY,
  day_id INTEGER NOT NULL REFERENCES itinerary_days(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(day_id, location_id)
);

-- Insert predefined categories
INSERT INTO categories (id, name)
VALUES
  ('nature', 'Nature'),
  ('shrine', 'Shrine'),
  ('activity', 'Activity'),
  ('food', 'Food'),
  ('shopping', 'Shopping'),
  ('museum', 'Museum'),
  ('park', 'Park'),
  ('garden', 'Garden'),
  ('theater', 'Theater'),
  ('nightlife', 'Nightlife');

-- Insert locations with references to categories
INSERT INTO locations (id, name, description, category_id, latitude, longitude, images)
VALUES
  (
    'meiji-shrine',
    'Meiji Shrine',
    'A Shinto shrine dedicated to Emperor Meiji and Empress Shoken, set in a peaceful forest in the heart of Tokyo.',
    'shrine',
    35.6764,
    139.6993,
    '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'
  ),
  (
    'shibuya-crossing',
    'Shibuya Crossing',
    'The world''s busiest pedestrian crossing, surrounded by giant video screens and neon signs.',
    'activity',
    35.6595,
    139.7004,
    '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'
  ),
  (
    'ueno-park',
    'Ueno Park',
    'A spacious public park known for its museums, temples, and seasonal cherry blossoms.',
    'nature',
    35.7155,
    139.7737,
    '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'
  ),
  (
    'senso-ji',
    'Senso-ji Temple',
    'Tokyo''s oldest temple, a vibrant Buddhist temple in Asakusa with a large lantern and Nakamise-dori market.',
    'shrine',
    35.7148,
    139.7967,
    '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'
  ),
  (
    'tokyo-skytree',
    'Tokyo Skytree',
    'The tallest structure in Japan, offering panoramic views of Tokyo from its observation decks.',
    'activity',
    35.7101,
    139.8107,
    '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'
  ),
  (
    'ginza',
    'Ginza',
    'Upscale shopping district known for its department stores, boutiques, and elegant restaurants.',
    'shopping',
    35.6714,
    139.7671,
    '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'
  ),
  (
    'shinjuku-gyoen',
    'Shinjuku Gyoen National Garden',
    'A large park blending Japanese, English, and French garden styles, offering a tranquil escape in bustling Shinjuku.',
    'nature',
    35.6852,
    139.7101,
    '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'
  ),
  (
    'akihabara',
    'Akihabara',
    'Electric Town, famous for its electronics shops, anime and manga stores, and gaming culture.',
    'activity',
    35.7023,
    139.7745,
    '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'
  ),
  (
    'harajuku',
    'Harajuku',
    'Known for its unique street style, colorful shops, and trendy cafes, especially along Takeshita Street.',
    'shopping',
    35.6702,
    139.7027,
    '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'
  ),
  (
    'tsukiji-outer-market',
    'Tsukiji Outer Market',
    'A lively market with numerous restaurants and shops selling fresh seafood, produce, and kitchenware.',
    'food',
    35.6661,
    139.7706,
    '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'
  ),
  (
    'tokyo-national-museum',
    'Tokyo National Museum',
    'One of Japan s oldest and largest museums, showcasing a vast collection of Japanese art and artifacts.',
    'activity',
    35.7187,
    139.7764,
    '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'
  ),
  (
    'yoyogi-park',
    'Yoyogi Park',
    'Large park next to Harajuku Station and Meiji Jingu, popular for events, picnics, and outdoor activities.',
    'nature',
    35.6724,
    139.6944,
    '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'
  ),
  (
    'teamlab-planets',
    'teamLab Planets TOKYO',
    'Immersive digital art museum where visitors walk through interactive installations.',
    'activity',
    35.6486,
    139.7839,
    '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'
  ),
  (
    'ghibli-museum',
    'Ghibli Museum',
    'Animation and art museum showcasing the works of Studio Ghibli, known for films like ''Spirited Away''.',
    'museum',
    35.6962,
    139.5703,
    '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'
  ),
  (
    'national-museum-nature-science',
    'National Museum of Nature and Science',
    'Comprehensive museum exhibiting a wide range of specimens related to natural history and science and technology.',
    'museum',
    35.7175,
    139.7753,
    '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'
  ),
  (
    'koishikawa-korakuen-garden',
    'Koishikawa Korakuen Garden',
    'One of Tokyo''s oldest and best Japanese gardens, featuring ponds, stones, and paths that recreate famous landscapes.',
    'garden',
    35.7052,
    139.7504,
    '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'
  ),
  (
    'hamarikyu-gardens',
    'Hamarikyu Gardens',
    'Beautiful landscape garden by Tokyo Bay, featuring a seawater pond that changes with the tides.',
    'garden',
    35.6605,
    139.7626,
    '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'
  ),
  (
    'kabuki-za-theatre',
    'Kabuki-za Theatre',
    'Main theater for Kabuki performances in Tokyo, showcasing traditional Japanese dance and drama.',
    'theater',
    35.6702,
    139.7640,
    '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'
  ),
  (
    'national-theatre',
    'National Theatre',
    'Venue for performances of traditional Japanese performing arts, including Noh, Kabuki, and Bunraku.',
    'theater',
    35.6912,
    139.7448,
    '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'
  ),
  (
    'roppongi',
    'Roppongi',
    'District known for its vibrant nightlife, with numerous bars, clubs, and restaurants that stay open late.',
    'nightlife',
    35.6627,
    139.7304,
    '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'
  ),
  (
    'golden-gai',
    'Golden Gai',
    'Network of narrow alleys with tiny bars, each with its own unique atmosphere and regular clientele.',
    'nightlife',
    35.6935,
    139.7197,
    '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'
  ),
  (
    'inokashira-park',
    'Inokashira Park',
    'Large park with a pond, walking paths, a zoo, and the Ghibli Museum located within its grounds.',
    'park',
    35.7019,
    139.5669,
    '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'
  ),
  (
    'showa-memorial-park',
    'Showa Memorial Park',
    'Vast park with seasonal flowers, gardens, cycling paths, and open spaces for recreation.',
    'park',
    35.7004,
    139.4172,
    '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'
  );