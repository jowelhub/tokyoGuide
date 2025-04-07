-- ==================================
--          DROP STATEMENTS
-- ==================================
-- Drop dependent objects first (functions, policies)
DROP FUNCTION IF EXISTS public.update_itinerary(integer, jsonb);
DROP FUNCTION IF EXISTS public.create_new_itinerary(text); -- Add drop for new function if needed

DROP POLICY IF EXISTS "Allow public read access" ON public.locations;
DROP POLICY IF EXISTS "Prevent public modification" ON public.locations;
DROP POLICY IF EXISTS "Allow public read access" ON public.categories;
DROP POLICY IF EXISTS "Prevent public modification" ON public.categories;
DROP POLICY IF EXISTS "Allow individual user access" ON public.user_favorites;
DROP POLICY IF EXISTS "Allow individual user access for itineraries" ON public.user_itineraries; -- Renamed for clarity
DROP POLICY IF EXISTS "Allow access for itinerary owner" ON public.itinerary_days;
DROP POLICY IF EXISTS "Allow access for itinerary owner" ON public.itinerary_locations;

-- Drop tables in reverse order of dependency
DROP TABLE IF EXISTS public.itinerary_locations;
DROP TABLE IF EXISTS public.itinerary_days;
DROP TABLE IF EXISTS public.user_itineraries;
DROP TABLE IF EXISTS public.user_favorites;
DROP TABLE IF EXISTS public.locations;
DROP TABLE IF EXISTS public.categories;

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
  category_id TEXT NOT NULL REFERENCES public.categories(id),
  latitude FLOAT NOT NULL,
  longitude FLOAT NOT NULL,
  details_markdown TEXT, -- Added markdown content field
  images JSONB NOT NULL DEFAULT '[]'::jsonb
);
COMMENT ON TABLE public.locations IS 'Stores details about visitable locations.';

-- Create user favorites table
CREATE TABLE public.user_favorites (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, location_id)
);
COMMENT ON TABLE public.user_favorites IS 'Stores user favorite locations.';

-- Create user itineraries table (MODIFIED)
CREATE TABLE public.user_itineraries (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- Added name field
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, name) -- Name must be unique per user
);
COMMENT ON TABLE public.user_itineraries IS 'Stores user trip itineraries. Each user can have multiple itineraries with unique names.';

