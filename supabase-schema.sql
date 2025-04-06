-- Drop existing policies first if they exist (optional but good for clean reset)
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.locations;
DROP POLICY IF EXISTS "Prevent public modification" ON public.locations;
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.categories;
DROP POLICY IF EXISTS "Prevent public modification" ON public.categories;
DROP POLICY IF EXISTS "Allow individual user access" ON public.user_favorites;
DROP POLICY IF EXISTS "Allow individual user access" ON public.user_itineraries;
DROP POLICY IF EXISTS "Allow access for itinerary owner" ON public.itinerary_days;
DROP POLICY IF EXISTS "Allow access for itinerary owner" ON public.itinerary_locations;

-- Drop dependent tables first
DROP TABLE IF EXISTS public.itinerary_locations;
DROP TABLE IF EXISTS public.itinerary_days;
DROP TABLE IF EXISTS public.user_itineraries;
DROP TABLE IF EXISTS public.user_favorites;

-- Then drop the tables they depend on
DROP TABLE IF EXISTS public.locations;
DROP TABLE IF EXISTS public.categories;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS public.update_itinerary(integer, jsonb);

-- ==================================
--          TABLE CREATION
-- ==================================

-- Create categories table
CREATE TABLE public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);
COMMENT ON TABLE public.categories IS 'Stores location categories like Shrine, Park, etc.';

-- Create locations table with foreign key to categories
CREATE TABLE public.locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES public.categories(id), -- ON DELETE RESTRICT might be safer if categories are critical
  latitude FLOAT NOT NULL,
  longitude FLOAT NOT NULL,
  images JSONB NOT NULL DEFAULT '[]'::jsonb
);
COMMENT ON TABLE public.locations IS 'Stores details about visitable locations.';

-- Create user favorites table
CREATE TABLE public.user_favorites (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE, -- Cascade delete ok if location removal means favorite is irrelevant
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, location_id)
);
COMMENT ON TABLE public.user_favorites IS 'Stores user favorite locations.';

-- Create user itineraries table
CREATE TABLE public.user_itineraries (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id) -- Assuming one itinerary per user for now
);
COMMENT ON TABLE public.user_itineraries IS 'Stores user trip itineraries.';

