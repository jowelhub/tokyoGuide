-- Drop existing tables if they exist (to start fresh)
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
    '["https://images.unsplash.com/photo-1542931287-023b922fa89b"]'
  ),
  (
    'ueno-park',
    'Ueno Park',
    'A spacious public park known for its museums, temples, and seasonal cherry blossoms.',
    'nature',
    35.7155,
    139.7737,
    '["https://images.unsplash.com/photo-1542931287-023b922fa89b"]'
  ),
  (
    'senso-ji',
    'Senso-ji Temple',
    'Tokyo''s oldest temple, a vibrant Buddhist temple in Asakusa with a large lantern and Nakamise-dori market.',
    'shrine',
    35.7148,
    139.7967,
    '["https://images.unsplash.com/photo-1591298718759-0e2325778551"]'
  ),
  (
    'tokyo-skytree',
    'Tokyo Skytree',
    'The tallest structure in Japan, offering panoramic views of Tokyo from its observation decks.',
    'activity',
    35.7101,
    139.8107,
    '["https://images.unsplash.com/photo-1529138175548-9d6a28535548"]'
  ),
  (
    'ginza',
    'Ginza',
    'Upscale shopping district known for its department stores, boutiques, and elegant restaurants.',
    'shopping',
    35.6714,
    139.7671,
    '["https://images.unsplash.com/photo-1590874103328-eac38a683ce7"]'
  ),
  (
    'shinjuku-gyoen',
    'Shinjuku Gyoen National Garden',
    'A large park blending Japanese, English, and French garden styles, offering a tranquil escape in bustling Shinjuku.',
    'nature',
    35.6852,
    139.7101,
    '["https://images.unsplash.com/photo-1547185774-88ff7d51c54c"]'
  ),
  (
    'akihabara',
    'Akihabara',
    'Electric Town, famous for its electronics shops, anime and manga stores, and gaming culture.',
    'activity',
    35.7023,
    139.7745,
    '["https://images.unsplash.com/photo-1527864550417-7fd91fc51a46"]'
  ),
  (
    'harajuku',
    'Harajuku',
    'Known for its unique street style, colorful shops, and trendy cafes, especially along Takeshita Street.',
    'shopping',
    35.6702,
    139.7027,
    '["https://images.unsplash.com/photo-1518675691542-30559677e55f"]'
  ),
  (
    'tsukiji-outer-market',
    'Tsukiji Outer Market',
    'A lively market with numerous restaurants and shops selling fresh seafood, produce, and kitchenware.',
    'food',
    35.6661,
    139.7706,
    '["https://images.unsplash.com/photo-1594278444927-8959b9815f2b"]'
  ),
  (
    'tokyo-national-museum',
    'Tokyo National Museum',
    'One of Japan s oldest and largest museums, showcasing a vast collection of Japanese art and artifacts.',
    'activity',
    35.7187,
    139.7764,
    '["https://images.unsplash.com/photo-1615896997567-897555895857"]'
  ),
  (
    'yoyogi-park',
    'Yoyogi Park',
    'Large park next to Harajuku Station and Meiji Jingu, popular for events, picnics, and outdoor activities.',
    'nature',
    35.6724,
    139.6944,
    '["https://images.unsplash.com/photo-1574151265552-598e797b4019"]'
  ),
  (
    'teamlab-planets',
    'teamLab Planets TOKYO',
    'Immersive digital art museum where visitors walk through interactive installations.',
    'activity',
    35.6486,
    139.7839,
    '["https://images.unsplash.com/photo-1621618725598-b29b95b4f557"]'
  ),
  (
    'ghibli-museum',
    'Ghibli Museum',
    'Animation and art museum showcasing the works of Studio Ghibli, known for films like ''Spirited Away''.',
    'museum',
    35.6962,
    139.5703,
    '["https://example.com/ghibli-museum.jpg"]'
  ),
  (
    'national-museum-nature-science',
    'National Museum of Nature and Science',
    'Comprehensive museum exhibiting a wide range of specimens related to natural history and science and technology.',
    'museum',
    35.7175,
    139.7753,
    '["https://example.com/nature-science-museum.jpg"]'
  ),
  (
    'koishikawa-korakuen-garden',
    'Koishikawa Korakuen Garden',
    'One of Tokyo''s oldest and best Japanese gardens, featuring ponds, stones, and paths that recreate famous landscapes.',
    'garden',
    35.7052,
    139.7504,
    '["https://example.com/koishikawa-garden.jpg"]'
  ),
  (
    'hamarikyu-gardens',
    'Hamarikyu Gardens',
    'Beautiful landscape garden by Tokyo Bay, featuring a seawater pond that changes with the tides.',
    'garden',
    35.6605,
    139.7626,
    '["https://example.com/hamarikyu-garden.jpg"]'
  ),
  (
    'kabuki-za-theatre',
    'Kabuki-za Theatre',
    'Main theater for Kabuki performances in Tokyo, showcasing traditional Japanese dance and drama.',
    'theater',
    35.6702,
    139.7640,
    '["https://example.com/kabuki-za.jpg"]'
  ),
  (
    'national-theatre',
    'National Theatre',
    'Venue for performances of traditional Japanese performing arts, including Noh, Kabuki, and Bunraku.',
    'theater',
    35.6912,
    139.7448,
    '["https://example.com/national-theater.jpg"]'
  ),
  (
    'roppongi',
    'Roppongi',
    'District known for its vibrant nightlife, with numerous bars, clubs, and restaurants that stay open late.',
    'nightlife',
    35.6627,
    139.7304,
    '["https://example.com/roppongi-nightlife.jpg"]'
  ),
  (
    'golden-gai',
    'Golden Gai',
    'Network of narrow alleys with tiny bars, each with its own unique atmosphere and regular clientele.',
    'nightlife',
    35.6935,
    139.7197,
    '["https://example.com/golden-gai.jpg"]'
  ),
  (
    'inokashira-park',
    'Inokashira Park',
    'Large park with a pond, walking paths, a zoo, and the Ghibli Museum located within its grounds.',
    'park',
    35.7019,
    139.5669,
    '["https://example.com/inokashira-park.jpg"]'
  ),
  (
    'showa-memorial-park',
    'Showa Memorial Park',
    'Vast park with seasonal flowers, gardens, cycling paths, and open spaces for recreation.',
    'park',
    35.7004,
    139.4172,
    '["https://example.com/showa-memorial-park.jpg"]'
  );