-- Create itinerary days table
CREATE TABLE public.itinerary_days (
  id SERIAL PRIMARY KEY,
  itinerary_id INTEGER NOT NULL REFERENCES public.user_itineraries(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL CHECK (day_number > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(itinerary_id, day_number)
);
COMMENT ON TABLE public.itinerary_days IS 'Stores individual days within an itinerary.';

-- Create itinerary locations table
CREATE TABLE public.itinerary_locations (
  id SERIAL PRIMARY KEY,
  day_id INTEGER NOT NULL REFERENCES public.itinerary_days(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 0),
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

-- Insert locations (Ensure images are valid JSONB arrays with double quotes)
-- Added sample markdown for all locations
INSERT INTO public.locations (id, name, description, category_id, latitude, longitude, images, details_markdown)
VALUES
  ('meiji-shrine', 'Meiji Shrine', 'A Shinto shrine dedicated to Emperor Meiji and Empress Shoken, set in a peaceful forest in the heart of Tokyo.', 'shrine', 35.6764, 139.6993, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'::jsonb, E'# About Meiji Shrine\n\nMeiji Jingu (明治神宮) is a **Shinto shrine** located in Shibuya, Tokyo, dedicated to the deified spirits of Emperor Meiji and his consort, Empress Shoken. The shrine does not contain the emperor''s grave, which is located at Fushimi-momoyama, south of Kyoto.\n\n## The Forest\nThe shrine is situated within a vast, man-made forest covering an area of 70 hectares (170 acres). This serene oasis consists of 120,000 trees of 365 different species, donated by people from all parts of Japan when the shrine was established. The forest is visited by many as a recreation and relaxation area in the center of Tokyo.\n\n## Visiting Tips\n*   The shrine grounds are expansive; wear comfortable walking shoes.\n*   Entrance is free.\n*   Check for seasonal festivals or ceremonies for a unique experience.\n*   Be respectful of the religious site; follow signage and instructions.\n\n## Access\nLocated adjacent to Harajuku Station and Meiji-jingumae Station.'),
  ('shibuya-crossing', 'Shibuya Crossing', 'The world''s busiest pedestrian crossing, surrounded by giant video screens and neon signs.', 'activity', 35.6595, 139.7004, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'::jsonb, E'# Shibuya Scramble Crossing\n\nOften featured in movies and media, the Shibuya Scramble Crossing is an iconic symbol of Tokyo''s vibrant energy. Located just outside Shibuya Station''s Hachiko Exit, it''s rumored to be the **world''s busiest intersection**.\n\n## The Experience\nWhen the traffic lights turn red, vehicles stop in all directions, and pedestrians surge into the intersection from all sides, crossing in a seemingly chaotic yet efficient manner. It''s a mesmerizing spectacle of urban life.\n\n## Best Viewing Spots\n*   **Starbucks Tsutaya (2nd floor):** Offers a classic, eye-level view (often crowded).\n*   **Shibuya Sky:** Observation deck providing a stunning bird''s-eye view.\n*   **Magnet by Shibuya 109 Rooftop:** Another great overhead perspective.\n*   **Shibuya Station Walkways:** Connecting bridges offer good vantage points.'),
  ('ueno-park', 'Ueno Park', 'A spacious public park known for its museums, temples, and seasonal cherry blossoms.', 'park', 35.7155, 139.7737, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'::jsonb, E'# Ueno Park (上野公園)\n\nUeno Park is one of Tokyo''s largest and most popular public parks, established in 1873. It''s a major cultural center, housing several prominent museums and attractions.\n\n## Key Attractions\n*   **Museums:** Tokyo National Museum, National Museum of Nature and Science, Tokyo Metropolitan Art Museum, National Museum of Western Art.\n*   **Ueno Zoo:** Japan''s oldest zoo.\n*   **Shinobazu Pond:** A large pond with lotus beds, boat rentals, and Bentendo Temple Hall on an island.\n*   **Temples & Shrines:** Kaneiji Temple, Kiyomizu Kannon Temple, Toshogu Shrine.\n*   **Cherry Blossoms:** One of Tokyo''s most famous spots for *hanami* (cherry blossom viewing) in spring.\n\n## Activities\nEnjoy museum hopping, strolling through the park, visiting the zoo, boating on the pond, or simply relaxing under the trees.'),
  ('senso-ji', 'Senso-ji Temple', 'Tokyo''s oldest temple, a vibrant Buddhist temple in Asakusa with a large lantern and Nakamise-dori market.', 'shrine', 35.7148, 139.7967, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'::jsonb, E'# Senso-ji Temple (浅草寺)\n\nLocated in the heart of Asakusa, Senso-ji is Tokyo''s **oldest temple**, founded in 645 AD. It''s dedicated to Kannon, the goddess of mercy.\n\n## Highlights\n*   **Kaminarimon (Thunder Gate):** The iconic outer gate with a massive red lantern.\n*   **Nakamise-dori:** A bustling shopping street leading from Kaminarimon to the temple''s second gate (Hozomon), lined with stalls selling traditional snacks and souvenirs.\n*   **Hozomon Gate:** The inner gate, housing large straw sandals (waraji).\n*   **Main Hall & Five-Story Pagoda:** The central structures of the temple complex.\n\n## Visiting\nSenso-ji is a very popular tourist destination and can be extremely crowded, especially on weekends and holidays. The temple grounds are always open, but the Main Hall opens at 6:00 (6:30 from October to March) and closes at 17:00.'),
  ('tokyo-skytree', 'Tokyo Skytree', 'The tallest structure in Japan, offering panoramic views of Tokyo from its observation decks.', 'activity', 35.7101, 139.8107, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'::jsonb, E'# Tokyo Skytree\n\nStanding at **634 meters (2,080 feet)**, Tokyo Skytree is a broadcasting, restaurant, and observation tower in Sumida, Tokyo. It became the tallest structure in Japan in 2010 and reached its full height in March 2011.\n\n## Observation Decks\n*   **Tembo Deck (350m):** The main observatory with wide windows, cafes, and shops.\n*   **Tembo Galleria (450m):** A higher, sloping spiral ramp offering even more expansive views.\n\n## Features\n*   Stunning panoramic views of the Tokyo metropolis.\n*   Glass floor sections on the Tembo Deck for a thrilling look down.\n*   Restaurants and cafes with incredible views.\n*   Tokyo Solamachi shopping complex at its base.\n\n**Tip:** Purchase tickets online in advance to save time, especially during peak seasons.'),
  ('ginza', 'Ginza', 'Upscale shopping district known for its department stores, boutiques, and elegant restaurants.', 'shopping', 35.6714, 139.7671, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'::jsonb, E'# Ginza (銀座)\n\nGinza is Tokyo''s most famous **upscale shopping, dining, and entertainment district**. It features numerous department stores, boutiques, art galleries, restaurants, night clubs, and cafes.\n\n## Shopping Highlights\n*   **Department Stores:** Wako, Mitsukoshi, Matsuya, Ginza Six.\n*   **Flagship Stores:** Many international luxury brands have their flagship stores here.\n*   **Specialty Shops:** From traditional crafts to modern electronics.\n\n## Chuo Dori\nThe main street, Chuo Dori, becomes a large pedestrian zone (**Hokōsha Tengoku**) on weekend afternoons (Saturdays, Sundays, and holidays), making for a pleasant strolling experience.\n\n## Dining\nGinza offers a wide range of dining options, from Michelin-starred restaurants to casual cafes and traditional Japanese eateries.'),
  ('shinjuku-gyoen', 'Shinjuku Gyoen National Garden', 'A large park blending Japanese, English, and French garden styles, offering a tranquil escape in bustling Shinjuku.', 'garden', 35.6852, 139.7101, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'::jsonb, E'# Shinjuku Gyoen National Garden (新宿御苑)\n\nOne of Tokyo''s largest and most beautiful parks, Shinjuku Gyoen offers a peaceful retreat from the surrounding urban bustle. Originally an imperial garden, it was opened to the public after World War II.\n\n## Garden Styles\nThe park uniquely combines three distinct garden styles:\n*   **English Landscape Garden:** Featuring wide, open lawns and meandering paths.\n*   **French Formal Garden:** Characterized by symmetrical layouts and rose beds.\n*   **Japanese Traditional Garden:** With ponds, bridges, teahouses, and meticulously landscaped scenery.\n\n## Features\n*   **Greenhouses:** Housing tropical and subtropical plants.\n*   **Taiwan Pavilion (Kyu Goryotei):** A historic structure offering views over the Japanese garden.\n*   **Seasonal Beauty:** Famous for cherry blossoms in spring and vibrant foliage in autumn.\n\n**Note:** There is an admission fee to enter the garden.'),
  ('akihabara', 'Akihabara', 'Electric Town, famous for its electronics shops, anime and manga stores, and gaming culture.', 'activity', 35.7023, 139.7745, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'::jsonb, E'# Akihabara Electric Town (秋葉原電気街)\n\nAkihabara, often shortened to Akiba, is a world-renowned district famous for its **electronics retailers, anime and manga culture, and gaming arcades**.\n\n## What to Find\n*   **Electronics:** From tiny components to the latest gadgets, spread across large department stores (like Yodobashi Camera) and small specialist shops.\n*   **Anime & Manga:** Countless stores selling manga, anime DVDs/Blu-rays, figures, merchandise, and collectibles.\n*   **Gaming:** Arcades, retro game shops, and stores selling the latest consoles and games.\n*   **Maid Cafes:** A unique aspect of Akihabara culture.\n*   **Duty-Free Shops:** Popular with international tourists.\n\nThe main street, Chuo Dori, is closed to car traffic on Sundays, creating a pedestrian paradise (*Hokōsha Tengoku*).'),
  ('harajuku', 'Harajuku', 'Known for its unique street style, colorful shops, and trendy cafes, especially along Takeshita Street.', 'shopping', 35.6702, 139.7027, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'::jsonb, E'# Harajuku (原宿)\n\nHarajuku is the center of Japan''s **most extreme teenage cultures and fashion styles**, but also offers shopping for adults and historical sights.\n\n## Key Areas\n*   **Takeshita Street:** A narrow, crowded street lined with quirky boutiques, fast food outlets, crepe stands, and shops catering to youth fashion trends.\n*   **Omotesando:** Often compared to the Champs-Élysées, this broad, tree-lined avenue features upscale boutiques, cafes, and restaurants targeting a more adult clientele.\n*   **Ura-Harajuku (Cat Street):** The network of smaller streets behind Omotesando, known for independent shops and streetwear brands.\n\n## Nearby Attractions\n*   Meiji Shrine\n*   Yoyogi Park\n*   Nezu Museum (short walk from Omotesando)\n\nHarajuku is particularly vibrant on Sundays when many young people gather, dressed in unique and eye-catching styles.'),
  ('tsukiji-outer-market', 'Tsukiji Outer Market', 'A lively market with numerous restaurants and shops selling fresh seafood, produce, and kitchenware.', 'food', 35.6661, 139.7706, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'::jsonb, E'# Tsukiji Outer Market (築地場外市場)\n\nWhile the famous inner wholesale market moved to Toyosu in 2018, the **Tsukiji Outer Market** remains a bustling hub for food lovers.\n\n## What to Expect\n*   **Fresh Seafood:** Numerous stalls selling all kinds of fresh and processed seafood.\n*   **Restaurants:** Some of Tokyo''s best sushi restaurants (often with long queues), ramen shops, and eateries serving various Japanese dishes.\n*   **Produce & Goods:** Shops selling fresh fruits, vegetables, pickles, dried goods, kitchen knives, and tableware.\n*   **Street Food:** Enjoy snacks like tamagoyaki (rolled omelet), grilled seafood, and mochi.\n\n## Visiting\n*   The market is busiest and best experienced in the **morning**.\n*   Many shops close by the early afternoon.\n*   It''s located near Tsukiji Station and Tsukijishijo Station.'),
  ('tokyo-national-museum', 'Tokyo National Museum', 'One of Japan s oldest and largest museums, showcasing a vast collection of Japanese art and artifacts.', 'museum', 35.7187, 139.7764, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'::jsonb, E'# Tokyo National Museum (東京国立博物館)\n\nEstablished in 1872, the Tokyo National Museum (TNM) is the **oldest and largest museum in Japan**. Located in Ueno Park, it houses an extensive collection of art and artifacts from Japan and other Asian countries.\n\n## Main Galleries\n*   **Honkan (Japanese Gallery):** Showcases Japanese art from ancient times to the late 19th century, including samurai armor, swords, pottery, and ukiyo-e prints.\n*   **Toyokan (Asian Gallery):** Features art and artifacts from China, Korea, Southeast Asia, Central Asia, India, and Egypt.\n*   **Heiseikan:** Hosts special exhibitions and displays Japanese archaeological artifacts.\n*   **Horyuji Homotsukan (Gallery of Horyuji Treasures):** Exhibits priceless objects donated by Horyuji Temple in Nara.\n*   **Kuroda Memorial Hall:** Displays works by the influential Western-style painter Kuroda Seiki.\n\nAllow several hours to explore the vast collections.'),
  ('yoyogi-park', 'Yoyogi Park', 'Large park next to Harajuku Station and Meiji Jingu, popular for events, picnics, and outdoor activities.', 'park', 35.6724, 139.6944, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'::jsonb, E'# Yoyogi Park (代々木公園)\n\nOne of Tokyo''s largest city parks, Yoyogi Park is a popular gathering place known for its spacious lawns, ponds, and forested areas. It''s located adjacent to Harajuku Station and Meiji Shrine.\n\n## Features\n*   **Wide Lawns:** Ideal for picnics, sunbathing, and casual sports.\n*   **Cycling Paths:** Rent bicycles and explore the park''s dedicated cycling course.\n*   **Dog Run:** A designated area for dogs to play off-leash.\n*   **Bird Sanctuary:** A quieter area for observing local birdlife.\n*   **Event Space:** Often hosts festivals, flea markets, and public performances, especially on weekends.\n\n## Atmosphere\nYoyogi Park is known for its lively atmosphere, particularly on Sundays, when street performers, musicians, cosplayers, and dance groups gather.'),
  ('teamlab-planets', 'teamLab Planets TOKYO', 'Immersive digital art museum where visitors walk through interactive installations.', 'activity', 35.6486, 139.7839, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'::jsonb, E'# teamLab Planets TOKYO DMM\n\nteamLab Planets is a unique museum experience where visitors become part of the art. It''s known as a **"body immersive"** museum, featuring large-scale digital art installations that engage multiple senses.\n\n## The Experience\n*   Visitors walk barefoot through the museum.\n*   Some installations involve walking through water.\n*   Interactive digital art responds to visitors'' presence and movements.\n*   Themes often revolve around nature, light, and the universe.\n\n## Key Installations (Subject to Change)\n*   Water areas with digital koi fish.\n*   Infinite crystal universes.\n*   Floating flower gardens.\n\n**Important:**\n*   Tickets should be purchased online in advance as entry is timed.\n*   Wear clothing that can be rolled up above the knees due to water installations.\n*   Located in the Toyosu area.'),
  ('ghibli-museum', 'Ghibli Museum', 'Animation and art museum showcasing the works of Studio Ghibli, known for films like ''Spirited Away''.', 'museum', 35.6962, 139.5703, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'::jsonb, E'# Ghibli Museum, Mitaka (三鷹の森ジブリ美術館)\n\nDesigned by Studio Ghibli director Hayao Miyazaki himself, this whimsical museum showcases the art and animation of the beloved studio.\n\n## Highlights\n*   Exhibits on the history and science of animation.\n*   Recreations of Ghibli artists'' workspaces.\n*   A reading room with recommended books.\n*   A Catbus room for children.\n*   A rooftop garden with a robot soldier from "Castle in the Sky".\n*   A small theater showing exclusive Ghibli short films.\n\n## Ticket Information\n*   **Tickets are notoriously difficult to obtain.** They are *not* sold at the museum.\n*   Tickets must be purchased **in advance** for a specific date and time slot.\n*   Sales typically open monthly (e.g., on the 10th of the month for entry the following month) via the Lawson ticketing system (online or in convenience stores in Japan) or through authorized overseas travel agencies.\n*   Check the official Ghibli Museum website for the latest ticketing procedures.\n\nLocated in Mitaka, on the edge of Inokashira Park.'),
  ('national-museum-nature-science', 'National Museum of Nature and Science', 'Comprehensive museum exhibiting a wide range of specimens related to natural history and science and technology.', 'museum', 35.7175, 139.7753, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'::jsonb, E'# National Museum of Nature and Science (国立科学博物館)\n\nLocated in Ueno Park, this museum offers extensive exhibits covering natural history and the history of science and technology.\n\n## Main Buildings\n*   **Japan Gallery (Nihonkan):** Focuses on the natural environment of the Japanese archipelago and the history of the Japanese people.\n*   **Global Gallery (Chikyukan):** Explores the history of life on Earth, the evolution of science and technology, and features interactive exhibits.\n\n## Highlights\n*   Dinosaur skeletons.\n*   Exhibits on Japanese flora and fauna.\n*   Displays on the history of technology in Japan.\n*   Theater 360: A unique spherical theater experience.\n\nIt''s a great museum for families and anyone interested in science and the natural world.'),
  ('koishikawa-korakuen-garden', 'Koishikawa Korakuen Garden', 'One of Tokyo''s oldest and best Japanese gardens, featuring ponds, stones, and paths that recreate famous landscapes.', 'garden', 35.7052, 139.7504, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'::jsonb, E'# Koishikawa Korakuen Garden (小石川後楽園)\n\nDating back to the early Edo Period (17th century), Koishikawa Korakuen is one of Tokyo''s **oldest and most beautiful traditional Japanese gardens**. It was built by the Mito branch of the ruling Tokugawa family.\n\n## Design\nThe garden incorporates elements of both Chinese and Japanese landscape design. It aims to replicate famous scenes from Japan and China in miniature using ponds, stones, trees, and man-made hills.\n\n## Features\n*   **Central Pond (Daisensui):** The heart of the garden, featuring an island and several viewpoints.\n*   **Engetsu-kyo Bridge:** A picturesque full-moon bridge.\n*   **Tsutenkyo Bridge:** A vermilion bridge often stunning during autumn foliage.\n*   **Rice Paddy:** A small, traditional rice field.\n*   Seasonal flowers like plum blossoms, cherry blossoms, irises, and autumn colors.\n\nLocated next to the Tokyo Dome City complex.'),
  ('hamarikyu-gardens', 'Hamarikyu Gardens', 'Beautiful landscape garden by Tokyo Bay, featuring a seawater pond that changes with the tides.', 'garden', 35.6605, 139.7626, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'::jsonb, E'# Hamarikyu Gardens (浜離宮恩賜庭園)\n\nAn attractive landscape garden located alongside Tokyo Bay, Hamarikyu features **seawater ponds** whose water levels change with the tides, a unique characteristic inherited from its origins as a feudal lord''s residence and duck hunting grounds during the Edo Period.\n\n## Highlights\n*   **Shioiri-no-ike Pond:** The main tidal pond with several islets.\n*   **Nakajima Teahouse:** Located on an island in the pond, accessible by bridges, where visitors can enjoy matcha green tea and Japanese sweets.\n*   **300-Year-Old Pine Tree:** A magnificent, meticulously maintained black pine.\n*   **Peony Garden & Flower Field:** Offering seasonal blooms.\n*   **Water Bus Stop:** A Tokyo Water Bus pier allows access to/from Asakusa and other locations.\n\nThe contrast between the traditional garden and the surrounding skyscrapers of the Shiodome district is striking.'),
  ('kabuki-za-theatre', 'Kabuki-za Theatre', 'Main theater for Kabuki performances in Tokyo, showcasing traditional Japanese dance and drama.', 'theater', 35.6702, 139.7640, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'::jsonb, E'# Kabuki-za Theatre (歌舞伎座)\n\nLocated in Ginza, the Kabuki-za is the **principal theatre in Tokyo for traditional Kabuki performances**. The current structure, opened in 2013, incorporates architectural elements from its historic predecessors.\n\n## Kabuki\nKabuki is a classical Japanese dance-drama known for its stylized performances, elaborate costumes, and dramatic makeup.\n\n## Watching a Performance\n*   **Full Programs:** Typically divided into matinee and evening sessions, each consisting of several acts or different plays. These can last several hours.\n*   **Single Act Tickets (Makumi):** A more accessible and affordable option for tourists. These tickets allow viewing of just one act, are usually sold on the day of the performance, and often involve standing room or seats in the upper levels.\n*   **English Subtitles/Guides:** Devices offering English commentary or subtitles are often available for rent.\n\nCheck the official Kabuki-za website for schedules and ticketing information.'),
  ('national-theatre', 'National Theatre', 'Venue for performances of traditional Japanese performing arts, including Noh, Kabuki, and Bunraku.', 'theater', 35.6912, 139.7448, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'::jsonb, E'# National Theatre of Japan (国立劇場)\n\nLocated near the Imperial Palace, the National Theatre complex is dedicated to the preservation and promotion of **traditional Japanese performing arts**.\n\n## Performance Types\n*   **Kabuki:** Classical dance-drama.\n*   **Noh & Kyogen:** Masked musical drama (Noh) and comedic interludes (Kyogen).\n*   **Bunraku:** Traditional puppet theatre.\n*   **Gagaku:** Ancient imperial court music and dance.\n*   **Folk Performing Arts:** Various regional traditional performances.\n\n## Facilities\n*   **Large Theatre:** Primarily for Kabuki and Buyo (Japanese dance).\n*   **Small Theatre:** Primarily for Bunraku, Hogaku (traditional music), and folk arts.\n*   **Engei Hall:** For Rakugo (comedic storytelling) and other variety performances.\n\nCheck the official website for performance schedules and ticket information. English guidance may be available for some performances.'),
  ('roppongi', 'Roppongi', 'District known for its vibrant nightlife, with numerous bars, clubs, and restaurants that stay open late.', 'nightlife', 35.6627, 139.7304, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'::jsonb, E'# Roppongi (六本木)\n\nRoppongi is a district famous for its **lively nightlife** and its status as a hub for the international community. It offers a high concentration of bars, nightclubs, and restaurants catering to diverse tastes.\n\n## Nightlife Scene\n*   **Clubs:** Features some of Tokyo''s largest and most popular nightclubs.\n*   **Bars:** A wide variety, from casual pubs to sophisticated cocktail lounges.\n*   **Restaurants:** International cuisine and late-night dining options.\n\n## Daytime Attractions\nRoppongi is not just about nightlife. It also boasts:\n*   **Roppongi Hills:** A large complex with shops, restaurants, a cinema, the Mori Art Museum, and the Tokyo City View observation deck.\n*   **Tokyo Midtown:** Another major complex with shops, restaurants, the Suntory Museum of Art, and the Ritz-Carlton hotel.\n*   **National Art Center, Tokyo:** One of Japan''s largest art exhibition spaces.\n\nBe aware that Roppongi''s nightlife areas can sometimes have aggressive touts; it''s generally best to ignore them.'),
  ('golden-gai', 'Golden Gai', 'Network of narrow alleys with tiny bars, each with its own unique atmosphere and regular clientele.', 'nightlife', 35.6935, 139.7197, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'::jsonb, E'# Shinjuku Golden Gai (新宿ゴールデン街)\n\nGolden Gai is a fascinating glimpse into Tokyo''s past, located in the bustling Shinjuku district. It consists of **six narrow alleys** packed with nearly 200 tiny, atmospheric bars and eateries.\n\n## Atmosphere\n*   Most bars are very small, seating only a handful of customers.\n*   Each establishment has a unique theme or caters to a specific clientele (e.g., jazz, punk rock, movies).\n*   The area retains a retro, Showa-era vibe.\n\n## Visiting Tips\n*   Many bars have cover charges (often displayed outside).\n*   Some bars cater primarily to regulars and may be less welcoming to first-time visitors or tourists, while others are explicitly foreigner-friendly.\n*   Photography is often discouraged inside the bars and sometimes even in the alleys.\n*   It''s best visited in the evening when the bars open.\n*   Explore respectfully and be prepared for small, intimate spaces.'),
  ('inokashira-park', 'Inokashira Park', 'Large park with a pond, walking paths, a zoo, and the Ghibli Museum located within its grounds.', 'park', 35.7019, 139.5669, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'::jsonb, E'# Inokashira Park (井の頭恩賜公園)\n\nLocated in western Tokyo, straddling Musashino and Mitaka cities, Inokashira Park is a beautiful and popular park centered around a large pond.\n\n## Main Features\n*   **Inokashira Pond:** Rent swan boats or rowboats for a relaxing time on the water.\n*   **Inokashira Park Zoo:** A small zoo located within the park grounds.\n*   **Benzaiten Shrine:** A shrine dedicated to the goddess Benzaiten, located on an island in the pond.\n*   **Ghibli Museum:** Situated at the southwestern edge of the park (requires separate, pre-booked tickets).\n*   **Walking Paths & Nature:** Pleasant trails wind through wooded areas.\n*   **Weekend Performances:** Often features street performers and musicians.\n\nIt''s a lovely spot for cherry blossom viewing in spring and autumn colors later in the year. Easily accessible from Kichijoji Station.'),
  ('showa-memorial-park', 'Showa Memorial Park', 'Vast park with seasonal flowers, gardens, cycling paths, and open spaces for recreation.', 'park', 35.7004, 139.4172, '["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4", "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]'::jsonb, E'# Showa Memorial Park (国営昭和記念公園)\n\nLocated in Tachikawa, western Tokyo, Showa Kinen Koen is an **enormous national park** established to commemorate the 50th anniversary of Emperor Showa''s reign. It offers vast green spaces and diverse recreational facilities.\n\n## Highlights\n*   **Seasonal Flower Displays:** Famous for tulips, poppies, cosmos, and ginkgo trees in autumn.\n*   **Japanese Garden:** A beautiful, traditional garden within the park.\n*   **Waterpark (Summer):** Rainbow Pool complex opens during summer months.\n*   **Cycling Paths:** Extensive network of paths; bicycle rentals available.\n*   **Children''s Forest:** Large playgrounds and activity areas for kids.\n*   **Open Fields:** Perfect for picnics and relaxation.\n*   **Museum:** Small museum dedicated to Emperor Showa.\n\n**Note:** There is an admission fee. Due to its size, allow plenty of time (half a day or more) to explore.');

-- ==================================
--          INDEXES
-- ==================================
-- Indexes on foreign keys and commonly queried columns improve performance

CREATE INDEX IF NOT EXISTS idx_locations_category_id ON public.locations(category_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_location_id ON public.user_favorites(location_id);
-- user_id is already indexed by UNIQUE constraint on user_favorites
CREATE INDEX IF NOT EXISTS idx_user_itineraries_user_id ON public.user_itineraries(user_id); -- Add index for user_id queries
-- (user_id, name) is already indexed by UNIQUE constraint on user_itineraries
CREATE INDEX IF NOT EXISTS idx_itinerary_days_itinerary_id ON public.itinerary_days(itinerary_id);
-- (itinerary_id, day_number) is already indexed by UNIQUE constraint on itinerary_days
CREATE INDEX IF NOT EXISTS idx_itinerary_locations_day_id ON public.itinerary_locations(day_id);
-- (day_id, location_id) is already indexed by UNIQUE constraint on itinerary_locations
CREATE INDEX IF NOT EXISTS idx_itinerary_locations_location_id ON public.itinerary_locations(location_id);
-- (day_id, position) is already indexed by UNIQUE constraint on itinerary_locations

-- ==================================
--      ROW LEVEL SECURITY (RLS)
-- ==================================
-- IMPORTANT: Enable RLS for all tables containing user data or accessed by users

-- Public tables (read-only for everyone, modification restricted)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON public.categories
  FOR SELECT USING (true); -- Allows anyone (logged in or anon) to read

CREATE POLICY "Prevent public modification" ON public.categories
  FOR ALL USING (false); -- Effectively blocks INSERT, UPDATE, DELETE for non-admins/supabase_admin

CREATE POLICY "Allow public read access" ON public.locations
  FOR SELECT USING (true); -- Allows anyone (logged in or anon) to read

CREATE POLICY "Prevent public modification" ON public.locations
  FOR ALL USING (false); -- Effectively blocks INSERT, UPDATE, DELETE for non-admins/supabase_admin

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

-- Policies for user_itineraries (Only owner can manage their itineraries)
CREATE POLICY "Allow individual user access for itineraries" ON public.user_itineraries
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for itinerary_days (Only owner of the parent itinerary can manage days)
-- RLS checks that the user_id associated with the itinerary_id matches the authenticated user's ID.
CREATE POLICY "Allow access for itinerary owner" ON public.itinerary_days
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_itineraries WHERE id = itinerary_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_itineraries WHERE id = itinerary_id AND user_id = auth.uid()));

-- Policies for itinerary_locations (Only owner of the parent itinerary can manage locations within days)
-- RLS checks ownership by joining through itinerary_days to user_itineraries.
CREATE POLICY "Allow access for itinerary owner" ON public.itinerary_locations
  FOR ALL
  USING (EXISTS (
    SELECT 1
    FROM public.itinerary_days d
    JOIN public.user_itineraries ui ON d.itinerary_id = ui.id
    WHERE d.id = day_id AND ui.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.itinerary_days d
    JOIN public.user_itineraries ui ON d.itinerary_id = ui.id
    WHERE d.id = day_id AND ui.user_id = auth.uid()
  ));


-- ==================================
--          FUNCTIONS
-- ==================================

-- Create update_itinerary function for atomically updating a specific itinerary's content
-- SECURITY INVOKER means the function runs with the permissions of the user calling it (relies on RLS policies above)
CREATE OR REPLACE FUNCTION public.update_itinerary(_itinerary_id integer, _days_data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER -- Important: Runs as the calling user, respecting RLS policies
AS $function$
DECLARE
    day_data jsonb;
    loc_id text;
    new_day_id integer;
    loc_index integer;
BEGIN
    -- Verify ownership before proceeding (although RLS should handle this, belt-and-suspenders)
    IF NOT EXISTS (SELECT 1 FROM public.user_itineraries WHERE id = _itinerary_id AND user_id = auth.uid()) THEN
        RAISE EXCEPTION 'User does not own itinerary %', _itinerary_id;
    END IF;

    -- Delete existing days and locations for this specific itinerary
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
$function$;

COMMENT ON FUNCTION public.update_itinerary(integer, jsonb) IS 'Atomically updates a specific itinerary''s content by deleting existing days/locations and inserting the new structure provided in _days_data JSONB. Runs with invoker security, relying on RLS.';

-- Optional: Function to create a new itinerary and its first day (can be called from API)
-- CREATE OR REPLACE FUNCTION public.create_new_itinerary(_user_id UUID, _name TEXT)
-- RETURNS integer -- Returns the new itinerary ID
-- LANGUAGE plpgsql
-- SECURITY DEFINER -- Use DEFINER if you need to bypass RLS temporarily for creation, but ensure input validation. INVOKER is safer if API handles auth check.
-- SET search_path = public
-- AS $function$
-- DECLARE
--     new_itinerary_id integer;
-- BEGIN
--     -- Insert the new itinerary
--     INSERT INTO public.user_itineraries (user_id, name, created_at, updated_at)
--     VALUES (_user_id, _name, NOW(), NOW())
--     RETURNING id INTO new_itinerary_id;
--
--     -- Insert the default first day
--     INSERT INTO public.itinerary_days (itinerary_id, day_number, created_at, updated_at)
--     VALUES (new_itinerary_id, 1, NOW(), NOW());
--
--     RETURN new_itinerary_id;
-- END;
-- $function$;
-- COMMENT ON FUNCTION public.create_new_itinerary(UUID, TEXT) IS 'Creates a new itinerary for a user with the given name and adds a default Day 1.';
-- -- Grant execute permission if needed (adjust role as necessary)
-- -- GRANT EXECUTE ON FUNCTION public.create_new_itinerary(UUID, TEXT) TO authenticated;