-- Create itinerary days table
CREATE TABLE public.itinerary_days (
  id SERIAL PRIMARY KEY,
  itinerary_id INTEGER NOT NULL REFERENCES public.user_itineraries(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL CHECK (day_number > 0), -- Added CHECK constraint
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(itinerary_id, day_number)
);
COMMENT ON TABLE public.itinerary_days IS 'Stores individual days within an itinerary.';

-- Create itinerary locations table
CREATE TABLE public.itinerary_locations (
  id SERIAL PRIMARY KEY,
  day_id INTEGER NOT NULL REFERENCES public.itinerary_days(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE, -- Cascade delete ok if location removal means itinerary item is irrelevant
  position INTEGER NOT NULL CHECK (position >= 0), -- Added CHECK constraint
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(day_id, location_id),
  UNIQUE(day_id, position) -- Ensure position is unique within a day
);
COMMENT ON TABLE public.itinerary_locations IS 'Stores the sequence of locations within an itinerary day.';

-- ==================================
--          INITIAL DATA
-- ==================================

-- Insert predefined categories
INSERT INTO public.categories (id, name)
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

-- Insert locations (Ensure images are valid JSONB arrays)
INSERT INTO public.locations (id, name, description, category_id, latitude, longitude, images)
VALUES
  ('meiji-shrine', 'Meiji Shrine', 'A Shinto shrine dedicated to Emperor Meiji and Empress Shoken, set in a peaceful forest in the heart of Tokyo.', 'shrine', 35.6764, 139.6993, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'),
  ('shibuya-crossing', 'Shibuya Crossing', 'The world''s busiest pedestrian crossing, surrounded by giant video screens and neon signs.', 'activity', 35.6595, 139.7004, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'),
  ('ueno-park', 'Ueno Park', 'A spacious public park known for its museums, temples, and seasonal cherry blossoms.', 'park', 35.7155, 139.7737, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'),
  ('senso-ji', 'Senso-ji Temple', 'Tokyo''s oldest temple, a vibrant Buddhist temple in Asakusa with a large lantern and Nakamise-dori market.', 'shrine', 35.7148, 139.7967, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'),
  ('tokyo-skytree', 'Tokyo Skytree', 'The tallest structure in Japan, offering panoramic views of Tokyo from its observation decks.', 'activity', 35.7101, 139.8107, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'),
  ('ginza', 'Ginza', 'Upscale shopping district known for its department stores, boutiques, and elegant restaurants.', 'shopping', 35.6714, 139.7671, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'),
  ('shinjuku-gyoen', 'Shinjuku Gyoen National Garden', 'A large park blending Japanese, English, and French garden styles, offering a tranquil escape in bustling Shinjuku.', 'garden', 35.6852, 139.7101, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'),
  ('akihabara', 'Akihabara', 'Electric Town, famous for its electronics shops, anime and manga stores, and gaming culture.', 'activity', 35.7023, 139.7745, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'),
  ('harajuku', 'Harajuku', 'Known for its unique street style, colorful shops, and trendy cafes, especially along Takeshita Street.', 'shopping', 35.6702, 139.7027, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'),
  ('tsukiji-outer-market', 'Tsukiji Outer Market', 'A lively market with numerous restaurants and shops selling fresh seafood, produce, and kitchenware.', 'food', 35.6661, 139.7706, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'),
  ('tokyo-national-museum', 'Tokyo National Museum', 'One of Japan s oldest and largest museums, showcasing a vast collection of Japanese art and artifacts.', 'museum', 35.7187, 139.7764, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'),
  ('yoyogi-park', 'Yoyogi Park', 'Large park next to Harajuku Station and Meiji Jingu, popular for events, picnics, and outdoor activities.', 'park', 35.6724, 139.6944, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'),
  ('teamlab-planets', 'teamLab Planets TOKYO', 'Immersive digital art museum where visitors walk through interactive installations.', 'activity', 35.6486, 139.7839, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'),
  ('ghibli-museum', 'Ghibli Museum', 'Animation and art museum showcasing the works of Studio Ghibli, known for films like ''Spirited Away''.', 'museum', 35.6962, 139.5703, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'),
  ('national-museum-nature-science', 'National Museum of Nature and Science', 'Comprehensive museum exhibiting a wide range of specimens related to natural history and science and technology.', 'museum', 35.7175, 139.7753, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'),
  ('koishikawa-korakuen-garden', 'Koishikawa Korakuen Garden', 'One of Tokyo''s oldest and best Japanese gardens, featuring ponds, stones, and paths that recreate famous landscapes.', 'garden', 35.7052, 139.7504, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'),
  ('hamarikyu-gardens', 'Hamarikyu Gardens', 'Beautiful landscape garden by Tokyo Bay, featuring a seawater pond that changes with the tides.', 'garden', 35.6605, 139.7626, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'),
  ('kabuki-za-theatre', 'Kabuki-za Theatre', 'Main theater for Kabuki performances in Tokyo, showcasing traditional Japanese dance and drama.', 'theater', 35.6702, 139.7640, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'),
  ('national-theatre', 'National Theatre', 'Venue for performances of traditional Japanese performing arts, including Noh, Kabuki, and Bunraku.', 'theater', 35.6912, 139.7448, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'),
  ('roppongi', 'Roppongi', 'District known for its vibrant nightlife, with numerous bars, clubs, and restaurants that stay open late.', 'nightlife', 35.6627, 139.7304, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'),
  ('golden-gai', 'Golden Gai', 'Network of narrow alleys with tiny bars, each with its own unique atmosphere and regular clientele.', 'nightlife', 35.6935, 139.7197, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'),
  ('inokashira-park', 'Inokashira Park', 'Large park with a pond, walking paths, a zoo, and the Ghibli Museum located within its grounds.', 'park', 35.7019, 139.5669, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'),
  ('showa-memorial-park', 'Showa Memorial Park', 'Vast park with seasonal flowers, gardens, cycling paths, and open spaces for recreation.', 'park', 35.7004, 139.4172, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]');

-- ==================================
--          INDEXES
-- ==================================
-- Indexes on foreign keys and commonly queried columns improve performance

CREATE INDEX IF NOT EXISTS idx_locations_category_id ON public.locations(category_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_location_id ON public.user_favorites(location_id);
-- user_id is already indexed by UNIQUE constraint
CREATE INDEX IF NOT EXISTS idx_itinerary_days_itinerary_id ON public.itinerary_days(itinerary_id);
-- (itinerary_id, day_number) is already indexed by UNIQUE constraint
CREATE INDEX IF NOT EXISTS idx_itinerary_locations_day_id ON public.itinerary_locations(day_id);
-- (day_id, location_id) is already indexed by UNIQUE constraint
CREATE INDEX IF NOT EXISTS idx_itinerary_locations_location_id ON public.itinerary_locations(location_id);
-- (day_id, position) is already indexed by UNIQUE constraint

-- ==================================
--      ROW LEVEL SECURITY (RLS)
-- ==================================
-- IMPORTANT: Enable RLS for all tables containing user data or accessed by users

-- Public tables (read-only for authenticated users)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read access" ON public.categories
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Prevent public modification" ON public.categories
  FOR ALL USING (false); -- Effectively blocks INSERT, UPDATE, DELETE for non-admins

CREATE POLICY "Allow authenticated read access" ON public.locations
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Prevent public modification" ON public.locations
  FOR ALL USING (false); -- Effectively blocks INSERT, UPDATE, DELETE for non-admins

-- User specific tables
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_locations ENABLE ROW LEVEL SECURITY;

-- Policies for user_favorites (Only owner can manage their favorites)
CREATE POLICY "Allow individual user access" ON public.user_favorites
  FOR ALL -- Applies to SELECT, INSERT, UPDATE, DELETE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for user_itineraries (Only owner can manage their itinerary)
CREATE POLICY "Allow individual user access" ON public.user_itineraries
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for itinerary_days (Only owner of the parent itinerary can manage days)
CREATE POLICY "Allow access for itinerary owner" ON public.itinerary_days
  FOR ALL
  USING (itinerary_id IN (SELECT id FROM public.user_itineraries WHERE user_id = auth.uid()))
  WITH CHECK (itinerary_id IN (SELECT id FROM public.user_itineraries WHERE user_id = auth.uid()));

-- Policies for itinerary_locations (Only owner of the parent itinerary can manage locations within days)
CREATE POLICY "Allow access for itinerary owner" ON public.itinerary_locations
  FOR ALL
  USING (day_id IN (SELECT id FROM public.itinerary_days WHERE itinerary_id IN (SELECT id FROM public.user_itineraries WHERE user_id = auth.uid())))
  WITH CHECK (day_id IN (SELECT id FROM public.itinerary_days WHERE itinerary_id IN (SELECT id FROM public.user_itineraries WHERE user_id = auth.uid())));


-- ==================================
--          FUNCTIONS
-- ==================================

-- Create update_itinerary function for atomically updating itineraries
-- SECURITY INVOKER means the function runs with the permissions of the user calling it (relies on RLS policies above)
CREATE OR REPLACE FUNCTION public.update_itinerary(_itinerary_id integer, _days_data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER -- Important: Runs as the calling user, respecting RLS policies
AS $$
DECLARE
    day_data jsonb;
    loc_id text;
    new_day_id integer;
    loc_index integer;
BEGIN
    -- Delete existing days and locations for this itinerary
    -- RLS policies defined above will ensure the user can only delete days/locations they own
    DELETE FROM public.itinerary_locations WHERE day_id IN (SELECT id FROM public.itinerary_days WHERE itinerary_id = _itinerary_id);
    DELETE FROM public.itinerary_days WHERE itinerary_id = _itinerary_id;

    -- Insert new days and locations
    -- RLS policies will ensure the user can only insert into days/locations linked to their itinerary
    FOR day_data IN SELECT * FROM jsonb_array_elements(_days_data)
    LOOP
        -- Insert the day
        INSERT INTO public.itinerary_days (itinerary_id, day_number, updated_at)
        VALUES (_itinerary_id, (day_data->>'day_number')::integer, NOW())
        RETURNING id INTO new_day_id;

        -- Insert locations for this day
        loc_index := 0;
        FOR loc_id IN SELECT * FROM jsonb_array_elements_text(day_data->'locations')
        LOOP
            INSERT INTO public.itinerary_locations (day_id, location_id, position)
            VALUES (new_day_id, loc_id, loc_index);
            loc_index := loc_index + 1;
        END LOOP;
    END LOOP;

    -- Update the itinerary's updated_at timestamp
    -- RLS policy ensures the user can only update their own itinerary
    UPDATE public.user_itineraries SET updated_at = NOW() WHERE id = _itinerary_id;
END;
$$;

COMMENT ON FUNCTION public.update_itinerary(integer, jsonb) IS 'Atomically updates an itinerary by deleting existing days/locations and inserting the new structure provided in _days_data JSONB. Runs with invoker security, relying on RLS.';