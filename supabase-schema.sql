-- First, drop existing tables if they exist (to start fresh)
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
  ('shopping', 'Shopping');

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
    '["https://images.unsplash.com/photo-1557862921-37829c7c0956"]'
  );
