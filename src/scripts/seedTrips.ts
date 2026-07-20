import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "../config/db";
import User from "../models/User";
import Trip from "../models/Trip";

const sampleTrips = [
  {
    title: "Santorini Sunset Escape",
    country: "Greece",
    description:
      "Explore whitewashed villages perched on volcanic cliffs, watch the world-famous Oia sunset, and sail the caldera on a private catamaran.",
    imageUrl: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&q=80",
    gallery: ["https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1200&q=80"],
    budget: 1800,
    duration: 6,
    travelDate: new Date("2026-09-10"),
    category: "Luxury",
    rating: 4.8,
    ratingCount: 24,
    travelPlan: [
      { day: 1, title: "Arrival & Oia Sunset", details: "Settle into your cave hotel, evening walk to Oia castle for sunset." },
      { day: 2, title: "Fira & Caldera Views", details: "Explore Fira town, cable car ride, wine tasting at a cliffside winery." },
    ],
  },
  {
    title: "Bali Jungle & Beach Retreat",
    country: "Indonesia",
    description:
      "From Ubud's rice terraces to Uluwatu's cliff-top temples, this trip blends jungle serenity with world-class surf beaches.",
    imageUrl: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80",
    gallery: ["https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&q=80"],
    budget: 1200,
    duration: 8,
    travelDate: new Date("2026-08-15"),
    category: "Beach",
    rating: 4.7,
    ratingCount: 41,
    travelPlan: [{ day: 1, title: "Ubud Rice Terraces", details: "Tegallalang terrace walk, traditional Balinese lunch." }],
  },
  {
    title: "Swiss Alps Adventure",
    country: "Switzerland",
    description:
      "Hike alpine trails, ride scenic cable cars above Interlaken, and take in panoramic views of the Eiger, Mönch, and Jungfrau.",
    imageUrl: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&q=80",
    gallery: ["https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1200&q=80"],
    budget: 2600,
    duration: 7,
    travelDate: new Date("2026-07-20"),
    category: "Mountain",
    rating: 4.9,
    ratingCount: 18,
    travelPlan: [{ day: 1, title: "Interlaken Arrival", details: "Lake cruise on Lake Thun, gondola to Harder Kulm viewpoint." }],
  },
  {
    title: "Tokyo Neon Nights",
    country: "Japan",
    description:
      "Dive into Shibuya's crosswalks, Akihabara's arcades, and quiet temple gardens — a fast-paced city trip with cultural depth.",
    imageUrl: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80",
    gallery: ["https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&q=80"],
    budget: 2000,
    duration: 6,
    travelDate: new Date("2026-10-05"),
    category: "City",
    rating: 4.6,
    ratingCount: 33,
    travelPlan: [{ day: 1, title: "Shibuya & Harajuku", details: "Shibuya crossing, Takeshita Street, Meiji Shrine." }],
  },
  {
    title: "Serengeti Wildlife Safari",
    country: "Tanzania",
    description:
      "Witness the Great Migration up close on guided game drives through the Serengeti's endless golden plains.",
    imageUrl: "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80",
    gallery: ["https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1200&q=80"],
    budget: 3200,
    duration: 9,
    travelDate: new Date("2026-06-12"),
    category: "Wildlife",
    rating: 4.9,
    ratingCount: 15,
    travelPlan: [{ day: 1, title: "Arusha to Serengeti", details: "Scenic transfer, afternoon game drive." }],
  },
  {
    title: "Machu Picchu Trek",
    country: "Peru",
    description:
      "Trek the classic Inca Trail through cloud forest and ancient ruins, arriving at Machu Picchu at sunrise.",
    imageUrl: "https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800&q=80",
    gallery: ["https://images.unsplash.com/photo-1526392060635-9d6019884377?w=1200&q=80"],
    budget: 1600,
    duration: 5,
    travelDate: new Date("2026-05-18"),
    category: "Adventure",
    rating: 4.8,
    ratingCount: 27,
    travelPlan: [{ day: 1, title: "Cusco Acclimatization", details: "City walking tour, coca tea, early rest for altitude." }],
  },
  {
    title: "Marrakech Medina Discovery",
    country: "Morocco",
    description:
      "Wander maze-like souks, sleep in a traditional riad, and take a day trip into the Atlas Mountains and Sahara dunes.",
    imageUrl: "https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=800&q=80",
    gallery: ["https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=1200&q=80"],
    budget: 900,
    duration: 5,
    travelDate: new Date("2026-11-02"),
    category: "Cultural",
    rating: 4.5,
    ratingCount: 22,
    travelPlan: [{ day: 1, title: "Medina & Souks", details: "Jemaa el-Fnaa square, spice souks, traditional hammam." }],
  },
  {
    title: "Bangkok on a Budget",
    country: "Thailand",
    description:
      "Street food crawls, golden temples, and floating markets — a full Bangkok experience without breaking the bank.",
    imageUrl: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&q=80",
    gallery: ["https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1200&q=80"],
    budget: 500,
    duration: 5,
    travelDate: new Date("2026-08-28"),
    category: "Budget",
    rating: 4.4,
    ratingCount: 38,
    travelPlan: [{ day: 1, title: "Grand Palace & Wat Pho", details: "Temple visits, river ferry, street food dinner." }],
  },
  {
    title: "Maldives Overwater Bliss",
    country: "Maldives",
    description:
      "Private overwater villas, turquoise lagoons, and world-class diving on untouched coral reefs.",
    imageUrl: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800&q=80",
    gallery: ["https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=1200&q=80"],
    budget: 4200,
    duration: 6,
    travelDate: new Date("2026-12-15"),
    category: "Luxury",
    rating: 5.0,
    ratingCount: 12,
    travelPlan: [{ day: 1, title: "Arrival & Villa Check-in", details: "Seaplane transfer, sunset snorkel." }],
  },
  {
    title: "New York City Explorer",
    country: "United States",
    description:
      "Broadway shows, Central Park, world-class museums, and rooftop skyline views across all five boroughs.",
    imageUrl: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&q=80",
    gallery: ["https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1200&q=80"],
    budget: 2400,
    duration: 5,
    travelDate: new Date("2026-09-25"),
    category: "City",
    rating: 4.6,
    ratingCount: 45,
    travelPlan: [{ day: 1, title: "Manhattan Highlights", details: "Times Square, Central Park, Top of the Rock." }],
  },
  {
    title: "Icelandic Ring Road",
    country: "Iceland",
    description:
      "Self-drive past waterfalls, black sand beaches, and glacier lagoons, with a shot at chasing the Northern Lights.",
    imageUrl: "https://images.unsplash.com/photo-1500989145603-8e7ef71d639e?w=800&q=80",
    gallery: ["https://images.unsplash.com/photo-1500989145603-8e7ef71d639e?w=1200&q=80"],
    budget: 2900,
    duration: 8,
    travelDate: new Date("2026-10-20"),
    category: "Adventure",
    rating: 4.9,
    ratingCount: 19,
    travelPlan: [{ day: 1, title: "Golden Circle", details: "Þingvellir, Geysir, Gullfoss waterfall." }],
  },
  {
    title: "Cape Town Coastal Journey",
    country: "South Africa",
    description:
      "Table Mountain hikes, penguin colonies, and the scenic Cape Peninsula drive along dramatic Atlantic coastline.",
    imageUrl: "https://images.unsplash.com/photo-1580060839134-75a50c0f4d17?w=800&q=80",
    gallery: ["https://images.unsplash.com/photo-1580060839134-75a50c0f4d17?w=1200&q=80"],
    budget: 1500,
    duration: 7,
    travelDate: new Date("2026-11-10"),
    category: "Adventure",
    rating: 4.7,
    ratingCount: 21,
    travelPlan: [{ day: 1, title: "Table Mountain", details: "Cable car ascent, city bowl views, sunset at Signal Hill." }],
  },
  {
    title: "Vietnam Coast to Mountains",
    country: "Vietnam",
    description:
      "Halong Bay cruises, Hanoi street food, and the terraced hills of Sapa — a full spectrum of Vietnamese landscapes.",
    imageUrl: "https://images.unsplash.com/photo-1528127269322-539801943592?w=800&q=80",
    gallery: ["https://images.unsplash.com/photo-1528127269322-539801943592?w=1200&q=80"],
    budget: 1100,
    duration: 9,
    travelDate: new Date("2026-08-05"),
    category: "Budget",
    rating: 4.5,
    ratingCount: 29,
    travelPlan: [{ day: 1, title: "Hanoi Old Quarter", details: "Street food walk, Hoan Kiem Lake, water puppet show." }],
  },
  {
    title: "Kyoto Temple Trail",
    country: "Japan",
    description:
      "Golden pavilions, bamboo groves, and geisha districts — a slower, cultural counterpart to Tokyo's neon energy.",
    imageUrl: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80",
    gallery: ["https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&q=80"],
    budget: 1900,
    duration: 6,
    travelDate: new Date("2026-04-02"),
    category: "Cultural",
    rating: 4.8,
    ratingCount: 31,
    travelPlan: [{ day: 1, title: "Arashiyama Bamboo Grove", details: "Bamboo forest walk, Tenryu-ji temple gardens." }],
  },
  {
    title: "Dubai Desert & Skyline",
    country: "United Arab Emirates",
    description:
      "Desert safaris under the stars paired with the world's tallest towers and rooftop infinity pools.",
    imageUrl: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80",
    gallery: ["https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=80"],
    budget: 2800,
    duration: 5,
    travelDate: new Date("2026-12-01"),
    category: "Luxury",
    rating: 4.6,
    ratingCount: 26,
    travelPlan: [{ day: 1, title: "Burj Khalifa & Downtown", details: "Observation deck, Dubai Fountain show." }],
  },
  {
    title: "Costa Rica Rainforest Zipline",
    country: "Costa Rica",
    description:
      "Canopy ziplines, volcano hikes, and sloth spotting through some of the world's most biodiverse rainforest.",
    imageUrl: "https://images.unsplash.com/photo-1518259102261-b40117eabbc9?w=800&q=80",
    gallery: ["https://images.unsplash.com/photo-1518259102261-b40117eabbc9?w=1200&q=80"],
    budget: 1700,
    duration: 7,
    travelDate: new Date("2026-07-08"),
    category: "Adventure",
    rating: 4.7,
    ratingCount: 20,
    travelPlan: [{ day: 1, title: "Arenal Volcano", details: "Hanging bridges walk, hot springs soak." }],
  },
  {
    title: "Norwegian Fjord Cruise",
    country: "Norway",
    description:
      "Sail past dramatic cliffs and waterfalls through the fjords, with stops in colorful coastal villages.",
    imageUrl: "https://images.unsplash.com/photo-1601439678777-b2b3c56fe1d0?w=800&q=80",
    gallery: ["https://images.unsplash.com/photo-1601439678777-b2b3c56fe1d0?w=1200&q=80"],
    budget: 3100,
    duration: 8,
    travelDate: new Date("2026-06-25"),
    category: "Mountain",
    rating: 4.9,
    ratingCount: 14,
    travelPlan: [{ day: 1, title: "Bergen Departure", details: "Fish market visit, evening fjord entry." }],
  },
  {
    title: "Lisbon & the Algarve",
    country: "Portugal",
    description:
      "Colorful tram rides through Lisbon's hills, followed by the golden cliffs and beaches of the Algarve coast.",
    imageUrl: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800&q=80",
    gallery: ["https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=1200&q=80"],
    budget: 1300,
    duration: 7,
    travelDate: new Date("2026-09-14"),
    category: "Beach",
    rating: 4.6,
    ratingCount: 25,
    travelPlan: [{ day: 1, title: "Alfama District", details: "Tram 28 ride, fado music evening." }],
  },
  {
    title: "Sri Lanka Tea & Coast Loop",
    country: "Sri Lanka",
    description:
      "Misty tea plantations by train, ancient rock fortresses, and palm-lined southern beaches in one loop.",
    imageUrl: "https://images.unsplash.com/photo-1546708973-b339540b5162?w=800&q=80",
    gallery: ["https://images.unsplash.com/photo-1546708973-b339540b5162?w=1200&q=80"],
    budget: 950,
    duration: 10,
    travelDate: new Date("2026-01-15"),
    category: "Budget",
    rating: 4.5,
    ratingCount: 17,
    travelPlan: [{ day: 1, title: "Kandy Temple", details: "Temple of the Tooth, botanical gardens." }],
  },
  {
    title: "Patagonia Trekking Expedition",
    country: "Chile",
    description:
      "Multi-day treks past granite spires and glacial lakes in one of the world's last great wildernesses.",
    imageUrl: "https://images.unsplash.com/photo-1531176175280-33e81a2e6b60?w=800&q=80",
    gallery: ["https://images.unsplash.com/photo-1531176175280-33e81a2e6b60?w=1200&q=80"],
    budget: 2700,
    duration: 10,
    travelDate: new Date("2026-02-10"),
    category: "Adventure",
    rating: 4.9,
    ratingCount: 11,
    travelPlan: [{ day: 1, title: "Torres del Paine Entry", details: "Base camp arrival, first trailhead orientation." }],
  },
  {
    title: "Amalfi Coast Road Trip",
    country: "Italy",
    description:
      "Cliffside drives, lemon groves, and pastel villages stacked above the turquoise Tyrrhenian Sea.",
    imageUrl: "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800&q=80",
    gallery: ["https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1200&q=80"],
    budget: 2100,
    duration: 6,
    travelDate: new Date("2026-06-05"),
    category: "Luxury",
    rating: 4.8,
    ratingCount: 30,
    travelPlan: [{ day: 1, title: "Positano Arrival", details: "Beach afternoon, sunset dinner overlooking the coast." }],
  },
  {
    title: "Jordan's Petra & Wadi Rum",
    country: "Jordan",
    description:
      "Walk the Siq into the rose-red city of Petra, then camp beneath the stars in the Wadi Rum desert.",
    imageUrl: "https://images.unsplash.com/photo-1563177978-6b0f76d59ba7?w=800&q=80",
    gallery: ["https://images.unsplash.com/photo-1563177978-6b0f76d59ba7?w=1200&q=80"],
    budget: 1400,
    duration: 6,
    travelDate: new Date("2026-03-20"),
    category: "Cultural",
    rating: 4.8,
    ratingCount: 23,
    travelPlan: [{ day: 1, title: "Petra Treasury", details: "Siq walk, Treasury facade, Royal Tombs." }],
  },
  {
    title: "Scottish Highlands Drive",
    country: "United Kingdom",
    description:
      "Loch-side castles, misty glens, and single-track roads through Scotland's dramatic northern landscapes.",
    imageUrl: "https://images.unsplash.com/photo-1476820865390-c52aeebb9891?w=800&q=80",
    gallery: ["https://images.unsplash.com/photo-1476820865390-c52aeebb9891?w=1200&q=80"],
    budget: 1650,
    duration: 7,
    travelDate: new Date("2026-05-30"),
    category: "Mountain",
    rating: 4.7,
    ratingCount: 16,
    travelPlan: [{ day: 1, title: "Loch Ness", details: "Castle Urquhart, loch cruise." }],
  },
  {
    title: "Zanzibar Spice & Shore",
    country: "Tanzania",
    description:
      "Fragrant spice farm tours in Stone Town followed by days on Zanzibar's white sand, turquoise-water beaches.",
    imageUrl: "https://images.unsplash.com/photo-1516815231560-8f41ec531527?w=800&q=80",
    gallery: ["https://images.unsplash.com/photo-1516815231560-8f41ec531527?w=1200&q=80"],
    budget: 1350,
    duration: 6,
    travelDate: new Date("2026-07-15"),
    category: "Beach",
    rating: 4.6,
    ratingCount: 19,
    travelPlan: [{ day: 1, title: "Stone Town", details: "Spice market tour, sunset dhow cruise." }],
  },
  {
    title: "Seoul Street Style & Palaces",
    country: "South Korea",
    description:
      "Hanbok-clad palace visits by day, Hongdae street food and K-pop culture by night.",
    imageUrl: "https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=800&q=80",
    gallery: ["https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=1200&q=80"],
    budget: 1850,
    duration: 6,
    travelDate: new Date("2026-04-18"),
    category: "City",
    rating: 4.6,
    ratingCount: 28,
    travelPlan: [{ day: 1, title: "Gyeongbokgung Palace", details: "Palace tour, hanbok rental, Bukchon village walk." }],
  },
  {
    title: "Galápagos Wildlife Cruise",
    country: "Ecuador",
    description:
      "Snorkel with sea lions and spot giant tortoises on a small-ship cruise through the Galápagos Islands.",
    imageUrl: "https://images.unsplash.com/photo-1544986581-efac024faf62?w=800&q=80",
    gallery: ["https://images.unsplash.com/photo-1544986581-efac024faf62?w=1200&q=80"],
    budget: 3800,
    duration: 8,
    travelDate: new Date("2026-03-05"),
    category: "Wildlife",
    rating: 5.0,
    ratingCount: 9,
    travelPlan: [{ day: 1, title: "Santa Cruz Island", details: "Tortoise reserve visit, snorkel orientation." }],
  },
  {
    title: "Budapest Thermal Baths Tour",
    country: "Hungary",
    description:
      "Soak in historic thermal baths, cruise the Danube by night, and explore ruin bars in the Jewish Quarter.",
    imageUrl: "https://images.unsplash.com/photo-1541343672885-9be56236302a?w=800&q=80",
    gallery: ["https://images.unsplash.com/photo-1541343672885-9be56236302a?w=1200&q=80"],
    budget: 800,
    duration: 4,
    travelDate: new Date("2026-02-22"),
    category: "Budget",
    rating: 4.4,
    ratingCount: 34,
    travelPlan: [{ day: 1, title: "Széchenyi Baths", details: "Thermal bath soak, Heroes' Square visit." }],
  },
  {
    title: "Queenstown Adrenaline Rush",
    country: "New Zealand",
    description:
      "Bungee jumps, jet boating, and alpine hikes in the self-proclaimed adventure capital of the world.",
    imageUrl: "https://images.unsplash.com/photo-1469521669194-babb45599def?w=800&q=80",
    gallery: ["https://images.unsplash.com/photo-1469521669194-babb45599def?w=1200&q=80"],
    budget: 2500,
    duration: 7,
    travelDate: new Date("2026-01-28"),
    category: "Adventure",
    rating: 4.8,
    ratingCount: 22,
    travelPlan: [{ day: 1, title: "Kawarau Bridge Bungee", details: "Original bungee jump site, gorge views." }],
  },
];

const seed = async () => {
  await connectDB();

  let adminUser = await User.findOne({ email: "admin@tripcraft.ai" });
  if (!adminUser) {
    const hashedPassword = await bcrypt.hash("Admin@1234", 10);
    adminUser = await User.create({
      name: "TripCraft Admin",
      email: "admin@tripcraft.ai",
      password: hashedPassword,
      provider: "local",
      role: "admin",
    });
    console.log("Created admin user: admin@tripcraft.ai / Admin@1234");
  }

  // পুরনো trips মুছে ফেলা হচ্ছে যাতে ঠিক 32টাই থাকে, বারবার seed চালালেও duplicate না হয়
  await Trip.deleteMany({});
  console.log("Cleared existing trips.");

  const tripsToInsert = sampleTrips.map((t) => ({ ...t, createdBy: adminUser!._id }));
  await Trip.insertMany(tripsToInsert);

  console.log(`Seeded ${tripsToInsert.length} sample trips successfully.`);
  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});